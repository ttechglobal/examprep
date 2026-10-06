// src/lib/server/schoolSlots.js
// ─────────────────────────────────────────────────────────────────────────────
// School slots, shared by the school dashboard (/api/school/subscriptions) and
// the admin Schools page (/api/admin/schools…). The rules live in SQL
// (20261007_schools_and_admin_log.sql): school_slot_balance, school_add_student,
// school_remove_student, admin_add_school_slots; prices in lib/plans.js.
// ─────────────────────────────────────────────────────────────────────────────

import { phoneVariants, isPhoneAuthEmail, formatPhoneForDisplay } from '@/lib/auth/phone'
import { selectAll, schoolStudentIds } from '@/lib/server/paging'
import { selectByIds } from '@/lib/server/schoolStats'
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

const ROSTER_COLUMNS = 'id, full_name, username, email, phone_number, plan, plan_expires_at, created_at'

/**
 * Each student's Premium, for profiles that include plan + plan_expires_at:
 * Map id → { premium: 'school' | 'own' | null, until, added_at, refundable }
 *   school: from this school's slot · own: a plan of their own (paid or school
 *   elsewhere) · added_at: when this school used a slot on them
 */
export async function premiumByStudent(db, schoolId, profiles) {
  const subs = await selectAll(() => db.from('subscriptions')
    .select('id, student_id, ends_at, created_at')
    .eq('school_id', schoolId).eq('status', 'active').order('id'))
  const latest = new Map()
  for (const sub of subs) {
    const current = latest.get(sub.student_id)
    if (!current || Date.parse(sub.ends_at) > Date.parse(current.ends_at)) latest.set(sub.student_id, sub)
  }
  const now = Date.now()
  return new Map(profiles.map(p => {
    const viaSchool = latest.get(p.id)
    const schoolActive = viaSchool && Date.parse(viaSchool.ends_at) > now
    const ownActive = p.plan === 'premium' && p.plan_expires_at && Date.parse(p.plan_expires_at) > now
    return [p.id, {
      premium:  schoolActive ? 'school' : ownActive ? 'own' : null,
      until:    schoolActive ? viaSchool.ends_at : ownActive ? p.plan_expires_at : null,
      added_at: viaSchool?.created_at ?? null,
      // Removing them now gives the slot back (same rule as cancel_subscription).
      refundable: !!schoolActive && Date.parse(viaSchool.created_at) > now - SLOT_REFUND_DAYS * 86_400_000,
    }]
  }))
}

/** The contact a school sees: phone, else a real email. */
export const studentContact = p =>
  p.phone_number ? formatPhoneForDisplay(p.phone_number) : (p.email && !isPhoneAuthEmail(p.email) ? p.email : null)

/**
 * The school's students with their Premium: everyone on the roster (added with
 * a slot or joined with the invite code), most recently added first.
 */
export async function schoolRoster(db, schoolId) {
  const { studentIds } = await schoolStudentIds(db, schoolId)
  if (!studentIds.length) return []
  const profiles = await selectByIds(db, 'profiles', ROSTER_COLUMNS, studentIds)
  const plans = await premiumByStudent(db, schoolId, profiles)
  return profiles.map(p => ({
    id:       p.id,
    name:     p.full_name?.trim() || null,
    username: p.username ?? null,
    contact:  studentContact(p),
    ...plans.get(p.id),
    joined:   p.created_at,
  })).sort((a, b) => Date.parse(b.added_at ?? b.joined ?? 0) - Date.parse(a.added_at ?? a.joined ?? 0))
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
