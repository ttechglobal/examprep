// src/app/api/prerequisites/check/route.js
// GET /api/prerequisites/check?topicId=xxx
// Returns unmet prerequisites for the current student + a set of quiz questions.
// Used by the student frontend before opening a lesson.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const QUIZ_QUESTIONS_PER_TOPIC = 10

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topicId')

  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
  }

  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()

  // ── 1. Get the topic's subject to check map status + settings ────────────────
  const { data: topic } = await db
    .from('topics')
    .select('id, name, subject_id, subjects(prereq_map_status, prereq_depth, prereq_pass_threshold)')
    .eq('id', topicId)
    .single()

  if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 })

  const settings = topic.subjects
  // If map not approved, skip the gate entirely — lesson opens normally
  if (settings?.prereq_map_status !== 'approved') {
    return NextResponse.json({ unmetPrerequisites: [], canProceed: true, gateActive: false })
  }

  const depth           = settings?.prereq_depth ?? 2
  const passThreshold   = settings?.prereq_pass_threshold ?? 60

  // ── 2. Walk the prerequisite graph up to `depth` levels ─────────────────────
  const allPrereqIds = await getPrerequisiteIds(db, topicId, depth)

  if (allPrereqIds.size === 0) {
    return NextResponse.json({ unmetPrerequisites: [], canProceed: true, gateActive: true })
  }

  // ── 3. Check student mastery for each prerequisite topic ─────────────────────
  const { data: masteryRecords } = await db
    .from('student_topic_mastery')
    .select('topic_id, status, score')
    .eq('student_id', user.id)
    .in('topic_id', [...allPrereqIds])

  const masteryMap = {}
  masteryRecords?.forEach(m => { masteryMap[m.topic_id] = m })

  // Collect unmet prerequisites (untested or weak)
  const unmetTopicIds = [...allPrereqIds].filter(id => {
    const mastery = masteryMap[id]
    return !mastery || mastery.status !== 'mastered'
  })

  if (unmetTopicIds.length === 0) {
    return NextResponse.json({ unmetPrerequisites: [], canProceed: true, gateActive: true })
  }

  // ── 4. Fetch topic names for unmet prerequisites ─────────────────────────────
  const { data: prereqTopics } = await db
    .from('topics')
    .select('id, name')
    .in('id', unmetTopicIds)

  // ── 5. Fetch 10 quiz questions per unmet prerequisite topic ──────────────────
  // Mix past_paper and ai_generated, randomise
  const quizByTopic = {}

  for (const prereqTopic of (prereqTopics ?? [])) {
    const { data: questions } = await db
      .from('questions')
      .select('id, question_text, options, correct_answer, difficulty, explanation')
      .eq('topic_id', prereqTopic.id)
      .eq('is_active', true)
      .limit(30) // fetch more, then randomly pick 10

    const shuffled = shuffle(questions ?? []).slice(0, QUIZ_QUESTIONS_PER_TOPIC)
    quizByTopic[prereqTopic.id] = {
      topic: prereqTopic,
      currentStatus: masteryMap[prereqTopic.id]?.status ?? 'untested',
      lastScore:     masteryMap[prereqTopic.id]?.score ?? null,
      questions:     shuffled,
      hasQuestions:  shuffled.length > 0,
    }
  }

  return NextResponse.json({
    gateActive:         true,
    canProceed:         true, // always true — never a hard block
    passThreshold,
    unmetPrerequisites: Object.values(quizByTopic),
  })
}

// ── POST — update mastery after a quiz attempt ────────────────────────────────
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topicId, score } = await request.json()

  if (!topicId || score === undefined) {
    return NextResponse.json({ error: 'topicId and score required' }, { status: 400 })
  }

  const db = svc()

  // Get threshold for this topic's subject
  const { data: topic } = await db
    .from('topics')
    .select('subject_id, subjects(prereq_pass_threshold)')
    .eq('id', topicId)
    .single()

  const threshold = topic?.subjects?.prereq_pass_threshold ?? 60

  const status = score >= threshold ? 'mastered' : 'weak'

  await db
    .from('student_topic_mastery')
    .upsert({
      student_id:    user.id,
      topic_id:      topicId,
      status,
      score,
      last_tested_at: new Date().toISOString(),
      attempts:       1, // will be incremented by DB trigger in future
    }, { onConflict: 'student_id,topic_id' })

  return NextResponse.json({ status, score, threshold })
}

// ── Walk prerequisite graph up to maxDepth levels ────────────────────────────
async function getPrerequisiteIds(db, topicId, maxDepth) {
  const visited = new Set()
  const queue = [{ id: topicId, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift()
    if (depth >= maxDepth) continue

    const { data: edges } = await db
      .from('topic_prerequisites')
      .select('requires_topic_id')
      .eq('topic_id', id)

    for (const edge of (edges ?? [])) {
      const prereqId = edge.requires_topic_id
      if (!visited.has(prereqId) && prereqId !== topicId) {
        visited.add(prereqId)
        queue.push({ id: prereqId, depth: depth + 1 })
      }
    }
  }

  return visited
}

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}