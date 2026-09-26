'use client'
// src/lib/pvp/useMatch.js
// ─────────────────────────────────────────────────────────────────────────────
// Everything the live 1v1 screen needs, as one hook. The server owns the
// match; this hook only follows it:
//
//   • watches the match (Realtime + polling, lib/pvp/client.js watchMatch)
//   • keeps a clock in server time, so both phones count down together
//   • wakes up exactly when the server's next moment arrives: the round
//     start (to fetch the question) and the round deadline (pvp_tick closes a
//     round nobody finished, e.g. the opponent's phone died)
//   • sends answers one at a time, newest wins, retrying while offline
//   • holds the last answer on screen for a moment before the results
//
// phase: 'connecting' | 'waiting' | 'countdown' | 'question' | 'reveal'
//        | 'finished' | 'ended' (cancelled/expired) | 'abandoned'
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { pvpCall, watchMatch } from '@/lib/pvp/client'

const REVEAL_HOLD_MS = 2500      // last question's answer stays up this long
const MIN_WAKE_MS    = 250       // never re-poll faster than this
const RETRYABLE      = ['PVP_OFFLINE', 'PVP_SERVER']

export function derivePhase(state, holding) {
  if (!state) return 'connecting'
  const m = state.match
  if (m.status === 'waiting')     return 'waiting'
  if (m.status === 'abandoned')   return 'abandoned'
  if (m.status === 'in_progress') return state.current ? 'question' : m.rounds_closed === 0 ? 'countdown' : 'reveal'
  if (m.status === 'finished')    return holding ? 'reveal' : 'finished'
  return 'ended'
}

export function useMatch(matchId) {
  const [state,   setState]   = useState(null)
  const [error,   setError]   = useState(null)
  const [online,  setOnline]  = useState(true)
  const [locked,  setLocked]  = useState(null)   // { q, idx } sent (or sending) for the open round
  const [now,     setNow]     = useState(() => Date.now())
  const [holdUntil, setHoldUntil] = useState(0)
  const offset  = useRef(0)
  const watcher = useRef(null)
  const sawLive = useRef(false)
  const queue   = useRef({ pending: null, busy: false })

  // ── Follow the match ────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return
    setState(null); setError(null); setLocked(null); setHoldUntil(0)
    sawLive.current = false
    const w = watchMatch(matchId, (event, payload) => {
      if (event === 'state')           { offset.current = payload.clockOffset; setState(payload) }
      else if (event === 'error')      setError(payload.error)
      else if (event === 'connection') setOnline(payload.online)
    }, { pollMs: 1500 })
    watcher.current = w
    return () => { w.stop(); watcher.current = null }
  }, [matchId])

  const refresh = useCallback(opts => watcher.current?.refresh(opts), [])

  // ── Clock in server time ────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  const serverNow = now + offset.current

  // ── Wake at the server's next moment ────────────────────────────────────
  useEffect(() => {
    const m = state?.match
    if (!m || m.status !== 'in_progress') return
    const live = !!state.current
    const at = Date.parse(live ? m.round_deadline : m.round_started_at) + (live ? 300 : 80)
    const delay = Math.max(MIN_WAKE_MS, at - (Date.now() + offset.current))
    const t = setTimeout(() => refresh({ tick: live }), delay)
    return () => clearTimeout(t)
  }, [state, refresh])

  // ── Hold the last reveal before the results (normal finish, seen live) ──
  const status = state?.match?.status
  useEffect(() => { if (status === 'in_progress') sawLive.current = true }, [status])
  useEffect(() => {
    if (status === 'finished' && sawLive.current && state.match.finish_reason === 'completed' && !holdUntil) {
      setHoldUntil(Date.now() + REVEAL_HOLD_MS)
    }
  }, [status, state, holdUntil])
  // Until the effect above stamps holdUntil, a just-finished live match is holding too.
  const holding = holdUntil
    ? holdUntil > now
    : status === 'finished' && sawLive.current && state.match.finish_reason === 'completed'

  // ── Answers: one request at a time, newest choice wins ──────────────────
  const flush = useCallback(async () => {
    const qState = queue.current
    if (qState.busy || !qState.pending) return
    qState.busy = true
    while (qState.pending) {
      const a = qState.pending
      qState.pending = null
      const res = await pvpCall('pvp_answer', { p_match: matchId, p_q_index: a.q, p_choice: a.idx })
      if (res.ok) {
        if (res.round_closed) refresh()
      } else if (RETRYABLE.includes(res.error)) {
        if (!qState.pending) qState.pending = a          // nothing newer: try again shortly
        qState.busy = false
        setTimeout(flush, 1000)
        return
      } else {
        refresh()                                          // time up / round moved on
      }
    }
    qState.busy = false
  }, [matchId, refresh])

  const current = state?.current ?? null
  const answer = useCallback(idx => {
    if (!current) return
    const a = { q: current.q_index, idx }
    setLocked(a)
    queue.current.pending = a
    flush()
  }, [current, flush])

  // The answer the server has for this round, or the one on its way.
  const lockedIdx = current
    ? (locked?.q === current.q_index ? locked.idx : current.my_choice ?? null)
    : null

  // ── Other actions ───────────────────────────────────────────────────────
  const run = useCallback(async (fn, args) => {
    const res = await pvpCall(fn, { p_match: matchId, ...args })
    refresh()
    return res
  }, [matchId, refresh])

  return {
    state,
    phase: derivePhase(state, holding),
    serverNow,
    clockOffset: offset.current,
    lockedIdx,
    online,
    error,
    answer,
    refresh,
    leave:    () => run('pvp_leave'),
    claimWin: () => run('pvp_claim_win'),
    rematch:  () => run('pvp_rematch'),
    cancelRematch: rematchId => pvpCall('pvp_leave', { p_match: rematchId }).then(res => { refresh(); return res }),
  }
}
