// src/app/api/student/events/route.js
// POST { event: 'upgrade_view', feature, reason } | { event: 'upgrade_click', feature, plan }
//   Records the upgrade sheet being shown (and why) or "Get Premium on
//   WhatsApp" being tapped, for Analytics' upgrade triggers. Signed-in
//   students only; guests get { ok: true } and nothing is stored.
//   Each counts once per student, trigger and day, so reopening the sheet
//   doesn't inflate the numbers.
// Response: { ok: true }

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { recordEvent }   from '@/lib/server/studentEvents'
import { FEATURES, PLANS } from '@/lib/plans'
import { appDay }        from '@/lib/dates'

const REASONS = new Set(['premium', 'limit', 'general'])

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}
  const event = body.event
  if (event !== 'upgrade_view' && event !== 'upgrade_click') return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
  const feature = FEATURES[body.feature] ? body.feature : 'general'
  const reason = REASONS.has(body.reason) ? body.reason : 'general'
  const plan = PLANS.some(p => p.id === body.plan) ? body.plan : null

  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data?.user
  if (!user || user.is_anonymous) return NextResponse.json({ ok: true })

  const day = appDay()
  await recordEvent(supabaseAdmin(), event === 'upgrade_view'
    ? { studentId: user.id, event, feature, ref: `uv-${feature}-${reason}-${day}`, detail: { reason } }
    : { studentId: user.id, event, feature, ref: `uc-${feature}-${plan ?? 'none'}-${day}`, detail: { plan } })
  return NextResponse.json({ ok: true })
}
