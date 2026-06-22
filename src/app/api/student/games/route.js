// src/app/api/student/games/route.js
// POST — log a game play. Fire-and-forget, never blocks the student.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const svc = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }) }

  const { gameId, score } = body
  if (!gameId) return NextResponse.json({ ok: false })

  try {
    await svc().from('game_plays').insert({
      student_id:   user.id,
      game_id:      gameId,
      score:        score ?? null,
      completed_at: new Date().toISOString(),
    })
  } catch (e) {
    // Non-fatal — game still worked, just not tracked
    console.error('[games] insert error:', e.message)
  }

  return NextResponse.json({ ok: true })
}