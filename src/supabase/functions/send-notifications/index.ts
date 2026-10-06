// supabase/functions/send-notifications/index.ts
//
// Called by pg_cron three times daily (12:00, 16:00, 20:00 Lagos) with { slot: 'noon' | 'afternoon' | 'evening' }
// and by /api/admin/notifications for custom messages:
//   { custom: true, title, body, url, tag, audience?: { kind, value? } }
//   audience: all (default) | user | exam | plan | inactive | expiring, resolved in SQL
//   (notification_audience, 20261011). "{name}" in the title or body becomes the
//   student's first name ("there" when unknown). Callers must send a
// Supabase secret key (sb_secret_…) in the `apikey` header.
// Sends Web Push to every active subscription, 500 per invocation (see Batching).
// Marks subscriptions inactive if the browser has unsubscribed (HTTP 404/410).
// Response: { delivered, failed, skipped, stale, more_pages, first_error }. Only pushes the
// browser's push service accepted count as delivered.
//
// Deploy (the caller's key isn't a JWT, so the gateway must not check for one):
//   supabase functions deploy send-notifications --no-verify-jwt
// Secrets needed (set via CLI or dashboard):
//   VAPID_PUBLIC_KEY     (same value as NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel)
//   VAPID_PRIVATE_KEY    (generated together with the public key)
//   VAPID_SUBJECT        (e.g. "mailto:hello@examprep.app")
//   SUPABASE_URL, SUPABASE_SECRET_KEYS (set by Supabase)
//
// v3 (Oct 2026): scheduled reminders are personal. Each device's message depends on its
//   student (weekly battle missions, streak, whether they've practised today) and is
//   chosen in messages.ts. A student who has already practised today gets no reminder,
//   so "delivered" can be lower than the number of devices; "skipped" counts those.
//   Devices without an account get the plain reminder.
// v4 (Oct 2026): custom messages can go to one student or a group, and can say "{name}".
//
// v2 (Sep 2026): moved from the legacy service_role JWT (Authorization: Bearer)
//   to Supabase secret keys (apikey header, SUPABASE_SECRET_KEYS), so the legacy
//   keys can be switched off. "sent" used to count every non-404/410 failure as
//   sent; failures are now reported separately.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush          from 'npm:web-push@3'
import { buildMessage, lagosWeekday, lagosDayNumber, userKey, fillName, type Context, type Slot } from './messages.ts'

// ── Batching ──────────────────────────────────────────────────────────────────
// Each invocation handles one page of subscribers, then hands the next page to
// a fresh invocation of itself. That keeps every run well inside Edge Function
// CPU/time limits (web-push encryption is CPU-heavy) and avoids Supabase's
// 1,000-row response cap, which previously meant only the first 1,000
// subscribers were ever notified.
const PAGE_SIZE   = 500
const CONCURRENCY = 50

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

// ── Keys ──────────────────────────────────────────────────────────────────────
// SUPABASE_SECRET_KEYS is a JSON object of this project's secret keys by name.
// Only a caller holding one of them (the app's server, pg_cron) may trigger a
// blast; the publishable key that ships in the app must not.
function secretKeys(): Record<string, string> {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    return Object.fromEntries(Object.entries(keys).filter(([, v]) => typeof v === 'string' && v.length > 0)) as Record<string, string>
  } catch {
    return {}
  }
}

function sameText(a: string, b: string): boolean {
  // Compare in constant time so the key can't be guessed byte by byte from timing.
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

function authorized(req: Request): boolean {
  const given = req.headers.get('apikey') ?? ''
  return given.length > 0 && Object.values(secretKeys()).some(k => sameText(given, k))
}

// The key this function reads the database with: the one named "default",
// else any secret key of the project.
function databaseKey(): string | undefined {
  const keys = secretKeys()
  return keys.default ?? Object.values(keys)[0]
}

// ── Audience (custom messages) ────────────────────────────────────────────────
const AUDIENCES = ['all', 'user', 'exam', 'plan', 'inactive', 'expiring']
function parseAudience(raw: any): { kind: string; value: string | null } | null {
  const kind = raw?.kind ?? 'all'
  if (!AUDIENCES.includes(kind)) return null
  return { kind, value: raw?.value == null ? null : String(raw.value) }
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  const dbKey = databaseKey()
  if (!dbKey) {
    console.error('send-notifications: SUPABASE_SECRET_KEYS is empty — create a secret key in Settings → API Keys')
    return new Response('Server not configured', { status: 500 })
  }
  if (!authorized(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse body — supports scheduled slots and custom admin blasts
  let parsedBody: Record<string, any> = {}
  try {
    parsedBody = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const isCustom = parsedBody.custom === true || parsedBody.custom === 'true'
  const slot     = parsedBody.slot ?? 'noon'
  const offset   = Math.max(0, Number(parsedBody.offset) || 0)

  if (!isCustom && !['noon', 'afternoon', 'evening'].includes(slot)) {
    return new Response('Invalid slot', { status: 400 })
  }

  if (isCustom && (!parsedBody.title?.trim() || !parsedBody.body?.trim())) {
    return new Response('Custom blast requires title and body', { status: 400 })
  }

  const audience = isCustom ? parseAudience(parsedBody.audience) : null
  if (isCustom && !audience) {
    return new Response('Unknown audience', { status: 400 })
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const db = createClient(Deno.env.get('SUPABASE_URL')!, dbKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // One page of devices, in a stable order. Custom messages ask SQL for their
  // audience; scheduled reminders go to every active device.
  type Device = { id: string; subscription: any; user_id: string | null; first_name?: string | null }
  let subs: Device[] | null = null
  let error: { message: string } | null = null
  if (isCustom) {
    const res = await db.rpc('notification_targets', {
      p_kind: audience!.kind, p_value: audience!.value, p_offset: offset, p_limit: PAGE_SIZE,
    })
    subs = res.data as Device[] | null
    error = res.error
  } else {
    const res = await db
      .from('push_subscriptions')
      .select('id, subscription, user_id')
      .eq('active', true)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    subs = res.data as Device[] | null
    error = res.error
  }

  if (error) {
    console.error('DB read error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  // Hand the next page to a new invocation before doing this page's work.
  // (Stale subscriptions are marked inactive only after sending, so offsets
  // stay stable for the pages that follow.)
  const morePages = (subs?.length ?? 0) === PAGE_SIZE
  if (morePages) {
    const next = fetch(req.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': req.headers.get('apikey')! },
      body:    JSON.stringify({ ...parsedBody, offset: offset + PAGE_SIZE }),
    }).catch(err => console.error('next page trigger failed:', err?.message ?? err))
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(next)
    else await next
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ delivered: 0, failed: 0, stale: 0, more_pages: false, offset }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Custom messages are the same for everyone in the audience, except "{name}".
  // Scheduled reminders are built per device from its student's context (messages.ts).
  const customMessage = isCustom
    ? {
        title: String(parsedBody.title).trim(),
        body:  String(parsedBody.body).trim(),
        url:   parsedBody.url?.trim() || '/student/practice',
        tag:   parsedBody.tag?.trim() || 'ep-custom',
      }
    : null

  const contexts = new Map<string, Context>()
  if (!isCustom) {
    const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))] as string[]
    if (userIds.length > 0) {
      const { data: rows, error: ctxError } = await db.rpc('notification_context', { p_user_ids: userIds })
      // Without context everyone still gets the plain reminder.
      if (ctxError) console.error('notification_context failed:', ctxError.message)
      for (const r of rows ?? []) contexts.set(r.user_id, r as Context)
    }
  }
  const weekday = lagosWeekday(), day = lagosDayNumber()

  // Send in small concurrent batches.
  const staleIds: string[] = []
  let delivered = 0, failed = 0, skipped = 0
  let firstError: string | null = null
  for (let i = 0; i < subs.length; i += CONCURRENCY) {
    await Promise.allSettled(
      subs.slice(i, i + CONCURRENCY).map(async ({ id, subscription, user_id, first_name }) => {
        let payload: string | null = null
        if (customMessage) {
          payload = JSON.stringify({
            ...customMessage,
            title: fillName(customMessage.title, first_name),
            body:  fillName(customMessage.body, first_name),
          })
        } else {
          const msg = buildMessage({
            slot: slot as Slot, weekday, day, key: userKey(user_id ?? id),
            ctx: user_id ? contexts.get(user_id) ?? null : null,
          })
          if (!msg) { skipped++; return }
          payload = JSON.stringify(msg)
        }
        try {
          await webpush.sendNotification(subscription, payload)
          delivered++
        } catch (err: any) {
          // 410 Gone / 404 = browser unsubscribed. Mark inactive so we stop sending.
          if (err?.statusCode === 410 || err?.statusCode === 404) { staleIds.push(id); return }
          // Anything else is a real failure — e.g. 403 when the VAPID keys don't
          // match the ones the phone subscribed with.
          failed++
          firstError ??= `${err?.statusCode ?? 'no status'} ${String(err?.body ?? err?.message ?? err).slice(0, 160)}`
          console.warn(`Push failed for ${id}:`, err?.statusCode, err?.message ?? err)
        }
      })
    )
  }

  if (staleIds.length > 0) {
    await db
      .from('push_subscriptions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .in('id', staleIds)
  }

  const result = {
    mode:        isCustom ? 'custom' : 'scheduled',
    slot:        isCustom ? null : slot,
    offset,
    delivered,
    failed,
    skipped,                      // students who'd already practised today
    stale:       staleIds.length,
    more_pages:  morePages,       // later pages are sent by further invocations
    first_error: firstError,
  }
  console.log('send-notifications:', result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
