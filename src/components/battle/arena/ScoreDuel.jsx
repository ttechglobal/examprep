// src/components/battle/arena/ScoreDuel.jsx
// Results screen score strip: two slanted panels with ⚡VS⚡ between them. The
// winner's panel lights up (blue on the left, purple on the right).
//   left / right: { label, score, winner }
import { GOLD, GOLD2 } from './theme'

const SKEW = 16

function ScorePanel({ label, score, winner, side }) {
  const left = side === 'left'
  return (
    <div style={{ flex:1, display:'flex', alignItems:'stretch', minWidth:0 }}>
      <div style={{
        flex:1, minWidth:0,
        background: winner
          ? (left ? 'linear-gradient(160deg,#2A5CE8,#1A3FC0)' : 'linear-gradient(160deg,#7C3AED,#5B20C0)')
          : 'rgba(26,36,104,.08)',
        borderRadius: left ? '14px 0 0 14px' : '0 14px 14px 0',
        clipPath: left
          ? `polygon(0 0, calc(100% - ${SKEW}px) 0, 100% 100%, 0 100%)`
          : `polygon(${SKEW}px 0, 100% 0, 100% 100%, 0 100%)`,
        padding: left ? `14px ${SKEW+14}px 14px 18px` : `14px 18px 14px ${SKEW+14}px`,
        textAlign: left ? 'left' : 'right',
        border: `1.5px solid ${winner ? 'rgba(255,255,255,.2)' : 'rgba(26,36,104,.1)'}`,
        boxShadow: winner ? 'inset 0 -4px 0 rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.18)' : 'none',
        position:'relative', overflow:'hidden',
      }}>
        {winner && <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'linear-gradient(to bottom,rgba(255,255,255,.16),transparent)', pointerEvents:'none' }}/>}
        <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color: winner ? 'rgba(255,255,255,.7)' : '#9CA3AF', lineHeight:1, marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</div>
        <div style={{ fontSize:38, fontWeight:900, lineHeight:1, fontVariantNumeric:'tabular-nums', color: winner ? '#fff' : '#374151', textShadow: winner ? '0 2px 0 rgba(0,0,0,.25)' : 'none' }}>{score}</div>
      </div>
    </div>
  )
}

export default function ScoreDuel({ left, right }) {
  return (
    <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
      <ScorePanel {...left} side="left"/>
      <div style={{ flexShrink:0, width:52, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', zIndex:2 }}>
        <svg style={{ position:'absolute', left:-5, top:'50%', transform:'translateY(-50%)' }} width="13" height="22" viewBox="0 0 13 22" fill="none">
          <path d="M8 1L1 11h5L2 21l11-13H8L8 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.4"/>
        </svg>
        <span style={{ fontSize:17, fontWeight:900, fontStyle:'italic', color:GOLD, textShadow:`0 0 10px rgba(255,184,0,.5),0 1px 0 ${GOLD2}` }}>VS</span>
        <svg style={{ position:'absolute', right:-5, top:'50%', transform:'translateY(-50%)' }} width="13" height="22" viewBox="0 0 13 22" fill="none">
          <path d="M5 1l7 10H7l3 10L0 8h5L5 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.4"/>
        </svg>
      </div>
      <ScorePanel {...right} side="right"/>
    </div>
  )
}
