// src/app/api/student/flashcards/route.js
// GET /api/student/flashcards?topic_id=uuid   — cards for a topic
// GET /api/student/flashcards?subject_id=uuid — all cards for subject

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const topicId   = searchParams.get('topic_id')
  const subjectId = searchParams.get('subject_id')
  if (!topicId && !subjectId) return NextResponse.json({ error: 'topic_id or subject_id required' }, { status: 400 })

  const db = svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  let q = db.from('flashcards').select('id, front_text, back_text, hint, mnemonic, difficulty, topic_id').eq('is_active', true)
  if (topicId)   q = q.eq('topic_id',   topicId)
  if (subjectId) q = q.eq('subject_id', subjectId)
  const { data: cards, error } = await q.order('difficulty').limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get student progress for these cards
  const ids = (cards ?? []).map(c => c.id)
  let progressMap = {}
  if (ids.length) {
    const { data: prog } = await db.from('student_flashcard_progress')
      .select('flashcard_id, status, seen_count').eq('student_id', user.id).in('flashcard_id', ids)
    for (const p of prog ?? []) progressMap[p.flashcard_id] = p
  }

  const result = (cards ?? []).map(c => ({
    ...c,
    status:     progressMap[c.id]?.status    ?? 'new',
    seen_count: progressMap[c.id]?.seen_count ?? 0,
  }))
  // Sort: new first, then learning, then known
  const order = { new: 0, learning: 1, known: 2 }
  result.sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0))

  return NextResponse.json({ cards: result, total: result.length })
}

// PATCH — update student progress for a card
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { flashcard_id, status } = await request.json()
  if (!flashcard_id || !['new','learning','known'].includes(status)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const db = svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await db.from('student_flashcard_progress').upsert({
    student_id:  user.id,
    flashcard_id,
    status,
    seen_count:  1,
    last_seen:   new Date().toISOString(),
  }, { onConflict: 'student_id,flashcard_id', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}