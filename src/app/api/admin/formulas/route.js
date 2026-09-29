// src/app/api/admin/formulas/route.js
// Service-role endpoint for key_formulas admin operations.
//
// POST   — insert array of formula rows
// PATCH  — update a single formula by id
// DELETE — delete a single formula by id
//
// v2 (29 Sep 2026): uses the shared requireAdmin() (signed admin cookie). The local
// requireAdmin() checked only for a Supabase login, which returned 401 to admins signed
// in with the admin password (see ADMIN_AUTH_FIX.md).

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { formulas } = await request.json()
  if (!Array.isArray(formulas) || formulas.length === 0) {
    return NextResponse.json({ error: 'formulas array required' }, { status: 400 })
  }

  const db = svc()
  const { data, error } = await db.from('key_formulas').insert(formulas).select()
  if (error) {
    console.error('[admin/formulas POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ saved: data.length, formulas: data })
}

export async function PATCH(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { data, error } = await db.from('key_formulas').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ formula: data })
}

export async function DELETE(request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('key_formulas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}