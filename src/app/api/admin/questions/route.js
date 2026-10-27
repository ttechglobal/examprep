import { reviewIssues, acceptedReviewIssues } from '@/lib/questionReview'
import { insertQuestionsWithSourceId } from '@/lib/questionUpdates'
import { questionDiagramMetadata, questionDiagram } from '@/lib/questionDiagrams'
import { contentText, safeContentImage, normalizeQuestionTargets } from '@/lib/questionContent'
import { ALL_EXAMS } from '@/lib/constants'
import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/questions/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/admin/questions?subject=...&page=...&limit=...&exam=...
//      &source=...&topic=...&difficulty=...&untagged=...&year=...&search=...
//
// POST /api/admin/questions
//      Saves a batch of questions and updates coverage_summary.
//
// COVERAGE SUMMARY UPDATE (added):
//   After every successful save, we upsert into coverage_summary:
//     (subject_id, exam_type, year) → count += N
//   This keeps the coverage page fast — it reads coverage_summary instead of
//   counting the full questions table, bypassing the 1,000-row Supabase cap.
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

  // ── yearCounts mode ────────────────────────────────────────────────────────
  if (yearCounts && subjectId && examType) {
    let q = db.from('questions').select('year').eq('is_active', true)
    q = q.eq('subject_id', subjectId)
    if (examType && examType !== 'ALL') {
      q = q.eq('exam_type', examType)
    }
    if (source) q = q.eq('source', source)
    const { data, error } = await q.limit(50000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const counts = {}
    for (const row of (data ?? [])) {
      if (row.year) counts[row.year] = (counts[row.year] ?? 0) + 1
    }
    return NextResponse.json({ yearCounts: counts })
  }

  const selectClause = `
    id, question_text, instruction_text, passage_text, passage_image_url, correct_answer, difficulty,
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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (inactive === 'true') query = query.eq('is_active', false)
  else if (flagged !== 'true') query = query.eq('is_active', true)

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
    query = query.eq('exam_type', examType)
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

  return NextResponse.json({ questions, total: count ?? 0, page, limit })
}

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const db = svc()
  const { questions, examType, subjectId, batchId, defaultYear, reviewOnly = false } = await request.json()

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
  }
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }

  if (!ALL_EXAMS.includes(examType)) return NextResponse.json({ error: 'Invalid examType' }, { status: 400 })
  const { data: subject, error: subjectError } = await db.from('subjects').select('exam_type,name').eq('id', subjectId).single()
  if (subjectError || !subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  if (subject.exam_type !== examType) return NextResponse.json({ error: 'Exam must match the selected subject' }, { status: 400 })

  const saved  = []
  const errors = []

  for (const q of questions) {
    try {
      const diagram = questionDiagram(q)
      if (diagram.required && !diagram.ready) {
        errors.push(`Q "${q.question_text?.slice(0, 40)}": Add and check the source diagram before saving this question. Keep it in the Held queue until then.`)
        continue
      }
      const issues = reviewIssues({ ...q, subject_name: subject.name ?? q.subject })
      if (issues.length && !reviewOnly) { errors.push(`Q "${q.question_text?.slice(0, 40)}": ${issues.join(' ')}`); continue }
      const row = {
        question_text:      normalizeQuestionTargets(q.question_text, q.instruction_text),
        options:            Object.fromEntries(Object.entries(q.options ?? {}).map(([k, v]) => [k, contentText(v) || (/<img\b/i.test(String(v)) ? `See option ${k.toUpperCase()} in the source diagram.` : '')])),
        correct_answer:     q.correct_answer ?? '',
        explanation:        reviewOnly ? { ...(q.explanation ?? {}), content_review: { status: 'needs_review', issues: issues.length ? issues : ['Flagged by an administrator for source verification.'], source: q._sourceQuestion ?? null, created_at: new Date().toISOString() } } : acceptedReviewIssues(q).length ? { ...(q.explanation ?? {}), content_review: { status: 'reviewed', issues: [], accepted_issues: acceptedReviewIssues(q), note: q._reviewDecision.note.trim(), reviewed_at: new Date().toISOString() } } : q.explanation ?? {},
        difficulty:         q.difficulty ?? 'medium',

        passage_text:       contentText(q.passage_text) || null,
        instruction_text:  contentText(q.instruction_text) || null,
        passage_image_url:  safeContentImage(q.passage_image_url),

        has_image:          q.has_image          ?? false,
        image_url:          q.image_url          ?? null,
        image_description:  q.image_description  ?? null,

        exam_type:    examType,
        exam_types:   [examType],
        subject_id:   subjectId,
        topic_id:     q.topic_id    ?? null,
        subtopic_id:  q.subtopic_id ?? null,
        year:         q.year || defaultYear || null,
        source:       q.source ?? 'past_paper',
        ...(q.sdash_id ? { sdash_id: q.sdash_id } : {}),

        is_active:  !reviewOnly,
        is_flagged: !!reviewOnly,
      }
      if (questionDiagram(q).required) {
        row.has_image = true
        row.image_url = questionDiagram(q).image_url
        row.image_description = questionDiagram(q).description
        row.explanation = { ...(row.explanation ?? {}), question_diagram: questionDiagramMetadata(q) }
      }

      const { data, error } = await insertQuestionsWithSourceId(changes => db
        .from('questions')
        .insert(changes)
        .select('id')
        .single(), row)

      if (error) {
        errors.push(`Q "${q.question_text?.slice(0, 40)}…": ${error.message}`)
      } else {
        saved.push({ id: data.id, year: row.year, examType: row.exam_type })
      }
    } catch (err) {
      errors.push(`Q "${q.question_text?.slice(0, 40)}…": ${err.message}`)
    }
  }

  // ── Update coverage_summary ───────────────────────────────────────────────
  // Group saved questions by (exam_type, year) and call the atomic
  // increment_coverage() Postgres function once per bucket.
  // This is a single DB round-trip per unique (year, examType) pair —
  // no race condition, no manual SQL needed after importing.
  if (saved.length > 0 && !reviewOnly) {
    const buckets = {}
    for (const { year, examType: et } of saved) {
      if (!year || !et) continue
      const key = `${et}::${year}`
      buckets[key] = (buckets[key] ?? 0) + 1
    }

    await Promise.all(
      Object.entries(buckets).map(([key, delta]) => {
        const [et, yr] = key.split('::')
        return db.rpc('increment_coverage', {
          p_subject_id: subjectId,
          p_exam_type:  et,
          p_year:       parseInt(yr),
          p_delta:      delta,
        }).then(({ error }) => {
          if (error) console.warn('[coverage_summary] increment failed:', error.message)
        })
      })
    )
  }

  if (batchId) {
    await db
      .from('upload_batches')
      .update({ saved: saved.length, errors: errors.length })
      .eq('id', batchId)
  }

  return NextResponse.json({
    saved:  saved.length,
    flagged: reviewOnly ? saved.length : 0,
    ids:    saved.map(s => s.id),
    errors,
  })
}
