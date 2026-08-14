// src/app/api/offline/questions/route.js
// Serves questions for offline caching.
// Supports delta sync: pass ?since=ISO_TIMESTAMP to only get new/updated rows.
// Returns a lean payload — only fields needed for practice/diagnostic.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

// Fields needed for offline practice — no joins, self-contained
// We fetch topic/subtopic names separately to avoid join failures
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
  exam_types,
  source,
  updated_at
`

export async function GET(request) {
  // Auth check — must be signed in
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subject_id')
  const examType  = normaliseExamType(searchParams.get('exam_type') ?? 'WAEC')
  const since     = searchParams.get('since')
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '300', 10) || 300, 500)

  if (!subjectId) {
    return NextResponse.json({ error: 'subject_id required' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── 1. Fetch questions (no joins — avoids FK / missing-column 500s) ────────
  let query = db
    .from('questions')
    .select(OFFLINE_SELECT)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gt('updated_at', since)
  query = applyExamFilter(query, examType)

  const { data: rows, error: qError } = await query

  if (qError) {
    console.error('[offline/questions] questions query failed:', qError.message)
    return NextResponse.json({ error: qError.message }, { status: 500 })
  }

  // ── 2. Bulk-fetch topic + subtopic names (single queries, not per-row joins) ─
  const topicIds    = [...new Set((rows ?? []).map(q => q.topic_id).filter(Boolean))]
  const subtopicIds = [...new Set((rows ?? []).map(q => q.subtopic_id).filter(Boolean))]

  const [topicRes, subtopicRes, subjectRes] = await Promise.all([
    topicIds.length
      ? db.from('topics').select('id, name, slug').in('id', topicIds)
      : Promise.resolve({ data: [] }),
    subtopicIds.length
      ? db.from('subtopics').select('id, name, slug').in('id', subtopicIds)
      : Promise.resolve({ data: [] }),
    db.from('subjects').select('id, name, slug').eq('id', subjectId).single(),
  ])

  // Build lookup maps — gracefully handle missing rows
  const topicMap    = Object.fromEntries((topicRes.data    ?? []).map(t => [t.id, t]))
  const subtopicMap = Object.fromEntries((subtopicRes.data ?? []).map(s => [s.id, s]))
  const subject     = subjectRes.data ?? {}

  // ── 3. Shape the payload ──────────────────────────────────────────────────
  const questions = (rows ?? []).map(q => ({
    ...q,
    subject_name:  subject.name ?? '',
    subject_slug:  subject.slug ?? '',
    topic_name:    topicMap[q.topic_id]?.name       ?? '',
    subtopic_name: subtopicMap[q.subtopic_id]?.name ?? '',
    exam_types:    q.exam_types ?? [examType],
  }))

  return NextResponse.json({
    questions,
    count:     questions.length,
    synced_at: new Date().toISOString(),
  })
}