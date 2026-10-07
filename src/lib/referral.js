// src/lib/referral.js
// ─────────────────────────────────────────────────────────────────────────────
// Remembering which ambassador's link a student came from, until they sign up.
//
//   saveReferral(code)   called by /r/CODE and the onboarding page (?ref=)
//   getReferral()        the saved code, or null (nothing saved, or older than 30 days)
//   clearReferral()      called once an account is created
//   cleanCode(value)     'ab-cd 12' → 'ABCD12': what students type is forgiven
//
// The latest link a student opens wins: it is the one they just chose to use.
// localStorage can be blocked (private windows), so the code also travels in the
// URL (?ref=) and every call here is wrapped in try/catch.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'ep_ref'
const TTL_MS = 30 * 24 * 60 * 60 * 1000

export const REFERRAL_CODE_RE = /^[A-Z0-9]{6,12}$/

export function cleanCode(value) {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : ''
}

export function saveReferral(code) {
  const clean = cleanCode(code)
  if (!REFERRAL_CODE_RE.test(clean)) return
  try { localStorage.setItem(KEY, JSON.stringify({ code: clean, at: Date.now() })) } catch {}
}

export function getReferral() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved?.code && Date.now() - saved.at < TTL_MS) return saved.code
    if (saved) localStorage.removeItem(KEY)
  } catch {}
  return null
}

export function clearReferral() {
  try { localStorage.removeItem(KEY) } catch {}
}
