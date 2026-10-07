// src/app/api/admin/ambassadors/[id]/payouts/route.js
// POST { amount, note? } → record money you have paid to an ambassador (naira).
// Can't be more than the balance owed. Recorded in the payout history and the
// activity log under the admin who did it (admin_record_ambassador_payout,
// 20261014_ambassadors.sql). Paying never moves money by itself: do the bank
// transfer first, then record it here.
// Response: { ok: true }; the panel reloads the ambassador.

import { NextResponse }  from 'next/server'
import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE }       from '@/lib/uuid'

export async function POST(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid ambassador' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const amount = body.amount
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) {
    return NextResponse.json({ error: 'Enter the amount you paid, in whole naira' }, { status: 400 })
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null

  try {
    const { error } = await supabaseAdmin().rpc('admin_record_ambassador_payout', {
      p_actor: actorOf(admin), p_ambassador: id, p_amount: amount, p_note: note,
    })
    if (error) {
      const message = error.message ?? ''
      if (/ambassador not found/.test(message)) return NextResponse.json({ error: 'Ambassador not found' }, { status: 404 })
      if (/more than the balance/.test(message)) return NextResponse.json({ error: 'That is more than the balance owed' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/ambassadors/:id/payouts] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
  }
}
