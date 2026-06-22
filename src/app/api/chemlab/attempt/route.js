// src/app/api/chemlab/attempt/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST — logs a completed mission and writes to the EXISTING
// student_topic_mastery table. Mirrors src/app/api/mathkingdom/attempt/route.js
// exactly, minus the heartsLost/struggledOut fields since Assemble games
// have no fail state — every logged attempt is, by construction, a success
// (the mission only completes when the target is matched).
//
// Mastery write uses FULL credit (100) since reaching the target IS success
// — there is no partial-credit case here the way Dungeon's soft-hearts
// struggle state needed one.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId, missionId, topicId, timeSeconds } = await request.json()
  if (!gameId || !missionId) {
    return NextResponse.json({ error: 'gameId and missionId required' }, { status: 400 })
  }

  const db = svc()

  // 1. Log the mission attempt
  await db.from('chem_lab_mission_attempts').insert({
    student_id:   user.id,
    game_id:      gameId,
    mission_id:   missionId,
    time_seconds: timeSeconds ?? null,
    topic_id:     topicId ?? null,
  })

  // 2. Update per-game progress
  const { data: existingProgress } = await db
    .from('chem_lab_progress')
    .select('*')
    .eq('student_id', user.id)
    .eq('game_id', gameId)
    .maybeSingle()

  await db.from('chem_lab_progress').upsert({
    student_id:         user.id,
    game_id:            gameId,
    missions_completed: (existingProgress?.missions_completed ?? 0) + 1,
    last_played_at:     new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'student_id,game_id' })

  // 3. Write to EXISTING student_topic_mastery — full credit, no fail state
  if (topicId) {
    const { data: existingMastery } = await db
      .from('student_topic_mastery')
      .select('score, attempts')
      .eq('student_id', user.id)
      .eq('topic_id', topicId)
      .maybeSingle()

    const prevAttempts = existingMastery?.attempts ?? 0
    const prevScore = existingMastery?.score ?? 0
    const newAttempts = prevAttempts + 1
    const newScore = Math.round(((prevScore * prevAttempts) + (100 * 1.3)) / (prevAttempts + 1.3))

    const status =
      newScore >= 70 && newAttempts >= 3 ? 'mastered' :
      newScore >= 50 ? 'improving' :
      'weak'

    await db.from('student_topic_mastery').upsert({
      student_id:     user.id,
      topic_id:       topicId,
      score:          newScore,
      status,
      attempts:       newAttempts,
      last_tested_at: new Date().toISOString(),
    }, { onConflict: 'student_id,topic_id' })
  }

  return NextResponse.json({ success: true })
}