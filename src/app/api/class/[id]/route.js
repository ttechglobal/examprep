// src/app/api/class/[id]/route.js
// PATCH /api/class/[id] — rename class or regenerate invite code (owner only)
// DELETE /api/class/[id] — dissolve class, clears class_id from all members (owner only)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function getOwnerGuard(service, userId, classId) {
  const { data } = await service
    .from('classes')
    .select('id, owner_id, is_active')
    .eq('id', classId)
    .maybeSingle()
  if (!data) return { error: 'Class not found', status: 404 }
  if (!data.is_active) return { error: 'Class is no longer active', status: 400 }
  if (data.owner_id !== userId) return { error: 'Only the class owner can do this', status: 403 }
  return { ok: true }
}

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const guard = await getOwnerGuard(service, user.id, id)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { name, regenerate_code } = await request.json()
  const updates = {}

  if (name?.trim()) updates.name = name.trim()

  if (regenerate_code) {
    let newCode
    let attempts = 0
    while (attempts < 10) {
      const code = generateInviteCode()
      const { data: existing } = await service.from('classes').select('id').eq('invite_code', code).maybeSingle()
      if (!existing) { newCode = code; break }
      attempts++
    }
    if (!newCode) return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })
    updates.invite_code = newCode
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: updated, error } = await service
    .from('classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ class: updated })
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const guard = await getOwnerGuard(service, user.id, id)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  // Clear class_id from all members
  await service.from('profiles').update({ class_id: null }).eq('class_id', id)

  // Soft-delete the class
  await service.from('classes').update({ is_active: false }).eq('id', id)

  return NextResponse.json({ success: true })
}