// src/app/api/student/mastery/route.js — v3 (perf)
// ─────────────────────────────────────────────────────────────────────────────
// PERF: v2 had 5-7 sequential awaits. v3 collapses to 2 parallel rounds:
//   Round 1 (parallel): auth + profile
//   Round 2 (parallel): subject resolution + mastery rows
//   Round 3 (parallel): topics + backward-compat subject name lookup
// Cache-Control added: private, max-age=60, stale-while-revalidate=120
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }        from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse }        from 'next/server'

const serviceClient = () => svc(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = serviceClient()

  // ── Round 1: profile + existing mastery rows — parallel ───────────────────
  const [{ data: profile }, { data: masteryRows }] = await Promise.all([
    db.from('profiles').select('subjects, exam_type').eq('id', user.id).single(),
    db.from('student_topic_mastery')
      .select('topic_id, score, attempt_count, subject_id')
      .eq('student_id', user.id),
  ])

  const subjectNames     = profile?.subjects ?? []
  const masterySubjectIds = [...new Set((masteryRows ?? []).map(m => m.subject_id).filter(Boolean))]

  // ── Round 2: resolve subjects + topics — parallel ────────────────────────
  // Fetch enrolled subjects by name AND any extra subjects from mastery rows
  // that aren't in profile (backward-compat) — both in one round
  const [subjectsByNameRes, subjectsByIdRes] = await Promise.all([
    subjectNames.length > 0
      ? db.from('subjects').select('id, name').in('name', subjectNames).eq('is_active', true)
      : Promise.resolve({ data: [] }),
    masterySubjectIds.length > 0
      ? db.from('subjects').select('id, name').in('id', masterySubjectIds)
      : Promise.resolve({ data: [] }),
  ])

  // Build subject map (merge both result sets)
  const subjectMap = {}
  for (const s of [...(subjectsByNameRes.data ?? []), ...(subjectsByIdRes.data ?? [])]) {
    subjectMap[s.id] = s.name
  }
  const subjectIds = Object.keys(subjectMap)

  // ── Round 3: fetch all topics for enrolled subjects ───────────────────────
  let allTopics = []
  if (subjectIds.length > 0) {
    const { data } = await db
      .from('topics')
      .select('id, name, subject_id, is_core, order_index')
      .in('subject_id', subjectIds)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    allTopics = data ?? []
  }

  // Fallback: no enrollment found — use topics from mastery rows directly
  if (allTopics.length === 0 && masteryRows?.length > 0) {
    const attemptedTopicIds = [...new Set(masteryRows.map(m => m.topic_id).filter(Boolean))]
    if (attemptedTopicIds.length > 0) {
      const { data: fallbackTopics } = await db
        .from('topics').select('id, name, subject_id, is_core, order_index').in('id', attemptedTopicIds)
      allTopics = fallbackTopics ?? []
    }
  }

  // Build mastery lookup
  const masteryMap = {}
  for (const m of masteryRows ?? []) {
    masteryMap[m.topic_id] = { score: m.score ?? 0, attempt_count: m.attempt_count ?? 0 }
  }

  // Build combined list: all curriculum topics with scores for attempted ones
  const mastery = allTopics
    .map(topic => {
      const subjectName = subjectMap[topic.subject_id]
      if (!subjectName) return null
      const m = masteryMap[topic.id]
      return {
        topic_id:      topic.id,
        score:         m?.score         ?? 0,
        attempt_count: m?.attempt_count ?? 0,
        started:       !!m,
        topic_name:    topic.name,
        subject_id:    topic.subject_id,
        subject_name:  subjectName,
        is_core:       topic.is_core    ?? false,
        order_index:   topic.order_index ?? 999,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.subject_name !== b.subject_name) return a.subject_name.localeCompare(b.subject_name)
      return (a.order_index ?? 999) - (b.order_index ?? 999)
    })

  const res = NextResponse.json({ mastery })
  res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
  return res
}