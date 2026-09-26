// supabase/functions/send-notifications/index.ts
//
// Called by pg_cron three times daily with { slot: 'noon' | 'afternoon' | 'evening' }
// and by /api/admin/notifications for custom blasts. Callers must send
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// Sends Web Push to every active subscription, 500 per invocation (see Batching).
// Marks subscriptions inactive if the browser has unsubscribed (HTTP 410).
//
// Deploy: supabase functions deploy send-notifications
// Secrets needed (set via CLI or dashboard):
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT        (e.g. "mailto:hello@examprep.app")
//   SUPABASE_URL         (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush          from 'npm:web-push@3'

// ── Message pools ─────────────────────────────────────────────────────────────
const MESSAGES = {
  noon: [
    { title: '☀️ Lunch break = practice time',    body: "5 questions. That's all. You've got this." },
    { title: '🎯 Midday check-in',                body: "How many topics have you hit today? Let's add one more." },
    { title: "📚 12 o'clock drill",               body: 'Perfect time for a quick WAEC/JAMB practice session.' },
    { title: '⚡ Midday energy boost',             body: 'A quick quiz beats doom-scrolling. Open ExamPrep.' },
    { title: '🏆 Leaderboard update',             body: "Others are practising right now. Don't let them pass you." },
    { title: '🔥 Keep your streak',               body: "Your streak is on the line. Quick practice now." },
    { title: '📐 Midday brain boost',             body: 'Your recall is sharpest mid-day. Use it.' },
    { title: '🧠 12pm knowledge session',         body: 'Top students practise daily. Today is your day.' },
  ],
  afternoon: [
    { title: "⏰ 4pm — golden study hour",        body: 'This is when your brain retains best. Start now.' },
    { title: '📖 Afternoon session time',         body: 'Lock in Chemistry, Physics, Maths — before the day ends.' },
    { title: '🎯 One topic. 10 minutes.',         body: "That's your 4pm assignment. Open ExamPrep." },
    { title: '⭐ XP is waiting for you',          body: 'Earn points, climb the leaderboard. Just 5 questions.' },
    { title: '🔬 Subject drill at 4pm',           body: "Pick a subject and hammer it. You'll thank yourself." },
    { title: '📊 Progress update time',           body: "Check how you're tracking. Then practise a little." },
    { title: '💡 4pm power move',                 body: 'Students who practise in the afternoon retain 35% more.' },
    { title: '🚀 Push through the 4pm slump',    body: "Don't nap — practise. 5 questions and you're done." },
  ],
  evening: [
    { title: "🌙 8pm — last call to practise",   body: 'One quick session before you wind down. Let\'s go.' },
    { title: '🔥 End the day strong',            body: "Don't go to bed without hitting your practice goal." },
    { title: '⭐ Night-time XP run',             body: 'Quiet. Focused. Perfect time to earn points.' },
    { title: '📚 Before-bed revision',           body: 'Sleep locks in what you learned tonight. Practise first.' },
    { title: "🎯 Beat today's target",           body: 'How many questions did you do today? Add a few more.' },
    { title: '🌟 Evening challenge',             body: 'One topic. Before bed. That\'s all we ask.' },
    { title: '💪 Night grind',                  body: "The exam won't wait. Neither should you. Quick session." },
    { title: '🏅 Close out the day right',      body: 'Practise tonight. Wake up sharper tomorrow.' },
  ],
}

function pickMessage(slot: string) {
  const pool = MESSAGES[slot as keyof typeof MESSAGES] ?? MESSAGES.noon
  // Seed by UTC date so all users get the same message on a given day
  const seed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10)
  return pool[seed % pool.length]
}

// ── Batching ──────────────────────────────────────────────────────────────────
// Each invocation handles one page of subscribers, then hands the next page to
// a fresh invocation of itself. That keeps every run well inside Edge Function
// CPU/time limits (web-push encryption is CPU-heavy) and avoids Supabase's
// 1,000-row response cap, which previously meant only the first 1,000
// subscribers were ever notified.
const PAGE_SIZE   = 500
const CONCURRENCY = 50

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

function authorized(req: Request): boolean {
  // Only the server (service role key) may trigger a blast. Supabase's default
  // JWT check alone would also accept the public anon key that ships in the app.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  return serviceKey.length > 0 && auth === `Bearer ${serviceKey}`
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
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

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // One page of active subscriptions, in a stable order.
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('active', true)
    .order('id')
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    console.error('DB read error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  // Hand the next page to a new invocation before doing this page's work.
  // (Stale subscriptions are marked inactive only after sending, so offsets
  // stay stable for the pages that follow.)
  if ((subs?.length ?? 0) === PAGE_SIZE) {
    const next = fetch(req.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization')! },
      body:    JSON.stringify({ ...parsedBody, offset: offset + PAGE_SIZE }),
    }).catch(err => console.error('next page trigger failed:', err?.message ?? err))
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(next)
    else await next
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, offset }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build payload — custom blast uses supplied fields, scheduled uses message pool
  const payload = isCustom
    ? JSON.stringify({
        title: String(parsedBody.title).trim(),
        body:  String(parsedBody.body).trim(),
        url:   parsedBody.url?.trim() || '/student/practice',
        tag:   parsedBody.tag?.trim() || 'ep-custom',
      })
    : (() => {
        const msg = pickMessage(slot)
        return JSON.stringify({ title: msg.title, body: msg.body, url: '/student/practice', tag: `ep-${slot}` })
      })()

  // Send in small concurrent batches.
  const staleIds: string[] = []
  for (let i = 0; i < subs.length; i += CONCURRENCY) {
    await Promise.allSettled(
      subs.slice(i, i + CONCURRENCY).map(async ({ id, subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload)
        } catch (err: any) {
          // 410 Gone / 404 = browser unsubscribed. Mark inactive so we stop sending.
          if (err?.statusCode === 410 || err?.statusCode === 404) staleIds.push(id)
          else console.warn(`Push failed for ${id}:`, err?.message ?? err)
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
    mode:   isCustom ? 'custom' : 'scheduled',
    slot:   isCustom ? null : slot,
    offset,
    sent:   subs.length - staleIds.length,
    stale:  staleIds.length,
  }
  console.log('send-notifications:', result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})
