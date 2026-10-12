// src/app/api/partner/signup/route.js
// POST /api/partner/signup — the only way an ambassador account is created.
//
// Body: { fullName, email, phone, school?, password }
//   phone: the teacher's number, for WhatsApp and payouts
//
// Open to anyone who finds the page, on purpose: an ambassador only earns when
// students they refer actually pay, so a stranger signing up costs nothing.
// Admins can pause any ambassador (admin_update_ambassador).
//
// Creates a confirmed auth user, then the ambassador and its profile in one
// transaction (create_ambassador_account, 20261014_ambassadors.sql). If that
// fails, the new login is deleted again, so nothing is left half made.
// Same shape as /api/school/signup. Response: { ok: true }; the page then signs in.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { rateLimited } from '@/lib/server/rateLimit'
import { normalizePhone, phoneProblem, phoneVariants } from '@/lib/auth/phone'

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_CONFLICT = 'This phone number is already used by another account. Use a different number to create your ambassador account.'

const fail = (status, error, field) => NextResponse.json({ ok: false, error, field }, { status })
const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

export async function POST(request) {
  // Creating accounts is the expensive thing a stranger can ask for: 10 an hour per visitor.
  const limited = rateLimited(request, 'partner-signup', 10, 60 * 60_000)
  if (limited) return limited

  let body = {}
  try { body = await request.json() } catch {}

  const fullName = text(body.fullName, 80)
  const email    = text(body.email, 200).toLowerCase()
  const school   = text(body.school, 120)
  const password = typeof body.password === 'string' ? body.password : ''
  const phone    = typeof body.phone === 'string' ? body.phone : ''
  if (fullName.length < 2)   return fail(400, 'Enter your full name', 'fullName')
  if (!EMAIL_RE.test(email)) return fail(400, 'Enter a valid email address', 'email')
  const phoneIssue = phoneProblem(phone)
  if (phoneIssue)            return fail(400, phoneIssue, 'phone')
  if (password.length < MIN_PASSWORD) return fail(400, `Your password needs at least ${MIN_PASSWORD} characters`, 'password')

  const db = supabaseAdmin()
  // Check before creating a login. The unique index remains the backstop for
  // simultaneous signups; older profiles may store a different phone format.
  const { data: existing, error: lookupError } = await db
    .from('profiles').select('id').in('phone_number', phoneVariants(phone)).limit(1)
  if (lookupError) {
    console.error('[partner/signup] phone lookup:', lookupError)
    return fail(500, 'We couldn’t check your phone number. Please try again.')
  }
  if (existing?.length) return fail(409, PHONE_CONFLICT, 'phone')

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, signup_method: 'ambassador' },
  })
  if (createError || !created?.user) {
    if (createError?.code === 'email_exists' || /already (been )?registered|already exists/i.test(createError?.message ?? '')) {
      return fail(409, 'An account with this email already exists. Sign in instead, or use another email.', 'email')
    }
    console.error('[partner/signup] createUser:', createError?.message ?? createError)
    return fail(500, 'We couldn’t create your account. Please try again.')
  }

  const { error: rpcError } = await db.rpc('create_ambassador_account', {
    p_user: created.user.id, p_full_name: fullName, p_email: email, p_phone: normalizePhone(phone), p_school: school,
  })
  if (rpcError) {
    console.error('[partner/signup] create_ambassador_account:', rpcError)
    const { error: cleanupError } = await db.auth.admin.deleteUser(created.user.id)
    if (cleanupError) {
      console.error('[partner/signup] account cleanup:', { userId: created.user.id, error: cleanupError })
      return fail(500, 'We couldn’t finish setting up your account. Please contact support before trying again.')
    }
    if (rpcError.code === '23505' && /\bprofiles_phone_number_unique\b/.test(rpcError.message ?? '')) {
      return fail(409, PHONE_CONFLICT, 'phone')
    }
    return fail(500, 'We couldn’t set up your account. Please try again.')
  }
  return NextResponse.json({ ok: true })
}
