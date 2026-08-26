// src/app/api/student/activity/route.js — v1 (clean build)
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/activity?period=week
//
// Returns daily question counts + headline stats for the
// Home page activity chart and Progress page bar chart.
//
// period: week (default) | month
//
// Response:
// {
//   period: 'week',
//   days: [{ date, label, count }],      // 7 items Mon-Sun
//   stats: {
//     questions_answered, accuracy, xp_earned, streak_days
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getWeekRange() {
  const now    = new Date()
  const dow    = now.getDay()                     // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7)) // back to Monday
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period  = searchParams.get('period') ?? 'week'
    const service = db()
    const userId  = user.id

    // ── Date range ─────────────────────────────────────────────────────────
    const rangeStart = getWeekRange()
    const rangeEnd   = new Date()

    // ── Fetch attempts in range ────────────────────────────────────────────
    const { data: attempts } = await service
      .from('question_attempts')
      .select('created_at, is_correct')
      .eq('student_id', userId)
      .gte('created_at', rangeStart.toISOString())
      .lte('created_at', rangeEnd.toISOString())

    // ── Build 7-day buckets (Mon = 0 … Sun = 6) ───────────────────────────
    const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const counts  = [0, 0, 0, 0, 0, 0, 0]
    let totalCorrect = 0
    let totalAnswered = 0

    for (const a of attempts ?? []) {
      const d    = new Date(a.created_at)
      const dow  = (d.getDay() + 6) % 7   // Mon=0 … Sun=6
      counts[dow]++
      totalAnswered++
      if (a.is_correct) totalCorrect++
    }

    const days = DAY_LABELS.map((label, i) => {
      const d = new Date(rangeStart)
      d.setDate(rangeStart.getDate() + i)
      return {
        date:  d.toISOString().slice(0, 10),
        label,
        count: counts[i],
      }
    })

    // ── Fetch profile for XP + streak ────────────────────────────────────
    const { data: prof } = await service
      .from('profiles')
      .select('total_points, streak_days')
      .eq('id', userId)
      .single()

    const accuracy = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0

    return NextResponse.json({
      period,
      days,
      stats: {
        questions_answered: totalAnswered,
        accuracy,
        xp_earned:    prof?.total_points ?? 0,
        streak_days:  prof?.streak_days  ?? 0,
      },
    }, { headers: { 'Cache-Control': 'private, max-age=120' } })

  } catch (err) {
    console.error('[student/activity] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}