// src/app/api/admin/schools/route.js — v2
// GET /api/admin/schools?year=2026|all — the admin Schools page.
//
// Response: {
//   schools: [{ id, name, city, state, created_at, contact_name, contact_email,
//               contact_phone, slots_total, slots_used, slots_available,
//               bought_in_year, used_in_year, students, premium_students, status }],
//   totals:  { schools, slots_total, slots_used, slots_available },
//   counts:  { all, active, no_usage, fully_used },
//   years, year
// }
//   Slots never expire, so slots_* are all-time; *_in_year are for the year.
//   status: active (slots in use, some left) · fully_used (none left) ·
//           no_usage (no slot used yet)
// Search, filters and sorting are done on the page: a few hundred schools at
// most (admin_schools returns one row per school, counted in SQL).
//
// v2: built on the slot ledger (20261007_schools_and_admin_log.sql). v1 read a
// schools.is_active column that doesn't exist, so the list came back empty,
// and its POST (create a school by hand) is gone: schools sign up themselves
// at /school-signup.

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { appDay }        from '@/lib/dates'
import { memo }          from '@/lib/server/memo'

// One scan of every school's slots and students. Kept for a minute, so reloading
// or reopening the page doesn't count again; adding slots clears it
// (admin/schools/[id]/slots).
const CACHE_MS = 60_000

function schoolStatus(row) {
  if (row.slots_used === 0) return 'no_usage'
  if (row.slots_available <= 0) return 'fully_used'
  return 'active'
}

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const thisYear = Number(appDay().slice(0, 4))
  const raw = new URL(request.url).searchParams.get('year')
  const year = raw === 'all' ? null : (Number.parseInt(raw, 10) || thisYear)

  try {
    const db = supabaseAdmin()
    const { data, error } = await memo(`admin-schools:${year ?? 'all'}`, CACHE_MS, () => db.rpc('admin_schools', { p_year: year }))
    if (error) throw error
    const schools = (data ?? []).map(r => ({ ...r, status: schoolStatus(r) }))
    const sum = key => schools.reduce((total, r) => total + (r[key] ?? 0), 0)
    const first = schools.reduce((min, r) => Math.min(min, Number(String(r.created_at).slice(0, 4)) || thisYear), thisYear)
    return NextResponse.json({
      schools,
      totals: { schools: schools.length, slots_total: sum('slots_total'), slots_used: sum('slots_used'), slots_available: sum('slots_available') },
      counts: {
        all: schools.length,
        active: schools.filter(r => r.status === 'active').length,
        no_usage: schools.filter(r => r.status === 'no_usage').length,
        fully_used: schools.filter(r => r.status === 'fully_used').length,
      },
      years: Array.from({ length: thisYear + 1 - first + 1 }, (_, i) => thisYear + 1 - i),
      year: year ?? 'all',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/schools] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load schools' }, { status: 500 })
  }
}
