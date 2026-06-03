// src/app/api/admin/questions/[id]/route.js
// PATCH — edit a question's fields
// DELETE — archive (soft) or hard-delete (?hard=true)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// ── PATCH — update question fields ───────────────────────────────────────────
export async function PATCH(request, { params }) {
  const supabase = await createClient()
  try { await requireAdmin(supabase) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body   = await request.json()

  const allowed = [
    'question_text', 'options', 'correct_answer',
    'difficulty', 'exam_type',
    'topic_id', 'subtopic_id',
    'has_image', 'image_url', 'image_description',
    'explanation', 'is_active', 'is_flagged',
  ]

  const update = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  update.updated_at = new Date().toISOString()

  const db = svc()
  const { data, error } = await db
    .from('questions')
    .update(update)
    .eq('id', id)
    .select(`
      id, question_text, options, correct_answer,
      difficulty, exam_type, has_image, image_url, image_description,
      explanation, is_active, is_flagged, year, source,
      topic_id, subtopic_id, subject_id,
      topics    ( id, name ),
      subtopics ( id, name ),
      subjects  ( id, name )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE — archive (soft) or hard delete ───────────────────────────────────
export async function DELETE(request, { params }) {
  const supabase = await createClient()
  try { await requireAdmin(supabase) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id }   = await params
  const hardDelete = new URL(request.url).searchParams.get('hard') === 'true'
  const db = svc()

  if (hardDelete) {
    const { error } = await db.from('questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  }

  // Soft delete — set is_active = false
  const { error } = await db
    .from('questions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ archived: true })
}