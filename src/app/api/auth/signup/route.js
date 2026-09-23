// src/app/api/auth/signup/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup: the only way student accounts are created.
//
// Body: {
//   method:   'phone' | 'email',
//   phone?:   string,            // any common Nigerian format
//   email?:   string,
//   password: string,            // 6+ characters
//   guest?:   { full_name, exam_types, subjects_waec, subjects_jamb }
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
// On success returns { ok: true, loginEmail }. The client then signs in with
// signInWithPassword({ email: loginEmail, password }) to get a session.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
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
  let body
  try { body = await request.json() } catch { return fail(400, 'Something went wrong. Please try again.') }

  const { method, password } = body ?? {}
  if (method !== 'phone' && method !== 'email') return fail(400, 'Choose phone or email to sign up.')
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return fail(400, `Your password needs at least ${MIN_PASSWORD} characters.`, 'password')
  }

  const db = admin()
  let loginEmail
  let phone = null

  if (method === 'phone') {
    const problem = phoneProblem(body.phone)
    if (problem) return fail(400, problem, 'phone')
    phone = normalizePhone(body.phone)
    loginEmail = phoneToAuthEmail(body.phone)

    // Is the number already on another account (including numbers students
    // added to their profile before phone sign-up existed)?
    const { data: taken, error: lookupErr } = await db
      .from('profiles').select('id').in('phone_number', phoneVariants(body.phone)).limit(1)
    if (!lookupErr && taken?.length) {
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
    user_metadata: { signup_method: method, ...(phone ? { phone } : {}) },
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

  // Write the profile. Try the full set of fields first; if the database
  // rejects a column that doesn't exist yet, fall back to the essentials.
  // A profile failure never undoes the account: the student can finish setup
  // from their profile page, which the app will ask them to do anyway.
  const userId = created.user.id
  const guest  = cleanGuest(body.guest)
  const full   = { id: userId, ...(phone ? { phone_number: phone } : {}), ...guest }
  const { error: upsertErr } = await db.from('profiles').upsert(full, { onConflict: 'id' })
  if (upsertErr) {
    const minimal = { id: userId, ...(guest.full_name ? { full_name: guest.full_name } : {}), ...(phone ? { phone_number: phone } : {}) }
    const { error: retryErr } = await db.from('profiles').upsert(minimal, { onConflict: 'id' })
    if (retryErr) console.error('signup profile upsert:', upsertErr, retryErr)
  }

  return NextResponse.json({ ok: true, loginEmail })
}
