// src/app/api/offline/questions/route.js
// Serves questions for offline caching.
// Supports delta sync: pass ?since=ISO_TIMESTAMP to only get new/updated rows.
// Returns a lean payload — only fields needed for practice/diagnostic.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

// Fields needed for offline practice — strip heavy/unused fields
const OFFLINE_SELECT = `
  id,
  question_text,
  options,
  correct_answer,
  explanation,
  difficulty,
  has_image,
  image_url,
  image_description,
  explanation_has_image,
  explanation_image_url,
  subtopic_id,
  topic_id,
  subject_id,
  source,
  updated_at,
  subtopics ( id, name, slug ),
  topics    ( id, name, slug )
`

export async function GET(request) {
  // Auth check — must be signed in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subject_id')
  const examType  = normaliseExamType(searchParams.get('exam_type') ?? 'WAEC')
  const since     = searchParams.get('since')          // ISO timestamp for delta
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '300'), 500)

  if (!subjectId) {
    return NextResponse.json({ error: 'subject_id required' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let query = db
    .from('questions')
    .select(OFFLINE_SELECT)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  // Delta sync — only new/updated since last sync
  if (since) {
    query = query.gt('updated_at', since)
  }

  query = applyExamFilter(query, examType)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with subject_name etc. so the cached row is self-contained
  const { data: subject } = await db
    .from('subjects')
    .select('id, name, slug')
    .eq('id', subjectId)
    .single()

  const questions = (data ?? []).map(q => ({
    ...q,
    subject_name:  subject?.name ?? '',
    subject_slug:  subject?.slug ?? '',
    topic_name:    q.topics?.name    ?? '',
    subtopic_name: q.subtopics?.name ?? '',
    // Add exam_types from the DB row — already present since migration
    exam_types:    q.exam_types ?? [examType],
    // Remove nested objects to keep IndexedDB rows lean
    topics:    undefined,
    subtopics: undefined,
  }))

  return NextResponse.json({
    questions,
    count: questions.length,
    synced_at: new Date().toISOString(),
  })
}