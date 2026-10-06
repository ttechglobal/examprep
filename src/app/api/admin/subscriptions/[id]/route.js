// src/app/api/admin/subscriptions/[id]/route.js
// PATCH { action: 'cancel', reason? } → cancel one subscription (activated by
// mistake, refunded). It stays in the history as cancelled; any plan queued
// after it moves up, and the student's plan is worked out again.
// Recorded in the activity log with the admin who did it.
// Response: { student, subscriptions } (the refreshed panel)

import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { loadStudentPanel } from '@/lib/server/adminStudents'
import { UUID_RE } from '@/lib/uuid'

export async function PATCH(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  if (body.action !== 'cancel') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : null

  try {
    const db = supabaseAdmin()
    const { data, error } = await db.rpc('cancel_subscription', { p_id: id, p_reason: reason, p_actor: actorOf(admin) })
    if (error) {
      if (/subscription not found/.test(error.message ?? '')) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json(await loadStudentPanel(db, data.student_id))
  } catch (err) {
    console.error('[admin/subscriptions/:id] PATCH:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not cancel the subscription' }, { status: 500 })
  }
}
