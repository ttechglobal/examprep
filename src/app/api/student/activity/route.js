// src/app/api/student/activity/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/activity?period=week|month
//
// Daily question counts + headline stats for the signed-in student.
//
//   week  (default) → Monday → today, 7 buckets Mon–Sun
//   month           → 1st of this month → today, one bucket per day so far
//
// Response:
// {
//   period: 'week',
//   days:   [{ date, label, count }],
//   stats:  { questions_answered, accuracy, time_spent_secs, streak_days, xp_earned }
// }
//
// v3: reads student_daily_stats (≤ 31 rows) instead of every raw answer, and
// uses Nigerian calendar days so buckets line up with the student's own day.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { appDay, addDays, mondayOfDay, monthStartOfDay, startOfAppDay } from '@/lib/dates'
import { effectiveStreak } from '@/lib/streak'

const PERIODS    = new Set(['week', 'month'])
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requested = new URL(request.url).searchParams.get('period') ?? 'week'
    const period    = PERIODS.has(requested) ? requested : 'week'

    const today   = appDay()
    const fromDay = period === 'month' ? monthStartOfDay(today) : mondayOfDay(today)
    const lastDay = period === 'week' ? addDays(fromDay, 6) : today

    const db = supabaseAdmin()
    const [daysRes, sessionsRes, profileRes] = await Promise.all([
      db.from('student_daily_stats')
        .select('day, answered, correct')
        .eq('student_id', user.id)
        .gte('day', fromDay).lte('day', today),
      db.from('practice_sessions')
        .select('duration_secs')
        .eq('student_id', user.id)
        .gte('created_at', startOfAppDay(fromDay).toISOString()),
      db.from('profiles')
        .select('total_points, streak_days, last_active_date')
        .eq('id', user.id)
        .single(),
    ])
    if (daysRes.error) throw daysRes.error

    const byDay = new Map((daysRes.data ?? []).map(d => [String(d.day).slice(0, 10), d]))
    const days = []
    let answered = 0
    let correct  = 0
    for (let day = fromDay, i = 0; day <= lastDay; day = addDays(day, 1), i++) {
      const row = byDay.get(day)
      const count = Number(row?.answered) || 0
      answered += count
      correct  += Number(row?.correct) || 0
      days.push({
        date:  day,
        label: period === 'week' ? DAY_LABELS[i] : String(Number(day.slice(8, 10))),
        count,
      })
    }

    // A missing practice_sessions column shouldn't take the response down —
    // time spent just reads as zero.
    const timeSpentSecs = (sessionsRes.error ? [] : sessionsRes.data ?? [])
      .reduce((sum, s) => sum + (Number(s.duration_secs) || 0), 0)

    return NextResponse.json({
      period,
      days,
      stats: {
        questions_answered: answered,
        accuracy:           answered > 0 ? Math.round((correct / answered) * 100) : 0,
        time_spent_secs:    timeSpentSecs,
        streak_days:        effectiveStreak(profileRes.data, today),
        xp_earned:          profileRes.data?.total_points ?? 0,
      },
    }, { headers: { 'Cache-Control': 'private, max-age=120' } })

  } catch (err) {
    console.error('[student/activity] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
