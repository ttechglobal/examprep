// src/app/api/student/daily-quiz/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz
//
// Returns today's daily challenge question for the authenticated student.
// Works for guests too — they get a question but attempts aren't stored in DB.
//
// SELECTION LOGIC
// ───────────────
// 1. Read the student's subjects from their profile (or from the ?subjects= param for guests).
// 2. Group subjects into a "subject group" — sciences (Physics, Chemistry, Biology),
//    social sciences (Economics, Government, Commerce, Geography), languages
//    (English, Literature), and maths (Mathematics, Further Maths).
// 3. Use today's date as a seed to deterministically pick:
//    a) Which group to use today (rotates daily across groups present in the student's subjects)
//    b) Which specific subject from that group
//    c) Which question from that subject (hard or medium difficulty only)
// 4. The same seed means every student taking the SAME subject sees the SAME question
//    on the same day — creates a shared "today's challenge" feeling.
//
// ATTEMPT STATE
// ─────────────
// If authenticated, check daily_quiz_attempts for today. Return attempt state
// (attempts_used, completed, correct, selected_indices) so the client can
// restore the card to the right state without the student losing progress on refresh.
//
// Response:
// {
//   question: {
//     id, text, options, hint, explanation, difficulty,
//     subject_name, topic_name, year, exam_type
//   },
//   state: {
//     attempts_used: 0-3,
//     max_attempts: 3,
//     completed: bool,
//     correct: bool | null,
//     selected_indices: number[],
//     xp_awarded: number,
//     answered_today: bool,
//   },
//   date: 'YYYY-MM-DD'
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Subject groups for rotation
const SUBJECT_GROUPS = {
  sciences:       ['Physics', 'Chemistry', 'Biology'],
  social:         ['Economics', 'Government', 'Commerce', 'Geography'],
  languages:      ['English Language', 'Use of English', 'Literature in English'],
  maths:          ['Mathematics', 'Further Mathematics'],
  agricultural:   ['Agricultural Science'],
}

// ── Deterministic seed from date string ───────────────────────────────────────
// Simple but stable: sum of char codes + day-of-year offset
function dateSeed(dateStr) {
  const d = new Date(dateStr)
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return (d.getFullYear() * 1000 + doy)
}

function seededPick(arr, seed) {
  if (!arr.length) return null
  return arr[seed % arr.length]
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const service = db()
    const today   = todayStr()
    const seed    = dateSeed(today)

    // ── Auth check (optional — guests get a question, no state tracking) ───────
    let userId    = null
    let userSubjects = []

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        userId = user.id
        const { data: prof } = await service
          .from('profiles')
          .select('subjects_waec, subjects_jamb, subjects, exam_types')
          .eq('id', userId)
          .single()

        // Collect all subjects the student is taking
        const all = [
          ...(prof?.subjects_waec ?? []),
          ...(prof?.subjects_jamb ?? []),
          ...(prof?.subjects      ?? []),
        ]
        userSubjects = [...new Set(all)]
      }
    } catch {
      // Non-auth path
    }

    // Guest fallback — accept subjects from query param
    if (!userSubjects.length) {
      const paramSubs = searchParams.get('subjects') ?? ''
      userSubjects = paramSubs.split(',').map(s => s.trim()).filter(Boolean)
    }

    // Absolute fallback — serve a general science question
    if (!userSubjects.length) {
      userSubjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics']
    }

    // ── Check existing attempt for today (auth users only) ─────────────────────
    let existingAttempt = null
    if (userId) {
      const { data } = await service
        .from('daily_quiz_attempts')
        .select('*')
        .eq('student_id', userId)
        .eq('quiz_date', today)
        .maybeSingle()
      existingAttempt = data ?? null
    }

    // ── If completed today, we still need the question for display ─────────────
    // (so the student can review the explanation)
    let questionId = existingAttempt?.question_id ?? null

    // ── Determine today's subject from the student's subjects ──────────────────
    let targetSubjectName = null

    if (!questionId) {
      // Build groups that intersect the student's actual subjects
      const availableGroups = Object.entries(SUBJECT_GROUPS)
        .map(([key, members]) => ({
          key,
          subjects: members.filter(m => userSubjects.includes(m)),
        }))
        .filter(g => g.subjects.length > 0)

      // Rotate group by day
      const group   = seededPick(availableGroups, seed)
      // Rotate subject within group by day+1 (different offset so subject != group)
      targetSubjectName = group ? seededPick(group.subjects, seed + 1) : userSubjects[0]
    }

    // ── Fetch the question ─────────────────────────────────────────────────────
    let question = null

    if (questionId) {
      // Returning to an already-started or completed question — fetch by ID
      const { data } = await service
        .from('questions')
        .select(`
          id, question_text, options, correct_answer, explanation, hint,
          difficulty, year, exam_type,
          subject_id, topic_id,
          subjects ( id, name ),
          topics   ( id, name )
        `)
        .eq('id', questionId)
        .eq('is_active', true)
        .single()
      question = data
    } else {
      // Fresh selection — fetch hard/medium questions for the target subject
      const { data: subjectRow } = await service
        .from('subjects')
        .select('id')
        .eq('name', targetSubjectName)
        .maybeSingle()

      if (subjectRow) {
        // Get a pool of challenging questions, seed-select one
        const { data: pool } = await service
          .from('questions')
          .select(`
            id, question_text, options, correct_answer, explanation, hint,
            difficulty, year, exam_type,
            subject_id, topic_id,
            subjects ( id, name ),
            topics   ( id, name )
          `)
          .eq('subject_id', subjectRow.id)
          .eq('is_active', true)
          .in('difficulty', ['hard', 'medium'])
          .limit(200)

        if (pool?.length) {
          // Stable daily selection — same question for same subject on same day
          question = pool[seed % pool.length]
        }
      }

      // Fallback: any active question from any of the student's subjects
      if (!question) {
        const { data: subjRows } = await service
          .from('subjects')
          .select('id')
          .in('name', userSubjects)

        const subjectIds = (subjRows ?? []).map(s => s.id)

        if (subjectIds.length) {
          const { data: fallbackPool } = await service
            .from('questions')
            .select(`
              id, question_text, options, correct_answer, explanation, hint,
              difficulty, year, exam_type,
              subject_id, topic_id,
              subjects ( id, name ),
              topics   ( id, name )
            `)
            .in('subject_id', subjectIds)
            .eq('is_active', true)
            .limit(100)

          if (fallbackPool?.length) {
            question = fallbackPool[seed % fallbackPool.length]
          }
        }
      }
    }

    if (!question) {
      return NextResponse.json({ error: 'No question available today' }, { status: 404 })
    }

    // ── Shape the response — NEVER send correct_answer unless completed ────────
    const isCompleted   = existingAttempt?.completed ?? false
    const attemptsUsed  = existingAttempt?.attempts_used ?? 0
    const maxAttempts   = existingAttempt?.max_attempts  ?? 2

    // Normalise options: DB stores as object {A, B, C, D} or array
    const LETTERS = ['A', 'B', 'C', 'D', 'E']
    let optionsArr = []
    if (Array.isArray(question.options)) {
      optionsArr = question.options
    } else if (question.options && typeof question.options === 'object') {
      optionsArr = LETTERS.map(l => question.options[l]).filter(v => v != null)
    }

    const shaped = {
      id:           question.id,
      text:         question.question_text,
      options:      optionsArr,
      hint:         question.hint ?? null,
      // Only expose explanation and correct answer after completion
      explanation:  isCompleted ? (question.explanation ?? null) : null,
      correct_answer: isCompleted ? question.correct_answer : null,
      difficulty:   question.difficulty ?? 'medium',
      subject_name: question.subjects?.name ?? targetSubjectName ?? '',
      topic_name:   question.topics?.name  ?? null,
      year:         question.year ?? null,
      exam_type:    question.exam_type ?? null,
    }

    const state = {
      attempts_used:    attemptsUsed,
      max_attempts:     maxAttempts,
      completed:        isCompleted,
      correct:          existingAttempt?.correct ?? null,
      selected_indices: existingAttempt?.selected_indices ?? [],
      xp_awarded:       existingAttempt?.xp_awarded ?? 0,
      answered_today:   isCompleted,
    }

    return NextResponse.json(
      { question: shaped, state, date: today },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    )

  } catch (err) {
    console.error('[daily-quiz] GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}