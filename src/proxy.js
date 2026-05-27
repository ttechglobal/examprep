import { NextResponse } from 'next/server'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  const isProtected =
    pathname.startsWith('/student') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/school')

  if (!isProtected) {
    return NextResponse.next()
  }

  // Check for supabase session cookie
  const hasSession =
    request.cookies.get('sb-access-token') ||
    request.cookies.getAll().some(c => c.name.includes('auth-token'))

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/student/:path*',
    '/admin/:path*',
    '/reviewer/:path*',
    '/school/:path*',
  ],
}