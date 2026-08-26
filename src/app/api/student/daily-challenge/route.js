// src/app/api/student/daily-challenge/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET — returns ONE question for today's daily challenge.
//
// SELECTION LOGIC:
//   • For JAMB students: pick from Mathematics, Use of English, or the
//     student's other enrolled subjects (JAMB General Studies set).
//   • For WAEC students: pick from any of their enrolled subjects.
//   • For BOTH: treat as JAMB priority (core subjects first).
//
//   Within that pool:
//     1. Prefer topics the student has NOT attempted yet (exposure first).
//     2. Among attempted topics, prefer those with accuracy < 60% (weakness).
//     3. Never repeat the same question on the same calendar day.
//     4. Seed is the date string — same student sees same question all day,
//        but a new one every midnight.
//
// RESPONSE:
//   { question: { id, text, options, topic_name, subject_name } }
//   or { question: null } if no suitable question is found.
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

// Deterministic seeded pick — same index for same student on same day
function seededIndex(studentId, dateStr, max) {
  if (max === 0) return 0
  // Simple hash: sum char codes of studentId + dateStr
  const str = `${studentId}:${dateStr}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash % max
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db      = svc()
  const today   = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 1. Fetch student profile to know their exam type and subjects
  const { data: profile } = await db
    .from('profiles')
    .select('exam_type, subjects')
    .eq('id', user.id)
    .single()

  const examType = profile?.exam_type ?? 'WAEC'

  // 2. Determine which subjects to pull from
  //    JAMB core: Use of English + Mathematics are always included.
  //    Others: whatever the student enrolled in.
  let subjectNames = profile?.subjects ?? []

  // Ensure JAMB core subjects are always in the pool for JAMB students
  if (examType === 'JAMB' || examType === 'BOTH') {
    const jamb_core = ['Use of English', 'Mathematics']
    subjectNames = [...new Set([...jamb_core, ...subjectNames])]
  }

  if (!subjectNames.length) {
    return NextResponse.json({ question: null })
  }

  // 3. Resolve subject IDs
  const { data: subjectRows } = await db
    .from('subjects')
    .select('id, name')
    .in('name', subjectNames)
    .eq('is_active', true)

  if (!subjectRows?.length) return NextResponse.json({ question: null })

  const subjectIds   = subjectRows.map(s => s.id)
  const subjectNames_map = {}
  subjectRows.forEach(s => { subjectNames_map[s.id] = s.name })

  // 4. Check if student already answered a daily challenge today
  //    (stored in daily_challenge_attempts table, or via question_attempts with context='daily')
  const { data: todayAttempts } = await db
    .from('question_attempts')
    .select('question_id')
    .eq('student_id', user.id)
    .eq('context', 'daily_challenge')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at',  `${today}T23:59:59.999Z`)

  const answeredTodayIds = new Set((todayAttempts ?? []).map(a => a.question_id))

  // 5. Get student's topic accuracy to prefer weak/unattempted topics
  const { data: attempts } = await db
    .from('question_attempts')
    .select('topic_id, is_correct')
    .eq('student_id', user.id)
    .in('subject_id', subjectIds)
    .not('topic_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300)

  // Build accuracy map: topicId → { total, correct }
  const topicAcc = {}
  for (const a of attempts ?? []) {
    if (!topicAcc[a.topic_id]) topicAcc[a.topic_id] = { total: 0, correct: 0 }
    topicAcc[a.topic_id].total++
    if (a.is_correct) topicAcc[a.topic_id].correct++
  }

  // 6. Fetch all topics for enrolled subjects
  const { data: allTopics } = await db
    .from('topics')
    .select('id, name, subject_id, is_core')
    .in('subject_id', subjectIds)
    .eq('is_active', true)

  if (!allTopics?.length) return NextResponse.json({ question: null })

  // Score topics: lower = higher priority
  //   0-100: unattempted core topics (show first)
  //   100-200: weak topics < 60% accuracy
  //   200-300: improving topics
  //   300+: strong/mastered (fallback only)
  function topicPriority(topic) {
    const acc = topicAcc[topic.id]
    const isCore = topic.is_core ?? false
    if (!acc || acc.total === 0) {
      return isCore ? 0 : 50  // unattempted
    }
    const pct = (acc.correct / acc.total) * 100
    if (pct < 60) return isCore ? 100 : 150   // weak
    if (pct < 80) return 200                   // improving
    return 300                                 // strong
  }

  // Sort topics by priority
  const sortedTopics = [...allTopics].sort((a, b) => topicPriority(a) - topicPriority(b))

  // 7. Try each priority bucket until we find a question
  //    Bucket the topics: unattempted-core → weak → improving → rest
  const buckets = [
    sortedTopics.filter(t => topicPriority(t) <= 50),
    sortedTopics.filter(t => topicPriority(t) > 50 && topicPriority(t) <= 150),
    sortedTopics.filter(t => topicPriority(t) > 150 && topicPriority(t) <= 200),
    sortedTopics.filter(t => topicPriority(t) > 200),
  ]

  let selectedQuestion = null

  for (const bucket of buckets) {
    if (!bucket.length) continue
    const topicIds = bucket.map(t => t.id)

    let qQuery = db
      .from('questions')
      .select('id, question_text, options, correct_answer, explanation, topic_id, subject_id, difficulty')
      .in('topic_id', topicIds)
      .eq('is_active', true)
      .eq('question_type', 'multiple_choice')
      .limit(100)
    // Only add exclusion filter when there are IDs to exclude — avoids fragile (null) workaround
    if (answeredTodayIds.size > 0) {
      qQuery = qQuery.not('id', 'in', `(${[...answeredTodayIds].join(',')})`)
    }
    const { data: qs } = await qQuery

    if (!qs?.length) continue

    // Deterministic pick from this pool (same student, same day = same Q)
    const idx = seededIndex(user.id, today, qs.length)
    selectedQuestion = qs[idx]
    break
  }

  // If all questions answered today (very unlikely), just pick any
  if (!selectedQuestion) {
    const { data: anyQ } = await db
      .from('questions')
      .select('id, question_text, options, correct_answer, explanation, topic_id, subject_id, difficulty')
      .in('subject_id', subjectIds)
      .eq('is_active', true)
      .eq('question_type', 'multiple_choice')
      .limit(50)

    if (anyQ?.length) {
      selectedQuestion = anyQ[seededIndex(user.id, today, anyQ.length)]
    }
  }

  if (!selectedQuestion) return NextResponse.json({ question: null })

  // 8. Enrich with topic + subject names
  const topic = allTopics.find(t => t.id === selectedQuestion.topic_id)

  return NextResponse.json({
    question: {
      id:           selectedQuestion.id,
      text:         selectedQuestion.question_text,
      options:       selectedQuestion.options,
      correct_answer: selectedQuestion.correct_answer,
      explanation:   selectedQuestion.explanation,
      topic_id:     selectedQuestion.topic_id,
      subject_id:   selectedQuestion.subject_id,
      topic_name:   topic?.name ?? '',
      subject_name: subjectNames_map[selectedQuestion.subject_id] ?? '',
      difficulty:   selectedQuestion.difficulty ?? 'medium',
      already_answered: answeredTodayIds.has(selectedQuestion.id),
    },
    date: today,
  })
}

// POST — save the student's answer to today's daily challenge
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, selected_answer, is_correct, topic_id, subject_id } = await request.json()
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 })

  const db = svc()

  await db.from('question_attempts').insert({
    student_id:      user.id,
    question_id,
    selected_answer,
    is_correct:      is_correct ?? false,
    topic_id:        topic_id ?? null,
    subject_id:      subject_id ?? null,
    context:         'daily_challenge',
    created_at:      new Date().toISOString(),
  })

  // Award a small XP bonus for completing the daily challenge
  const points = is_correct ? 20 : 10  // correct = 20XP, attempted = 10XP
  try {
    await db.from('points_log').insert({
      student_id:   user.id,
      points,
      reason:       'daily_challenge',
      reference_id: question_id,
      metadata:     { is_correct, date: new Date().toISOString().slice(0, 10) },
    })
    const { error: rpcErr } = await db.rpc('increment_total_points', { uid: user.id, delta: points })
    if (rpcErr) {
      const { data: prof } = await db.from('profiles').select('total_points').eq('id', user.id).single()
      await db.from('profiles').update({ total_points: (prof?.total_points ?? 0) + points }).eq('id', user.id)
    }
  } catch {}

  return NextResponse.json({ ok: true, points_awarded: points })
}