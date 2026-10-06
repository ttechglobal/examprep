// src/app/api/admin/activity/route.js
// GET /api/admin/activity — the activity log, newest first, 50 at a time.
//   type     all | subscriptions | schools | students | team
//   school   a school id (its slot and student changes)
//   student  a student id
//   q        search the summaries and who did it
//   before   an entry id: the page after it ("Load more")
// Response: { entries: [{ id, at, actor_type, actor_name, action, summary, school_id, student_id, details }], more }

import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { UUID_RE } from '@/lib/uuid'

const PAGE = 50
const TYPE_PREFIX = { subscriptions: 'subscription.', schools: 'school.', students: 'student.', team: 'admin.' }

export async function GET(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const params = new URL(request.url).searchParams
  const type = params.get('type') ?? 'all'
  const school = params.get('school')
  const student = params.get('student')
  const before = Number.parseInt(params.get('before'), 10)
  const search = params.get('q')?.trim().slice(0, 80).replace(/[%_,()]/g, ' ') || null
  if (type !== 'all' && !TYPE_PREFIX[type]) return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  if ((school && !UUID_RE.test(school)) || (student && !UUID_RE.test(student))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    let query = supabaseAdmin().from('activity_log')
      .select('id, at, actor_type, actor_name, action, summary, school_id, student_id, details')
      .order('id', { ascending: false }).limit(PAGE + 1)
    if (TYPE_PREFIX[type]) query = query.like('action', `${TYPE_PREFIX[type]}%`)
    if (school) query = query.eq('school_id', school)
    if (student) query = query.eq('student_id', student)
    if (Number.isFinite(before)) query = query.lt('id', before)
    if (search) query = query.or(`summary.ilike.%${search}%,actor_name.ilike.%${search}%`)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ entries: (data ?? []).slice(0, PAGE), more: (data ?? []).length > PAGE },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[admin/activity] GET:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load the activity log' }, { status: 500 })
  }
}
