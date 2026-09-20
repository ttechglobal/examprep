// src/app/api/push/subscribe/route.js
//
// POST  { device_id, subscription }
//   → upserts into push_subscriptions
//   → if user is logged in, backfills user_id too
//
// DELETE ?device_id=<id>
//   → marks subscription inactive

import { createClient as svc } from '@supabase/supabase-js'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse }        from 'next/server'

// Service role — needed to write to push_subscriptions without RLS friction
const db = () => svc(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export async function POST(req) {
  try {
    const { device_id, subscription } = await req.json()

    if (!device_id || !subscription) {
      return NextResponse.json({ error: 'Missing device_id or subscription' }, { status: 400 })
    }

    // Try to get logged-in user — null is fine (guest)
    let user_id = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      user_id = user?.id ?? null
    } catch {}

    const { error } = await db()
      .from('push_subscriptions')
      .upsert(
        {
          device_id,
          subscription,
          user_id,
          active:     true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      )

    if (error) {
      console.error('[push/subscribe] DB error:', error.message)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[push/subscribe] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    // Body on DELETE is unreliable — read device_id from query param instead
    const device_id = req.nextUrl.searchParams.get('device_id')
    if (!device_id) return NextResponse.json({ error: 'Missing device_id' }, { status: 400 })

    await db()
      .from('push_subscriptions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('device_id', device_id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}