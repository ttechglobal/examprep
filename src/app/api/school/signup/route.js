// src/app/api/school/signup/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school/signup — the only way a school account is created.
//
// Body: { schoolName, fullName, email, phone, password, city?, state? }
//   phone: the contact's number (any common Nigerian format), for WhatsApp
//
// Creates a confirmed auth user, then the school and its admin profile in one
// transaction (create_school_account, 20261007_schools_and_admin_log.sql);
// the school starts with 1 free slot. If the school can't be created, the new
// login is deleted again, so nothing is left half made.
// Replaces the old flow (browser signUp, then /api/school/setup), which let
// any signed-in student promote themselves to a school admin.
//
// Response: { ok: true } — the page then signs in with the email and password.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { normalizePhone, phoneProblem } from '@/lib/auth/phone'

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const fail = (status, error, field) => NextResponse.json({ ok: false, error, field }, { status })
const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const schoolName = text(body.schoolName, 120)
  const fullName   = text(body.fullName, 80)
  const email      = text(body.email, 200).toLowerCase()
  const password   = typeof body.password === 'string' ? body.password : ''
  if (schoolName.length < 3) return fail(400, 'Enter your school’s name', 'schoolName')
  if (fullName.length < 2)   return fail(400, 'Enter your full name', 'fullName')
  if (!EMAIL_RE.test(email)) return fail(400, 'Enter a valid email address', 'email')
  const phone      = typeof body.phone === 'string' ? body.phone : ''
  const phoneIssue = phoneProblem(phone)
  if (phoneIssue) return fail(400, phoneIssue, 'phone')
  if (password.length < MIN_PASSWORD) return fail(400, `Your password needs at least ${MIN_PASSWORD} characters`, 'password')

  const db = supabaseAdmin()
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, signup_method: 'school' },
  })
  if (createError || !created?.user) {
    if (createError?.code === 'email_exists' || /already (been )?registered|already exists/i.test(createError?.message ?? '')) {
      return fail(409, 'An account with this email already exists. Sign in instead, or use another email.', 'email')
    }
    console.error('[school/signup] createUser:', createError?.message ?? createError)
    return fail(500, 'We couldn’t create your account. Please try again.')
  }

  const { error: schoolError } = await db.rpc('create_school_account', {
    p_user: created.user.id, p_school_name: schoolName, p_full_name: fullName, p_email: email,
    p_phone: normalizePhone(phone), p_city: text(body.city, 60), p_state: text(body.state, 60),
  })
  if (schoolError) {
    console.error('[school/signup] create_school_account:', schoolError.message)
    await db.auth.admin.deleteUser(created.user.id)
    return fail(500, 'We couldn’t set up your school. Please try again.')
  }
  return NextResponse.json({ ok: true })
}
