// src/app/api/video-lessons/[id]/route.js
// GET /api/video-lessons/[id]  — fetch a single published video lesson (full content for player)

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  const { id } = await params
  const db = service()

  const { data, error } = await db
    .from('video_lessons')
    .select(`
      id, title, lesson_type, exam_type, tags,
      video_url, practice_questions,
      subject_id, topic_id,
      subjects ( id, name, slug ),
      topics   ( id, name, slug )
    `)
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}