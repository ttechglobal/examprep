// src/app/api/school/subscriptions/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// A school's slots and the students it gives Premium. School admin only, for
// their own school.
//
// GET    → { slots: { total, used, available }, students, history, school, admin, price }
//            students: the school's roster with their Premium (lib/server/schoolSlots)
//            history:  free slot, purchases and corrections, newest first
//            admin:    { name, email, phone } of the signed-in school admin, sent
//                      with a slot request so we can find the school
// POST   { contacts: [phone or email, …] } (or one { contact }) → use a slot on each
//            student, found by phone or email: 12 months of Premium, and they join
//            the school's student list. Up to 50 at a time. Answers
//            { results: [{ contact, ok, message }], added, failed, slots, students }
//            One person failing (not found, already added, …) never stops the rest;
//            once the slots run out the remaining ones are reported as not added.
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
// v3: several students at once; the roster comes from one query (school_roster,
// 20261013); the admin's own contact details come with the page; an add or
// remove clears the dashboard's cached data (lib/server/memo.js).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { requireSchoolAdmin } from '@/lib/server/schoolStats'
import { slotBalance, slotHistory, schoolRoster, findStudentByContact, slotErrorMessage } from '@/lib/server/schoolSlots'
import { forget, schoolDashboardKey } from '@/lib/server/memo'
import { SCHOOL_SLOT_PRICE } from '@/lib/plans'
import { isPhoneAuthEmail, formatPhoneForDisplay } from '@/lib/auth/phone'
import { UUID_RE } from '@/lib/uuid'

const MAX_BULK = 50

// The signed-in school admin: { db, schoolId, school, admin, actor } or { error }.
async function schoolContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const db = supabaseAdmin()
  const { profile, error } = await requireSchoolAdmin(db, user.id,
    'school_id, role, full_name, phone_number, schools(id, name, contact_email, contact_phone)')
  if (error) return { error }
  const name = profile.full_name?.trim() || null
  const email = user.email && !isPhoneAuthEmail(user.email) ? user.email : null
  return {
    db, schoolId: profile.school_id, school: profile.schools,
    admin: { name, email, phone: profile.phone_number ? formatPhoneForDisplay(profile.phone_number) : null },
    actor: { type: 'school', id: user.id, name: name || user.email || 'School admin' },
  }
}

export async function GET() {
  const ctx = await schoolContext()
  if (ctx.error) return ctx.error
  try {
    const [slots, students, history] = await Promise.all([
      slotBalance(ctx.db, ctx.schoolId), schoolRoster(ctx.db, ctx.schoolId), slotHistory(ctx.db, ctx.schoolId),
    ])
    return NextResponse.json({ slots, students, history, school: ctx.school, admin: ctx.admin, price: SCHOOL_SLOT_PRICE },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[school/subscriptions] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load your slots' }, { status: 500 })
  }
}

// One contact → { ok, message, noSlots? }. Never throws for a problem with the
// contact itself, only for a database failure.
async function addOne(ctx, contact) {
  const found = await findStudentByContact(ctx.db, contact)
  if (found.error) return { ok: false, message: found.error }
  if (found.student.school_id && found.student.school_id !== ctx.schoolId) {
    return { ok: false, message: 'This student is linked to another school.' }
  }
  const { error } = await ctx.db.rpc('school_add_student', { p_school: ctx.schoolId, p_student: found.student.id, p_actor: ctx.actor })
  if (error) {
    const message = slotErrorMessage(error)
    if (message) return { ok: false, message, noSlots: /no_slots/.test(error.message ?? '') }
    throw error
  }
  const name = found.student.full_name?.trim() || found.student.username || 'The student'
  return { ok: true, message: `${name} now has Premium for 12 months.`, name }
}

export async function POST(request) {
  const ctx = await schoolContext()
  if (ctx.error) return ctx.error
  let body = {}
  try { body = await request.json() } catch {}

  const raw = Array.isArray(body.contacts) ? body.contacts : body.contact != null ? [body.contact] : []
  const seen = new Set()
  const contacts = []
  for (const item of raw) {
    const contact = typeof item === 'string' ? item.trim().slice(0, 120) : ''
    const key = contact.toLowerCase().replace(/[\s()-]/g, '')
    if (contact && !seen.has(key)) { seen.add(key); contacts.push(contact) }
  }
  if (!contacts.length) return NextResponse.json({ error: 'Enter a phone number or email.' }, { status: 400 })
  if (contacts.length > MAX_BULK) return NextResponse.json({ error: `Add up to ${MAX_BULK} students at a time. You entered ${contacts.length}.` }, { status: 400 })

  try {
    // One at a time, in order: each add takes a slot, and the database serialises
    // them per school so the count is always right.
    const results = []
    let outOfSlots = false
    for (const contact of contacts) {
      if (outOfSlots) { results.push({ contact, ok: false, message: 'No slots left.' }); continue }
      try {
        const result = await addOne(ctx, contact)
        if (result.noSlots) outOfSlots = true
        results.push({ contact, ok: result.ok, message: result.message })
      } catch (err) {
        console.error('[school/subscriptions] POST add:', err?.message ?? err)
        results.push({ contact, ok: false, message: 'Could not add this student. Try again.' })
      }
    }

    const added = results.filter(r => r.ok).length
    if (added) forget(schoolDashboardKey(ctx.schoolId))
    const [slots, students] = await Promise.all([slotBalance(ctx.db, ctx.schoolId), added ? schoolRoster(ctx.db, ctx.schoolId) : null])
    return NextResponse.json({ ok: added > 0, results, added, failed: results.length - added, slots, students })
  } catch (err) {
    console.error('[school/subscriptions] POST:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not add the students. Please try again.' }, { status: 500 })
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
    forget(schoolDashboardKey(ctx.schoolId))
    const [slots, students] = await Promise.all([slotBalance(ctx.db, ctx.schoolId), schoolRoster(ctx.db, ctx.schoolId)])
    return NextResponse.json({ ok: true, slotReturned: !!data?.slot_refunded, slots, students })
  } catch (err) {
    console.error('[school/subscriptions] DELETE:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not remove the student. Please try again.' }, { status: 500 })
  }
}
