// src/app/api/student/questions/session/save/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Local-first session save. Works for guests AND authenticated users.
//
// Flow:
//   Client always saves locally first (via localSessionSync.saveSessionLocally).
//   Then calls this endpoint. This endpoint:
//     • Guest (no Supabase session): returns computed XP — no DB writes.
//       The client queues the payload and will retry when the user logs in.
//     • Auth user: writes question_attempts, mastery, streak, XP, summary.
//       Returns the authoritative server state.
//
// The client flushes its sync queue on login (syncOnLogin from localSessionSync).
// So a user who practised as a guest and then creates an account gets their
// full history synced automatically.
//
// Body:
// {
//   session_id:    string  (uuid — client generates before session starts)
//   exam:          'WAEC' | 'JAMB'
//   mode:          'quick5' | 'weak' | 'mixed' | 'timed' | 'mock' | 'practice' | 'study'
//   subject_name:  string  (e.g. 'Mathematics')
//   results:       [{ question_id, topic_id, subject_id, is_correct, time_taken_ms? }]
//   duration_secs: number
// }
//
// Returns:
// { ok, guest?, xp_awarded, new_total_xp, streak_days, mastery_updated, correct, total, accuracy }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function today() { return new Date().toISOString().slice(0, 10) }

// ── EMA mastery scoring ───────────────────────────────────────────────────────
// α = 0.7 for new topics (< 3 attempts) — trust recent data heavily
// α = 0.4 for established topics — blend history with recent
function emaScore(prevScore, prevCount, sessionScore) {
  const alpha = prevCount < 3 ? 0.7 : 0.4
  return Math.round(prevScore * (1 - alpha) + sessionScore * alpha)
}

// ── XP formula ────────────────────────────────────────────────────────────────
// Always rewards the attempt — minimum 5 XP even with zero correct answers.
function calcXP(results, mode) {
  const attempted  = results.filter(r => r.selectedIdx !== null && r.selectedIdx !== undefined).length
  const correct    = results.filter(r => r.is_correct).length
  const total      = results.length
  if (!total) return 5
  const pctRight   = Math.round((correct / total) * 100)
  const attemptXP  = attempted * 5
  const correctXP  = correct   * 10
  const accuracyXP = pctRight >= 80 ? 50 : pctRight >= 60 ? 25 : 0
  const modeBonus  = { quick5:10, weak:20, mixed:10, timed:30, mock:100, practice:0, study:0 }[mode] ?? 0
  return Math.max(5, attemptXP + correctXP + accuracyXP + modeBonus)
}

export async function POST(request) {
  try {
    // Parse body first — same for guests and auth users
    let body
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const {
      session_id    = null,
      exam          = 'WAEC',
      mode          = 'practice',
      subject_name  = null,
      results       = [],
      duration_secs = 0,
    } = body ?? {}

    // Pre-compute stats used by both paths
    const correctCount = results.filter(r => r.is_correct).length
    const accuracy     = results.length > 0
      ? Math.round((correctCount / results.length) * 100)
      : 0
    const xpAwarded    = calcXP(results, mode)

    // ── Auth check ────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ── GUEST PATH ────────────────────────────────────────────────────────────
    // No DB writes. Return computed XP so the client can:
    //   1. Display the results screen correctly
    //   2. Update local XP via PointsContext
    // The client keeps the payload in ep_sync_queue and will re-POST when
    // the user creates an account and calls syncOnLogin().
    if (!user) {
      return NextResponse.json({
        ok:              true,
        guest:           true,         // signals client to accumulate, not replace XP
        xp_awarded:      xpAwarded,
        new_total_xp:    null,         // client adds xp_awarded to its own local total
        streak_days:     0,
        mastery_updated: 0,
        correct:         correctCount,
        total:           results.length,
        accuracy,
        duration_secs,
      })
    }

    // ── AUTH PATH ─────────────────────────────────────────────────────────────
    if (!results.length) {
      return NextResponse.json({ error: 'results array is empty' }, { status: 400 })
    }

    const service  = db()
    const userId   = user.id
    const todayStr = today()

    // ── Deduplication — idempotent saves ─────────────────────────────────────
    if (session_id) {
      const { data: existing } = await service
        .from('practice_sessions')
        .select('id')
        .eq('session_id', session_id)
        .maybeSingle()

      if (existing) {
        const { data: prof } = await service
          .from('profiles')
          .select('total_points, streak_days')
          .eq('id', userId)
          .single()
        return NextResponse.json({
          ok:              true,
          duplicate:       true,
          xp_awarded:      0,
          new_total_xp:    prof?.total_points ?? 0,
          streak_days:     prof?.streak_days  ?? 0,
          mastery_updated: 0,
          correct:         correctCount,
          total:           results.length,
          accuracy,
        })
      }
    }

    // ── WRITE 1: question_attempts ────────────────────────────────────────────
    const attemptRows = results.map(r => ({
      student_id:    userId,
      question_id:   r.question_id,
      topic_id:      r.topic_id    ?? null,
      subject_id:    r.subject_id  ?? null,
      subject_name:  subject_name  ?? null,
      exam_type:     exam,
      is_correct:    r.is_correct  ?? false,
      time_taken_ms: r.time_taken_ms ?? null,
      created_at:    new Date().toISOString(),
    }))

    const { error: attErr } = await service
      .from('question_attempts')
      .insert(attemptRows)

    if (attErr) console.error('[session/save] attempts error:', attErr.message)

    // ── WRITE 2: student_topic_mastery ────────────────────────────────────────
    const byTopic = {}
    for (const r of results) {
      if (!r.topic_id) continue
      if (!byTopic[r.topic_id]) {
        byTopic[r.topic_id] = { correct: 0, total: 0, subject_id: r.subject_id ?? null }
      }
      byTopic[r.topic_id].total++
      if (r.is_correct) byTopic[r.topic_id].correct++
    }

    const topicIds = Object.keys(byTopic)
    let masteryUpdated = 0

    if (topicIds.length) {
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
        return {
          student_id:        userId,
          topic_id:          tid,
          subject_id,
          exam_type:         exam,
          score:             emaScore(prev.score, prev.count, sessionScore),
          attempt_count:     prev.count + 1,
          last_practiced_at: new Date().toISOString(),
        }
      })

      const { error: mastErr } = await service
        .from('student_topic_mastery')
        .upsert(upsertRows, { onConflict: 'student_id,topic_id,exam_type' })

      if (mastErr) {
        // Fallback: exam_type column may not exist yet on older DB schemas
        if (mastErr.code === '42703' || mastErr.message?.includes('exam_type')) {
          const fallbackRows = upsertRows.map(({ exam_type: _drop, ...row }) => row)
          const { error: retryErr } = await service
            .from('student_topic_mastery')
            .upsert(fallbackRows, { onConflict: 'student_id,topic_id' })
          if (!retryErr) masteryUpdated = fallbackRows.length
          else console.error('[session/save] mastery fallback error:', retryErr.message)
        } else {
          console.error('[session/save] mastery error:', mastErr.message)
        }
      } else {
        masteryUpdated = upsertRows.length
      }
    }

    // ── WRITE 3: streak ───────────────────────────────────────────────────────
    const yesterday    = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const { data: streakRow } = await service
      .from('student_streaks')
      .select('streak_days, last_practice_date')
      .eq('student_id', userId)
      .maybeSingle()

    let streakDays = 1
    if (streakRow) {
      if      (streakRow.last_practice_date === todayStr)     streakDays = streakRow.streak_days
      else if (streakRow.last_practice_date === yesterdayStr) streakDays = (streakRow.streak_days ?? 0) + 1
      else                                                    streakDays = 1
    }

    await service.from('student_streaks').upsert(
      { student_id: userId, streak_days: streakDays, last_practice_date: todayStr },
      { onConflict: 'student_id' }
    )

    // ── WRITE 4: XP + streak on profiles ─────────────────────────────────────
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
    const sessionSubjectId = results.find(r => r.subject_id)?.subject_id ?? null

    await service.from('practice_sessions').insert({
      id:              session_id ?? undefined,
      session_id:      session_id ?? null,
      student_id:      userId,
      subject_id:      sessionSubjectId,
      subject_name:    subject_name ?? null,
      exam_type:       exam,
      mode,
      questions_count: results.length,
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
    console.error('[session/save] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}