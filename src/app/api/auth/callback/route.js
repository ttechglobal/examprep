// src/app/api/auth/callback/route.js
//
// Called after email confirmation. Exchanges the code for a session,
// writes any pending profile data, then redirects to the dashboard.
//
// URL params written by /register:
//   ?exam_type=WAEC&subjects=Chemistry,Physics
//   ?next=/some/path  (optional override)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)

  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/student/home'
  const examType = searchParams.get('exam_type')
  const subjects = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const role     = searchParams.get('role')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const db = svc()

  // Always mark as onboarded on confirmation, plus any profile data
  const updates = { onboarded: true }
  if (examType)        updates.exam_type = examType
  if (subjects.length) updates.subjects  = subjects
  if (role)            updates.role      = role

  await db.from('profiles').update(updates).eq('id', user.id)

  return NextResponse.redirect(`${origin}${next}`)
}