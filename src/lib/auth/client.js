// src/lib/auth/client.js
// ─────────────────────────────────────────────────────────────────────────────
// Every student auth action goes through this file. Screens call these
// functions; they never talk to supabase.auth directly. That keeps phone
// accounts, guest data and post-login routing consistent everywhere.
//
//   signUp({ method, phone, email, password })  → { ok, error, field }
//   signIn({ method, phone, email, password })  → { ok, error, field }
//   signOut()                                    → clears device state
//   continueAsGuest()                            → starts a device-only profile
//   isAccountSession(session)                    → true for a real (non-guest) login
//   destinationAfterAuth({ from, join })         → where to send the user next
//
// localStorage keys owned here:
//   ep_intro_seen     '1' once the first-launch slides have been seen
//   ep_guest          guest profile (read by the student layout)
//   ep_profile_cache  signed-in profile cache (see lib/localProfile.js)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
import { phoneProblem, phoneToAuthEmail } from '@/lib/auth/phone'

export const INTRO_SEEN_KEY = 'ep_intro_seen'
const GUEST_KEY = 'ep_guest'
const CACHE_KEY = 'ep_profile_cache'

// ── Small localStorage helpers ────────────────────────────────────────────────
function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
function remove(key) {
  try { localStorage.removeItem(key) } catch {}
}

export function hasSeenIntro() {
  try { return localStorage.getItem(INTRO_SEEN_KEY) === '1' } catch { return true }
}
export function markIntroSeen() {
  try { localStorage.setItem(INTRO_SEEN_KEY, '1') } catch {}
}

/** True if this device has a guest profile or a cached signed-in profile. */
export function hasLocalIdentity() {
  const g = read(GUEST_KEY)
  return (!!g && !g.migrated_to) || !!read(CACHE_KEY)
}

// ── Guest ─────────────────────────────────────────────────────────────────────
export function continueAsGuest() {
  const existing = read(GUEST_KEY)
  if (existing && !existing.migrated_to) return          // keep an existing guest's data
  write(GUEST_KEY, { guest: true, createdAt: Date.now() })
  if (!localStorage.getItem('ep_local_id')) {
    try { localStorage.setItem('ep_local_id', 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36)) } catch {}
  }
}

// Only the setup fields a guest can have filled in on their profile page.
function guestSetupForMigration() {
  const g = read(GUEST_KEY)
  if (!g || g.migrated_to) return null
  const exams = g.exam_types ?? g.exams ?? (g.exam_type ? [g.exam_type] : [])
  return {
    full_name:     g.full_name ?? null,
    exam_types:    exams,
    subjects_waec: g.subjects_waec ?? (exams.includes('WAEC') ? (g.subjects ?? []) : []),
    subjects_jamb: g.subjects_jamb ?? (exams.includes('JAMB') ? (g.subjects ?? []) : []),
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────
function signInErrorMessage(method, error) {
  const msg = error?.message ?? ''
  if (/invalid login credentials/i.test(msg)) {
    return method === 'phone'
      ? 'That phone number and password don\'t match. Check both and try again.'
      : 'That email and password don\'t match. Check both and try again.'
  }
  if (/email not confirmed/i.test(msg)) {
    return 'This account was never activated. Contact support and we\'ll switch it on.'
  }
  if (/fetch|network/i.test(msg)) return 'You\'re offline. Connect to the internet and try again.'
  return msg || 'Something went wrong. Please try again.'
}

function validateCredentials({ method, phone, email, password }) {
  if (method === 'phone') {
    const problem = phoneProblem(phone)
    if (problem) return { error: problem, field: 'phone' }
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email ?? '').trim())) {
    return { error: 'Enter a valid email address.', field: 'email' }
  }
  if (!password || password.length < 6) {
    return { error: 'Your password needs at least 6 characters.', field: 'password' }
  }
  return null
}

// ── Battle guests ─────────────────────────────────────────────────────────────
// Someone who accepts a 1v1 invite without an account plays on a Supabase
// anonymous login. That login is NOT an account: only the 1v1 screens use it.
// When they sign up or sign in, their finished battles (answers, XP, form)
// move onto the account — the server checks the guest token proves ownership.

/** True for a real account session; false for none or a battle-guest login. */
export function isAccountSession(session) {
  return !!session?.user && !session.user.is_anonymous
}

async function battleGuestToken() {
  try {
    const { data: { session } } = await createClient().auth.getSession()
    return session?.user?.is_anonymous ? session.access_token : null
  } catch { return null }
}

async function claimBattleGuest(guestToken) {
  if (!guestToken) return
  try {
    await fetch('/api/student/battle/claim-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_token: guestToken }),
    })
  } catch {}   // best effort: the account works either way
}

function flushPracticeQueue() {
  import('@/lib/localSessionSync').then(({ syncOnLogin }) => syncOnLogin()).catch(() => {})
}

// ── Sign up ───────────────────────────────────────────────────────────────────
export async function signUp({ method, phone, email, password }) {
  const invalid = validateCredentials({ method, phone, email, password })
  if (invalid) return { ok: false, ...invalid }
  const guestToken = await battleGuestToken()   // read before the new login replaces it

  let res, data
  try {
    res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, phone, email, password, guest: guestSetupForMigration() }),
    })
    data = await res.json()
  } catch {
    return { ok: false, error: 'You\'re offline. Connect to the internet and try again.' }
  }
  if (!res.ok || !data?.ok) return { ok: false, error: data?.error ?? 'Something went wrong. Please try again.', field: data?.field }

  const { error } = await createClient().auth.signInWithPassword({ email: data.loginEmail, password })
  if (error) return { ok: false, error: 'Your account was created. Sign in to continue.' }

  // Guest data now lives on the account. Mark it so it's never migrated twice
  // and so signing out later doesn't drop the device back into this guest.
  const g = read(GUEST_KEY)
  if (g) {
    const { data: { user } } = await createClient().auth.getUser()
    write(GUEST_KEY, { ...g, migrated_to: user?.id ?? true })
  }
  await claimBattleGuest(guestToken)
  flushPracticeQueue()
  markIntroSeen()
  return { ok: true }
}

// ── Sign in ───────────────────────────────────────────────────────────────────
export async function signIn({ method, phone, email, password }) {
  const invalid = validateCredentials({ method, phone, email, password })
  if (invalid) return { ok: false, ...invalid }

  const loginEmail = method === 'phone' ? phoneToAuthEmail(phone) : email.trim().toLowerCase()
  const guestToken = await battleGuestToken()
  const { error } = await createClient().auth.signInWithPassword({ email: loginEmail, password })
  if (error) return { ok: false, error: signInErrorMessage(method, error) }

  await claimBattleGuest(guestToken)
  flushPracticeQueue()
  markIntroSeen()
  return { ok: true }
}

// ── Sign out ──────────────────────────────────────────────────────────────────
export async function signOut() {
  try { await createClient().auth.signOut() } catch {}
  remove(CACHE_KEY)
  // A guest profile that was moved onto this account belongs to the account now.
  const g = read(GUEST_KEY)
  if (g?.migrated_to) remove(GUEST_KEY)
  try { localStorage.removeItem('ep_student_name') } catch {}
}

// ── Where to go after signing in / up ─────────────────────────────────────────
function safeInternalPath(p) {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : null
}

export async function destinationAfterAuth({ from, join } = {}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Invite links: join the class/school now that we have an account.
  if (join && user) {
    try {
      await fetch('/api/school/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: join }),
      })
    } catch {}
  }

  const back = safeInternalPath(from)
  if (back) return back

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'school_admin') return '/school/dashboard'
    if (profile?.role === 'admin')        return '/admin/dashboard'
    if (profile?.role === 'reviewer')     return '/reviewer'
  }
  return '/student/home'
}
