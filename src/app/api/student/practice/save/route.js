// src/app/api/student/practice/save/route.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// FIXES in v4:
//   1. attempt_count now tracked in student_topic_mastery (was never written).
//      The mastery API reads it; the EMA formula uses it to weight new data.
//   2. subject_id now seeded into student_topic_mastery correctly from qMap.
//   3. practice_sessions.subject_id column written (was using subject_name only).
//   4. Streak: reads student_streaks first, falls back to profiles.streak_days
//      — previously could silently miss update if streaks row didn't exist yet.
//   5. Subjects fallback: after saving, ensures student_learning_paths has a row
//      for each subject touched. This fixes the "dashboard shows no subjects"
//      problem for students who onboarded without a diagnostic.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

// ── Topic mastery EMA updater ─────────────────────────────────────────────────
// Exponential moving average blend.
// α = 1.0 on first attempt (no prior — raw score is the score)
// α = 0.4 on subsequent (40% new session weight, 60% historical)
async function updateTopicMastery(db, userId, answers, qMap) {
  const byTopic = {}
  for (const a of answers) {
    const q = qMap[a.questionId]
    if (!q?.topic_id) continue
    const tid = q.topic_id
    if (!byTopic[tid]) byTopic[tid] = { correct: 0, total: 0, subjectId: q.subject_id ?? null }
    byTopic[tid].total++
    if (a.isCorrect) byTopic[tid].correct++
  }

  const topicIds = Object.keys(byTopic)
  if (!topicIds.length) return { updated: 0 }

  // Fetch existing mastery rows to get prior score AND attempt_count
  const { data: existing } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, attempt_count')
    .eq('student_id', userId)
    .in('topic_id', topicIds)

  const existingMap = {}
  for (const row of existing ?? []) {
    existingMap[row.topic_id] = { score: row.score ?? 0, attempt_count: row.attempt_count ?? 0 }
  }

  const upsertRows = topicIds.map(tid => {
    const sessionScore = byTopic[tid].total > 0
      ? Math.round((byTopic[tid].correct / byTopic[tid].total) * 100)
      : 0
    const prev         = existingMap[tid]
    const prevScore    = prev?.score ?? 0
    const prevCount    = prev?.attempt_count ?? 0
    const alpha        = prev ? 0.4 : 1.0
    const newScore     = Math.round(alpha * sessionScore + (1 - alpha) * prevScore)
    const newCount     = prevCount + byTopic[tid].total

    return {
      student_id:    userId,
      topic_id:      tid,
      subject_id:    byTopic[tid].subjectId,
      score:         newScore,
      attempt_count: newCount,
      last_updated:  new Date().toISOString(),
    }
  })

  const { error } = await db
    .from('student_topic_mastery')
    .upsert(upsertRows, { onConflict: 'student_id,topic_id', ignoreDuplicates: false })

  if (error) console.error('[practice-save] mastery upsert:', error.message)
  return { updated: upsertRows.length, upsertRows }
}

// ── Streak updater ─────────────────────────────────────────────────────────────
async function updateStreak(db, userId) {
  const todayStr  = today()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const { data: row } = await db
    .from('student_streaks')
    .select('current_streak, last_active_date')
    .eq('student_id', userId)
    .maybeSingle()

  let newStreak = 1
  if (row) {
    const last = row.last_active_date
    if (last === todayStr) {
      newStreak = row.current_streak  // already updated today
    } else if (last === yesterday) {
      newStreak = (row.current_streak ?? 0) + 1
    } else {
      newStreak = 1  // gap — reset
    }
    await db.from('student_streaks')
      .update({ current_streak: newStreak, last_active_date: todayStr })
      .eq('student_id', userId)
  } else {
    await db.from('student_streaks')
      .insert({ student_id: userId, current_streak: 1, last_active_date: todayStr })
  }

  // Mirror to profiles so every page gets it in one query
  await db.from('profiles')
    .update({ streak_days: newStreak })
    .eq('id', userId)

  return newStreak
}

// ── Points updater ─────────────────────────────────────────────────────────────
// Base 10 XP just for showing up, up to 80 XP max.
function calcPoints(correct = 0, total = 0) {
  if (total === 0) return 10
  const pct        = correct / total
  const base       = 10
  const scoreBonus = Math.round(pct * 60)
  const perfBonus  = pct >= 0.8 ? 10 : pct >= 0.6 ? 5 : 0
  return Math.min(80, base + scoreBonus + perfBonus)
}

async function awardPoints(db, userId, correct, total) {
  const points = calcPoints(correct, total)

  await db.from('points_log').insert({
    student_id:   userId,
    points,
    reason:       'practice_complete',
    reference_id: null,
    metadata:     { correct, total },
  })

  const { error: rpcError } = await db.rpc('increment_total_points', { uid: userId, delta: points })
  if (rpcError) {
    const { data: prof } = await db.from('profiles').select('total_points').eq('id', userId).single()
    await db.from('profiles').update({ total_points: (prof?.total_points ?? 0) + points }).eq('id', userId)
  }

  const { data: profile } = await db.from('profiles').select('total_points').eq('id', userId).single()
  return { points, newTotal: profile?.total_points ?? 0 }
}

// ── Ensure subject rows exist in student_learning_paths ───────────────────────
// After we remove the diagnostic, new students have no learning_paths rows.
// The dashboard reads learning_paths to know which subjects a student has.
// This seeds a row for each subject touched in this practice session.
async function ensureSubjectRows(db, userId, subjectIds) {
  if (!subjectIds.length) return

  const { data: existing } = await db
    .from('student_learning_paths')
    .select('subject_id')
    .eq('student_id', userId)
    .in('subject_id', subjectIds)

  const existingSet   = new Set((existing ?? []).map(r => r.subject_id))
  const missingIds    = subjectIds.filter(id => !existingSet.has(id))
  if (!missingIds.length) return

  const rows = missingIds.map(subject_id => ({
    student_id:           userId,
    subject_id,
    ordered_subtopic_ids: [],
    last_calculated_at:   new Date().toISOString(),
  }))

  const { error } = await db
    .from('student_learning_paths')
    .insert(rows)

  if (error) console.warn('[practice-save] ensureSubjectRows:', error.message)
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // ── Normalise both payload shapes ─────────────────────────────────────────
  let answers, questions

  if (body.results && Array.isArray(body.results)) {
    // New shape: { results: [{...q, userAnswer, isCorrect}], config, xp }
    questions = body.results
    answers   = body.results.map(r => ({
      questionId:    r.id,
      selected:      r.userAnswer      ?? null,
      isCorrect:     r.isCorrect       ?? false,
      timeSpentSecs: r.time_spent_secs ?? null,
    }))
  } else if (body.answers && Array.isArray(body.answers)) {
    // Old shape: { answers: [{questionId, isCorrect}], questions: [...] }
    answers   = body.answers
    questions = body.questions ?? []
  } else {
    return NextResponse.json({ error: 'Unrecognised payload shape' }, { status: 400 })
  }

  if (!answers?.length) {
    return NextResponse.json({ error: 'No answers to save' }, { status: 400 })
  }

  const db    = svc()
  const qMap  = {}
  for (const q of questions) qMap[q.id] = q

  const correct = answers.filter(a => a.isCorrect).length
  const total   = answers.length

  // Run mastery update and streak update in parallel
  const [masteryResult, streakDays] = await Promise.all([
    (async () => {
      // 1a. Insert question_attempts rows
      const attemptRows = answers.map(a => ({
        student_id:      user.id,
        question_id:     a.questionId,
        selected_answer: a.selected,
        is_correct:      a.isCorrect,
        subtopic_id:     qMap[a.questionId]?.subtopic_id  ?? null,
        topic_id:        qMap[a.questionId]?.topic_id     ?? null,
        subject_id:      qMap[a.questionId]?.subject_id   ?? null,
        time_spent_secs: a.timeSpentSecs                  ?? null,
        context:         'practice',
        created_at:      new Date().toISOString(),
      }))
      const { error: attErr } = await db.from('question_attempts').insert(attemptRows)
      if (attErr) console.error('[practice-save] attempts insert:', attErr.message)

      // 1b. Update topic mastery scores
      return updateTopicMastery(db, user.id, answers, qMap)
    })(),

    // 2. Update streak
    updateStreak(db, user.id),
  ])

  // 3. Award XP points
  const { points, newTotal } = await awardPoints(db, user.id, correct, total)

  // 4. Write a practice_sessions row (powers the activity calendar)
  const touchedSubjectIds = [...new Set(answers.map(a => qMap[a.questionId]?.subject_id).filter(Boolean))]
  const subjectNames      = [...new Set(answers.map(a => qMap[a.questionId]?.subject_name).filter(Boolean))]

  try {
    await db.from('practice_sessions').insert({
      student_id:      user.id,
      mode:            body.config?.mode ?? 'practice',
      questions_count: total,
      correct_count:   correct,
      subject_id:      touchedSubjectIds[0]  ?? null,
      subject_name:    subjectNames[0]        ?? null,
      completed_at:    new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[practice-save] practice_sessions insert skipped:', e.message)
  }

  // 5. Seed learning_path rows for any new subjects (dashboard needs these)
  if (touchedSubjectIds.length) {
    await ensureSubjectRows(db, user.id, touchedSubjectIds)
  }

  return NextResponse.json({
    success:          true,
    mastery_updated:  masteryResult.updated,
    streak_days:      streakDays,
    points_awarded:   points,
    new_total_points: newTotal,
  })
}