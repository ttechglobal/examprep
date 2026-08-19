// src/app/api/admin/formulas/route.js
// Service-role endpoint for key_formulas admin operations.
//
// POST   — insert array of formula rows
// PATCH  — update a single formula by id
// DELETE — delete a single formula by id

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin() {
  // Admin pages are protected by the session cookie (AdminLayout redirects if no cookie).
  // Here we just verify the Supabase session is valid — same as every other admin API route.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { data, error } = await db.from('key_formulas').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ formula: data })
}

export async function DELETE(request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('key_formulas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}