// src/app/api/admin/notifications/audience/route.js
// GET ?kind=all|user|exam|plan|inactive|expiring[&value=…]
// → { devices, students }: how many phones a message to that audience would
// reach (only devices with notifications turned on count). One small SQL call.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { checkAudience } from '@/lib/notifications'

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const params = new URL(request.url).searchParams
  const audience = checkAudience({ kind: params.get('kind') ?? 'all', value: params.get('value') })
  if (!audience) return NextResponse.json({ error: 'Choose who this goes to.' }, { status: 400 })

  try {
    const { data, error } = await supabaseAdmin()
      .rpc('notification_audience_count', { p_kind: audience.kind, p_value: audience.value })
    if (error) throw error
    return NextResponse.json({ devices: data?.devices ?? 0, students: data?.students ?? 0 },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[admin/notifications/audience]', e?.message ?? e)
    return NextResponse.json({ error: 'Could not count the audience' }, { status: 500 })
  }
}
