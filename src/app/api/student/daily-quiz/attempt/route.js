// src/app/api/student/daily-quiz/attempt/route.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student/daily-quiz/attempt
//
// Records one attempt at today's daily challenge question.
//
// Body:
// {
//   question_id:    string   (uuid)
//   selected_index: number   (0-based index into options array)
//   subject_id?:    string
//   subject_name?:  string
// }
//
// Rules:
//   • Max 3 attempts per question per day.
//   • On correct answer: mark completed=true, correct=true, award XP.
//   • On 3rd wrong answer: mark completed=true, correct=false, reveal answer.
//   • XP: correct on 1st attempt = 50, 2nd = 30, 3rd = 10, wrong all 3 = 5.
//   • Guests: returns result without DB write.
//
// Response:
// {
//   ok: true,
//   result:           'correct' | 'wrong' | 'out_of_attempts'
//   correct:          bool
//   completed:        bool
//   attempts_used:    number
//   max_attempts:     number
//   xp_awarded:       number
//   new_total_xp?:    number          (auth users only)
//   correct_answer?:  string          (only when completed)
//   explanation?:     string | null   (only when completed)
//   guest?:           true            (guests only)
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAX_ATTEMPTS = 2

// XP for completing — correct only
// 1st try correct = 50, 2nd try correct = 25, both wrong = 0
function xpForCompletion(attemptsUsed, correct) {
  if (!correct) return 0
  if (attemptsUsed === 1) return 50
  return 25
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function checkCorrect(options, selectedIdx, correctAnswer) {
  if (selectedIdx == null || selectedIdx < 0) return false
  const picked = options[selectedIdx]
  // correct_answer can be the option text or a letter (A/B/C/D)
  return (
    picked === correctAnswer ||
    LETTERS[selectedIdx] === correctAnswer ||
    String(selectedIdx) === String(correctAnswer)
  )
}

export async function POST(request) {
  try {
    let body
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const { question_id, selected_index, subject_id, subject_name } = body ?? {}
    // NOTE: 'slot' is not a DB column yet — unique constraint is (student_id, quiz_date).
    // Both challenge cards share one row per day until the DB is migrated.

    if (!question_id)       return NextResponse.json({ error: 'question_id required' }, { status: 400 })
    if (selected_index == null) return NextResponse.json({ error: 'selected_index required' }, { status: 400 })

    const service = db()
    const today   = todayStr()

    // ── Fetch question (need options + correct_answer to verify) ───────────────
    const { data: question, error: qErr } = await service
      .from('questions')
      .select('id, question_text, options, correct_answer, explanation, hint')
      .eq('id', question_id)
      .eq('is_active', true)
      .single()

    if (qErr || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Normalise options
    let optionsArr = []
    if (Array.isArray(question.options)) {
      optionsArr = question.options
    } else if (question.options && typeof question.options === 'object') {
      optionsArr = LETTERS.map(l => question.options[l]).filter(v => v != null)
    }

    const isCorrect = checkCorrect(optionsArr, selected_index, question.correct_answer)

    // ── Auth check ─────────────────────────────────────────────────────────────
    let userId = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {}

    // ── GUEST PATH — compute result, no DB writes ──────────────────────────────
    if (!userId) {
      const result = isCorrect ? 'correct' : 'wrong'
      return NextResponse.json({
        ok:           true,
        guest:        true,
        result,
        correct:      isCorrect,
        completed:    isCorrect,  // guests complete on first correct
        attempts_used: 1,
        max_attempts:  MAX_ATTEMPTS,
        xp_awarded:    isCorrect ? 50 : 0,
        correct_answer: isCorrect ? question.correct_answer : null,
        explanation:    isCorrect ? (question.explanation ?? null) : null,
      })
    }

    // ── AUTH PATH ─────────────────────────────────────────────────────────────

    // Fetch or create today's attempt row
    const { data: existing } = await service
      .from('daily_quiz_attempts')
      .select('*')
      .eq('student_id', userId)
      .eq('quiz_date', today)
      .maybeSingle()

    // Guard: already completed today
    if (existing?.completed) {
      return NextResponse.json({
        ok:            true,
        result:        existing.correct ? 'correct' : 'out_of_attempts',
        correct:       existing.correct ?? false,
        completed:     true,
        attempts_used: existing.attempts_used,
        max_attempts:  MAX_ATTEMPTS,
        xp_awarded:    0,   // already awarded
        correct_answer: question.correct_answer,
        explanation:    question.explanation ?? null,
      })
    }

    // Guard: max attempts already reached (shouldn't normally happen — client guards too)
    const prevAttempts = existing?.attempts_used ?? 0
    if (prevAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({
        ok:            true,
        result:        'out_of_attempts',
        correct:       false,
        completed:     true,
        attempts_used: prevAttempts,
        max_attempts:  MAX_ATTEMPTS,
        xp_awarded:    0,
        correct_answer: question.correct_answer,
        explanation:    question.explanation ?? null,
      })
    }

    const newAttemptsUsed    = prevAttempts + 1
    const completedNow       = isCorrect || newAttemptsUsed >= MAX_ATTEMPTS
    const selectedHistory    = [...(existing?.selected_indices ?? []), selected_index]
    const xpAwarded          = completedNow ? xpForCompletion(newAttemptsUsed, isCorrect) : 0

    // ── Upsert attempt row ─────────────────────────────────────────────────────
    const upsertData = {
      student_id:       userId,
      quiz_date:        today,
      question_id,
      subject_id:       subject_id ?? existing?.subject_id ?? null,
      subject_name:     subject_name ?? existing?.subject_name ?? null,
      attempts_used:    newAttemptsUsed,
      max_attempts:     MAX_ATTEMPTS,
      completed:        completedNow,
      correct:          completedNow ? isCorrect : null,
      selected_indices: selectedHistory,
      xp_awarded:       completedNow ? xpAwarded : (existing?.xp_awarded ?? 0),
      updated_at:       new Date().toISOString(),
    }

    const { error: upsertErr } = await service
      .from('daily_quiz_attempts')
      .upsert(upsertData, { onConflict: 'student_id,quiz_date' })

    if (upsertErr) {
      console.error('[daily-quiz/attempt] upsert error:', upsertErr.message)
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
    }

    // ── Award XP if completed ──────────────────────────────────────────────────
    let newTotalXP = null
    if (completedNow && xpAwarded > 0) {
      const { data: profRow } = await service
        .from('profiles')
        .select('total_points')
        .eq('id', userId)
        .single()

      const currentXP = profRow?.total_points ?? 0
      newTotalXP      = currentXP + xpAwarded

      await service
        .from('profiles')
        .update({ total_points: newTotalXP })
        .eq('id', userId)
    }

    // ── Response ──────────────────────────────────────────────────────────────
    const result = isCorrect
      ? 'correct'
      : completedNow
      ? 'out_of_attempts'
      : 'wrong'

    return NextResponse.json({
      ok:            true,
      result,
      correct:       isCorrect,
      completed:     completedNow,
      attempts_used: newAttemptsUsed,
      max_attempts:  MAX_ATTEMPTS,
      xp_awarded:    xpAwarded,
      new_total_xp:  newTotalXP,
      // Only reveal answer when done
      correct_answer: completedNow ? question.correct_answer : null,
      explanation:    completedNow ? (question.explanation ?? null) : null,
    })

  } catch (err) {
    console.error('[daily-quiz/attempt] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}