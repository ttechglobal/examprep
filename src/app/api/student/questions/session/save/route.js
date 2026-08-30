// src/app/api/student/questions/session/save/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student/questions/session/save
//
// Saves a completed practice session to the database.
// Called by localSessionSync.flushSyncQueue() after local save succeeds.
//
// Works for both authenticated and guest users:
//   - Guest (no session): returns { ok: true, guest: true } — no DB write.
//     The queue keeps the item; syncOnLogin() will flush it after sign-up.
//   - Authenticated: inserts one row per question into question_attempts,
//     updates profile total_points, returns { ok: true, xp_awarded }.
//
// Body:
//   session_id    string   — client-generated UUID for deduplication
//   exam          string   — 'WAEC' | 'JAMB'
//   mode          string   — 'practice' | 'study' | 'timed' | 'quick5' | 'mock'
//   subject_name  string   — display name e.g. 'Mathematics'
//   duration_secs number   — total session duration
//   results       Array<{
//     question_id:   string
//     topic_id:      string | null
//     subject_id:    string | null
//     is_correct:    boolean
//     time_taken_ms: number
//   }>
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { session_id, exam, mode, subject_name, results, duration_secs } = body

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'results array required' }, { status: 400 })
  }

  // ── Auth check — guests get a clean ok+guest response ─────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Guest: session is already saved locally. Queue stays intact for later sync.
    return NextResponse.json({ ok: true, guest: true })
  }

  const service   = db()
  const userId    = user.id
  const examType  = exam ?? 'WAEC'

  // ── Insert question_attempts ───────────────────────────────────────────────
  const rows = results.map(r => ({
    student_id:    userId,
    question_id:   r.question_id   ?? null,
    topic_id:      r.topic_id      ?? null,
    subject_id:    r.subject_id    ?? null,
    subject_name:  subject_name    ?? null,
    exam_type:     examType,
    is_correct:    r.is_correct    ?? false,
    time_taken_ms: r.time_taken_ms ?? null,
    session_id:    session_id      ?? null,
    mode:          mode            ?? 'practice',
  }))

  const { error: insertError } = await service
    .from('question_attempts')
    .insert(rows)

  if (insertError) {
    console.error('[session/save] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── Award XP ───────────────────────────────────────────────────────────────
  const correct  = results.filter(r => r.is_correct).length
  const answered = results.filter(r => r.is_correct !== undefined).length
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
  const xp = Math.max(5,
    answered * 5 +
    correct  * 10 +
    (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 0)
  )

  // Increment total_points on profile (non-fatal if it fails)
  await service.rpc('increment_points', { user_id: userId, points: xp }).catch(() => {})

  return NextResponse.json({ ok: true, xp_awarded: xp, correct, total: results.length })
}