// src/app/api/leaderboard/global/route.js
// GET /api/leaderboard/global
//
// Returns the national leaderboard ranked by total points in the current
// bi-weekly period, with the current student's surrounding rows always
// included regardless of their rank.
//
// Query params:
//   period   — 'week' (default) | 'alltime'
//   limit    — how many top rows to return (default 20, max 50)

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/leaderboardPeriods'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period  = searchParams.get('period') ?? 'week'
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get current student's state (region for display)
  const { data: myProfile } = await service
    .from('profiles')
    .select('id, full_name, state, total_points')
    .eq('id', user.id)
    .single()

  let query
  if (period === 'alltime') {
    // All-time: rank by total_points on profile
    query = service
      .from('profiles')
      .select('id, full_name, state, total_points')
      .not('total_points', 'is', null)
      .order('total_points', { ascending: false })
      .limit(limit + 5) // fetch a few extra so we can show context around user
  } else {
    // Current bi-weekly period: rank by points earned in period
    const p = getCurrentPeriod()
    const { data: rows } = await service
      .from('points_transactions')
      .select('student_id, points')
      .gte('created_at', p.start.toISOString())
      .lte('created_at', p.end.toISOString())

    if (!rows?.length) {
      return NextResponse.json({
        leaderboard: [],
        my_rank: null,
        my_entry: null,
        total_count: 0,
        period,
      })
    }

    // Aggregate points per student
    const totals = {}
    for (const r of rows) {
      totals[r.student_id] = (totals[r.student_id] ?? 0) + (r.points ?? 0)
    }

    // Sort and build ranked list
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)

    // Fetch names for top N + the current user
    const topIds = sorted.slice(0, limit).map(([id]) => id)
    const needsUser = !topIds.includes(user.id)
    const fetchIds  = needsUser ? [...topIds, user.id] : topIds

    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, state')
      .in('id', fetchIds)

    const profileMap = {}
    for (const p of profiles ?? []) profileMap[p.id] = p

    const ranked = sorted.map(([id, pts], i) => ({
      student_id:  id,
      first_name:  profileMap[id]?.full_name?.split(' ')[0] ?? 'Student',
      state:       profileMap[id]?.state ?? '',
      points:      pts,
      rank:        i + 1,
    }))

    const myRankEntry  = ranked.find(r => r.student_id === user.id)
    const myRank       = myRankEntry?.rank ?? null
    const topRows      = ranked.slice(0, limit)

    // Include 2 rows above and below user if not in top list
    let surroundRows = []
    if (myRank && myRank > limit) {
      const myIdx   = ranked.findIndex(r => r.student_id === user.id)
      const sliceStart = Math.max(0, myIdx - 2)
      const sliceEnd   = Math.min(ranked.length, myIdx + 3)
      surroundRows = ranked.slice(sliceStart, sliceEnd)
    }

    return NextResponse.json({
      leaderboard:  topRows,
      surround:     surroundRows,
      my_rank:      myRank,
      my_entry:     myRankEntry ?? null,
      total_count:  sorted.length,
      period,
    })
  }

  return NextResponse.json({ leaderboard: [], my_rank: null, total_count: 0, period })
}