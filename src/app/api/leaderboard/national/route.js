// src/app/api/leaderboard/national/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/national?period=week|lastWeek|month|all&limit=12
//
// scope is always "national" — all registered students on the platform.
// No school filter. Auth optional — works for guests too.
//
// periods:
//   week      → current Mon 00:00 → now
//   lastWeek  → previous Mon 00:00 → last Sun 23:59:59
//   month     → 1st of current calendar month → now
//   all       → all-time (reads total_points directly from profiles, no aggregation)
//
// Response:
// {
//   scope:       'national',
//   period:      'week' | 'lastWeek' | 'month' | 'all',
//   leaderboard: [
//     { rank, student_id, name, school, xp, streak_days }
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getMondayOfCurrentWeek() {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))
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
  return { from: null, to: null } // 'all'
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = ['week','lastWeek','month','all'].includes(searchParams.get('period') ?? '')
      ? searchParams.get('period')
      : 'week'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10), 50)

    const service = db()
    const { from, to } = getDateRange(period)

    let leaderboard = []

    if (period === 'all') {
      // All-time: read cumulative total_points directly from profiles — fast
      const { data, error } = await service
        .from('profiles')
        .select('id, full_name, school_name, total_points, streak_days')
        .gt('total_points', 0)
        .order('total_points', { ascending: false })
        .limit(limit)

      if (error) throw error

      leaderboard = (data ?? []).map((row, i) => ({
        rank:        i + 1,
        student_id:  row.id,
        name:        row.full_name ?? 'Student',
        school:      row.school_name ?? null,
        xp:          row.total_points ?? 0,
        streak_days: row.streak_days  ?? 0,
      }))

    } else {
      // Time-bounded: aggregate xp_awarded from practice_sessions in window
      const { data: sessions, error: sessErr } = await service
        .from('practice_sessions')
        .select('student_id, xp_awarded')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (sessErr) throw sessErr

      // Aggregate XP per student
      const xpMap = {}
      for (const s of sessions ?? []) {
        xpMap[s.student_id] = (xpMap[s.student_id] ?? 0) + (s.xp_awarded ?? 0)
      }

      const sorted = Object.entries(xpMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)

      if (!sorted.length) {
        return NextResponse.json(
          { scope: 'national', period, leaderboard: [] },
          { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
        )
      }

      const winnerIds = sorted.map(([id]) => id)
      const { data: profiles, error: profErr } = await service
        .from('profiles')
        .select('id, full_name, school_name, streak_days')
        .in('id', winnerIds)

      if (profErr) throw profErr

      const profMap = {}
      for (const p of profiles ?? []) profMap[p.id] = p

      leaderboard = sorted.map(([id, xp], i) => {
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
    }

    return NextResponse.json(
      { scope: 'national', period, leaderboard },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
    )

  } catch (err) {
    console.error('[leaderboard/national] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}