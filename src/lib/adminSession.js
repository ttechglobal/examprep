// src/lib/adminSession.js
// ─────────────────────────────────────────────────────────────────────────────
// Signed admin session tokens.
//
// The admin login (/api/admin/auth) issues a cookie whose value is
//   v2.<base64url JSON { i: id, n: name, o: isOwner, e: expiresAtMs }>.<base64url HMAC-SHA256 of the first two parts>
// so every request knows which admin made it (the activity log records it).
// Only the server knows the signing secret, so the cookie can't be forged,
// renamed or extended by hand. Uses Web Crypto so the same code runs in middleware (Edge)
// and in Node route handlers / server components.
//
// Secret: ADMIN_SESSION_SECRET (at least 32 random characters). Changing it
// logs every admin out.
//
// v2: no longer falls back to SUPABASE_SERVICE_ROLE_KEY. A database key must
//     not double as the admin-login secret: when the service key leaked, anyone
//     holding it could have signed their own admin cookie. Without
//     ADMIN_SESSION_SECRET, admin login is refused (logged), never weakened.
// v3: the token names the admin (owner or a team member, see lib/adminAuth.js).
//     v1 tokens are no longer accepted, so admins sign in again once.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMIN_COOKIE      = 'admin_session'
export const ADMIN_SESSION_TTL = 60 * 60 * 8 // seconds (8 hours)

const VERSION = 'v2'
const enc = new TextEncoder()
const dec = new TextDecoder()

const MIN_SECRET_LENGTH = 32

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new Error(`ADMIN_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} random characters`)
  }
  return s
}

function toBase64Url(buf) {
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
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

/**
 * A signed token for this admin, valid for ADMIN_SESSION_TTL seconds.
 *   admin: { id, name, owner }  (id 'owner' for the owner login)
 */
export async function createAdminToken(admin, now = Date.now()) {
  const body = toBase64Url(enc.encode(JSON.stringify({
    i: String(admin.id), n: String(admin.name), o: !!admin.owner, e: now + ADMIN_SESSION_TTL * 1000,
  })))
  const payload = `${VERSION}.${body}`
  return `${payload}.${await sign(payload)}`
}

/**
 * The admin an unexpired token signed with our secret belongs to,
 * { id, name, owner }, or null. Never throws.
 */
export async function verifyAdminToken(token, now = Date.now()) {
  try {
    if (typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 3 || parts[0] !== VERSION) return null
    if (!safeEqual(parts[2], await sign(`${parts[0]}.${parts[1]}`))) return null
    const data = JSON.parse(dec.decode(fromBase64Url(parts[1])))
    if (!Number.isFinite(data.e) || data.e <= now || !data.i || !data.n) return null
    return { id: data.i, name: data.n, owner: !!data.o }
  } catch {
    return null
  }
}
