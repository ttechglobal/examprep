import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/adminSession'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Admin API: one gate for every /api/admin/* route ──────────────────────
  // Every admin endpoint uses the service-role key, so none may be reachable
  // without a valid signed admin session. Guarding here means a new route can't
  // ship unprotected by accident. /api/admin/auth is the login itself.
  if (pathname.startsWith('/api/admin')) {
    if (pathname === '/api/admin/auth') return NextResponse.next()
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (await verifyAdminToken(token)) return NextResponse.next()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Route classification ──────────────────────────────────────────────────
  // /student/* is intentionally guest-accessible — the layout handles the
  // guest↔auth split via localStorage (ep_guest). Middleware must NOT gate it,
  // because middleware runs server-side and cannot read localStorage.
  //
  // /admin, /reviewer, /school are staff-only and DO require a real session.
  // (The admin layout additionally verifies the signed admin cookie.)
  const requiresRealSession =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/school')

  if (!requiresRealSession) {
    return NextResponse.next()
  }

  // ── Supabase v2 cookie detection ──────────────────────────────────────────
  // Supabase JS v2 stores the session in a cookie named:
  //   sb-<project-ref>-auth-token
  // On large tokens it chunks into:
  //   sb-<project-ref>-auth-token.0, .1, …
  const hasSession = request.cookies.getAll().some(c =>
    c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  if (!hasSession) {
    // Send them to sign in, then straight back to where they were going.
    const url = new URL('/onboarding', request.url)
    url.searchParams.set('mode', 'signin')
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Student routes are excluded — guest access is handled client-side.
    '/admin/:path*',
    '/reviewer/:path*',
    '/school/:path*',
    '/api/admin/:path*',
  ],
}
