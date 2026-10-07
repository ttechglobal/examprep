// src/app/api/partner/signup/route.js
// POST /api/partner/signup — the only way an ambassador account is created.
//
// Body: { key, fullName, email, phone, school?, password }
//   key: the private invite key from the sign-up link (AMBASSADOR_INVITE_KEY)
//   phone: the teacher's number, for WhatsApp and payouts
//
// Creates a confirmed auth user, then the ambassador and its profile in one
// transaction (create_ambassador_account, 20261014_ambassadors.sql). If that
// fails, the new login is deleted again, so nothing is left half made.
// Same shape as /api/school/signup. Response: { ok: true }; the page then signs in.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { inviteKeyOk } from '@/lib/server/partner'
import { normalizePhone, phoneProblem } from '@/lib/auth/phone'

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const fail = (status, error, field) => NextResponse.json({ ok: false, error, field }, { status })
const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}

  if (!inviteKeyOk(body.key)) {
    return fail(403, 'This sign-up link is not valid. Ask ExamPrep A1 for a new one.')
  }

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
    console.error('[partner/signup] create_ambassador_account:', rpcError.message)
    await db.auth.admin.deleteUser(created.user.id)
    return fail(500, 'We couldn’t set up your account. Please try again.')
  }
  return NextResponse.json({ ok: true })
}
