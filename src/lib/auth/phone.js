// src/lib/auth/phone.js
// ─────────────────────────────────────────────────────────────────────────────
// Nigerian phone number rules, shared by the sign-up screen and the server.
//
// Policy (September 2026): no OTP. We only check that the number is complete
// (right length, a mobile number) and that no other account already uses it.
//
// How phone accounts work under the hood
//   Supabase's phone provider needs an SMS gateway even for password sign-in.
//   To avoid that cost and delay, a phone account is stored as an email/password
//   user whose login email is derived from the number:
//       08012345678  →  2348012345678@phone.examprep.ng
//   That address is never shown to the student and no mail is ever sent to it.
//   The real number lives in user_metadata.phone and profiles.phone_number.
//   If we add SMS verification later, these users can be moved onto Supabase's
//   phone provider with auth.admin.updateUserById(id, { phone }).
// ─────────────────────────────────────────────────────────────────────────────

export const PHONE_AUTH_DOMAIN = 'phone.examprep.ng'

/**
 * Accepts any common way a Nigerian mobile number is typed:
 *   08012345678 · 0801 234 5678 · 8012345678 · 2348012345678 · +234 801 234 5678
 * Returns the 10-digit national number ("8012345678") or null if it isn't one.
 *
 * Mobile numbers are 11 digits with the leading 0, and start 070, 080, 081, 090
 * or 091. Checking that prefix catches most typos (a dropped or extra digit)
 * without needing a verification SMS.
 */
export function toNationalNumber(input) {
  if (typeof input !== 'string') return null
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('234')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^[789][01]\d{8}$/.test(digits) ? digits : null
}

/** "+2348012345678", the one format we store. Null if invalid. */
export function normalizePhone(input) {
  const n = toNationalNumber(input)
  return n ? `+234${n}` : null
}

/** "0801 234 5678", for display. Falls back to the raw input. */
export function formatPhoneForDisplay(input) {
  const n = toNationalNumber(input)
  if (!n) return input ?? ''
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
}

/**
 * Human-readable problem with the number, or null if it's fine.
 * Used for inline hints while the student types.
 */
export function phoneProblem(input) {
  const raw = (input ?? '').trim()
  if (!raw) return 'Enter your phone number.'
  if (toNationalNumber(raw)) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('234')) digits = '0' + digits.slice(3)
  else if (!digits.startsWith('0')) digits = '0' + digits
  if (digits.length < 11) return 'That number is too short. It should have 11 digits, like 0801 234 5678.'
  if (digits.length > 11) return 'That number is too long. It should have 11 digits, like 0801 234 5678.'
  return 'That doesn\'t look like a Nigerian mobile number. It should start with 070, 080, 081, 090 or 091.'
}

/** The hidden login email for a phone account. */
export function phoneToAuthEmail(input) {
  const n = toNationalNumber(input)
  return n ? `234${n}@${PHONE_AUTH_DOMAIN}` : null
}

/** True for the hidden login emails above, so we never show them. */
export function isPhoneAuthEmail(email) {
  return typeof email === 'string' && email.endsWith(`@${PHONE_AUTH_DOMAIN}`)
}

/**
 * Every format the same number might already be saved in, for duplicate checks
 * against profiles.phone_number (older rows were saved as typed).
 */
export function phoneVariants(input) {
  const n = toNationalNumber(input)
  if (!n) return []
  return [`+234${n}`, `234${n}`, `0${n}`, n]
}
