// src/app/api/student/daily-quiz/board/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz/board
//
// Returns today's leaderboard — students who have completed today's daily
// challenge, ordered by: correct first, then fewest attempts, then earliest.
//
// Response:
// {
//   board: [
//     { student_id, name, school, correct, attempts_used, completed_at }
//   ],
//   date: 'YYYY-MM-DD'
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const service = db()
    const today   = todayStr()

    // Fetch all completed attempts for today
    const { data: attempts, error } = await service
      .from('daily_quiz_attempts')
      .select('student_id, correct, attempts_used, updated_at')
      .eq('quiz_date', today)
      .eq('completed', true)
      .order('correct',       { ascending: false })   // correct answers first
      .order('attempts_used', { ascending: true })    // fewer attempts = better
      .order('updated_at',    { ascending: true })    // earlier = better
      .limit(30)

    if (error) throw error

    if (!attempts?.length) {
      return NextResponse.json({ board: [], date: today })
    }

    // Fetch profile details for each student
    const ids = attempts.map(a => a.student_id)
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, school_name')
      .in('id', ids)

    const profMap = {}
    for (const p of profiles ?? []) profMap[p.id] = p

    const board = attempts.map(a => ({
      student_id:   a.student_id,
      name:         profMap[a.student_id]?.full_name  ?? 'Student',
      school:       profMap[a.student_id]?.school_name ?? null,
      correct:      a.correct     ?? false,
      attempts_used: a.attempts_used ?? 0,
      completed_at: a.updated_at,
    }))

    return NextResponse.json(
      { board, date: today },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
    )

  } catch (err) {
    console.error('[daily-quiz/board] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}