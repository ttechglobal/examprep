// src/app/api/student/daily-quiz/board/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz/board
//
// Today's daily-challenge board: every student with at least one attempt,
// both cards combined, ranked most correct → most XP → fewest cards used →
// earliest finish. Shows in-progress students too, so the board feels live.
//
// v3: ranked in Postgres (daily_quiz_board). v2 took the first 200 attempts
// of the day by time and ranked only those, so later top scorers never
// appeared. Names are shown as "Favour A." like the other public boards.
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { publicName }    from '@/lib/leaderboard/server'
import { todayStr }      from '@/lib/server/dailyQuiz'
import { NextResponse }  from 'next/server'

export async function GET() {
  try {
    const db    = supabaseAdmin()
    const today = todayStr()

    const { data: ranked, error } = await db.rpc('daily_quiz_board', { p_date: today, p_limit: 30 })
    if (error) throw error
    if (!ranked?.length) return NextResponse.json({ board: [], date: today })

    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, school_name')
      .in('id', ranked.map(r => r.student_id))
    const profMap = {}
    for (const p of profiles ?? []) profMap[p.id] = p

    const board = ranked.map(r => {
      const total = Number(r.total) || 0
      return {
        student_id:   r.student_id,
        name:         publicName(profMap[r.student_id]?.full_name, false),
        school:       profMap[r.student_id]?.school_name ?? null,
        correct:      Number(r.correct) || 0,
        total,                                   // cards attempted (max 2)
        xp_earned:    Number(r.xp_earned) || 0,
        completed:    total > 0 && Number(r.completed) === total,
        completed_at: r.last_updated,
      }
    })

    return NextResponse.json(
      { board, date: today },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' } }
    )
  } catch (err) {
    console.error('[daily-quiz/board] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
