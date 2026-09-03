// src/app/api/student/daily-quiz/board/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz/board
//
// Returns today's board — all students who have made at least one attempt,
// deduplicated per student (best slot shown: correct > fewest attempts > earliest).
// Shows in-progress too, not just completed — so the board feels live.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function todayStr() { return new Date().toISOString().slice(0, 10) }

export async function GET() {
  try {
    const service = db()
    const today   = todayStr()

    // Fetch ALL slot rows for today so we can aggregate both slots per student
    const { data: attempts, error } = await service
      .from('daily_quiz_attempts')
      .select('student_id, correct, attempts_used, completed, xp_awarded, updated_at')
      .eq('quiz_date', today)
      .gt('attempts_used', 0)
      .order('updated_at', { ascending: true })
      .limit(200)

    if (error) throw error
    if (!attempts?.length) {
      return NextResponse.json({ board: [], date: today })
    }

    // Aggregate per student across both slots
    const studentMap = {}
    for (const row of attempts) {
      const id = row.student_id
      if (!studentMap[id]) {
        studentMap[id] = { student_id: id, correct: 0, total: 0, xp_earned: 0, completed: 0, last_updated: row.updated_at }
      }
      const s = studentMap[id]
      s.total       += 1
      s.xp_earned   += row.xp_awarded ?? 0
      if (row.correct)    s.correct   += 1
      if (row.completed)  s.completed += 1
      if (row.updated_at > s.last_updated) s.last_updated = row.updated_at
    }

    // Sort: most correct first → most XP → fewest total slots (faster completion)
    const sorted = Object.values(studentMap).sort((a, b) => {
      if (b.correct   !== a.correct)   return b.correct   - a.correct
      if (b.xp_earned !== a.xp_earned) return b.xp_earned - a.xp_earned
      return a.total - b.total
    }).slice(0, 30)

    // Fetch profiles
    const ids = sorted.map(r => r.student_id)
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, school_name')
      .in('id', ids)

    const profMap = {}
    for (const p of profiles ?? []) profMap[p.id] = p

    const board = sorted.map(r => ({
      student_id:   r.student_id,
      name:         profMap[r.student_id]?.full_name   ?? 'Student',
      school:       profMap[r.student_id]?.school_name ?? null,
      correct:      r.correct,
      total:        r.total,        // number of slots attempted (max 2)
      xp_earned:    r.xp_earned,
      completed:    r.completed === r.total && r.total > 0,
      completed_at: r.last_updated,
    }))

    return NextResponse.json(
      { board, date: today },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' } }
    )

  } catch (err) {
    console.error('[daily-quiz/board] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}