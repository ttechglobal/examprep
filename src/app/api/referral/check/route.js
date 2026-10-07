// src/app/api/referral/check/route.js
// GET /api/referral/check?code=ABCD2345 → { valid, firstName? }
// Lets the sign-up form say "Invited by Adeola" while the student types.
// Public on purpose (students aren't signed in yet), so it gives away nothing
// but a first name for a code that already exists. Never errors the form:
// if the lookup fails, the code just reads as unverified.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { cleanCode, REFERRAL_CODE_RE } from '@/lib/referral'

export async function GET(request) {
  const code = cleanCode(new URL(request.url).searchParams.get('code') ?? '')
  if (!REFERRAL_CODE_RE.test(code)) return NextResponse.json({ valid: false })

  const { data, error } = await supabaseAdmin().rpc('referral_code_info', { p_code: code })
  if (error) {
    console.error('[referral/check]', error.message)
    return NextResponse.json({ valid: false })
  }
  const row = data?.[0]
  return NextResponse.json(row ? { valid: true, firstName: row.first_name } : { valid: false })
}
