// src/app/api/student/session/save/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// FIXES from v1:
//   1. exam_type added to student_topic_mastery upsert (exam-aware mastery)
//   2. session_id deduplication — idempotent saves (no double-XP on retry)
//   3. Write order: attempts + mastery FIRST (critical), then XP + streak + summary
//   4. exam_type added to question_attempts rows
//   5. Fallback: exam_type column may not exist yet — catches gracefully
//
// Body:
// {
//   session_id:    string (uuid — client generates before session starts)
//   exam:          'WAEC' | 'JAMB'
//   mode:          'quick5' | 'weak' | 'mixed' | 'timed' | 'mock'
//   results:       [{ question_id, topic_id, subject_id, is_correct, time_taken_ms? }]
//   duration_secs: number
// }
//
// Returns:
// { ok, xp_awarded, new_total_xp, streak_days, mastery_updated, correct, total, accuracy }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function today() { return new Date().toISOString().slice(0, 10) }

// EMA mastery scoring
// α = 0.7 when attempt_count < 3 (new — trust recent data heavily)
// α = 0.4 when attempt_count ≥ 3 (established — blend history and recent)
function emaScore(prevScore, prevCount, sessionScore) {
  const alpha = prevCount < 3 ? 0.7 : 0.4
  return Math.round(prevScore * (1 - alpha) + sessionScore * alpha)
}

// XP formula
// Every attempted question earns XP — even zero score students are rewarded for trying.
// Base: 5 XP per question attempted
// Bonus: 10 XP per correct answer
// Accuracy bonus: +50 XP if ≥80%, +25 XP if ≥60%
// Mode bonus on top
// Minimum: 5 XP (never zero — always reward the attempt)
function calcXP(results, mode) {
  const attempted  = results.filter(r => r.selectedIdx !== null && r.selectedIdx !== undefined).length
  const correct    = results.filter(r => r.is_correct).length
  const total      = results.length
  if (!total) return 5
  const attemptXP  = attempted * 5          // 5 XP per question attempted
  const correctXP  = correct   * 10         // 10 XP per correct answer
  const pctRight   = total > 0 ? Math.round((correct / total) * 100) : 0
  const accuracyXP = pctRight >= 80 ? 50 : pctRight >= 60 ? 25 : 0
  const modeBonus  = { quick5:10, weak:20, mixed:10, timed:30, mock:100, practice:0, study:0 }[mode] ?? 0
  return Math.max(5, attemptXP + correctXP + accuracyXP + modeBonus)
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const {
      session_id    = null,
      exam          = 'WAEC',
      mode          = 'mixed',
      results       = [],
      duration_secs = 0,
    } = body

    if (!results.length) {
      return NextResponse.json({ error: 'results array is empty' }, { status: 400 })
    }

    const service  = db()
    const userId   = user.id
    const todayStr = today()

    // ── DEDUPLICATION: check if this session was already saved ────────────────
    if (session_id) {
      const { data: existing } = await service
        .from('practice_sessions')
        .select('id')
        .eq('session_id', session_id)
        .maybeSingle()

      if (existing) {
        // Already saved — return success without re-writing anything
        console.log(`[session/save] duplicate session_id ${session_id} — skipping`)
        const { data: prof } = await service
          .from('profiles')
          .select('total_points, streak_days')
          .eq('id', userId)
          .single()

        return NextResponse.json({
          ok:              true,
          duplicate:       true,
          new_total_xp:    prof?.total_points ?? 0,
          streak_days:     prof?.streak_days  ?? 0,
          xp_awarded:      0,
          mastery_updated: 0,
          correct:         results.filter(r => r.is_correct).length,
          total:           results.length,
          accuracy:        Math.round((results.filter(r=>r.is_correct).length / results.length) * 100),
        })
      }
    }

    // ── WRITE 1 (critical): question_attempts ─────────────────────────────────
    const attemptRows = results.map(r => ({
      student_id:    userId,
      question_id:   r.question_id,
      topic_id:      r.topic_id    ?? null,
      subject_id:    r.subject_id  ?? null,
      exam_type:     exam,
      is_correct:    r.is_correct  ?? false,
      time_taken_ms: r.time_taken_ms ?? null,
      created_at:    new Date().toISOString(),
    }))

    const { error: attErr } = await service
      .from('question_attempts')
      .insert(attemptRows)

    if (attErr) console.error('[session/save] attempts error:', attErr.message)

    // ── WRITE 2 (critical): student_topic_mastery ─────────────────────────────
    // Group results by topic_id
    const byTopic = {}
    for (const r of results) {
      if (!r.topic_id) continue
      if (!byTopic[r.topic_id]) {
        byTopic[r.topic_id] = { correct:0, total:0, subject_id: r.subject_id ?? null }
      }
      byTopic[r.topic_id].total++
      if (r.is_correct) byTopic[r.topic_id].correct++
    }

    const topicIds = Object.keys(byTopic)
    let masteryUpdated = 0

    if (topicIds.length) {
      // Fetch existing mastery — exam-aware
      const { data: existingRows } = await service
        .from('student_topic_mastery')
        .select('topic_id, score, attempt_count')
        .eq('student_id', userId)
        .eq('exam_type', exam)
        .in('topic_id', topicIds)

      const existingMap = {}
      for (const row of existingRows ?? []) {
        existingMap[row.topic_id] = { score: row.score ?? 0, count: row.attempt_count ?? 0 }
      }

      const upsertRows = topicIds.map(tid => {
        const { correct, total, subject_id } = byTopic[tid]
        const sessionScore = total > 0 ? Math.round((correct / total) * 100) : 0
        const prev         = existingMap[tid] ?? { score: 0, count: 0 }
        const newScore     = emaScore(prev.score, prev.count, sessionScore)
        return {
          student_id:        userId,
          topic_id:          tid,
          subject_id,
          exam_type:         exam,         // ← exam-aware mastery
          score:             newScore,
          attempt_count:     prev.count + 1,
          last_practiced_at: new Date().toISOString(),
        }
      })

      // Conflict on (student_id, topic_id, exam_type) once migration runs
      // Falls back to (student_id, topic_id) if exam_type column doesn't exist yet
      const { error: mastErr } = await service
        .from('student_topic_mastery')
        .upsert(upsertRows, { onConflict: 'student_id,topic_id,exam_type' })

      if (mastErr) {
        // exam_type column may not exist yet — retry without it
        if (mastErr.message?.includes('exam_type') || mastErr.code === '42703') {
          const fallbackRows = upsertRows.map(({ exam_type: _drop, ...row }) => row)
          const { error: retryErr } = await service
            .from('student_topic_mastery')
            .upsert(fallbackRows, { onConflict: 'student_id,topic_id' })
          if (retryErr) console.error('[session/save] mastery fallback error:', retryErr.message)
          else masteryUpdated = fallbackRows.length
        } else {
          console.error('[session/save] mastery error:', mastErr.message)
        }
      } else {
        masteryUpdated = upsertRows.length
      }
    }

    // ── WRITE 3: streak ───────────────────────────────────────────────────────
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const { data: streakRow } = await service
      .from('student_streaks')
      .select('streak_days, last_practice_date')
      .eq('student_id', userId)
      .maybeSingle()

    let streakDays = 1
    if (streakRow) {
      if (streakRow.last_practice_date === todayStr)       streakDays = streakRow.streak_days
      else if (streakRow.last_practice_date === yesterdayStr) streakDays = (streakRow.streak_days ?? 0) + 1
      else                                                 streakDays = 1
    }

    await service.from('student_streaks').upsert(
      { student_id: userId, streak_days: streakDays, last_practice_date: todayStr },
      { onConflict: 'student_id' }
    )

    // ── WRITE 4: XP + streak mirror to profiles ───────────────────────────────
    const xpAwarded = calcXP(results, mode)

    const { data: profRow } = await service
      .from('profiles')
      .select('total_points')
      .eq('id', userId)
      .single()

    const currentXP  = profRow?.total_points ?? 0
    const newTotalXP = currentXP + xpAwarded

    await service
      .from('profiles')
      .update({ total_points: newTotalXP, streak_days: streakDays })
      .eq('id', userId)

    // ── WRITE 5: practice_sessions summary ────────────────────────────────────
    const correctCount = results.filter(r => r.is_correct).length
    const accuracy     = results.length > 0
      ? Math.round((correctCount / results.length) * 100)
      : 0

    const sessionSubjectId = results.find(r => r.subject_id)?.subject_id ?? null

    await service.from('practice_sessions').insert({
      id:              session_id ?? undefined,   // use client session_id as PK if provided
      session_id:      session_id ?? null,        // dedup field
      student_id:      userId,
      subject_id:      sessionSubjectId,
      exam_type:       exam,
      mode,
      total_questions: results.length,
      correct_count:   correctCount,
      accuracy,
      duration_secs,
      xp_awarded:      xpAwarded,
      created_at:      new Date().toISOString(),
    })

    return NextResponse.json({
      ok:              true,
      xp_awarded:      xpAwarded,
      new_total_xp:    newTotalXP,
      streak_days:     streakDays,
      mastery_updated: masteryUpdated,
      correct:         correctCount,
      total:           results.length,
      accuracy,
    })

  } catch (err) {
    console.error('[student/session/save] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}