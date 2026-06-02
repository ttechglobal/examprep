// src/app/api/diagnostic/questions/route.js
// FIX: removed .in('question_type', questionTypes) from all queries
//      — column was dropped from the questions table

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap } from '@/lib/topicSequencer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjects  = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const examType  = searchParams.get('exam') ?? 'WAEC'
  const count     = Math.min(parseInt(searchParams.get('count') ?? '10'), 30)
  // question_types param kept for API compat but no longer used in queries
  // const questionTypes = searchParams.get('question_types')?.split(',') ?? ['objective']

  if (subjects.length === 0) {
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

  // Fetch core topic map — fail gracefully
  let coreTopicMap = {}
  try {
    const subjectIds = subjectRows.map(s => s.id)
    coreTopicMap = await fetchCoreTopicMap(db, subjectIds, examType)
  } catch {
    // Intentionally swallowed — random fallback handles it
  }

  const perSubject   = Math.ceil(count / subjectRows.length)
  const allQuestions = []
  const examFilter   = [examType, 'BOTH'].filter((v, i, a) => a.indexOf(v) === i)

  for (const subject of subjectRows) {
    const fetchLimit = Math.max(perSubject * 4, 40)

    const { data: rawQuestions } = await db
      .from('questions')
      .select(`
        id,
        question_text,
        options,
        correct_answer,
        explanation,
        difficulty,
        has_image,
        image_url,
        image_description,
        subtopic_id,
        topic_id,
        subject_id,
        subtopics ( id, name, slug ),
        topics    ( id, name, slug ),
        subjects  ( id, name, slug )
      `)
      .eq('subject_id', subject.id)
      .in('exam_type', examFilter)
      .eq('is_active', true)
      // question_type filter removed — column dropped
      .not('subtopic_id', 'is', null)
      .limit(fetchLimit)

    if (!rawQuestions?.length) continue

    const enriched = rawQuestions.map(q => ({
      ...q,
      subject_name:  subject.name,
      subject_slug:  subject.slug,
      topic_id:      q.subtopics?.topics?.id ?? q.topic_id ?? null,
      topic_name:    q.subtopics?.topics?.name ?? '',
      subtopic_name: q.subtopics?.name ?? '',
    }))

    const coreTopicIds = coreTopicMap[subject.id] ?? []
    const sequenced    = sequenceQuestions({ questions: enriched, coreTopicIds, studentAcc: null, count: perSubject })
    allQuestions.push(...sequenced)
  }

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!',
    }, { status: 404 })
  }

  return NextResponse.json({ questions: allQuestions.slice(0, count) })
}