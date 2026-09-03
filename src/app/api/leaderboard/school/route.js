// src/app/api/leaderboard/school/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/school?period=week|lastWeek|month|all&limit=20&scope=cohort|school
//
// Returns XP rankings for students within the caller's school.
// Default scope: 'cohort' — ranks only students in the active cohort (current set).
//   If the school has no active cohort, falls back to all school students.
// scope=school — ranks all students ever linked to the school (useful for all-time).
//
// Requires auth. If the caller has no school_id → { leaderboard: [], no_school: true }
//
// Response: { scope, period, school_name, cohort_name, leaderboard }
// leaderboard rows: { rank, student_id, name, xp, streak_days }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
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
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    const service = db()

    // Get caller's school + cohort
    const { data: caller } = await service
      .from('profiles')
      .select('school_id, cohort_id, schools(name)')
      .eq('id', user.id)
      .single()

    if (!caller?.school_id) {
      return NextResponse.json({ scope: 'school', period, leaderboard: [], no_school: true })
    }

    const schoolId   = caller.school_id
    const schoolName = caller.schools?.name ?? 'Your School'

    // ── Resolve which students to rank ────────────────────────────────────────
    // Priority: active cohort members → all school students (fallback)
    const { data: activeCohort } = await service
      .from('cohorts')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .maybeSingle()

    let studentIds = []
    let cohortName = null

    if (activeCohort) {
      const { data: members } = await service
        .from('cohort_members')
        .select('student_id')
        .eq('cohort_id', activeCohort.id)

      studentIds = (members ?? []).map(m => m.student_id)
      cohortName = activeCohort.name
    } else {
      // No active cohort — fall back to all school students
      const { data: schoolStudents } = await service
        .from('profiles')
        .select('id')
        .eq('school_id', schoolId)
        .eq('role', 'student')

      studentIds = (schoolStudents ?? []).map(s => s.id)
    }

    if (!studentIds.length) {
      return NextResponse.json({
        scope: 'school', period, school_name: schoolName, cohort_name: cohortName,
        leaderboard: [],
      })
    }

    // ── Build leaderboard ─────────────────────────────────────────────────────
    let leaderboard = []

    if (period === 'all') {
      // Use total_points from profiles — always accurate
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, streak_days, total_points')
        .in('id', studentIds)

      leaderboard = (profiles ?? [])
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
      // Aggregate XP from question_attempts in the time window (10 XP per correct answer)
      const { from, to } = getDateRange(period)

      const { data: attempts, error: attErr } = await service
        .from('question_attempts')
        .select('student_id, is_correct')
        .in('student_id', studentIds)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())

      if (attErr) throw attErr

      const xpMap = {}
      for (const a of attempts ?? []) {
        if (!a.is_correct) continue
        xpMap[a.student_id] = (xpMap[a.student_id] ?? 0) + 10
      }

      if (!Object.keys(xpMap).length) {
        // No activity in this window — return empty (not a fallback to all-time)
        return NextResponse.json({
          scope: 'school', period, school_name: schoolName, cohort_name: cohortName,
          leaderboard: [],
        })
      }

      // Enrich with profile data
      const activeIds = Object.keys(xpMap)
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, streak_days')
        .in('id', activeIds)

      const profMap = {}
      for (const p of profiles ?? []) profMap[p.id] = p

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
      { scope: 'school', period, school_name: schoolName, cohort_name: cohortName, leaderboard },
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=60' } }
    )

  } catch (err) {
    console.error('[leaderboard/school]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}