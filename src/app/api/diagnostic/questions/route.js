// src/app/api/diagnostic/questions/route.js
//
// FIX: applyExamFilter uses .contains('exam_types', [...]) which requires the
// exam_types[] array column to be populated. If questions were inserted before
// that migration (exam_types is null/empty), contains() returns zero rows and
// the diagnostic spins forever.
//
// Fix: after applyExamFilter, if result is empty OR errored, retry with the
// legacy .in('exam_type', [examType, 'BOTH']) filter. Same pattern as
// api/practice/questions/route.js Branch C.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap } from '@/lib/topicSequencer'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjects = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const examType = normaliseExamType(searchParams.get('exam') ?? 'WAEC')
  const count    = Math.min(parseInt(searchParams.get('count') ?? '10'), 30)

  if (!subjects.length) {
    return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subjectRows } = await db
    .from('subjects')
    .select('id, name, slug')
    .in('name', subjects)

  if (!subjectRows?.length) {
    return NextResponse.json({ error: 'Subjects not found' }, { status: 404 })
  }

  let coreTopicMap = {}
  try {
    coreTopicMap = await fetchCoreTopicMap(db, subjectRows.map(s => s.id), examType)
  } catch {
    // falls back to random selection
  }

  // Legacy filter for fallback path
  const legacyValues = [examType, 'BOTH']

  const perSubject   = Math.ceil(count / subjectRows.length)
  const allQuestions = []

  const SELECT = `
    id, question_text, options, correct_answer, explanation,
    difficulty, has_image, image_url, image_description,
    subtopic_id, topic_id, subject_id,
    subtopics ( id, name, slug ),
    topics    ( id, name, slug ),
    subjects  ( id, name, slug )
  `

  for (const subject of subjectRows) {
    const fetchLimit = Math.max(perSubject * 4, 40)

    const baseQuery = db
      .from('questions')
      .select(SELECT)
      .eq('subject_id', subject.id)
      .eq('is_active', true)
      .not('subtopic_id', 'is', null)
      .limit(fetchLimit)

    // Try new exam_types[] column first
    let { data: rawQuestions, error } = await applyExamFilter(baseQuery, examType)

    // Fallback: exam_types[] not populated — use legacy exam_type string column
    if (error || !rawQuestions?.length) {
      const fb = await db
        .from('questions')
        .select(SELECT)
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .not('subtopic_id', 'is', null)
        .in('exam_type', legacyValues)
        .limit(fetchLimit)
      rawQuestions = fb.data ?? []
    }

    if (!rawQuestions?.length) continue

    const enriched = rawQuestions.map(q => ({
      ...q,
      subject_name:  subject.name,
      subject_slug:  subject.slug,
      topic_id:      q.topics?.id      ?? q.topic_id      ?? null,
      topic_name:    q.topics?.name    ?? '',
      subtopic_name: q.subtopics?.name ?? '',
    }))

    const coreTopicIds = coreTopicMap[subject.id] ?? []
    const selected = sequenceQuestions({ questions: enriched, coreTopicIds, studentAcc: null, count: perSubject })
    allQuestions.push(...selected)
  }

  if (!allQuestions.length) {
    return NextResponse.json(
      { error: 'No questions found for the selected subjects. Please upload past questions first.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ questions: allQuestions })
}