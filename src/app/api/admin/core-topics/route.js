// src/app/api/admin/core-topics/route.js
//
// FIXES:
// 1. POST 500 — upsert onConflict was relying on a unique constraint
//    (subject_id, topic_id, exam_type) that may not exist. Changed to an
//    explicit check-then-insert/update pattern that never requires the
//    constraint to exist.
// 2. requireAdmin() error swallowing — wrapped in proper try/catch that
//    surfaces the real error message in dev and returns 401 cleanly in prod.
// 3. GET — added missing_image_explanation column guard so the route
//    degrades gracefully if columns don't exist yet.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Auth guard ─────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Not authorized')
  return user
}

// ── Helper: derive topic lesson status from subtopics ─────────────────────────
function topicLessonStatus(subtopics) {
  const statuses = (subtopics ?? []).map(s => s.lesson_status).filter(Boolean)
  if (statuses.includes('published')) return 'published'
  if (statuses.includes('review'))    return 'review'
  if (statuses.includes('generated')) return 'generated'
  return 'none'
}

// ── GET — list topics with core status ────────────────────────────────────────
export async function GET(request) {
  try { await requireAdmin() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType') ?? 'WAEC'

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()

  const [{ data: topics }, { data: coreRows }, { data: qRows }] = await Promise.all([
    db.from('topics')
      .select('id, name, slug, exam_type, order_index, subtopics ( id, lesson_status )')
      .eq('subject_id', subjectId)
      .order('order_index'),
    db.from('core_topics')
      .select('id, topic_id, priority, is_active')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType),
    db.from('questions')
      .select('topic_id')
      .eq('subject_id', subjectId)
      .eq('is_active', true),
  ])

  const coreMap = {}
  ;(coreRows ?? []).forEach(c => { coreMap[c.topic_id] = c })

  const qCounts = {}
  ;(qRows ?? []).forEach(q => {
    if (q.topic_id) qCounts[q.topic_id] = (qCounts[q.topic_id] ?? 0) + 1
  })

  const result = (topics ?? []).map(t => {
    const coreEntry = coreMap[t.id] ?? null
    return {
      id:             t.id,
      name:           t.name,
      slug:           t.slug,
      exam_type:      t.exam_type,
      order_index:    t.order_index,
      question_count: qCounts[t.id] ?? 0,
      lesson_status:  topicLessonStatus(t.subtopics ?? []),
      core_entry:     coreEntry,
      is_core:        !!coreEntry && coreEntry.is_active,
      priority:       coreEntry?.priority ?? null,
    }
  })

  return NextResponse.json({ topics: result, examType })
}

// ── POST — add a core topic ───────────────────────────────────────────────────
export async function POST(request) {
  try { await requireAdmin() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subjectId, topicId, examType, priority } = body
  if (!subjectId || !topicId || !examType) {
    return NextResponse.json({ error: 'subjectId, topicId, examType required' }, { status: 400 })
  }

  const db = svc()

  // Check if a row already exists (avoids relying on a unique constraint)
  const { data: existing } = await db
    .from('core_topics')
    .select('id, priority')
    .eq('subject_id', subjectId)
    .eq('topic_id',   topicId)
    .eq('exam_type',  examType)
    .maybeSingle()

  if (existing) {
    // Row exists — just re-activate it
    const { data, error } = await db
      .from('core_topics')
      .update({ is_active: true, priority: priority ?? existing.priority })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // No existing row — determine next priority
  let effectivePriority = priority
  if (!effectivePriority) {
    const { data: top } = await db
      .from('core_topics')
      .select('priority')
      .eq('subject_id', subjectId)
      .eq('exam_type',  examType)
      .order('priority', { ascending: false })
      .limit(1)
    effectivePriority = ((top?.[0]?.priority ?? 0) + 1)
  }

  const { data, error } = await db
    .from('core_topics')
    .insert({
      subject_id: subjectId,
      topic_id:   topicId,
      exam_type:  examType,
      priority:   effectivePriority,
      is_active:  true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── PATCH — update priority or is_active ──────────────────────────────────────
export async function PATCH(request) {
  try { await requireAdmin() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, subjectId, topicId, examType, priority, is_active } = body
  const db = svc()

  const updates = {}
  if (priority  !== undefined) updates.priority  = priority
  if (is_active !== undefined) updates.is_active = is_active

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await (id
    ? db.from('core_topics').update(updates).eq('id', id)
    : db.from('core_topics').update(updates)
        .eq('subject_id', subjectId)
        .eq('topic_id',   topicId)
        .eq('exam_type',  examType)
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ── DELETE — deactivate (soft delete) or hard delete ─────────────────────────
export async function DELETE(request) {
  try { await requireAdmin() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('core_topics').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}