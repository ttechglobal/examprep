// src/app/api/admin/questions/route.js
// FIX: removed question_type from insert — column was dropped from DB

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const db = service()
  const { searchParams } = new URL(request.url)

  const examType   = searchParams.get('exam')
  const subjectId  = searchParams.get('subject')
  const topicId    = searchParams.get('topic')
  const subtopicId = searchParams.get('subtopic')
  const difficulty = searchParams.get('difficulty')
  const hasImage   = searchParams.get('has_image')
  const untagged   = searchParams.get('untagged')
  const search     = searchParams.get('search')
  const countOnly  = searchParams.get('countOnly') === 'true'
  const page       = parseInt(searchParams.get('page')  ?? '1')
  const limit      = parseInt(searchParams.get('limit') ?? '20')
  const offset     = (page - 1) * limit

  let query = db
    .from('questions')
    .select(`
      id, question_text, correct_answer, difficulty,
      has_image, year, exam_type, is_active, is_flagged, created_at,
      subjects  ( id, name, slug ),
      topics    ( id, name, slug ),
      subtopics ( id, name, slug )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (examType)          query = query.eq('exam_type',   examType)
  if (subjectId)         query = query.eq('subject_id',  subjectId)
  if (topicId)           query = query.eq('topic_id',    topicId)
  if (subtopicId)        query = query.eq('subtopic_id', subtopicId)
  if (difficulty)        query = query.eq('difficulty',  difficulty)
  if (hasImage === 'true') query = query.eq('has_image', true)
  if (untagged === 'true') query = query.is('subtopic_id', null)
  if (search)            query = query.ilike('question_text', `%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (countOnly) return NextResponse.json({ count: count ?? 0 })
  return NextResponse.json({ questions: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = service()
  const { questions, examType, subjectId, batchId } = await request.json()

  if (!questions?.length) {
    return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
  }

  const results = { saved: 0, errors: [] }

  for (const q of questions) {
    const { error } = await db.from('questions').insert({
      upload_batch_id:   batchId           ?? null,
      subject_id:        subjectId,
      topic_id:          q.topic_id        ?? null,
      subtopic_id:       q.subtopic_id     ?? null,
      exam_type:         examType,
      year:              q.year            ?? null,
      question_text:     q.question_text,
      has_image:         q.has_image       ?? false,
      image_description: q.image_description ?? null,
      image_url:         q.image_url       ?? null,
      options:           q.options,
      correct_answer:    q.correct_answer,
      explanation:       q.explanation,
      difficulty:        q.difficulty      ?? 'medium',
      // question_type intentionally omitted — column was dropped from DB
      source:            q.source          ?? 'past_paper',
      is_active:         true,
    })

    if (error) {
      results.errors.push(`"${q.question_text?.slice(0, 50)}…": ${error.message}`)
    } else {
      results.saved++
    }
  }

  if (batchId) {
    await db.from('upload_batches').update({
      saved:  results.saved,
      errors: results.errors.length,
    }).eq('id', batchId)
  }

  return NextResponse.json(results)
}