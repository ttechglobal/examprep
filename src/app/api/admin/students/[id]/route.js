// src/app/api/admin/students/[id]/route.js
// GET   → one student for the Students page panel: { student, subscriptions }
//         subscriptions: the ledger, newest first (cancelled ones included)
// PATCH → edit { name, school } (the school the student typed). Phone and
//         email are how the student signs in, so they aren't changed here.
//         The change is recorded in the activity log.
// Deleting a student: DELETE /api/admin/users/[id].

import { requireAdmin, adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { loadStudentPanel } from '@/lib/server/adminStudents'
import { UUID_RE } from '@/lib/uuid'

export async function GET(_request, { params }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid student' }, { status: 400 })
  try {
    const result = await loadStudentPanel(supabaseAdmin(), id)
    if (!result) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/students/:id] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the student' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid student' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : null
  const school = typeof body.school === 'string' ? body.school.trim().replace(/\s+/g, ' ') : null
  if (name !== null && (name.length < 2 || name.length > 80)) return NextResponse.json({ error: 'Enter a name of 2–80 characters' }, { status: 400 })
  if (school !== null && school.length > 120) return NextResponse.json({ error: 'School name is too long' }, { status: 400 })
  if (name === null && school === null) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const { error } = await db.rpc('admin_update_student', { p_actor: actorOf(admin), p_student: id, p_name: name, p_school: school })
    if (error) {
      if (/not_found/.test(error.message ?? '')) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      throw error
    }
    const result = await loadStudentPanel(db, id)
    if (!result) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[admin/students/:id] PATCH:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not save the changes' }, { status: 500 })
  }
}
