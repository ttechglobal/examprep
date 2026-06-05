// src/app/api/offline/subjects/route.js
// Returns subject id + name rows for the given names.
// Used by the offline sync to resolve subject names → IDs before fetching questions.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const names = searchParams.get('names')?.split(',').filter(Boolean) ?? []

  if (!names.length) {
    return NextResponse.json({ subjects: [] })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await db
    .from('subjects')
    .select('id, name, slug')
    .in('name', names)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subjects: data ?? [] })
}