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

    const SELECT = `
      id, question_text, options, correct_answer, explanation, hint,
      year, difficulty, source,
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

    if (availableYears.length === 0) {
      // ── 3a. No year data at all — fetch a flat pool and shuffle ─────────────
      let q = service.from('questions').select(SELECT)
      q = applyBase(q).limit(count)
      const { data, error } = await q
      if (error) {
        console.error('[questions] flat fetch error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      questions = data ?? []
    } else {
      // ── 3b. Year-bucketed fetch ───────────────────────────────────────────
      // Quotas are derived directly from `count` (the number of questions the
      // caller actually requested). 5 questions requested → 5 total fetched
      // across years. 50 requested → 50 total. Never over- or under-fetch.
      //
      // Cap year buckets at `count` — no point making more parallel queries
      // than questions needed (e.g. 25 years for 5 questions → use 5 buckets,
      // 1 question each, from the 5 most-recent years).
      const MAX_BUCKETS = count
      const bucketYears = availableYears.length > MAX_BUCKETS
        ? availableYears.slice(availableYears.length - MAX_BUCKETS)  // most recent years
        : availableYears
      const numYears    = bucketYears.length
      const basePerYear = Math.max(1, Math.floor(count / numYears))
      // Remainder slots go to the most-recent years for better coverage
      const remainder   = count - basePerYear * numYears
      const yearQuotas  = bucketYears.map((year, i) => ({
        year,
        quota: basePerYear + (i >= numYears - remainder ? 1 : 0),
      }))

      // Fetch all year buckets in parallel — small targeted queries on indexed year column
      const fetches = yearQuotas.map(({ year, quota }) => {
        let q = service.from('questions').select(SELECT)
        q = applyBase(q).eq('year', year).limit(quota + 2)
        return q.then(res => res.data ?? [])
      })

      const buckets = await Promise.all(fetches)

      // Merge, deduplicate by id
      const seen = new Set()
      for (const bucket of buckets) {
        for (const row of bucket) {
          if (!seen.has(row.id)) { seen.add(row.id); questions.push(row) }
        }
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
      id:             q.id,
      text:           q.question_text,
      options:        q.options,
      correct_answer: q.correct_answer,
      explanation:    q.explanation ?? null,
      hint:           q.hint        ?? null,
      year:           q.year        ?? null,
      difficulty:     q.difficulty  ?? 'medium',
      source:         q.source      ?? 'past_paper',
      topic_id:       q.topic_id    ?? null,
      topic_name:     q.topics?.name    ?? null,
      subject_id:     q.subject_id  ?? null,
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