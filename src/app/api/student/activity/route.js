// src/app/api/student/activity/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/activity?period=week|month
//
// Daily question counts + headline stats for the signed-in student.
//
//   week  (default) → Monday 00:00 → now, 7 buckets Mon–Sun
//   month           → 1st of this month → now, one bucket per day so far
//
// Response:
// {
//   period: 'week',
//   days:   [{ date, label, count }],
//   stats:  { questions_answered, accuracy, time_spent_secs, streak_days, xp_earned }
// }
//
// v2: honours `period` (v1 accepted it but always returned the week) and adds
// time_spent_secs, summed from practice_sessions.duration_secs.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PERIODS    = new Set(['week', 'month'])
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_MS     = 86_400_000

function rangeStartFor(period, now = new Date()) {
  const start = new Date(now)
  if (period === 'month') start.setDate(1)
  else start.setDate(now.getDate() - ((now.getDay() + 6) % 7))   // back to Monday
  start.setHours(0, 0, 0, 0)
  return start
}

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const requested = searchParams.get('period') ?? 'week'
    const period    = PERIODS.has(requested) ? requested : 'week'

    const service    = db()
    const rangeEnd   = new Date()
    const rangeStart = rangeStartFor(period, rangeEnd)
    const from = rangeStart.toISOString()
    const to   = rangeEnd.toISOString()

    const [attemptsRes, sessionsRes, profileRes] = await Promise.all([
      service.from('question_attempts')
        .select('created_at, is_correct')
        .eq('student_id', user.id)
        .gte('created_at', from).lte('created_at', to),
      service.from('practice_sessions')
        .select('duration_secs')
        .eq('student_id', user.id)
        .gte('created_at', from).lte('created_at', to),
      service.from('profiles')
        .select('total_points, streak_days')
        .eq('id', user.id)
        .single(),
    ])

    // ── Buckets ──────────────────────────────────────────────────────────────
    const bucketCount = period === 'week'
      ? 7
      : Math.floor((rangeEnd - rangeStart) / DAY_MS) + 1
    const counts = new Array(bucketCount).fill(0)

    let answered = 0
    let correct  = 0
    for (const a of attemptsRes.data ?? []) {
      const idx = Math.floor((new Date(a.created_at) - rangeStart) / DAY_MS)
      if (idx >= 0 && idx < bucketCount) counts[idx]++
      answered++
      if (a.is_correct) correct++
    }

    const days = counts.map((count, i) => {
      const d = new Date(rangeStart.getTime() + i * DAY_MS)
      return {
        date:  d.toISOString().slice(0, 10),
        label: period === 'week' ? DAY_LABELS[i] : String(d.getDate()),
        count,
      }
    })

    // A missing practice_sessions table or column shouldn't take the whole
    // response down — time spent just reads as zero.
    const timeSpentSecs = (sessionsRes.error ? [] : sessionsRes.data ?? [])
      .reduce((sum, s) => sum + (Number(s.duration_secs) || 0), 0)

    return NextResponse.json({
      period,
      days,
      stats: {
        questions_answered: answered,
        accuracy:           answered > 0 ? Math.round((correct / answered) * 100) : 0,
        time_spent_secs:    timeSpentSecs,
        streak_days:        profileRes.data?.streak_days  ?? 0,
        xp_earned:          profileRes.data?.total_points ?? 0,
      },
    }, { headers: { 'Cache-Control': 'private, max-age=120' } })

  } catch (err) {
    console.error('[student/activity] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
