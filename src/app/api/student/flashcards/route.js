// src/app/api/student/flashcards/route.js
//
// GET /api/student/flashcards?subjectName=Physics
//   → returns topics that have flashcards for this subject, with card counts
//
// GET /api/student/flashcards?subjectId=uuid&topicId=uuid
//   → returns all flashcards for a specific topic. For a signed-in student,
//     opening the deck is recorded for Analytics (once per topic per day, after
//     the response is sent; flashcard progress itself stays on the phone).

import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordEvent } from '@/lib/server/studentEvents'
import { appDay } from '@/lib/dates'
import { UUID_RE } from '@/lib/uuid'
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
    const { data: subjects, error: subjectsError } = await db
      .from('subjects')
      .in('exam_type', ['WAEC', 'JAMB'])
      .select('id, name')
      .eq('is_active', true)
    if (subjectsError) return NextResponse.json({ error: 'Could not load subjects' }, { status: 500 })

    const subjectIds = (subjects ?? [])
      .filter(s => s.name.replace(/\s*(WAEC|JAMB|IGCSE|NECO)\s*$/i, '').trim() === base)
      .map(s => s.id)

    if (!subjectIds.length) {
      return NextResponse.json({ topics: [] })
    }

    // Get topics for this subject
    const { data: topics, error: topicsError } = await db
      .from('topics')
      .select('id, name, order_index, subject_id')
      .in('subject_id', subjectIds)
      .order('order_index', { nullsLast: true })
      .order('name')
    if (topicsError) return NextResponse.json({ error: 'Could not load topics' }, { status: 500 })

    if (!topics?.length) return NextResponse.json({ topics: [] })

    const topicIds = topics.map(t => t.id)

    // Get card counts per topic
    const { data: cards, error: countsError } = await db
      .from('flashcards')
      .select('topic_id')
      .in('topic_id', topicIds)
      .eq('is_active', true)
    if (countsError) return NextResponse.json({ error: 'Could not load card counts' }, { status: 500 })

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
        deduped.push({ id: t.id, name: t.name, card_count: count, topic_ids: topics.filter(x => x.name.trim().toLowerCase() === key && countByTopic[x.id] > 0).map(x => x.id) })
      }
    }

    return NextResponse.json({ topics: deduped })
  }

  // ── Mode 2: get flashcards for a specific topic ────────────────────────────
  if (topicId) {
    const requested = searchParams.get('topicIds')?.split(',') ?? [topicId]
    if (!UUID_RE.test(topicId) || requested.length > 100 || requested.some(id => !UUID_RE.test(id))) {
      return NextResponse.json({ error: 'Invalid topic' }, { status: 400 })
    }
    const { data: allowedTopics, error: topicError } = await db.from('topics')
      .select('id, subjects!inner(exam_type)').in('id', [...new Set(requested)])
      .in('subjects.exam_type', ['WAEC', 'JAMB'])
    if (topicError) return NextResponse.json({ error: 'Could not load topics' }, { status: 500 })
    if (allowedTopics?.length !== new Set(requested).size) return NextResponse.json({ error: 'Topic is not available' }, { status: 400 })
    const { data: cards, error } = await db
      .from('flashcards')
      .select('id, front_text, back_text, hint, mnemonic, difficulty, svg_code')
      .in('topic_id', [...new Set(requested)])
      .eq('is_active', true)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (UUID_RE.test(topicId) && cards?.length) {
      after(async () => {
        const supabase = await createClient()
        const user = (await supabase.auth.getUser()).data?.user
        if (user && !user.is_anonymous) {
          await recordEvent(db, { studentId: user.id, event: 'flashcards_open', feature: 'flashcards', ref: `fc-${topicId}-${appDay()}`, detail: { topic_id: topicId } })
        }
      })
    }
    return NextResponse.json({ cards: cards ?? [] })
  }

  // ── Mode 3: get all subjects that have flashcards ──────────────────────────
  const { data: allCards, error: allCardsError } = await db
    .from('flashcards')
    .select('subject_id')
    .eq('is_active', true)
  if (allCardsError) return NextResponse.json({ error: 'Could not load flashcards' }, { status: 500 })

  const subjectIdSet = new Set((allCards ?? []).map(c => c.subject_id).filter(Boolean))

  if (!subjectIdSet.size) return NextResponse.json({ subjects: [] })

  const { data: allSubjects, error: allSubjectsError } = await db
    .from('subjects')
      .in('exam_type', ['WAEC', 'JAMB'])
    .select('id, name')
    .in('id', [...subjectIdSet])
    .eq('is_active', true)
    .order('name')
  if (allSubjectsError) return NextResponse.json({ error: 'Could not load subjects' }, { status: 500 })

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
