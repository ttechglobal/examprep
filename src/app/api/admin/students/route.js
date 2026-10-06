// src/app/api/admin/students/route.js
// GET /api/admin/students — the admin Students page list.
//
//   year    2026 | 'all'   students who joined that year or had a paid plan in it
//   filter  all | free | trial | paid | two_months | annual | expiring | expired
//   school  exact school name, or omitted for all
//   q       search: name, username, email, phone, school
//   sort    newest | oldest | name | expiry
//   page    0-based, 50 a page
//
// Response: { students, total, counts: { all, free, … }, schools, years }
//   total   rows matching the current filter (for paging)
//   counts  each filter's count for the same year/school/search

import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { appDay }        from '@/lib/dates'
import { FILTERS, SORTS, shapeStudent, searchText } from '@/lib/server/adminStudents'

const PER_PAGE = 50

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const params = new URL(request.url).searchParams
  const thisYear = Number(appDay().slice(0, 4))
  const rawYear = params.get('year')
  const year   = rawYear === 'all' ? null : (Number.parseInt(rawYear, 10) || thisYear)
  const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all'
  const sort   = SORTS.includes(params.get('sort')) ? params.get('sort') : 'newest'
  const school = params.get('school')?.trim() || null
  const search = searchText(params.get('q'))
  const page   = Math.max(0, Number.parseInt(params.get('page'), 10) || 0)

  try {
    const db = supabaseAdmin()
    const [listRes, countsRes, schoolsRes, firstRes] = await Promise.all([
      db.rpc('admin_students', {
        p_year: year, p_filter: filter, p_school: school, p_search: search,
        p_sort: sort, p_limit: PER_PAGE, p_offset: page * PER_PAGE,
      }),
      db.rpc('admin_student_counts', { p_year: year, p_school: school, p_search: search }),
      db.rpc('admin_student_schools'),
      db.rpc('admin_first_student_year'),
    ])
    const failed = [listRes, countsRes, schoolsRes, firstRes].find(r => r.error)
    if (failed) throw failed.error

    const counts = countsRes.data ?? {}
    const first  = Math.min(firstRes.data ?? thisYear, thisYear)
    const years  = Array.from({ length: thisYear + 1 - first + 1 }, (_, i) => thisYear + 1 - i)

    return NextResponse.json({
      students: (listRes.data ?? []).map(shapeStudent),
      total:    counts[filter] ?? 0,
      perPage:  PER_PAGE,
      counts,
      schools:  (schoolsRes.data ?? []).map(r => r.school),
      years,
      year:     year ?? 'all',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/students] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load students' }, { status: 500 })
  }
}
