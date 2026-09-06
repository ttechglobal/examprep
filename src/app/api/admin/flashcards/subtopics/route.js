// src/app/api/admin/flashcards/subtopics/route.js
//
// GET /api/admin/flashcards/subtopics?subjectName=Chemistry&topicName=Acids
//
// Returns subtopics (with objectives) for a topic, always fetching from
// the WAEC subject row — because objectives are stored under WAEC curriculum.
// Flashcards are exam-agnostic; WAEC is just the source of truth for objectives.
//
// Also supports ?topicIds=id1,id2 for the OBJ badge check (pickSubject).
//
// Uses service role key — anon key is blocked by RLS on subtopics.

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectName = searchParams.get('subjectName')
  const topicName   = searchParams.get('topicName')
  const topicIdsParam = searchParams.get('topicIds') ?? ''

  const db = svc()

  // ── Mode A: fetch by subject+topic name (used by pickTopicGroup) ──────────
  if (subjectName && topicName) {
    const baseName = subjectName.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim()

    // Find the WAEC subject row for this subject name
    const { data: subjects } = await db
      .from('subjects')
      .select('id, name, exam_type')
      .ilike('name', `%${baseName}%`)
      .eq('is_active', true)

    // Prefer the WAEC row; fall back to any row if no WAEC row exists
    const waecSub = (subjects ?? []).find(s =>
      s.exam_type === 'WAEC' ||
      s.name.toLowerCase().includes('waec')
    ) ?? subjects?.[0]

    if (!waecSub) {
      return NextResponse.json([], { status: 200 })
    }

    // Find the topic in the WAEC subject
    const { data: topics } = await db
      .from('topics')
      .select('id, name')
      .eq('subject_id', waecSub.id)
      .ilike('name', topicName)

    if (!topics?.length) {
      return NextResponse.json([], { status: 200 })
    }

    const topicIds = topics.map(t => t.id)

    const { data, error } = await db
      .from('subtopics')
      .select('id, name, objectives, order_index, topic_id')
      .in('topic_id', topicIds)
      .order('order_index', { ascending: true, nullsLast: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } })
  }

  // ── Mode B: fetch by explicit topicIds (used by pickSubject OBJ badge) ────
  const topicIds = topicIdsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (!topicIds.length) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await db
    .from('subtopics')
    .select('id, name, objectives, order_index, topic_id')
    .in('topic_id', topicIds)
    .order('order_index', { ascending: true, nullsLast: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } })
}