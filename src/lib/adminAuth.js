// src/lib/adminAuth.js
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_session'

export async function requireAdmin(request) {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  // ── DEBUG LOGGING — remove once auth is working ──────────────────────────
  const allCookies = cookieStore.getAll()
  console.log('[adminAuth] cookie names present:', allCookies.map(c => c.name))
  console.log('[adminAuth] admin_session value:', session?.value ?? 'NOT FOUND')
  if (request?.url) {
    console.log('[adminAuth] request url:', request.url)
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}