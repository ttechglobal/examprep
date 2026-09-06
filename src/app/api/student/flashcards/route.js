// src/app/api/student/flashcards/route.js
//
// GET /api/student/flashcards?subjectName=Physics
//   → returns topics that have flashcards for this subject, with card counts
//
// GET /api/student/flashcards?subjectId=uuid&topicId=uuid
//   → returns all flashcards for a specific topic

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subjectName = searchParams.get('subjectName')
  const subjectId   = searchParams.get('subjectId')
  const topicId     = searchParams.get('topicId')

  const db = svc()

  // ── Mode 1: get topics with card counts for a subject name ─────────────────
  if (subjectName && !topicId) {
    // Resolve subject ids (WAEC + JAMB variants)
    const base = subjectName.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim()
    const { data: subjects } = await db
      .from('subjects')
      .select('id, name')
      .eq('is_active', true)

    const subjectIds = (subjects ?? [])
      .filter(s => s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim() === base)
      .map(s => s.id)

    if (!subjectIds.length) {
      return NextResponse.json({ topics: [] })
    }

    // Get topics for this subject
    const { data: topics } = await db
      .from('topics')
      .select('id, name, order_index, subject_id')
      .in('subject_id', subjectIds)
      .order('order_index', { nullsLast: true })
      .order('name')

    if (!topics?.length) return NextResponse.json({ topics: [] })

    const topicIds = topics.map(t => t.id)

    // Get card counts per topic
    const { data: cards } = await db
      .from('flashcards')
      .select('topic_id')
      .in('topic_id', topicIds)
      .eq('is_active', true)

    const countByTopic = {}
    for (const c of (cards ?? [])) {
      countByTopic[c.topic_id] = (countByTopic[c.topic_id] ?? 0) + 1
    }

    // Deduplicate topics by name (WAEC/JAMB share the same topic names)
    const seen = new Set()
    const deduped = []
    for (const t of topics) {
      const key = t.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const count = topics
        .filter(x => x.name.trim().toLowerCase() === key)
        .reduce((sum, x) => sum + (countByTopic[x.id] ?? 0), 0)
      if (count > 0) {
        deduped.push({ id: t.id, name: t.name, card_count: count })
      }
    }

    return NextResponse.json({ topics: deduped })
  }

  // ── Mode 2: get flashcards for a specific topic ────────────────────────────
  if (topicId) {
    const { data: cards, error } = await db
      .from('flashcards')
      .select('id, front_text, back_text, hint, mnemonic, difficulty, svg_code')
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cards: cards ?? [] })
  }

  // ── Mode 3: get all subjects that have flashcards ──────────────────────────
  const { data: allCards } = await db
    .from('flashcards')
    .select('subject_id')
    .eq('is_active', true)

  const subjectIdSet = new Set((allCards ?? []).map(c => c.subject_id).filter(Boolean))

  if (!subjectIdSet.size) return NextResponse.json({ subjects: [] })

  const { data: allSubjects } = await db
    .from('subjects')
    .select('id, name')
    .in('id', [...subjectIdSet])
    .eq('is_active', true)
    .order('name')

  // Deduplicate by base name
  const seenNames = new Set()
  const uniqueSubjects = []
  for (const s of (allSubjects ?? [])) {
    const baseName = s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim()
    if (seenNames.has(baseName)) continue
    seenNames.add(baseName)

    // Count cards across all variants
    const variantIds = (allSubjects ?? [])
      .filter(x => x.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim() === baseName)
      .map(x => x.id)

    const cardCount = (allCards ?? []).filter(c => variantIds.includes(c.subject_id)).length

    uniqueSubjects.push({
      id: s.id,
      name: baseName,
      card_count: cardCount,
    })
  }

  return NextResponse.json({ subjects: uniqueSubjects })
}