// src/app/api/admin/schools/route.js
// GET  — list all schools with student counts
// POST — create a new school

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = svc()

  const { data: schools } = await db
    .from('schools')
    .select('id, name, city, state, created_at, is_active')
    .order('created_at', { ascending: false })

  // Get student counts per school
  const schoolIds = (schools ?? []).map(s => s.id)
  const { data: profiles } = await db
    .from('profiles')
    .select('school_id')
    .in('school_id', schoolIds)
    .eq('role', 'student')

  const countMap = {}
  for (const p of profiles ?? []) {
    countMap[p.school_id] = (countMap[p.school_id] ?? 0) + 1
  }

  // Get cohort counts
  const { data: cohorts } = await db
    .from('cohorts')
    .select('school_id, is_active')
    .in('school_id', schoolIds)

  const cohortMap = {}
  for (const c of cohorts ?? []) {
    if (!cohortMap[c.school_id]) cohortMap[c.school_id] = { total: 0, active: 0 }
    cohortMap[c.school_id].total++
    if (c.is_active) cohortMap[c.school_id].active++
  }

  const enriched = (schools ?? []).map(s => ({
    ...s,
    studentCount: countMap[s.id] ?? 0,
    cohortCount:  cohortMap[s.id]?.total ?? 0,
    activeCohort: (cohortMap[s.id]?.active ?? 0) > 0,
  }))

  return NextResponse.json({ schools: enriched })
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = svc()

  const body = await request.json()
  const { name, city, state } = body
  if (!name?.trim()) return NextResponse.json({ error: 'School name required' }, { status: 400 })

  const { data, error } = await db
    .from('schools')
    .insert({ name: name.trim(), city: city?.trim() ?? null, state: state?.trim() ?? null, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ school: data })
}