// src/lib/server/adminStudents.js
// Shared by the admin Students APIs: input checks and the one shape a student
// row takes on the way to the page (app/admin/users).
// The data comes from 20261006_subscriptions.sql (admin_student_rows view,
// admin_students / admin_student_counts, the subscriptions ledger).

import { isPhoneAuthEmail, toNationalNumber } from '@/lib/auth/phone'

export const FILTERS = ['all', 'free', 'trial', 'paid', 'two_months', 'annual', 'expiring', 'expired']
export const SORTS   = ['newest', 'oldest', 'name', 'expiry']

/** A row of admin_student_rows → what the Students page shows. */
export function shapeStudent(r) {
  return {
    id:            r.id,
    name:          r.full_name?.trim() || null,
    username:      r.username ?? null,
    // Phone sign-ups have a hidden login email; it means nothing to an admin.
    email:         r.email && !isPhoneAuthEmail(r.email) ? r.email : null,
    phone:         r.phone_number ?? null,
    school:        r.school ?? null,
    joined:        r.created_at ?? null,
    // trial | free | two_months | annual | legacy | school | expired
    state:         r.state,
    expires_at:    r.plan_expires_at ?? null,
    last_paid_end: r.last_paid_end ?? null,
    trial_ends_at: r.trial_ends_at ?? null,
  }
}

const STUDENT_ROW_COLUMNS = 'id, full_name, username, email, phone_number, created_at, school, state, plan_expires_at, last_paid_end, trial_ends_at'
const SUBSCRIPTION_COLUMNS = 'id, plan_id, amount, starts_at, ends_at, status, note, source, created_at, created_by, cancelled_at, cancel_reason, school_id, schools(name)'

/** The student panel: { student, subscriptions (newest first) }, or null. */
export async function loadStudentPanel(db, id) {
  const [rowRes, subsRes] = await Promise.all([
    db.from('admin_student_rows').select(STUDENT_ROW_COLUMNS).eq('id', id).maybeSingle(),
    db.from('subscriptions').select(SUBSCRIPTION_COLUMNS).eq('student_id', id)
      .order('starts_at', { ascending: false }).order('created_at', { ascending: false }),
  ])
  if (rowRes.error) throw rowRes.error
  if (subsRes.error) throw subsRes.error
  return rowRes.data ? { student: shapeStudent(rowRes.data), subscriptions: subsRes.data ?? [] } : null
}

/**
 * The text to search for. Phone numbers are saved as +234…, so a typed
 * "0803 445" searches for its national digits ("803445"), which every saved
 * format contains.
 */
export function searchText(q) {
  const text = (q ?? '').trim().slice(0, 100)
  if (!text) return null
  if (/^[+\d\s()-]{4,}$/.test(text)) {
    const digits = text.replace(/\D/g, '')
    return toNationalNumber(text) ?? digits.replace(/^(234|0)/, '')
  }
  return text
}
