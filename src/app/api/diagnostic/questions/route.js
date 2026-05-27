import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjects = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const examType = searchParams.get('exam') ?? 'WAEC'
  const count = Math.min(parseInt(searchParams.get('count') ?? '10'), 30)

  if (subjects.length === 0) {
    return NextResponse.json({ error: 'At least one subject is required' }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subjectRows } = await supabase
    .from('subjects')
    .select('id, name, slug')
    .in('name', subjects)

  if (!subjectRows?.length) {
    return NextResponse.json({ error: 'Subjects not found' }, { status: 404 })
  }

  const perSubject = Math.ceil(count / subjectRows.length)
  const allQuestions = []

  for (const subject of subjectRows) {
    const { data: questions } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        options,
        explanation,
        difficulty,
        question_type,
        subtopic_id,
        subject_id,
        subtopics (
          id,
          name,
          slug,
          topic_id,
          topics (
            id,
            name,
            slug
          )
        )
      `)
      .eq('subject_id', subject.id)
      .in('exam_type', [examType, 'BOTH'])
      .eq('is_active', true)
      .eq('type', 'mcq')
      .limit(perSubject + 5)

    if (questions?.length) {
      const mapped = questions.map(q => ({
        ...q,
        subject_name: subject.name,
        subject_slug: subject.slug,
        subtopic_name: q.subtopics?.name ?? '',
        topic_name: q.subtopics?.topics?.name ?? '',
        topic_id: q.subtopics?.topics?.id ?? null,
      }))
      allQuestions.push(...mapped)
    }
  }

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!'
    }, { status: 404 })
  }

  const shuffled = allQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count)

  return NextResponse.json({ questions: shuffled })
}