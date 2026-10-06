// src/app/api/admin/notifications/route.js
//
// POST { title, body, url, audience: { kind, value? } }
//   Sends a custom push notification through the Supabase Edge Function
//   (send-notifications) to everyone, one student, or a group, and records it
//   in the activity log. "{name}" in the title or body becomes each student's
//   first name. Validation lives in lib/notifications.js (no emojis, length,
//   links, audiences).
//
// Proxies from the admin UI so the Edge Function URL and secret key never
// touch the client. Response: { ok, delivered, failed, stale, more_pages, first_error, reach }.
//
// v2: sends the Supabase secret key (sb_secret_…, held in SUPABASE_SERVICE_ROLE_KEY
//     until the env vars are renamed) in the `apikey` header, as secret keys
//     require. Errors no longer echo the function's raw reply.
// v3: audiences, links to other sites (the WhatsApp channel), "{name}", a check
//     that anyone can receive it, an activity-log entry, one tag per message
//     (so a new message doesn't replace an earlier one on the phone).

import { NextResponse } from 'next/server'
import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { checkMessage, checkLink, checkAudience, audienceLabel } from '@/lib/notifications'

const EDGE_URL   = process.env.SUPABASE_EDGE_URL      // https://xxx.supabase.co/functions/v1/send-notifications
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError

  let input
  try { input = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const message = checkMessage(input ?? {})
  if (message.error) return NextResponse.json({ error: message.error }, { status: 400 })

  const url = input.url ? checkLink(input.url) : '/student/practice'
  if (!url) return NextResponse.json({ error: 'That link isn’t valid. Use a page in the app (starting with /) or a full https:// link.' }, { status: 400 })

  const audience = checkAudience(input.audience)
  if (!audience) return NextResponse.json({ error: 'Choose who this goes to.' }, { status: 400 })

  if (!EDGE_URL || !SECRET_KEY) {
    return NextResponse.json({ error: 'Edge Function not configured' }, { status: 500 })
  }

  try {
    const db = supabaseAdmin()

    // Nobody to send to is a clear answer, not a silent "0 delivered".
    const reach = await db.rpc('notification_audience_count', { p_kind: audience.kind, p_value: audience.value })
    if (reach.error) throw reach.error
    if (!reach.data?.devices) {
      return NextResponse.json({
        error: audience.kind === 'user'
          ? 'This student hasn’t turned on notifications on any device, so nothing can be sent.'
          : 'No one in this group has notifications turned on.',
      }, { status: 400 })
    }

    const res = await fetch(EDGE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SECRET_KEY },
      body: JSON.stringify({
        custom: true,
        title:  message.title,
        body:   message.body,
        url,
        tag:    `ep-msg-${Date.now().toString(36)}`,
        audience,
      }),
    })

    if (!res.ok) {
      console.error('[admin/notifications] Edge Function error:', res.status, (await res.text().catch(() => '')).slice(0, 300))
      const error = res.status === 401
        ? 'The notification function refused the key. Check SUPABASE_SERVICE_ROLE_KEY holds a current secret key (sb_secret_…).'
        : `The notification function failed (HTTP ${res.status}). See the function logs in Supabase.`
      return NextResponse.json({ error }, { status: 502 })
    }

    const data = await res.json().catch(() => ({}))

    // Who sent what to whom, in the Activity Log. A failure here doesn't undo the send.
    const log = await db.rpc('log_activity', {
      p_actor: actorOf(admin),
      p_action: 'notification.sent',
      p_summary: `Sent a notification to ${audienceLabel(audience, String(input.audienceName ?? '').slice(0, 80) || undefined)}: “${message.title}”`,
      p_student: audience.kind === 'user' ? audience.value : null,
      p_details: { title: message.title, body: message.body, url, audience, devices: reach.data.devices, delivered: data.delivered ?? 0, failed: data.failed ?? 0 },
    })
    if (log.error) console.error('[admin/notifications] activity log:', log.error.message)

    return NextResponse.json({
      ok:          true,
      reach:       reach.data,
      delivered:   data.delivered ?? 0,
      failed:      data.failed ?? 0,
      stale:       data.stale ?? 0,
      more_pages:  !!data.more_pages,
      first_error: data.first_error ?? null,
    })
  } catch (e) {
    console.error('[admin/notifications] error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not reach the notification function.' }, { status: 500 })
  }
}
