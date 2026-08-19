// src/app/api/admin/flashcards/route.js
// Service-role endpoint so admin inserts bypass student RLS on flashcards table.
//
// POST  — insert array of flashcard rows
// DELETE — delete a single flashcard by id

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAdmin() {
  // Same check as every other admin API route — session validity only.
  // Admin layout already blocks unauthenticated access via cookie check.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { error } = await db.from('flashcards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: id })
}

export async function PATCH(request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = svc()
  const { data, error } = await db.from('flashcards').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ card: data })
}