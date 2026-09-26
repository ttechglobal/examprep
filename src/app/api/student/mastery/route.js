// src/app/api/student/mastery/route.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/mastery?exam=WAEC&period=30
//   → subject-level overview: { subjects: [...] }
//
// GET /api/student/mastery?exam=WAEC&subject=UUID&period=30
//   → topic drill-in: { subject_name, total_attempts, weeks_of_data,
//                       subject_score, weekly_trend, topics }
//
// v2: totals are grouped in Postgres (stats_by_student_subject, stats_by_topic,
// stats_by_week). v1 downloaded the student's raw answers, which Supabase caps
// at 1,000 rows — so active students saw accuracy from a partial sample.
// period=0 means all time.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/server/supabaseAdmin'
import { NextResponse }  from 'next/server'

const MIN_ATTEMPTS = 5
const UUID_RE      = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CACHE        = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }

const pct = (c, t) => (t > 0 ? Math.round((c / t) * 100) : 0)

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const exam      = searchParams.get('exam') ?? 'WAEC'
    const subjectId = searchParams.get('subject') ?? null
    const period    = Math.max(parseInt(searchParams.get('period') ?? '30', 10) || 0, 0)
    if (subjectId && !UUID_RE.test(subjectId)) {
      return NextResponse.json({ error: 'Invalid subject' }, { status: 400 })
    }

    const db    = supabaseAdmin()
    const since = period > 0 ? new Date(Date.now() - period * 86_400_000).toISOString() : null

    // ── OVERVIEW — no subject param ───────────────────────────────────────────
    if (!subjectId) {
      const { data, error } = await db.rpc('stats_by_student_subject', {
        p_student_ids: [user.id], p_since: since, p_exam: exam,
      })
      if (error) throw error

      const subjects = (data ?? []).map(s => {
        const total   = Number(s.answered) || 0
        const correct = Number(s.correct)  || 0
        return {
          subject_id:     s.subject_id,
          subject_name:   s.subject_name ?? '',
          total_attempts: total,
          accuracy:       pct(correct, total),
          subject_score:  total >= MIN_ATTEMPTS ? pct(correct, total) : null,
          topic_count:    0,
        }
      }).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))

      return NextResponse.json({ subjects, exam, period_days: period }, { headers: CACHE })
    }

    // ── DRILL-IN — specific subject ───────────────────────────────────────────
    const [topicsRes, weeksRes, subjectRes] = await Promise.all([
      db.rpc('stats_by_topic', { p_student_ids: [user.id], p_since: since, p_exam: exam, p_subject_id: subjectId }),
      db.rpc('stats_by_week',  { p_student_id: user.id,    p_since: since, p_exam: exam, p_subject_id: subjectId }),
      db.from('subjects').select('name').eq('id', subjectId).maybeSingle(),
    ])
    if (topicsRes.error) throw topicsRes.error
    if (weeksRes.error)  throw weeksRes.error

    const topics = (topicsRes.data ?? []).map(t => {
      const total   = Number(t.answered) || 0
      const correct = Number(t.correct)  || 0
      const enough  = total >= MIN_ATTEMPTS
      return {
        topic_id:        t.topic_id,
        topic_name:      t.topic_name ?? '',
        correct,
        total,
        score:           enough ? pct(correct, total) : null,
        enough_data:     enough,
        attempts_needed: enough ? 0 : MIN_ATTEMPTS - total,
      }
    }).sort((a, b) => {
      if (a.enough_data && !b.enough_data) return -1
      if (!a.enough_data && b.enough_data) return 1
      return (a.score ?? 0) - (b.score ?? 0)
    })

    const weekly_trend = (weeksRes.data ?? []).map(w => ({
      week:     String(w.week_start).slice(0, 10),
      score:    pct(Number(w.correct) || 0, Number(w.answered) || 0),
      attempts: Number(w.answered) || 0,
    }))

    const scored       = topics.filter(t => t.enough_data)
    const subjectScore = scored.length
      ? Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length)
      : null
    const totalAttempts = weekly_trend.reduce((s, w) => s + w.attempts, 0)

    return NextResponse.json(
      {
        subject_name:   subjectRes.data?.name ?? topicsRes.data?.[0]?.subject_name ?? '',
        period_days:    period,
        weeks_of_data:  weekly_trend.length || 1,
        total_attempts: totalAttempts,
        subject_score:  subjectScore,
        weekly_trend,
        topics,
        exam,
      },
      { headers: CACHE }
    )
  } catch (err) {
    console.error('[student/mastery] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
