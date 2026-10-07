// src/app/api/referral/apply/route.js
// POST { code } → { status } — a signed-in student adds a referral code AFTER
// signing up. Allowed only in their first 7 days and before any paid plan
// (apply_referral with p_late). status:
//   applied | already | invalid | self | too_late
// The student is whoever is signed in, never a value from the request.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { cleanCode, REFERRAL_CODE_RE } from '@/lib/referral'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })

  let body = {}
  try { body = await request.json() } catch {}
  const code = cleanCode(body.code ?? '')
  if (!REFERRAL_CODE_RE.test(code)) return NextResponse.json({ status: 'invalid' })

  const { data, error } = await supabaseAdmin().rpc('apply_referral', { p_student: user.id, p_code: code, p_late: true })
  if (error) {
    console.error('[referral/apply]', error.message)
    return NextResponse.json({ error: 'Could not add the code. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ status: data })
}
