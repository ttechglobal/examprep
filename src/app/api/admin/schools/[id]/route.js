// src/app/api/admin/schools/[id]/route.js — v2
// GET → one school for the admin Schools panel:
//   { school: { id, name, city, state, created_at, contact_name, contact_email,
//               contact_phone, admins: [{ name, email, phone }] },
//     slots: { total, used, available },
//     students: the roster with Premium (lib/server/schoolSlots schoolRoster),
//     history: the slot ledger, newest first }
// Adding slots: POST /api/admin/schools/[id]/slots. The school's activity:
// GET /api/admin/activity?school=[id].
//
// v2: slots come from the ledger; v1's PATCH (overwrite slots_purchased) is
// replaced by recorded purchases and corrections.

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE }       from '@/lib/uuid'
import { slotBalance, slotHistory, schoolRoster } from '@/lib/server/schoolSlots'

export async function GET(_request, { params }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid school' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const [schoolRes, adminsRes, slots, students, history] = await Promise.all([
      db.from('schools').select('id, name, city, state, created_at, contact_name, contact_email, contact_phone').eq('id', id).maybeSingle(),
      db.from('profiles').select('full_name, email, phone_number').eq('school_id', id).eq('role', 'school_admin'),
      slotBalance(db, id), schoolRoster(db, id), slotHistory(db, id),
    ])
    if (schoolRes.error) throw schoolRes.error
    if (adminsRes.error) throw adminsRes.error
    if (!schoolRes.data) return NextResponse.json({ error: 'School not found' }, { status: 404 })
    const admins = (adminsRes.data ?? []).map(a => ({ name: a.full_name, email: a.email, phone: a.phone_number }))
    return NextResponse.json({ school: { ...schoolRes.data, admins }, slots, students, history },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/schools/:id] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the school' }, { status: 500 })
  }
}
