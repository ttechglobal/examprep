// src/app/api/admin/users/[id]/route.js
// DELETE /api/admin/users/[id]
// Permanently deletes a student from auth.users (which cascades to profiles
// if you have the on-delete trigger set up, otherwise we delete manually).
// v2: only students can be deleted here (not school admins), and the deletion
//     is recorded in the activity log with who did it. The log entry keeps the
//     student's name and contact, since the account itself is gone.

import { adminContext, actorOf } from '@/lib/adminAuth'
import { supabaseAdmin }         from '@/lib/server/supabaseAdmin'
import { UUID_RE } from '@/lib/uuid'
import { NextResponse }          from 'next/server'

export async function DELETE(_request, { params }) {
  const { admin, error: authError } = await adminContext()
  if (authError) return authError

  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid student' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: student, error: readError } = await db.from('profiles')
    .select('full_name, username, email, phone_number, role').eq('id', id).maybeSingle()
  if (readError) {
    console.error('[admin/users/:id] DELETE read:', readError.message)
    return NextResponse.json({ error: 'Could not delete the student' }, { status: 500 })
  }
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  if ((student.role ?? 'student') !== 'student') return NextResponse.json({ error: 'Only student accounts can be deleted here' }, { status: 400 })

  // Supabase cascades to profiles when the FK allows; the profile delete below
  // covers projects where it doesn't (a no-op otherwise).
  const { error: deleteError } = await db.auth.admin.deleteUser(id)
  if (deleteError) {
    console.error('[admin/users/:id] DELETE:', deleteError.message)
    return NextResponse.json({ error: 'Could not delete the student' }, { status: 500 })
  }
  await db.from('profiles').delete().eq('id', id)

  const name = student.full_name?.trim() || student.username || 'a student'
  const { error: logError } = await db.rpc('log_activity', {
    p_actor: actorOf(admin), p_action: 'student.delete', p_summary: `Deleted ${name}'s account`,
    p_school: null, p_student: null,
    p_details: { student_id: id, name, username: student.username, email: student.email, phone: student.phone_number },
  })
  if (logError) console.error('[admin/users/:id] DELETE log:', logError.message)

  return NextResponse.json({ deleted: true })
}
