import { reviewIssues, allReviewIssues, canAcceptReviewIssue, reviewSignature } from '@/lib/questionReview'
import { updateQuestionWithTimestamp } from '@/lib/questionUpdates'
import { ALL_EXAMS } from '@/lib/constants'
import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/questions/[id]/route.js
// PATCH — edit a question's fields
// DELETE — archive (soft) or hard-delete (?hard=true)


import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}


// ── PATCH — update question fields ───────────────────────────────────────────
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const body   = await request.json()

  const allowed = [
    'question_text', 'options', 'correct_answer',
    'difficulty', 'exam_type',
    'topic_id', 'subtopic_id',
    'has_image', 'image_url', 'image_description',
    'passage_text', 'passage_image_url', 'instruction_text',
    'explanation', 'is_active', 'is_flagged',
  ]

  const update = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0 && body.review_action !== 'approve') {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }


  const db = svc()
  if (body.review_action === 'approve') {
    const { data: existing, error } = await db.from('questions').select('*').eq('id', id).single()
    if (error || !existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    const explanation = { ...(update.explanation ?? existing.explanation ?? {}), content_review: {
      ...(existing.explanation?.content_review ?? {}), status: 'reviewed', issues: [],
      note: String(body.review_note ?? '').trim() || 'Administrator checked the question, options and answer and confirmed they are correct.',
      reviewed_at: new Date().toISOString(),
    } }
    const candidate = { ...existing, ...update, explanation }
    const issues = allReviewIssues(candidate)
    const blocking = issues.filter(issue => !canAcceptReviewIssue(issue, candidate))
    if (blocking.length) return NextResponse.json({ error: blocking.join(' ') }, { status: 400 })
    explanation.content_review.accepted_issues = issues
    explanation.content_review.signature = reviewSignature(candidate)
    Object.assign(update, { explanation, is_active: true, is_flagged: false })
  }
  if (update.is_active === true || update.is_flagged === false || update.explanation?.content_review?.status === 'reviewed') {
    const { data: existing, error: fetchError } = await db.from('questions').select('*').eq('id', id).single()
    if (fetchError || !existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    const merged = { ...existing, ...update }
    const pending = existing.explanation?.content_review?.status === 'needs_review'
    const reviewed = update.explanation?.content_review?.status === 'reviewed' && update.explanation?.content_review?.note?.trim()
    if (pending && !reviewed) return NextResponse.json({ error: 'Resolve the review issues and record your source/reference before clearing the flag or publishing.' }, { status: 400 })
    const issues = reviewIssues(merged)
    if (issues.length) return NextResponse.json({ error: issues.join(' ') }, { status: 400 })
  }
  if (update.exam_type !== undefined) {
    if (!ALL_EXAMS.includes(update.exam_type)) return NextResponse.json({ error: 'Invalid exam_type' }, { status: 400 })
    const { data: existing } = await db.from('questions').select('subject_id').eq('id', id).single()
    const { data: subject } = existing ? await db.from('subjects').select('exam_type').eq('id', existing.subject_id).single() : { data: null }
    if (!subject || subject.exam_type !== update.exam_type) return NextResponse.json({ error: 'Exam must match the selected subject' }, { status: 400 })
    update.exam_types = [update.exam_type]
  }
  const { data, error } = await updateQuestionWithTimestamp(changes => db
    .from('questions')
    .update(changes)
    .eq('id', id)
    .select(`
      id, question_text, instruction_text, passage_text, passage_image_url, options, correct_answer,
      difficulty, exam_type, has_image, image_url, image_description,
      explanation, is_active, is_flagged, year, source,
      topic_id, subtopic_id, subject_id,
      topics    ( id, name ),
      subtopics ( id, name ),
      subjects  ( id, name )
    `)
    .single(), update)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE — archive (soft) or hard delete ───────────────────────────────────
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id }   = await params
  const hardDelete = new URL(request.url).searchParams.get('hard') === 'true'
  const db = svc()

  if (hardDelete) {
    const { error } = await db.from('questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  }

  // Soft delete — set is_active = false
  const { error } = await updateQuestionWithTimestamp(changes => db
    .from('questions')
    .update(changes)
    .eq('id', id), { is_active: false, is_flagged: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ archived: true })
}
