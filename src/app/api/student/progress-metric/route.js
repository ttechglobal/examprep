// src/app/api/student/progress-metric/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch this student's progress headline + topic-level deltas.
//
// Compares "before window" (8-15 days ago) vs "after window" (last 7 days).
//
// CORRECTED: the video signal uses the REAL, already-existing
// `lesson_progress` table — NOT a new `lesson_views` table. lesson_progress
// already exists and is fully wired (student_id, subtopic_id, completed,
// completed_at, slides_completed, total_slides) — used by
// /api/lessons/[id]/complete, /api/lessons/[id]/progress, LessonPage,
// LearnPage, DashboardPage, SubjectPageClient. Creating a parallel
// lesson_views table would have been a duplicate tracking mechanism.
// No migration needed for this signal — the table and its completed_at
// timestamp already exist.
//
// Resolution: lesson_progress is keyed by subtopic_id (a lesson belongs to
// a subtopic). The knowledge-score computation works at the topic level,
// so subtopic_id -> topic_id is resolved via the subtopics table before
// scoring — same join pattern already used elsewhere in this codebase.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  computeTopicKnowledgeScores,
  computeProgressDeltas,
  buildProgressHeadline,
} from '@/lib/progressMetric'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fetchActivityWindow(db, studentId, startDate, endDate) {
  const range = (q, col = 'created_at') => q.gte(col, startDate.toISOString()).lt(col, endDate.toISOString())

  const [practiceRes, theoryRes, gamesRes, lessonRes] = await Promise.all([
    range(db.from('question_attempts')
      .select('topic_id, is_correct, created_at')
      .eq('student_id', studentId)),

    range(db.from('theory_attempts')
      .select('topic_id, self_rating, created_at')
      .eq('student_id', studentId)),

    db.from('game_plays')
      .select('game_id, score, completed_at')
      .eq('student_id', studentId)
      .gte('completed_at', startDate.toISOString())
      .lt('completed_at', endDate.toISOString()),

    // lesson_progress windowed by completed_at (only rows actually completed
    // in this window count as a signal — in-progress/abandoned views don't)
    db.from('lesson_progress')
      .select('subtopic_id, completed, completed_at')
      .eq('student_id', studentId)
      .eq('completed', true)
      .gte('completed_at', startDate.toISOString())
      .lt('completed_at', endDate.toISOString()),
  ])

  // ── Games: resolve game_id -> topic via gameRegistry's concept field ──────
  let gamesWithTopicId = []
  const gameRows = gamesRes.data ?? []
  if (gameRows.length) {
    try {
      const { GAMES } = await import('@/lib/gameRegistry')
      const gameTopicMap = {}
      Object.values(GAMES).forEach(g => {
        if (g.concept) gameTopicMap[g.id] = g.concept
      })
      const conceptNames = [...new Set(gameRows.map(g => gameTopicMap[g.game_id]).filter(Boolean))]
      if (conceptNames.length) {
        const { data: topicRows } = await db.from('topics').select('id, name').in('name', conceptNames)
        const nameToId = {}
        ;(topicRows ?? []).forEach(t => { nameToId[t.name] = t.id })
        gamesWithTopicId = gameRows.map(g => ({
          ...g,
          topic_id: nameToId[gameTopicMap[g.game_id]] ?? null,
        })).filter(g => g.topic_id)
      }
    } catch {
      gamesWithTopicId = [] // gameRegistry not available — degrade gracefully
    }
  }

  // ── Lessons: resolve subtopic_id -> topic_id via the subtopics table ─────
  let videoRows = []
  const rawLessonRows = lessonRes.data ?? []
  if (rawLessonRows.length) {
    const subtopicIds = [...new Set(rawLessonRows.map(v => v.subtopic_id).filter(Boolean))]
    const { data: subtopicRows } = await db
      .from('subtopics')
      .select('id, topic_id')
      .in('id', subtopicIds)

    const subtopicToTopic = {}
    ;(subtopicRows ?? []).forEach(s => { subtopicToTopic[s.id] = s.topic_id })

    videoRows = rawLessonRows
      .map(v => ({ ...v, topic_id: subtopicToTopic[v.subtopic_id] ?? null }))
      .filter(v => v.topic_id)
  }

  return {
    practice: practiceRes.data ?? [],
    theory:   theoryRes.data   ?? [],
    games:    gamesWithTopicId,
    videos:   videoRows,
  }
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()
  const now = new Date()

  const afterStart  = new Date(now.getTime() - 7  * 86400000)
  const beforeStart = new Date(now.getTime() - 15 * 86400000)
  const beforeEnd   = afterStart

  const [beforeRaw, afterRaw] = await Promise.all([
    fetchActivityWindow(db, user.id, beforeStart, beforeEnd),
    fetchActivityWindow(db, user.id, afterStart, now),
  ])

  const beforeScores = computeTopicKnowledgeScores(beforeRaw)
  const afterScores  = computeTopicKnowledgeScores(afterRaw)

  const allTopicIds = [...new Set([...Object.keys(beforeScores), ...Object.keys(afterScores)])]
  let topicNames = {}
  if (allTopicIds.length) {
    const { data: topicRows } = await db.from('topics').select('id, name').in('id', allTopicIds)
    ;(topicRows ?? []).forEach(t => { topicNames[t.id] = t.name })
  }

  const deltas    = computeProgressDeltas(beforeScores, afterScores, topicNames)
  const headline  = buildProgressHeadline(deltas)

  return NextResponse.json({
    headline,
    deltas: deltas.slice(0, 5),
    windowDays: { before: '8-15 days ago', after: 'last 7 days' },
  })
}