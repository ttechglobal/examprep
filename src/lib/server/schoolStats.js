// src/lib/server/schoolStats.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared by the school dashboard and school reports.
//
// requireSchoolAdmin() — only a profile with role 'school_admin' and a
//   school_id may see school data. (Before this, any student linked to a
//   school could open the dashboard API and read classmates' results.)
//
// loadSchoolStats() — per-student, per-subject and per-topic totals, grouped
//   in Postgres. The old routes downloaded every answer for the whole school,
//   which Supabase silently cut off at 1,000 rows (≈ 50 students × 20
//   questions), so dashboards showed partial data.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

const CHUNK = 200   // ids per .in() request — keeps URLs well under proxy limits

export async function requireSchoolAdmin(db, userId, select = 'school_id, role, full_name, schools(id, name, city, state)') {
  const { data: profile, error } = await db.from('profiles').select(select).eq('id', userId).single()
  if (error) console.error('[school] profile fetch error:', error.message)
  if (profile?.role !== 'school_admin') {
    return { error: NextResponse.json({ error: 'School admin access only' }, { status: 403 }) }
  }
  if (!profile.school_id) {
    return { error: NextResponse.json({ error: 'No school assigned' }, { status: 403 }) }
  }
  return { profile }
}

/** Rows for `ids` from `table`, fetched in URL-safe chunks. */
export async function selectByIds(db, table, columns, ids, idColumn = 'id') {
  const out = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await db.from(table).select(columns).in(idColumn, ids.slice(i, i + CHUNK))
    if (error) throw error
    out.push(...(data ?? []))
  }
  return out
}

const acc = (c, t) => (t > 0 ? Math.round((c / t) * 100) : null)

/**
 * @returns {{
 *   byStudent: Map<string, { answered, correct, lastActive }>,
 *   subjectsByStudent: Map<string, Record<string, { correct, total }>>,
 *   topics: Array<{ subjectName, topicId, topicName, correct, total, accuracy }>,
 * }}
 */
export async function loadSchoolStats(db, studentIds, sinceIso) {
  const [students, subjects, topics] = await Promise.all([
    db.rpc('stats_by_student',         { p_student_ids: studentIds, p_since: sinceIso }),
    db.rpc('stats_by_student_subject', { p_student_ids: studentIds, p_since: sinceIso, p_exam: null }),
    db.rpc('stats_by_topic',           { p_student_ids: studentIds, p_since: sinceIso, p_exam: null, p_subject_id: null }),
  ])
  if (students.error) throw students.error
  if (subjects.error) throw subjects.error
  if (topics.error)   throw topics.error

  const byStudent = new Map()
  for (const r of students.data ?? []) {
    byStudent.set(r.student_id, {
      answered:   Number(r.answered) || 0,
      correct:    Number(r.correct)  || 0,
      lastActive: r.last_active ?? null,
    })
  }

  const subjectsByStudent = new Map()
  for (const r of subjects.data ?? []) {
    if (!r.subject_name) continue
    const m = subjectsByStudent.get(r.student_id) ?? {}
    const cur = m[r.subject_name] ?? { correct: 0, total: 0 }
    cur.correct += Number(r.correct)  || 0
    cur.total   += Number(r.answered) || 0
    m[r.subject_name] = cur
    subjectsByStudent.set(r.student_id, m)
  }

  const topicRows = (topics.data ?? [])
    .filter(t => t.subject_name && t.topic_name)
    .map(t => ({
      subjectName: t.subject_name,
      topicId:     t.topic_id,
      topicName:   t.topic_name,
      correct:     Number(t.correct)  || 0,
      total:       Number(t.answered) || 0,
      accuracy:    acc(Number(t.correct) || 0, Number(t.answered) || 0),
    }))

  return { byStudent, subjectsByStudent, topics: topicRows }
}

/** Topics grouped by subject, weakest first (the shape both screens use). */
export function groupTopicsBySubject(topics, nameKey = 'subjectName') {
  const groups = {}
  for (const t of topics) (groups[t.subjectName] ??= []).push(t)
  return Object.entries(groups).map(([name, list]) => {
    const total   = list.reduce((a, t) => a + t.total, 0)
    const correct = list.reduce((a, t) => a + t.correct, 0)
    return {
      [nameKey]: name,
      accuracy:  acc(correct, total),
      topics:    list
        .map(({ topicId, topicName, correct: c, total: n, accuracy }) => ({ topicId, topicName, correct: c, total: n, accuracy }))
        .sort((a, b) => a.accuracy - b.accuracy),
    }
  }).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
}

/** A CSV cell that survives commas, quotes and spreadsheet formula injection. */
export function csvCell(value) {
  let s = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
