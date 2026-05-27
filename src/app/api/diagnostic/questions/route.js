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

  const perSubject = Math.ceil(count / subjectRows.length)
  const allQuestions = []

  for (const subject of subjectRows) {
    const { data: questions } = await db
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
        topics ( id, name, slug ),
        subjects ( id, name, slug )
      `)
      .eq('subject_id', subject.id)
      .in('exam_type', [examType, 'BOTH'])
      .eq('is_active', true)
      .eq('question_type', 'objective')
      .not('subtopic_id', 'is', null)
      .limit(perSubject + 5)

    if (questions?.length) {
      const shuffled = questions
        .sort(() => Math.random() - 0.5)
        .slice(0, perSubject)
        .map(q => ({
          ...q,
          subject_name: subject.name,
          subject_slug: subject.slug,
        }))
      allQuestions.push(...shuffled)
    }
  }

  if (!allQuestions.length) {
    return NextResponse.json({
      error: 'No questions available yet for these subjects. Check back soon!'
    }, { status: 404 })
  }

  const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, count)
  return NextResponse.json({ questions: shuffled })
}