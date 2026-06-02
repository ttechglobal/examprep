// src/app/api/questions/generated/route.js
// FIX: removed question_type from insert — column was dropped from DB

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questions, subtopicId, topicId, subjectId, examType } = await request.json()

  if (!questions?.length || !subtopicId || !subjectId) {
    return NextResponse.json(
      { error: 'questions, subtopicId, and subjectId are required' },
      { status: 400 }
    )
  }

  const db = service()
  const results = { saved: 0, errors: [] }

  for (const q of questions) {
    const explanation = {
      correct:       q.correct_explanation ?? q.explanation?.correct      ?? '',
      workings:      q.explanation?.workings      ?? [],
      wrong_options: q.wrong_explanations  ?? q.explanation?.wrong_options ?? {},
    }

    const { error } = await db.from('questions').insert({
      subject_id:     subjectId,
      topic_id:       topicId    ?? null,
      subtopic_id:    subtopicId,
      exam_type:      examType   ?? 'BOTH',
      year:           null,
      question_text:  q.question_text,
      has_image:      false,
      options:        q.options,
      correct_answer: q.correct_answer,
      explanation,
      difficulty:     q.difficulty ?? 'medium',
      // question_type intentionally omitted — column was dropped from DB
      source:         'ai_generated',
      is_active:      true,
    })

    if (error) {
      results.errors.push(`"${q.question_text?.slice(0, 40)}…": ${error.message}`)
    } else {
      results.saved++
    }
  }

  return NextResponse.json(results)
}