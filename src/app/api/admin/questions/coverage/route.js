// src/app/api/admin/questions/coverage/route.js
// Fixed: removed dead question_type filter, added exam_types array support with fallback

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

  // Base query — no exam filter by default
  let baseQuery = db
    .from('questions')
    .select('topic_id, subtopic_id, difficulty')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .in('topic_id', topicIds)

  // If exam filter requested, try array contains first
  if (examType && examType !== 'ALL') {
    baseQuery = baseQuery.contains('exam_types', [examType])
  }

  let { data: rows, error } = await baseQuery

  // Fallback: exam_types column may not exist yet (pre-migration)
  if (error) {
    let fallbackQuery = db
      .from('questions')
      .select('topic_id, subtopic_id, difficulty')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
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