// src/app/api/admin/notifications/route.js
//
// POST { title, body, url, tag }
//   → forwards to the Supabase Edge Function as a custom push blast
//
// Proxies from the admin UI so the Edge Function URL and secret key never
// touch the client. Response: { ok, delivered, failed, stale, more_pages, first_error }.
//
// v2: sends the Supabase secret key (sb_secret_…, held in SUPABASE_SERVICE_ROLE_KEY
//     until the env vars are renamed) in the `apikey` header, as secret keys
//     require. Errors no longer echo the function's raw reply.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

const EDGE_URL   = process.env.SUPABASE_EDGE_URL      // https://xxx.supabase.co/functions/v1/send-notifications
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req) {
  const adminError = await requireAdmin()
  if (adminError) return adminError

  try {
    const { title, body, url, tag } = await req.json()

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    if (!EDGE_URL || !SECRET_KEY) {
      return NextResponse.json({ error: 'Edge Function not configured' }, { status: 500 })
    }

    const res = await fetch(EDGE_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':       SECRET_KEY,
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

    if (!res.ok) {
      console.error('[admin/notifications] Edge Function error:', res.status, (await res.text().catch(() => '')).slice(0, 300))
      const error = res.status === 401
        ? 'The notification function refused the key. Check SUPABASE_SERVICE_ROLE_KEY holds a current secret key (sb_secret_…).'
        : `The notification function failed (HTTP ${res.status}). See the function logs in Supabase.`
      return NextResponse.json({ error }, { status: 502 })
    }

    const data = await res.json().catch(() => ({}))
    return NextResponse.json({
      ok:          true,
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