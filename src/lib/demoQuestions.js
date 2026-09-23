// src/lib/demoQuestions.js
// ─────────────────────────────────────────────────────────────────────────────
// Static question bank for the /demo page.
// No DB calls, no API, no auth — questions are bundled at build time.
//
// DATA FILES (one per exam):
//   src/data/demo/waec-demo-questions.json
//   src/data/demo/jamb-demo-questions.json
//
// Each file is a single object keyed by subject name, 10 questions each:
//   { "Mathematics": [ {...}, ... ], "Biology": [ ... ], ... }
//
// HOW TO UPDATE:
//   Run the queries in src/data/demo/demo-queries.sql in the Supabase SQL
//   editor and paste each result as the whole contents of its JSON file.
//   The query output is already in the /api/student/questions shape, so
//   QuestionCard, ExplanationBlock and the battle UI work unchanged.
//
// The demo shows 5 random questions from each subject's pool of 10.
// ─────────────────────────────────────────────────────────────────────────────

import waecData from '@/data/demo/waec-demo-questions.json'
import jambData from '@/data/demo/jamb-demo-questions.json'

const DEMO_COUNT = 5

// Preferred display order on the demo home screen. Only subjects that
// actually have questions in the file are shown; any subject in the file
// that isn't listed here is added at the end, so nothing is lost.

const WAEC_SUBJECTS = ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics']
const JAMB_SUBJECTS = ['Use of English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Accounting']

// Light safety pass over the pasted data. If the explanation column is stored
// as text rather than jsonb, the export contains a JSON string — parse it back
// into an object so ExplanationBlock can render it.
function normaliseQuestion(q) {
  let explanation = q.explanation ?? null
  if (typeof explanation === 'string') {
    try { explanation = JSON.parse(explanation) } catch { explanation = null }
  }
  return {
    ...q,
    text:        q.text ?? q.question_text ?? '',
    explanation,
    difficulty:  q.difficulty ?? 'medium',
  }
}

// Accepts either format:
//   1. The plain object:      { "Mathematics": [...], ... }
//   2. Supabase's JSON export: [ { "demo_json": "{ \"Mathematics\": [...] }" } ]
//      (what you get from "Export > JSON" / copying the whole result grid)
function unwrap(raw) {
  let d = raw
  if (Array.isArray(d)) d = d[0] ?? {}
  if (d && typeof d === 'object' && 'demo_json' in d) d = d.demo_json
  if (typeof d === 'string') {
    try { d = JSON.parse(d) } catch { d = {} }
  }
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {}
}

function buildBank(raw, preferredOrder) {
  const data = unwrap(raw)
  const bank = {}
  for (const [name, rows] of Object.entries(data)) {
    if (Array.isArray(rows) && rows.length) bank[name] = rows.map(normaliseQuestion)
  }
  // Sort by preferred order. 'Accounting' also covers names like
  // "Principles of Accounts" or "Financial Accounting" from the database.
  const rank = name => {
    const i = preferredOrder.findIndex(p => p === name || (p === 'Accounting' && /account/i.test(name)))
    return i === -1 ? preferredOrder.length : i
  }
  const subjects = Object.keys(bank).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  // File not filled yet: show the preferred list so the page isn't blank
  return { subjects: subjects.length ? subjects : preferredOrder, questions: bank }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const DEMO_CONFIG = {
  WAEC: buildBank(waecData, WAEC_SUBJECTS),
  JAMB: buildBank(jambData, JAMB_SUBJECTS),
}

/**
 * Returns 5 randomly-selected questions for a given exam + subject.
 * Shuffles the pool of 10 so each demo session feels different.
 * Returns an empty array if the subject hasn't been populated yet.
 */
export function getDemoQuestions(exam, subjectName) {
  const pool = DEMO_CONFIG[exam]?.questions?.[subjectName] ?? []
  if (!pool.length) return []
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, DEMO_COUNT)
}

/**
 * Returns true if the subject has questions loaded in the static bank.
 */
export function demoSubjectHasQuestions(exam, subjectName) {
  return (DEMO_CONFIG[exam]?.questions?.[subjectName]?.length ?? 0) > 0
}