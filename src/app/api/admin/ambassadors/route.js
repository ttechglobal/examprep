// src/app/api/admin/ambassadors/route.js
// GET /api/admin/ambassadors?year=2026|all — the admin Ambassadors page.
//
// Response: {
//   ambassadors: [{ id, full_name, email, phone, school_name, code, status, rate,
//                   created_at, students, subscribed, earned,       ← for the year
//                   earned_all, paid_out, balance }],               ← always all time
//   totals: { ambassadors, students, subscribed, earned, owed },
//   counts: { all, active, paused, owed, no_code },
//   years, year
// }
// One SQL call (admin_ambassadors, 20261015). Search, filters and sorting are done
// on the page: a few hundred ambassadors at most. No year = this year (Nigerian
// time); year=all = everything.

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { appDay }        from '@/lib/dates'

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const thisYear = Number(appDay().slice(0, 4))
  const raw = new URL(request.url).searchParams.get('year')
  const year = raw === 'all' ? null : (Number.parseInt(raw, 10) || thisYear)

  try {
    const { data, error } = await supabaseAdmin().rpc('admin_ambassadors', { p_year: year })
    if (error) throw error
    const ambassadors = (data ?? []).map(({ commission_rate, ...r }) => ({ ...r, rate: Number(commission_rate) }))
    const sum = key => ambassadors.reduce((total, r) => total + (r[key] ?? 0), 0)
    const first = ambassadors.reduce((min, r) => Math.min(min, Number(String(r.created_at).slice(0, 4)) || thisYear), thisYear)
    return NextResponse.json({
      ambassadors,
      totals: { ambassadors: ambassadors.length, students: sum('students'), subscribed: sum('subscribed'), earned: sum('earned'), owed: sum('balance') },
      counts: {
        all: ambassadors.length,
        active: ambassadors.filter(r => r.status === 'active').length,
        paused: ambassadors.filter(r => r.status === 'paused').length,
        owed: ambassadors.filter(r => r.balance > 0).length,
        no_code: ambassadors.filter(r => !r.code).length,
      },
      years: Array.from({ length: thisYear - first + 1 }, (_, i) => thisYear - i),
      year,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/ambassadors] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load ambassadors' }, { status: 500 })
  }
}
