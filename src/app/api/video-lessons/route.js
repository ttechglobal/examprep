// src/app/api/video-lessons/route.js
// GET /api/video-lessons  — fetch published video lessons for students
// Filters: subjectId, topicId, examType, search

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const topicId   = searchParams.get('topicId')
  const examType  = searchParams.get('examType')
  const search    = searchParams.get('search')
  const page      = parseInt(searchParams.get('page') ?? '1')
  const pageSize  = 12

  const db = service()

  let query = db
    .from('video_lessons')
    .select(`
      id, title, lesson_type, exam_type, tags,
      video_url, created_at,
      subject_id, topic_id,
      subjects ( id, name, slug ),
      topics   ( id, name, slug )
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (subjectId) query = query.eq('subject_id', subjectId)
  if (topicId)   query = query.eq('topic_id', topicId)

  // Exam filter: show BOTH videos to all exam types
  if (examType && examType !== 'BOTH') {
    query = query.in('exam_type', [examType, 'BOTH'])
  }

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lessons: data ?? [], total: count ?? 0, page, pageSize })
}