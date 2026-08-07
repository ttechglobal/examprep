// src/lib/curriculumParser.js
// ─────────────────────────────────────────────────────────────────────────────
// Parses AI-generated curriculum JSON into a validated topic/subtopic tree.
//
// PURPOSE: topic mapping for past questions — NOT lesson generation.
//
// Key changes from previous version:
//   • No BOTH exam tag — topics carry exam_types: string[] (e.g. ['WAEC','JAMB'])
//   • No objectives field — we don't build lessons
//   • No lesson_status, lesson_generated fields
//   • Supports WAEC, JAMB, IGCSE (and any future exam type)
//   • buildCurriculumPrompt() updated to match new structure
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_EXAMS } from '@/lib/constants'

// ── JSON cleaner (shared) ─────────────────────────────────────────────────────
function cleanRawJson(raw) {
  return raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
    .replace(
      /"((?:[^"\\]|\\.)*)"/g,
      match => match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
    )
}

function safeParse(cleaned) {
  try {
    return JSON.parse(cleaned)
  } catch {
    try {
      return JSON.parse(
        cleaned
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/,\s*([}\]])/g, '$1')
      )
    } catch (err) {
      return { _parseError: err.message }
    }
  }
}

// ── Normalise exam_types field ────────────────────────────────────────────────
// AI may return: string 'WAEC', array ['WAEC','JAMB'], or legacy 'BOTH'
// We normalise to string[] of valid exam codes.
function normaliseExamTypes(val, parentExamTypes = null) {
  const valid = new Set(ALL_EXAMS)

  if (!val) return parentExamTypes ?? []

  // Legacy 'BOTH' from old data → expand to all exams that make sense
  if (val === 'BOTH') return ['WAEC', 'JAMB']

  // String: single exam
  if (typeof val === 'string') {
    const upper = val.toUpperCase()
    return valid.has(upper) ? [upper] : (parentExamTypes ?? [])
  }

  // Array: filter to valid exam codes
  if (Array.isArray(val)) {
    const filtered = val.map(v => String(v).toUpperCase()).filter(v => valid.has(v))
    return filtered.length > 0 ? filtered : (parentExamTypes ?? [])
  }

  return parentExamTypes ?? []
}

// ── Main curriculum parser ────────────────────────────────────────────────────
export function parseCurriculum(rawText) {
  const cleaned = cleanRawJson(rawText)
  let parsed = safeParse(cleaned)

  if (parsed?._parseError) {
    return { valid: false, errors: [`Invalid JSON: ${parsed._parseError}`], data: null }
  }

  // Handle AI wrapping in extra object
  if (parsed && !parsed.topics && parsed.curriculum) parsed = parsed.curriculum
  if (parsed && !parsed.topics) {
    const key = Object.keys(parsed).find(k =>
      k.toLowerCase().includes('topic') || Array.isArray(parsed[k])
    )
    if (key && key !== 'topics') parsed.topics = parsed[key]
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Response is not a valid JSON object'], data: null }
  }

  const errors = []
  if (!parsed.subject) errors.push("Missing 'subject' field")
  if (!parsed.topics || !Array.isArray(parsed.topics)) {
    errors.push("Missing 'topics' array")
    return { valid: false, errors, data: null }
  }
  if (parsed.topics.length === 0) {
    errors.push("'topics' array is empty")
    return { valid: false, errors, data: null }
  }

  // Normalise top-level exam_types (what exams this curriculum covers)
  const curriculumExamTypes = normaliseExamTypes(
    parsed.exam_types ?? parsed.exam_scope ?? parsed.exam_tag,
    ['WAEC'] // safe default
  )

  parsed.topics.forEach((topic, ti) => {
    const tLabel = `Topic ${ti + 1} ("${topic.title ?? topic.name ?? 'untitled'}")`
    if (!topic.title && topic.name) topic.title = topic.name
    if (!topic.title?.trim()) errors.push(`${tLabel}: missing title`)

    // Normalise topic exam_types — inherit from curriculum if missing
    topic.exam_types = normaliseExamTypes(
      topic.exam_types ?? topic.exam_tag,
      curriculumExamTypes
    )
    // Remove legacy field
    delete topic.exam_tag

    if (!topic.subtopics || !Array.isArray(topic.subtopics)) {
      errors.push(`${tLabel}: missing subtopics array`)
      return
    }
    if (topic.subtopics.length === 0) {
      errors.push(`${tLabel}: has no subtopics`)
      return
    }

    topic.subtopics.forEach((sub, si) => {
      const sLabel = `${tLabel} → Subtopic ${si + 1} ("${sub.title ?? sub.name ?? 'untitled'}")`
      if (!sub.title && sub.name) sub.title = sub.name
      if (!sub.title?.trim()) errors.push(`${sLabel}: missing title`)

      // Normalise subtopic exam_types — inherit from topic
      sub.exam_types = normaliseExamTypes(
        sub.exam_types ?? sub.exam_tag,
        topic.exam_types
      )
      delete sub.exam_tag

      // Strip lesson-specific fields — not needed for question mapping
      delete sub.objectives
      delete sub.lesson_status
      delete sub.lesson_generated
      delete sub.lesson_content
    })
  })

  if (errors.length > 0) return { valid: false, errors, data: null }

  // Attach normalised curriculum-level exam_types
  parsed.exam_types = curriculumExamTypes
  delete parsed.exam_scope
  delete parsed.exam_tag

  return {
    valid: true,
    errors: [],
    data: parsed,
    stats: {
      subject:       parsed.subject,
      topicCount:    parsed.topics.length,
      subtopicCount: parsed.topics.reduce((a, t) => a + (t.subtopics?.length ?? 0), 0),
      examTypes:     curriculumExamTypes,
    },
  }
}

// ── Curriculum prompt — generates topic/subtopic tree for question tagging ────
// This is the admin prompt they copy into Claude/Gemini.
export function buildCurriculumPrompt(subject, examTypes) {
  // examTypes is string[] e.g. ['WAEC'] or ['WAEC','JAMB'] or ['IGCSE']
  const exams = Array.isArray(examTypes) ? examTypes : [examTypes]
  const examLabel = exams.length === 1
    ? exams[0]
    : exams.slice(0, -1).join(', ') + ' and ' + exams[exams.length - 1]
  const examTypesJson = JSON.stringify(exams)

  return `You are an expert curriculum designer for ${examLabel} students.

Subject: ${subject}
Exam(s): ${examLabel}

I am going to give you the official syllabus. Your job is to produce a structured JSON topic tree for this subject. This tree is used to tag past exam questions — NOT to write lessons.

RULES:
- Break the syllabus into topics, each with specific subtopics
- Each subtopic should map to a distinct testable concept that appears in past questions
- Subtopic titles must be specific and searchable — e.g. "Newton's Second Law of Motion" not just "Forces"
- Mark each topic and subtopic with exam_types: which exam(s) it appears in
- exam_types must be an array containing only: ${exams.map(e => `"${e}"`).join(', ')}
- If a topic appears in multiple exams in this list, include all relevant exams in the array
- Do NOT include objectives, lesson content, or any other fields — only titles and exam_types

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "subject": "${subject}",
  "exam_types": ${examTypesJson},
  "topics": [
    {
      "id": "topic_001",
      "title": "",
      "exam_types": ${examTypesJson},
      "subtopics": [
        {
          "id": "subtopic_001a",
          "title": "",
          "exam_types": ${examTypesJson}
        }
      ]
    }
  ]
}`
}

// ── Single topic prompt — add/expand one topic at a time ──────────────────────
export function buildSingleTopicPrompt(subjectName, examTypes, topicName) {
  const exams = Array.isArray(examTypes) ? examTypes : [examTypes]
  const examLabel = exams.length === 1
    ? exams[0]
    : exams.slice(0, -1).join(', ') + ' and ' + exams[exams.length - 1]
  const examTypesJson = JSON.stringify(exams)

  return `You are a curriculum designer for ${examLabel}.

Subject: ${subjectName}
Topic: ${topicName}

Break this topic into specific, searchable subtopics for past question tagging.
Each subtopic title should match the kind of label you'd find on a past question.
Mark exam_types for each subtopic: only use ${exams.map(e => `"${e}"`).join(' or ')}.

Return ONLY valid JSON:

{
  "topic_title": "${topicName}",
  "exam_types": ${examTypesJson},
  "subtopics": [
    {
      "id": "sub_001",
      "title": "",
      "exam_types": ${examTypesJson}
    }
  ]
}`
}

// ── Single topic parser ───────────────────────────────────────────────────────
export function parseSingleTopic(rawText) {
  const cleaned = cleanRawJson(rawText)
  const parsed = safeParse(cleaned)

  if (parsed?._parseError) {
    return { valid: false, errors: [`Invalid JSON: ${parsed._parseError}`], data: null }
  }

  const errors = []
  if (!parsed.topic_title && !parsed.title) errors.push("Missing 'topic_title'")
  if (!parsed.subtopics || !Array.isArray(parsed.subtopics)) {
    errors.push("Missing 'subtopics' array")
    return { valid: false, errors, data: null }
  }
  if (parsed.subtopics.length === 0) {
    errors.push("'subtopics' is empty")
    return { valid: false, errors, data: null }
  }

  const parentExamTypes = normaliseExamTypes(parsed.exam_types ?? parsed.exam_tag, ['WAEC'])

  parsed.subtopics.forEach((sub, i) => {
    const title = sub.title ?? sub.name ?? ''
    if (!title.trim()) errors.push(`Subtopic ${i + 1}: missing title`)
    if (!sub.title && sub.name) sub.title = sub.name
    sub.exam_types = normaliseExamTypes(sub.exam_types ?? sub.exam_tag, parentExamTypes)
    delete sub.exam_tag
    delete sub.objectives
  })

  if (errors.length > 0) return { valid: false, errors, data: null }

  parsed.exam_types = parentExamTypes
  delete parsed.exam_tag

  return {
    valid: true,
    errors: [],
    data: parsed,
    stats: {
      topicTitle:    parsed.topic_title ?? parsed.title,
      subtopicCount: parsed.subtopics.length,
    },
  }
}