// src/app/api/admin/video-lessons/route.js
// GET  /api/admin/video-lessons         — list all video lessons (with filters)
// POST /api/admin/video-lessons         — create new video lesson

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const status     = searchParams.get('status')
  const subjectId  = searchParams.get('subjectId')
  const topicId    = searchParams.get('topicId')
  const examType   = searchParams.get('examType')
  const page       = parseInt(searchParams.get('page') ?? '1')
  const pageSize   = 20

  const db = service()

  let query = db
    .from('video_lessons')
    .select(`
      id, title, lesson_type, exam_type, status,
      video_url, tags, created_at, updated_at,
      subject_id, topic_id,
      subjects ( id, name, slug ),
      topics   ( id, name, slug )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status)    query = query.eq('status', status)
  if (subjectId) query = query.eq('subject_id', subjectId)
  if (topicId)   query = query.eq('topic_id', topicId)
  if (examType)  query = query.eq('exam_type', examType)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lessons: data ?? [], total: count ?? 0, page, pageSize })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    title, lesson_type, exam_type,
    subject_id, topic_id, tags,
    video_url, video_script, visual_directions,
    practice_questions, status,
  } = body

  if (!title || !lesson_type || !exam_type) {
    return NextResponse.json({ error: 'title, lesson_type, and exam_type are required' }, { status: 400 })
  }

  const db = service()
  const { data, error } = await db
    .from('video_lessons')
    .insert({
      title,
      lesson_type,
      exam_type,
      subject_id:         subject_id ?? null,
      topic_id:           topic_id ?? null,
      tags:               tags ?? [],
      video_url:          video_url ?? null,
      video_script:       video_script ?? null,
      visual_directions:  visual_directions ?? [],
      practice_questions: practice_questions ?? [],
      status:             status ?? 'draft',
      created_by:         user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data.id, success: true })
}