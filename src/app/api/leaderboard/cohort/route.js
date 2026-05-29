// src/app/api/leaderboard/cohort/route.js
// GET /api/leaderboard/cohort
// Query params: period_start, period_end, scope=cohort|school (default: cohort)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/leaderboardPeriods'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period      = getCurrentPeriod()
  const periodStart = searchParams.get('period_start') ?? period.start.toISOString()
  const periodEnd   = searchParams.get('period_end')   ?? period.end.toISOString()
  const scope       = searchParams.get('scope') ?? 'cohort' // 'cohort' | 'school'

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: profile } = await service
    .from('profiles')
    .select('cohort_id, school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.cohort_id) {
    return NextResponse.json({ leaderboard: [], cohort: null, my_rank: null })
  }

  const { data: cohort } = await service
    .from('cohorts')
    .select('id, name, session, invite_code, school_id, schools(name, city)')
    .eq('id', profile.cohort_id)
    .maybeSingle()

  // Get members — cohort scope or school scope
  let membersQuery = service.from('profiles').select('id, full_name, cohort_id, cohorts(name)')
  if (scope === 'school' && profile.school_id) {
    membersQuery = membersQuery.eq('school_id', profile.school_id)
  } else {
    membersQuery = membersQuery.eq('cohort_id', profile.cohort_id)
  }
  const { data: members } = await membersQuery

  if (!members?.length) {
    return NextResponse.json({ leaderboard: [], cohort, my_rank: null })
  }

  const memberIds = members.map(m => m.id)

  const { data: pointsRows } = await service
    .from('points_log')
    .select('student_id, points')
    .in('student_id', memberIds)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

  const totals = aggregatePoints(pointsRows ?? [], members, scope === 'school')
  const myRank = totals.findIndex(e => e.student_id === user.id) + 1

  return NextResponse.json({
    leaderboard: totals,
    cohort,
    my_rank: myRank > 0 ? myRank : null,
    period: { start: periodStart, end: periodEnd },
    scope,
  })
}

function aggregatePoints(rows, members, includeClass = false) {
  const memberMap = {}
  members.forEach(m => { memberMap[m.id] = m })

  const totals = {}
  rows.forEach(r => {
    if (!totals[r.student_id]) totals[r.student_id] = 0
    totals[r.student_id] += r.points
  })

  members.forEach(m => { if (!totals[m.id]) totals[m.id] = 0 })

  return Object.entries(totals)
    .map(([student_id, points]) => {
      const m = memberMap[student_id] ?? {}
      const entry = {
        student_id,
        first_name: (m.full_name ?? '').split(' ')[0] || 'Student',
        points,
      }
      if (includeClass) {
        entry.cohort_name = m.cohorts?.name ?? null
      }
      return entry
    })
    .sort((a, b) => b.points - a.points)
}