import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body = {}
  try { body = await request.json() } catch {}

  // Only the school's own admin may mark its setup complete.
  const { data: profile } = await service
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'school_admin' || !profile?.school_id) {
    return NextResponse.json({ error: 'School admin access only' }, { status: 403 })
  }
  if (body.school_id && body.school_id !== profile.school_id) {
    return NextResponse.json({ error: 'Not your school' }, { status: 403 })
  }

  await service
    .from('schools')
    .update({ setup_complete: true })
    .eq('id', profile.school_id)

  return NextResponse.json({ success: true })
}