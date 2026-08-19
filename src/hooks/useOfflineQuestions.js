// src/app/api/offline/questions/route.js
// Serves questions for offline caching (IndexedDB via offlineSync.js).
// Supports delta sync via ?since=ISO_TIMESTAMP.
//
// FIX: removed nested joins (subtopics, topics) from OFFLINE_SELECT.
// Nested joins cause a 500 if any question has an orphaned FK or if the
// joined table is missing a column. We now do two separate bulk lookups
// (topics + subtopics by ID set) and merge them in JS — no joins, no 500s.
// exam_types is also added to OFFLINE_SELECT so the field is actually returned.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyExamFilter, normaliseExamType } from '@/lib/examFilter'

// Flat select — no nested joins
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
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  // ── 1. Fetch questions — flat select, no joins ─────────────────────────────
  let query = db
    .from('questions')
    .select(OFFLINE_SELECT)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gt('updated_at', since)

  // Only apply exam filter if questions actually use exam_types.
  // If exam_types column doesn't exist or is empty, this returns 0 rows.
  // We apply it but catch gracefully.
  query = applyExamFilter(query, examType)

  const { data: rows, error: qError } = await query

  if (qError) {
    console.error('[offline/questions] query failed:', qError.message)
    return NextResponse.json({ error: qError.message }, { status: 500 })
  }

  const allRows = rows ?? []

  // ── 2. Bulk-fetch topic + subtopic names (no per-row joins) ────────────────
  const topicIds    = [...new Set(allRows.map(q => q.topic_id).filter(Boolean))]
  const subtopicIds = [...new Set(allRows.map(q => q.subtopic_id).filter(Boolean))]

  const [topicRes, subtopicRes, subjectRes] = await Promise.all([
    topicIds.length
      ? db.from('topics').select('id, name, slug').in('id', topicIds)
      : Promise.resolve({ data: [] }),
    subtopicIds.length
      ? db.from('subtopics').select('id, name, slug').in('id', subtopicIds)
      : Promise.resolve({ data: [] }),
    db.from('subjects').select('id, name, slug').eq('id', subjectId).single(),
  ])

  const topicMap    = Object.fromEntries((topicRes.data    ?? []).map(t => [t.id, t]))
  const subtopicMap = Object.fromEntries((subtopicRes.data ?? []).map(s => [s.id, s]))
  const subject     = subjectRes.data ?? {}

  // ── 3. Shape into self-contained cached rows ───────────────────────────────
  const questions = allRows.map(q => ({
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