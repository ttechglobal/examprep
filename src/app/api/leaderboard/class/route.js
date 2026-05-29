// src/app/api/leaderboard/class/route.js
// GET /api/leaderboard/class
// Returns the class leaderboard for the current student's class.
// Query params: period_start, period_end (ISO strings) — defaults to current bi-weekly period.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/leaderboardPeriods'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = getCurrentPeriod()
  const periodStart = searchParams.get('period_start') ?? period.start.toISOString()
  const periodEnd   = searchParams.get('period_end')   ?? period.end.toISOString()

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get the student's class
  const { data: profile } = await service
    .from('profiles')
    .select('class_id')
    .eq('id', user.id)
    .single()

  if (!profile?.class_id) {
    return NextResponse.json({ leaderboard: [], class: null, my_rank: null })
  }

  const { data: classData } = await service
    .from('classes')
    .select('id, name, invite_code, owner_id')
    .eq('id', profile.class_id)
    .maybeSingle()

  if (!classData) return NextResponse.json({ leaderboard: [], class: null, my_rank: null })

  // Get all members of this class
  const { data: members } = await service
    .from('profiles')
    .select('id, full_name')
    .eq('class_id', profile.class_id)

  if (!members?.length) {
    return NextResponse.json({ leaderboard: [], class: classData, my_rank: null })
  }

  const memberIds = members.map(m => m.id)

  // Aggregate points_log for this period
  const { data: pointsRows } = await service
    .from('points_log')
    .select('student_id, points')
    .in('student_id', memberIds)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

  const totals = aggregatePoints(pointsRows ?? [], members)
  const myRank = totals.findIndex(e => e.student_id === user.id) + 1

  return NextResponse.json({
    leaderboard: totals,
    class: classData,
    my_rank: myRank > 0 ? myRank : null,
    period: { start: periodStart, end: periodEnd },
  })
}

function aggregatePoints(rows, members) {
  const nameMap = {}
  members.forEach(m => { nameMap[m.id] = m.full_name })

  const totals = {}
  rows.forEach(r => {
    if (!totals[r.student_id]) totals[r.student_id] = 0
    totals[r.student_id] += r.points
  })

  // Include all members even if 0 points
  members.forEach(m => {
    if (!totals[m.id]) totals[m.id] = 0
  })

  return Object.entries(totals)
    .map(([student_id, points]) => ({
      student_id,
      // First name only for privacy
      first_name: (nameMap[student_id] ?? '').split(' ')[0] || 'Student',
      points,
    }))
    .sort((a, b) => b.points - a.points)
}