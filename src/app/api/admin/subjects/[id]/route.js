// src/app/api/admin/subjects/[id]/route.js
// exam_type is a single string: 'WAEC' | 'JAMB' | 'IGCSE'
// exam_types column does NOT exist — never write or select it.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const VALID_EXAMS = ['WAEC', 'JAMB', 'IGCSE']

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function slugify(str) {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body   = await request.json()
  const db     = service()

  // ONLY columns that exist in the DB — exam_types is NOT one of them
  const allowed = ['name', 'exam_type', 'order_index', 'is_active']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  if (updates.exam_type && !VALID_EXAMS.includes(updates.exam_type)) {
    return NextResponse.json(
      { error: `exam_type must be one of: ${VALID_EXAMS.join(', ')}` },
      { status: 400 }
    )
  }

  if (updates.name) {
    updates.slug = slugify(updates.name)
  }

  const { data, error } = await db
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select('id, name, slug, exam_type, order_index, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db     = service()

  const { data: topics } = await db
    .from('topics').select('id').eq('subject_id', id).limit(1)

  if (topics?.length) {
    return NextResponse.json({
      error: 'This subject has topics. Delete them first — or they will cascade-delete all linked questions.',
    }, { status: 400 })
  }

  const { error } = await db.from('subjects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}