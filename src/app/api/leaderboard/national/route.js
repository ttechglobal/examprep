// src/app/api/leaderboard/national/route.js — v2
// GET /api/leaderboard/national?period=week|lastWeek|month|all&limit=20
//                              [&weeks_ago=N][&strict=1]
//
// National leaderboard. Auth optional: guests get the board, signed-in
// students also get `me` (their own row and true rank).
//
//   weeks_ago  with period=week, the Mon–Sun week N weeks back (champions)
//   strict=1   no all-time fallback when the window is empty
//
// Response: { scope, period, window, leaderboard, me, fallback }
// Rows are built by lib/leaderboard/server.js.

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'
import { buildLeaderboard, parseBoardParams } from '@/lib/leaderboard/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const params = parseBoardParams(new URL(request.url).searchParams)

    let callerId = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      callerId = user?.id ?? null
    } catch { /* guest */ }

    const result = await buildLeaderboard(db(), { ...params, callerId })

    // A response containing `me` is personal and must never be shared by a CDN.
    const cache = callerId
      ? 'private, max-age=60, stale-while-revalidate=60'
      : 'public, s-maxage=120, stale-while-revalidate=60'

    return NextResponse.json(
      { scope: 'national', period: params.period, ...result },
      { headers: { 'Cache-Control': cache } }
    )
  } catch (err) {
    console.error('[leaderboard/national] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
