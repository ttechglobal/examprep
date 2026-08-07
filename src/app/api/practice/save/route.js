// src/app/api/student/practice/save/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// FIXES in v3:
//   1. Accepts BOTH data shapes from the session page:
//      New shape: { results: [{...q, userAnswer, isCorrect}], config, xp }
//      Old shape: { answers: [{questionId, isCorrect}], questions: [...] }
//   2. updateTopicMastery() now runs — this is what feeds the mastery bars.
//      Previously missing — topics were never updating after practice sessions.
//   3. Points awarded via /api/points/award internally (no double-award).
//   4. streak synced to profiles.streak_days so dashboard shows live value.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'
import { rebuildStudyPlan }          from '@/lib/studyPlanEngine'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

// ── Topic mastery EMA updater ─────────────────────────────────────────────────
// α = 0.6 for first 3 sessions (less history → recent data is stronger signal)
// α = 0.4 thereafter (blend: 40% new session, 60% historical average)
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

  const { data: existing } = await db
    .from('student_topic_mastery')
    .select('topic_id, score')
    .eq('student_id', userId)
    .in('topic_id', topicIds)

  const existingMap = {}
  for (const row of existing ?? []) {
    existingMap[row.topic_id] = { score: row.score ?? 0 }
  }

  const upsertRows = topicIds.map(tid => {
    const sessionScore = byTopic[tid].total > 0
      ? Math.round((byTopic[tid].correct / byTopic[tid].total) * 100)
      : 0
    const prev      = existingMap[tid]
    const prevScore = prev?.score ?? 0
    // Weighted blend: new sessions weighted 60% if no prior data, 40% otherwise
    const alpha    = prev ? 0.4 : 1.0
    const newScore = Math.round(alpha * sessionScore + (1 - alpha) * prevScore)

    return {
      student_id:   userId,
      topic_id:     tid,
      subject_id:   byTopic[tid].subjectId,
      score:        newScore,
      last_updated: new Date().toISOString(),
    }
  })

  const { error } = await db
    .from('student_topic_mastery')
    .upsert(upsertRows, { onConflict: 'student_id,topic_id', ignoreDuplicates: false })

  if (error) console.error('[practice-save] mastery upsert:', error.message)
  return { updated: upsertRows.length }
}

// ── Streak updater ─────────────────────────────────────────────────────────────
async function updateStreak(db, userId) {
  const todayStr  = today()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const { data: row } = await db
    .from('student_streaks').select('current_streak, last_active_date')
    .eq('student_id', userId).maybeSingle()

  let newStreak = 1
  if (row) {
    const last = row.last_active_date
    if (last === todayStr) {
      newStreak = row.current_streak // already counted today
    } else if (last === yesterday) {
      newStreak = row.current_streak + 1
    } else {
      newStreak = 1 // gap — reset
    }
    await db.from('student_streaks')
      .update({ current_streak: newStreak, last_active_date: todayStr })
      .eq('student_id', userId)
  } else {
    await db.from('student_streaks')
      .insert({ student_id: userId, current_streak: 1, last_active_date: todayStr })
  }

  // Sync streak to profiles.streak_days so every page reads the same value
  await db.from('profiles')
    .update({ streak_days: newStreak })
    .eq('id', userId)

  return newStreak
}

// ── Points updater ─────────────────────────────────────────────────────────────
// XP formula:
//   • Everyone earns XP — no zero-XP sessions. Showing up matters.
//   • Base:  10 XP just for completing
//   • Score: 0–60 XP based on accuracy (pct/100 * 60), rounded
//   • Bonus: +10 if >80%, +5 if >60% (stacks with score)
//   • Cap:   80 XP per session
function calcPoints(correct = 0, total = 0) {
  if (total === 0) return 10 // no questions shouldn't happen, but floor it
  const pct         = correct / total
  const base        = 10
  const scoreBonus  = Math.round(pct * 60)
  const perfBonus   = pct >= 0.8 ? 10 : pct >= 0.6 ? 5 : 0
  return Math.min(80, base + scoreBonus + perfBonus)
}

async function awardPoints(db, userId, correct, total) {
  const points = calcPoints(correct, total)

  // Insert into log
  await db.from('points_log').insert({
    student_id:   userId,
    points,
    reason:       'practice_complete',
    reference_id: null,
    metadata:     { correct, total },
  })

  // Increment total_points — try RPC first, fall back to read-then-write
  const { error: rpcError } = await db.rpc('increment_total_points', { uid: userId, delta: points })
  if (rpcError) {
    // RPC doesn't exist or failed — manual increment
    const { data: prof } = await db.from('profiles').select('total_points').eq('id', userId).single()
    const current = prof?.total_points ?? 0
    await db.from('profiles').update({ total_points: current + points }).eq('id', userId)
  }

  const { data: profile } = await db.from('profiles').select('total_points').eq('id', userId).single()
  return { points, newTotal: profile?.total_points ?? 0 }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // ── Normalise both data shapes ────────────────────────────────────────────
  let answers, questions

  if (body.results && Array.isArray(body.results)) {
    // New shape: { results: [{...q, userAnswer, isCorrect}], config, xp }
    questions = body.results
    answers   = body.results.map(r => ({
      questionId: r.id,
      selected:   r.userAnswer ?? null,
      isCorrect:  r.isCorrect  ?? false,
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

  const db = svc()
  const qMap = {}
  for (const q of questions) qMap[q.id] = q

  const correct = answers.filter(a => a.isCorrect).length
  const total   = answers.length

  // Run all updates in parallel — they're independent
  const [masteryResult, streakDays] = await Promise.all([
    // 1. Save attempts + update topic mastery
    (async () => {
      const attemptRows = answers.map(a => ({
        student_id:      user.id,
        question_id:     a.questionId,
        selected_answer: a.selected,
        is_correct:      a.isCorrect,
        subtopic_id:     qMap[a.questionId]?.subtopic_id ?? null,
        topic_id:        qMap[a.questionId]?.topic_id    ?? null,
        subject_id:      qMap[a.questionId]?.subject_id  ?? null,
        context:         'practice',
        created_at:      new Date().toISOString(),
      }))
      await db.from('question_attempts').insert(attemptRows)
      return updateTopicMastery(db, user.id, answers, qMap)
    })(),

    // 2. Update streak
    updateStreak(db, user.id),
  ])

  // 3. Award points (after mastery — sequential is fine here)
  const { points, newTotal } = await awardPoints(db, user.id, correct, total)

  // 4. Write a practice_sessions row (powers dashboard/progress activity chart)
  const subjectNames = [...new Set(answers.map(a => qMap[a.questionId]?.subject_name).filter(Boolean))]
  try {
    await db.from('practice_sessions').insert({
      student_id:      user.id,
      mode:            body.config?.mode ?? 'practice',
      questions_count: total,
      correct_count:   correct,
      subject_name:    subjectNames[0] ?? null,
      completed_at:    new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[practice-save] practice_sessions insert skipped:', e.message)
  }

  // 5. Rebuild study plan for subjects touched
  const subjectIds = [...new Set(answers.map(a => qMap[a.questionId]?.subject_id).filter(Boolean))]
  if (subjectIds.length) {
    try {
      await rebuildStudyPlan(db, user.id, subjectIds)
    } catch (e) {
      console.error('[practice-save] rebuildStudyPlan:', e.message)
    }
  }

  return NextResponse.json({
    success:         true,
    mastery_updated: masteryResult.updated,
    streak_days:     streakDays,
    points_awarded:  points,
    new_total_points: newTotal,
  })
}