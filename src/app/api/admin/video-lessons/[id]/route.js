// src/app/api/admin/video-lessons/[id]/route.js
// GET    /api/admin/video-lessons/[id]  — fetch full video lesson
// PATCH  /api/admin/video-lessons/[id]  — update (content or status)
// DELETE /api/admin/video-lessons/[id]  — delete

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
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
      *,
      subjects ( id, name, slug ),
      topics   ( id, name, slug )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(data)
}

export async function PATCH(request, { params }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Allow updating any subset of fields
  const allowed = [
    'title', 'lesson_type', 'exam_type',
    'subject_id', 'topic_id', 'tags',
    'video_url', 'video_script', 'visual_directions',
    'practice_questions', 'status',
  ]

  const updates = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const db = service()
  const { data, error } = await db
    .from('video_lessons')
    .update(updates)
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: data.id, status: data.status })
}

export async function DELETE(request, { params }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = service()
  const { error } = await db
    .from('video_lessons')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}