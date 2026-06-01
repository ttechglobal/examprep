// src/app/api/student/study-plan/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET  — return the student's current study plan (weak topics per subject)
// POST — trigger a recalculation (called after practice sessions / diagnostic)
//
// "Weak" = topic where accuracy < 70% OR no attempts yet AND the topic belongs
// to a subject in the student's learning path.
// "Mastered" = accuracy >= 70% AND >= 5 attempts → excluded from plan.
//
// The GET endpoint is used by the study plan page directly (it does its own
// client-side Supabase queries), but this route provides a server-side
// cache/recalculation endpoint useful for post-session webhooks or future
// background jobs.
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

// ── GET — return current study plan for authenticated student ─────────────────
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()

  // Load subjects from learning paths
  const { data: paths } = await db
    .from('student_learning_paths')
    .select('subject_id, subjects(id, name, slug)')
    .eq('student_id', user.id)

  const subjectList = (paths ?? []).map(p => p.subjects).filter(Boolean)
  if (!subjectList.length) {
    return NextResponse.json({ plan: [], masteredCount: 0 })
  }

  // Load all topic-level attempts for this student
  const { data: rawAttempts } = await db
    .from('question_attempts')
    .select('topic_id, is_correct')
    .eq('student_id', user.id)
    .not('topic_id', 'is', null)

  // Build accuracy map per topic
  const accMap = {}
  ;(rawAttempts ?? []).forEach(a => {
    if (!accMap[a.topic_id]) accMap[a.topic_id] = { total: 0, correct: 0 }
    accMap[a.topic_id].total++
    if (a.is_correct) accMap[a.topic_id].correct++
  })

  // Load all topics for these subjects
  const subjectIds = subjectList.map(s => s.id)
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, slug, subject_id')
    .in('subject_id', subjectIds)
    .order('order_index', { ascending: true })

  // Build plan
  const subjectMap = {}
  subjectList.forEach(s => { subjectMap[s.id] = { subject: s, topics: [] } })

  let masteredCount = 0

  ;(allTopics ?? []).forEach(t => {
    const acc = accMap[t.id]
    const pct = acc ? Math.round((acc.correct / acc.total) * 100) : 0
    const isMastered = acc && acc.total >= 5 && pct >= 70

    if (isMastered) { masteredCount++; return }

    if (subjectMap[t.subject_id]) {
      subjectMap[t.subject_id].topics.push({
        id:       t.id,
        name:     t.name,
        slug:     t.slug,
        attempts: acc?.total   ?? 0,
        correct:  acc?.correct ?? 0,
        pct:      acc ? pct : null,
      })
    }
  })

  // Sort: weakest attempted first, then unattempted
  Object.values(subjectMap).forEach(({ topics }) => {
    topics.sort((a, b) => {
      if (a.attempts === 0 && b.attempts === 0) return 0
      if (a.attempts === 0) return 1
      if (b.attempts === 0) return -1
      return (a.correct / a.attempts) - (b.correct / b.attempts)
    })
  })

  const plan = Object.values(subjectMap).filter(s => s.topics.length > 0)

  return NextResponse.json({ plan, masteredCount, hasAttempts: (rawAttempts ?? []).length > 0 })
}

// ── POST — recalculate and update study plan after a session ──────────────────
// Called by: /api/student/practice/save and /api/diagnostic/save
// Body: { subjectIds?: string[] } — optional, if provided only recalculates for those subjects
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const db = svc()

  // Load subjects to recalculate
  let subjectIds = body.subjectIds ?? []

  if (!subjectIds.length) {
    // Recalculate all
    const { data: paths } = await db
      .from('student_learning_paths')
      .select('subject_id')
      .eq('student_id', user.id)
    subjectIds = (paths ?? []).map(p => p.subject_id)
  }

  if (!subjectIds.length) return NextResponse.json({ updated: 0 })

  let updated = 0

  for (const subjectId of subjectIds) {
    // Get the current learning path ordered_subtopic_ids
    const { data: path } = await db
      .from('student_learning_paths')
      .select('ordered_subtopic_ids')
      .eq('student_id', user.id)
      .eq('subject_id', subjectId)
      .maybeSingle()

    if (!path?.ordered_subtopic_ids?.length) continue

    // Get all attempts for this student × subject
    const { data: attempts } = await db
      .from('question_attempts')
      .select('subtopic_id, is_correct')
      .eq('student_id', user.id)
      .eq('subject_id', subjectId)
      .not('subtopic_id', 'is', null)

    const accMap = {}
    ;(attempts ?? []).forEach(a => {
      if (!accMap[a.subtopic_id]) accMap[a.subtopic_id] = { total: 0, correct: 0 }
      accMap[a.subtopic_id].total++
      if (a.is_correct) accMap[a.subtopic_id].correct++
    })

    const getAcc = (id) => {
      const d = accMap[id]
      if (!d || d.total === 0) return null  // unknown
      return Math.round((d.correct / d.total) * 100)
    }

    // Get completed subtopic IDs
    const { data: progress } = await db
      .from('lesson_progress')
      .select('subtopic_id')
      .eq('student_id', user.id)
      .eq('completed', true)
      .in('subtopic_id', path.ordered_subtopic_ids)

    const completedIds = new Set((progress ?? []).map(p => p.subtopic_id))

    // Reorder: weak incomplete first (ascending accuracy), then not-attempted,
    // then completed. This is the ordering shown in the learning path widget.
    const withAcc  = path.ordered_subtopic_ids.filter(id => !completedIds.has(id) && getAcc(id) !== null)
    const noAcc    = path.ordered_subtopic_ids.filter(id => !completedIds.has(id) && getAcc(id) === null)
    const completed = path.ordered_subtopic_ids.filter(id => completedIds.has(id))

    withAcc.sort((a, b) => getAcc(a) - getAcc(b))

    const reordered = [...withAcc, ...noAcc, ...completed]

    await db
      .from('student_learning_paths')
      .update({ ordered_subtopic_ids: reordered, last_calculated_at: new Date().toISOString() })
      .eq('student_id', user.id)
      .eq('subject_id', subjectId)

    updated++
  }

  return NextResponse.json({ updated })
}