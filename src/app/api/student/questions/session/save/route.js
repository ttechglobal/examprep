// src/app/api/student/mastery/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/mastery?exam=WAEC&subject=uuid&period=30
//
// Returns performance insight for a subject over a time window.
// Queries question_attempts directly — the source of truth.
//
// params:
//   exam     — 'WAEC' | 'JAMB'  (required)
//   subject  — subject UUID      (optional — omit for subject overview)
//   period   — days: 7|14|30|90|0 (0 = all time, default 30)
//
// Response (subject drill-in):
// {
//   subject_name, period_days, weeks_of_data, total_attempts, subject_score,
//   weekly_trend: [{ week, score, attempts }],        // oldest first
//   topics: [{
//     topic_id, topic_name, correct, total, score,    // score null = not enough data
//     enough_data, attempts_needed
//   }]
// }
//
// Response (overview — no subject param):
// {
//   subjects: [{
//     subject_id, subject_name, total_attempts, subject_score, topic_count
//   }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }              from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

const db = () => svcClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MIN_ATTEMPTS_TO_SCORE = 5

function mondayOf(dateStr) {
  const d   = new Date(dateStr)
  const dow = d.getDay()
  d.setDate(d.getDate() - ((dow + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function weeksOfData(rows) {
  if (!rows.length) return 0
  const oldest  = rows.reduce((min, r) => r.created_at < min ? r.created_at : min, rows[0].created_at)
  const diffMs  = Date.now() - new Date(oldest).getTime()
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const exam      = searchParams.get('exam')    ?? 'WAEC'
    const subjectId = searchParams.get('subject') ?? null
    const period    = parseInt(searchParams.get('period') ?? '30', 10)

    const service   = db()
    const userId    = user.id

    const sinceDate = period > 0
      ? new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()
      : null

    // ── OVERVIEW — no subject param ───────────────────────────────────────────
    if (!subjectId) {
      let query = service
        .from('question_attempts')
        .select('subject_id, subject_name, is_correct')
        .eq('student_id', userId)
        .eq('exam_type', exam)

      if (sinceDate) query = query.gte('created_at', sinceDate)

      const { data: rows, error } = await query
      if (error) {
        console.error('[mastery] overview error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Group by subject
      const subjectMap = {}
      for (const r of rows ?? []) {
        const sid = r.subject_id
        if (!sid) continue
        if (!subjectMap[sid]) subjectMap[sid] = { subject_id: sid, subject_name: r.subject_name ?? '', correct: 0, total: 0 }
        subjectMap[sid].total++
        if (r.is_correct) subjectMap[sid].correct++
      }

      const subjects = Object.values(subjectMap).map(s => ({
        subject_id:    s.subject_id,
        subject_name:  s.subject_name,
        total_attempts: s.total,
        subject_score:  s.total >= MIN_ATTEMPTS_TO_SCORE
          ? Math.round((s.correct / s.total) * 100)
          : null,
      })).sort((a, b) => (a.subject_score ?? -1) - (b.subject_score ?? -1))

      return NextResponse.json(
        { subjects, exam, period_days: period },
        { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
      )
    }

    // ── DRILL-IN — specific subject ───────────────────────────────────────────
    let query = service
      .from('question_attempts')
      .select('topic_id, subject_name, is_correct, created_at, topics(name)')
      .eq('student_id', userId)
      .eq('exam_type',  exam)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false })

    if (sinceDate) query = query.gte('created_at', sinceDate)

    const { data: rows, error } = await query
    if (error) {
      console.error('[mastery] drill-in error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const attempts = rows ?? []

    // ── Topic breakdown ───────────────────────────────────────────────────────
    const topicMap = {}
    for (const r of attempts) {
      const tid = r.topic_id
      if (!tid) continue
      if (!topicMap[tid]) topicMap[tid] = { topic_id: tid, topic_name: r.topics?.name ?? '', correct: 0, total: 0 }
      topicMap[tid].total++
      if (r.is_correct) topicMap[tid].correct++
    }

    const topics = Object.values(topicMap).map(t => {
      const enough = t.total >= MIN_ATTEMPTS_TO_SCORE
      return {
        topic_id:        t.topic_id,
        topic_name:      t.topic_name,
        correct:         t.correct,
        total:           t.total,
        score:           enough ? Math.round((t.correct / t.total) * 100) : null,
        enough_data:     enough,
        attempts_needed: enough ? 0 : MIN_ATTEMPTS_TO_SCORE - t.total,
      }
    }).sort((a, b) => {
      if (a.enough_data && !b.enough_data) return -1
      if (!a.enough_data && b.enough_data) return  1
      if (a.enough_data && b.enough_data)  return (a.score ?? 0) - (b.score ?? 0)
      return b.total - a.total
    })

    // ── Weekly trend ──────────────────────────────────────────────────────────
    const weekMap = {}
    for (const r of attempts) {
      const mon = mondayOf(r.created_at.slice(0, 10))
      if (!weekMap[mon]) weekMap[mon] = { correct: 0, total: 0 }
      weekMap[mon].total++
      if (r.is_correct) weekMap[mon].correct++
    }

    const weekly_trend = Object.entries(weekMap)
      .map(([week, { correct, total }]) => ({
        week,
        score:    Math.round((correct / total) * 100),
        attempts: total,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))

    // ── Subject score — average of scored topics ──────────────────────────────
    const scored       = topics.filter(t => t.enough_data)
    const subjectScore = scored.length
      ? Math.round(scored.reduce((s, t) => s + t.score, 0) / scored.length)
      : null

    const subjectName = attempts[0]?.subject_name ?? ''

    return NextResponse.json(
      {
        subject_name:   subjectName,
        period_days:    period,
        weeks_of_data:  weeksOfData(attempts),
        total_attempts: attempts.length,
        subject_score:  subjectScore,
        weekly_trend,
        topics,
        exam,
      },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    )

  } catch (err) {
    console.error('[student/mastery] unexpected error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}