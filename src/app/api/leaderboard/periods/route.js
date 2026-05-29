// src/app/api/leaderboard/periods/route.js
// GET /api/leaderboard/periods
// Returns past bi-weekly periods for the period picker.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPastPeriods, getCurrentPeriod, periodLabel } from '@/lib/leaderboardPeriods'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const current = getCurrentPeriod()
  const past    = getPastPeriods(6)

  return NextResponse.json({
    current: {
      start: current.start.toISOString(),
      end:   current.end.toISOString(),
      label: periodLabel(current.start, current.end),
    },
    past,
  })
}