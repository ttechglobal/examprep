// src/app/api/admin/questions/coverage-matrix/route.js
// GET /api/admin/questions/coverage-matrix?examType=WAEC
//
// Returns subject × year matrix with accurate question counts.
//
// BUGS FIXED:
//
// 1. MISSING SUPABASE ROW LIMIT
//    Supabase defaults to 1000 rows per query with no error or warning.
//    A large question bank (>1000 questions) silently truncated, producing
//    a matrix that showed empty cells for years that genuinely had data.
//    Fix: add .limit(50000) to the questions fetch — large enough to cover
//    any realistic question bank. The query only fetches 3 lightweight
//    fields (subject_id, year, exam_type) so memory cost is negligible.
//
// 2. 'BOTH' QUESTIONS EXCLUDED FROM EXAM-SPECIFIC FILTER
//    When examType = 'WAEC', the query was doing .eq('exam_type', 'WAEC').
//    Questions saved with exam_type = 'BOTH' (shared WAEC+JAMB questions)
//    were excluded — they never appeared in the matrix even though they
//    should count toward the WAEC total.
//    Fix: when examType is not 'ALL', use .in('exam_type', [examType, 'BOTH'])
//    matching the same pattern used correctly in the coverage route fallback.

import { requireAdmin } from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALL_YEARS = Array.from({ length: 2026 - 2001 + 1 }, (_, i) => String(2026 - i))

const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'IGCSE']

/** @param {import('next/server').NextRequest} request */
export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const examType = searchParams.get('examType') ?? 'ALL'

  const db = svc()

  // 1. Get subjects — filter by exam type if not ALL
  const { data: subjectRows, error: subErr } = await db
    .from('subjects')
    .select('id, name, exam_type')
    .eq('is_active', true)
    .order('name')

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  const subjects = (subjectRows ?? []).filter(s =>
    examType === 'ALL' || s.exam_type === examType
  )

  if (!subjects.length) return NextResponse.json({
    subjects: [], years: [], matrix: {}, examTypes: EXAM_TYPES
  })

  const subjectIds = subjects.map(s => s.id)

  // 2. Fetch questions — only the 3 fields needed for counting.
  //    FIX: .limit(50000) prevents Supabase's silent 1000-row cap from
  //    truncating the dataset and producing a wrong/incomplete matrix.
  let qQuery = db
    .from('questions')
    .select('subject_id, year, exam_type')
    .in('subject_id', subjectIds)
    .eq('is_active', true)
    .not('year', 'is', null)
    .limit(50000)   // ← FIX 1: was missing; Supabase defaults to 1000

  // FIX 2: include 'BOTH' questions when filtering by a specific exam type.
  // .eq('exam_type', examType) was excluding 'BOTH' questions that should
  // count toward both WAEC and JAMB totals.
  if (examType !== 'ALL') {
    qQuery = qQuery.in('exam_type', [examType, 'BOTH'])  // ← FIX 2
  }

  const { data: qRows, error: qErr } = await qQuery
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  // 3. Build matrix { subjectId: { year: count } }
  const matrix = {}
  for (const s of subjects) matrix[s.id] = {}

  for (const row of qRows ?? []) {
    const y = String(row.year)
    if (!matrix[row.subject_id]) continue
    matrix[row.subject_id][y] = (matrix[row.subject_id][y] ?? 0) + 1
  }

  // 4. Determine which years to show:
  //    Always show 2010–current, plus any earlier years that have actual data
  const usedYears = new Set()
  for (const counts of Object.values(matrix)) {
    for (const y of Object.keys(counts)) usedYears.add(y)
  }
  const years = ALL_YEARS.filter(y =>
    usedYears.has(y) || parseInt(y) >= 2010
  )

  // 5. Per-subject totals
  const subjectsWithTotals = subjects.map(s => ({
    ...s,
    totalQuestions: Object.values(matrix[s.id] ?? {}).reduce((a, b) => a + b, 0),
    yearsCovered:   Object.values(matrix[s.id] ?? {}).filter(c => c > 0).length,
  }))

  return NextResponse.json({
    subjects: subjectsWithTotals,
    years,
    matrix,
    examTypes: EXAM_TYPES,
  })
}