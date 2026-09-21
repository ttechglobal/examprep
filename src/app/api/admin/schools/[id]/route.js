// src/app/api/admin/schools/[id]/route.js
//
// GET   /api/admin/schools/[id]
//   Full school profile: school row, admin contact, students, cohorts, slot history.
//
// PATCH /api/admin/schools/[id]
//   { slots_purchased: number, note?: string }
//   Updates slots_purchased on the school and writes an audit row to
//   school_slot_changes. Returns the updated school + new history entry.

import { requireAdmin }              from '@/lib/adminAuth'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

function db() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

  const svc = db()

  // 1. School row
  const { data: school, error: schoolError } = await svc
    .from('schools')
    .select('id, name, city, state, is_active, slots_purchased, slots_used, created_at, setup_complete')
    .eq('id', id)
    .single()

  if (schoolError || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  // 2. Admin profile (name from profiles, email comes from auth)
  const { data: adminProfile } = await svc
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'school_admin')
    .eq('school_id', id)
    .maybeSingle()

  // 3. Get admin email from auth.users (profiles.email may be null)
  let adminEmail = adminProfile?.email ?? null
  if (adminProfile?.id && !adminEmail) {
    try {
      const { data: authUser } = await svc.auth.admin.getUserById(adminProfile.id)
      adminEmail = authUser?.user?.email ?? null
    } catch { /* non-fatal */ }
  }

  // 4. Student count + list (profiles linked to this school)
  const { data: students } = await svc
    .from('profiles')
    .select('id, full_name, username, email, exam_type, total_points, created_at, plan')
    .eq('school_id', id)
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(100)

  // 5. Cohorts
  const { data: cohorts } = await svc
    .from('cohorts')
    .select('id, name, session, invite_code, invite_active, is_active, created_at')
    .eq('school_id', id)
    .order('created_at', { ascending: false })

  // 6. Slot change history (newest first)
  const { data: slotHistory } = await svc
    .from('school_slot_changes')
    .select('id, old_slots, new_slots, note, created_at')
    .eq('school_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    school,
    admin: {
      name:  adminProfile?.full_name ?? null,
      email: adminEmail,
      id:    adminProfile?.id ?? null,
    },
    students:    students    ?? [],
    cohorts:     cohorts     ?? [],
    slotHistory: slotHistory ?? [],
  })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(request, { params }) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { slots_purchased, note } = body

  if (typeof slots_purchased !== 'number' || !Number.isInteger(slots_purchased) || slots_purchased < 0) {
    return NextResponse.json({ error: 'slots_purchased must be a non-negative integer' }, { status: 400 })
  }

  const svc = db()

  // Read current value first so we can write the audit row
  const { data: current, error: readError } = await svc
    .from('schools')
    .select('slots_purchased')
    .eq('id', id)
    .single()

  if (readError || !current) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  const oldSlots = current.slots_purchased ?? 0

  if (oldSlots === slots_purchased) {
    return NextResponse.json({ error: 'New slot count is the same as current — no change made' }, { status: 400 })
  }

  // Update the school
  const { data: updatedSchool, error: updateError } = await svc
    .from('schools')
    .update({ slots_purchased })
    .eq('id', id)
    .select('id, name, slots_purchased, slots_used')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Write audit row — never blocks the response even if it fails
  const { data: auditRow, error: auditError } = await svc
    .from('school_slot_changes')
    .insert({
      school_id:  id,
      old_slots:  oldSlots,
      new_slots:  slots_purchased,
      note:       note?.trim() ?? null,
    })
    .select()
    .single()

  if (auditError) {
    // Log but don't fail — the slot update succeeded; audit is secondary
    console.error('[admin/schools/[id]] audit insert failed:', auditError.message)
  }

  return NextResponse.json({
    school:   updatedSchool,
    auditRow: auditRow ?? null,
  })
}