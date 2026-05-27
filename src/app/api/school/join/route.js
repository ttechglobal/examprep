import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code?.trim()) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  // Find cohort by code
  const { data: cohort } = await service
    .from('cohorts')
    .select('id, name, school_id, invite_active, is_active, schools(name)')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .single()

  if (!cohort) {
    return NextResponse.json({ error: 'Invalid code — check and try again' }, { status: 404 })
  }

  if (!cohort.invite_active || !cohort.is_active) {
    return NextResponse.json({ error: 'This cohort is no longer accepting new members' }, { status: 400 })
  }

  // Check if already a member
  const { data: existing } = await service
    .from('cohort_members')
    .select('id')
    .eq('cohort_id', cohort.id)
    .eq('student_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({
      error: 'You\'re already in this cohort',
      cohort: { name: cohort.name, school: cohort.schools?.name }
    }, { status: 400 })
  }

  // Add to cohort
  await service
    .from('cohort_members')
    .insert({ cohort_id: cohort.id, student_id: user.id })

  // Update profile with cohort_id and school_id
  await service
    .from('profiles')
    .update({ cohort_id: cohort.id, school_id: cohort.school_id })
    .eq('id', user.id)

  return NextResponse.json({
    success: true,
    cohort: { name: cohort.name, school: cohort.schools?.name }
  })
}