// src/app/api/admin/schools/[id]/students/route.js
// GET -> { students }: the school's roster with each student's Premium
// (lib/server/schoolSlots schoolRoster), most recently added first.
// Separate from GET /api/admin/schools/[id] so the school panel can open
// without waiting for the whole roster.

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE }       from '@/lib/uuid'
import { schoolRoster }  from '@/lib/server/schoolSlots'

export async function GET(_request, { params }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  if (!UUID_RE.test(id ?? '')) return NextResponse.json({ error: 'Invalid school' }, { status: 400 })

  try {
    const students = await schoolRoster(supabaseAdmin(), id)
    return NextResponse.json({ students }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/schools/:id/students] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the students' }, { status: 500 })
  }
}
