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
    // The questions table has two columns for exam filtering:
    //   exam_types  — new array column  e.g. ['WAEC'] or ['WAEC','JAMB']
    //   exam_type   — legacy string column e.g. 'WAEC' | 'JAMB' | 'BOTH'
    // We try exam_types first (contains), fall back to exam_type (in) if needed.
    const legacyValues = [exam, 'BOTH']

    const applyBase = (q, useArrayCol = true) => {
      q = q.eq('is_active', true).in('subject_id', resolvedSubjectIds)
      if (useArrayCol) {
        q = q.contains('exam_types', [exam])
      } else {
        q = q.in('exam_type', legacyValues)
      }
      if (topicId) q = q.eq('topic_id', topicId)
      return q
    }




    const SELECT = `
      id, question_text, options, correct_answer,
      year, difficulty,
      explanation, passage_text,
      topic_id, subject_id,
      topics   ( id, name ),
      subjects ( id, name )
    `

    // ── 3. Discover available years (cheap index scan) ────────────────────────
    // Select only the year column so Postgres can use an index.
    // Limit to 500 rows — enough to surface every distinct year in any realistic
    // question bank without pulling the entire table just to find unique values.
    let yearRows = null
    {
      const { data, error } = await applyBase(service.from('questions').select('year'), true)
        .not('year', 'is', null).limit(500)
      if (error || !data?.length) {
        const fb = await applyBase(service.from('questions').select('year'), false)
          .not('year', 'is', null).limit(500)
        yearRows = fb.data ?? []
      } else {
        yearRows = data ?? []
      }
    }

    // Build a sorted, deduplicated list of years
    const availableYears = [...new Set((yearRows).map(r => r.year).filter(Boolean))].sort()

    let questions = []

    // ── 3b. Single pooled fetch — sample JS-side for year spread ───────────
    // Try exam_types[] first, fall back to legacy exam_type string column.
    {
      const POOL_SIZE = Math.min(count * 4, 200)  // never over-fetch
      let primaryQ = applyBase(service.from('questions').select(SELECT), true).limit(POOL_SIZE)
      let { data, error } = await primaryQ

      if (error || !data?.length) {
        // Fall back to legacy exam_type string column
        let fallbackQ = applyBase(service.from('questions').select(SELECT), false).limit(POOL_SIZE)
        const fb = await fallbackQ
        if (fb.error) {
          console.error('[questions] pool fetch error (both attempts):', fb.error.message)
          return NextResponse.json({ error: fb.error.message }, { status: 500 })
        }
        data = fb.data ?? []
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
    return NextResponse.json({
      error: 'Server error',
      detail: err?.message ?? String(err),
      stack: err?.stack?.split('\n').slice(0, 6),
    }, { status: 500 })
  }
}