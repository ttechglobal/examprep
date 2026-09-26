// src/app/api/student/daily-quiz/attempt/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student/daily-quiz/attempt
//
// Records one attempt at one of today's two daily challenge questions.
//
// Body:
// {
//   slot:           1 | 2   (which card; defaults to 1 for older clients)
//   question_id:    string  (uuid)
//   selected_index: number  (0-based index into options array)
//   subject_name?:  string
// }
//
// Rules:
//   • 2 attempts per card per day.
//   • Correct on the 1st try = 50 XP, on the 2nd = 25 XP, never = 0.
//   • The question must be today's question for that card (you can't submit
//     an easier question you already know).
//   • Guests: result only, nothing stored.
//
// Response:
// {
//   ok: true, result: 'correct' | 'wrong' | 'out_of_attempts',
//   correct, completed, attempts_used, max_attempts, xp_awarded,
//   new_total_xp?, correct_answer?, explanation?, guest?
// }
//
// v2: one row per card (slot) so card 2 is playable after card 1; question
// checked against today's pick; XP added atomically (award_xp).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'
import { checkCorrect }  from '@/lib/answers'
import { todayStr, todaysSlots, profileSubjects, optionsArray } from '@/lib/server/dailyQuiz'

const MAX_ATTEMPTS = 2
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function xpForCompletion(attemptsUsed, correct) {
  if (!correct) return 0
  return attemptsUsed === 1 ? 50 : 25
}

export async function POST(request) {
  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { question_id, selected_index, subject_name } = body ?? {}
  const slot = body?.slot === 2 ? 2 : 1

  if (!question_id || !UUID_RE.test(question_id)) {
    return NextResponse.json({ error: 'question_id required' }, { status: 400 })
  }
  if (!Number.isInteger(selected_index) || selected_index < 0 || selected_index > 9) {
    return NextResponse.json({ error: 'selected_index required' }, { status: 400 })
  }

  try {
    const db    = supabaseAdmin()
    const today = todayStr()

    const { data: question, error: qErr } = await db
      .from('questions')
      .select('id, options, correct_answer, explanation, subject_id')
      .eq('id', question_id)
      .eq('is_active', true)
      .single()
    if (qErr || !question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const isCorrect = checkCorrect(optionsArray(question.options), selected_index, question.correct_answer)

    let userId = null
    try {
      const supabase = await createClient()
      userId = (await supabase.auth.getUser()).data?.user?.id ?? null
    } catch {}

    // ── Guest: result only ───────────────────────────────────────────────────
    if (!userId) {
      return NextResponse.json({
        ok:             true,
        guest:          true,
        result:         isCorrect ? 'correct' : 'wrong',
        correct:        isCorrect,
        completed:      isCorrect,
        attempts_used:  1,
        max_attempts:   MAX_ATTEMPTS,
        xp_awarded:     isCorrect ? 50 : 0,
        correct_answer: isCorrect ? question.correct_answer : null,
        explanation:    isCorrect ? (question.explanation ?? null) : null,
      })
    }

    // ── Today's row for this card ─────────────────────────────────────────────
    const { data: existing } = await db
      .from('daily_quiz_attempts')
      .select('question_id, attempts_used, completed, correct, selected_indices, xp_awarded, subject_id, subject_name')
      .eq('student_id', userId)
      .eq('quiz_date', today)
      .eq('slot', slot)
      .maybeSingle()

    // The question must be this card's question today.
    let expectedId = existing?.question_id ?? null
    if (!expectedId) {
      const slots = await todaysSlots(db, await profileSubjects(db, userId), {}, today)
      expectedId = slots.find(s => s.slot === slot)?.questionId ?? null
    }
    if (expectedId !== question.id) {
      return NextResponse.json({ error: "That isn't today's question for this card" }, { status: 409 })
    }

    const alreadyDone = existing?.completed || (existing?.attempts_used ?? 0) >= MAX_ATTEMPTS
    if (alreadyDone) {
      return NextResponse.json({
        ok:             true,
        result:         existing.correct ? 'correct' : 'out_of_attempts',
        correct:        existing.correct ?? false,
        completed:      true,
        attempts_used:  existing.attempts_used,
        max_attempts:   MAX_ATTEMPTS,
        xp_awarded:     0,   // already awarded
        correct_answer: question.correct_answer,
        explanation:    question.explanation ?? null,
      })
    }

    const attemptsUsed = (existing?.attempts_used ?? 0) + 1
    const completedNow = isCorrect || attemptsUsed >= MAX_ATTEMPTS
    const xpAwarded    = completedNow ? xpForCompletion(attemptsUsed, isCorrect) : 0

    const row = {
      student_id:       userId,
      quiz_date:        today,
      slot,
      question_id:      question.id,
      subject_id:       question.subject_id ?? existing?.subject_id ?? null,
      subject_name:     typeof subject_name === 'string' ? subject_name.slice(0, 120) : (existing?.subject_name ?? null),
      attempts_used:    attemptsUsed,
      max_attempts:     MAX_ATTEMPTS,
      completed:        completedNow,
      correct:          completedNow ? isCorrect : null,
      selected_indices: [...(existing?.selected_indices ?? []), selected_index],
      xp_awarded:       completedNow ? xpAwarded : (existing?.xp_awarded ?? 0),
      updated_at:       new Date().toISOString(),
    }

    // Guarded write: succeeds only if nobody advanced this card in the
    // meantime (double tap, two tabs), so XP can't be awarded twice.
    let written
    if (existing) {
      const { data, error } = await db.from('daily_quiz_attempts')
        .update(row)
        .eq('student_id', userId).eq('quiz_date', today).eq('slot', slot)
        .eq('attempts_used', existing.attempts_used).eq('completed', false)
        .select('slot')
      if (error) throw error
      written = data?.length > 0
    } else {
      const { data, error } = await db.from('daily_quiz_attempts')
        .upsert(row, { onConflict: 'student_id,quiz_date,slot', ignoreDuplicates: true })
        .select('slot')
      if (error) throw error
      written = data?.length > 0
    }
    if (!written) {
      return NextResponse.json({ error: 'This attempt was already recorded. Refresh to continue.' }, { status: 409 })
    }

    let newTotalXP = null
    if (xpAwarded > 0) {
      const { data: total, error: xpErr } = await db.rpc('award_xp', { p_student: userId, p_xp: xpAwarded })
      if (xpErr) console.error('[daily-quiz/attempt] award_xp failed:', xpErr.message)
      else newTotalXP = total
    }

    return NextResponse.json({
      ok:             true,
      result:         isCorrect ? 'correct' : completedNow ? 'out_of_attempts' : 'wrong',
      correct:        isCorrect,
      completed:      completedNow,
      attempts_used:  attemptsUsed,
      max_attempts:   MAX_ATTEMPTS,
      xp_awarded:     xpAwarded,
      ...(newTotalXP != null ? { new_total_xp: newTotalXP } : {}),
      correct_answer: completedNow ? question.correct_answer : null,
      explanation:    completedNow ? (question.explanation ?? null) : null,
    })
  } catch (err) {
    console.error('[daily-quiz/attempt] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
  }
}
