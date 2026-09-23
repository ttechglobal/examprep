// src/app/api/student/questions/route.js — v5
// ─────────────────────────────────────────────────────────────────────────────
// Per-year parallel sampling — guaranteed year spread.
//
// EXAM FILTERING:
//   exam_type TEXT ('WAEC'|'JAMB'|'BOTH') is the active column.
//   exam_types TEXT[] exists in the schema but is null for all rows.
//   Filter: exam_type IN (exam, 'BOTH') — single, direct, no fallback needed.
//
// SMALL-COUNT FAST PATH (count ≤ 5):
//   Phase-1 always fetches 3 questions. The per-year machinery (year discovery +
//   N parallel count + N parallel fetch) makes no sense for 3 results — it can
//   spawn 15+ DB round-trips. count ≤ 5 goes straight to a single pool fetch.
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
    // When subject_id is supplied directly (happy path), use it as-is.
    // When falling back to name resolution, MUST filter by exam_type so we get
    // the correct row — subjects table has one row per exam per name (e.g.
    // "Mathematics WAEC" and "Mathematics JAMB" are separate rows with different
    // UUIDs). Without the exam filter the wrong UUID can be returned, causing
    // questions tagged under the correct exam's UUID to be missed entirely.
    let resolvedSubjectIds = []
    if (subjectId) {
      resolvedSubjectIds = [subjectId]
    } else {
      const { data: subjRows } = await service
        .from('subjects')
        .select('id, name')
        .in('name', subjectNames)
        .eq('exam_type', exam)
      resolvedSubjectIds = (subjRows ?? []).map(s => s.id)
    }

    if (!resolvedSubjectIds.length) {
      return NextResponse.json({ error: 'No matching subjects found' }, { status: 404 })
    }

    // ── 2. Base filter builder ────────────────────────────────────────────────
    // exam_type is TEXT: 'WAEC' | 'JAMB' | 'BOTH'.
    // exam_types (TEXT[]) exists in the schema but is null for every row —
    // the import pipeline never populated it. Filter on exam_type only.
    const applyBase = (q) => {
      q = q.eq('is_active', true)
           .in('subject_id', resolvedSubjectIds)
           .in('exam_type', [exam, 'BOTH'])
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
    //
    // SMALL-COUNT FAST PATH: for count ≤ 5 (first-batch=3, quick5=5) the
    // per-year machinery is pure overhead — year-spread across 3–5 questions is
    // meaningless and spawns up to 16 parallel DB round-trips. Skip straight to
    // a single pool fetch instead. Same single-pool path used when no years exist.
    const USE_YEAR_SPREAD = count > 5

    let yearRows = []
    if (USE_YEAR_SPREAD) {
      const { data } = await applyBase(
        service.from('questions').select('year')
      ).not('year', 'is', null).limit(1000)
      yearRows = data ?? []
    }

    const availableYears = USE_YEAR_SPREAD
      ? [...new Set(yearRows.map(r => r.year).filter(Boolean))].sort()
      : []

    // ── 4. Per-year parallel fetch ────────────────────────────────────────────
    let questions = []

    if (availableYears.length === 0) {
      // Single pool path — used for small counts AND when no year data exists.
      // For small counts (≤5): one query is faster than the year machinery.
      const POOL = Math.min(count * 4, 200)
      const { data } = await applyBase(
        service.from('questions').select(SELECT)
      ).limit(POOL)
      questions = data ?? []

    } else {
      const perYear = quotaPerYear(count, availableYears.length)

      // Step A: count questions per year in parallel
      const countResults = await Promise.all(
        availableYears.map(yr =>
          applyBase(
            service.from('questions').select('id', { count: 'exact', head: true })
          )
          .eq('year', yr)
          .then(({ count: c }) => ({ year: yr, total: c ?? 0 }))
        )
      )

      // Step B: for each year with questions, fetch a random slice
      const fetchResults = await Promise.all(
        countResults
          .filter(({ total }) => total > 0)
          .map(({ year: yr, total }) => {
            // When the pool is bigger than what we need, use random offset (fast index scan).
            // When the pool is small (total <= perYear × 2), there's no room for offset
            // randomness so use ORDER BY RANDOM() instead — it's only slow on large tables.
            const useRandomOrder = total <= perYear * 2

            const fetchYear = () => {
              let q = applyBase(service.from('questions').select(SELECT)).eq('year', yr)
              if (useRandomOrder) {
                // Small pool — fetch all candidates and shuffle in JS
                return q.order('id').limit(Math.min(total, perYear * 3))
              } else {
                // Large pool — random offset into the index (fast, avoids full scan)
                const maxOffset = Math.max(0, total - perYear)
                const offset    = Math.floor(Math.random() * (maxOffset + 1))
                return q.order('id').range(offset, offset + perYear - 1)
              }
            }

            return fetchYear()
              .then(({ data }) => {
                const rows = data ?? []
                if (useRandomOrder && rows.length > perYear) {
                  return shuffle(rows).slice(0, perYear)
                }
                return rows
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
          service.from('questions').select(SELECT)
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

    // ── Difficulty distribution ──────────────────────────────────────────────
    // Target: ~30% easy, 50% medium, 20% hard — mirrors real exam distributions.
    // Only applies when we have enough questions across multiple difficulty levels.
    // Falls back to plain slice if difficulty data is missing or pool is small.
    function applyDifficultyDistribution(pool, targetCount) {
      const easy   = pool.filter(q => q.difficulty === 'easy')
      const medium = pool.filter(q => q.difficulty === 'medium')
      const hard   = pool.filter(q => q.difficulty === 'hard')

      // If everything is the same difficulty (e.g. all medium from default tagging),
      // or pool is too small to meaningfully distribute — just slice
      const hasVariety = easy.length > 0 && hard.length > 0
      if (!hasVariety || pool.length <= targetCount) {
        return pool.slice(0, targetCount)
      }

      const wantEasy   = Math.round(targetCount * 0.30)
      const wantHard   = Math.round(targetCount * 0.20)
      const wantMedium = targetCount - wantEasy - wantHard

      // Take what we can — if a bucket is short, steal from medium
      const gotEasy   = easy.slice(0, wantEasy)
      const gotHard   = hard.slice(0, wantHard)
      const shortfall = (wantEasy - gotEasy.length) + (wantHard - gotHard.length)
      const gotMedium = medium.slice(0, wantMedium + shortfall)

      const distributed = shuffle([...gotEasy, ...gotMedium, ...gotHard])
      // If we still don't have enough, top up from remaining pool
      if (distributed.length < targetCount) {
        const used = new Set(distributed.map(q => q.id))
        const extras = pool.filter(q => !used.has(q.id))
        return [...distributed, ...extras].slice(0, targetCount)
      }
      return distributed.slice(0, targetCount)
    }

    // quick5 always caps at 5
    const finalCount = mode === 'quick5'
      ? Math.min(5, questions.length)
      : Math.min(count, questions.length)

    const selected = mode === 'weak'
      ? questions.slice(0, finalCount)                          // weak mode: already sorted by mastery
      : applyDifficultyDistribution(questions, finalCount)      // all other modes: distribute by difficulty

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