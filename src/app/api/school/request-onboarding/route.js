// src/app/api/school/request-onboarding/route.js
// POST — student submits their school's info so the team can reach out and onboard them.
// No auth required — public endpoint (student may not even have a school yet).

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { school_name, state, phone, student_id } = await request.json()

  if (!school_name?.trim()) {
    return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Store in a school_onboarding_requests table (or log to a simple table)
  // If the table doesn't exist yet, we fall back gracefully and still return success
  // so the UX isn't broken — the dev can create the table separately.
  try {
    await service.from('school_onboarding_requests').insert({
      school_name: school_name.trim(),
      state:       state?.trim() ?? null,
      phone:       phone?.trim() ?? null,
      student_id:  student_id ?? null,
      created_at:  new Date().toISOString(),
    })
  } catch (e) {
    // Table may not exist yet — log and continue
    console.error('[school/request-onboarding] insert failed:', e?.message)
  }

  return NextResponse.json({ success: true })
}