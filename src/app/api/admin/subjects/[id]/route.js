// src/app/api/admin/subjects/[id]/route.js
// exam_type is a single string: 'WAEC' | 'JAMB' | 'IGCSE'
// exam_types column does NOT exist — never write or select it.
// Called by: app/admin/subjects-manager/page.js
//
// PATCH  { name?, exam_type?, order_index?, is_active? } → the updated row
//        400 bad input · 404 no such subject · 409 name already used for that exam
// DELETE → { success: true }; 400 if the subject still has topics
//
// v2 (29 Sep 2026): admin auth is requireAdmin() only. Both handlers also required a
// Supabase login, which the admin password login never creates, so editing or deleting
// a subject returned 401 (see ADMIN_AUTH_FIX.md). A rename or exam change now rebuilds
// the slug with the exam suffix (lib/subjectSlug); it used to drop the suffix.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { ALL_EXAMS } from '@/lib/constants'
import { subjectSlug } from '@/lib/subjectSlug'

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NAME = 100

// Only columns that exist in the DB. slug is derived, never taken from the client.
function parseUpdates(body) {
  const updates = {}
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > MAX_NAME) return { error: `name is required (up to ${MAX_NAME} characters)` }
    updates.name = name
  }
  if ('exam_type' in body) {
    if (!ALL_EXAMS.includes(body.exam_type)) return { error: `exam_type must be one of: ${ALL_EXAMS.join(', ')}` }
    updates.exam_type = body.exam_type
  }
  if ('order_index' in body) {
    if (!Number.isInteger(body.order_index)) return { error: 'order_index must be a whole number' }
    updates.order_index = body.order_index
  }
  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') return { error: 'is_active must be true or false' }
    updates.is_active = body.is_active
  }
  if (!Object.keys(updates).length) return { error: 'Nothing to update' }
  return { updates }
}

export async function PATCH(request, { params }) {
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid subject id' }, { status: 400 })

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { updates, error: inputError } = parseUpdates(body ?? {})
  if (inputError) return NextResponse.json({ error: inputError }, { status: 400 })

  const adminError = await requireAdmin()
  if (adminError) return adminError

  const db = supabaseAdmin()

  // The slug depends on both name and exam, so a change to either needs the other.
  if (updates.name || updates.exam_type) {
    const { data: current, error: currentError } = await db
      .from('subjects').select('name, exam_type').eq('id', id).maybeSingle()
    if (currentError) {
      console.error('[admin/subjects PATCH lookup]', currentError.message)
      return NextResponse.json({ error: 'Could not update the subject' }, { status: 500 })
    }
    if (!current) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

    const name     = updates.name      ?? current.name
    const examType = updates.exam_type ?? current.exam_type
    updates.slug = subjectSlug(name, examType)
    if (updates.slug.startsWith('-')) {
      return NextResponse.json({ error: 'name must contain letters or numbers' }, { status: 400 })
    }

    const { data: clash, error: clashError } = await db
      .from('subjects').select('id').eq('slug', updates.slug).neq('id', id).limit(1)
    if (clashError) {
      console.error('[admin/subjects PATCH clash]', clashError.message)
      return NextResponse.json({ error: 'Could not update the subject' }, { status: 500 })
    }
    if (clash?.length) {
      return NextResponse.json({ error: `"${name}" already exists for ${examType}` }, { status: 409 })
    }
  }

  const { data, error } = await db
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select('id, name, slug, exam_type, order_index, is_active')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Another subject already uses that name for this exam' }, { status: 409 })
    }
    console.error('[admin/subjects PATCH]', error.message)
    return NextResponse.json({ error: 'Could not update the subject' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid subject id' }, { status: 400 })

  const adminError = await requireAdmin()
  if (adminError) return adminError

  const db = supabaseAdmin()

  const { data: topics, error: topicsError } = await db
    .from('topics').select('id').eq('subject_id', id).limit(1)
  if (topicsError) {
    console.error('[admin/subjects DELETE topics]', topicsError.message)
    return NextResponse.json({ error: 'Could not delete the subject' }, { status: 500 })
  }
  if (topics?.length) {
    return NextResponse.json({
      error: 'This subject has topics. Delete them first — or they will cascade-delete all linked questions.',
    }, { status: 400 })
  }

  const { error } = await db.from('subjects').delete().eq('id', id)
  if (error) {
    console.error('[admin/subjects DELETE]', error.message)
    return NextResponse.json({ error: 'Could not delete the subject' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}