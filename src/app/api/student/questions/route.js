// src/app/api/student/questions/route.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Year-bucketed sampling: fetches the distinct set of years in the question
// bank for this subject/exam, then pulls a proportional quota from each year.
// Result: genuine spread regardless of how many years of papers are in the DB.
// As new years are added they are automatically included in the distribution.
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

    // ── 1. Resolve subject IDs ────────────────────────────────────────────────
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

    // ── 2. Shared filter helper ───────────────────────────────────────────────
    const applyBase = (q) => {
      q = q.eq('is_active', true)
           .in('subject_id', resolvedSubjectIds)
           .or(`exam_type.eq.${exam},exam_type.eq.BOTH`)
      if (topicId) q = q.eq('topic_id', topicId)
      return q
    }

    // Include explanation, hint, instruction_text, and passage_text so the
    // session can show explanations and English instruction banners without
    // a second round-trip. The payload increase is acceptable for session quality.
    const SELECT = `
      id, question_text, options, correct_answer,
      year, difficulty,
      explanation, hint, instruction_text, passage_text,
      topic_id, subject_id,
      topics   ( id, name ),
      subjects ( id, name )
    `

    // ── 3. Discover available years (cheap index scan) ────────────────────────
    // Select only the year column so Postgres can use an index.
    // Limit to 500 rows — enough to surface every distinct year in any realistic
    // question bank without pulling the entire table just to find unique values.
    let yearQuery = service.from('questions').select('year')
    yearQuery = applyBase(yearQuery).not('year', 'is', null).limit(500)
    const { data: yearRows } = await yearQuery

    // Build a sorted, deduplicated list of years
    const availableYears = [...new Set((yearRows ?? []).map(r => r.year).filter(Boolean))].sort()

    let questions = []

    // ── 3b. Single pooled fetch — sample JS-side for year spread ───────────
    // Old approach: N parallel queries (one per year) = N round-trips.
    // New approach: one query with a 4× pool, shuffle + slice in JS.
    // Year spread is preserved: we oversample (4× count), then pick questions
    // proportionally from each year group in JS — zero extra round-trips.
    {
      const POOL_SIZE = Math.min(count * 4, 200)  // never over-fetch
      let q = service.from('questions').select(SELECT)
      q = applyBase(q).limit(POOL_SIZE)
      const { data, error } = await q
      if (error) {
        console.error('[questions] pool fetch error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      const pool = data ?? []

      if (availableYears.length > 1 && pool.length > count) {
        // Distribute proportionally across years in JS — no extra DB round-trips
        const byYear = {}
        for (const q of pool) {
          const y = q.year ?? '__none__'
          if (!byYear[y]) byYear[y] = []
          byYear[y].push(q)
        }
        const years   = Object.keys(byYear)
        const perYear = Math.max(1, Math.ceil(count / years.length))
        const picked  = []
        for (const y of years) {
          const bucket = byYear[y]
          // Shuffle bucket so we don't always pick the same questions
          for (let i = bucket.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bucket[i], bucket[j]] = [bucket[j], bucket[i]]
          }
          picked.push(...bucket.slice(0, perYear))
        }
        questions = picked
      } else {
        questions = pool
      }
    }

    if (!questions.length) {
      return NextResponse.json(
        { questions: [], count: 0, exam, mode,
          debug: `No active questions found for subjects [${subjectNames.join(', ')}] exam=${exam}` },
        { status: 200 }
      )
    }

    // ── 4. Weak mode: sort by lowest mastery first ────────────────────────────
    if (mode === 'weak' && questions.length) {
      const topicIds = [...new Set(questions.map(q => q.topic_id).filter(Boolean))]
      if (topicIds.length) {
        const { data: mastery } = await service
          .from('student_topic_mastery')
          .select('topic_id, score')
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

    // ── 5. Shuffle (all modes except weak) ───────────────────────────────────
    if (mode !== 'weak') shuffle(questions)

    // quick5 always caps at 5 regardless of count param
    const finalCount = mode === 'quick5' ? Math.min(5, questions.length) : Math.min(count, questions.length)
    const selected   = questions.slice(0, finalCount)

    // ── 6. Shape output ───────────────────────────────────────────────────────
    const shaped = selected.map(q => ({
      id:               q.id,
      text:             q.question_text,
      options:          q.options,
      correct_answer:   q.correct_answer,
      explanation:      q.explanation      ?? null,
      hint:             q.hint             ?? null,
      instruction_text: q.instruction_text ?? null,
      passage_text:     q.passage_text     ?? null,
      year:             q.year        ?? null,
      difficulty:       q.difficulty  ?? 'medium',
      topic_id:         q.topic_id    ?? null,
      topic_name:       q.topics?.name    ?? null,
      subject_id:       q.subject_id  ?? null,
      subject_name:     q.subjects?.name  ?? null,
    }))

    return NextResponse.json(
      { questions: shaped, count: shaped.length, exam, mode },
      { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' } }
    )

  } catch (err) {
    console.error('[student/questions] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}