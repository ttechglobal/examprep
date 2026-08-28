// src/app/api/student/topics/route.js
// GET /api/student/topics?subject_id=<uuid>&exam=WAEC
// Returns topics for a subject, with question counts, for topic practice mode.

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')
    const exam      = searchParams.get('exam') ?? 'WAEC'

    if (!subjectId) return NextResponse.json({ error: 'subject_id required' }, { status: 400 })

    const service = db()

    // Get topics for this subject
    const { data: topics, error } = await service
      .from('topics')
      .select('id, name, order_index, exam_type')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const topicList = topics ?? []
    if (!topicList.length) return NextResponse.json([])

    // Filter by exam type
    const filtered = topicList.filter(t =>
      !t.exam_type || t.exam_type === exam || t.exam_type === 'BOTH'
    )

    // Count questions per topic
    const topicIds = filtered.map(t => t.id)
    const { data: qCounts } = await service
      .from('questions')
      .select('topic_id')
      .in('topic_id', topicIds)
      .eq('is_active', true)

    const countMap = {}
    ;(qCounts ?? []).forEach(q => {
      countMap[q.topic_id] = (countMap[q.topic_id] ?? 0) + 1
    })

    return NextResponse.json(
      filtered
        .filter(t => (countMap[t.id] ?? 0) > 0)  // only topics that have questions
        .map(t => ({
          id:             t.id,
          name:           t.name,
          order_index:    t.order_index,
          exam_type:      t.exam_type,
          question_count: countMap[t.id] ?? 0,
        })),
      { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[student/topics]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}