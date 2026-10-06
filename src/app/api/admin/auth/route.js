// src/app/api/admin/auth/route.js
// POST   { email?, password } → signs an admin in and sets the session cookie.
//          No email: the owner, with ADMIN_PASSWORD.
//          Email: a team member (admin_users), with their own password.
// DELETE → signs out (clears the cookie).
// GET    → { admin: { id, name, owner } } for the signed-in admin, or 401.
//
// v2: a clear 500 when ADMIN_SESSION_SECRET is missing (the service key is no
//     longer used as a fallback signing secret).
// v3: team member logins; the session names the admin (lib/adminAuth.js).
//
// The cookie is httpOnly + sameSite=strict so it can't be read by JS
// and won't be sent on cross-site requests.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual, createHash } from 'crypto'
import { ADMIN_COOKIE, ADMIN_SESSION_TTL, createAdminToken } from '@/lib/adminSession'
import { getAdmin, OWNER_ID, ownerName } from '@/lib/adminAuth'
import { verifyPassword } from '@/lib/server/adminPasswords'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

// Compare hashes so the comparison is constant-time regardless of input length.
function ownerPasswordMatches(given) {
  const a = createHash('sha256').update(String(given ?? '')).digest()
  const b = createHash('sha256').update(String(process.env.ADMIN_PASSWORD)).digest()
  return timingSafeEqual(a, b)
}

const slowNo = async message => {
  await new Promise(r => setTimeout(r, 500))   // slows password guessing
  return NextResponse.json({ error: message }, { status: 401 })
}

async function teamMember(email, password) {
  const db = supabaseAdmin()
  const { data, error } = await db.from('admin_users')
    .select('id, name, active, password_hash').eq('email', email).maybeSingle()
  if (error) throw error
  if (!data?.active || !(await verifyPassword(password, data.password_hash))) return null
  await db.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id)
  return { id: data.id, name: data.name, owner: false }
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!password) return NextResponse.json({ error: 'Enter your password' }, { status: 400 })

  let admin
  try {
    if (email) {
      admin = await teamMember(email, password)
      if (!admin) return slowNo('Incorrect email or password')
    } else {
      if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'ADMIN_PASSWORD env variable not set' }, { status: 500 })
      if (!ownerPasswordMatches(password)) return slowNo('Incorrect password')
      admin = { id: OWNER_ID, name: ownerName(), owner: true }
    }
  } catch (e) {
    console.error('[admin/auth] POST:', e?.message ?? e)
    return NextResponse.json({ error: 'Could not sign you in. Try again.' }, { status: 500 })
  }

  // Signed, expiring token naming the admin — verified by middleware, the
  // admin layout and every admin route. It cannot be forged without the secret.
  let sessionToken
  try {
    sessionToken = await createAdminToken(admin)
  } catch (e) {
    console.error('[admin/auth]', e.message)
    return NextResponse.json({ error: 'ADMIN_SESSION_SECRET env variable not set (32+ characters)' }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   ADMIN_SESSION_TTL,
    path:     '/',  // must be '/' so cookie is sent to /api/admin/* routes too
  })

  return NextResponse.json({ success: true, admin })
}

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ admin }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  return NextResponse.json({ success: true })
}
