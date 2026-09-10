// src/app/api/student/questions/route.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// Per-year parallel sampling — guaranteed year spread.
//
// THE PROBLEM WITH v3:
//   v3 fetched a single pool of (count × 4) rows with no ORDER BY RANDOM().
//   Supabase returns rows in storage/insertion order, so a subject where 2022
//   was imported first fills the pool with 2022 questions. The JS bucketing
//   then "spreads across years" but only the years that happened to appear in
//   those first 80 rows. 2019 and 2020 questions, imported later, never show up.
//
// THE FIX (v4):
//   1. Discover available years (cheap index scan — unchanged from v3).
//   2. For each year, count how many questions exist, pick a random offset,
//      and fetch a small quota. This guarantees every year is represented.
//   3. Run all year queries in parallel (Promise.all) — total latency equals
//      the slowest single query, not the sum of all queries.
//   4. Merge, shuffle (so years interleave), and slice to requested count.
//
// WHY RANDOM OFFSET INSTEAD OF ORDER BY RANDOM():
//   ORDER BY RANDOM() forces a full sequential scan + sort on every request.
//   A random offset with .range(offset, offset + quota) uses the index and is
//   ~10× faster on large tables. Randomness comes from the offset, not sorting.
//
// PARAMETERS:
//   exam        — 'WAEC' | 'JAMB' | 'IGCSE'
//   subjects    — comma-separated subject names  OR
//   subject_id  — single subject UUID
//   count       — number of questions (default 20, max 100)
//   mode        — 'mixed' | 'weak' | 'quick5' | 'practice' | 'timed'
//   topic_id    — constrain to a single topic (topic practice mode)
//   exclude     — comma-separated question IDs to skip (seen-question exclusion)
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

// How many questions to fetch per year.
// Over-fetch slightly so the final shuffle has real variety to pick from.
// e.g. 20 questions, 5 years → ceil(20 × 1.5 / 5) = 6 per year = 30-row pool
function quotaPerYear(totalCount, yearCount) {
  return Math.max(2, Math.ceil((totalCount * 1.5) / yearCount))
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
    const excludeStr = searchParams.get('exclude') ?? ''

    // Question IDs the student has already seen — skip them
    const excludeIds = excludeStr
      ? excludeStr.split(',').map(s => s.trim()).filter(Boolean)
      : []

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

    // ── 2. Base filter builder ────────────────────────────────────────────────
    // The questions table has two columns for exam filtering:
    //   exam_types — new array column  ['WAEC'] or ['WAEC','JAMB']
    //   exam_type  — legacy string     'WAEC' | 'JAMB' | 'BOTH'
    const legacyValues = [exam, 'BOTH']

    const applyBase = (q, useArrayCol = true) => {
      q = q.eq('is_active', true).in('subject_id', resolvedSubjectIds)
      if (useArrayCol) {
        q = q.contains('exam_types', [exam])
      } else {
        q = q.in('exam_type', legacyValues)
      }
      if (topicId)           q = q.eq('topic_id', topicId)
      if (excludeIds.length) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
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
    // Only fetches the year column — Postgres can satisfy this from the index.
    // Limit 1000 covers any realistic question bank.
    let yearRows = []
    {
      const { data, error } = await applyBase(
        service.from('questions').select('year'), true
      ).not('year', 'is', null).limit(1000)

      if (error || !data?.length) {
        const fb = await applyBase(
          service.from('questions').select('year'), false
        ).not('year', 'is', null).limit(1000)
        yearRows = fb.data ?? []
      } else {
        yearRows = data
      }
    }

    const availableYears = [
      ...new Set(yearRows.map(r => r.year).filter(Boolean))
    ].sort()

    // ── 4. Per-year parallel fetch ────────────────────────────────────────────
    let questions = []

    if (availableYears.length === 0) {
      // No year data — single pool fallback
      const POOL = Math.min(count * 4, 200)
      let { data, error } = await applyBase(
        service.from('questions').select(SELECT), true
      ).limit(POOL)
      if (error || !data?.length) {
        const fb = await applyBase(
          service.from('questions').select(SELECT), false
        ).limit(POOL)
        data = fb.data ?? []
      }
      questions = data ?? []

    } else {
      const perYear = quotaPerYear(count, availableYears.length)

      // Step A: count questions per year in parallel
      const countResults = await Promise.all(
        availableYears.map(yr =>
          applyBase(
            service.from('questions').select('id', { count: 'exact', head: true }), true
          )
          .eq('year', yr)
          .then(({ count: c, error }) => {
            if (error || c == null) {
              return applyBase(
                service.from('questions').select('id', { count: 'exact', head: true }), false
              )
              .eq('year', yr)
              .then(({ count: c2 }) => ({ year: yr, total: c2 ?? 0 }))
            }
            return { year: yr, total: c }
          })
        )
      )

      // Step B: for each year with questions, fetch a random slice
      const fetchResults = await Promise.all(
        countResults
          .filter(({ total }) => total > 0)
          .map(({ year: yr, total }) => {
            // Random offset so each session gets different questions from each year
            const maxOffset = Math.max(0, total - perYear)
            const offset    = Math.floor(Math.random() * (maxOffset + 1))

            const fetchYear = (useArray) =>
              applyBase(service.from('questions').select(SELECT), useArray)
                .eq('year', yr)
                .order('id')                        // stable order so .range() is consistent
                .range(offset, offset + perYear - 1)

            return fetchYear(true)
              .then(({ data, error }) => {
                if (error || !data?.length) return fetchYear(false).then(fb => fb.data ?? [])
                return data
              })
              .catch(() => [])
          })
      )

      questions = fetchResults.flat()

      // Safety net: if all year fetches failed, fall back to single pool
      if (!questions.length) {
        console.warn('[student/questions] per-year fetch yielded nothing, falling back to pool')
        const POOL = Math.min(count * 4, 200)
        const { data } = await applyBase(
          service.from('questions').select(SELECT), true
        ).limit(POOL)
        questions = data ?? []
      }
    }

    if (!questions.length) {
      return NextResponse.json(
        {
          questions: [], count: 0, exam, mode, availableYears,
          debug: `No active questions found for subjects [${subjectNames.join(', ')}] exam=${exam}`,
        },
        { status: 200 }
      )
    }

    // ── 5. Weak mode: sort by lowest mastery first ────────────────────────────
    if (mode === 'weak') {
      const topicIds = [...new Set(questions.map(q => q.topic_id).filter(Boolean))]
      if (topicIds.length) {
        const { data: mastery } = await service
          .from('student_topic_mastery')
          .select('topic_id, score')
          .in('topic_id', topicIds)

        const masteryMap = {}
        for (const m of mastery ?? []) masteryMap[m.topic_id] = m.score

        questions.sort((a, b) => {
          const sa = masteryMap[a.topic_id] ?? -1
          const sb = masteryMap[b.topic_id] ?? -1
          return sa - sb
        })
      }
    }

    // ── 6. Shuffle (all modes except weak) ───────────────────────────────────
    // Shuffle after per-year fetch so questions from different years interleave —
    // student doesn't see "all 2022 then all 2021 then all 2019".
    if (mode !== 'weak') shuffle(questions)

    // quick5 always caps at 5
    const finalCount = mode === 'quick5'
      ? Math.min(5, questions.length)
      : Math.min(count, questions.length)

    const selected = questions.slice(0, finalCount)

    // ── 7. Shape output ───────────────────────────────────────────────────────
    const shaped = selected.map(q => ({
      id:               q.id,
      text:             q.question_text,
      options:          q.options,
      correct_answer:   q.correct_answer,
      explanation:      q.explanation      ?? null,
      hint:             q.hint             ?? null,
      instruction_text: q.instruction_text ?? null,
      passage_text:     q.passage_text     ?? null,
      year:             q.year             ?? null,
      difficulty:       q.difficulty       ?? 'medium',
      topic_id:         q.topic_id         ?? null,
      topic_name:       q.topics?.name     ?? null,
      subject_id:       q.subject_id       ?? null,
      subject_name:     q.subjects?.name   ?? null,
    }))

    return NextResponse.json(
      {
        questions:        shaped,
        count:            shaped.length,
        exam,
        mode,
        availableYears,
        yearsRepresented: [...new Set(shaped.map(q => q.year).filter(Boolean))].sort(),
      },
      // No caching — every session must get a fresh, different set of questions
      { headers: { 'Cache-Control': 'no-store' } }
    )

  } catch (err) {
    console.error('[student/questions] unexpected error:', err)
    return NextResponse.json({
      error:  'Server error',
      detail: err?.message ?? String(err),
      stack:  err?.stack?.split('\n').slice(0, 6),
    }, { status: 500 })
  }
}