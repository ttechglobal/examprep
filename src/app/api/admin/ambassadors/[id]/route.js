// src/app/api/admin/ambassadors/[id]/route.js
// GET   → one ambassador for the admin panel:
//   { ambassador: { id, full_name, email, phone, school_name, code, status, rate, created_at },
//     stats: { students, paying_students, earned, paid_out, balance },      ← all time
//     payouts: [{ id, amount, note, created_by, created_at }],              ← newest first
//     students: [{ id, full_name, phone_number, email, created_at, state, commission }] }
// PATCH { status?: 'active' | 'paused', ratePercent?: 0–50 } → pause or resume, or
//   change the commission rate. A new rate applies to payments from now on;
//   commissions already earned keep the rate they were earned at.
//   Recorded in the activity log under the admin who did it (admin_update_ambassador).
// Payouts: POST /api/admin/ambassadors/[id]/payouts.

import { NextResponse }  from 'next/server'
import { requireAdmin, adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE }       from '@/lib/uuid'

export async function GET(_request, { params }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid ambassador' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const [ambRes, profileRes, statsRes, payoutsRes, studentsRes] = await Promise.all([
      db.from('ambassadors').select('id, full_name, phone, school_name, code, status, commission_rate, created_at').eq('id', id).maybeSingle(),
      db.from('profiles').select('email').eq('id', id).maybeSingle(),
      db.from('ambassador_stats').select('students, paying_students, earned, paid_out, balance').eq('ambassador_id', id).maybeSingle(),
      db.from('ambassador_payouts').select('id, amount, note, created_by, created_at').eq('ambassador_id', id).order('created_at', { ascending: false }),
      db.rpc('admin_ambassador_students', { p_id: id }),
    ])
    for (const res of [ambRes, profileRes, statsRes, payoutsRes, studentsRes]) if (res.error) throw res.error
    if (!ambRes.data) return NextResponse.json({ error: 'Ambassador not found' }, { status: 404 })

    const { commission_rate, phone, ...rest } = ambRes.data
    return NextResponse.json({
      ambassador: { ...rest, phone, email: profileRes.data?.email ?? null, rate: Number(commission_rate) },
      stats: statsRes.data ?? { students: 0, paying_students: 0, earned: 0, paid_out: 0, balance: 0 },
      payouts: payoutsRes.data ?? [],
      students: studentsRes.data ?? [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/ambassadors/:id] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the ambassador' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid ambassador' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const status = body.status === undefined ? null : body.status
  if (status !== null && status !== 'active' && status !== 'paused') {
    return NextResponse.json({ error: 'Status must be active or paused' }, { status: 400 })
  }
  let rate = null
  if (body.ratePercent !== undefined) {
    const percent = Number(body.ratePercent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      return NextResponse.json({ error: 'The rate must be between 0% and 50%' }, { status: 400 })
    }
    rate = Math.round(percent * 100) / 10000   // 12.5 → 0.125, kept to 2 decimal places of a percent
  }
  if (status === null && rate === null) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  try {
    const { error } = await supabaseAdmin().rpc('admin_update_ambassador', { p_actor: actorOf(admin), p_id: id, p_status: status, p_rate: rate })
    if (error) {
      if (/ambassador not found/.test(error.message ?? '')) return NextResponse.json({ error: 'Ambassador not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/ambassadors/:id] PATCH:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not save the change' }, { status: 500 })
  }
}
