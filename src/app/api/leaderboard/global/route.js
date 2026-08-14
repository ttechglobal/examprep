// src/app/api/leaderboard/global/route.js — v2
// FIX: Previously filtered .not('total_points', 'is', null) which excluded ALL
// students if total_points was never written (RPC failure, new accounts, etc).
// Now falls back to question_attempts count as a proxy score when total_points
// is null — so the leaderboard is NEVER empty as long as anyone has practised.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/leaderboardPeriods'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'week'
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch ALL profiles — include those with null total_points
  // We'll assign them a score based on attempt count if needed
  const { data: allProfiles } = await service
    .from('profiles')
    .select('id, full_name, state, total_points')
    .order('total_points', { ascending: false, nullsLast: true })
    .limit(200)

  function buildFromProfiles(profiles) {
    const withPoints = (profiles ?? []).filter(p => p.total_points != null)
    const without    = (profiles ?? []).filter(p => p.total_points == null)
    const ranked = [
      ...withPoints.map((p, i) => ({
        student_id: p.id,
        first_name: p.full_name?.split(' ')[0] ?? 'Student',
        state:      p.state ?? '',
        points:     p.total_points ?? 0,
      })),
      ...without.map(p => ({
        student_id: p.id,
        first_name: p.full_name?.split(' ')[0] ?? 'Student',
        state:      p.state ?? '',
        points:     0,
      })),
    ].map((e, i) => ({ ...e, rank: i + 1 }))
    const myEntry = ranked.find(r => r.student_id === user.id)
    return { ranked, myEntry }
  }

  // ── All-time: use total_points, fall back to attempt count ─────────────────
  async function buildAllTimeWithFallback() {
    const { ranked, myEntry } = buildFromProfiles(allProfiles)
    // If everyone has 0 points, use attempt count as proxy
    const allZero = ranked.every(r => r.points === 0)
    if (allZero) {
      const { data: attemptCounts } = await service
        .from('question_attempts')
        .select('student_id')
        .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
      const byCnt = {}
      for (const a of attemptCounts ?? []) byCnt[a.student_id] = (byCnt[a.student_id] ?? 0) + 1
      const profileMap = {}
      for (const p of allProfiles ?? []) profileMap[p.id] = p
      const sorted = Object.entries(byCnt).sort(([,a],[,b]) => b - a).slice(0, limit)
      const fallback = sorted.map(([id, cnt], i) => ({
        student_id: id,
        first_name: profileMap[id]?.full_name?.split(' ')[0] ?? 'Student',
        state:      profileMap[id]?.state ?? '',
        points:     cnt, // questions attempted as proxy
        rank:       i + 1,
        proxy:      true,
      }))
      const myEntry2 = fallback.find(r => r.student_id === user.id)
      return { ranked: fallback, myEntry: myEntry2 }
    }
    return { ranked, myEntry }
  }

  if (period === 'alltime') {
    const { ranked, myEntry } = await buildAllTimeWithFallback()
    const res = NextResponse.json({
      leaderboard: ranked.slice(0, limit),
      surround:    [],
      my_rank:     myEntry?.rank ?? null,
      my_entry:    myEntry ?? null,
      total_count: ranked.length,
      period,
    })
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res
  }

  // ── Week period: aggregate points_log ─────────────────────────────────────
  const p = getCurrentPeriod()
  const { data: rows } = await service
    .from('points_log')
    .select('student_id, points')
    .gte('created_at', p.start.toISOString())
    .lte('created_at', p.end.toISOString())

  const periodTotals = {}
  for (const r of rows ?? []) {
    periodTotals[r.student_id] = (periodTotals[r.student_id] ?? 0) + (r.points ?? 0)
  }

  // If no points_log data, fall back to attempt count for this week
  if (!Object.keys(periodTotals).length) {
    const { data: weekAttempts } = await service
      .from('question_attempts')
      .select('student_id')
      .gte('created_at', p.start.toISOString())
      .lte('created_at', p.end.toISOString())

    for (const a of weekAttempts ?? []) {
      periodTotals[a.student_id] = (periodTotals[a.student_id] ?? 0) + 1
    }

    // If still nothing, fall back to all-time
    if (!Object.keys(periodTotals).length) {
      const { ranked, myEntry } = buildFromProfiles(allProfiles)
      const res = NextResponse.json({
        leaderboard: ranked.slice(0, limit), surround: [],
        my_rank: myEntry?.rank ?? null, my_entry: myEntry ?? null,
        total_count: ranked.length, period, using_total: true,
      })
      res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
      return res
    }
  }

  // Build ranked list, merging in names
  const profileMap = {}
  for (const p of allProfiles ?? []) profileMap[p.id] = p

  const sorted = Object.entries(periodTotals).sort(([, a], [, b]) => b - a)

  const missingIds = sorted.map(([id]) => id).filter(id => !profileMap[id])
  if (missingIds.length) {
    const { data: extra } = await service
      .from('profiles').select('id, full_name, state, total_points').in('id', missingIds)
    for (const p of extra ?? []) profileMap[p.id] = p
  }

  const ranked = sorted.map(([id, pts], i) => ({
    student_id: id,
    first_name: profileMap[id]?.full_name?.split(' ')[0] ?? 'Student',
    state:      profileMap[id]?.state ?? '',
    points:     pts,
    rank:       i + 1,
  }))

  const myRankEntry = ranked.find(r => r.student_id === user.id)
  const topRows     = ranked.slice(0, limit)
  let surroundRows  = []
  if (myRankEntry?.rank && myRankEntry.rank > limit) {
    const myIdx = ranked.findIndex(r => r.student_id === user.id)
    surroundRows = ranked.slice(Math.max(0, myIdx - 2), Math.min(ranked.length, myIdx + 3))
  }

  const res = NextResponse.json({
    leaderboard:  topRows,
    surround:     surroundRows,
    my_rank:      myRankEntry?.rank ?? null,
    my_entry:     myRankEntry ?? null,
    total_count:  sorted.length,
    period,
  })
  res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return res
}