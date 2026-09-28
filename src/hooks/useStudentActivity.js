'use client'
// src/hooks/useStudentActivity.js
// ─────────────────────────────────────────────────────────────────────────────
// A student's activity for this week or this month: questions per day plus the
// headline stats. Used by the home "This Week" card and the profile's
// "Your Activity" card.
//
//   Signed in → GET /api/student/activity?period=…  (server truth, all devices)
//   Guest     → this device's local history only
//
// Paints instantly from what the device already has (the last server reply,
// kept in localStorage, and the local history), then refreshes in the
// background. Offline, the last server reply keeps showing instead of zeros.
// Per day, the higher of the server and device counts wins, so sessions
// answered offline (not synced yet) still show up.
//
// Returns { days: [{ date, label, count }], stats: { questions, accuracy,
//           streak, timeSecs }, loading }
//
// v2 (moved from components/student/profile/useProfileActivity.js): returns
//     the per-day counts, caches the server reply, uses Nigerian days.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { readHistory, readLocalStreak } from '@/lib/localSessionSync'
import { appDay, addDays, mondayOfDay, monthStartOfDay } from '@/lib/dates'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const cacheKey   = (userId, period) => `ep_activity_api_${userId}_${period}`

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

// Every day of the period: a week is always Mon–Sun; a month runs to today.
function periodDays(period, today = appDay()) {
  const from = period === 'month' ? monthStartOfDay(today) : mondayOfDay(today)
  const last = period === 'month' ? today : addDays(from, 6)
  const days = []
  for (let day = from, i = 0; day <= last; day = addDays(day, 1), i++) {
    days.push({ date: day, label: period === 'week' ? DAY_LABELS[i] : String(Number(day.slice(8, 10))) })
  }
  return days
}

// "4m 12s" | "45s" → seconds (the format localSessionSync writes).
function parseTimeStr(str) {
  if (!str) return 0
  const m = /(?:(\d+)m)?\s*(?:(\d+)s)?/.exec(str)
  return (Number(m?.[1]) || 0) * 60 + (Number(m?.[2]) || 0)
}

function computeLocal(period) {
  const perDay = readJson('ep_activity', {})
  const days   = periodDays(period).map(d => ({ ...d, count: perDay[d.date] || 0 }))

  // Sessions carry their time (`at`); older entries only a display date ("24 Sep").
  const inPeriod = new Set(days.map(d => d.date))
  const labels   = new Set(days.map(d =>
    new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })))
  const sessions = readHistory().filter(s => (s.at ? inPeriod.has(appDay(s.at)) : labels.has(s.date)))
  const count    = sessions.reduce((n, s) => n + (s.count   || 0), 0)
  const correct  = sessions.reduce((n, s) => n + (s.correct || 0), 0)

  return {
    days,
    stats: {
      questions: Math.max(days.reduce((n, d) => n + d.count, 0), count),
      accuracy:  count ? Math.round((correct / count) * 100) : 0,
      streak:    readLocalStreak(),
      timeSecs:  sessions.reduce((n, s) => n + parseTimeStr(s.timeStr), 0),
    },
  }
}

// Server reply (possibly cached) merged with the device's own counts.
function merge(local, server) {
  // A cached reply from an earlier week or month doesn't describe this one.
  if (!server || server.days?.[0]?.date !== local.days[0]?.date) return local
  const serverCount = new Map((server.days ?? []).map(d => [d.date, d.count || 0]))
  const days = local.days.map(d => ({ ...d, count: Math.max(d.count, serverCount.get(d.date) ?? 0) }))
  const s = server.stats ?? {}
  return {
    days,
    stats: {
      questions: Math.max(days.reduce((n, d) => n + d.count, 0), s.questions_answered ?? 0),
      accuracy:  s.accuracy        ?? local.stats.accuracy,
      streak:    Math.max(s.streak_days ?? 0, local.stats.streak),
      timeSecs:  s.time_spent_secs ?? local.stats.timeSecs,
    },
  }
}

const EMPTY = { days: [], stats: { questions: 0, accuracy: 0, streak: 0, timeSecs: 0 } }

export function useStudentActivity(period, { userId, isGuest, ready }) {
  const [state, setState] = useState({ ...EMPTY, loading: true })

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    const local = computeLocal(period)
    if (isGuest || !userId) { setState({ ...local, loading: false }); return }

    const key    = cacheKey(userId, period)
    const cached = readJson(key, null)
    setState({ ...merge(local, cached), loading: !cached })

    fetch(`/api/student/activity?period=${period}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(server => {
        try { localStorage.setItem(key, JSON.stringify(server)) } catch {}
        if (!cancelled) setState({ ...merge(computeLocal(period), server), loading: false })
      })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false })) })

    return () => { cancelled = true }
  }, [period, userId, isGuest, ready])

  return state
}
