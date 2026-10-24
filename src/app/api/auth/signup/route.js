// src/app/api/auth/signup/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup: the only way student accounts are created.
//
// Body: {
//   method:   'phone' | 'email',
//   phone?:   string,            // any common Nigerian format
//   email?:   string,
//   full_name: string,          // required, 2–80 characters
//   password: string,            // 6+ characters
//   guest?:   { full_name, exam_types, subjects_waec, subjects_jamb }
//   referral_code?: string       // an ambassador's code; ignored if it isn't valid
// }
//
// Why server-side:
//   • Accounts are created already confirmed (email_confirm: true), so there is
//     no "check your inbox" step, whatever the dashboard's Confirm email setting.
//   • Phone numbers are checked for duplicates against both auth users and
//     profiles.phone_number before anything is created.
//   • A guest's setup (name, exams, subjects) is written to the new profile in
//     the same request, so switching from guest to account loses nothing.
//
// On success returns { ok: true, loginEmail, referral } (referral: the
// apply_referral result, or null). The client then signs in with
// signInWithPassword({ email: loginEmail, password }) to get a session.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { rateLimited } from '@/lib/server/rateLimit'
import { NextResponse } from 'next/server'
import { normalizePhone, phoneProblem, phoneToAuthEmail, phoneVariants } from '@/lib/auth/phone'

const MIN_PASSWORD = 6
const EXAMS = ['WAEC', 'JAMB']

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function fail(status, error, field) {
  return NextResponse.json({ ok: false, error, field }, { status })
}

// Keep only well-formed guest data. Never trust the client's shape.
function cleanGuest(g) {
  if (!g || typeof g !== 'object') return {}
  const strList = v => Array.isArray(v)
    ? [...new Set(v.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().slice(0, 60)))].slice(0, 20)
    : []
  const out = {}
  if (typeof g.full_name === 'string' && g.full_name.trim()) out.full_name = g.full_name.trim().slice(0, 60)
  const exams = strList(g.exam_types).filter(e => EXAMS.includes(e))
  const waec = strList(g.subjects_waec)
  const jamb = strList(g.subjects_jamb)
  if (exams.length && (waec.length || jamb.length)) {
    out.exam_types    = exams
    out.exam_type     = exams[0]
    out.subjects_waec = waec
    out.subjects_jamb = jamb
    out.subjects      = exams.includes('WAEC') ? waec : jamb   // legacy column
  }
  return out
}

function isDuplicateUserError(error) {
  if (!error) return false
  return error.code === 'email_exists' || error.code === 'user_already_exists' ||
    /already (been )?registered|already exists/i.test(error.message ?? '')
}

export async function POST(request) {
  const limited = rateLimited(request, 'student-signup', 10, 60 * 60_000)
  if (limited) return limited
  let body
  try { body = await request.json() } catch { return fail(400, 'Something went wrong. Please try again.') }

  const { method, password } = body ?? {}
  if (method !== 'phone' && method !== 'email') return fail(400, 'Choose phone or email to sign up.')
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return fail(400, `Your password needs at least ${MIN_PASSWORD} characters.`, 'password')
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().replace(/\s+/g, ' ') : ''
  if (fullName.length < 2 || fullName.length > 80) return fail(400, 'Enter your name (2–80 characters).', 'full_name')

  const db = admin()
  let loginEmail
  let phone = null

  if (method === 'phone') {
    if (typeof body.phone !== 'string') return fail(400, 'Enter your phone number.', 'phone')
    const problem = phoneProblem(body.phone)
    if (problem) return fail(400, problem, 'phone')
    phone = normalizePhone(body.phone)
    loginEmail = phoneToAuthEmail(body.phone)

    // Is the number already on another account (including numbers students
    // added to their profile before phone sign-up existed)?
    const { data: taken, error: lookupErr } = await db
      .from('profiles').select('id').in('phone_number', phoneVariants(body.phone)).limit(1)
    if (lookupErr) return fail(500, 'We couldn’t check your phone number. Please try again.')
    if (taken?.length) {
      return fail(409, 'This phone number is already used by another account. Sign in instead.', 'phone')
    }
  } else {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(400, 'Enter a valid email address.', 'email')
    loginEmail = email
  }

  // Create the auth user, confirmed, so the student can sign in immediately.
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, signup_method: method, ...(phone ? { phone } : {}) },
  })

  if (createErr || !created?.user) {
    if (isDuplicateUserError(createErr)) {
      return method === 'phone'
        ? fail(409, 'This phone number is already used by another account. Sign in instead.', 'phone')
        : fail(409, 'An account with this email already exists. Sign in instead.', 'email')
    }
    console.error('signup createUser:', createErr)
    return fail(500, 'We couldn\'t create your account. Please try again.')
  }

  // Required identity must persist before signup can succeed. Only missing
  // optional schema columns justify falling back to the essentials.
  const userId = created.user.id
  const essentials = { id: userId, full_name: fullName, email: loginEmail, ...(phone ? { phone_number: phone } : {}) }
  const full = { ...cleanGuest(body.guest), ...essentials }
  let { error: profileError } = await db.from('profiles').upsert(full, { onConflict: 'id' })
  if (profileError && ['42703', 'PGRST204'].includes(profileError.code)) {
    ;({ error: profileError } = await db.from('profiles').upsert(essentials, { onConflict: 'id' }))
  }
  if (profileError) {
    console.error('signup profile save:', profileError)
    const { error: cleanupError } = await db.auth.admin.deleteUser(userId)
    if (cleanupError) {
      console.error('signup cleanup:', { userId, error: cleanupError })
      return fail(500, 'We couldn’t finish setting up your account. Please contact support before trying again.')
    }
    if (profileError.code === '23505' && /profiles_phone_number_unique/.test(profileError.message ?? '')) {
      return fail(409, 'This phone number is already used by another account. Sign in instead.', 'phone')
    }
    return fail(500, 'We couldn’t save your account details. Please try again.')
  }

  // A referral code (from a teacher's link or typed in) links the student to the
  // ambassador. It must never block sign-up: a wrong code, or the referral
  // tables not existing yet, just means no referral.
  let referral = null
  const referralCode = typeof body.referral_code === 'string' ? body.referral_code.trim().slice(0, 20) : ''
  if (referralCode) {
    const { data, error } = await db.rpc('apply_referral', { p_student: userId, p_code: referralCode, p_late: false })
    if (error) console.error('signup apply_referral:', error.message)
    else referral = data
  }

  return NextResponse.json({ ok: true, loginEmail, referral })
}
