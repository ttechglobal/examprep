'use client'
// src/app/student/battle/1v1/match/page.js?m=<match id>
// Live 1v1 match. PHASE 2 PLACEHOLDER: confirms both players are connected
// and shows the countdown; the full match screen (rounds, reveal, results)
// replaces this in Phase 3.
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { pvpCall, pvpMessage, watchMatch } from '@/lib/pvp/client'

const GOLD = '#FFB800'

export default function PvpMatchPage() {
  const router = useRouter()
  const [matchId, setMatchId] = useState(null)
  const [state,   setState]   = useState(null)
  const [error,   setError]   = useState(null)
  const [now,     setNow]     = useState(Date.now())
  const offset = useRef(0)

  useEffect(() => { setMatchId(new URLSearchParams(window.location.search).get('m')) }, [])

  useEffect(() => {
    if (!matchId) return
    return watchMatch(matchId, (event, payload) => {
      if (event === 'error') return setError(payload.error)
      if (event === 'state') {
        offset.current = new Date(payload.server_now).getTime() - Date.now()
        setState(payload)
      }
    })
  }, [matchId])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  async function leave() {
    if (matchId) await pvpCall('pvp_leave', { p_match: matchId })
    router.push('/student/battle/1v1')
  }

  const m = state?.match
  const startsIn = m?.round_started_at
    ? Math.ceil((new Date(m.round_started_at).getTime() - (now + offset.current)) / 1000)
    : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#0B1138,#1A2468)', padding: 24, color: '#fff' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{pvpMessage(error)}</div>
            <button onClick={() => router.push('/student/battle/1v1')} style={btn}>Back to 1v1</button>
          </>
        ) : !m ? (
          <div style={{ fontWeight: 800 }}>Connecting…</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
              <Player name={state.host.name} me={state.me === 'host'}/>
              <div style={{ fontSize: 28, fontWeight: 900, color: GOLD }}>VS</div>
              <Player name={state.guest.name} me={state.me === 'guest'}/>
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', marginTop: 16 }}>
              {m.exam} · {m.subject_name} · {m.question_count} questions · {m.timer_secs}s each
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, color: GOLD, marginTop: 20, minHeight: 68 }}>
              {m.status === 'in_progress' && startsIn > 0 && m.rounds_closed === 0 ? startsIn : ''}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
              {m.status === 'in_progress' ? 'Both players connected. The live match screen arrives in Phase 3.' : `Match ${m.status}.`}
            </div>
            <button onClick={leave} style={btn}>{m.status === 'in_progress' ? 'Leave match' : 'Back to 1v1'}</button>
          </>
        )}
      </div>
    </div>
  )
}

function Player({ name, me }) {
  return (
    <div>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: me ? '#1264E5' : '#7C3AED', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto' }}>🧑🏾‍🎓</div>
      <div style={{ fontSize: 14, fontWeight: 900, marginTop: 8 }}>{name ?? '…'}{me ? ' (you)' : ''}</div>
    </div>
  )
}

const btn = { marginTop: 22, padding: '12px 20px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }
