// src/app/api/admin/core-topics/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET returns every topic for a subject with past paper frequency data.
// All question count queries use BOTH the new exam_types[] column AND
// the legacy exam_type string column as fallback, so the page works
// regardless of whether the DB migration has run.
//
// FIX: the "all question count" block (past + AI, used only for the
// informational "+N AI" label in the admin UI, never for the chart/sort/
// core-toggle logic) had no source filter on EITHER its primary query or
// its fallback — meaning a failed exam_types[] lookup would silently count
// every active question with no source restriction at all on the fallback
// path. That's now made explicit: the primary query intentionally omits a
// source filter (it's SUPPOSED to count both past_paper and ai_generated,
// that's the whole point of "all"), but the fallback now mirrors that
// intent explicitly rather than by accident — see comment inline.
//
// pastCounts (the block that actually drives the frequency bar, pct_of_max,
// sorting, and the core-topic toggle decision) was ALREADY correctly
// filtered to source='past_paper' on both its primary query and fallback —
// no change needed there. This file's fix is scoped to the allCounts block
// only, for clarity and future-proofing.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user
}

function topicLessonStatus(subtopics) {
  if (!subtopics?.length) return null
  if (subtopics.some(s => s.lesson_status === 'published')) return 'published'
  if (subtopics.some(s => s.lesson_status === 'in_review')) return 'in_review'
  if (subtopics.some(s => s.lesson_generated))              return 'draft'
  return null
}

export async function GET(request) {
  try { await getUser() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType') ?? 'WAEC'

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()
  const legacyValues = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : [examType, 'BOTH']

  const [
    { data: allTopics, error: topicsErr },
    { data: coreRows },
  ] = await Promise.all([
    db.from('topics')
      .select('id, name, slug, exam_type, order_index, subtopics(id, lesson_status, lesson_generated)')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true }),
    db.from('core_topics')
      .select('id, topic_id, exam_type, priority, is_active')
      .eq('subject_id', subjectId)
      .in('exam_type', legacyValues)
      .eq('is_active', true),
  ])

  if (topicsErr) return NextResponse.json({ error: topicsErr.message }, { status: 500 })

  const topicIds = (allTopics ?? []).map(t => t.id)
  if (!topicIds.length) return NextResponse.json({ topics: [], examType })

  // ── Past paper counts — drives the frequency bar, pct_of_max, sorting, and
  //    core-topic decisions. ALREADY correctly source-filtered (unchanged). ──
  let pastCounts = {}
  {
    let { data: rows, error } = await db
      .from('questions')
      .select('topic_id')
      .in('topic_id', topicIds)
      .eq('source', 'past_paper')
      .eq('is_active', true)
      .contains('exam_types', [examType === 'BOTH' ? 'WAEC' : examType])

    if (error || !rows?.length) {
      const fb = await db
        .from('questions')
        .select('topic_id')
        .in('topic_id', topicIds)
        .eq('source', 'past_paper')
        .eq('is_active', true)
        .in('exam_type', legacyValues)
      rows = fb.data ?? []
    }
    ;(rows ?? []).forEach(r => { pastCounts[r.topic_id] = (pastCounts[r.topic_id] ?? 0) + 1 })
  }

  // ── All question counts (past + AI combined, intentionally) — used ONLY
  //    for the informational "+N AI" label in the UI, never for chart/sort/
  //    core-toggle logic. No source filter by design (it's "all"), but the
  //    fallback now explicitly matches that intent instead of accidentally
  //    inheriting it. ──────────────────────────────────────────────────────
  let allCounts = {}
  {
    let { data: rows, error } = await db
      .from('questions')
      .select('topic_id')
      .in('topic_id', topicIds)
      .eq('is_active', true)
      .contains('exam_types', [examType === 'BOTH' ? 'WAEC' : examType])

    if (error || !rows?.length) {
      const fb = await db
        .from('questions')
        .select('topic_id')
        .in('topic_id', topicIds)
        .eq('is_active', true)
        .in('exam_type', legacyValues)
        // No .eq('source', ...) here — intentional, this block counts BOTH
        // past_paper and ai_generated by design. Left explicit (rather than
        // omitted) so a future reader doesn't mistake this for the same
        // bug that was just fixed in pastCounts/coverage route.
      rows = fb.data ?? []
    }
    ;(rows ?? []).forEach(r => { allCounts[r.topic_id] = (allCounts[r.topic_id] ?? 0) + 1 })
  }

  // Core map — prefer exact exam_type match over BOTH
  const coreMap = {}
  ;(coreRows ?? []).forEach(ct => {
    const ex = coreMap[ct.topic_id]
    if (!ex || ct.exam_type === examType) coreMap[ct.topic_id] = ct
  })

  const maxPast = Math.max(1, ...Object.values(pastCounts))

  const topics = (allTopics ?? []).map(t => ({
    id:                 t.id,
    name:               t.name,
    slug:               t.slug,
    order_index:        t.order_index,
    past_paper_count:   pastCounts[t.id] ?? 0,
    all_question_count: allCounts[t.id]  ?? 0,
    pct_of_max:         Math.round(((pastCounts[t.id] ?? 0) / maxPast) * 100),
    lesson_status:      topicLessonStatus(t.subtopics),
    core_entry:         coreMap[t.id] ?? null,
    is_core:            Boolean(coreMap[t.id]),
    priority:           coreMap[t.id]?.priority ?? null,
  }))

  return NextResponse.json({ topics, examType })
}

export async function POST(request) {
  try { await getUser() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subjectId, topicId, examType, priority } = body
  if (!subjectId || !topicId || !examType) {
    return NextResponse.json({ error: 'subjectId, topicId, examType required' }, { status: 400 })
  }

  const db = svc()
  const { data: existing } = await db
    .from('core_topics')
    .select('id, priority')
    .eq('subject_id', subjectId)
    .eq('topic_id',   topicId)
    .eq('exam_type',  examType)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('core_topics')
      .update({ is_active: true, priority: priority ?? existing.priority })
      .eq('id', existing.id)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  let effectivePriority = priority
  if (!effectivePriority) {
    const { data: top } = await db
      .from('core_topics').select('priority')
      .eq('subject_id', subjectId).eq('exam_type', examType)
      .order('priority', { ascending: false }).limit(1)
    effectivePriority = (top?.[0]?.priority ?? 0) + 1
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
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  try { await getUser() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, priority, is_active } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates = {}
  if (priority !== undefined)  updates.priority  = priority
  if (is_active !== undefined) updates.is_active = is_active

  const db = svc()
  const { data, error } = await db
    .from('core_topics')
    .update(updates)
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request) {
  try { await getUser() } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db
    .from('core_topics')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}