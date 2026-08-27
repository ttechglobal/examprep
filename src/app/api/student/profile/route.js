// src/app/api/student/profile/route.js
// GET  — fetch full student profile
// PATCH — update editable fields (name, username, bio, school, class, goals, subjects)

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db()
    .from('profiles')
    .select('id, username, full_name, first_name, last_name, bio, email, country, state, school_id, class_level, exam_type, subjects, subjects_waec, subjects_jamb, total_points, streak_days, target_waec, target_jamb, target_university, target_course, created_at')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, email: user.email })
}

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Whitelist of editable fields
  const allowed = ['username','full_name','first_name','last_name','bio','country','state','school_id','class_level','exam_type','subjects_waec','subjects_jamb','target_waec','target_jamb','target_university','target_course']
  const updates = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await db().from('profiles').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: Object.keys(updates) })
}