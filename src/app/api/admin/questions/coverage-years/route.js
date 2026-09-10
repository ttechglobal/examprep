// src/app/api/admin/questions/coverage-years/route.js
// GET /api/admin/questions/coverage-years?subjectId=...&examType=...
// Returns a summary of which years have questions in the DB for a subject+exam.
// Used by per-subject year breakdowns in the admin Past Questions page.
//
// BUG FIXED:
//   SDASH_YEARS was used on line 49 but never defined anywhere in this file.
//   This caused a ReferenceError at runtime, crashing the route and returning
//   a 500 with no useful data. The caller received null/empty and showed nothing.
//   Fix: define the year range locally, matching ALL_YEARS in coverage-matrix.

import { requireAdmin } from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// FIX: define the year list that was previously referenced as SDASH_YEARS
// (an undefined variable causing a ReferenceError crash on every request).
// Covers 2001–current year descending — matches the range in coverage-matrix.
const YEAR_LIST = Array.from(
  { length: new Date().getFullYear() - 2001 + 1 },
  (_, i) => String(new Date().getFullYear() - i)
)

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()
  let query = db
    .from('questions')
    .select('year, exam_type')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .not('year', 'is', null)
    .limit(50000)  // prevent silent 1000-row Supabase cap

  // Include 'BOTH' questions when filtering by a specific exam type
  if (examType && examType !== 'ALL') {
    query = query.in('exam_type', [examType, 'BOTH'])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count questions per year
  const yearMap = {}
  for (const row of data ?? []) {
    const y = String(row.year)
    yearMap[y] = (yearMap[y] ?? 0) + 1
  }

  // Build full year list with counts — newest first
  const years = YEAR_LIST.map(y => ({
    year: y,
    count: yearMap[y] ?? 0,
    has: !!(yearMap[y]),
  }))

  const totalYears     = years.filter(y => y.has).length
  const totalQuestions = Object.values(yearMap).reduce((a, b) => a + b, 0)

  return NextResponse.json({ years, totalYears, totalQuestions })
}