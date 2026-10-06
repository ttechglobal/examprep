// src/app/api/admin/notifications/students/route.js
// GET ?q=<name, username, phone, email or school>
// → [{ id, name, username, phone, school }]: up to 6 students, to pick one to
// message. A single small query; none of the Students page's counting.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { searchText, shapeStudent } from '@/lib/server/adminStudents'

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const search = searchText(new URL(request.url).searchParams.get('q'))
  if (!search || search.length < 2) return NextResponse.json([])

  try {
    const { data, error } = await supabaseAdmin().rpc('admin_students', {
      p_year: null, p_filter: 'all', p_school: null, p_search: search,
      p_sort: 'name', p_limit: 6, p_offset: 0,
    })
    if (error) throw error
    return NextResponse.json((data ?? []).map(shapeStudent).map(s => ({
      id: s.id, name: s.name, username: s.username, phone: s.phone, school: s.school,
    })), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[admin/notifications/students]', e?.message ?? e)
    return NextResponse.json({ error: 'Could not search students' }, { status: 500 })
  }
}
