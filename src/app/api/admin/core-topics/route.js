// src/app/api/admin/core-topics/route.js
// FIXED: removed dead .eq('question_type','objective') — column dropped
// FIXED: exam filter uses .in([examType,'BOTH']) so BOTH questions count too

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

export async function GET(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType') ?? 'WAEC'

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()

  const [{ data: allTopics }, { data: coreTopics }] = await Promise.all([
    db.from('topics')
      .select('id, name, slug, exam_type, order_index, subtopics ( id, lesson_status, lesson_generated )')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true }),
    db.from('core_topics')
      .select('id, topic_id, exam_type, priority, is_active')
      .eq('subject_id', subjectId)
      .in('exam_type', [examType, 'BOTH']),
  ])

  const topicIds = (allTopics ?? []).map(t => t.id)
  let qCounts = {}

  if (topicIds.length) {
    // FIXED: include 'BOTH' questions in counts + no question_type filter
    const { data: counts } = await db
      .from('questions')
      .select('topic_id')
      .in('topic_id', topicIds)
      .in('exam_type', [examType, 'BOTH'])
      .eq('is_active', true)

    ;(counts ?? []).forEach(r => {
      qCounts[r.topic_id] = (qCounts[r.topic_id] ?? 0) + 1
    })
  }

  const coreMap = {}
  ;(coreTopics ?? []).forEach(ct => {
    if (!coreMap[ct.topic_id] || ct.exam_type === examType) coreMap[ct.topic_id] = ct
  })

  function topicLessonStatus(subtopics = []) {
    if (subtopics.some(s => s.lesson_status === 'published'))  return 'published'
    if (subtopics.some(s => s.lesson_status === 'in_review'))  return 'in_review'
    if (subtopics.some(s => s.lesson_generated))               return 'draft'
    return null
  }

  const topics = (allTopics ?? []).map(t => {
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

  return NextResponse.json({ topics, examType })
}

export async function POST(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { subjectId, topicId, examType, priority } = await request.json()
  if (!subjectId || !topicId || !examType) {
    return NextResponse.json({ error: 'subjectId, topicId, examType required' }, { status: 400 })
  }

  const db = svc()
  let effectivePriority = priority
  if (!effectivePriority) {
    const { data: existing } = await db
      .from('core_topics').select('priority')
      .eq('subject_id', subjectId).eq('exam_type', examType)
      .order('priority', { ascending: false }).limit(1)
    effectivePriority = ((existing?.[0]?.priority ?? 0) + 1)
  }

  const { data, error } = await db
    .from('core_topics')
    .upsert(
      { subject_id: subjectId, topic_id: topicId, exam_type: examType, priority: effectivePriority, is_active: true },
      { onConflict: 'subject_id,topic_id,exam_type' }
    )
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { id, subjectId, topicId, examType, priority, is_active } = await request.json()
  const db = svc()
  const updates = {}
  if (priority  !== undefined) updates.priority  = priority
  if (is_active !== undefined) updates.is_active = is_active

  const { error } = await (id
    ? db.from('core_topics').update(updates).eq('id', id)
    : db.from('core_topics').update(updates).eq('subject_id', subjectId).eq('topic_id', topicId).eq('exam_type', examType)
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

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