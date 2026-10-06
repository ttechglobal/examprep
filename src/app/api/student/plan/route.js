// src/app/api/student/plan/route.js
// GET /api/student/plan — the signed-in student's plan and today's uses.
//
// Response: { status, usage }
//   status  lib/plans.js planStatus: { premium, source, until, daysLeft, trialEnded }
//   usage   today's uses of each daily-limited feature, e.g. { custom: 1, battle: 2 }
// Guests: { status: { source: 'guest', … }, usage: null } — the app counts
// their daily uses on the device.

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { planStatus } from '@/lib/plans'
import { loadPlanStatus, loadUsageToday } from '@/lib/server/entitlements'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = (await supabase.auth.getUser()).data?.user ?? null
    if (!user || user.is_anonymous) {
      return NextResponse.json({ status: planStatus({ isGuest: true }), usage: null }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const db = supabaseAdmin()
    const [status, usage] = await Promise.all([loadPlanStatus(db, user.id), loadUsageToday(db, user.id)])
    return NextResponse.json({ status, usage }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    console.error('[student/plan]', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load your plan' }, { status: 500 })
  }
}
