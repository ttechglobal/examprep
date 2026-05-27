import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// GET — fetch school's active cohort + members
export async function GET() {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await service
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) {
    return NextResponse.json({ cohort: null, members: [] })
  }

  const { data: cohort } = await service
    .from('cohorts')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!cohort) {
    return NextResponse.json({ cohort: null, members: [] })
  }

  const { data: members } = await service
    .from('cohort_members')
    .select('student_id, joined_at, profiles(full_name, exam_type, subjects)')
    .eq('cohort_id', cohort.id)
    .order('joined_at', { ascending: false })

  return NextResponse.json({ cohort, members: members ?? [] })
}

// POST — create new cohort
export async function POST(request) {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, session, invite_code, school_id: bodySchoolId } = await request.json()

  // Get school_id from body (onboarding) or profile (dashboard)
  let schoolId = bodySchoolId
  if (!schoolId) {
    const { data: profile } = await service
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()
    schoolId = profile?.school_id
  }

  if (!schoolId) {
    return NextResponse.json({ error: 'No school assigned' }, { status: 403 })
  }

  // Archive existing active cohort
  await service
    .from('cohorts')
    .update({ is_active: false })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  const code = invite_code ?? generateInviteCode()

  const { data: cohort, error } = await service
    .from('cohorts')
    .insert({
      school_id: schoolId,
      name,
      session,
      invite_code: code,
      invite_active: true,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cohort })
}