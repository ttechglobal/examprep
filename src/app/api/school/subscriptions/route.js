// src/app/api/school/subscriptions/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// A school's slots and the students it gives Premium. School admin only, for
// their own school.
//
// GET    → { slots: { total, used, available }, students, history, school, price }
//            students: the school's roster with their Premium (lib/server/schoolSlots)
//            history:  free slot, purchases and corrections, newest first
// POST   { contact } → use a slot on a student, found by phone or email:
//            12 months of Premium, and they join the school's student list
// DELETE { student_id } → remove a student from the school. Their school
//            Premium ends; the slot comes back if they were added in the last
//            7 days.
// Buying slots happens on WhatsApp; an admin adds them (admin Schools page).
// Every add and remove is recorded in the activity log under the school admin.
//
// v2: slots are a ledger and each used slot is a 12-month subscription
// (20261007_schools_and_admin_log.sql), checked and counted in one database
// transaction. v1 found students by email only, through the first 1,000
// sign-in accounts, and read-then-wrote the slots_used counter.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { requireSchoolAdmin } from '@/lib/server/schoolStats'
import { slotBalance, slotHistory, schoolRoster, findStudentByContact, slotErrorMessage } from '@/lib/server/schoolSlots'
import { SCHOOL_SLOT_PRICE } from '@/lib/plans'
import { UUID_RE } from '@/lib/uuid'

// The signed-in school admin: { db, schoolId, school, actor } or { error }.
async function schoolContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const db = supabaseAdmin()
  const { profile, error } = await requireSchoolAdmin(db, user.id,
    'school_id, role, full_name, schools(id, name, contact_email, contact_phone)')
  if (error) return { error }
  return {
    db, schoolId: profile.school_id, school: profile.schools,
    actor: { type: 'school', id: user.id, name: profile.full_name?.trim() || user.email || 'School admin' },
  }
}

export async function GET() {
  const ctx = await schoolContext()
  if (ctx.error) return ctx.error
  try {
    const [slots, students, history] = await Promise.all([
      slotBalance(ctx.db, ctx.schoolId), schoolRoster(ctx.db, ctx.schoolId), slotHistory(ctx.db, ctx.schoolId),
    ])
    return NextResponse.json({ slots, students, history, school: ctx.school, price: SCHOOL_SLOT_PRICE },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[school/subscriptions] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load your slots' }, { status: 500 })
  }
}

export async function POST(request) {
  const ctx = await schoolContext()
  if (ctx.error) return ctx.error
  let body = {}
  try { body = await request.json() } catch {}

  try {
    const found = await findStudentByContact(ctx.db, body.contact)
    if (found.error) return NextResponse.json({ error: found.error }, { status: 400 })
    if (found.student.school_id && found.student.school_id !== ctx.schoolId) {
      return NextResponse.json({ error: 'This student is linked to another school.' }, { status: 409 })
    }
    const { error } = await ctx.db.rpc('school_add_student', { p_school: ctx.schoolId, p_student: found.student.id, p_actor: ctx.actor })
    if (error) {
      const message = slotErrorMessage(error)
      if (message) return NextResponse.json({ error: message }, { status: 409 })
      throw error
    }
    const [slots, students] = await Promise.all([slotBalance(ctx.db, ctx.schoolId), schoolRoster(ctx.db, ctx.schoolId)])
    const name = found.student.full_name?.trim() || found.student.username || 'The student'
    return NextResponse.json({ ok: true, message: `${name} now has Premium for 12 months.`, slots, students })
  } catch (err) {
    console.error('[school/subscriptions] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not add the student. Please try again.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const ctx = await schoolContext()
  if (ctx.error) return ctx.error
  let body = {}
  try { body = await request.json() } catch {}
  if (!UUID_RE.test(body.student_id ?? '')) return NextResponse.json({ error: 'Choose a student' }, { status: 400 })

  try {
    const { data, error } = await ctx.db.rpc('school_remove_student', { p_school: ctx.schoolId, p_student: body.student_id, p_actor: ctx.actor })
    if (error) {
      const message = slotErrorMessage(error)
      if (message) return NextResponse.json({ error: message }, { status: 404 })
      throw error
    }
    const [slots, students] = await Promise.all([slotBalance(ctx.db, ctx.schoolId), schoolRoster(ctx.db, ctx.schoolId)])
    return NextResponse.json({ ok: true, slotReturned: !!data?.slot_refunded, slots, students })
  } catch (err) {
    console.error('[school/subscriptions] DELETE:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not remove the student. Please try again.' }, { status: 500 })
  }
}
