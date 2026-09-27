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
//
// v2: offline and server errors are no longer treated alike. An answer is
//     resent for as long as the phone is offline, but only twice after a
//     server error; then the "locked in" mark is taken back so the screen
//     shows what the server really has. `error` clears on the next good read.
//     An overdue round is re-checked every second, not every 250 ms, and
//     `stalled` turns on when a round is 5 s past its deadline without
//     moving. (A server error on the last round used to leave both phones
//     "Locked in" forever, calling the server several times a second.)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { pvpCall, watchMatch } from '@/lib/pvp/client'

const REVEAL_HOLD_MS      = 2500  // last question's answer stays up this long
const MIN_WAKE_MS         = 250   // never re-poll faster than this
const OVERDUE_RETRY_MS    = 1000  // the deadline passed but the round is still open
const ANSWER_SERVER_TRIES = 3    // sends of one answer that may hit a server error
const STALL_MS            = 5000  // this long past a deadline with no change = stalled

// Offline: always worth another try (the round's deadline ends it anyway).
// Server error: a couple more tries, in case it was a blip (counted on the answer).
function shouldResend(error, answer) {
  if (error === 'PVP_OFFLINE') return true
  if (error === 'PVP_SERVER') return (answer.serverErrors = (answer.serverErrors ?? 0) + 1) < ANSWER_SERVER_TRIES
  return false
}

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
      if (event === 'state')           { offset.current = payload.clockOffset; setState(payload); setError(null) }
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

  // ── Stalled: the server's next moment passed and nothing moved ──────────
  // Whatever the cause (server errors, the sweep not running), this is what
  // the player sees, so it's what the screen reports.
  const matchRow = state?.match
  const nextMoment = matchRow?.status === 'in_progress'
    ? Date.parse(state.current ? matchRow.round_deadline : matchRow.round_started_at)
    : null
  const stalled = nextMoment !== null && serverNow > nextMoment + STALL_MS

  // ── Wake at the server's next moment ────────────────────────────────────
  useEffect(() => {
    const m = state?.match
    if (!m || m.status !== 'in_progress') return
    const live = !!state.current
    const at = Date.parse(live ? m.round_deadline : m.round_started_at) + (live ? 300 : 80)
    const wait = at - (Date.now() + offset.current)
    // Still open after its deadline: our tick didn't close it (clock skew or a
    // server error). Check again, but don't hammer the server.
    const delay = live && wait <= 0 ? OVERDUE_RETRY_MS : Math.max(MIN_WAKE_MS, wait)
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
      } else if (shouldResend(res.error, a)) {
        if (!qState.pending) qState.pending = a          // nothing newer: try again shortly
        qState.busy = false
        setTimeout(flush, 1000)
        return
      } else {
        // Not saved (time up, round moved on, or the server keeps failing):
        // stop showing it as locked in, unless a newer pick is on its way.
        setLocked(l => (l === a ? null : l))
        refresh()
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
    stalled,
    error,
    answer,
    refresh,
    leave:    () => run('pvp_leave'),
    claimWin: () => run('pvp_claim_win'),
    rematch:  () => run('pvp_rematch'),
    cancelRematch: rematchId => pvpCall('pvp_leave', { p_match: rematchId }).then(res => { refresh(); return res }),
  }
}
