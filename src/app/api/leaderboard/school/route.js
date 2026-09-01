// src/app/api/leaderboard/school/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/school?period=week|lastWeek|month|all&limit=20
//
// Returns XP rankings for students within the same school as the caller.
// Requires auth — anonymous users get 401.
// If the caller has no school_id → returns { leaderboard: [], no_school: true }
//
// Response shape (same as national):
// {
//   scope:       'school',
//   period:      string,
//   school_name: string,
//   leaderboard: [{ rank, student_id, name, xp, streak_days }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }           from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }           from 'next/server'

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
    const thisMon  = getMondayOfCurrentWeek()
    const lastMon  = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7)
    const lastSun  = new Date(thisMon); lastSun.setMilliseconds(-1)
    return { from: lastMon, to: lastSun }
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }
  return { from: null, to: null } // 'all'
}

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period = ['week','lastWeek','month','all'].includes(searchParams.get('period') ?? '')
      ? searchParams.get('period') : 'week'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    const service = db()

    // Get caller's school
    const { data: caller } = await service
      .from('profiles')
      .select('school_id, schools(name)')
      .eq('id', user.id)
      .single()

    if (!caller?.school_id) {
      return NextResponse.json({ scope: 'school', period, leaderboard: [], no_school: true })
    }

    const schoolId   = caller.school_id
    const schoolName = caller.schools?.name ?? 'Your School'

    // Get all students at this school
    const { data: schoolProfiles, error: profErr } = await service
      .from('profiles')
      .select('id, full_name, streak_days, total_points')
      .eq('school_id', schoolId)

    if (profErr) throw profErr
    const studentIds = (schoolProfiles ?? []).map(p => p.id)
    if (!studentIds.length) {
      return NextResponse.json({ scope: 'school', period, school_name: schoolName, leaderboard: [] })
    }

    const profMap = {}
    for (const p of schoolProfiles ?? []) profMap[p.id] = p

    let leaderboard = []
    const { from, to } = getDateRange(period)

    if (period === 'all') {
      leaderboard = (schoolProfiles ?? [])
        .filter(p => (p.total_points ?? 0) > 0)
        .sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))
        .slice(0, limit)
        .map((p, i) => ({
          rank:        i + 1,
          student_id:  p.id,
          name:        p.full_name ?? 'Student',
          xp:          p.total_points ?? 0,
          streak_days: p.streak_days ?? 0,
        }))
    } else {
      // Aggregate XP from question_attempts in the window.
      // practice_sessions.xp_awarded does not exist in the DB schema.
      const { data: attempts, error: sessErr } = await service
        .from('question_attempts')
        .select('student_id, is_correct')
        .in('student_id', studentIds)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (sessErr) throw sessErr

      const XP_PER_CORRECT = 10
      const xpMap = {}
      for (const a of attempts ?? []) {
        if (!a.is_correct) continue
        xpMap[a.student_id] = (xpMap[a.student_id] ?? 0) + XP_PER_CORRECT
      }

      leaderboard = Object.entries(xpMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id, xp], i) => {
          const p = profMap[id] ?? {}
          return {
            rank:        i + 1,
            student_id:  id,
            name:        p.full_name ?? 'Student',
            xp,
            streak_days: p.streak_days ?? 0,
          }
        })
    }

    return NextResponse.json(
      { scope: 'school', period, school_name: schoolName, leaderboard },
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=60' } }
    )

  } catch (err) {
    console.error('[leaderboard/school]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}