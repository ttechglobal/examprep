import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  let examType = searchParams.get('exam') ?? 'WAEC'
  const count = Math.min(parseInt(searchParams.get('count') ?? '10'), 30)
  const subjectNames = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // If no subjects passed, try to get from authenticated user's profile
  let subjects = subjectNames
  if (!subjects.length) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await service
        .from('profiles')
        .select('subjects, exam_type')
        .eq('id', user.id)
        .single()
      subjects = profile?.subjects ?? []
      if (!examType && profile?.exam_type) {
        examType = profile.exam_type
      }
    }
  }

  if (!subjects.length) {
    return NextResponse.json({ error: 'No subjects found' }, { status: 400 })
  }

  // Get subject rows
  const { data: subjectRows } = await service
    .from('subjects')
    .select('id, name, slug')
    .in('name', subjects)

  if (!subjectRows?.length) {
    return NextResponse.json({ error: 'Subjects not found' }, { status: 404 })
  }

  const subjectIds = subjectRows.map(s => s.id)

  // Fetch questions spread across subjects
  const perSubject = Math.ceil(count / subjectRows.length)
  const allQuestions = []

  for (const subject of subjectRows) {
    const { data: questions } = await service
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
      .limit(perSubject + 5) // fetch a few extra then shuffle

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
      error: 'No questions available yet. Check back soon!'
    }, { status: 404 })
  }

  // Shuffle and trim to requested count
  const shuffled = allQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count)

  return NextResponse.json({
    questions: shuffled,
    totalTime: count === 10 ? 15 : count === 20 ? 30 : 45,
    examType,
  })
}