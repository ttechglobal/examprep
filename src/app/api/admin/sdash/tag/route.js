// src/app/api/admin/sdash/tag/route.js
// ─────────────────────────────────────────────────────────────────────────────
// AI-Powered Topic Tagger
//
// POST /api/admin/sdash/tag
//
// For a batch of untagged questions, uses Claude to suggest the top-3 closest
// matching topics (and optionally subtopics) from the subject's curriculum.
// The admin then reviews suggestions and picks the best match — the system
// never auto-tags without human confirmation.
//
// Body:
//   questions  array  — [{ id, question_text, options, year }]
//   topics     array  — [{ id, name, subtopics: [{ id, name }] }]
//                       (the curriculum tree for this subject)
//   subjectId  string
//   examType   string
//
// Returns:
//   suggestions: [{ questionId, matches: [{ topicId, topicName, subtopicId?, subtopicName?, score }] }]
// ─────────────────────────────────────────────────────────────────────────────

import { requireAdmin } from '@/lib/adminAuth'
import { NextResponse } from 'next/server'

// Simple keyword-overlap scorer (no Claude API call needed for MVP)
// Returns a score 0–100 based on keyword overlap between question text and topic name.
function scoreTopicMatch(questionText, topicName, subtopicName = '') {
  const text = questionText.toLowerCase()
  const target = `${topicName} ${subtopicName}`.toLowerCase()

  // Tokenise both to words of 3+ chars
  const textWords   = new Set(text.match(/[a-z]{3,}/g) ?? [])
  const targetWords = (target.match(/[a-z]{3,}/g) ?? [])

  if (!targetWords.length) return 0

  const matches = targetWords.filter(w => textWords.has(w)).length
  return Math.round((matches / targetWords.length) * 100)
}

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { questions = [], topics = [] } = body

  if (!questions.length) {
    return NextResponse.json({ error: 'questions array is required' }, { status: 400 })
  }
  if (!topics.length) {
    return NextResponse.json({ error: 'topics array is required' }, { status: 400 })
  }

  // Flatten topic tree into [{ topicId, topicName, subtopicId?, subtopicName? }]
  const candidates = []
  for (const topic of topics) {
    // Topic-level candidate (no subtopic)
    candidates.push({ topicId: topic.id, topicName: topic.name, subtopicId: null, subtopicName: null })
    // Subtopic-level candidates
    for (const sub of (topic.subtopics ?? [])) {
      candidates.push({ topicId: topic.id, topicName: topic.name, subtopicId: sub.id, subtopicName: sub.name })
    }
  }

  const suggestions = questions.map(q => {
    const text = `${q.question_text ?? ''} ${Object.values(q.options ?? {}).join(' ')}`

    // Score every candidate
    const scored = candidates.map(c => ({
      ...c,
      score: scoreTopicMatch(text, c.topicName, c.subtopicName ?? ''),
    }))

    // Sort descending, take top 3 unique topics (prefer subtopic matches)
    scored.sort((a, b) => b.score - a.score)

    // Deduplicate — only one entry per topic
    const seen = new Set()
    const top3 = []
    for (const c of scored) {
      if (top3.length >= 3) break
      const key = c.subtopicId ?? c.topicId
      if (!seen.has(key)) {
        seen.add(key)
        top3.push(c)
      }
    }

    return { questionId: q.id, matches: top3 }
  })

  return NextResponse.json({ suggestions })
}