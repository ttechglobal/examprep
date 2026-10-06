// src/app/api/school/setup/route.js
//
// PATCH — the school's details, from the Settings tab of the school dashboard.
// Only the school's own admin may change them; role and school_id never change.
//
// v2: POST (create a school for the signed-in user) is gone. It let any signed-in
// student make themselves a school admin with free slots. Schools are created
// only by /api/school/signup, together with a new account.

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { normalizePhone, phoneProblem } from '@/lib/auth/phone'

const svc = supabaseAdmin

// ── PATCH — update existing school info ────────────────────────────────────────
// Used by the Settings tab in the school dashboard.
// Body: { schoolName, city?, state?, contactName?, contactPhone? }
// Only the school's details and contact — never role or school_id.
export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { schoolName, city, state, contactName, contactPhone } = body
  if (typeof schoolName !== 'string' || !schoolName.trim()) return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  const patch = {
    name: schoolName.trim().slice(0, 120),
    city: typeof city === 'string' ? city.trim().slice(0, 60) : '',
    state: typeof state === 'string' ? state.slice(0, 60) : '',
  }
  if (typeof contactName === 'string' && contactName.trim()) patch.contact_name = contactName.trim().slice(0, 80)
  if (typeof contactPhone === 'string' && contactPhone.trim()) {
    const problem = phoneProblem(contactPhone)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    patch.contact_phone = normalizePhone(contactPhone)
  }

  const db = svc()

  // Get this admin's school_id
  const { data: profile } = await db
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'school_admin' || !profile?.school_id) {
    return NextResponse.json({ error: 'No school found for this account' }, { status: 403 })
  }

  const { data: school, error: updateError } = await db
    .from('schools')
    .update(patch)
    .eq('id', profile.school_id)
    .select('id, name, city, state, contact_name, contact_email, contact_phone')
    .single()

  if (updateError) {
    console.error('[school/setup PATCH] update error:', updateError)
    return NextResponse.json({ error: 'Could not save your school details' }, { status: 500 })
  }

  return NextResponse.json({ school })
}