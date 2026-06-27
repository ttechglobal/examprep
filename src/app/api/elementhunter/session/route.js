// src/app/api/elementhunter/session/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Records one Element Hunter session's results and updates the student's
// all-time best average speed if this session beat it.
//
// Request body: { correct: number, attempted: number, avgSeconds: number|null }
//   avgSeconds is null if the student got zero correct answers this session
//   (no valid average to compute) — handled explicitly below, not coerced
//   to 0, since 0 would look like an impossibly fast time rather than "no data".
//
// Response: { isNewBest: boolean, bestAvgSeconds: number|null, totalSessions: number }
//   isNewBest tells the client whether to show a "new personal best!" badge
//   on the results screen — computed server-side so the client can't spoof it.
//
// NOTE ON MASTERY: this route does NOT touch student_topic_mastery. Per the
// product decision made earlier in this game's design, speed/accuracy from
// Element Hunter stays out of the mastery system — this route only persists
// the engagement-layer speed stat. If that decision changes later, mastery
// writes should go through whatever shared mastery-write path the other
// games use, not be added ad-hoc here.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { correct, attempted, avgSeconds } = body

  if (typeof correct !== 'number' || typeof attempted !== 'number') {
    return NextResponse.json({ error: 'correct and attempted must be numbers' }, { status: 400 })
  }
  if (avgSeconds !== null && typeof avgSeconds !== 'number') {
    return NextResponse.json({ error: 'avgSeconds must be a number or null' }, { status: 400 })
  }

  // Fetch existing row (if any) to compare against the new average.
  const { data: existing, error: fetchError } = await supabase
    .from('element_hunter_stats')
    .select('best_avg_seconds, best_avg_session_at, total_sessions, total_correct, total_attempted')
    .eq('student_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[elementhunter/session] fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to load existing stats' }, { status: 500 })
  }

  const prevBest = existing?.best_avg_seconds ?? null
  // Lower is better (faster). A new best requires: we HAVE a value this
  // session, AND (there is no prior best OR this session beat it).
  const isNewBest = avgSeconds !== null && (prevBest === null || avgSeconds < prevBest)

  const nextRow = {
    student_id: user.id,
    best_avg_seconds: isNewBest ? avgSeconds : prevBest,
    best_avg_session_at: isNewBest
      ? new Date().toISOString()
      : (existing?.best_avg_session_at ?? null),
    total_sessions: (existing?.total_sessions ?? 0) + 1,
    total_correct: (existing?.total_correct ?? 0) + correct,
    total_attempted: (existing?.total_attempted ?? 0) + attempted,
    updated_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase
    .from('element_hunter_stats')
    .upsert(nextRow, { onConflict: 'student_id' })

  if (upsertError) {
    console.error('[elementhunter/session] upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  return NextResponse.json({
    isNewBest,
    bestAvgSeconds: nextRow.best_avg_seconds,
    totalSessions: nextRow.total_sessions,
  })
}

export async function GET() {
  // Used by the results screen on mount to show "your best: 2.1s" even
  // before this session's POST completes, and by any future profile/stats
  // page that wants to show Element Hunter history without a write.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('element_hunter_stats')
    .select('best_avg_seconds, total_sessions, total_correct, total_attempted')
    .eq('student_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[elementhunter/session] GET error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }

  return NextResponse.json({
    bestAvgSeconds: data?.best_avg_seconds ?? null,
    totalSessions: data?.total_sessions ?? 0,
    totalCorrect: data?.total_correct ?? 0,
    totalAttempted: data?.total_attempted ?? 0,
  })
}