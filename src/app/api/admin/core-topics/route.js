// src/app/api/admin/core-topics/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin API for managing core topics per subject + exam type.
//
// GET    /api/admin/core-topics?subjectId=&examType=   → list
// POST   /api/admin/core-topics                        → add
// PATCH  /api/admin/core-topics                        → update priority / active
// DELETE /api/admin/core-topics?id=                    → remove
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// ── GET — list core topics for a subject + exam type ─────────────────────────
export async function GET(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType') ?? 'WAEC'

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()

  // Fetch core topics for this subject (all exam types so UI can show all)
  const { data: coreTopics, error } = await db
    .from('core_topics')
    .select('id, topic_id, exam_type, priority, is_active')
    .eq('subject_id', subjectId)
    .order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch all topics for the subject so the UI can show the full list
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, slug, exam_type, order_index')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true })

  // Count available questions per topic for the selected exam type
  // (helps admin know which topics actually have questions to serve)
  const topicIds = (allTopics ?? []).map(t => t.id)
  let qCounts = {}
  if (topicIds.length) {
    const examFilter = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : [examType, 'BOTH']
    const { data: counts } = await db
      .from('questions')
      .select('topic_id')
      .in('topic_id', topicIds)
      .in('exam_type', examFilter)
      .eq('is_active', true)
      .eq('question_type', 'objective')

    ;(counts ?? []).forEach(r => {
      qCounts[r.topic_id] = (qCounts[r.topic_id] ?? 0) + 1
    })
  }

  // Build a lookup of existing core topic rows keyed by topicId+examType
  const coreMap = {}
  ;(coreTopics ?? []).forEach(ct => {
    const key = `${ct.topic_id}__${ct.exam_type}`
    coreMap[key] = ct
  })

  // Annotate each topic with its core status
  const topics = (allTopics ?? []).map(t => {
    // Check if marked core for the requested examType OR for BOTH
    const exactKey = `${t.id}__${examType}`
    const bothKey  = `${t.id}__BOTH`
    const coreEntry = coreMap[exactKey] ?? coreMap[bothKey] ?? null

    return {
      ...t,
      question_count: qCounts[t.id] ?? 0,
      core_entry: coreEntry,    // null if not core
      is_core:    !!coreEntry && coreEntry.is_active,
      priority:   coreEntry?.priority ?? null,
    }
  })

  return NextResponse.json({ topics, examType })
}

// ── POST — mark a topic as core ───────────────────────────────────────────────
export async function POST(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { subjectId, topicId, examType, priority } = await request.json()
  if (!subjectId || !topicId || !examType) {
    return NextResponse.json({ error: 'subjectId, topicId, examType required' }, { status: 400 })
  }

  const db = svc()

  // Get the next priority if not supplied
  let effectivePriority = priority
  if (!effectivePriority) {
    const { data: existing } = await db
      .from('core_topics')
      .select('priority')
      .eq('subject_id', subjectId)
      .eq('exam_type', examType)
      .order('priority', { ascending: false })
      .limit(1)
    effectivePriority = ((existing?.[0]?.priority ?? 0) + 1)
  }

  const { data, error } = await db
    .from('core_topics')
    .upsert({
      subject_id: subjectId,
      topic_id:   topicId,
      exam_type:  examType,
      priority:   effectivePriority,
      is_active:  true,
    }, { onConflict: 'subject_id,topic_id,exam_type' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ core_topic: data })
}

// ── PATCH — update priority or is_active ─────────────────────────────────────
export async function PATCH(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const body = await request.json()
  const { id, priority, is_active } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates = {}
  if (priority  !== undefined) updates.priority  = priority
  if (is_active !== undefined) updates.is_active = is_active

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const db = svc()
  const { data, error } = await db
    .from('core_topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ core_topic: data })
}

// ── DELETE — remove a core topic entry ───────────────────────────────────────
export async function DELETE(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('core_topics').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}