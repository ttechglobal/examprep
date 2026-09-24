// src/app/api/leaderboard/school/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/school?period=week|lastWeek|month|all&limit=20
//
// XP rankings within the caller's school. Ranks the active cohort; if the
// school has none, all of its students. Requires auth.
// No school → { leaderboard: [], me: null, no_school: true }
//
// Response: { scope, period, school_name, cohort_name, window, leaderboard, me, fallback }
// Rows are built by lib/leaderboard/server.js.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'
import { buildLeaderboard, parseBoardParams } from '@/lib/leaderboard/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params  = parseBoardParams(new URL(request.url).searchParams)
    const service = db()

    const { data: caller } = await service
      .from('profiles')
      .select('school_id, schools(name)')
      .eq('id', user.id)
      .single()

    if (!caller?.school_id) {
      return NextResponse.json({ scope: 'school', period: params.period, leaderboard: [], me: null, no_school: true })
    }

    // Active cohort members first; otherwise every student at the school.
    const { data: activeCohort } = await service
      .from('cohorts')
      .select('id, name')
      .eq('school_id', caller.school_id)
      .eq('is_active', true)
      .maybeSingle()

    let studentIds
    if (activeCohort) {
      const { data: members } = await service
        .from('cohort_members').select('student_id').eq('cohort_id', activeCohort.id)
      studentIds = (members ?? []).map(m => m.student_id)
    } else {
      const { data: students } = await service
        .from('profiles').select('id').eq('school_id', caller.school_id).eq('role', 'student')
      studentIds = (students ?? []).map(s => s.id)
    }

    const result = await buildLeaderboard(service, { ...params, studentIds, callerId: user.id })

    return NextResponse.json(
      {
        scope: 'school', period: params.period,
        school_name: caller.schools?.name ?? 'Your School',
        cohort_name: activeCohort?.name ?? null,
        ...result,
      },
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('[leaderboard/school]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
