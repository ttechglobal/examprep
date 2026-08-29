import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/questions/hidden/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Hidden Questions API
//
// Hidden questions are questions that an admin manually reviewed and decided
// not to import yet — typically because they reference a missing image, have
// a mismatch in their explanation, or are missing context (e.g. English
// questions with no instructions). They are stored so they can be edited and
// restored later.
//
// POST   /api/admin/questions/hidden     — save a question as hidden
// GET    /api/admin/questions/hidden     — list hidden questions (optionally filtered)
// PATCH  /api/admin/questions/hidden     — restore a hidden question (moves it to questions table)
// DELETE /api/admin/questions/hidden     — permanently delete a hidden question
//
// Table: hidden_questions
//   id             uuid PK
//   question_text  text
//   options        jsonb
//   correct_answer text
//   explanation    jsonb
//   subject_name   text
//   exam_type      text
//   year           text
//   topic_title    text
//   subtopic_title text
//   difficulty     text
//   hide_reason    text   — 'manual_review' | 'image_required' | 'mismatch' | 'missing_context'
//   sdash_id       text   — original SdashAPI id if available
//   created_by     uuid   — admin user id
//   created_at     timestamptz
//   notes          text   — optional admin note
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'

import { NextResponse } from 'next/server'

const svc = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

// ── POST — save a question as hidden ─────────────────────────────────────────
export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const {
    question_text,
    options,
    correct_answer,
    explanation,
    subject_name,
    exam_type,
    year,
    topic_title    = '',
    subtopic_title = '',
    difficulty     = 'medium',
    hide_reason    = 'manual_review',
    sdash_id       = null,
    notes          = '',
  } = body

  if (!question_text?.trim()) return NextResponse.json({ error: 'question_text is required' }, { status: 400 })

  const db = svc()

  const { data, error } = await db
    .from('hidden_questions')
    .insert({
      question_text: question_text.trim(),
      options:       options ?? {},
      correct_answer: (correct_answer ?? '').toUpperCase().trim(),
      explanation:   explanation ?? null,
      subject_name:  subject_name ?? '',
      exam_type:     exam_type ?? '',
      year:          String(year ?? ''),
      topic_title,
      subtopic_title,
      difficulty,
      hide_reason,
      sdash_id,
      notes,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    // If the table doesn't exist yet, return a soft error so the UI doesn't crash
    if (error.code === '42P01') {
      return NextResponse.json({
        warning: 'hidden_questions table does not exist yet — question not persisted to DB. Run the migration to enable this feature.',
        id: null,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, saved: true })
}

// ── GET — list hidden questions ────────────────────────────────────────────────
export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const exam_type   = searchParams.get('exam_type')
  const subject     = searchParams.get('subject')
  const hide_reason = searchParams.get('hide_reason')
  const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

  const db = svc()
  let query = db
    .from('hidden_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (exam_type)   query = query.eq('exam_type', exam_type)
  if (subject)     query = query.ilike('subject_name', `%${subject}%`)
  if (hide_reason) query = query.eq('hide_reason', hide_reason)

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ questions: [], warning: 'hidden_questions table not created yet' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ questions: data ?? [], total: data?.length ?? 0 })
}

// ── PATCH — restore a hidden question (move to main questions table) ──────────
export async function PATCH(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { id, subject_id, updates } = body
  if (!id)         return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (!subject_id) return NextResponse.json({ error: 'subject_id is required to restore a question' }, { status: 400 })

  const db = svc()

  // Fetch the hidden question
  const { data: hq, error: fetchErr } = await db
    .from('hidden_questions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !hq) return NextResponse.json({ error: 'Hidden question not found' }, { status: 404 })

  // Merge any edits the admin made (updates overrides stored values)
  const merged = { ...hq, ...(updates ?? {}) }

  // Insert into main questions table
  const { data: saved, error: insertErr } = await db
    .from('questions')
    .insert({
      subject_id,
      exam_type:      merged.exam_type,
      source:         'past_paper',
      year:           merged.year,
      question_text:  merged.question_text,
      options:        merged.options,
      correct_answer: merged.correct_answer,
      explanation:    merged.explanation,
      difficulty:     merged.difficulty,
      topic_title:    merged.topic_title,
      subtopic_title: merged.subtopic_title,
      sdash_id:       merged.sdash_id,
      is_active:      true,
      is_flagged:     false,
    })
    .select('id')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Delete from hidden_questions
  await db.from('hidden_questions').delete().eq('id', id)

  return NextResponse.json({ restored: true, question_id: saved.id })
}

// ── DELETE — permanently remove a hidden question ─────────────────────────────
export async function DELETE(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('hidden_questions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}