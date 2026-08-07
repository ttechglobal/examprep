// src/app/api/student/topics/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/topics?subjectId=xxx
//
// Returns all active topics for a subject, ordered by sort order.
// Used by the practice setup page's "By Topic" mode selector.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')

  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const db = svc()

  const { data, error } = await db
    .from('topics')
    .select('id, name, slug, order_index')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}