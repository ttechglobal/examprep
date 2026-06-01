// src/app/api/diagnostic/save/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Fixes applied in this version:
//
// 1. NOW SAVES question_attempts — the study plan page reads question_attempts
//    to compute topic accuracy. Without this, the study plan shows empty even
//    after a completed diagnostic because hasAnyAttempts = false.
//
// 2. topic_id is now correctly resolved from question.topic_id or
//    question.subtopics?.topics?.id (whichever the diagnostic questions route
//    returns) so accuracy maps to the right topic in the study plan.
//
// 3. subject_id is saved on each attempt row (needed for the study plan's
//    accuracy query which filters by subject_id).
//
// Everything else (learning path build, diagnostic_results, profile update)
// is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { examType, subjects, answers, questions } = await request.json()

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── 1. Update profile ─────────────────────────────────────────────────────
  await service
    .from('profiles')
    .update({ exam_type: examType, subjects })
    .eq('id', user.id)

  // ── 2. Get subject rows ───────────────────────────────────────────────────
  const { data: subjectRows } = await service
    .from('subjects')
    .select('id, name')
    .in('name', subjects)

  const subjectIdByName = {}
  ;(subjectRows ?? []).forEach(s => { subjectIdByName[s.name] = s.id })

  // ── 3. Save question_attempts ─────────────────────────────────────────────
  // This is the critical missing piece — the study plan reads question_attempts
  // to determine which topics are weak. Without saving attempts here, the
  // study plan shows the empty/diagnostic-prompt state after the diagnostic.
  const attemptRows = (questions ?? [])
    .filter(q => answers?.[q.id] !== undefined)
    .map(q => {
      const attempt   = answers[q.id]
      const subjectId = q.subject_id ?? subjectIdByName[q.subject_name] ?? null
      // topic_id can come from q.topic_id or from the nested subtopics join
      const topicId   = q.topic_id ?? q.subtopics?.topics?.id ?? null

      return {
        student_id:      user.id,
        question_id:     q.id,
        selected_answer: attempt.selected_answer ?? attempt.answer ?? null,
        is_correct:      attempt.is_correct ?? false,
        subtopic_id:     q.subtopic_id ?? null,
        topic_id:        topicId,
        subject_id:      subjectId,
        context:         'diagnostic',
        created_at:      new Date().toISOString(),
      }
    })
    .filter(r => r.question_id)  // skip rows where question has no id

  if (attemptRows.length > 0) {
    const { error: attemptsError } = await service
      .from('question_attempts')
      .insert(attemptRows)

    if (attemptsError) {
      // Log but don't fail the whole save — learning path is more critical
      console.error('[diagnostic/save] question_attempts insert error:', attemptsError.message)
    }
  }

  // ── 4. Per-subject: save diagnostic_results + build learning path ─────────
  for (const subjectRow of (subjectRows ?? [])) {
    const subjectQuestions  = (questions ?? []).filter(q => q.subject_name === subjectRow.name)

    // Weak subtopics = those where the student got the answer wrong
    const weakSubtopicIds = subjectQuestions
      .filter(q => answers?.[q.id] && !answers[q.id].is_correct)
      .map(q => q.subtopic_id)
      .filter((id, i, arr) => id && arr.indexOf(id) === i)

    const totalForSubject   = subjectQuestions.length
    const correctForSubject = subjectQuestions.filter(q => answers?.[q.id]?.is_correct).length
    const score = totalForSubject > 0
      ? Math.round((correctForSubject / totalForSubject) * 100)
      : 0

    // Save diagnostic result record
    await service
      .from('diagnostic_results')
      .insert({
        student_id:        user.id,
        subject_id:        subjectRow.id,
        exam_type:         examType,
        weak_subtopic_ids: weakSubtopicIds,
        score,
      })

    // Build learning path — weak subtopics first, then the rest by exam_frequency
    const { data: allSubtopics } = await service
      .from('subtopics')
      .select('id, exam_frequency, topic_id, topics!inner(subject_id)')
      .eq('topics.subject_id', subjectRow.id)
      .order('exam_frequency', { ascending: false })

    if (allSubtopics?.length) {
      const weakFirst = [
        ...allSubtopics.filter(s => weakSubtopicIds.includes(s.id)),
        ...allSubtopics.filter(s => !weakSubtopicIds.includes(s.id)),
      ]

      await service
        .from('student_learning_paths')
        .upsert({
          student_id:           user.id,
          subject_id:           subjectRow.id,
          ordered_subtopic_ids: weakFirst.map(s => s.id),
          last_calculated_at:   new Date().toISOString(),
        }, { onConflict: 'student_id,subject_id' })
    }
  }

  return NextResponse.json({ success: true })
}