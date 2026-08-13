// src/app/api/leaderboard/global/route.js

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

  // Fetch all profiles that have total_points set (any amount including 0 if they've practised)
  const { data: allProfiles } = await service
    .from('profiles')
    .select('id, full_name, state, total_points')
    .not('total_points', 'is', null)
    .order('total_points', { ascending: false })
    .limit(limit + 10)

  function buildFromProfiles(profiles) {
    const ranked = (profiles ?? []).map((p, i) => ({
      student_id: p.id,
      first_name: p.full_name?.split(' ')[0] ?? 'Student',
      state:      p.state ?? '',
      points:     p.total_points ?? 0,
      rank:       i + 1,
      using_total: true,
    }))
    const myEntry = ranked.find(r => r.student_id === user.id)
    return { ranked, myEntry }
  }

  if (period === 'alltime') {
    const { ranked, myEntry } = buildFromProfiles(allProfiles)
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

  // If no period activity, fall back to all-time total_points so national board is never empty
  if (!Object.keys(periodTotals).length) {
    const { ranked, myEntry } = buildFromProfiles(allProfiles)
    const res = NextResponse.json({
      leaderboard: ranked.slice(0, limit),
      surround:    [],
      my_rank:     myEntry?.rank ?? null,
      my_entry:    myEntry ?? null,
      total_count: ranked.length,
      period,
      using_total: true,
    })
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res
  }

  // Build ranked list from period points, merging in names from profiles
  const profileMap = {}
  for (const p of allProfiles ?? []) profileMap[p.id] = p

  const sorted = Object.entries(periodTotals).sort(([, a], [, b]) => b - a)

  // For any student in period data not already in allProfiles, fetch them
  const missingIds = sorted.map(([id]) => id).filter(id => !profileMap[id])
  if (missingIds.length) {
    const { data: extra } = await service
      .from('profiles').select('id, full_name, state, total_points').in('id', missingIds)
    for (const p of extra ?? []) profileMap[p.id] = p
  }

  const ranked = sorted.map(([id, pts], i) => ({
    student_id:  id,
    first_name:  profileMap[id]?.full_name?.split(' ')[0] ?? 'Student',
    state:       profileMap[id]?.state ?? '',
    points:      pts,
    rank:        i + 1,
  }))

  const myRankEntry = ranked.find(r => r.student_id === user.id)
  const myRank      = myRankEntry?.rank ?? null
  const topRows     = ranked.slice(0, limit)

  let surroundRows = []
  if (myRank && myRank > limit) {
    const myIdx = ranked.findIndex(r => r.student_id === user.id)
    surroundRows = ranked.slice(Math.max(0, myIdx - 2), Math.min(ranked.length, myIdx + 3))
  }

  const res = NextResponse.json({
    leaderboard:  topRows,
    surround:     surroundRows,
    my_rank:      myRank,
    my_entry:     myRankEntry ?? null,
    total_count:  sorted.length,
    period,
  })
  res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return res
}