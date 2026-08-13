// src/app/api/admin/questions/coverage-matrix/route.js
// GET /api/admin/questions/coverage-matrix?examType=WAEC
//
// Returns subject × year matrix with accurate question counts.
// Filters questions by exam_type to match the selected exam — fixes
// the bug where JAMB questions showed under WAEC subject rows.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALL_YEARS = Array.from({ length: 2026 - 2001 + 1 }, (_, i) => String(2026 - i))

const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'IGCSE']

/** @param {import('next/server').NextRequest} request */
export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const examType = searchParams.get('examType') ?? 'WAEC'

  const db = svc()

  // 1. Get subjects — filter by exam type if not ALL
  const subjectQuery = db
    .from('subjects')
    .select('id, name, exam_type')
    .eq('is_active', true)
    .order('name')

  const { data: subjectRows, error: subErr } = await subjectQuery
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  const subjects = (subjectRows ?? []).filter(s =>
    examType === 'ALL' || s.exam_type === examType
  )

  if (!subjects.length) return NextResponse.json({
    subjects: [], years: [], matrix: {}, examTypes: EXAM_TYPES
  })

  const subjectIds = subjects.map(s => s.id)

  // 2. Fetch questions — critically: also filter by exam_type on the questions table
  //    This prevents JAMB questions bleeding into WAEC subject rows and vice versa
  let qQuery = db
    .from('questions')
    .select('subject_id, year, exam_type')
    .in('subject_id', subjectIds)
    .eq('is_active', true)
    .not('year', 'is', null)

  // Only filter questions by exam_type when not showing ALL
  if (examType !== 'ALL') {
    qQuery = qQuery.eq('exam_type', examType)
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