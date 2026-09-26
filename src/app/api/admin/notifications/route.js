// src/app/api/admin/notifications/route.js
//
// POST { title, body, url, tag }
//   → forwards to the Supabase Edge Function as a custom push blast
//
// Proxies from the admin UI so the Edge Function URL and service role key
// never touch the client.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

const EDGE_URL     = process.env.SUPABASE_EDGE_URL      // https://xxx.supabase.co/functions/v1/send-notifications
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req) {
  const adminError = await requireAdmin()
  if (adminError) return adminError

  try {
    const { title, body, url, tag } = await req.json()

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    if (!EDGE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Edge Function not configured' }, { status: 500 })
    }

    const res = await fetch(EDGE_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        // Signal to the Edge Function that this is a custom blast, not a slot
        custom: true,
        title:  title.trim(),
        body:   body.trim(),
        url:    url?.trim() || '/student/practice',
        tag:    tag?.trim() || 'ep-custom',
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('[admin/notifications] Edge Function error:', data)
      return NextResponse.json({ error: 'Edge Function failed', detail: data }, { status: 502 })
    }

    return NextResponse.json({ ok: true, ...data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[admin/notifications] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}