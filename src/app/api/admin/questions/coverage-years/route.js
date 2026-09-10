// src/app/api/admin/questions/coverage-years/route.js
// GET /api/admin/questions/coverage-years?subjectId=...&examType=...
//
// Returns a year-by-year breakdown for a single subject.
// Used by the per-subject drill-down in the admin coverage page.
//
// BUGS FIXED:
//
// 1. SDASH_YEARS undefined variable
//    Was causing a ReferenceError crash on every request.
//    Fixed: replaced with YEAR_LIST defined locally.
//
// 2. DUAL-COLUMN INCONSISTENCY
//    Only queried exam_type (string). Now tries exam_types (array) first,
//    falls back to exam_type (string) — matching the student questions route
//    so counts here agree with what students actually see.
//
// 3. BROWSER CACHING
//    Added Cache-Control: no-store — admin always sees live data.

import { requireAdmin }                       from '@/lib/adminAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse }                        from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Full year list — 2001 to current year, newest first
const YEAR_LIST = Array.from(
  { length: new Date().getFullYear() - 2001 + 1 },
  (_, i) => String(new Date().getFullYear() - i)
)

const NO_CACHE = { headers: { 'Cache-Control': 'no-store' } }

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const examType  = searchParams.get('examType')

  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId required' }, { status: 400 })
  }

  const db = svc()

  // ── Build query helper — tries array column, falls back to string column ──
  const legacyValues = examType && examType !== 'ALL'
    ? [examType, 'BOTH']
    : null

  const buildQuery = (useArrayCol) => {
    let q = db
      .from('questions')
      .select('year, exam_type')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .not('year', 'is', null)
      .limit(50000)   // prevent silent 1000-row Supabase cap

    if (legacyValues) {
      if (useArrayCol) {
        q = q.contains('exam_types', [examType])
      } else {
        q = q.in('exam_type', legacyValues)
      }
    }
    return q
  }

  // ── Fetch with fallback ───────────────────────────────────────────────────
  let rows = []
  {
    const { data, error } = await buildQuery(true)
    if (!error && data?.length) {
      rows = data
    } else {
      // exam_types array column returned nothing — fall back to legacy string column
      const fb = await buildQuery(false)
      if (fb.error) {
        return NextResponse.json({ error: fb.error.message }, { status: 500 }, NO_CACHE)
      }
      rows = fb.data ?? []
    }
  }

  // ── Count questions per year ──────────────────────────────────────────────
  const yearMap = {}
  for (const row of rows) {
    const y = String(row.year)
    yearMap[y] = (yearMap[y] ?? 0) + 1
  }

  // ── Build full year list with counts ─────────────────────────────────────
  const years = YEAR_LIST.map(y => ({
    year:  y,
    count: yearMap[y] ?? 0,
    has:   !!(yearMap[y]),
  }))

  const totalYears     = years.filter(y => y.has).length
  const totalQuestions = Object.values(yearMap).reduce((a, b) => a + b, 0)

  return NextResponse.json(
    { years, totalYears, totalQuestions },
    NO_CACHE
  )
}