// src/lib/examFilter.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralised exam filtering for the question bank.
//
// DATA MODEL:
//   Questions have exam_types text[] (GIN indexed).
//   e.g. ['WAEC'], ['JAMB'], ['WAEC','JAMB'], ['IGCSE']
//
//   "BOTH" no longer exists as a value. If a question appears in multiple exams
//   it simply has multiple entries in its exam_types array.
//
//   This means adding IGCSE (or any future exam) requires zero schema changes —
//   just upload questions tagged with ['IGCSE'].
//
// USAGE:
//   import { applyExamFilter } from '@/lib/examFilter'
//   const { data } = await applyExamFilter(
//     db.from('questions').select('*'),
//     'WAEC'
//   )
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_EXAMS } from '@/lib/constants'

/**
 * Applies exam type filtering to a Supabase query builder.
 * Uses the @> (contains) operator on exam_types text[].
 *
 * @param {object} query    - Supabase query builder
 * @param {string} examType - 'WAEC' | 'JAMB' | 'IGCSE' (or any future exam)
 * @returns the query builder with filter applied
 */
export function applyExamFilter(query, examType) {
  if (!examType) return query
  // Normalise: strip legacy 'BOTH', uppercase
  const normalised = examType.toUpperCase()
  if (!ALL_EXAMS.includes(normalised)) {
    console.warn(`[examFilter] Unknown exam type: "${examType}" — filter not applied`)
    return query
  }
  return query.contains('exam_types', [normalised])
}

/**
 * Builds a raw Postgres filter string for use in .filter() calls.
 */
export function examFilterString(examType) {
  if (!examType) return null
  const normalised = examType.toUpperCase()
  if (!ALL_EXAMS.includes(normalised)) return null
  return `exam_types.cs.{"${normalised}"}`
}

/**
 * Normalises a raw exam type string to a valid value.
 * Handles legacy 'BOTH' by returning the first exam in ALL_EXAMS as a fallback.
 */
export function normaliseExamType(raw) {
  if (!raw) return ALL_EXAMS[0]
  const upper = raw.toUpperCase()
  if (ALL_EXAMS.includes(upper)) return upper
  // Legacy BOTH → no longer valid, default to WAEC
  return ALL_EXAMS[0]
}

/**
 * Given an array of exam types (e.g. from a question's exam_types[]),
 * returns true if the question is available for the requested exam.
 */
export function questionAvailableFor(questionExamTypes, requestedExam) {
  if (!Array.isArray(questionExamTypes) || !requestedExam) return false
  return questionExamTypes.includes(requestedExam.toUpperCase())
}