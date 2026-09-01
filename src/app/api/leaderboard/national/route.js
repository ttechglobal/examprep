// src/app/api/leaderboard/national/route.js
// GET /api/leaderboard/national?period=week|lastWeek|month|all&limit=20
//
// National leaderboard — all registered students.
// Auth optional (guests can view).
//
// Period logic:
//   all       → total_points from profiles (always accurate, always populated)
//   week/month/lastWeek → correct answers from question_attempts in window,
//                         with automatic fallback to total_points if no rows exist

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getMondayOfCurrentWeek() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  return mon
}

function getDateRange(period) {
  const now = new Date()
  if (period === 'week') {
    return { from: getMondayOfCurrentWeek(), to: now }
  }
  if (period === 'lastWeek') {
    const thisMon = getMondayOfCurrentWeek()
    const lastMon = new Date(thisMon)
    lastMon.setDate(thisMon.getDate() - 7)
    const lastSun = new Date(thisMon)
    lastSun.setMilliseconds(-1)
    return { from: lastMon, to: lastSun }
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }
  return { from: null, to: null }
}

// Read top students by total_points — the always-reliable source
async function fromProfiles(service, limit) {
  const { data, error } = await service
    .from('profiles')
    .select('id, full_name, school_name, total_points, streak_days')
    .gt('total_points', 0)
    .order('total_points', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row, i) => ({
    rank:        i + 1,
    student_id:  row.id,
    name:        row.full_name   ?? 'Student',
    school:      row.school_name ?? null,
    xp:          row.total_points ?? 0,
    streak_days: row.streak_days  ?? 0,
  }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = ['week', 'lastWeek', 'month', 'all'].includes(searchParams.get('period') ?? '')
      ? searchParams.get('period')
      : 'week'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    const service = db()

    // ── All-time: always use total_points from profiles ───────────────────────
    if (period === 'all') {
      const leaderboard = await fromProfiles(service, limit)
      return NextResponse.json(
        { scope: 'national', period, leaderboard },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
      )
    }

    // ── Time-bounded: try question_attempts first, fall back to profiles ──────
    const { from, to } = getDateRange(period)

    const { data: attempts, error: attErr } = await service
      .from('question_attempts')
      .select('student_id, is_correct')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())

    if (attErr) {
      // question_attempts query failed — fall back to profiles
      console.warn('[leaderboard/national] question_attempts query failed, using profiles:', attErr.message)
      const leaderboard = await fromProfiles(service, limit)
      return NextResponse.json({ scope: 'national', period, leaderboard, fallback: true })
    }

    // Aggregate: 10 XP per correct answer
    const xpMap = {}
    for (const a of attempts ?? []) {
      if (!a.is_correct) continue
      xpMap[a.student_id] = (xpMap[a.student_id] ?? 0) + 10
    }

    const sorted = Object.entries(xpMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)

    // No question_attempts for this window → fall back to total_points
    // This happens when: (a) inserts were failing, (b) no one practised yet
    if (!sorted.length) {
      const leaderboard = await fromProfiles(service, limit)
      return NextResponse.json(
        { scope: 'national', period, leaderboard, fallback: true },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
      )
    }

    // Enrich with profile data
    const winnerIds = sorted.map(([id]) => id)
    const { data: profiles, error: profErr } = await service
      .from('profiles')
      .select('id, full_name, school_name, streak_days')
      .in('id', winnerIds)
    if (profErr) throw profErr

    const profMap = {}
    for (const p of profiles ?? []) profMap[p.id] = p

    const leaderboard = sorted.map(([id, xp], i) => {
      const p = profMap[id] ?? {}
      return {
        rank:        i + 1,
        student_id:  id,
        name:        p.full_name   ?? 'Student',
        school:      p.school_name ?? null,
        xp,
        streak_days: p.streak_days ?? 0,
      }
    })

    return NextResponse.json(
      { scope: 'national', period, leaderboard },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    )

  } catch (err) {
    console.error('[leaderboard/national] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}