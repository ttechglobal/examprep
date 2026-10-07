// src/lib/server/partner.js
// Shared by the /api/partner/* routes (the Teacher Ambassador portal).
// Server-only: uses the service-role client.
//
//   requirePartner()   who is signed in, and are they an ambassador?
//                      → { user, db } or { error: NextResponse }
//   inviteKeyOk(key)   the private sign-up link's key, checked in constant time
//   lagosYear()        this year in Nigerian time (the dashboard's default view)

import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

export async function requirePartner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) {
    return { error: NextResponse.json({ error: 'Sign in first' }, { status: 401 }) }
  }
  const db = supabaseAdmin()
  const { data: ambassador } = await db.from('ambassadors').select('id').eq('id', user.id).maybeSingle()
  if (!ambassador) {
    return { error: NextResponse.json({ error: 'This is not an ambassador account' }, { status: 403 }) }
  }
  return { user, db }
}

/**
 * Sign-up is invite-only: the link carries ?key=…, compared with
 * AMBASSADOR_INVITE_KEY. No key configured (or a short one) means sign-up is
 * closed, never open by accident. Change the env var to retire old links.
 */
export function inviteKeyOk(given) {
  const expected = process.env.AMBASSADOR_INVITE_KEY
  if (!expected || expected.length < 8 || typeof given !== 'string') return false
  const hash = value => createHash('sha256').update(value).digest()
  return timingSafeEqual(hash(given), hash(expected))
}

export function lagosYear() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(new Date()))
}
