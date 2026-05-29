// src/app/api/student/practice/save/route.js
// POST — save a completed practice session.
// Saves individual question_attempts, updates student_streaks,
// and recalculates learning path priority for affected subjects.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Returns 'YYYY-MM-DD' in UTC
function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers, questions } = await request.json()

  if (!answers?.length || !questions?.length) {
    return NextResponse.json({ error: 'answers and questions required' }, { status: 400 })
  }

  const db = svc()

  // ── 1. Save question_attempts ─────────────────────────────────────────────
  // Build a map for fast lookup: questionId → question metadata
  const qMap = {}
  questions.forEach(q => { qMap[q.id] = q })

  const attemptRows = answers.map(a => ({
    student_id:  user.id,
    question_id: a.questionId,
    selected_answer: a.selected,
    is_correct:  a.isCorrect,
    subtopic_id: qMap[a.questionId]?.subtopic_id ?? null,
    topic_id:    qMap[a.questionId]?.topic_id ?? null,
    subject_id:  qMap[a.questionId]?.subject_id ?? null,
    context:     'practice',
    created_at:  new Date().toISOString(),
  }))

  await db.from('question_attempts').insert(attemptRows)

  // ── 2. Update streak ──────────────────────────────────────────────────────
  const todayStr = today()
  const { data: streak } = await db
    .from('student_streaks')
    .select('current_streak, last_active_date')
    .eq('student_id', user.id)
    .maybeSingle()

  if (streak) {
    const last      = streak.last_active_date
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const newStreak = (last === yesterday || last === todayStr)
      ? streak.current_streak + (last === todayStr ? 0 : 1)
      : 1

    await db.from('student_streaks').update({
      current_streak:   newStreak,
      last_active_date: todayStr,
    }).eq('student_id', user.id)
  } else {
    await db.from('student_streaks').insert({
      student_id:       user.id,
      current_streak:   1,
      last_active_date: todayStr,
    })
  }

  // ── 3. Recalculate learning path for each affected subject ────────────────
  // Collect subjects that appeared in this session
  const affectedSubjectIds = [...new Set(questions.map(q => q.subject_id).filter(Boolean))]

  for (const subjectId of affectedSubjectIds) {
    // Get the current learning path
    const { data: path } = await db
      .from('student_learning_paths')
      .select('ordered_subtopic_ids')
      .eq('student_id', user.id)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (!path?.ordered_subtopic_ids?.length) continue

    // Get all question_attempts for this student × subject to identify weak subtopics
    const { data: allAttempts } = await db
      .from('question_attempts')
      .select('subtopic_id, is_correct')
      .eq('student_id', user.id)
      .eq('subject_id', subjectId)
      .not('subtopic_id', 'is', null)

    // Compute accuracy per subtopic
    const accuracyMap = {}
    ;(allAttempts ?? []).forEach(a => {
      if (!accuracyMap[a.subtopic_id]) accuracyMap[a.subtopic_id] = { total: 0, correct: 0 }
      accuracyMap[a.subtopic_id].total++
      if (a.is_correct) accuracyMap[a.subtopic_id].correct++
    })

    const getAccuracy = (id) => {
      const d = accuracyMap[id]
      if (!d || d.total === 0) return 100 // unknown — assume fine, don't surface
      return Math.round((d.correct / d.total) * 100)
    }

    // Get completed subtopic IDs
    const { data: progress } = await db
      .from('lesson_progress')
      .select('subtopic_id')
      .eq('student_id', user.id)
      .eq('completed', true)
      .in('subtopic_id', path.ordered_subtopic_ids)

    const completedIds = new Set((progress ?? []).map(p => p.subtopic_id))

    // Reorder: incomplete subtopics, sorted by accuracy ascending (weakest first),
    // then completed subtopics appended at the end
    const incomplete = path.ordered_subtopic_ids
      .filter(id => !completedIds.has(id))
      .sort((a, b) => getAccuracy(a) - getAccuracy(b))

    const completed = path.ordered_subtopic_ids.filter(id => completedIds.has(id))

    await db.from('student_learning_paths').update({
      ordered_subtopic_ids: [...incomplete, ...completed],
      last_calculated_at:   new Date().toISOString(),
    })
    .eq('student_id', user.id)
    .eq('subject_id', subjectId)
  }

  return NextResponse.json({ success: true })
}