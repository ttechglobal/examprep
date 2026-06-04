// src/app/api/admin/lessons/[id]/route.js
// GET    — fetch subtopic + existing lesson content for the editor
// POST   — save lesson content (validate + store)
// PATCH  — change lesson status (publish/unpublish/draft)
//          When action='publish': auto-generate practice questions via Anthropic API
//          if fewer than 5 active questions exist for the subtopic.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildGeneratedQuestionsPrompt } from '@/lib/prerequisitePrompt'

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// ── GET: fetch subtopic + lesson content for the editor ──────────────────────
export async function GET(request, { params }) {
  const { id: subtopicId } = await params

  const svc = db()

  const { data: subtopic, error } = await svc
    .from('subtopics')
    .select(`
      id,
      name,
      slug,
      exam_type,
      lesson_status,
      lesson_generated,
      lesson_content,
      objectives,
      generation_prompt,
      topic_id,
      topics (
        id,
        name,
        slug,
        subject_id,
        subjects ( id, name, slug, exam_type )
      )
    `)
    .eq('id', subtopicId)
    .single()

  if (error || !subtopic) {
    return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 })
  }

  return NextResponse.json(subtopic)
}

// ── POST: save lesson content ────────────────────────────────────────────────
export async function POST(request, { params }) {
  const { id: subtopicId } = await params
  const { raw_content } = await request.json()
  if (!raw_content) return NextResponse.json({ error: 'raw_content required' }, { status: 400 })

  const svc = db()

  // Validate JSON
  let parsed
  try { parsed = JSON.parse(raw_content) }
  catch { return NextResponse.json({ valid: false, errors: ['Invalid JSON'] }) }

  const errors = []
  if (!parsed.title)                    errors.push('Missing title')
  if (!Array.isArray(parsed.slides))    errors.push('Missing slides array')
  if (parsed.slides?.length === 0)      errors.push('At least one slide required')

  if (errors.length) return NextResponse.json({ valid: false, errors })

  const { error } = await svc
    .from('subtopics')
    .update({
      lesson_content:   raw_content,
      lesson_generated: true,
    })
    .eq('id', subtopicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ valid: true, slideCount: parsed.slides?.length ?? 0 })
}

// ── PATCH: change lesson status + auto-generate questions on publish ──────────
export async function PATCH(request, { params }) {
  const { id: subtopicId } = await params
  const { action } = await request.json()

  const svc = db()

  const statusMap = { publish: 'published', unpublish: 'draft', draft: 'draft' }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { error } = await svc
    .from('subtopics')
    .update({ lesson_status: newStatus })
    .eq('id', subtopicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Auto-generate questions on publish ─────────────────────────────────────
  let questionsScheduled = false
  if (action === 'publish') {
    const { count } = await svc
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('subtopic_id', subtopicId)
      .eq('is_active', true)

    if ((count ?? 0) < 5) {
      const { data: subtopic } = await svc
        .from('subtopics')
        .select('id, name, objectives, exam_type, topic_id, topics(id, name, subject_id, subjects(id, name, exam_type))')
        .eq('id', subtopicId)
        .single()

      if (subtopic) {
        generateQuestionsInBackground(svc, subtopic).catch(err => {
          console.error('[lesson publish] question generation failed:', err)
        })
        questionsScheduled = true
      }
    }
  }

  return NextResponse.json({
    success: true,
    status:  newStatus,
    questionsScheduled,
    message: questionsScheduled
      ? 'Lesson published — generating 10 practice questions in background…'
      : `Lesson ${newStatus}`,
  })
}

// ── Background question generation ───────────────────────────────────────────
async function generateQuestionsInBackground(svc, subtopic) {
  const topic   = subtopic.topics
  const subject = topic?.subjects

  if (!subject) return

  const examType = subtopic.exam_type ?? subject.exam_type ?? 'BOTH'
  const prompt   = buildGeneratedQuestionsPrompt({
    subjectName:  subject.name,
    topicName:    topic.name,
    subtopicName: subtopic.name,
    examType,
    objectives:   subtopic.objectives ?? [],
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-opus-4-6',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    console.error('[question gen] Anthropic API error:', await response.text())
    return
  }

  const aiData = await response.json()
  const text   = aiData.content?.find(b => b.type === 'text')?.text ?? ''

  let questions
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    questions = Array.isArray(parsed) ? parsed : parsed.questions
  } catch (err) {
    console.error('[question gen] JSON parse failed:', err.message)
    return
  }

  if (!Array.isArray(questions) || questions.length === 0) return

  // Fetch subject/topic IDs for tagging
  const { data: subtopicRow } = await svc
    .from('subtopics')
    .select('id, topic_id, topics(subject_id)')
    .eq('id', subtopic.id)
    .single()

  const subjectId = subtopicRow?.topics?.subject_id
  const topicId   = subtopicRow?.topic_id

  const rows = questions.map(q => ({
    subject_id:          subjectId ?? null,
    topic_id:            topicId ?? null,
    subtopic_id:         subtopic.id,
    exam_type:           examType,
    question_text:       q.question ?? q.question_text ?? '',
    options:             q.options ?? {},
    correct_answer:      q.correct_answer ?? q.correct ?? 'A',
    explanation:         {
      correct:       q.correct_explanation ?? '',
      wrong_options: q.wrong_explanations ?? {},
    },
    difficulty:          q.difficulty ?? 'medium',
    question_type:       q.question_type ?? 'application',
    source:              'ai_generated',
    is_active:           true,
  }))

  const { error: insertError } = await svc.from('questions').insert(rows)
  if (insertError) {
    console.error('[question gen] insert failed:', insertError.message)
  }
}