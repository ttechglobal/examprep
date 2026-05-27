import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')

  const db = service()

  // Get all topics + subtopics for this subject
  const { data: topics } = await db
    .from('topics')
    .select(`
      id, name, exam_type, order_index,
      subtopics ( id, name, exam_type, order_index )
    `)
    .eq('subject_id', subjectId)
    .order('order_index')

  if (!topics?.length) {
    return NextResponse.json([])
  }

  // Get question counts per subtopic
  const allSubtopicIds = topics.flatMap(t => t.subtopics?.map(s => s.id) ?? [])

  const { data: questionCounts } = await db
    .from('questions')
    .select('subtopic_id, difficulty')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .in('subtopic_id', allSubtopicIds)

  // Build coverage map
  const countMap = {}
  for (const q of questionCounts ?? []) {
    if (!countMap[q.subtopic_id]) {
      countMap[q.subtopic_id] = { total: 0, easy: 0, medium: 0, hard: 0 }
    }
    countMap[q.subtopic_id].total++
    countMap[q.subtopic_id][q.difficulty ?? 'medium']++
  }

  const enriched = topics.map(topic => ({
    ...topic,
    subtopics: (topic.subtopics ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(sub => ({
        ...sub,
        question_count: countMap[sub.id]?.total ?? 0,
        easy_count:     countMap[sub.id]?.easy ?? 0,
        medium_count:   countMap[sub.id]?.medium ?? 0,
        hard_count:     countMap[sub.id]?.hard ?? 0,
        has_gap:        (countMap[sub.id]?.total ?? 0) < 5,
      })),
  }))

  return NextResponse.json(enriched)
}