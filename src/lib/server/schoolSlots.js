// src/lib/server/schoolSlots.js
// ─────────────────────────────────────────────────────────────────────────────
// School slots, shared by the school dashboard (/api/school/subscriptions) and
// the admin Schools page (/api/admin/schools…). The rules live in SQL
// (20261007_schools_and_admin_log.sql): school_slot_balance, school_add_student,
// school_remove_student, admin_add_school_slots; prices in lib/plans.js.
// ─────────────────────────────────────────────────────────────────────────────

import { phoneVariants, isPhoneAuthEmail, formatPhoneForDisplay } from '@/lib/auth/phone'
import { selectAll } from '@/lib/server/paging'
import { SLOT_REFUND_DAYS } from '@/lib/plans'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** { total, used, available } for one school. */
export async function slotBalance(db, schoolId) {
  const { data, error } = await db.from('school_slot_balance')
    .select('slots_total, slots_used, slots_available').eq('school_id', schoolId).maybeSingle()
  if (error) throw error
  return { total: data?.slots_total ?? 0, used: data?.slots_used ?? 0, available: data?.slots_available ?? 0 }
}

/** The slot history (free slot, purchases, corrections), newest first. */
export async function slotHistory(db, schoolId) {
  const { data, error } = await db.from('school_slot_purchases')
    .select('id, slots, kind, amount, note, created_at, created_by')
    .eq('school_id', schoolId).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return data ?? []
}

/**
 * The student a school typed in: a phone number (any Nigerian format) or an
 * email. → { student } or { error } with a message for the school.
 */
export async function findStudentByContact(db, contact) {
  const raw = typeof contact === 'string' ? contact.trim() : ''
  if (!raw) return { error: 'Enter the student’s phone number or email.' }

  let email = null, phones = null
  if (raw.includes('@')) {
    email = raw.toLowerCase()
    if (!EMAIL_RE.test(email)) return { error: 'That email doesn’t look right.' }
  } else {
    phones = phoneVariants(raw)
    if (!phones.length) return { error: 'That phone number doesn’t look right. Use 11 digits, like 0801 234 5678.' }
  }
  const { data, error } = await db.rpc('find_student_by_contact', { p_email: email, p_phones: phones })
  if (error) throw error
  if (!data?.length) return { error: 'No student has signed up with that phone number or email yet. Ask them to create their ExamPrep account first, then add them.' }
  if (data.length > 1) return { error: 'More than one account uses that contact. Try their other contact (phone or email).' }
  return { student: data[0] }
}

/**
 * Every student of a school with what the dashboards need, in ONE query
 * (school_roster, 20261013_school_roster.sql): profile fields plus when this
 * school's Premium for them ends and was added.
 */
export function schoolRosterRows(db, schoolId) {
  return selectAll(() => db.rpc('school_roster', { p_school: schoolId }).order('id'))
}

/**
 * One roster row's Premium: { premium: 'school' | 'own' | null, until, added_at, refundable }
 *   school: from this school's slot · own: a plan of their own (paid or school
 *   elsewhere) · added_at: when this school used a slot on them
 */
export function premiumOf(row, now = Date.now()) {
  const schoolActive = !!row.school_ends_at && Date.parse(row.school_ends_at) > now
  const ownActive = row.plan === 'premium' && !!row.plan_expires_at && Date.parse(row.plan_expires_at) > now
  return {
    premium:  schoolActive ? 'school' : ownActive ? 'own' : null,
    until:    schoolActive ? row.school_ends_at : ownActive ? row.plan_expires_at : null,
    added_at: row.school_added_at ?? null,
    // Removing them now gives the slot back (same rule as cancel_subscription).
    refundable: schoolActive && Date.parse(row.school_added_at) > now - SLOT_REFUND_DAYS * 86_400_000,
  }
}

/** The contact a school sees: phone, else a real email. */
export const studentContact = p =>
  p.phone_number ? formatPhoneForDisplay(p.phone_number) : (p.email && !isPhoneAuthEmail(p.email) ? p.email : null)

/** Roster rows → the list the Slots tab and the admin panel show, most recently added first. */
export function shapeRoster(rows) {
  const now = Date.now()
  return rows.map(r => ({
    id:       r.id,
    name:     r.full_name?.trim() || null,
    username: r.username ?? null,
    contact:  studentContact(r),
    ...premiumOf(r, now),
    joined:   r.created_at,
  })).sort((a, b) => Date.parse(b.added_at ?? b.joined ?? 0) - Date.parse(a.added_at ?? a.joined ?? 0))
}

/** The school's students with their Premium: everyone on the roster (added with a slot or joined with the invite code). */
export async function schoolRoster(db, schoolId) {
  return shapeRoster(await schoolRosterRows(db, schoolId))
}

/** SQL error codes from school_add_student / school_remove_student → messages. */
export const SLOT_ERRORS = {
  no_slots:      'You have no slots left. Buy more slots to add this student.',
  not_student:   'That account isn’t a student account.',
  already_added: 'This student already has Premium from your school.',
  not_found:     'That student isn’t on your school’s list.',
}
export function slotErrorMessage(error) {
  const code = Object.keys(SLOT_ERRORS).find(key => (error?.message ?? '').includes(key))
  return code ? SLOT_ERRORS[code] : null
}
