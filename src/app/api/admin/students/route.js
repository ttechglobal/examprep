// src/app/api/admin/students/route.js
// GET /api/admin/students — the admin Students page list.
//
//   year    2026 | 'all'   students who joined that year or had a paid plan in it
//   filter  all | free | trial | paid | two_months | annual | expiring | expired
//   school  exact school name, or omitted for all
//   q       search: name, username, email, phone, school
//   sort    newest | oldest | name | expiry
//   page    0-based, 50 a page
//   counts  0 skips the counts (default 1). They depend only on year, school and
//           search, so the page asks for them only when one of those changes, not
//           for every page turn or filter click.
//
// Response: { students, total, counts: { all, free, … }, schools, years }
//   total   rows matching the current filter (for paging); null when counts=0
//   counts  each filter's count for the same year/school/search; null when counts=0
//   schools, years   the filter options. They change rarely, so a server keeps
//           them for 5 minutes instead of scanning every student on every request.

import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { appDay }        from '@/lib/dates'
import { FILTERS, SORTS, shapeStudent, searchText } from '@/lib/server/adminStudents'

const PER_PAGE = 50
const META_TTL = 5 * 60 * 1000
let metaCache = null   // { at, schools, first }

async function filterOptions(db) {
  if (metaCache && Date.now() - metaCache.at < META_TTL) return metaCache
  const [schoolsRes, firstRes] = await Promise.all([db.rpc('admin_student_schools'), db.rpc('admin_first_student_year')])
  const failed = [schoolsRes, firstRes].find(r => r.error)
  if (failed) throw failed.error
  metaCache = { at: Date.now(), schools: (schoolsRes.data ?? []).map(r => r.school), first: firstRes.data }
  return metaCache
}

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
  const withCounts = params.get('counts') !== '0'

  try {
    const db = supabaseAdmin()
    const [listRes, countsRes, options] = await Promise.all([
      db.rpc('admin_students', {
        p_year: year, p_filter: filter, p_school: school, p_search: search,
        p_sort: sort, p_limit: PER_PAGE, p_offset: page * PER_PAGE,
      }),
      withCounts ? db.rpc('admin_student_counts', { p_year: year, p_school: school, p_search: search }) : null,
      filterOptions(db),
    ])
    const failed = [listRes, countsRes].find(r => r?.error)
    if (failed) throw failed.error

    const counts = countsRes ? (countsRes.data ?? {}) : null
    const first  = Math.min(options.first ?? thisYear, thisYear)
    const years  = Array.from({ length: thisYear + 1 - first + 1 }, (_, i) => thisYear + 1 - i)

    return NextResponse.json({
      students: (listRes.data ?? []).map(shapeStudent),
      total:    counts ? (counts[filter] ?? 0) : null,
      perPage:  PER_PAGE,
      counts,
      schools:  options.schools,
      years,
      year:     year ?? 'all',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/students] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load students' }, { status: 500 })
  }
}
