// src/app/api/auth/callback/route.js
//
// FIX: Profile data is now written HERE — after exchangeCodeForSession()
// establishes a real session — not in the signup form where no session exists.
//
// URL params written by /register and /school/signup:
//   ?exam_type=WAEC&subjects=Chemistry,Physics   (student)
//   ?role=school_admin                            (school)
//   ?diag_token=<uuid>                            (diagnostic data in sessionStorage)
//   ?next=/some/path                              (post-confirm redirect)

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

  const code      = searchParams.get('code')
  const next      = searchParams.get('next') ?? '/student/dashboard'
  const examType  = searchParams.get('exam_type')
  const subjects  = searchParams.get('subjects')?.split(',').filter(Boolean) ?? []
  const role      = searchParams.get('role')       // 'school_admin' for school signup
  const diagToken = searchParams.get('diag_token') // key into sessionStorage

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const db = svc()

  // ── Write profile data that couldn't be saved at signup time ──────────────
  const updates = {}

  if (examType)         updates.exam_type = examType
  if (subjects.length)  updates.subjects  = subjects
  if (role)             updates.role      = role

  if (Object.keys(updates).length > 0) {
    await db.from('profiles').update(updates).eq('id', user.id)
  }

  // ── Save diagnostic results if a token was passed ─────────────────────────
  // The actual answers/questions data lives in the browser's sessionStorage
  // under `diag_pending_<token>`. We can't read sessionStorage server-side,
  // so we redirect the client to a page that reads it and POSTs to the save API.
  const redirectPath = diagToken
    ? `/api/auth/save-diagnostic?token=${diagToken}&next=${encodeURIComponent(next)}`
    : next

  return NextResponse.redirect(`${origin}${redirectPath}`)
}