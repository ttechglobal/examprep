// src/app/api/student/questions/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// FIXES from v1:
//   1. Column is question_text in DB (not text) — mapped to text in output
//   2. Subject filter uses subject_id directly (Supabase nested join filters
//      on foreign table columns don't work as inline .in() filters)
//   3. exam_type filter correctly handles WAEC | JAMB | BOTH
//   4. topics join simplified — subject already available via direct subject_id FK
// ─────────────────────────────────────────────────────────────────────────────

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const exam       = searchParams.get('exam') ?? 'WAEC'
    const subjectStr = searchParams.get('subjects') ?? ''
    const count      = Math.min(parseInt(searchParams.get('count') ?? '20'), 100)
    const mode       = searchParams.get('mode') ?? 'mixed'
    const topicId    = searchParams.get('topic_id')
    const subjectId  = searchParams.get('subject_id')

    const subjectNames = subjectStr.split(',').map(s => s.trim()).filter(Boolean)

    if (!subjectNames.length && !subjectId) {
      return NextResponse.json({ error: 'subjects or subject_id required' }, { status: 400 })
    }

    const service = db()

    // ── 1. Resolve subject IDs from names ─────────────────────────────────────
    let resolvedSubjectIds = []
    if (subjectId) {
      resolvedSubjectIds = [subjectId]
    } else {
      const { data: subjRows } = await service
        .from('subjects')
        .select('id, name')
        .in('name', subjectNames)
      resolvedSubjectIds = (subjRows ?? []).map(s => s.id)
    }

    if (!resolvedSubjectIds.length) {
      return NextResponse.json({ error: 'No matching subjects found' }, { status: 404 })
    }

    // ── 2. Build base question query ──────────────────────────────────────────
    // DB column is `question_text` — we alias it to `text` in the shaped output
    // Filter by subject_id directly on questions table (faster than nested join filter)
    const fetchLimit = mode === 'mock'
      ? Math.min(count * 5, 500)
      : Math.min(count * 3, 300)

    let query = service
      .from('questions')
      .select(`
        id, question_text, options, correct_answer, explanation, hint,
        year, difficulty, source,
        topic_id, subject_id,
        topics  ( id, name ),
        subjects ( id, name )
      `)
      .eq('is_active', true)
      .in('subject_id', resolvedSubjectIds)
      .or(`exam_type.eq.${exam},exam_type.eq.BOTH`)
      .limit(fetchLimit)

    if (topicId) query = query.eq('topic_id', topicId)

    const { data: rawQuestions, error } = await query

    if (error) {
      console.error('[questions] query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let questions = rawQuestions ?? []

    if (!questions.length) {
      return NextResponse.json(
        { questions: [], count: 0, exam, mode,
          debug: `No active questions found for subjects [${subjectNames.join(', ')}] exam=${exam}` },
        { status: 200 }
      )
    }

    // ── 3. Weak mode: sort by lowest mastery first ────────────────────────────
    if (mode === 'weak' && questions.length) {
      const topicIds = [...new Set(questions.map(q => q.topic_id).filter(Boolean))]

      if (topicIds.length) {
        const { data: mastery } = await service
          .from('student_topic_mastery')
          .select('topic_id, score')
          .eq('student_id', user.id)
          .eq('exam_type', exam)          // exam-aware mastery (after migration)
          .in('topic_id', topicIds)

        const masteryMap = {}
        for (const m of mastery ?? []) masteryMap[m.topic_id] = m.score

        // score -1 = never attempted → comes first (highest priority)
        questions.sort((a, b) => {
          const sa = masteryMap[a.topic_id] ?? -1
          const sb = masteryMap[b.topic_id] ?? -1
          return sa - sb
        })
      }
    }

    // ── 4. Shuffle (all modes except weak) ───────────────────────────────────
    if (mode !== 'weak') shuffle(questions)

    // quick5 always caps at 5 regardless of count param
    const finalCount = mode === 'quick5' ? Math.min(5, questions.length) : Math.min(count, questions.length)
    const selected   = questions.slice(0, finalCount)

    // ── 5. Shape output ───────────────────────────────────────────────────────
    const shaped = selected.map(q => ({
      id:             q.id,
      text:           q.question_text,    // ← DB column is question_text
      options:        q.options,
      correct_answer: q.correct_answer,
      explanation:    q.explanation ?? null,
      hint:           q.hint         ?? null,
      year:           q.year ?? null,
      difficulty:     q.difficulty ?? 'medium',
      source:         q.source ?? 'past_paper',
      topic_id:       q.topic_id  ?? null,
      topic_name:     q.topics?.name    ?? null,
      subject_id:     q.subject_id ?? null,
      subject_name:   q.subjects?.name  ?? null,
    }))

    return NextResponse.json(
      { questions: shaped, count: shaped.length, exam, mode },
      { headers: { 'Cache-Control': 'private, max-age=0' } }
    )

  } catch (err) {
    console.error('[student/questions] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}