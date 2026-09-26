'use client'
// src/components/battle/arena/AnswerTiles.jsx
// The four coloured answer tiles (1 column on phones, 2×2 from 600 px).
//
//   options     option list (strings or { text })
//   selectedIdx this player's pick, or null
//   reveal      null while the round is open, or { correctIdx, theirsIdx }
//               once it's closed: correct turns green, a wrong pick red, the
//               rest fade, and "You" / opponent / "Both" badges show the picks
//   opponent    { emoji, label, color } for the opponent's badge
//   onSelect    (idx) => void; tiles are disabled once revealed or `disabled`
//   popKey      changes to replay the tap animation on the same tile
//
// PickBadge is exported for the review screen.
import { MathText } from '@/lib/mathRenderer'
import { TILE, LETTERS, DECOS, NAVY2, optionText } from './theme'

export function PickBadge({ who, opponent, size = 36 }) {
  const look = who === 'both'
    ? { bg: NAVY2, emoji: '🤝', label: 'Both' }
    : who === 'me'
      ? { bg: '#3B5BDB', emoji: '👤', label: 'You' }
      : { bg: opponent.color, emoji: opponent.emoji, label: opponent.label }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:look.bg, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size / 2, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>{look.emoji}</div>
      <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:look.bg, borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap', maxWidth:70, overflow:'hidden', textOverflow:'ellipsis' }}>{look.label}</span>
    </div>
  )
}

/** 'me' | 'them' | 'both' | null — who picked option i. */
export function pickedBy(i, mineIdx, theirsIdx) {
  const mine = i === mineIdx, theirs = i === theirsIdx
  return mine && theirs ? 'both' : mine ? 'me' : theirs ? 'them' : null
}

export default function AnswerTiles({ options, selectedIdx, reveal, opponent, onSelect, disabled = false, popKey = 0 }) {
  const revealed = !!reveal
  return (
    <>
      <style>{`
        .btiles{display:grid;grid-template-columns:1fr;gap:11px;align-items:stretch}
        .btile-h{min-height:clamp(56px,8vw,72px)}
        @media(min-width:600px){
          .btiles{grid-template-columns:1fr 1fr;gap:clamp(10px,1.5vw,16px)}
          .btile-h{min-height:clamp(80px,12vw,110px)}
        }
        @keyframes tilepop{0%{transform:scale(1)}25%{transform:scale(0.91)}65%{transform:scale(1.05)}100%{transform:scale(1)}}
        .tile-pop{animation:tilepop .2s cubic-bezier(.36,.07,.19,.97)}
      `}</style>
      <div className="btiles">
        {options.map((opt, idx) => {
          const tile  = TILE[idx] ?? TILE[0]
          const isSel = selectedIdx === idx
          const isCor = revealed && idx === reveal.correctIdx

          let bg      = tile.bg
          let shadow  = `0 6px 0 ${tile.press},0 8px 20px ${tile.glow}`
          let ltrBg   = 'rgba(255,255,255,.22)'
          let opacity = 1
          let border  = '2px solid transparent'

          if (revealed) {
            if (isCor)      { bg='#16A34A'; shadow='0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)'; ltrBg='rgba(255,255,255,.35)'; border='2px solid rgba(255,255,255,.45)' }
            else if (isSel) { bg='#DC2626'; shadow='0 5px 0 #991B1B,0 7px 18px rgba(220,38,38,.4)'; ltrBg='rgba(255,255,255,.3)'; border='2px solid rgba(255,255,255,.3)' }
            // The opponent's wrong pick stays readable; untouched options fade.
            else            { opacity = idx === reveal.theirsIdx ? .6 : .25; shadow='none' }
          } else if (isSel) {
            border = '2px solid rgba(255,255,255,.9)'
            shadow = `0 0 0 3px rgba(255,255,255,.35), 0 6px 0 ${tile.press}, 0 8px 22px ${tile.glow}`
            ltrBg  = 'rgba(255,255,255,.45)'
          }

          const letter = revealed && isCor ? '✓' : revealed && isSel ? '✗' : LETTERS[idx]
          const who    = revealed ? pickedBy(idx, selectedIdx, reveal.theirsIdx) : null
          const locked = revealed || disabled

          return (
            <button
              key={`tile-${idx}-${isSel ? popKey : 0}`}
              onClick={() => onSelect?.(idx)}
              disabled={locked}
              aria-pressed={isSel}
              className={isSel && !revealed ? 'tile-pop' : ''}
              style={{ background:'none', border:'none', padding:0, cursor:locked?'default':'pointer', borderRadius:18, WebkitTapHighlightColor:'transparent', position:'relative', display:'flex', flexDirection:'column', fontFamily:'inherit' }}
            >
              {/* Fading the tile, not the button, keeps the pick badges fully visible */}
              <div className="btile-h" style={{ flex:1, display:'flex', alignItems:'center', padding:'0 clamp(12px,2vw,18px) 0 0', borderRadius:18, background:bg, boxShadow:shadow, border, opacity, position:'relative', overflow:'hidden', transition:'box-shadow .1s, opacity .1s' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'42%', background:'linear-gradient(to bottom,rgba(255,255,255,.28),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:6, background:'rgba(0,0,0,.18)', borderRadius:'0 0 16px 16px', pointerEvents:'none' }}/>
                <div style={{ width:'clamp(44px,6vw,58px)', height:'clamp(44px,6vw,58px)', borderRadius:'50%', background:ltrBg, border: isSel && !revealed ? '2px solid rgba(255,255,255,.9)' : '2px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(18px,2.8vw,26px)', fontWeight:900, color:'#fff', flexShrink:0, margin:'0 clamp(12px,2vw,18px)', boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)', position:'relative', zIndex:1, transition:'background .1s, border .1s' }}>{letter}</div>
                <div style={{ flex:1, fontSize:'clamp(13px,1.8vw,18px)', fontWeight:800, color:'#fff', textAlign:'left', lineHeight:1.45, minWidth:0, wordBreak:'break-word', position:'relative', zIndex:1 }}>
                  <MathText text={optionText(opt)} as="span" className=""/>
                </div>
                <div style={{ flexShrink:0, position:'relative', zIndex:1 }}>{DECOS[idx]}</div>
              </div>

              {isSel && !revealed && (
                <div style={{ position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)', background:'#fff', color:tile.bg, fontSize:9, fontWeight:900, borderRadius:999, padding:'2px 9px', letterSpacing:'.04em', boxShadow:'0 2px 6px rgba(0,0,0,.2)', whiteSpace:'nowrap', zIndex:10 }}>
                  YOUR PICK ✓
                </div>
              )}

              {who && (
                <div style={{ position:'absolute', top:-16, right:6, zIndex:5 }}>
                  <PickBadge who={who} opponent={opponent}/>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
