// src/app/api/school/setup/route.js
//
// POST — called during school signup to:
//   1. Insert a row into the schools table with the real school name
//   2. Update profiles.role = 'school_admin'  (overrides the trigger default of 'student')
//   3. Link profiles.school_id to the new school
//
// Uses the service role key to bypass RLS — this is intentional and
// required because the trigger sets role='student' on every new user
// and the anon/user role cannot update their own role column.
//
// The caller MUST be authenticated (we verify the session before acting).

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  // Verify the user has an active session first — we never promote
  // an unauthenticated request to school_admin.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { schoolName, city, state } = body

  if (!schoolName?.trim()) {
    return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  }

  const db = svc()

  // Check if this user already has a school (avoid duplicate school records
  // if the user retries after a partial failure).
  const { data: existingProfile } = await db
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (existingProfile?.role === 'school_admin' && existingProfile?.school_id) {
    // Already set up correctly — idempotent success.
    const { data: existingSchool } = await db
      .from('schools')
      .select()
      .eq('id', existingProfile.school_id)
      .single()
    return NextResponse.json({ school: existingSchool })
  }

  // Create the school record.
  const { data: school, error: schoolError } = await db
    .from('schools')
    .insert({
      name:  schoolName.trim(),
      city:  city?.trim()  ?? '',
      state: state         ?? '',
    })
    .select()
    .single()

  if (schoolError) {
    console.error('[school/setup] school insert error:', schoolError)
    return NextResponse.json({ error: schoolError.message }, { status: 500 })
  }

  // Update the profile: set role='school_admin' and link school_id.
  // This MUST use the service role — the user's own JWT cannot update
  // the role column due to RLS policies.
  const { error: profileError } = await db
    .from('profiles')
    .update({
      school_id: school.id,
      role:      'school_admin',
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[school/setup] profile update error:', profileError)
    // Roll back the school record so we don't leave orphans.
    await db.from('schools').delete().eq('id', school.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ school })
}