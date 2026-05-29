// src/app/api/class/join/route.js
// POST /api/class/join  — join a class by invite code (leaves current class if any)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code?.trim()) return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: foundClass } = await service
    .from('classes')
    .select('id, name, owner_id, is_active')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .maybeSingle()

  if (!foundClass) return NextResponse.json({ error: 'Invalid code — check and try again' }, { status: 404 })
  if (!foundClass.is_active) return NextResponse.json({ error: 'This class is no longer active' }, { status: 400 })

  // Update profile — leaves any previous class automatically (single class_id column)
  const { error } = await service
    .from('profiles')
    .update({ class_id: foundClass.id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, class: { id: foundClass.id, name: foundClass.name } })
}