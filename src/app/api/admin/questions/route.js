// src/app/api/admin/questions/coverage/route.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: this route powers CoverageChart on the admin Past Questions page —
// the bar chart admins use to decide which topics to mark as Core. It had
// NO source filter at all (neither on the primary query nor its fallback),
// so every AI-generated question was counting toward topic.count alongside
// real past papers — directly inflating the bars, the colour tiers, and the
// sort order admins rely on to choose core topics.
//
// THE FIX: hardcode .eq('source', 'past_paper') on both the primary query
// and the fallback query. This is NOT exposed as a toggle — core topics
// exist specifically to capture "how often does this appear in the real
// exam," and AI-generated questions have no bearing on that by definition.
// Unlike the practice/questions route (where 'source' is a legitimate query
// param because a student might want either mode), here past_paper is the
// only correct value, always.
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
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()

  const [{ data: topics }, { data: coreRows }] = await Promise.all([
    db.from('topics')
      .select('id, name, slug, order_index, subtopics ( id, name, slug, order_index )')
      .eq('subject_id', subjectId)
      .order('order_index'),
    db.from('core_topics')
      .select('topic_id, is_active')
      .eq('subject_id', subjectId)
      .eq('is_active', true),
  ])

  if (!topics?.length) return NextResponse.json([])

  const coreTopicIds = new Set((coreRows ?? []).map(r => r.topic_id))
  const topicIds = topics.map(t => t.id)

  // Base query — PAST PAPERS ONLY. Core topics must never be influenced by
  // AI-generated content, regardless of exam filter selection.
  let baseQuery = db
    .from('questions')
    .select('topic_id, subtopic_id, difficulty')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .eq('source', 'past_paper')
    .in('topic_id', topicIds)

  if (examType && examType !== 'ALL') {
    baseQuery = baseQuery.contains('exam_types', [examType])
  }

  let { data: rows, error } = await baseQuery

  // Fallback: exam_types column may not exist yet (pre-migration).
  // source filter is repeated here — this is exactly the line that was
  // missing before, which silently let AI-generated questions back in
  // whenever the primary query's exam_types filter errored.
  if (error) {
    let fallbackQuery = db
      .from('questions')
      .select('topic_id, subtopic_id, difficulty')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .eq('source', 'past_paper')
      .in('topic_id', topicIds)

    if (examType && examType !== 'ALL') {
      fallbackQuery = fallbackQuery.in('exam_type', [examType, 'BOTH'])
    }

    const fallback = await fallbackQuery
    rows = fallback.data ?? []
  }

  const topicCounts    = {}
  const subtopicCounts = {}

  for (const q of rows ?? []) {
    topicCounts[q.topic_id] = (topicCounts[q.topic_id] ?? 0) + 1
    if (q.subtopic_id) {
      subtopicCounts[q.subtopic_id] = (subtopicCounts[q.subtopic_id] ?? 0) + 1
    }
  }

  const enriched = topics.map(t => ({
    topic_id:    t.id,
    topic_name:  t.name,
    order_index: t.order_index,
    is_core:     coreTopicIds.has(t.id),
    count:       topicCounts[t.id] ?? 0,
    subtopics: (t.subtopics ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(s => ({
        subtopic_id:   s.id,
        subtopic_name: s.name,
        count:         subtopicCounts[s.id] ?? 0,
      })),
  }))

  return NextResponse.json(enriched)
}