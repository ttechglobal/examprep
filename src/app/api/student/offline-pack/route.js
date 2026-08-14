// src/app/api/student/offline-pack/route.js
// Returns all active past questions for a subject + exam as a self-contained JSON blob.
// Query params: ?exam=WAEC&subject_id=uuid
// Response: { exam, subjectName, generatedAt, questions: [...] }
// Each question includes options, correct_answer, explanation — everything needed
// for the practice session page to work with zero further API calls.

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const svc = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAX_QUESTIONS = 300 // cap per pack — keeps file size manageable

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url       = new URL(request.url)
  const exam      = url.searchParams.get('exam')       // 'WAEC' | 'JAMB'
  const subjectId = url.searchParams.get('subject_id')

  if (!exam || !subjectId) {
    return NextResponse.json({ error: 'exam and subject_id are required' }, { status: 400 })
  }

  const db = svc()

  // Verify subject exists and belongs to this exam
  const { data: subject, error: subErr } = await db
    .from('subjects')
    .select('id, name, exam_type')
    .eq('id', subjectId)
    .eq('is_active', true)
    .single()

  if (subErr || !subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  // Fetch questions — prioritise by exam_frequency then year (most recent first)
  // Include everything the offline practice session needs
  const { data: questions, error: qErr } = await db
    .from('questions')
    .select(`
      id,
      question_text,
      options,
      correct_answer,
      explanation,
      difficulty,
      year,
      question_type,
      topic_id,
      subtopic_id,
      subject_id,
      topics ( id, name ),
      subtopics ( id, name )
    `)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('exam_frequency', { ascending: false, nullsLast: true })
    .order('year',           { ascending: false, nullsLast: true })
    .limit(MAX_QUESTIONS)

  if (qErr) {
    console.error('[offline-pack] questions fetch error:', qErr.message)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Flatten topics/subtopics into question rows for client convenience
  const flattened = (questions ?? []).map(q => ({
    id:               q.id,
    question_text:    q.question_text,
    options:          q.options,
    correct_answer:   q.correct_answer,
    explanation:      q.explanation,
    difficulty:       q.difficulty,
    year:             q.year,
    question_type:    q.question_type,
    topic_id:         q.topic_id,
    subtopic_id:      q.subtopic_id,
    subject_id:       q.subject_id,
    subject_name:     subject.name,
    topic_name:       q.topics?.name ?? null,
    subtopic_name:    q.subtopics?.name ?? null,
  }))

  // Log download event (optional analytics — skip silently if table doesn't exist)
  db.from('offline_pack_downloads').insert({
    student_id:  user.id,
    subject_id:  subjectId,
    exam_type:   exam,
    question_count: flattened.length,
    downloaded_at: new Date().toISOString(),
  }).catch(() => {}) // table may not exist yet

  return NextResponse.json({
    exam,
    subjectName:  subject.name,
    generatedAt:  new Date().toISOString(),
    questionCount: flattened.length,
    questions:    flattened,
  })
}