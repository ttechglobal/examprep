// src/app/api/admin/subjects/route.js
// exam_type: single string 'WAEC' | 'JAMB' | 'IGCSE' — one row per exam per subject.
// Multiple exams for same subject name = multiple rows (e.g. Maths WAEC + Maths JAMB).
// Called by: app/admin/subjects-manager/page.js and most admin pickers (GET).
//
// GET  → [{ id, name, slug, exam_type, order_index, is_active, topic_count, subtopic_count }]
// POST { name, exam_type, order_index? } → the new row (201)
//      400 bad input · 409 that subject already exists for that exam
//
// v2 (29 Sep 2026): admin auth is requireAdmin() only. POST also required a Supabase
// login, which the admin password login never creates, so adding a subject returned 401
// (see ADMIN_AUTH_FIX.md). Slug comes from lib/subjectSlug; duplicates get a clear 409;
// database errors are logged, not returned.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { ALL_EXAMS } from '@/lib/constants'
import { subjectSlug } from '@/lib/subjectSlug'

const MAX_NAME = 100

export async function GET() {
  const adminError = await requireAdmin()
  if (adminError) return adminError

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('subjects')
    .select(`
      id, name, slug, exam_type, order_index, is_active,
      topics (
        id,
        subtopics ( id )
      )
    `)
    .order('name')
    .order('exam_type')

  if (error) {
    console.error('[admin/subjects GET]', error.message)
    return NextResponse.json({ error: 'Could not load subjects' }, { status: 500 })
  }

  const enriched = (data ?? []).map(subject => ({
    id:             subject.id,
    name:           subject.name,
    slug:           subject.slug,
    exam_type:      subject.exam_type,
    order_index:    subject.order_index,
    is_active:      subject.is_active,
    topic_count:    subject.topics?.length ?? 0,
    subtopic_count: subject.topics?.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0) ?? 0,
  }))

  return NextResponse.json(enriched)
}

export async function POST(request) {
  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name       = typeof body?.name === 'string' ? body.name.trim() : ''
  const examType   = body?.exam_type
  const orderIndex = body?.order_index ?? 99

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: `name is required (up to ${MAX_NAME} characters)` }, { status: 400 })
  }
  if (!ALL_EXAMS.includes(examType)) {
    return NextResponse.json({ error: `exam_type must be one of: ${ALL_EXAMS.join(', ')}` }, { status: 400 })
  }
  if (!Number.isInteger(orderIndex)) {
    return NextResponse.json({ error: 'order_index must be a whole number' }, { status: 400 })
  }
  const slug = subjectSlug(name, examType)
  if (slug.startsWith('-')) {
    return NextResponse.json({ error: 'name must contain letters or numbers' }, { status: 400 })
  }

  const adminError = await requireAdmin()
  if (adminError) return adminError

  const db = supabaseAdmin()

  const { data: existing, error: lookupError } = await db
    .from('subjects').select('id').eq('slug', slug).limit(1)
  if (lookupError) {
    console.error('[admin/subjects POST lookup]', lookupError.message)
    return NextResponse.json({ error: 'Could not add the subject' }, { status: 500 })
  }
  if (existing?.length) {
    return NextResponse.json({ error: `"${name}" already exists for ${examType}` }, { status: 409 })
  }

  const { data, error } = await db
    .from('subjects')
    .insert({ name, slug, exam_type: examType, order_index: orderIndex, is_active: true })
    .select('id, name, slug, exam_type, order_index, is_active')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `"${name}" already exists for ${examType}` }, { status: 409 })
    }
    console.error('[admin/subjects POST]', error.message)
    return NextResponse.json({ error: 'Could not add the subject' }, { status: 500 })
  }
  return NextResponse.json({ ...data, topic_count: 0, subtopic_count: 0 }, { status: 201 })
}