// src/app/api/partner/dashboard/route.js
// GET /api/partner/dashboard?year=2026|all → the signed-in ambassador's numbers.
//
// One SQL call (ambassador_dashboard, 20261014): students who joined that year,
// commissions earned that year, and the student list as first name + last
// initial only. balance and paid_out are always all-time. No year = this year
// (Nigerian time); year=all = everything.

import { NextResponse } from 'next/server'
import { requirePartner, lagosYear } from '@/lib/server/partner'

export async function GET(request) {
  const { db, user, error } = await requirePartner()
  if (error) return error

  const param = new URL(request.url).searchParams.get('year')
  let year = lagosYear()
  if (param === 'all') year = null
  else if (/^\d{4}$/.test(param ?? '')) year = Number(param)

  const { data, error: rpcError } = await db.rpc('ambassador_dashboard', { p_user: user.id, p_year: year })
  if (rpcError) {
    console.error('[partner/dashboard]', rpcError.message)
    return NextResponse.json({ error: 'Could not load your dashboard' }, { status: 500 })
  }
  // null: signed in, but not an ambassador.
  if (!data) return NextResponse.json({ error: 'This is not an ambassador account' }, { status: 403 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
