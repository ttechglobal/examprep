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
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  const subjectId   = searchParams.get('subject')      // matches caller param name
  const topicId     = searchParams.get('topic')
  const subtopicId  = searchParams.get('subtopic')
  const examType    = searchParams.get('exam')          // 'ALL' or omitted = no filter
  const difficulty  = searchParams.get('difficulty')
  const source      = searchParams.get('source')        // 'past_paper' | 'ai_generated' | omitted = both
  const untagged    = searchParams.get('untagged')       // 'true' = subtopic_id IS NULL
  const hasImage    = searchParams.get('has_image')
  const missingImg  = searchParams.get('missing_image')
  const year        = searchParams.get('year')
  const search      = searchParams.get('search')
  const page        = parseInt(searchParams.get('page')  ?? '1')
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100)
  const offset      = (page - 1) * limit

  const db = svc()

  // NOTE: explanation_has_image and explanation_image_url omitted from select —
  // these columns don't exist on every environment and previously caused 500s
  // on this list. They're still available on the single-question GET route
  // (/api/admin/questions/[id]) which selects all columns explicitly.
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
  if (hasImage === 'true')   query = query.eq('has_image', true)
  if (year)                  query = query.eq('year', year)
  if (search)                query = query.ilike('question_text', `%${search}%`)

  if (missingImg) {
    query = query.eq('has_image', true).is('image_url', null)
  }

  // Exam filter — legacy exam_type column, BOTH always included alongside
  // the requested exam type. 'ALL' (or omitted) means no exam filter.
  if (examType && examType !== 'ALL') {
    query = examType === 'BOTH'
      ? query.eq('exam_type', 'BOTH')
      : query.in('exam_type', [examType, 'BOTH'])
  }

  let { data, error, count } = await query

  // Fallback: if exam_types[] array column lookup ever gets introduced and
  // errors on environments where it doesn't exist yet, retry without it.
  // (Kept defensive even though this route currently only uses exam_type —
  // matches the resilience pattern used throughout the rest of this codebase.)
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