// src/app/api/admin/schools/[id]/slots/route.js
// POST { slots, amount?, note?, kind?: 'purchase' | 'correction' } → record slots for a
// school, after it has paid (purchase) or to fix a mistake (correction; may be
// negative, never below the slots in use).
//   purchase: amount received in naira; defaults to slots × SCHOOL_SLOT_PRICE
//             (lib/plans.js) when the school paid the list price
// Recorded in the slot history and the activity log under the admin who did it
// (admin_add_school_slots, 20261007_schools_and_admin_log.sql).
// Response: { slots: { total, used, available }, history }

import { NextResponse }  from 'next/server'
import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE } from '@/lib/uuid'
import { slotBalance, slotHistory } from '@/lib/server/schoolSlots'
import { SCHOOL_SLOT_PRICE } from '@/lib/plans'

export async function POST(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid school' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const kind = body.kind === 'correction' ? 'correction' : 'purchase'
  const slots = Number(body.slots)
  if (!Number.isInteger(slots) || slots === 0 || Math.abs(slots) > 10000 || (kind === 'purchase' && slots < 0)) {
    return NextResponse.json({ error: kind === 'purchase' ? 'Enter how many slots they paid for (1–10,000)' : 'Enter a number of slots to add or remove' }, { status: 400 })
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null
  const amount = kind !== 'purchase' ? null
    : Number.isInteger(body.amount) && body.amount >= 0 && body.amount <= 100_000_000 ? body.amount : slots * SCHOOL_SLOT_PRICE
  if (kind === 'correction' && !note) return NextResponse.json({ error: 'Say why you are correcting the slots' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const { error } = await db.rpc('admin_add_school_slots', {
      p_school: id, p_slots: slots, p_amount: amount,
      p_note: note, p_actor: actorOf(admin), p_kind: kind,
    })
    if (error) {
      if (/school not found/.test(error.message ?? '')) return NextResponse.json({ error: 'School not found' }, { status: 404 })
      if (/cannot remove more slots/.test(error.message ?? '')) return NextResponse.json({ error: 'You can only remove slots the school hasn’t used' }, { status: 409 })
      throw error
    }
    const [slotsNow, history] = await Promise.all([slotBalance(db, id), slotHistory(db, id)])
    return NextResponse.json({ slots: slotsNow, history })
  } catch (err) {
    console.error('[admin/schools/:id/slots] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not add the slots' }, { status: 500 })
  }
}
