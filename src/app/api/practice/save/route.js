// src/app/api/student/practice/save/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// ADDED in v2:
//   Step 3 — updateTopicMastery()
//   After saving question_attempts, recalculate student_topic_mastery for
//   every topic touched in this session. Uses an exponential moving average
//   (EMA) so recent performance weighs more than stale attempts.
//   This is what feeds /student/progress and the dashboard mastery bars.
//
//   EMA formula per topic:
//     new_score = α × session_score + (1 − α) × existing_score
//     α = 0.4 (recent session counts 40%, history counts 60%)
//     Minimum α when attempt_count is very low (< 3): α = 0.6
//     (new learners' recent performance is more signal-dense)
//
//   student_topic_mastery schema assumed:
//     student_id, topic_id, subject_id, score (0-100), attempt_count,
//     last_updated, created_at
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rebuildStudyPlan } from '@/lib/studyPlanEngine'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function today() { return new Date().toISOString().slice(0, 10) }

// ── Topic mastery updater ─────────────────────────────────────────────────────
// Groups session answers by topic_id, computes session accuracy per topic,
// then blends with existing mastery using EMA.
async function updateTopicMastery(db, userId, answers, qMap) {
  // 1. Group by topic_id — build { topicId: { correct, total, subjectId } }
  const byTopic = {}
  for (const a of answers) {
    const q = qMap[a.questionId]
    if (!q?.topic_id) continue
    const tid = q.topic_id
    if (!byTopic[tid]) {
      byTopic[tid] = { correct: 0, total: 0, subjectId: q.subject_id ?? null }
    }
    byTopic[tid].total++
    if (a.isCorrect) byTopic[tid].correct++
  }

  const topicIds = Object.keys(byTopic)
  if (!topicIds.length) return

  // 2. Fetch existing mastery rows for these topics
  const { data: existing } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, attempt_count')
    .eq('student_id', userId)
    .in('topic_id', topicIds)

  const existingMap = {}
  for (const row of existing ?? []) {
    existingMap[row.topic_id] = { score: row.score ?? 0, count: row.attempt_count ?? 0 }
  }

  // 3. Compute new scores and upsert
  const upsertRows = topicIds.map(tid => {
    const sessionScore = byTopic[tid].total > 0
      ? Math.round((byTopic[tid].correct / byTopic[tid].total) * 100)
      : 0

    const prev       = existingMap[tid]
    const prevScore  = prev?.score  ?? 0
    const prevCount  = prev?.count  ?? 0
    // Higher α for newer learners — their recent session is more signal-dense
    const alpha      = prevCount < 3 ? 0.6 : 0.4
    const newScore   = prev
      ? Math.round(alpha * sessionScore + (1 - alpha) * prevScore)
      : sessionScore  // first attempt — no blending needed

    return {
      student_id:    userId,
      topic_id:      tid,
      subject_id:    byTopic[tid].subjectId,
      score:         newScore,
      attempt_count: prevCount + byTopic[tid].total,
      last_updated:  new Date().toISOString(),
    }
  })

  const { error } = await db
    .from('student_topic_mastery')
    .upsert(upsertRows, {
      onConflict:    'student_id,topic_id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('[practice-save] mastery upsert error:', error.message)
    // Non-fatal — attempts already saved, mastery will catch up next session
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Support both old shape { answers, questions } and new shape { results, config }
  let answers, questions
  if (body.results && Array.isArray(body.results)) {
    // New shape from session v7: results is array of question objects with
    // userAnswer and isCorrect mixed in
    questions = body.results
    answers   = body.results.map(r => ({
      questionId: r.id,
      selected:   r.userAnswer ?? null,
      isCorrect:  r.isCorrect  ?? false,
    }))
  } else {
    answers   = body.answers
    questions = body.questions
  }

  if (!answers?.length || !questions?.length) {
    return NextResponse.json({ error: 'answers and questions required' }, { status: 400 })
  }

  const db = svc()
  const qMap = {}
  questions.forEach(q => { qMap[q.id] = q })

  // 1. Save question_attempts
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

  // 2. Update streak
  const todayStr  = today()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { data: streak } = await db
    .from('student_streaks').select('current_streak, last_active_date')
    .eq('student_id', user.id).maybeSingle()

  if (streak) {
    const last = streak.last_active_date
    const newStreak = (last === yesterday || last === todayStr)
      ? streak.current_streak + (last === todayStr ? 0 : 1) : 1
    await db.from('student_streaks')
      .update({ current_streak: newStreak, last_active_date: todayStr })
      .eq('student_id', user.id)
  } else {
    await db.from('student_streaks')
      .insert({ student_id: user.id, current_streak: 1, last_active_date: todayStr })
  }

  // 3. Update topic mastery — THIS IS WHAT FEEDS /student/progress
  await updateTopicMastery(db, user.id, answers, qMap)

  // 4. Rebuild study plan for every subject touched
  const subjectIds = [...new Set(answers.map(a => qMap[a.questionId]?.subject_id).filter(Boolean))]
  if (subjectIds.length) {
    try {
      await rebuildStudyPlan(db, user.id, subjectIds)
      console.log('[practice-save] study plan rebuilt for subjects:', subjectIds)
    } catch (e) {
      console.error('[practice-save] rebuildStudyPlan error:', e.message)
    }
  }

  return NextResponse.json({ success: true })
}