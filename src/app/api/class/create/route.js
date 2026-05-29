// src/app/api/class/create/route.js
// POST /api/class/create
// Creates a new class and sets the creator as owner + first member.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
  if (name.trim().length > 50) return NextResponse.json({ error: 'Name must be 50 chars or less' }, { status: 400 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Generate a unique code
  let invite_code
  let attempts = 0
  while (attempts < 10) {
    const code = generateInviteCode()
    const { data: existing } = await service.from('classes').select('id').eq('invite_code', code).maybeSingle()
    if (!existing) { invite_code = code; break }
    attempts++
  }
  if (!invite_code) return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })

  // Create the class
  const { data: newClass, error } = await service
    .from('classes')
    .insert({ name: name.trim(), owner_id: user.id, invite_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Set class_id on creator's profile (leave any existing school cohort untouched)
  await service.from('profiles').update({ class_id: newClass.id }).eq('id', user.id)

  return NextResponse.json({ class: newClass })
}