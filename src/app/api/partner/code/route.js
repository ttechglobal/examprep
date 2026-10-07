// src/app/api/partner/code/route.js
// POST → { code } — makes the signed-in ambassador's referral code. One code,
// made once and never changed (so shared links and QR codes keep working);
// calling it again returns the same code. A paused ambassador can't make one.

import { NextResponse } from 'next/server'
import { requirePartner } from '@/lib/server/partner'

export async function POST() {
  const { db, user, error } = await requirePartner()
  if (error) return error

  const { data, error: rpcError } = await db.rpc('ambassador_generate_code', { p_user: user.id })
  if (rpcError) {
    const paused = /paused/.test(rpcError.message ?? '')
    if (!paused) console.error('[partner/code]', rpcError.message)
    return NextResponse.json(
      { error: paused ? 'Your account is paused. Contact ExamPrep A1.' : 'Could not make your code. Please try again.' },
      { status: paused ? 403 : 500 })
  }
  return NextResponse.json({ code: data })
}
