import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Route classification ──────────────────────────────────────────────────
  // /student/* is intentionally guest-accessible — the layout handles the
  // guest↔auth split via localStorage (ep_guest). Middleware must NOT gate it,
  // because middleware runs server-side and cannot read localStorage.
  //
  // /admin, /reviewer, /school are staff-only and DO require a real session.
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
  // The old v1 name 'sb-access-token' no longer exists in v2 projects.
  const hasSession = request.cookies.getAll().some(c =>
    c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Student routes are excluded — guest access is handled client-side.
    '/admin/:path*',
    '/reviewer/:path*',
    '/school/:path*',
  ],
}