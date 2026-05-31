// src/app/api/practice/questions/route.js
// Fixes:
// - Changed .eq('type', 'mcq') → .eq('question_type', 'objective') — this was the
//   root cause of questions not loading (wrong column name)
// - Added optional topic_id param for topic-specific practice
// - Added mode param for exam simulation (distributes questions across JAMB subjects)
// - Raised count cap from 30 to 200 to support exam simulation (160 questions)
// - Removed exam_type filter mismatch — now handles 'BOTH' correctly

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  let examType     = searchParams.get('exam') ?? 'WAEC'
  const count      = Math.min(parseInt(searchParams.get('count') ?? '20'), 200)
  const topicId    = searchParams.get('topic_id')   // optional — topic-specific practice
  const mode       = searchParams.get('mode') ?? 'practice'
  const subjectNames = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Resolve subjects: from param or from authenticated user's profile
  let subjects = subjectNames
  if (!subjects.length) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await service
        .from('profiles').select('subjects, exam_type').eq('id', user.id).single()
      subjects = profile?.subjects ?? []
      if (profile?.exam_type) examType = profile.exam_type
    }
  }

  if (!subjects.length) {
    return NextResponse.json({ error: 'No subjects found' }, { status: 400 })
  }

  // Fetch subject rows
  const { data: subjectRows } = await service
    .from('subjects').select('id, name, slug').in('name', subjects)

  if (!subjectRows?.length) {
    return NextResponse.json({ error: 'Subjects not found in database' }, { status: 404 })
  }

  const allQuestions = []

  // ── Exam simulation: distribute questions across subjects ─────────────────
  if (mode === 'exam') {
    // JAMB: ~40 questions per subject across all JAMB subjects
    // WAEC: ~50 questions per subject (but we show one subject at a time for UX)
    const perSubject = examType === 'JAMB' ? 40 : 50
    const examFilter = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : [examType, 'BOTH']

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
        .eq('question_type', 'objective')
        .limit(perSubject + 20) // fetch extra for shuffle

      if (questions?.length) {
        const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, perSubject)
        allQuestions.push(...shuffled.map(q => ({
          ...q,
          subject_name: subject.name,
          subject_slug: subject.slug,
          subtopic_name: q.subtopics?.name ?? '',
          topic_name:    q.subtopics?.topics?.name ?? '',
          topic_id:      q.subtopics?.topics?.id ?? q.topic_id ?? null,
        })))
      }
    }
  }
  // ── Topic-specific practice ───────────────────────────────────────────────
  else if (topicId) {
    const examFilter = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : ['BOTH', examType]
    const subject    = subjectRows[0]

    const { data: questions } = await service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation,
        difficulty, question_type, subtopic_id, topic_id, subject_id,
        subtopics ( id, name, slug, topic_id, topics ( id, name, slug ) )
      `)
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .eq('question_type', 'objective')
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
  // ── Normal practice: spread across subjects ───────────────────────────────
  else {
    const perSubject = Math.ceil(count / subjectRows.length)
    const examFilter = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : ['BOTH', examType]

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
        .eq('question_type', 'objective')
        .limit(perSubject + 10)

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

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!',
    }, { status: 404 })
  }

  // Final shuffle + trim
  const final = allQuestions.sort(() => Math.random() - 0.5).slice(0, count)

  return NextResponse.json({
    questions: final,
    count: final.length,
    examType,
    mode,
  })
}