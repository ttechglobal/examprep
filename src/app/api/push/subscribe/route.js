// src/app/api/push/subscribe/route.js
//
// POST { device_id, subscription }   (subscription = PushSubscription.toJSON())
//   → 200 { ok: true }            saved (or refreshed) in push_subscriptions
//   → 400 { error }               invalid input (nothing saved)
//   → 500 { error }               server problem (the phone retries on the next app open)
// Signed-in students are linked to the device; guests are saved without a user.
// Called by hooks/usePushSubscription.js every time the app opens with
// notifications allowed, so it must be idempotent: save_push_subscription()
// keeps one row per device and one per push address.
//
// v2 (Sep 2026): validates input and only accepts push addresses at the known
//   browser push services. v1 stored any JSON from any caller, so anyone could
//   register their own URL and make the send-notifications function call it.
//   Saves in one SQL function (dedupes a browser that got a new device id),
//   uses lib/server/supabaseAdmin, and no longer returns raw error text.
//   The unused DELETE handler is removed.

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'

const DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/
const BASE64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/

// Hosts of the browsers' push services (Chrome/Android/Edge-Chromium/Samsung via
// FCM, Firefox, Safari/iOS, legacy Edge). A browser using another service is
// refused and logged, so it can be added here deliberately.
const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
]

function pushHostAllowed(host) {
  return PUSH_HOST_SUFFIXES.some(s => host === s || host.endsWith('.' + s))
}

/** A clean copy of the subscription, or a reason it was refused. */
function parseSubscription(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'subscription missing' }
  let url
  try { url = new URL(raw.endpoint) } catch { return { error: 'endpoint is not a URL' } }
  if (url.protocol !== 'https:' || raw.endpoint.length > 1000) return { error: 'endpoint must be https' }
  if (!pushHostAllowed(url.hostname)) return { error: 'unknown push service', host: url.hostname }

  const p256dh = raw.keys?.p256dh, auth = raw.keys?.auth
  if (typeof p256dh !== 'string' || !BASE64URL_RE.test(p256dh) || p256dh.length < 40 || p256dh.length > 200) return { error: 'bad p256dh key' }
  if (typeof auth !== 'string' || !BASE64URL_RE.test(auth) || auth.length < 8 || auth.length > 64) return { error: 'bad auth key' }

  const expirationTime = typeof raw.expirationTime === 'number' ? raw.expirationTime : null
  return { subscription: { endpoint: raw.endpoint, expirationTime, keys: { p256dh, auth } } }
}

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const deviceId = body?.device_id
  if (typeof deviceId !== 'string' || !DEVICE_ID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid device_id' }, { status: 400 })
  }
  const parsed = parseSubscription(body?.subscription)
  if (parsed.error) {
    if (parsed.host) console.warn('[push/subscribe] refused push service host:', parsed.host)
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  // Signed in → link the device to the student; guest → no user.
  let userId = null
  try {
    const { data: { user } } = await (await createClient()).auth.getUser()
    userId = user?.id ?? null
  } catch {}

  const { error } = await supabaseAdmin().rpc('save_push_subscription', {
    p_device_id:    deviceId,
    p_subscription: parsed.subscription,
    p_user_id:      userId,
  })
  if (error) {
    console.error('[push/subscribe] save failed:', error.message)
    return NextResponse.json({ error: 'Could not save this device' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}