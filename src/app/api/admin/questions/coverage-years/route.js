// src/app/api/admin/questions/coverage-years/route.js
// GET /api/admin/questions/coverage-years?subjectId=...&examType=...
// Returns a summary of which years have questions in the DB for a subject+exam.
// Used by the "Year Coverage" tab in Past Questions admin page.

import { requireAdmin } from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  // Build full year list with counts
  const years = SDASH_YEARS.map(y => ({
    year: y,
    count: yearMap[y] ?? 0,
    has: !!(yearMap[y]),
  })).reverse() // newest first

  const totalYears    = years.filter(y => y.has).length
  const totalQuestions = Object.values(yearMap).reduce((a, b) => a + b, 0)

  return NextResponse.json({ years, totalYears, totalQuestions })
}