import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/questions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: this file had been corrupted/overwritten with the content of
// src/app/api/admin/questions/coverage/route.js (wrong file, wrong params —
// it expected `subjectId` while every caller sends `subject`, causing every
// request to 400 immediately with "subjectId required"). This is the actual,
// correct questions LIST endpoint, restored to match what
// src/app/admin/questions/page.js and src/app/admin/past-questions/page.js
// actually call:
//
//   GET /api/admin/questions?subject=...&page=...&limit=...&exam=...
//       &source=...&topic=...&difficulty=...&untagged=...&year=...&search=...
//
// Returns { questions: [...], total: N } — paginated, with subject/topic/
// subtopic names attached for display, supporting both the Bank tab
// (no source filter, all questions) and the Past Questions tab (source
// passed explicitly by the caller).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)

  const subjectId   = searchParams.get('subject') ?? searchParams.get('subjectId')
  const topicId     = searchParams.get('topic')
  const subtopicId  = searchParams.get('subtopic')
  const examType    = searchParams.get('exam') ?? searchParams.get('examType')
  const difficulty  = searchParams.get('difficulty')
  const source      = searchParams.get('source')
  const untagged    = searchParams.get('untagged')
  const inactive    = searchParams.get('inactive')
  const flagged     = searchParams.get('flagged')
  const hasImage    = searchParams.get('has_image')
  const missingImg  = searchParams.get('missing_image')
  const year        = searchParams.get('year')
  const search      = searchParams.get('search')
  const yearCounts  = searchParams.get('yearCounts') === 'true'
  const page        = parseInt(searchParams.get('page')  ?? '1')
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? searchParams.get('perPage') ?? '25'), 100)
  const offset      = (page - 1) * limit

  const db = svc()

  // ── yearCounts mode: return { year: count } map for this subject+exam ───────
  if (yearCounts && subjectId && examType) {
    let q = db.from('questions').select('year').eq('is_active', true)
    q = q.eq('subject_id', subjectId).eq('exam_type', examType)
    if (source) q = q.eq('source', source)
    const { data, error } = await q.limit(5000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const counts = {}
    for (const row of (data ?? [])) {
      if (row.year) counts[row.year] = (counts[row.year] ?? 0) + 1
    }
    return NextResponse.json({ yearCounts: counts })
  }

  const selectClause = `
    id, question_text, correct_answer, difficulty,
    has_image, image_url, image_description,
    year, exam_type, source, is_active, is_flagged, created_at,
    topic_id, subtopic_id, subject_id,
    subjects  ( id, name, slug ),
    topics    ( id, name, slug ),
    subtopics ( id, name, slug ),
    options, explanation
  `

  let query = db
    .from('questions')
    .select(selectClause, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (subjectId)             query = query.eq('subject_id', subjectId)
  if (topicId)               query = query.eq('topic_id', topicId)
  if (subtopicId)            query = query.eq('subtopic_id', subtopicId)
  if (difficulty)            query = query.eq('difficulty', difficulty)
  if (source)                query = query.eq('source', source)
  if (untagged === 'true')   query = query.is('subtopic_id', null)
  if (flagged  === 'true')   query = query.eq('is_flagged', true)
  if (hasImage === 'true')   query = query.eq('has_image', true)
  if (year)                  query = query.eq('year', year)
  if (search)                query = query.ilike('question_text', `%${search}%`)

  if (missingImg) {
    query = query.eq('has_image', true).is('image_url', null)
  }

  if (examType && examType !== 'ALL') {
    query = examType === 'BOTH'
      ? query.eq('exam_type', 'BOTH')
      : query.in('exam_type', [examType, 'BOTH'])
  }

  let { data, error, count } = await query

  if (error) {
    console.error('[admin/questions] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const questions = (data ?? []).map(q => ({
    ...q,
    subject_name:  q.subjects?.name  ?? '',
    subject_slug:  q.subjects?.slug  ?? '',
    topic_name:    q.topics?.name    ?? '',
    subtopic_name: q.subtopics?.name ?? '',
  }))

  return NextResponse.json({
    questions,
    total: count ?? 0,
    page,
    limit,
  })
}

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const db = svc()
  const { questions, examType, subjectId, batchId, defaultYear } = await request.json()

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
  }
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }

  const saved  = []
  const errors = []

  for (const q of questions) {
    try {
      const row = {
        question_text:      q.question_text?.trim() ?? '',
        options:            q.options ?? {},
        correct_answer:     q.correct_answer ?? '',
        explanation:        q.explanation ?? {},
        difficulty:         q.difficulty ?? 'medium',

        passage_text:       q.passage_text     ?? null,
        passage_image_url:  q.passage_image_url ?? null,

        has_image:          q.has_image         ?? false,
        image_url:          q.image_url         ?? null,
        image_description:  q.image_description ?? null,

        exam_type:    examType,
        subject_id:   subjectId,
        topic_id:     q.topic_id    ?? null,
        subtopic_id:  q.subtopic_id ?? null,
        year:         q.year || defaultYear || null,
        source:       q.source ?? 'past_paper',

        is_active:  true,
        is_flagged: false,
      }

      const { data, error } = await db
        .from('questions')
        .insert(row)
        .select('id')
        .single()

      if (error) {
        errors.push(`Q "${q.question_text?.slice(0, 40)}…": ${error.message}`)
      } else {
        saved.push(data.id)
      }
    } catch (err) {
      errors.push(`Q "${q.question_text?.slice(0, 40)}…": ${err.message}`)
    }
  }

  if (batchId) {
    await db
      .from('upload_batches')
      .update({ saved: saved.length, errors: errors.length })
      .eq('id', batchId)
  }

  return NextResponse.json({
    saved:  saved.length,
    ids:    saved,
    errors,
  })
}