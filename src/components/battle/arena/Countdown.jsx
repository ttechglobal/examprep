'use client'
// src/components/battle/arena/Countdown.jsx
// Full-screen 3-2-1 before the first question. Counts down to `endsAt`
// (a Date.now()-style time), so a 1v1 can follow the server's start time;
// calls onDone once when it reaches zero. `children` shows under the number.
import { useState, useEffect, useRef } from 'react'
import BattleBg from './BattleBg'
import { NAVY2 } from './theme'

export default function Countdown({ endsAt, onDone, caption = 'Get ready!', children }) {
  const [now, setNow] = useState(() => Date.now())
  const done = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt && !done.current) { done.current = true; onDone?.() }
    }, 100)
    return () => clearInterval(id)
  }, [endsAt, onDone])

  const n = Math.min(3, Math.max(1, Math.ceil((endsAt - now) / 1000)))
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <BattleBg/>
      <div key={n} style={{ fontSize:110, fontWeight:900, color:NAVY2, lineHeight:1, animation:'cdpop .4s ease', position:'relative', zIndex:5 }}>{n}</div>
      <div style={{ fontSize:13, fontWeight:900, color:'rgba(26,36,104,.6)', textTransform:'uppercase', letterSpacing:'.12em', position:'relative', zIndex:5 }}>{caption}</div>
      {children && <div style={{ position:'relative', zIndex:5 }}>{children}</div>}
      <style>{`@keyframes cdpop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
