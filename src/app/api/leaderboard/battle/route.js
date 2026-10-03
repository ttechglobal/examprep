// src/app/api/leaderboard/battle/route.js
// GET /api/leaderboard/battle?period=week|lastWeek|all&limit=20
//
// Battle leaderboard: XP earned in battles (computer and 1v1) only. Battle XP
// also counts on the main leaderboard; this board just scopes it. Auth
// optional: guests get the board, signed-in students also get `me`.
//
// Response: { scope: 'battle', period, window, leaderboard, me }
//           { ..., unavailable: true } until 20261003_battle_leaderboard.sql runs
// Rows are built by lib/leaderboard/server.js (buildBattleLeaderboard).

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { buildBattleLeaderboard, BATTLE_PERIODS } from '@/lib/leaderboard/server'

// Postgres "undefined function" / PostgREST "function not found in schema cache".
const MISSING = new Set(['42883', 'PGRST202', '42P01'])

export async function GET(request) {
  const search = new URL(request.url).searchParams
  const p      = search.get('period') ?? 'week'
  const period = BATTLE_PERIODS.includes(p) ? p : 'week'
  const limit  = Math.min(Math.max(parseInt(search.get('limit') ?? '20', 10) || 20, 1), 50)

  let callerId = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    callerId = user?.id ?? null
  } catch { /* guest */ }

  try {
    const result = await buildBattleLeaderboard(supabaseAdmin(), { period, limit, callerId })
    const cache = callerId
      ? 'private, max-age=60, stale-while-revalidate=60'
      : 'public, s-maxage=120, stale-while-revalidate=60'
    return NextResponse.json({ scope: 'battle', period, ...result }, { headers: { 'Cache-Control': cache } })
  } catch (err) {
    if (MISSING.has(err?.code)) {
      return NextResponse.json({ scope: 'battle', period, leaderboard: [], me: null, unavailable: true })
    }
    console.error('[leaderboard/battle] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
