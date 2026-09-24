'use client'
// src/components/student/leaderboard/useLeaderboard.js
// ─────────────────────────────────────────────────────────────────────────────
// useBoard      — the main table for a scope + period.
// useChampions  — top 3 for a past week (the hero carousel).
//
// Both paint cached data first and refresh in the background, so the board
// appears instantly on slow connections and never flashes empty on revisit.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'

const TTL_MS = 120_000
const key = (userId, scope, period) => `ep_lb2_${userId ?? 'guest'}_${scope}_${period}`

function readCache(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null }
}
function writeCache(k, data) {
  try { localStorage.setItem(k, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const EMPTY = { leaderboard: [], me: null, fallback: false, school_name: null }

export function useBoard({ scope, period, userId, ready, enabled = true }) {
  const [state, setState] = useState({ data: EMPTY, loading: true, error: false })
  const [nonce, setNonce] = useState(0)
  const retry = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    if (!ready) return
    if (!enabled) { setState({ data: EMPTY, loading: false, error: false }); return }

    const k = key(userId, scope, period)
    const cached = readCache(k)
    if (cached?.data) setState({ data: cached.data, loading: false, error: false })
    else setState(s => ({ ...s, loading: true, error: false }))
    if (cached && Date.now() - (cached.ts || 0) < TTL_MS && nonce === 0) return

    let cancelled = false
    fetch(`/api/leaderboard/${scope === 'school' ? 'school' : 'national'}?limit=20&period=${period}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => {
        if (cancelled) return
        const data = {
          leaderboard: json.leaderboard ?? [],
          me:          json.me ?? null,
          fallback:    !!json.fallback,
          school_name: json.school_name ?? null,
        }
        writeCache(k, data)
        setState({ data, loading: false, error: false })
      })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, loading: false, error: !s.data.leaderboard.length })) })

    return () => { cancelled = true }
  }, [scope, period, userId, ready, enabled, nonce])

  return { ...state.data, loading: state.loading, error: state.error, retry }
}

// ── Champions ───────────────────────────────────────────────────────────────
const championCache = new Map()   // weeksAgo → entries (session lifetime)

export function useChampions(weeksAgo, ready) {
  const [state, setState] = useState(() => ({
    entries: championCache.get(weeksAgo) ?? [],
    loading: !championCache.has(weeksAgo),
  }))
  const latest = useRef(weeksAgo)

  useEffect(() => {
    if (!ready) return
    latest.current = weeksAgo
    if (championCache.has(weeksAgo)) {
      setState({ entries: championCache.get(weeksAgo), loading: false })
      return
    }
    setState(s => ({ ...s, loading: true }))
    fetch(`/api/leaderboard/national?period=week&weeks_ago=${weeksAgo}&limit=3&strict=1`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(json => {
        const entries = (json.leaderboard ?? []).slice(0, 3)
        championCache.set(weeksAgo, entries)
        if (latest.current === weeksAgo) setState({ entries, loading: false })
      })
      .catch(() => { if (latest.current === weeksAgo) setState({ entries: [], loading: false }) })
  }, [weeksAgo, ready])

  return state
}
