// src/app/api/referral/check/route.js
// GET /api/referral/check?code=ABCD2345 → { valid, firstName? }
// Lets the sign-up form say "Invited by Adeola" while the student types.
// Public on purpose (students aren't signed in yet), so it gives away nothing
// but a first name for a code that already exists.
//
// Light on the database (free plan): a malformed code never reaches it, every
// answer is kept for a minute (per instance, and at the CDN via Cache-Control),
// and one visitor is limited to 30 checks a minute. Never errors the form: if the
// lookup fails, the code just reads as unverified, and that answer isn't cached.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { memo } from '@/lib/server/memo'
import { rateLimited } from '@/lib/server/rateLimit'
import { cleanCode, REFERRAL_CODE_RE } from '@/lib/referral'

const CACHE_MS = 60_000
const CACHE_HEADER = 'public, s-maxage=60, stale-while-revalidate=300'

async function lookup(code) {
  const { data, error } = await supabaseAdmin().rpc('referral_code_info', { p_code: code })
  if (error) throw error
  const row = data?.[0]
  return row ? { valid: true, firstName: row.first_name } : { valid: false }
}

export async function GET(request) {
  const code = cleanCode(new URL(request.url).searchParams.get('code') ?? '')
  if (!REFERRAL_CODE_RE.test(code)) return NextResponse.json({ valid: false }, { headers: { 'Cache-Control': CACHE_HEADER } })

  const limited = rateLimited(request, 'referral-check', 30, 60_000)
  if (limited) return limited

  try {
    const result = await memo(`referral-code:${code}`, CACHE_MS, () => lookup(code))
    return NextResponse.json(result, { headers: { 'Cache-Control': CACHE_HEADER } })
  } catch (error) {
    console.error('[referral/check]', error?.message ?? error)
    return NextResponse.json({ valid: false })   // not cached: memo drops a failed load
  }
}
