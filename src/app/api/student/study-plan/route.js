// src/app/api/student/study-plan/route.js
// FIX: items now include subjectName field.
// Previously items only had subjectId — subjectName was never set,
// so subject badges rendered nothing on every topic card.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()

  // Get enrolled subjects
  const { data: paths } = await db
    .from('student_learning_paths')
    .select('subject_id, subjects(id, name, slug)')
    .eq('student_id', user.id)

  const enrolledSubjects = (paths ?? []).map(p => p.subjects).filter(Boolean)

  if (!enrolledSubjects.length) {
    return NextResponse.json({ subjects: [], items: [], hasAnyAttempts: false })
  }

  const subjectIds = enrolledSubjects.map(s => s.id)

  // Build a lookup: subjectId → subjectName (the fix)
  const subjectNameMap = {}
  enrolledSubjects.forEach(s => { subjectNameMap[s.id] = s.name })

  // Get all attempts with topic_id
  const { data: rawAttempts, error: attErr } = await db
    .from('question_attempts')
    .select('topic_id, subject_id, is_correct')
    .eq('student_id', user.id)
    .in('subject_id', subjectIds)
    .not('topic_id', 'is', null)

  // Total attempts for hasAnyAttempts flag
  const { data: allAttempts } = await db
    .from('question_attempts')
    .select('topic_id, subject_id')
    .eq('student_id', user.id)
    .in('subject_id', subjectIds)

  const hasAnyAttempts = (allAttempts?.length ?? 0) > 0

  // Build accuracy map per topic
  const accMap = {}
  ;(rawAttempts ?? []).forEach(a => {
    if (!accMap[a.topic_id]) accMap[a.topic_id] = { total: 0, correct: 0, subjectId: a.subject_id }
    accMap[a.topic_id].total++
    if (a.is_correct) accMap[a.topic_id].correct++
  })

  // Get all topics for enrolled subjects
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, slug, subject_id')
    .in('subject_id', subjectIds)
    .order('order_index', { ascending: true })

  // Build plan items — only attempted topics, not yet mastered
  const items = []
  for (const topic of (allTopics ?? [])) {
    const acc = accMap[topic.id]
    if (!acc) continue

    const pct = Math.round((acc.correct / acc.total) * 100)
    if (acc.total >= 3 && pct >= 70) continue // mastered

    const status = pct < 50 ? 'weak' : 'improving'
    const insightMessage = status === 'weak'
      ? "You struggled here — let's fix that"
      : "You're close — a bit more practice and you'll have this"

    items.push({
      id:             topic.id,
      subjectId:      topic.subject_id,
      subjectName:    subjectNameMap[topic.subject_id] ?? '', // ← THE FIX
      topicId:        topic.id,
      topicName:      topic.name,
      topicSlug:      topic.slug,
      status,
      insightMessage,
      accuracyPct:    pct,
      attemptCount:   acc.total,
      source:         'weak',
    })
  }

  items.sort((a, b) => a.accuracyPct - b.accuracyPct)

  const itemCountBySubject = {}
  items.forEach(i => { itemCountBySubject[i.subjectId] = (itemCountBySubject[i.subjectId] ?? 0) + 1 })

  const subjects = enrolledSubjects.map(s => ({
    id:              s.id,
    name:            s.name,
    slug:            s.slug,
    itemCount:       itemCountBySubject[s.id] ?? 0,
    needsDiagnostic: !hasAnyAttempts,
  }))

  return NextResponse.json({ subjects, items, hasAnyAttempts })
}