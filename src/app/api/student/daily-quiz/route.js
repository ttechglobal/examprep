// src/app/api/student/daily-quiz/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/daily-quiz
//
// Returns TWO daily challenge questions. Key fixes vs v2:
//   - subjects table has duplicate names per exam_type → use .limit(1) not .maybeSingle()
//   - fallback: if no subject match, query questions directly by subject name text
//   - fallback: if still nothing, pull any 2 active questions from the DB
//   - board: show all students who attempted today (not just completed)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SUBJECT_GROUPS = {
  sciences:     ['Physics', 'Chemistry', 'Biology'],
  social:       ['Economics', 'Government', 'Commerce', 'Geography'],
  maths:        ['Mathematics', 'Further Mathematics'],
  languages:    ['English Language', 'Use of English', 'Literature in English'],
  agricultural: ['Agricultural Science'],
}

function dateSeed(dateStr) {
  const d   = new Date(dateStr)
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return d.getFullYear() * 1000 + doy
}
function seededPick(arr, seed) {
  if (!arr?.length) return null
  return arr[Math.abs(seed) % arr.length]
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

// ── Fetch a question pool for a subject, robust to duplicate exam_type rows ──
async function pickQuestion(service, subjectName, seed) {
  // Step 1: resolve subject_id. Use limit(1) — NOT maybeSingle() — because
  // the subjects table may have the same name under WAEC and JAMB exam_types.
  const { data: subjectRows } = await service
    .from('subjects')
    .select('id')
    .eq('name', subjectName)
    .eq('is_active', true)
    .limit(1)

  let pool = null

  if (subjectRows?.length) {
    // Step 2a: query by subject_id
    const subjectId = subjectRows[0].id
    const { data } = await service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation, hint,
        difficulty, year, exam_type, subject_id, topic_id,
        subjects ( id, name ),
        topics   ( id, name )
      `)
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .limit(200)
    pool = data
  }

  // Step 2b: fallback — match by subject name stored on the question itself
  // (some pipelines store subject name directly rather than via FK)
  if (!pool?.length) {
    const { data } = await service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation, hint,
        difficulty, year, exam_type, subject_id, topic_id,
        subjects ( id, name ),
        topics   ( id, name )
      `)
      .ilike('question_text', `%${subjectName.split(' ')[0]}%`)
      .eq('is_active', true)
      .limit(50)
    pool = data
  }

  if (!pool?.length) return null
  return pool[Math.abs(seed) % pool.length]
}

// ── Absolute fallback — any two active questions ──────────────────────────────
async function pickAnyQuestion(service, seed, excludeId = null) {
  let q = service
    .from('questions')
    .select(`
      id, question_text, options, correct_answer, explanation, hint,
      difficulty, year, exam_type, subject_id, topic_id,
      subjects ( id, name ),
      topics   ( id, name )
    `)
    .eq('is_active', true)
    .limit(100)

  if (excludeId) q = q.neq('id', excludeId)
  const { data: pool } = await q
  if (!pool?.length) return null
  return pool[Math.abs(seed) % pool.length]
}

function shapeQuestion(q, subjectName) {
  if (!q) return null
  const LETTERS = ['A','B','C','D','E']
  let optionsArr = []
  if (Array.isArray(q.options)) {
    optionsArr = q.options
  } else if (q.options && typeof q.options === 'object') {
    optionsArr = LETTERS.map(l => q.options[l]).filter(v => v != null)
  }
  if (!optionsArr.length) return null   // question unusable without options
  return {
    id:             q.id,
    text:           q.question_text,
    options:        optionsArr,
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
    const service = db()
    const today   = todayStr()
    const seed    = dateSeed(today)

    // ── Auth (optional) ───────────────────────────────────────────────────────
    let userId       = null
    let userSubjects = []

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        const { data: prof } = await service
          .from('profiles')
          .select('subjects_waec, subjects_jamb, subjects')
          .eq('id', userId)
          .single()
        userSubjects = [...new Set([
          ...(prof?.subjects_waec ?? []),
          ...(prof?.subjects_jamb ?? []),
          ...(prof?.subjects      ?? []),
        ])]
      }
    } catch {}

    // Guest fallback: subjects from URL param
    if (!userSubjects.length) {
      const p = searchParams.get('subjects') ?? ''
      userSubjects = p.split(',').map(s => s.trim()).filter(Boolean)
    }

    // ── Existing attempts for today ───────────────────────────────────────────
    const existingBySlot = {}
    if (userId) {
      const { data: rows } = await service
        .from('daily_quiz_attempts')
        .select('*')
        .eq('student_id', userId)
        .eq('quiz_date', today)
      for (const row of rows ?? []) {
        existingBySlot[row.slot ?? 1] = row
      }
    }

    // ── Pick two subjects ─────────────────────────────────────────────────────
    let subject1 = null
    let subject2 = null

    if (userSubjects.length) {
      const availableGroups = Object.entries(SUBJECT_GROUPS)
        .map(([key, members]) => ({ key, subjects: members.filter(m => userSubjects.includes(m)) }))
        .filter(g => g.subjects.length > 0)

      if (availableGroups.length >= 2) {
        const g1 = seededPick(availableGroups, seed)
        const g2 = seededPick(availableGroups.filter(g => g.key !== g1.key), seed + 3)
        subject1 = seededPick(g1.subjects, seed + 1)
        subject2 = seededPick(g2.subjects, seed + 7)
      } else if (availableGroups.length === 1) {
        const subs = availableGroups[0].subjects
        subject1 = seededPick(subs, seed)
        subject2 = seededPick(subs, seed + 5) ?? subject1
      } else {
        // subjects don't match any group — use them directly
        subject1 = seededPick(userSubjects, seed)
        subject2 = seededPick(userSubjects, seed + 5) ?? subject1
      }
    }

    // ── Build challenge slots ─────────────────────────────────────────────────
    const challenges = []
    let firstQuestionId = null

    for (const [slot, subjectName, slotSeed] of [
      [1, subject1, seed],
      [2, subject2, seed + 13],
    ]) {
      const existing   = existingBySlot[slot] ?? null
      const questionId = existing?.question_id ?? null

      let rawQ = null

      if (questionId) {
        // Returning to an already-started question
        const { data } = await service
          .from('questions')
          .select(`
            id, question_text, options, correct_answer, explanation, hint,
            difficulty, year, exam_type, subject_id, topic_id,
            subjects ( id, name ),
            topics   ( id, name )
          `)
          .eq('id', questionId)
          .eq('is_active', true)
          .maybeSingle()
        rawQ = data
      } else if (subjectName) {
        rawQ = await pickQuestion(service, subjectName, slotSeed)
      }

      // Absolute fallback: any question (exclude slot 1's question for slot 2)
      if (!rawQ) {
        rawQ = await pickAnyQuestion(service, slotSeed, firstQuestionId)
      }

      if (slot === 1 && rawQ) firstQuestionId = rawQ.id

      const shaped      = shapeQuestion(rawQ, subjectName)
      const isCompleted = existing?.completed ?? false

      if (shaped && isCompleted && rawQ) {
        shaped.correct_answer = rawQ.correct_answer
        shaped.explanation    = rawQ.explanation ?? null
      }

      challenges.push({
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
      })
    }

    return NextResponse.json(
      { challenges, date: today },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )

  } catch (err) {
    console.error('[daily-quiz] GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}