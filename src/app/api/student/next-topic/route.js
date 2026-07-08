// src/app/api/student/next-topic/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Returns the single highest-priority topic to practice per subject (or for
// a specific subject_id), based on topic mastery + core topic weighting.
//
// PRIORITY ORDER:
//   1. Core topics with NO mastery yet (never attempted) — student hasn't
//      touched this core topic at all. Show it first.
//   2. Core topics with LOW mastery (< 60%) — being worked on, still weak.
//   3. Non-core topics with no mastery yet.
//   4. All remaining topics ordered by mastery ascending.
//
// The goal: core topics always come before non-core at the same mastery level.
// A student should complete all core topics first before the system surfaces
// non-core topics as the "next" recommendation.
//
// Returns: { topics: { [subjectId]: { topicId, topicName, subjectId, subjectName,
//            score, isCore, attempt_count } } }
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

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const filterSubjectId = searchParams.get('subject_id') ?? null

  const db = svc()

  // 1. Get enrolled subjects (optionally filtered)
  let pathQuery = db
    .from('student_learning_paths')
    .select('subject_id, subjects(id, name, slug)')
    .eq('student_id', user.id)
  if (filterSubjectId) pathQuery = pathQuery.eq('subject_id', filterSubjectId)

  const { data: paths } = await pathQuery
  if (!paths?.length) return NextResponse.json({ topics: {} })

  const subjectIds = paths.map(p => p.subject_id)
  const subjectMap = {}
  for (const p of paths) {
    if (p.subjects) subjectMap[p.subject_id] = p.subjects
  }

  // 2. Get all topics for enrolled subjects, with core flag
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, subject_id, is_core')
    .in('subject_id', subjectIds)
    .order('is_core', { ascending: false }) // core topics first in result set

  if (!allTopics?.length) return NextResponse.json({ topics: {} })

  // 3. Get existing mastery scores for this student
  const { data: masteryRows } = await db
    .from('student_topic_mastery')
    .select('topic_id, score, attempt_count')
    .eq('student_id', user.id)
    .in('topic_id', allTopics.map(t => t.id))

  const masteryMap = {}
  for (const row of masteryRows ?? []) {
    masteryMap[row.topic_id] = { score: row.score ?? 0, count: row.attempt_count ?? 0 }
  }

  // 4. Score each topic for priority (lower = show sooner)
  // Priority formula:
  //   base_priority = 100 - mastery_score  (lower mastery = higher priority)
  //   if is_core: bonus = 200 (core topics get surfaced first)
  //   if never attempted: bonus += 50 (unknown > known-weak for initial exposure)
  //   final_priority = base_priority + is_core_bonus + never_attempted_bonus
  //   Sort DESCENDING by final_priority (highest priority number = show first)

  function scoreTopic(t) {
    const m = masteryMap[t.id]
    const mastery = m?.score ?? 0
    const attempted = m?.count ?? 0
    const isCore = t.is_core ?? false

    let priority = 100 - mastery          // 0 mastery = 100 priority, 100% mastery = 0
    if (isCore) priority += 200           // core topics always before non-core
    if (attempted === 0) priority += 50   // never-tried topics slightly above tried-but-weak

    // If mastery is >= 85 and not core, deprioritise heavily
    if (mastery >= 85 && !isCore) priority -= 150

    return priority
  }

  // 5. Group by subject, pick top topic per subject
  const bySubject = {}
  for (const t of allTopics) {
    const sid = t.subject_id
    if (!bySubject[sid]) bySubject[sid] = []
    bySubject[sid].push({ ...t, _priority: scoreTopic(t) })
  }

  const result = {}
  for (const [sid, topics] of Object.entries(bySubject)) {
    // Sort by priority descending — highest priority first
    topics.sort((a, b) => b._priority - a._priority)
    const top = topics[0]
    const m = masteryMap[top.id]
    result[sid] = {
      topicId:      top.id,
      topicName:    top.name,
      subjectId:    sid,
      subjectName:  subjectMap[sid]?.name ?? '',
      score:        m?.score ?? 0,
      attempt_count: m?.count ?? 0,
      isCore:       top.is_core ?? false,
    }
  }

  return NextResponse.json({ topics: result })
}