// src/app/api/points/award-quiz/route.js
// NEW ROUTE — awards 3 points per correct answer on end-of-lesson quiz.
// One award per subtopic per student (duplicate guard via points_log).

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const POINTS_PER_CORRECT = 3

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subtopic_id, correct_count, total_count } = await request.json()

  if (!subtopic_id || correct_count === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Guard: one quiz award per subtopic per student
  const { data: existing } = await service
    .from('points_log')
    .select('id')
    .eq('student_id', user.id)
    .eq('reason', 'quiz_complete')
    .eq('reference_id', subtopic_id)
    .maybeSingle()

  if (existing) {
    const { data: profile } = await service
      .from('profiles').select('total_points').eq('id', user.id).single()
    return NextResponse.json({
      awarded: false,
      reason: 'already_awarded',
      new_total: profile?.total_points ?? 0,
    })
  }

  const points = correct_count * POINTS_PER_CORRECT
  if (points === 0) {
    return NextResponse.json({ awarded: false, reason: 'zero_points', points_awarded: 0 })
  }

  const { error } = await service.from('points_log').insert({
    student_id:   user.id,
    points,
    reason:       'quiz_complete',
    reference_id: subtopic_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // DB trigger increments profiles.total_points — re-fetch for confirmation
  const { data: profile } = await service
    .from('profiles').select('total_points').eq('id', user.id).single()

  return NextResponse.json({
    awarded:        true,
    points_awarded: points,
    new_total:      profile?.total_points ?? 0,
    correct_count,
    total_count,
  })
}