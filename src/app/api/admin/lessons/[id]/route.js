// src/app/api/admin/lessons/[id]/route.js
// POST   — save lesson content (validate + store)
// PATCH  — change lesson status (publish/unpublish/draft)
//          When action='publish': auto-generate practice questions via Anthropic API
//          if fewer than 5 active questions exist for the subtopic.
//
// Question generation strategy:
// On publish, we call the Anthropic API in the background (non-blocking to the admin).
// We use the existing buildGeneratedQuestionsPrompt from prerequisitePrompt.js.
// Questions are saved in the same format as past-paper questions (source='ai_generated').
// The admin sees a toast "✓ Lesson published — generating 10 practice questions..."

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildGeneratedQuestionsPrompt } from '@/lib/prerequisitePrompt'

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// ── POST: save lesson content ────────────────────────────────────────────────
export async function POST(request, { params }) {
  const { id: subtopicId } = await params  // folder is [id], aliased for clarity
  const { raw_content } = await request.json()
  if (!raw_content) return NextResponse.json({ error: 'raw_content required' }, { status: 400 })

  const svc = db()

  // Validate JSON
  let parsed
  try { parsed = JSON.parse(raw_content) }
  catch { return NextResponse.json({ valid: false, errors: ['Invalid JSON'] }) }

  const errors = []
  if (!parsed.title)         errors.push('Missing title')
  if (!Array.isArray(parsed.slides)) errors.push('Missing slides array')
  if (parsed.slides?.length === 0)   errors.push('At least one slide required')

  if (errors.length) return NextResponse.json({ valid: false, errors })

  const { error } = await svc.from('subtopics').update({
    lesson_content:   raw_content,
    lesson_generated: true,
  }).eq('id', subtopicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ valid: true, slideCount: parsed.slides?.length ?? 0 })
}

// ── PATCH: change lesson status + auto-generate questions on publish ──────────
export async function PATCH(request, { params }) {
  const { id: subtopicId } = await params  // folder is [id], aliased for clarity
  const { action } = await request.json()

  const svc = db()

  const statusMap = { publish: 'published', unpublish: 'draft', draft: 'draft' }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { error } = await svc.from('subtopics')
    .update({ lesson_status: newStatus })
    .eq('id', subtopicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ── Auto-generate questions on publish ─────────────────────────────────────
  let questionsScheduled = false
  if (action === 'publish') {
    // Check if we already have enough questions for this subtopic
    const { count } = await svc.from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('subtopic_id', subtopicId)
      .eq('is_active', true)

    if ((count ?? 0) < 5) {
      // Fetch subtopic/topic/subject metadata for the prompt
      const { data: subtopic } = await svc.from('subtopics')
        .select('id, name, objectives, exam_type, topic_id, topics(id, name, subject_id, subjects(id, name, exam_type))')
        .eq('id', subtopicId).single()

      if (subtopic) {
        // Fire question generation as a background task (don't await — admin sees response immediately)
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

  const examType    = subtopic.exam_type ?? subject.exam_type ?? 'BOTH'
  const prompt      = buildGeneratedQuestionsPrompt({
    subjectName:   subject.name,
    topicName:     topic.name,
    subtopicName:  subtopic.name,
    examType,
    objectives:    subtopic.objectives ?? [],
  })

  // Call Anthropic API
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[question gen] ANTHROPIC_API_KEY not set — skipping generation')
    return
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[question gen] Anthropic error:', err)
    return
  }

  const data    = await response.json()
  const rawText = data.content?.[0]?.text ?? ''

  // Parse the JSON response
  let questions
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    questions = JSON.parse(cleaned)
  } catch (e) {
    console.error('[question gen] Failed to parse questions JSON:', e.message, '\nRaw:', rawText.slice(0, 200))
    return
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.warn('[question gen] No questions returned')
    return
  }

  // Resolve topic_id if needed
  const topicId   = subtopic.topic_id
  const subjectId = topic?.subject_id

  // Insert questions
  const rows = questions.map(q => ({
    subject_id:    subjectId,
    topic_id:      topicId,
    subtopic_id:   subtopic.id,
    exam_type:     examType,
    year:          null,
    question_text: q.question_text,
    has_image:     false,
    options:       q.options,
    correct_answer:q.correct_answer,
    explanation: {
      correct:       q.explanation?.correct      ?? '',
      workings:      q.explanation?.workings     ?? [],
      wrong_options: q.explanation?.wrong_options ?? {},
    },
    difficulty:    q.difficulty    ?? 'medium',
    question_type: q.question_type ?? 'objective',
    source:        'ai_generated',
    is_active:     true,
  }))

  const { data: inserted, error } = await svc.from('questions').insert(rows).select('id')

  if (error) {
    console.error('[question gen] DB insert error:', error.message)
    return
  }

  console.log(`[question gen] ✓ Generated and saved ${inserted?.length ?? 0} questions for subtopic "${subtopic.name}"`)
}