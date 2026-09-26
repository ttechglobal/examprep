// src/lib/adminSession.js
// ─────────────────────────────────────────────────────────────────────────────
// Signed admin session tokens.
//
// The admin password login (/api/admin/auth) issues a cookie whose value is
//   v1.<expiresAtMs>.<base64url HMAC-SHA256("v1.<expiresAtMs>")>
// Only the server knows the signing secret, so the cookie can't be forged or
// extended by hand. Uses Web Crypto so the same code runs in middleware (Edge)
// and in Node route handlers / server components.
//
// Secret: ADMIN_SESSION_SECRET if set, otherwise SUPABASE_SERVICE_ROLE_KEY
// (already a server-only secret). Rotating either one logs every admin out.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_COOKIE      = 'admin_session'
export const ADMIN_SESSION_TTL = 60 * 60 * 8 // seconds (8 hours)

const VERSION = 'v1'
const enc = new TextEncoder()

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('ADMIN_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) must be set')
  return s
}

function toBase64Url(buf) {
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(payload) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  return toBase64Url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
}

// Constant-time string comparison (avoids leaking how many characters matched).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Create a signed token valid for ADMIN_SESSION_TTL seconds. */
export async function createAdminToken(now = Date.now()) {
  const payload = `${VERSION}.${now + ADMIN_SESSION_TTL * 1000}`
  return `${payload}.${await sign(payload)}`
}

/** True only for an unexpired token signed with our secret. Never throws. */
export async function verifyAdminToken(token, now = Date.now()) {
  try {
    if (typeof token !== 'string') return false
    const parts = token.split('.')
    if (parts.length !== 3 || parts[0] !== VERSION) return false
    const expires = Number(parts[1])
    if (!Number.isFinite(expires) || expires <= now) return false
    return safeEqual(parts[2], await sign(`${parts[0]}.${parts[1]}`))
  } catch {
    return false
  }
}
