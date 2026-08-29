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

    // All attempts today (any slot, any completion status, at least 1 attempt)
    const { data: attempts, error } = await service
      .from('daily_quiz_attempts')
      .select('student_id, correct, attempts_used, completed, updated_at')
      .eq('quiz_date', today)
      .gt('attempts_used', 0)
      .order('updated_at', { ascending: true })
      .limit(100)

    if (error) throw error
    if (!attempts?.length) {
      return NextResponse.json({ board: [], date: today })
    }

    // Deduplicate per student — keep their best row:
    // completed+correct > completed+wrong > in-progress, then fewest attempts
    const best = {}
    for (const row of attempts) {
      const id   = row.student_id
      const prev = best[id]
      if (!prev) { best[id] = row; continue }
      // Prefer completed over in-progress
      if (row.completed && !prev.completed)   { best[id] = row; continue }
      if (!row.completed && prev.completed)   continue
      // Both completed: prefer correct
      if (row.correct && !prev.correct)       { best[id] = row; continue }
      if (!row.correct && prev.correct)       continue
      // Same completion/correct: prefer fewer attempts
      if (row.attempts_used < prev.attempts_used) { best[id] = row }
    }

    // Sort: completed+correct first, then completed, then in-progress, then fewest attempts
    const sorted = Object.values(best).sort((a, b) => {
      const scoreA = (a.completed ? 2 : 0) + (a.correct ? 1 : 0)
      const scoreB = (b.completed ? 2 : 0) + (b.correct ? 1 : 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return (a.attempts_used ?? 0) - (b.attempts_used ?? 0)
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
      student_id:    r.student_id,
      name:          profMap[r.student_id]?.full_name   ?? 'Student',
      school:        profMap[r.student_id]?.school_name ?? null,
      correct:       r.correct   ?? false,
      completed:     r.completed ?? false,
      attempts_used: r.attempts_used ?? 0,
      completed_at:  r.updated_at,
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