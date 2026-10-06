// src/app/api/admin/students/[id]/subscriptions/route.js
// POST { plan_id: 'two_months' | 'annual', note? } → activate a paid plan
// after the student has paid. Months and price come from lib/plans.js PLANS.
// If the student already has Premium running, the new plan starts when it
// ends (activate_subscription), so no paid days are lost.
// Recorded in the activity log with the admin who did it.
// Response: { student, subscriptions } (the refreshed panel)

import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { PLANS } from '@/lib/plans'
import { loadStudentPanel } from '@/lib/server/adminStudents'
import { UUID_RE } from '@/lib/uuid'

export async function POST(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid student' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const plan = PLANS.find(p => p.id === body.plan_id)
  if (!plan) return NextResponse.json({ error: 'Choose a plan' }, { status: 400 })
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null

  try {
    const db = supabaseAdmin()
    const { error } = await db.rpc('activate_subscription', {
      p_student: id, p_plan_id: plan.id, p_months: plan.months, p_amount: plan.price, p_note: note, p_actor: actorOf(admin),
    })
    if (error) {
      if (/student not found/.test(error.message ?? '')) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json(await loadStudentPanel(db, id))
  } catch (err) {
    console.error('[admin/students/:id/subscriptions] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not activate the subscription' }, { status: 500 })
  }
}
