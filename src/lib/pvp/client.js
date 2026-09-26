// src/lib/pvp/client.js
// ─────────────────────────────────────────────────────────────────────────────
// The one place 1v1 screens talk to the match engine (20260928_pvp_engine.sql).
//
// Every call goes straight to the database with the player's own login; the
// SQL functions check who is calling and are the referee. Expected problems
// come back as { ok: false, error: 'PVP_…' } — show pvpMessage(error).
//
//   pvpCall(fn, args)            → rpc wrapper, always resolves to an object
//   pvpMessage(code)             → student-friendly text for an error code
//   inviteLink(code)             → https://<site>/b/K7Q2
//   inviteText(details)          → the WhatsApp / share message
//   watchMatch(matchId, onEvent) → Realtime signals + polling fallback; returns { stop, refresh }
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
export { PVP_CODE_RE, PVP_CODE_CHARS, PVP_TIMER_OPTIONS } from '@/lib/pvp/constants'

let client = null
function db() { return (client ??= createClient()) }

/** Call a pvp_* SQL function. Network/permission failures become { ok:false }. */
export async function pvpCall(fn, args = {}) {
  try {
    const { data, error } = await db().rpc(fn, args)
    if (error) {
      const offline = /fetch|network/i.test(error.message)
      ;(offline ? console.warn : console.error)(`[pvp] ${fn}:`, error.message)
      return { ok: false, error: offline ? 'PVP_OFFLINE' : 'PVP_SERVER' }
    }
    return data ?? { ok: false, error: 'PVP_SERVER' }
  } catch {
    return { ok: false, error: 'PVP_OFFLINE' }
  }
}

const MESSAGES = {
  PVP_AUTH_REQUIRED:        'Sign in to battle your friends.',
  PVP_ACCOUNT_REQUIRED:     'Create a free account to start your own battles. You can still join a friend\'s battle as a guest.',
  PVP_GUEST_UNAVAILABLE:    'Playing without an account isn\'t available right now. Tap "I have an account" or create a free one to accept.',
  PVP_FULL:                 'All battle rooms are busy right now. Try again in a few minutes.',
  PVP_BAD_SETTINGS:         'Those battle settings aren\'t valid. Go back and pick again.',
  PVP_NOT_ENOUGH_QUESTIONS: 'There aren\'t enough questions for this topic yet. Try Random Mix.',
  PVP_CODE_NOT_FOUND:       'We couldn\'t find a battle with that code. Check it and try again.',
  PVP_EXPIRED:              'This battle has expired. Ask your friend to create a new one.',
  PVP_OWN_BATTLE:           'That\'s your own battle. Send the code to a friend.',
  PVP_NOT_INVITED:          'This rematch is for someone else.',
  PVP_TOO_MANY_ATTEMPTS:    'Too many wrong codes. Wait a minute and try again.',
  PVP_NOT_A_PLAYER:         'You\'re not part of this battle.',
  PVP_NOT_IN_PROGRESS:      'This battle isn\'t running.',
  PVP_NOT_ALLOWED:          'That isn\'t possible for this battle.',
  PVP_TIME_UP:              'Time\'s up for that question.',
  PVP_OFFLINE:              'You\'re offline. Check your connection and try again.',
  PVP_SERVER:               'Something went wrong on our side. Please try again.',
}
export function pvpMessage(code) {
  return MESSAGES[code] ?? MESSAGES.PVP_SERVER
}

export function inviteLink(code) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/b/${code}`
}

export function inviteText({ hostName, exam, subject, count, timer, code }) {
  const who = hostName ? `${hostName} challenged you` : 'You\'ve been challenged'
  return `⚔️ ${who} to a ${exam} ${subject} battle on ExamPrep! ${count} questions, ${timer}s each.\n` +
         `Tap to accept: ${inviteLink(code)}\n(code ${code}, expires in 10 minutes)`
}

/**
 * Follow a match. Realtime Broadcast signals (answered, reveal, finished, …)
 * trigger an immediate re-read of pvp_state; a poll keeps the screen right if
 * Realtime is blocked or drops — every `pollMs` without Realtime, every
 * `livePollMs` with it.
 *
 * onEvent(event, payload):
 *   'state'       a fresh pvp_state; payload.clockOffset = server time − this
 *                 phone's time in ms (from the quickest round trip seen)
 *   'error'       { ok:false, error } — a real problem (not a player, gone)
 *   'connection'  { online } when the phone loses or regains the server
 *   plus each Broadcast event by name ('joined', 'answered', 'reveal', …).
 *
 * Returns { stop, refresh }. refresh({ tick: true }) calls pvp_tick instead,
 * which also closes a round whose time is up.
 */
export function watchMatch(matchId, onEvent, { pollMs = 3000, livePollMs = 12000 } = {}) {
  let stopped = false
  let channel = null
  let realtimeUp = false
  let online = true
  let timer = null
  let inFlight = false
  let again = null          // a refresh asked for while one was running
  let latest = 0            // server_now of the newest state shown
  let bestRtt = Infinity
  let clockOffset = 0
  const supabase = db()

  ;(async () => {
    try {
      await supabase.realtime.setAuth?.()   // private channels need the player's token
      if (stopped) return
      channel = supabase.channel(`pvp:${matchId}`, { config: { private: true } })
      for (const ev of ['joined', 'answered', 'reveal', 'finished', 'rematch', 'cancelled', 'abandoned']) {
        channel.on('broadcast', { event: ev }, msg => {
          if (stopped) return
          onEvent(ev, msg.payload ?? {})
          refresh()
        })
      }
      channel.subscribe(status => { realtimeUp = status === 'SUBSCRIBED' })
    } catch (e) {
      console.warn('[pvp] realtime unavailable, polling only:', e?.message ?? e)
    }
  })()

  function setOnline(value) {
    if (online === value) return
    online = value
    onEvent('connection', { online })
  }

  async function refresh({ tick = false } = {}) {
    if (stopped) return
    if (inFlight) { again = { tick: tick || !!again?.tick }; return }
    inFlight = true
    clearTimeout(timer)
    const sent = Date.now()
    const state = await pvpCall(tick ? 'pvp_tick' : 'pvp_state', { p_match: matchId })
    const received = Date.now()
    inFlight = false
    if (stopped) return

    if (state?.ok) {
      setOnline(true)
      const serverNow = Date.parse(state.server_now)
      if (received - sent < bestRtt) {
        bestRtt = received - sent
        clockOffset = serverNow - (sent + received) / 2
      }
      // Two reads can cross on a slow network: never step back to an older one.
      if (serverNow >= latest) {
        latest = serverNow
        onEvent('state', { ...state, clockOffset })
      }
    } else if (state?.error === 'PVP_OFFLINE') {
      setOnline(false)
    } else if (state?.error && state.error !== 'PVP_SERVER') {
      onEvent('error', state)
    }

    if (again) { const next = again; again = null; refresh(next); return }
    timer = setTimeout(refresh, realtimeUp && online ? livePollMs : pollMs)
  }
  refresh()

  const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
  document.addEventListener('visibilitychange', onVisible)
  const onOnline = () => refresh()
  window.addEventListener('online', onOnline)

  return {
    refresh,
    stop() {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      if (channel) supabase.removeChannel(channel)
    },
  }
}
