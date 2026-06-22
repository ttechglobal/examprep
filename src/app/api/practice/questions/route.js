// src/app/api/practice/questions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: separates past_paper questions from ai_generated questions.
//
// THE BUG: every branch of this route queried the `questions` table with no
// `source` filter, so "Past Questions" practice mode was silently serving a
// random mix of real WAEC/JAMB past papers AND AI-generated questions, with
// no way for the student to tell which was which. The admin side already
// enforces this separation correctly (separate tabs, separate source filter
// in /api/admin/questions) — this route was the one place it leaked through.
//
// THE FIX: a new `source` query param, defaulting to 'past_paper' (since
// "Past Questions" is the practice page's primary mode and the historical
// expectation). Every branch now filters by source explicitly:
//
//   source=past_paper    → ONLY real WAEC/JAMB past paper questions (default)
//   source=ai_generated  → ONLY AI-generated questions
//   source=all           → both, explicitly opted into (e.g. for "mixed
//                           practice" if that's ever offered as its own mode)
//
// Each branch's fallback query (for the legacy exam_type column) ALSO
// applies the source filter — the original bug would have re-appeared in
// the fallback path otherwise, since that path was hand-written separately
// from the primary query.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap, fetchStudentAccuracy } from '@/lib/topicSequencer'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

const VALID_SOURCES = ['past_paper', 'ai_generated', 'all']

function normaliseSource(raw) {
  return VALID_SOURCES.includes(raw) ? raw : 'past_paper'
}

// Applies the source filter to a query, unless source is 'all'
function applySourceFilter(query, source) {
  if (source === 'all') return query
  return query.eq('source', source)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  let examType       = normaliseExamType(searchParams.get('exam') ?? 'WAEC')
  const count        = Math.min(parseInt(searchParams.get('count') ?? '20'), 200)
  const topicId      = searchParams.get('topic_id')
  const mode         = searchParams.get('mode') ?? 'practice'
  const subjectNames = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const source       = normaliseSource(searchParams.get('source'))

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

  const legacyExamFilter = examType === 'BOTH'
    ? ['WAEC', 'JAMB', 'BOTH']
    : [examType, 'BOTH']

  const allQuestions = []

  // ── BRANCH A: Exam simulation ──────────────────────────────────────────────
  // Exam mode should ALWAYS be real past papers, regardless of the `source`
  // param the caller passed — a mock exam built from AI-generated questions
  // would misrepresent the real exam's difficulty/style. Hard-coded here.
  if (mode === 'exam') {
    const examSource = 'past_paper'
    const perSubject = examType === 'JAMB' ? 40 : 50

    for (const subject of subjectRows) {
      const selectClause = `
        id, question_text, options, correct_answer, explanation,
        difficulty, subtopic_id, topic_id, subject_id, source,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `
      let query = service
        .from('questions')
        .select(selectClause)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .eq('source', examSource)
        .limit(perSubject + 20)

      let { data: questions, error } = await applyExamFilter(query, examType)

      if (error || !questions?.length) {
        const fallback = await service
          .from('questions')
          .select(selectClause)
          .eq('subject_id', subject.id)
          .eq('is_active', true)
          .eq('source', examSource)
          .in('exam_type', legacyExamFilter)
          .limit(perSubject + 20)
        questions = fallback.data ?? []
      }

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
    const selectClause = `
      id, question_text, options, correct_answer, explanation,
      difficulty, subtopic_id, topic_id, subject_id, source,
      subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
    `

    let query = service
      .from('questions')
      .select(selectClause)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .limit(count + 20)
    query = applySourceFilter(query, source)

    let { data: questions, error } = await applyExamFilter(query, examType)

    if (error || !questions?.length) {
      let fallback = service
        .from('questions')
        .select(selectClause)
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .in('exam_type', legacyExamFilter)
        .limit(count + 20)
      fallback = applySourceFilter(fallback, source)
      const fb = await fallback
      questions = fb.data ?? []
    }

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
      const selectClause = `
        id, question_text, options, correct_answer, explanation,
        difficulty, subtopic_id, topic_id, subject_id, source,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `

      let query = service
        .from('questions')
        .select(selectClause)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .limit(fetchLimit)
      query = applySourceFilter(query, source)

      let { data: rawQuestions, error } = await applyExamFilter(query, examType)

      if (error || !rawQuestions?.length) {
        let fallback = service
          .from('questions')
          .select(selectClause)
          .eq('subject_id', subject.id)
          .eq('is_active', true)
          .in('exam_type', legacyExamFilter)
          .limit(fetchLimit)
        fallback = applySourceFilter(fallback, source)
        const fb = await fallback
        rawQuestions = fb.data ?? []
      }

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
      const selected = sequenceQuestions({ questions: enriched, coreTopicIds, studentAcc, count: perSubject })
      allQuestions.push(...selected)
    }
  }

  return NextResponse.json({
    questions: allQuestions,
    source, // echoed back so the client can confirm/display what it got
  })
}