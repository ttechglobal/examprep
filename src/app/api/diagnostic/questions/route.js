// src/app/api/diagnostic/questions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Modified: core topic sequencing added.
//
// Change from original:
//   After fetching the full question pool per subject, we now:
//   1. Fetch core_topics for these subjects (from DB)
//   2. Call sequenceQuestions() — core topic questions appear first
//   3. If no core topics defined for a subject → pure random shuffle (unchanged)
//   4. Entire sequencing block is wrapped in try/catch — any DB error means
//      the original random selection runs instead. Session never fails.
//
// question_types param added (defaults to ['objective']) for future theory support.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sequenceQuestions, fetchCoreTopicMap } from '@/lib/topicSequencer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjects      = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const examType      = searchParams.get('exam') ?? 'WAEC'
  const count         = Math.min(parseInt(searchParams.get('count') ?? '10'), 30)
  // question_types: comma-separated list — defaults to 'objective' for backward compat
  const questionTypes = searchParams.get('question_types')?.split(',').filter(Boolean) ?? ['objective']

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

  // ── Fetch core topic map (subject_id → topicId[]) ─────────────────────────
  // Wrapped in try/catch — failure degrades gracefully to random selection.
  let coreTopicMap = {}
  try {
    const subjectIds = subjectRows.map(s => s.id)
    coreTopicMap = await fetchCoreTopicMap(db, subjectIds, examType)
  } catch {
    // Intentionally swallowed — random fallback handles it below
  }

  const perSubject    = Math.ceil(count / subjectRows.length)
  const allQuestions  = []
  const examFilter    = [examType, 'BOTH'].filter((v, i, a) => a.indexOf(v) === i)

  for (const subject of subjectRows) {
    // Fetch a larger pool so the sequencer has enough questions to pick from
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
        question_type,
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
      .in('question_type', questionTypes)
      .not('subtopic_id', 'is', null)
      .limit(fetchLimit)

    if (!rawQuestions?.length) continue

    const enriched = rawQuestions.map(q => ({
      ...q,
      subject_name: subject.name,
      subject_slug: subject.slug,
      // Normalise topic_id — subtopics join gives us the canonical topic
      topic_id: q.subtopics?.topics?.id ?? q.topic_id ?? null,
      topic_name:    q.subtopics?.topics?.name ?? '',
      subtopic_name: q.subtopics?.name ?? '',
    }))

    // ── Apply core topic sequencing ───────────────────────────────────────
    const coreTopicIds = coreTopicMap[subject.id] ?? []

    const sequenced = sequenceQuestions({
      questions:    enriched,
      coreTopicIds,
      studentAcc:   null,   // diagnostic = no history yet
      count:        perSubject,
    })

    allQuestions.push(...sequenced)
  }

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!',
    }, { status: 404 })
  }

  // Final: trim to requested count.
  // Note: we do NOT re-shuffle here — the sequencer already set the order.
  // Each subject's chunk is independently sequenced, so the overall order is:
  //   [subject1_core_first…, subject2_core_first…, …]
  // This is intentional for the diagnostic.
  const final = allQuestions.slice(0, count)

  return NextResponse.json({ questions: final })
}