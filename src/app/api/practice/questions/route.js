// src/app/api/practice/questions/route.js
// Updated: exam_type → exam_types[] (contains filter via @>)
//
// FIX: Added fallback for questions that still have the old single-value
// exam_type column (pre-migration rows). If the exam_types[] contains filter
// returns an error (column doesn't exist) OR returns no results, we retry
// using the legacy .in('exam_type', [...]) filter so the public /practice
// page never shows "No questions available" due to a DB migration state.
// This mirrors the same pattern already used in api/admin/questions/coverage.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap, fetchStudentAccuracy } from '@/lib/topicSequencer'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

// ── Helper: fetch questions with exam_types[] fallback ────────────────────────
// Tries the new exam_types @> filter first. If that returns an error (column
// doesn't exist yet) OR returns empty when we know there should be questions,
// retries with the legacy exam_type .in() filter.
async function fetchQuestionsWithFallback(baseQuery, examType) {
  const { data, error } = await applyExamFilter(baseQuery, examType)

  // If the contains filter errored (column missing on pre-migration DB),
  // fall back to the old single-value exam_type column.
  if (error) {
    const legacyFilter = examType === 'BOTH'
      ? ['WAEC', 'JAMB', 'BOTH']
      : [examType, 'BOTH']
    // baseQuery is already consumed, so we return null here — callers
    // must re-build the query for the fallback path (see usage below).
    return { data: null, error, needsFallback: true, legacyFilter }
  }

  return { data, error: null, needsFallback: false }
}

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

  // Determine the legacy exam_type values to match (used in fallback queries)
  const legacyExamFilter = examType === 'BOTH'
    ? ['WAEC', 'JAMB', 'BOTH']
    : [examType, 'BOTH']

  const allQuestions = []

  // ── BRANCH A: Exam simulation ──────────────────────────────────────────────
  if (mode === 'exam') {
    const perSubject = examType === 'JAMB' ? 40 : 50

    for (const subject of subjectRows) {
      const selectClause = `
        id, question_text, options, correct_answer, explanation,
        difficulty, subtopic_id, topic_id, subject_id,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `
      let query = service
        .from('questions')
        .select(selectClause)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .limit(perSubject + 20)

      let { data: questions, error } = await applyExamFilter(query, examType)

      // Fallback to legacy exam_type column if new column not available or errored
      if (error || !questions?.length) {
        const fallback = await service
          .from('questions')
          .select(selectClause)
          .eq('subject_id', subject.id)
          .eq('is_active', true)
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
      difficulty, subtopic_id, topic_id, subject_id,
      subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
    `

    let query = service
      .from('questions')
      .select(selectClause)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .limit(count + 20)

    let { data: questions, error } = await applyExamFilter(query, examType)

    // Fallback
    if (error || !questions?.length) {
      const fallback = await service
        .from('questions')
        .select(selectClause)
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .in('exam_type', legacyExamFilter)
        .limit(count + 20)
      questions = fallback.data ?? []
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
        difficulty, subtopic_id, topic_id, subject_id,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `

      let query = service
        .from('questions')
        .select(selectClause)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .limit(fetchLimit)

      let { data: rawQuestions, error } = await applyExamFilter(query, examType)

      // Fallback: exam_types[] column missing or not yet populated
      if (error || !rawQuestions?.length) {
        const fallback = await service
          .from('questions')
          .select(selectClause)
          .eq('subject_id', subject.id)
          .eq('is_active', true)
          .in('exam_type', legacyExamFilter)
          .limit(fetchLimit)
        rawQuestions = fallback.data ?? []
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

  return NextResponse.json({ questions: allQuestions })
}