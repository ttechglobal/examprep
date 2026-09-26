// src/app/api/student/topics/route.js — v2
// GET /api/student/topics?subject_id=<uuid>&exam=WAEC
// Topics for a subject that have at least one active question for this exam,
// with question counts — used by topic practice, battle setup and progress.
//
// v2: counts come from topic_question_counts() (a GROUP BY in Postgres). v1
// downloaded every question's topic_id, which Supabase caps at 1,000 rows —
// big subjects lost topics. The response is the same for every student, so
// it's cached at the CDN.

import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXAMS   = new Set(['WAEC', 'JAMB', 'IGCSE'])

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')
    const examParam = (searchParams.get('exam') ?? 'WAEC').toUpperCase()
    const exam      = EXAMS.has(examParam) ? examParam : 'WAEC'

    if (!subjectId || !UUID_RE.test(subjectId)) {
      return NextResponse.json({ error: 'subject_id required' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const [topicsRes, countsRes] = await Promise.all([
      db.from('topics')
        .select('id, name, order_index, exam_type')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true }),
      db.rpc('topic_question_counts', { p_subject_id: subjectId, p_exam: exam }),
    ])
    if (topicsRes.error) throw topicsRes.error
    if (countsRes.error) throw countsRes.error

    const countMap = {}
    for (const c of countsRes.data ?? []) countMap[c.topic_id] = Number(c.question_count) || 0

    const topics = (topicsRes.data ?? [])
      .filter(t => !t.exam_type || t.exam_type === exam || t.exam_type === 'BOTH')
      .filter(t => (countMap[t.id] ?? 0) > 0)
      .map(t => ({
        id:             t.id,
        name:           t.name,
        order_index:    t.order_index,
        exam_type:      t.exam_type,
        question_count: countMap[t.id],
      }))

    return NextResponse.json(topics, {
      headers: { 'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[student/topics]', err?.message ?? err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
