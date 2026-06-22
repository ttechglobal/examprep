// src/app/api/points/award/route.js
// ─────────────────────────────────────────────────────────────────────────────
// FULL FILE — points system with practice/lesson/weekly/badge (original) plus
// math_kingdom_room and chem_lab_mission (new — Math Kingdom and Chem Lab
// games award through this same existing points system rather than a
// parallel currency; displayed as "XP" in those games' UI, but it's one
// honest number under the hood: profiles.total_points).
//
// POINTS RULES:
//
// practice_complete:
//   base 5 pts + (correct_answers × 2 pts), capped at 50
//   e.g. 8/10 correct = 5 + 16 = 21 pts
//
// lesson_complete: flat 20 pts (once per subtopic)
// weekly_goal:     flat 30 pts (once per ISO week)
// badge_earned:    flat 10 pts (once per badge)
//
// math_kingdom_room / chem_lab_mission:
//   IMPROVEMENT-ONLY re-earning. reference_id format:
//     math_kingdom_room → "{gameId}:{roomNumber}"   e.g. "equation_escape:7"
//     chem_lab_mission  → "{gameId}:{missionId}"    e.g. "atom-builder:mission_3"
//   A student can replay a room/mission and only earns points if their new
//   score for that exact reference_id beats their previous best — this
//   rewards mastery-seeking replay and prevents XP farming via repeated
//   easy replays of already-completed content.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function calcPracticePoints(correct = 0, total = 0) {
  if (total === 0) return 5 // fallback — shouldn't happen
  const base       = 5
  const perCorrect = 2
  const raw         = base + (correct * perCorrect)
  return Math.min(50, Math.max(5, raw))
}

const FLAT_POINT_VALUES = {
  lesson_complete:    20,
  weekly_goal:        30,
  badge_earned:       10,
  math_kingdom_room:  20,  // base value — actual award capped by improvement-over-best logic below
  chem_lab_mission:   20,  // same improvement-only pattern as math_kingdom_room
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason, reference_id, correct, total } = await request.json()

  // ── Validate reason ──────────────────────────────────────────────────────────
  const validReasons = [
    'lesson_complete',
    'practice_complete',
    'weekly_goal',
    'badge_earned',
    'math_kingdom_room',
    'chem_lab_mission',
  ]
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: `Unknown reason: ${reason}` }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── Duplicate guards ───────────────────────────────────────────────────────────

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
    const now    = new Date()
    const day    = now.getDay()
    const diff   = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now); monday.setDate(diff); monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)

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

  // math_kingdom_room: re-awardable, but only the IMPROVEMENT over previous best
  // reference_id format: "{gameId}:{roomNumber}" e.g. "equation_escape:7"
  let mathKingdomBonus = null
  if (reason === 'math_kingdom_room' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id, points')
      .eq('student_id', user.id)
      .eq('reason', 'math_kingdom_room')
      .eq('reference_id', reference_id)
      .order('points', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousBestPoints = existing?.points ?? 0
    const newPoints = FLAT_POINT_VALUES.math_kingdom_room ?? 20

    if (newPoints <= previousBestPoints) {
      // Not an improvement — no new points, but not an error either
      const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()
      return NextResponse.json({
        awarded: false,
        reason: 'not_improved',
        new_total: profile?.total_points ?? 0,
      })
    }
    // Award only the DELTA so total_points reflects true improvement, not double-counting
    mathKingdomBonus = newPoints - previousBestPoints
  }

  // chem_lab_mission: same improvement-only re-earning pattern as math_kingdom_room
  // reference_id format: "{gameId}:{missionId}" e.g. "atom-builder:mission_3"
  let chemLabBonus = null
  if (reason === 'chem_lab_mission' && reference_id) {
    const { data: existing } = await service
      .from('points_log')
      .select('id, points')
      .eq('student_id', user.id)
      .eq('reason', 'chem_lab_mission')
      .eq('reference_id', reference_id)
      .order('points', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousBestPoints = existing?.points ?? 0
    const newPoints = FLAT_POINT_VALUES.chem_lab_mission ?? 20

    if (newPoints <= previousBestPoints) {
      const { data: profile } = await service.from('profiles').select('total_points').eq('id', user.id).single()
      return NextResponse.json({
        awarded: false,
        reason: 'not_improved',
        new_total: profile?.total_points ?? 0,
      })
    }
    chemLabBonus = newPoints - previousBestPoints
  }

  // ── Calculate points ───────────────────────────────────────────────────────────
  const points =
    reason === 'practice_complete'   ? calcPracticePoints(correct ?? 0, total ?? 0) :
    reason === 'math_kingdom_room'   ? mathKingdomBonus :
    reason === 'chem_lab_mission'    ? chemLabBonus :
    (FLAT_POINT_VALUES[reason] ?? 10)

  // ── Insert award ───────────────────────────────────────────────────────────────
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