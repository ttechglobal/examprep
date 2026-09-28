'use client'
// src/hooks/useRecentSessions.js
// ─────────────────────────────────────────────────────────────────────────────
// The student's latest practice sessions (battles excluded), newest first.
//
//   Device history (lib/localSessionSync.js) paints instantly, for everyone,
//   offline included. Signed-in students also get GET /api/student/sessions
//   (sessions from their other devices), kept in localStorage and refreshed at
//   most every 2 minutes. The two lists merge by session id.
//
// Returns { sessions: [{ id, subject, topic, mode, at, date, count, correct, pct }], loading }
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { readHistory } from '@/lib/localSessionSync'

const TTL_MS   = 120_000
const cacheKey = userId => `ep_sessions_api_${userId}`

function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}

const withPct = s => ({ ...s, pct: s.count ? Math.round((s.correct / s.count) * 100) : 0 })

function merge(local, server, limit) {
  const byId = new Map()
  for (const s of server ?? []) byId.set(s.id, s)
  for (const s of local) if (!s.id || !byId.has(s.id)) byId.set(s.id ?? `local-${byId.size}`, s)
  // Entries saved before sessions kept their time (no `at`) go last.
  return [...byId.values()]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, limit)
    .map(withPct)
}

export function useRecentSessions(limit, { userId, isGuest, ready }) {
  const [state, setState] = useState({ sessions: [], loading: true })

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const local = readHistory().filter(s => s.mode !== 'battle')

    if (isGuest || !userId) { setState({ sessions: merge(local, null, limit), loading: false }); return }

    const key    = cacheKey(userId)
    const cached = readCache(key)
    setState({ sessions: merge(local, cached?.sessions, limit), loading: !cached })
    if (cached && Date.now() - (cached.ts || 0) < TTL_MS) return

    fetch(`/api/student/sessions?limit=${limit}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ sessions }) => {
        try { localStorage.setItem(key, JSON.stringify({ sessions, ts: Date.now() })) } catch {}
        if (!cancelled) setState({ sessions: merge(readHistory().filter(s => s.mode !== 'battle'), sessions, limit), loading: false })
      })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false })) })

    return () => { cancelled = true }
  }, [limit, userId, isGuest, ready])

  return state
}
