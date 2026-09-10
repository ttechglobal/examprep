// src/app/api/admin/questions/coverage-matrix/route.js
// GET /api/admin/questions/coverage-matrix?examType=WAEC&_t=...
//
// Reads from coverage_summary — a tiny pre-computed table updated on every
// import. Never scans the questions table. Immune to Supabase's 1,000-row cap.
// Coverage page loads instantly regardless of question bank size.
//
// coverage_summary schema:
//   subject_id | exam_type | year | count | updated_at
//   (unique on subject_id + exam_type + year)
//
// To set up: run coverage_summary.sql in Supabase SQL Editor first.
// Backfill is included in that SQL file.

import { requireAdmin }                       from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse }                        from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALL_YEARS  = Array.from({ length: 2026 - 2001 + 1 }, (_, i) => String(2026 - i))
const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'IGCSE']
const NO_CACHE   = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const examType = searchParams.get('examType') ?? 'ALL'

  const db = svc()

  // ── 1. Get subjects ────────────────────────────────────────────────────────
  const { data: subjectRows, error: subErr } = await db
    .from('subjects')
    .select('id, name, exam_type')
    .eq('is_active', true)
    .order('name')

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 }, NO_CACHE)

  const subjects = (subjectRows ?? []).filter(s =>
    examType === 'ALL' || s.exam_type === examType
  )

  if (!subjects.length) {
    return NextResponse.json(
      { subjects: [], years: [], matrix: {}, examTypes: EXAM_TYPES },
      NO_CACHE
    )
  }

  const subjectIds = subjects.map(s => s.id)

  // ── 2. Read coverage_summary — one tiny query, no row cap issues ───────────
  // coverage_summary has at most (subjects × exams × years) rows
  // e.g. 15 subjects × 4 exams × 25 years = 1,500 rows maximum ever.
  let summaryQuery = db
    .from('coverage_summary')
    .select('subject_id, exam_type, year, count')
    .in('subject_id', subjectIds)
    .gt('count', 0)                // skip zero-count rows

  if (examType !== 'ALL') {
    // Include questions tagged as 'BOTH' — they belong to all exams
    summaryQuery = summaryQuery.in('exam_type', [examType, 'BOTH'])
  }

  const { data: summaryRows, error: sumErr } = await summaryQuery

  if (sumErr) {
    // coverage_summary table doesn't exist yet — fall back to direct count
    // with a warning so the admin knows to run the SQL migration.
    console.warn('[coverage-matrix] coverage_summary missing, falling back to direct count:', sumErr.message)
    return fallbackDirectCount(db, subjects, subjectIds, examType, NO_CACHE)
  }

  // ── 3. Build matrix { subjectId: { year: count } } ─────────────────────────
  const matrix = {}
  for (const s of subjects) matrix[s.id] = {}

  for (const row of summaryRows ?? []) {
    const y = String(row.year)
    if (!matrix[row.subject_id]) continue
    // If a question is tagged 'BOTH', count it under whichever exam we're viewing
    matrix[row.subject_id][y] = (matrix[row.subject_id][y] ?? 0) + row.count
  }

  // ── 4. Determine year columns ──────────────────────────────────────────────
  const usedYears = new Set()
  for (const counts of Object.values(matrix)) {
    for (const y of Object.keys(counts)) usedYears.add(y)
  }
  const years = ALL_YEARS.filter(y =>
    usedYears.has(y) || parseInt(y) >= 2010
  )

  // ── 5. Per-subject totals ──────────────────────────────────────────────────
  const subjectsWithTotals = subjects.map(s => ({
    ...s,
    totalQuestions: Object.values(matrix[s.id] ?? {}).reduce((a, b) => a + b, 0),
    yearsCovered:   Object.values(matrix[s.id] ?? {}).filter(c => c > 0).length,
  }))

  return NextResponse.json(
    {
      subjects: subjectsWithTotals,
      years,
      matrix,
      examTypes: EXAM_TYPES,
      _source: 'coverage_summary',    // confirms we're reading from the fast path
      _rows:   summaryRows?.length ?? 0,
    },
    NO_CACHE
  )
}

// ── Fallback: direct count from questions table ────────────────────────────
// Used only if coverage_summary doesn't exist yet.
// Still has the 1,000-row problem — run the SQL migration to fix permanently.
async function fallbackDirectCount(db, subjects, subjectIds, examType, NO_CACHE) {
  const legacyValues = examType !== 'ALL' ? [examType, 'BOTH'] : null

  const buildQ = (useArray) => {
    let q = db
      .from('questions')
      .select('subject_id, year, exam_type')
      .in('subject_id', subjectIds)
      .eq('is_active', true)
      .not('year', 'is', null)
      .limit(50000)
    if (legacyValues) {
      q = useArray
        ? q.contains('exam_types', [examType])
        : q.in('exam_type', legacyValues)
    }
    return q
  }

  let qRows = []
  const { data, error } = await buildQ(true)
  if (!error && data?.length) {
    qRows = data
  } else {
    const fb = await buildQ(false)
    qRows = fb.data ?? []
  }

  const matrix = {}
  for (const s of subjects) matrix[s.id] = {}
  for (const row of qRows) {
    const y = String(row.year)
    if (!matrix[row.subject_id]) continue
    matrix[row.subject_id][y] = (matrix[row.subject_id][y] ?? 0) + 1
  }

  const usedYears = new Set()
  for (const counts of Object.values(matrix)) {
    for (const y of Object.keys(counts)) usedYears.add(y)
  }
  const ALL_YEARS = Array.from({ length: 2026 - 2001 + 1 }, (_, i) => String(2026 - i))
  const years = ALL_YEARS.filter(y => usedYears.has(y) || parseInt(y) >= 2010)

  const subjectsWithTotals = subjects.map(s => ({
    ...s,
    totalQuestions: Object.values(matrix[s.id] ?? {}).reduce((a, b) => a + b, 0),
    yearsCovered:   Object.values(matrix[s.id] ?? {}).filter(c => c > 0).length,
  }))

  return NextResponse.json(
    {
      subjects: subjectsWithTotals,
      years,
      matrix,
      examTypes: ['WAEC', 'JAMB', 'NECO', 'IGCSE'],
      _source: 'fallback_direct_count',   // admin knows SQL migration is needed
      _rows:   qRows.length,
    },
    NO_CACHE
  )
}