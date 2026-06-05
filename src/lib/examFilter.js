// src/lib/examFilter.js
// =============================================================================
// Centralised helper for exam_types[] array filtering.
//
// BEFORE (old pattern, scattered everywhere):
//   const examFilter = examType === 'BOTH' ? ['WAEC', 'JAMB', 'BOTH'] : [examType, 'BOTH']
//   .in('exam_type', examFilter)
//
// AFTER (new pattern, use this everywhere):
//   import { applyExamFilter } from '@/lib/examFilter'
//   applyExamFilter(query, examType)
//
// The new DB column is exam_types text[] (GIN indexed).
// Supabase's .contains() maps to the Postgres @> operator:
//   exam_types @> ARRAY['WAEC']  → question is available for WAEC
// =============================================================================

/**
 * Applies exam type filtering to a Supabase query builder.
 * Works with the new exam_types text[] column.
 *
 * @param {object} query   - Supabase query builder (chain continues after this)
 * @param {string} examType - 'WAEC' | 'JAMB'  (never 'BOTH' — that's gone)
 * @returns the query builder with the filter applied
 *
 * @example
 *   const { data } = await applyExamFilter(
 *     db.from('questions').select('*'),
 *     'WAEC'
 *   )
 */
export function applyExamFilter(query, examType) {
  if (!examType || examType === 'BOTH') {
    // Defensive fallback: 'BOTH' should never arrive here post-migration,
    // but if it does, return all questions rather than crashing.
    return query
  }
  // @> operator: exam_types must CONTAIN the requested exam
  return query.contains('exam_types', [examType])
}

/**
 * Builds a raw Postgres filter string for cases where you need
 * to filter inside a `.filter()` call rather than a chained method.
 * Use applyExamFilter() wherever possible instead.
 */
export function examFilterString(examType) {
  if (!examType || examType === 'BOTH') return null
  return `exam_types.cs.{"${examType}"}`
}

/**
 * Given a student's profile exam_type, normalise it.
 * Profile still stores 'WAEC' | 'JAMB' — this is fine.
 * This helper is just a safety net.
 */
export function normaliseExamType(raw) {
  if (raw === 'WAEC' || raw === 'JAMB') return raw
  return 'WAEC' // safe default
}