// src/app/api/auth/callback/route.js
//
// Handles email confirmation and OAuth redirects.
// Exchanges the code for a session, then redirects to the dashboard.
// Profile data (exam type, subjects) comes from the client-side sync queue
// flush that runs after login — not from URL params.

import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/student/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}