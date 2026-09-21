// src/app/api/admin/analytics/route.js
// Platform-wide analytics. Accepts ?period=7d|30d|90d|365d (default 30d).
// Queries: question_attempts, practice_sessions, profiles, subjects, topics.

import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse }              from 'next/server'

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

function bucketByDay(rows, dateField, periodDays) {
  const buckets = {}
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    buckets[d.toISOString().split('T')[0]] = 0
  }
  for (const r of rows ?? []) {
    const k = (r[dateField] ?? '').slice(0, 10)
    if (k in buckets) buckets[k]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }))
}

function bucketByWeek(rows, dateField, periodDays) {
  const weeks = Math.ceil(periodDays / 7)
  const buckets = {}
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000)
    // ISO week start (Monday)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    const k = monday.toISOString().split('T')[0]
    if (!(k in buckets)) buckets[k] = 0
  }
  for (const r of rows ?? []) {
    const d = new Date((r[dateField] ?? ''))
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)
    const k = monday.toISOString().split('T')[0]
    if (k in buckets) buckets[k]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }))
}

function bucketByMonth(rows, dateField) {
  const buckets = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i, 1)
    const k = d.toISOString().slice(0, 7) // YYYY-MM
    buckets[k] = 0
  }
  for (const r of rows ?? []) {
    const k = (r[dateField] ?? '').slice(0, 7)
    if (k in buckets) buckets[k]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const periodParam = searchParams.get('period') ?? '30d'
  const periodMap   = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }
  const periodDays  = periodMap[periodParam] ?? 30
  const since       = daysAgo(periodDays)

  // Comparison period (same length, ending at period start)
  const prevSince   = daysAgo(periodDays * 2)

  const db = svc()

  const [
    // Summary counts
    { count: totalStudents },
    { count: newStudentsThisPeriod },
    { count: newStudentsPrevPeriod },
    { count: totalSessions },
    { count: sessionsThisPeriod },
    { count: sessionsPrevPeriod },
    { count: totalAttempts },
    { count: attemptsThisPeriod },
    { count: totalQuestions },
    { count: publishedLessons },

    // Active students this period (distinct) — count via question_attempts
    { data: activeStudentRows },

    // Daily new signups for chart
    { data: signupRows },

    // Daily question attempts for chart
    { data: attemptRows },

    // Practice sessions this period for mode breakdown + avg accuracy
    { data: sessionRows },

    // Subject breakdown — attempts per subject this period
    { data: subjectRows },

    // Topic accuracy — worst-performing topics
    { data: topicRows },

  ] = await Promise.all([
    // Total registered students
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),

    // New students this period
    db.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'student').gte('created_at', since),

    // New students prev period (for % change)
    db.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'student').gte('created_at', prevSince).lt('created_at', since),

    // Total sessions ever
    db.from('practice_sessions').select('*', { count: 'exact', head: true }).then(r => r).catch(() => ({ count: 0 })),

    // Sessions this period
    db.from('practice_sessions').select('*', { count: 'exact', head: true })
      .gte('created_at', since).then(r => r).catch(() => ({ count: 0 })),

    // Sessions prev period
    db.from('practice_sessions').select('*', { count: 'exact', head: true })
      .gte('created_at', prevSince).lt('created_at', since).then(r => r).catch(() => ({ count: 0 })),

    // Total attempts ever
    db.from('question_attempts').select('*', { count: 'exact', head: true }),

    // Attempts this period
    db.from('question_attempts').select('*', { count: 'exact', head: true })
      .gte('created_at', since),

    // Content: total live questions
    db.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),

    // Content: published lessons
    db.from('subtopics').select('*', { count: 'exact', head: true }).eq('lesson_status', 'published'),

    // Active students this period (for DAU/WAU/MAU)
    db.from('question_attempts')
      .select('student_id')
      .gte('created_at', since)
      .not('student_id', 'is', null),

    // Signup rows for chart
    db.from('profiles')
      .select('created_at')
      .eq('role', 'student')
      .gte('created_at', since),

    // Attempt rows for chart (created_at only — lightweight)
    db.from('question_attempts')
      .select('created_at')
      .gte('created_at', since),

    // Full session rows this period for mode/accuracy breakdown
    db.from('practice_sessions')
      .select('mode, exam_type, subject_name, questions_count, correct_count, duration_secs, created_at')
      .gte('created_at', since).then(r => r).catch(() => ({ data: null })),

    // Subject breakdown from question_attempts
    db.from('question_attempts')
      .select('subject_name, is_correct')
      .gte('created_at', since)
      .not('subject_name', 'is', null),

    // Topic accuracy — best and worst
    db.from('question_attempts')
      .select('topic_id, is_correct, topics(name)')
      .gte('created_at', since)
      .not('topic_id', 'is', null),
  ])

  // ── Active unique students ─────────────────────────────────────────────────
  const uniqueActive = new Set((activeStudentRows ?? []).map(r => r.student_id)).size

  // ── Signups chart ─────────────────────────────────────────────────────────
  const signupsChart = periodDays <= 30
    ? bucketByDay(signupRows, 'created_at', periodDays)
    : periodDays <= 90
    ? bucketByWeek(signupRows, 'created_at', periodDays)
    : bucketByMonth(signupRows, 'created_at')

  // ── Attempts chart ────────────────────────────────────────────────────────
  const attemptsChart = periodDays <= 30
    ? bucketByDay(attemptRows, 'created_at', periodDays)
    : periodDays <= 90
    ? bucketByWeek(attemptRows, 'created_at', periodDays)
    : bucketByMonth(attemptRows, 'created_at')

  // ── Mode breakdown ────────────────────────────────────────────────────────
  const modeCounts = {}
  const modeTotals = {}   // questions answered per mode
  const modeCorrect = {}  // correct per mode
  for (const s of sessionRows ?? []) {
    const m = s.mode ?? 'unknown'
    modeCounts[m]  = (modeCounts[m]  ?? 0) + 1
    modeTotals[m]  = (modeTotals[m]  ?? 0) + (s.questions_count ?? 0)
    modeCorrect[m] = (modeCorrect[m] ?? 0) + (s.correct_count   ?? 0)
  }
  const modeBreakdown = Object.entries(modeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([mode, sessions]) => ({
      mode,
      sessions,
      avg_accuracy: modeTotals[mode] > 0
        ? Math.round((modeCorrect[mode] / modeTotals[mode]) * 100) : 0,
    }))

  // ── Avg session duration ──────────────────────────────────────────────────
  const durRows = (sessionRows ?? []).filter(s => s.duration_secs > 0)
  const avgDurationSecs = durRows.length > 0
    ? Math.round(durRows.reduce((a, s) => a + s.duration_secs, 0) / durRows.length) : 0

  // ── Subject breakdown ─────────────────────────────────────────────────────
  const subjectAgg = {}
  for (const r of subjectRows ?? []) {
    const n = r.subject_name
    if (!n) continue
    if (!subjectAgg[n]) subjectAgg[n] = { attempts: 0, correct: 0 }
    subjectAgg[n].attempts++
    if (r.is_correct) subjectAgg[n].correct++
  }
  const subjectBreakdown = Object.entries(subjectAgg)
    .sort(([, a], [, b]) => b.attempts - a.attempts)
    .slice(0, 10)
    .map(([name, { attempts, correct }]) => ({
      name,
      attempts,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    }))

  // ── Topic accuracy ────────────────────────────────────────────────────────
  const topicAgg = {}
  for (const r of topicRows ?? []) {
    const name = r.topics?.name
    if (!name) continue
    if (!topicAgg[name]) topicAgg[name] = { attempts: 0, correct: 0 }
    topicAgg[name].attempts++
    if (r.is_correct) topicAgg[name].correct++
  }
  const allTopics = Object.entries(topicAgg)
    .filter(([, v]) => v.attempts >= 5) // min 5 attempts to be meaningful
    .map(([name, { attempts, correct }]) => ({
      name,
      attempts,
      accuracy: Math.round((correct / attempts) * 100),
    }))
  const topTopics    = [...allTopics].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5)
  const bottomTopics = [...allTopics].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5)

  // ── % change helpers ──────────────────────────────────────────────────────
  function pctChange(curr, prev) {
    if (!prev) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  return NextResponse.json({
    period: periodParam,
    summary: {
      totalStudents:    totalStudents    ?? 0,
      newStudents:      newStudentsThisPeriod ?? 0,
      newStudentsPct:   pctChange(newStudentsThisPeriod ?? 0, newStudentsPrevPeriod ?? 0),
      uniqueActive,
      activeRate:       (totalStudents ?? 0) > 0
        ? Math.round((uniqueActive / (totalStudents ?? 1)) * 100) : 0,
      totalSessions:    totalSessions    ?? 0,
      sessionsThisPeriod: sessionsThisPeriod ?? 0,
      sessionsPct:      pctChange(sessionsThisPeriod ?? 0, sessionsPrevPeriod ?? 0),
      totalAttempts:    totalAttempts    ?? 0,
      attemptsThisPeriod: attemptsThisPeriod ?? 0,
      avgDurationSecs,
      totalQuestions:   totalQuestions   ?? 0,
      publishedLessons: publishedLessons ?? 0,
    },
    charts: {
      signups:  signupsChart,
      attempts: attemptsChart,
    },
    modeBreakdown,
    subjectBreakdown,
    topTopics,
    bottomTopics,
  })
}