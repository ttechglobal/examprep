// src/app/api/student/daily-quiz/route.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz[?subjects=A,B]  (subjects param is for guests)
//
// Returns today's TWO daily challenge questions, each with the student's
// progress on it. Correct answers are only included once a slot is completed.
//
// v4:
//   - picks are deterministic per day and cost two tiny queries each
//     (lib/server/dailyQuiz.js) instead of loading 200 questions per slot
//   - progress is stored per slot, so finishing card 1 no longer blocks card 2
//   - "today" is the Nigerian calendar day
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { QUESTION_COLS, todayStr, todaysSlots, profileSubjects, optionsArray } from '@/lib/server/dailyQuiz'

function shapeQuestion(q, subjectName) {
  if (!q) return null
  const options = optionsArray(q.options)
  if (!options.length) return null   // unusable without options
  return {
    id:             q.id,
    text:           q.question_text,
    options,
    hint:           q.hint ?? null,
    explanation:    null,
    correct_answer: null,
    difficulty:     q.difficulty ?? 'medium',
    subject_name:   q.subjects?.name ?? subjectName ?? '',
    topic_name:     q.topics?.name  ?? null,
    year:           q.year          ?? null,
    exam_type:      q.exam_type     ?? null,
    subject_id:     q.subject_id    ?? null,
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const db    = supabaseAdmin()
    const today = todayStr()

    // ── Who is asking ─────────────────────────────────────────────────────────
    let userId = null
    try {
      const supabase = await createClient()
      userId = (await supabase.auth.getUser()).data?.user?.id ?? null
    } catch { /* guest */ }

    let userSubjects = userId ? await profileSubjects(db, userId) : []
    if (!userSubjects.length) {
      userSubjects = (searchParams.get('subjects') ?? '')
        .split(',').map(s => s.trim()).filter(Boolean).slice(0, 20)
    }

    // ── Today's progress, per slot ───────────────────────────────────────────
    const existingBySlot = {}
    if (userId) {
      const { data: rows } = await db
        .from('daily_quiz_attempts')
        .select('slot, question_id, attempts_used, max_attempts, completed, correct, selected_indices, xp_awarded')
        .eq('student_id', userId)
        .eq('quiz_date', today)
      for (const row of rows ?? []) existingBySlot[row.slot ?? 1] = row
    }

    // ── Questions ─────────────────────────────────────────────────────────────
    const slots = await todaysSlots(db, userSubjects, existingBySlot, today)
    const ids = [...new Set(slots.map(s => s.questionId).filter(Boolean))]
    const { data: questions, error } = ids.length
      ? await db.from('questions').select(QUESTION_COLS).in('id', ids)
      : { data: [] }
    if (error) throw error
    const byId = new Map((questions ?? []).map(q => [q.id, q]))

    const challenges = slots.map(({ slot, subjectName, questionId }) => {
      const existing    = existingBySlot[slot] ?? null
      const rawQ        = byId.get(questionId) ?? null
      const shaped      = shapeQuestion(rawQ, subjectName)
      const isCompleted = existing?.completed ?? false
      if (shaped && isCompleted) {
        shaped.correct_answer = rawQ.correct_answer
        shaped.explanation    = rawQ.explanation ?? null
      }
      return {
        slot,
        question: shaped,
        state: {
          attempts_used:    existing?.attempts_used    ?? 0,
          max_attempts:     existing?.max_attempts     ?? 2,
          completed:        isCompleted,
          correct:          existing?.correct          ?? null,
          selected_indices: existing?.selected_indices ?? [],
          xp_awarded:       existing?.xp_awarded       ?? 0,
        },
      }
    })

    return NextResponse.json(
      { challenges, date: today },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[daily-quiz] GET error:', err?.message ?? err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
