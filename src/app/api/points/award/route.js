// src/app/api/points/award/route.js
// ─────────────────────────────────────────────────────────────────────────────
// UPDATED POINTS SYSTEM:
//
// practice_complete:
//   Was: flat 15 points every time
//   Now: base 5 pts + (correct_answers × 2 pts), capped at 50
//   e.g. 8/10 correct = 5 + 16 = 21 pts
//       10/10 correct = 5 + 20 = 25 pts
//        3/10 correct = 5 + 6  = 11 pts
//   This rewards accuracy, not just showing up.
//
// lesson_complete: flat 20 pts (unchanged — completing a lesson is effort)
// weekly_goal:     flat 30 pts (unchanged)
// badge_earned:    flat 10 pts (unchanged)
//
// The API now accepts optional `correct` and `total` fields in the body
// for practice_complete to calculate proportional points.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function calcPracticePoints(correct = 0, total = 0) {
  if (total === 0) return 5 // fallback — shouldn't happen
  const base      = 5
  const perCorrect = 2
  const raw       = base + (correct * perCorrect)
  return Math.min(50, Math.max(5, raw))
}

const FLAT_POINT_VALUES = {
  lesson_complete: 20,
  weekly_goal:     30,
  badge_earned:    10,
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason, reference_id, correct, total } = await request.json()

  // Validate reason
  const validReasons = ['lesson_complete', 'practice_complete', 'weekly_goal', 'badge_earned']
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: `Unknown reason: ${reason}` }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── Duplicate guards ───────────────────────────────────────────────────────
  // lesson_complete: once per subtopic
  if (reason === 'lesson_complete' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'lesson_complete')
      .eq('reference_id', reference_id)
      .maybeSingle()

    if (existing) {
      const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // badge_earned: once per badge
  if (reason === 'badge_earned' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'badge_earned')
      .eq('reference_id', reference_id)
      .maybeSingle()

    if (existing) {
      const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // weekly_goal: once per ISO week
  if (reason === 'weekly_goal') {
    const now      = new Date()
    const day      = now.getDay()
    const diff     = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday   = new Date(now); monday.setDate(diff); monday.setHours(0, 0, 0, 0)
    const sunday   = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)

    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'weekly_goal')
      .gte('created_at', monday.toISOString())
      .lte('created_at', sunday.toISOString())
      .maybeSingle()

    if (existing) {
      const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // ── Calculate points ───────────────────────────────────────────────────────
  const points = reason === 'practice_complete'
    ? calcPracticePoints(correct ?? 0, total ?? 0)
    : (FLAT_POINT_VALUES[reason] ?? 10)

  // ── Insert award ───────────────────────────────────────────────────────────
  const { error } = await service.from('points_log').insert({
    student_id:   user.id,
    points,
    reason,
    reference_id: reference_id ?? null,
    metadata:     reason === 'practice_complete' ? { correct, total } : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // DB trigger increments profiles.total_points — fetch updated total
  const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()

  return NextResponse.json({
    awarded:        true,
    points_awarded: points,
    new_total:      profile?.total_points ?? 0,
  })
}