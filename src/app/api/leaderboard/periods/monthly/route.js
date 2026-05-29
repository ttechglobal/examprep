// src/app/api/leaderboard/monthly/route.js
// GET /api/leaderboard/monthly — current calendar month, class or cohort scope

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentMonth } from '@/lib/leaderboardPeriods'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') ?? 'class' // 'class' | 'cohort'

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: profile } = await service
    .from('profiles')
    .select('class_id, cohort_id')
    .eq('id', user.id)
    .single()

  let members = []

  if (scope === 'cohort' && profile?.cohort_id) {
    const { data } = await service
      .from('profiles')
      .select('id, full_name')
      .eq('cohort_id', profile.cohort_id)
    members = data ?? []
  } else if (profile?.class_id) {
    const { data } = await service
      .from('profiles')
      .select('id, full_name')
      .eq('class_id', profile.class_id)
    members = data ?? []
  }

  if (!members.length) return NextResponse.json({ leaderboard: [] })

  const month = getCurrentMonth()
  const memberIds = members.map(m => m.id)

  const { data: pointsRows } = await service
    .from('points_log')
    .select('student_id, points')
    .in('student_id', memberIds)
    .gte('created_at', month.start.toISOString())
    .lte('created_at', month.end.toISOString())

  const nameMap = {}
  members.forEach(m => { nameMap[m.id] = m.full_name })

  const totals = {}
  ;(pointsRows ?? []).forEach(r => {
    if (!totals[r.student_id]) totals[r.student_id] = 0
    totals[r.student_id] += r.points
  })
  members.forEach(m => { if (!totals[m.id]) totals[m.id] = 0 })

  const leaderboard = Object.entries(totals)
    .map(([student_id, points]) => ({
      student_id,
      first_name: (nameMap[student_id] ?? '').split(' ')[0] || 'Student',
      points,
    }))
    .sort((a, b) => b.points - a.points)

  return NextResponse.json({
    leaderboard,
    month: {
      start: month.start.toISOString(),
      end:   month.end.toISOString(),
    },
    scope,
  })
}