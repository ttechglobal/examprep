// supabase/functions/send-notifications/index.ts
//
// Called by pg_cron three times daily with { slot: 'noon' | 'afternoon' | 'evening' }
// Reads all active push subscriptions and sends Web Push to each one.
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

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Validate method
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Parse body — supports scheduled slots and custom admin blasts
  let parsedBody: Record<string, string> = {}
  try {
    parsedBody = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const isCustom = parsedBody.custom === true || (parsedBody as any).custom === 'true'
  const slot     = parsedBody.slot ?? 'noon'

  if (!isCustom && !['noon', 'afternoon', 'evening'].includes(slot)) {
    return new Response('Invalid slot', { status: 400 })
  }

  if (isCustom && (!parsedBody.title?.trim() || !parsedBody.body?.trim())) {
    return new Response('Custom blast requires title and body', { status: 400 })
  }

  // Set up VAPID
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  // Supabase service role client — bypasses RLS
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch all active subscriptions
  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('active', true)

  if (error) {
    console.error('DB read error:', error.message)
    return new Response('DB error', { status: 500 })
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build payload — custom blast uses supplied fields, scheduled uses message pool
  let payload: string
  if (isCustom) {
    payload = JSON.stringify({
      title: parsedBody.title.trim(),
      body:  parsedBody.body.trim(),
      url:   parsedBody.url?.trim() || '/student/practice',
      tag:   parsedBody.tag?.trim() || 'ep-custom',
    })
  } else {
    const msg = pickMessage(slot)
    payload = JSON.stringify({
      title: msg.title,
      body:  msg.body,
      url:   '/student/practice',
      tag:   `ep-${slot}`,
    })
  }

  // Send to all subscriptions concurrently
  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async ({ id, subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload)
      } catch (err: any) {
        // 410 Gone = browser unsubscribed. Mark inactive so we stop sending.
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(id)
        } else {
          // Log but don't crash — one bad subscription shouldn't block others
          console.warn(`Push failed for ${id}:`, err?.message ?? err)
        }
      }
    })
  )

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await db
      .from('push_subscriptions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .in('id', staleIds)
  }

  const result = {
    mode:  isCustom ? 'custom' : 'scheduled',
    slot:  isCustom ? null : slot,
    sent:  subs.length - staleIds.length,
    stale: staleIds.length,
  }
  console.log('send-notifications:', result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  })
})