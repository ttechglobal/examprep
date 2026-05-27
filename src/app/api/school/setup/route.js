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
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { schoolName, city, state, address } = await request.json()

  if (!schoolName?.trim()) {
    return NextResponse.json({ error: 'School name is required' }, { status: 400 })
  }

  // Create school using service role (bypasses RLS)
  const { data: school, error: schoolError } = await service
    .from('schools')
    .insert({
      name: schoolName.trim(),
      city: city?.trim() ?? '',
      state: state ?? '',
      address: address?.trim() ?? '',
      setup_complete: false,
    })
    .select()
    .single()

  if (schoolError) {
    return NextResponse.json({ error: schoolError.message }, { status: 500 })
  }

  // Update profile with school_id and role
  const { error: profileError } = await service
    .from('profiles')
    .update({
      school_id: school.id,
      role: 'school_admin',
    })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ school })
}