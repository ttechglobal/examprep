// src/app/api/practice/questions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Modified: core topic sequencing + question_types param added.
//
// Changes from original:
//   1. Normal practice branch now:
//      a. Fetches core_topics for the subject(s) from DB
//      b. Fetches the authenticated student's accuracy per topic
//      c. Calls sequenceQuestions() — weak core topics get weighted slots
//      d. Fully mastered core topics treated like normal topics
//      e. All wrapped in try/catch — failure falls back to original random shuffle
//   2. question_types param (default ['objective']) — future-proofing for theory Qs
//   3. Exam sim and topic-specific branches: unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap, fetchStudentAccuracy } from '@/lib/topicSequencer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  let examType       = searchParams.get('exam') ?? 'WAEC'
  const count        = Math.min(parseInt(searchParams.get('count') ?? '20'), 200)
  const topicId      = searchParams.get('topic_id')
  const mode         = searchParams.get('mode') ?? 'practice'
  const subjectNames = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  // question_types: defaults to ['objective'] — backward compatible
  const questionTypes = searchParams.get('question_types')?.split(',').filter(Boolean) ?? ['objective']

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Resolve subjects + authenticated user
  let subjects  = subjectNames
  let studentId = null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    studentId = user.id
    if (!subjects.length) {
      const { data: profile } = await service
        .from('profiles').select('subjects, exam_type').eq('id', user.id).single()
      subjects = profile?.subjects ?? []
      if (profile?.exam_type) examType = profile.exam_type
    }
  }

  if (!subjects.length) {
    return NextResponse.json({ error: 'No subjects found' }, { status: 400 })
  }

  const { data: subjectRows } = await service
    .from('subjects').select('id, name, slug').in('name', subjects)

  if (!subjectRows?.length) {
    return NextResponse.json({ error: 'Subjects not found in database' }, { status: 404 })
  }

  const allQuestions = []
  const examFilter   = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : [examType, 'BOTH']

  // ────────────────────────────────────────────────────────────────────────────
  // BRANCH A: Exam simulation — unchanged, sequencer not applied
  // ────────────────────────────────────────────────────────────────────────────
  if (mode === 'exam') {
    const perSubject = examType === 'JAMB' ? 40 : 50

    for (const subject of subjectRows) {
      const { data: questions } = await service
        .from('questions')
        .select(`
          id, question_text, options, correct_answer, explanation,
          difficulty, question_type, subtopic_id, topic_id, subject_id,
          subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
        `)
        .eq('subject_id', subject.id)
        .in('exam_type', examFilter)
        .eq('is_active', true)
        .in('question_type', questionTypes)
        .limit(perSubject + 20)

      if (questions?.length) {
        const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, perSubject)
        allQuestions.push(...shuffled.map(q => ({
          ...q,
          subject_name:  subject.name,
          subject_slug:  subject.slug,
          subtopic_name: q.subtopics?.name ?? '',
          topic_name:    q.subtopics?.topics?.name ?? '',
          topic_id:      q.subtopics?.topics?.id ?? q.topic_id ?? null,
        })))
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BRANCH B: Topic-specific practice — unchanged, sequencer not applied
  // (student already chose the topic — no need to reprioritise)
  // ────────────────────────────────────────────────────────────────────────────
  else if (topicId) {
    const subject = subjectRows[0]

    const { data: questions } = await service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation,
        difficulty, question_type, subtopic_id, topic_id, subject_id,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .in('question_type', questionTypes)
      .in('exam_type', examFilter)
      .limit(count + 20)

    if (questions?.length) {
      const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, count)
      allQuestions.push(...shuffled.map(q => ({
        ...q,
        subject_name:  subject?.name ?? '',
        subject_slug:  subject?.slug ?? '',
        subtopic_name: q.subtopics?.name ?? '',
        topic_name:    q.subtopics?.topics?.name ?? '',
        topic_id:      q.subtopics?.topics?.id ?? q.topic_id ?? null,
      })))
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BRANCH C: Normal practice — sequencer applied
  // ────────────────────────────────────────────────────────────────────────────
  else {
    const perSubject = Math.ceil(count / subjectRows.length)

    // Pre-fetch core topic map + student accuracy (both fail-safe)
    const subjectIds = subjectRows.map(s => s.id)
    let coreTopicMap = {}
    let studentAcc   = {}

    try {
      [coreTopicMap, studentAcc] = await Promise.all([
        fetchCoreTopicMap(service, subjectIds, examType),
        fetchStudentAccuracy(service, studentId, subjectIds),
      ])
    } catch {
      // Both default to {} on error — sequencer falls back to random
    }

    for (const subject of subjectRows) {
      // Fetch a generous pool so the sequencer has enough to work with
      const fetchLimit = Math.max(perSubject * 5, 60)

      const { data: rawQuestions } = await service
        .from('questions')
        .select(`
          id, question_text, options, correct_answer, explanation,
          difficulty, question_type, subtopic_id, topic_id, subject_id,
          subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
        `)
        .eq('subject_id', subject.id)
        .in('exam_type', examFilter)
        .eq('is_active', true)
        .in('question_type', questionTypes)
        .limit(fetchLimit)

      if (!rawQuestions?.length) continue

      const enriched = rawQuestions.map(q => ({
        ...q,
        subject_name:  subject.name,
        subject_slug:  subject.slug,
        subtopic_name: q.subtopics?.name ?? '',
        topic_name:    q.subtopics?.topics?.name ?? '',
        topic_id:      q.subtopics?.topics?.id ?? q.topic_id ?? null,
      }))

      const coreTopicIds = coreTopicMap[subject.id] ?? []

      const sequenced = sequenceQuestions({
        questions:    enriched,
        coreTopicIds,
        studentAcc,   // weakness-weighted slots
        count:        perSubject,
      })

      allQuestions.push(...sequenced)
    }
  }

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!',
    }, { status: 404 })
  }

  // For exam sim and topic-specific: final shuffle (original behaviour).
  // For normal practice: do NOT re-shuffle — sequencer already set optimal order.
  const final = (mode === 'exam' || topicId)
    ? allQuestions.sort(() => Math.random() - 0.5).slice(0, count)
    : allQuestions.slice(0, count)

  return NextResponse.json({
    questions: final,
    count:     final.length,
    examType,
    mode,
  })
}