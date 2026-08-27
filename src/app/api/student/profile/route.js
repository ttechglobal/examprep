// src/app/api/student/profile/route.js
// GET  — fetch full student profile
// PATCH — update editable fields

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Columns that actually exist in the profiles table.
// bio, first_name, last_name, state, country do NOT exist.
const SELECT_COLS = [
  'id', 'username', 'full_name', 'class_level', 'email',
  'school_id', 'school_name',
  'exam_type', 'exam_types',
  'subjects', 'subjects_waec', 'subjects_jamb',
  'total_points', 'streak_days',
  'target_waec', 'target_jamb', 'target_jamb_breakdown',
  'target_university', 'target_course',
  'onboarded', 'created_at',
].join(', ')

const ALLOWED_PATCH = [
  'username', 'full_name', 'class_level',
  'school_name',
  'exam_type', 'exam_types',
  'subjects_waec', 'subjects_jamb',
  'target_waec', 'target_jamb', 'target_jamb_breakdown',
  'target_university', 'target_course',
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db()
    .from('profiles')
    .select(SELECT_COLS)
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
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const updates = {}
  for (const key of ALLOWED_PATCH) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await db().from('profiles').update(updates).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: Object.keys(updates) })
}