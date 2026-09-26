// src/app/api/student/questions/route.js — v6
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/questions — the question feed for every practice mode.
//
// v6: one database round trip. Filtering, random sampling and the spread
// across past-paper years all happen inside Postgres (get_practice_questions).
// v5 made one "count" and one "fetch" query per year — ~60 calls for a
// 20-question session, ~240 for a JAMB mock.
//
// PARAMETERS
//   exam        'WAEC' | 'JAMB' | 'IGCSE'
//   subjects    comma-separated subject names   OR
//   subject_id  single subject uuid
//   count       number of questions (default 20, max 100)
//   mode        'mixed' | 'weak' | 'quick5' | 'practice' | 'timed' | 'mock' | 'battle'
//   topic_id    constrain to one topic
//   exclude     comma-separated question ids to skip (max 200)
//
// Open to guests (guest mode practises too), so it only ever returns active,
// published questions.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'

const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXAMS       = new Set(['WAEC', 'JAMB', 'IGCSE'])
const MAX_EXCLUDE = 200

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Target ~30% easy, 50% medium, 20% hard — mirrors real exam papers. Falls back
// to a plain slice when the pool lacks variety (e.g. everything tagged medium).
function applyDifficultyDistribution(pool, targetCount) {
  const easy   = pool.filter(q => q.difficulty === 'easy')
  const medium = pool.filter(q => q.difficulty === 'medium')
  const hard   = pool.filter(q => q.difficulty === 'hard')

  if (!(easy.length && hard.length) || pool.length <= targetCount) {
    return pool.slice(0, targetCount)
  }

  const wantEasy   = Math.round(targetCount * 0.30)
  const wantHard   = Math.round(targetCount * 0.20)
  const wantMedium = targetCount - wantEasy - wantHard

  const gotEasy   = easy.slice(0, wantEasy)
  const gotHard   = hard.slice(0, wantHard)
  const shortfall = (wantEasy - gotEasy.length) + (wantHard - gotHard.length)
  const gotMedium = medium.slice(0, wantMedium + shortfall)

  const picked = shuffle([...gotEasy, ...gotMedium, ...gotHard])
  if (picked.length < targetCount) {
    const used = new Set(picked.map(q => q.id))
    return [...picked, ...pool.filter(q => !used.has(q.id))].slice(0, targetCount)
  }
  return picked.slice(0, targetCount)
}

function shape(q) {
  return {
    id:               q.id,
    text:             q.question_text,
    options:          q.options,
    correct_answer:   q.correct_answer,
    explanation:      q.explanation  ?? null,
    hint:             null,
    instruction_text: null,
    passage_text:     q.passage_text ?? null,
    year:             q.year         ?? null,
    difficulty:       q.difficulty   ?? 'medium',
    topic_id:         q.topic_id     ?? null,
    topic_name:       q.topic_name   ?? null,
    subject_id:       q.subject_id   ?? null,
    subject_name:     q.subject_name ?? null,
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const examParam  = (searchParams.get('exam') ?? 'WAEC').toUpperCase()
    const exam       = EXAMS.has(examParam) ? examParam : 'WAEC'
    const count      = Math.min(Math.max(parseInt(searchParams.get('count') ?? '20', 10) || 20, 1), 100)
    const mode       = searchParams.get('mode') ?? 'mixed'
    const topicId    = searchParams.get('topic_id')
    const subjectId  = searchParams.get('subject_id')
    const subjectNames = (searchParams.get('subjects') ?? '')
      .split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
    const excludeIds = (searchParams.get('exclude') ?? '')
      .split(',').map(s => s.trim()).filter(s => UUID_RE.test(s)).slice(0, MAX_EXCLUDE)

    if (topicId && !UUID_RE.test(topicId))     return NextResponse.json({ error: 'Invalid topic_id' },   { status: 400 })
    if (subjectId && !UUID_RE.test(subjectId)) return NextResponse.json({ error: 'Invalid subject_id' }, { status: 400 })
    if (!subjectNames.length && !subjectId) {
      return NextResponse.json({ error: 'subjects or subject_id required' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // ── 1. Subject ids ─────────────────────────────────────────────────────────
    // subjects has one row per exam per name, so name lookups must filter by exam.
    let subjectIds = subjectId ? [subjectId] : []
    if (!subjectIds.length) {
      const { data: rows, error } = await db
        .from('subjects').select('id').in('name', subjectNames).eq('exam_type', exam)
      if (error) throw error
      subjectIds = (rows ?? []).map(s => s.id)
    }
    if (!subjectIds.length) {
      return NextResponse.json({ error: 'No matching subjects found' }, { status: 404 })
    }

    // ── 2. Candidate pool — one round trip ─────────────────────────────────────
    // Over-fetch (3×) so the difficulty mix has room to work. Year spread only
    // matters when there are enough questions for it to show.
    const { data: pool, error: poolErr } = await db.rpc('get_practice_questions', {
      p_subject_ids: subjectIds,
      p_exam:        exam,
      p_topic_id:    topicId || null,
      p_exclude:     excludeIds.length ? excludeIds : null,
      p_pool:        Math.min(count * 3, 300),
      p_year_spread: count > 5,
    })
    if (poolErr) throw poolErr

    const questions = (pool ?? []).filter(Boolean)
    if (!questions.length) {
      return NextResponse.json(
        { questions: [], count: 0, exam, mode, availableYears: [] },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // ── 3. Weak mode: weakest topics first (this student's mastery only) ───────
    let ordered = questions
    if (mode === 'weak') {
      let userId = null
      try {
        const supabase = await createClient()
        userId = (await supabase.auth.getUser()).data?.user?.id ?? null
      } catch { /* guest */ }

      const topicIds = [...new Set(questions.map(q => q.topic_id).filter(Boolean))]
      if (userId && topicIds.length) {
        const { data: stats } = await db.rpc('stats_by_topic', {
          p_student_ids: [userId], p_since: null, p_exam: exam, p_subject_id: null,
        })
        const score = {}
        for (const t of stats ?? []) {
          if (t.answered > 0) score[t.topic_id] = t.correct / t.answered
        }
        // Unseen topics (-1) first, then lowest accuracy.
        ordered = shuffle([...questions]).sort((a, b) => (score[a.topic_id] ?? -1) - (score[b.topic_id] ?? -1))
      }
    }

    const finalCount = mode === 'quick5' ? Math.min(5, ordered.length) : Math.min(count, ordered.length)
    const selected = mode === 'weak'
      ? ordered.slice(0, finalCount)
      : applyDifficultyDistribution(shuffle([...ordered]), finalCount)

    const shaped = selected.map(shape)
    return NextResponse.json(
      {
        questions:        shaped,
        count:            shaped.length,
        exam,
        mode,
        yearsRepresented: [...new Set(shaped.map(q => q.year).filter(Boolean))].sort(),
      },
      // Every session must get a fresh set — never cache.
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[student/questions] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not load questions. Please try again.' }, { status: 500 })
  }
}
