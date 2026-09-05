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

// Core columns guaranteed to exist in the profiles table.
const SELECT_COLS_SAFE = [
  'id', 'username', 'full_name', 'class_level',
  'school_id', 'school_name',
  'exam_type', 'subjects',
  'total_points', 'streak_days',
  'target_waec', 'target_jamb', 'target_jamb_breakdown',
  'target_university', 'target_course',
  'created_at',
].join(', ')

// Extended columns added by migration (may not exist yet).
const SELECT_COLS_EXT = SELECT_COLS_SAFE + ', exam_types, subjects_waec, subjects_jamb, onboarded, plan, plan_expires_at'

// Try extended select; fall back to safe if the DB rejects unknown columns.
async function selectProfile(db, userId) {
  const { data, error } = await db
    .from('profiles').select(SELECT_COLS_EXT).eq('id', userId).single()
  if (!error) return { data }
  const fallback = await db
    .from('profiles').select(SELECT_COLS_SAFE).eq('id', userId).single()
  return fallback
}

const SELECT_COLS = SELECT_COLS_EXT

const ALLOWED_PATCH = [
  'username', 'full_name', 'class_level',
  // school_name is intentionally excluded — it must only be set by the
  // access-code redeem route or /api/school/join, not by the student directly.
  // Allowing free-text here breaks the school dashboard's data integrity.
  'exam_type', 'exam_types',
  'subjects_waec', 'subjects_jamb',
  'target_waec', 'target_jamb', 'target_jamb_breakdown',
  'target_university', 'target_course',
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await selectProfile(db(), user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalise missing columns so clients always get the same shape
  const examType = data.exam_types?.[0] ?? data.exam_type ?? 'WAEC'
  const normalised = {
    ...data,
    email:         user.email,
    exam_type:     examType,
    exam_types:    data.exam_types    ?? [examType],
    subjects_waec: data.subjects_waec ?? (examType === 'WAEC' ? (data.subjects ?? []) : []),
    subjects_jamb: data.subjects_jamb ?? (examType === 'JAMB' ? (data.subjects ?? []) : []),
    onboarded:     data.onboarded     ?? true,
    plan:          data.plan          ?? 'free',
    plan_expires_at: data.plan_expires_at ?? null,
  }
  return NextResponse.json(normalised)
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