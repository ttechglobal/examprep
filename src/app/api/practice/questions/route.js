// src/app/api/practice/questions/route.js
// Updated: exam_type → exam_types[] (contains filter via @>)

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap, fetchStudentAccuracy } from '@/lib/topicSequencer'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  let examType       = normaliseExamType(searchParams.get('exam') ?? 'WAEC')
  const count        = Math.min(parseInt(searchParams.get('count') ?? '20'), 200)
  const topicId      = searchParams.get('topic_id')
  const mode         = searchParams.get('mode') ?? 'practice'
  const subjectNames = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

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
      if (profile?.exam_type) examType = normaliseExamType(profile.exam_type)
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

  // ── BRANCH A: Exam simulation ──────────────────────────────────────────────
  if (mode === 'exam') {
    const perSubject = examType === 'JAMB' ? 40 : 50

    for (const subject of subjectRows) {
      const baseQuery = service
        .from('questions')
        .select(`
          id, question_text, options, correct_answer, explanation,
          difficulty, subtopic_id, topic_id, subject_id,
          subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
        `)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .limit(perSubject + 20)

      const { data: questions } = await applyExamFilter(baseQuery, examType)

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

  // ── BRANCH B: Topic-specific practice ─────────────────────────────────────
  else if (topicId) {
    const subject = subjectRows[0]

    const baseQuery = service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation,
        difficulty, subtopic_id, topic_id, subject_id,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .limit(count + 20)

    const { data: questions } = await applyExamFilter(baseQuery, examType)

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

  // ── BRANCH C: Normal practice — sequencer applied ──────────────────────────
  else {
    const perSubject = Math.ceil(count / subjectRows.length)
    const subjectIds = subjectRows.map(s => s.id)
    let coreTopicMap = {}
    let studentAcc   = {}

    try {
      [coreTopicMap, studentAcc] = await Promise.all([
        fetchCoreTopicMap(service, subjectIds, examType),
        fetchStudentAccuracy(service, studentId, subjectIds),
      ])
    } catch {
      // Fail gracefully — fall back to random
    }

    for (const subject of subjectRows) {
      const fetchLimit = Math.max(perSubject * 5, 60)

      const baseQuery = service
        .from('questions')
        .select(`
          id, question_text, options, correct_answer, explanation,
          difficulty, subtopic_id, topic_id, subject_id,
          subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
        `)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .limit(fetchLimit)

      const { data: rawQuestions } = await applyExamFilter(baseQuery, examType)

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
      const selected = sequenceQuestions(enriched, coreTopicIds, studentAcc, perSubject)
      allQuestions.push(...selected)
    }
  }

  return NextResponse.json({ questions: allQuestions })
}