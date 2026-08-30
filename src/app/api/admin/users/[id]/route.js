import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/users/[id]/route.js
// DELETE /api/admin/users/[id]
// Permanently deletes a user from auth.users (which cascades to profiles
// if you have the on-delete trigger set up, otherwise we delete manually).


import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}


export async function DELETE(request, { params }) {
  if (authError) return authError

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

  const db = svc()

  // Step 1: Delete from auth.users — Supabase will cascade to profiles
  // if you have `ON DELETE CASCADE` on profiles.id FK, otherwise step 2 handles it.
  const { error: authError } = await db.auth.admin.deleteUser(id)

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Step 2: Hard-delete the profile row in case cascade isn't configured
  // This is a no-op if cascade already handled it — safe to run either way.
  await db.from('profiles').delete().eq('id', id)

  return NextResponse.json({ deleted: true })
}