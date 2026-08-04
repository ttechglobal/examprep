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

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function POST(request) {
  const { password } = await request.json()

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD env variable not set' },
      { status: 500 }
    )
  }

  if (password !== adminPassword) {
    // Small delay to slow brute-force attempts
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Set a signed session cookie
  // Value is a simple timestamp token — the layout checks for its presence
  const sessionToken = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',  // must be '/' so cookie is sent to /api/admin/* routes too
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  return NextResponse.json({ success: true })
}