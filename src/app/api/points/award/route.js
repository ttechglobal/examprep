// src/app/api/points/award/route.js
// POST /api/points/award
// Awards points for a given reason. Enforces duplicate guards per reason type.
// Returns { awarded: bool, points_awarded: int, new_total: int }

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const POINT_VALUES = {
  lesson_complete:   10,
  practice_complete: 15,
  weekly_goal:       20,
  badge_earned:      5,
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason, reference_id } = await request.json()

  if (!POINT_VALUES[reason]) {
    return NextResponse.json({ error: `Unknown reason: ${reason}` }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── Duplicate guards ─────────────────────────────────────────────────────
  // lesson_complete: once per subtopic (reference_id = subtopic_id)
  if (reason === 'lesson_complete' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'lesson_complete')
      .eq('reference_id', reference_id)
      .maybeSingle()

    if (existing) {
      // Already awarded — return current total without writing
      const { data: profile } = await service
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // badge_earned: once per badge (reference_id = badge_id)
  if (reason === 'badge_earned' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'badge_earned')
      .eq('reference_id', reference_id)
      .maybeSingle()

    if (existing) {
      const { data: profile } = await service
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // weekly_goal: once per ISO week
  if (reason === 'weekly_goal') {
    const weekStart = getWeekStart()
    const weekEnd   = getWeekEnd()
    const { data: existing } = await service
      .from('points_log')
      .select('id')
      .eq('student_id', user.id)
      .eq('reason', 'weekly_goal')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)
      .maybeSingle()

    if (existing) {
      const { data: profile } = await service
        .from('profiles')
        .select('total_points')
        .eq('id', user.id)
        .single()
      return NextResponse.json({ awarded: false, reason: 'already_awarded', new_total: profile?.total_points ?? 0 })
    }
  }

  // ── Insert the award ─────────────────────────────────────────────────────
  const points = POINT_VALUES[reason]

  const { error } = await service
    .from('points_log')
    .insert({
      student_id:   user.id,
      points,
      reason,
      reference_id: reference_id ?? null,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The DB trigger already incremented profiles.total_points.
  // Re-fetch to confirm the new total.
  const { data: profile } = await service
    .from('profiles')
    .select('total_points')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    awarded:        true,
    points_awarded: points,
    new_total:      profile?.total_points ?? 0,
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getWeekStart() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const mon  = new Date(now)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon.toISOString()
}

function getWeekEnd() {
  const start = new Date(getWeekStart())
  start.setDate(start.getDate() + 6)
  start.setHours(23, 59, 59, 999)
  return start.toISOString()
}