'use client'
// src/components/battle/arena/TimerRing.jsx
// Small countdown ring for the question card. Counts down to `endsAt`
// (Date.now()-style time); vs Computer passes mount time + secs, 1v1 passes
// the server's round end converted to this phone's clock. Calls onTimeUp once.
import { useState, useEffect, useRef } from 'react'
import { NAVY, GOLD, GREEN, RED } from './theme'

export default function TimerRing({ secs, endsAt, onTimeUp }) {
  const [rem, setRem] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000))
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
    const tick = () => {
      const left = Math.max(0, (endsAt - Date.now()) / 1000)
      setRem(left)
      if (left <= 0 && !fired.current) { fired.current = true; onTimeUp?.() }
      return left
    }
    if (tick() <= 0) return
    const id = setInterval(() => { if (tick() <= 0) clearInterval(id) }, 100)
    return () => clearInterval(id)
  }, [endsAt, onTimeUp])

  const pct  = Math.min(1, rem / secs)
  const r    = 13, circ = 2 * Math.PI * r
  const col  = pct > .5 ? GREEN : pct > .25 ? GOLD : RED
  return (
    <div role="timer" aria-label={`${Math.ceil(rem)} seconds left`} style={{ position:'relative', width:34, height:34, flexShrink:0 }}>
      <svg width="34" height="34" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/>
        <circle cx="17" cy="17" r={r} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{ transition:'stroke-dashoffset .1s linear,stroke .3s' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:NAVY, fontVariantNumeric:'tabular-nums' }}>{Math.ceil(rem)}</div>
    </div>
  )
}
