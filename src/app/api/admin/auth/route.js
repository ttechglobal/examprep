// src/app/api/admin/auth/route.js
// POST — validates the admin password and sets a secure session cookie.
// DELETE — clears the admin session cookie (logout).
//
// Set ADMIN_PASSWORD in your .env.local:
//   ADMIN_PASSWORD=your-strong-password-here
//
// The cookie is httpOnly + sameSite=strict so it can't be read by JS
// and won't be sent on cross-site requests.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, ADMIN_SESSION_TTL, createAdminToken } from '@/lib/adminSession'
import { timingSafeEqual, createHash } from 'crypto'

// Compare hashes so the comparison is constant-time regardless of input length.
function passwordMatches(given, expected) {
  const a = createHash('sha256').update(String(given ?? '')).digest()
  const b = createHash('sha256').update(String(expected)).digest()
  return timingSafeEqual(a, b)
}

export async function POST(request) {
  let password
  try { ({ password } = await request.json()) } catch { password = null }

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD env variable not set' },
      { status: 500 }
    )
  }

  if (!passwordMatches(password, adminPassword)) {
    // Small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Signed, expiring token — verified by middleware, the admin layout and
  // requireAdmin(). It cannot be forged without the server secret.
  const sessionToken = await createAdminToken()

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   ADMIN_SESSION_TTL,
    path:     '/',  // must be '/' so cookie is sent to /api/admin/* routes too
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  return NextResponse.json({ success: true })
}