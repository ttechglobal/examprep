// src/app/api/admin/questions/route.js
//
// FIXES:
// 1. GET 500 — select included `explanation_has_image` and `explanation_image_url`
//    which may not exist on the questions table yet. Removed these two columns
//    from the select; they're only needed in the single-question edit view, not
//    the list. If they ARE present they'll still come through via `options`
//    and `explanation` JSON fields.
// 2. exam filter — kept the existing .in('exam_type', [examType, 'BOTH']) pattern
//    which is correct for this admin route (it reads the old exam_type column,
//    not the new exam_types[] array, because admin questions may still be on the
//    old schema). Added a fallback: if the query errors (e.g. column type mismatch
//    after migration), retry without the exam filter so the page never 500s.
// 3. POST — added try/catch around request.json() to handle malformed bodies.

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
  const source     = searchParams.get('source')
  const countOnly  = searchParams.get('countOnly') === 'true'
  const missingImg = searchParams.get('missing_image') === 'true'
  const page       = parseInt(searchParams.get('page')  ?? '1')
  const limit      = parseInt(searchParams.get('limit') ?? '20')
  const offset     = (page - 1) * limit

  // NOTE: explanation_has_image and explanation_image_url removed from select —
  // these columns may not exist on all environments and caused 500s on the
  // questions list. They are still available on the single-question GET route
  // (/api/admin/questions/[id]) which fetches all columns explicitly.
  let query = db
    .from('questions')
    .select(`
      id, question_text, correct_answer, difficulty,
      has_image, image_url, image_description,
      year, exam_type, source, is_active, is_flagged, created_at,
      topic_id, subtopic_id, subject_id,
      subjects  ( id, name, slug ),
      topics    ( id, name, slug ),
      subtopics ( id, name, slug ),
      options, explanation
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Exam filter — uses old exam_type column (admin view, may be pre-migration)
  // Include BOTH rows when filtering by a specific exam type
  if (examType) {
    if (examType === 'BOTH') {
      query = query.eq('exam_type', 'BOTH')
    } else {
      query = query.in('exam_type', [examType, 'BOTH'])
    }
  }

  if (subjectId)           query = query.eq('subject_id',  subjectId)
  if (topicId)             query = query.eq('topic_id',    topicId)
  if (subtopicId)          query = query.eq('subtopic_id', subtopicId)
  if (difficulty)          query = query.eq('difficulty',  difficulty)
  if (hasImage === 'true') query = query.eq('has_image',   true)
  if (untagged === 'true') query = query.is('subtopic_id', null)
  if (source)              query = query.eq('source',      source)
  if (searchParams.get('year')) query = query.eq('year', searchParams.get('year'))
  if (search)              query = query.ilike('question_text', `%${search}%`)

  // missing_image: questions that mention an image in text but have no image_url
  if (missingImg) {
    query = query
      .eq('has_image', true)
      .is('image_url', null)
  }

  let { data, error, count } = await query

  // Fallback: if the query errored (e.g. exam_type column removed in migration),
  // retry without the exam filter so the list still loads
  if (error) {
    console.error('[admin/questions GET] primary query error:', error.message)

    let fallback = db
      .from('questions')
      .select(`
        id, question_text, correct_answer, difficulty,
        has_image, image_url, image_description,
        year, source, is_active, is_flagged, created_at,
        topic_id, subtopic_id, subject_id,
        subjects  ( id, name, slug ),
        topics    ( id, name, slug ),
        subtopics ( id, name, slug ),
        options, explanation
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (subjectId)           fallback = fallback.eq('subject_id',  subjectId)
    if (topicId)             fallback = fallback.eq('topic_id',    topicId)
    if (subtopicId)          fallback = fallback.eq('subtopic_id', subtopicId)
    if (difficulty)          fallback = fallback.eq('difficulty',  difficulty)
    if (hasImage === 'true') fallback = fallback.eq('has_image',   true)
    if (untagged === 'true') fallback = fallback.is('subtopic_id', null)
    if (source)              fallback = fallback.eq('source',      source)
    if (search)              fallback = fallback.ilike('question_text', `%${search}%`)

    const result = await fallback
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    data  = result.data
    count = result.count
  }

  if (countOnly) return NextResponse.json({ count: count ?? 0 })
  return NextResponse.json({ questions: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const db = service()
  const { questions, examType, subjectId, batchId } = body

  if (!questions?.length) {
    return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
  }

  const results = { saved: 0, errors: [] }

  for (const q of questions) {
    const { error } = await db.from('questions').insert({
      upload_batch_id:   batchId              ?? null,
      subject_id:        subjectId,
      topic_id:          q.topic_id           ?? null,
      subtopic_id:       q.subtopic_id        ?? null,
      exam_type:         q.exam_type          ?? examType,
      year:              q.year               ?? null,
      question_text:     q.question_text,
      has_image:         q.has_image          ?? false,
      image_description: q.image_description  ?? null,
      image_url:         q.image_url          ?? null,
      options:           q.options,
      correct_answer:    q.correct_answer,
      explanation:       q.explanation        ?? {},
      difficulty:        q.difficulty         ?? 'medium',
      source:            q.source             ?? 'past_paper',
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