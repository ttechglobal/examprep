import { requireAdmin } from '@/lib/adminAuth'
// src/app/api/admin/flashcards/route.js
// Service-role endpoint so admin inserts bypass student RLS on flashcards table.
//
// POST  — insert array of flashcard rows
// DELETE — delete a single flashcard by id

import { createClient as createServiceClient } from '@supabase/supabase-js'

import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)


export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { cards } = await request.json()
  if (!Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json({ error: 'cards array required' }, { status: 400 })
  }

  const db = svc()
  const { data, error } = await db.from('flashcards').insert(cards).select()
  if (error) {
    console.error('[admin/flashcards POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ saved: data.length, cards: data })
}

export async function DELETE(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('flashcards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: id })
}

export async function PATCH(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { data, error } = await db.from('flashcards').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ card: data })
}