// src/components/battle/arena/ResultHero.jsx
// Top of a battle results screen: big icon, "You Won!" in the outcome's colour,
// a line under it, a small meta line, and a wave into the score strip below.
//   tone: 'win' | 'draw' | 'loss' (picks the background and title colour)
import { GOLD } from './theme'

const TONES = {
  win:  { bg:'linear-gradient(160deg,#0C1240 0%,#1A2468 55%,#0D1A5C 100%)', accent:GOLD      },
  draw: { bg:'linear-gradient(160deg,#0369A1 0%,#0E4C7A 55%,#083460 100%)', accent:'#60A5FA' },
  loss: { bg:'linear-gradient(160deg,#3B1280 0%,#5B21B6 55%,#2D0E6B 100%)', accent:'#C4B5FD' },
}
const HEX_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='52' height='46' viewBox='0 0 52 46' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M26 2L50 15v16L26 44 2 31V15z' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/svg%3E\")"

export default function ResultHero({ tone, icon, title, sub, meta }) {
  const t = TONES[tone] ?? TONES.draw
  return (
    <div style={{ background:t.bg, padding:'52px 22px 0', textAlign:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:HEX_PATTERN, backgroundSize:'52px 46px', pointerEvents:'none' }}/>
      <div style={{ fontSize:60, lineHeight:1, marginBottom:10, position:'relative', zIndex:1, filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }}>{icon}</div>
      <div style={{ fontSize:30, fontWeight:900, color:t.accent, letterSpacing:'-.04em', lineHeight:1, marginBottom:6, position:'relative', zIndex:1, textShadow:'0 2px 0 rgba(0,0,0,.3)' }}>{title}</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', marginBottom:6, position:'relative', zIndex:1, lineHeight:1.5 }}>{sub}</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:26, position:'relative', zIndex:1 }}>{meta}</div>
      <svg viewBox="0 0 520 28" fill="none" preserveAspectRatio="none" style={{ display:'block', width:'100%', position:'relative', zIndex:6, marginBottom:-1 }}>
        <path d="M0 28 L0 14 Q65 0 130 10 Q195 20 260 8 Q325 0 390 12 Q455 22 520 10 L520 28 Z" fill="#D5E5F5"/>
      </svg>
    </div>
  )
}
