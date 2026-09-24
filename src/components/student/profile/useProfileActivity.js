'use client'
// src/components/student/profile/useProfileActivity.js
// ─────────────────────────────────────────────────────────────────────────────
// Headline activity stats for the profile's "Your Activity" card.
//
//   Signed in → GET /api/student/activity?period=…
//   Guest, offline, or API failure → computed from this device's local history
//   (ep_activity, ep_session_history, ep_streak — see localSessionSync.js).
//
// Returns { stats: { questions, accuracy, streak, timeSecs }, loading }
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { readHistory, readLocalStreak } from '@/lib/localSessionSync'

const EMPTY = { questions: 0, accuracy: 0, streak: 0, timeSecs: 0 }

function periodStart(period) {
  const d = new Date()
  if (period === 'month') d.setDate(1)
  else d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

const isoLocal = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// "4m 12s" | "45s" → seconds (the format localSessionSync writes).
function parseTimeStr(str) {
  if (!str) return 0
  const m = /(?:(\d+)m)?\s*(?:(\d+)s)?/.exec(str)
  return (Number(m?.[1]) || 0) * 60 + (Number(m?.[2]) || 0)
}

function computeLocal(period) {
  try {
    const start = periodStart(period)
    const days  = []
    for (const d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) days.push(new Date(d))

    const activity = JSON.parse(localStorage.getItem('ep_activity') || '{}')
    const questionsFromActivity = days.reduce((n, d) => n + (activity[isoLocal(d)] || 0), 0)

    // Session history stores display dates ("24 Sep"), so match on that.
    const labels   = new Set(days.map(d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })))
    const sessions = readHistory().filter(s => labels.has(s.date) || s.date === 'Today')
    const count    = sessions.reduce((n, s) => n + (s.count   || 0), 0)
    const correct  = sessions.reduce((n, s) => n + (s.correct || 0), 0)

    return {
      questions: Math.max(questionsFromActivity, count),
      accuracy:  count ? Math.round((correct / count) * 100) : 0,
      streak:    readLocalStreak(),
      timeSecs:  sessions.reduce((n, s) => n + parseTimeStr(s.timeStr), 0),
    }
  } catch {
    return EMPTY
  }
}

export function useProfileActivity(period, { isGuest, ready }) {
  const [state, setState] = useState({ stats: EMPTY, loading: true })

  useEffect(() => {
    if (!ready) return
    let cancelled = false

    // Paint local numbers immediately; replace with server numbers when they land.
    setState({ stats: computeLocal(period), loading: !isGuest })
    if (isGuest) return

    fetch(`/api/student/activity?period=${period}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ stats }) => {
        if (cancelled) return
        setState({
          loading: false,
          stats: {
            questions: stats.questions_answered ?? 0,
            accuracy:  stats.accuracy           ?? 0,
            streak:    stats.streak_days        ?? 0,
            timeSecs:  stats.time_spent_secs    ?? 0,
          },
        })
      })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false })) })

    return () => { cancelled = true }
  }, [period, isGuest, ready])

  return state
}
