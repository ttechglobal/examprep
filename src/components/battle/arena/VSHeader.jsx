'use client'
// src/components/battle/arena/VSHeader.jsx
// The battle header: you vs your opponent (the computer or a friend), scores,
// progress bars, the opponent's "Thinking / Answered" pill, menu and Q counter.
import { NAVY2, GOLD, GOLD2 } from './theme'

const labelStyle = { fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.65)', lineHeight:1, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }

// ── VS Header ─────────────────────────────────────────────────────────────────
// Desktop: [☰ Menu] ←──── wide gap ────[Avatar|PANEL ⚡VS⚡ PANEL|Avatar]──── wide gap ────→ [🚩 Q X of Y]
// Mobile:  [☰ Menu] ──────────────────────────────────────── [🚩 Q X/Y]
//          [Avatar | PANEL ⚡VS⚡ PANEL | Avatar]   (full-width row)
//
// Panel shape: parallelogram — outer edge rounded, inner edge angled toward VS.
// Avatar is positioned so it sits perfectly centred on the panel's outer face.
//
// me / opponent: { label, score, dots (0–5 filled bars), avatar }; opponent also
// { answered, waitingText, idle } for its status pill (idle: no "typing" dots). float: { side: 'me'|'opponent',
// key, text } shows a "+10" rising from that side.
export default function VSHeader({ qIndex, total, me, opponent, onMenu, menuLabel = 'Menu', float = null }) {
  const AV   = 62    // avatar diameter
  const SKEW = 18    // px — how far the inner edge of each panel angles inward

  return (
    <div style={{ background:`linear-gradient(180deg,#0B1138 0%,${NAVY2} 100%)`, flexShrink:0, zIndex:100, boxShadow:`0 4px 0 rgba(3,10,50,.65),0 8px 24px rgba(0,0,0,.45)`, paddingTop:'env(safe-area-inset-top,0px)' }}>
      <style>{`
        @keyframes tdot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-36px);opacity:0}}

        /* ── utility row: always visible ── */
        .vsh-util{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 8px;}

        /* ── VS strip: full width on mobile ── */
        .vsh-vs{display:flex;align-items:center;padding:0 10px 14px;gap:0;position:relative;}

        /* ── DESKTOP ≥640px: single row, full expanse ── */
        @media(min-width:640px){
          /* hide mobile util row; VS strip becomes a 3-col grid */
          .vsh-util{display:none;}
          .vsh-vs{
            display:grid;
            grid-template-columns:auto 1fr auto;
            align-items:center;
            padding:12px 20px 16px;
            gap:20px;
          }
          /* centre column: the actual VS strip */
          .vsh-vs-centre{display:flex;align-items:center;gap:0;position:relative;}
        }
        /* mobile: hide desktop-only elements */
        .vsh-dt-menu,.vsh-dt-qc{display:none;}
        @media(min-width:640px){
          .vsh-dt-menu,.vsh-dt-qc{display:flex;}
        }
      `}</style>

      {/* ── Mobile utility row (Menu + Q counter) ── */}
      <div className="vsh-util">
        {/* Menu */}
        <button onClick={onMenu} style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'8px 14px', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none"><path d="M1 1.5h14M1 6.5h14M1 11.5h14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          {menuLabel}
        </button>
        {/* Q counter — compact on mobile */}
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'8px 13px', color:'#fff', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 1v12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><path d="M2 1l9 3.5L2 8" fill="white"/></svg>
          Q {qIndex+1}/{total}
        </div>
      </div>

      {/* ── VS strip row (mobile: standalone; desktop: grid col 1→3) ── */}
      <div className="vsh-vs">

        {/* Desktop Menu (far left) */}
        <button className="vsh-dt-menu" onClick={onMenu} style={{ alignItems:'center', gap:7, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'9px 16px', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,.25)', whiteSpace:'nowrap', flexShrink:0 }}>
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none"><path d="M1 1.5h14M1 6.5h14M1 11.5h14" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          {menuLabel}
        </button>

        {/* Centre VS strip (flex on mobile, centre grid cell on desktop) */}
        <div className="vsh-vs-centre" style={{ flex:1, display:'flex', alignItems:'center', gap:0, position:'relative', minWidth:0 }}>

          {/* ── Player (YOU) side ── */}
          <div style={{ flex:1, display:'flex', alignItems:'center', minWidth:0, position:'relative' }}>
            {/* Panel — parallelogram: left outer edge rounded, right inner edge angled */}
            <div style={{
              flex:1, minWidth:0,
              background:'linear-gradient(160deg,#2A5CE8,#1A3FC0)',
              borderRadius:'16px 0 0 16px',
              clipPath:`polygon(0 0, calc(100% - ${SKEW}px) 0, 100% 100%, 0 100%)`,
              boxShadow:'inset 0 -5px 0 rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.18)',
              position:'relative', overflow:'hidden', zIndex:1,
              display:'flex', alignItems:'center', justifyContent:'center',
              // pad away from avatar (left) and from angled cut (right)
              paddingLeft:`${AV * 0.52 + 4}px`, paddingRight:`${SKEW + 8}px`,
              paddingTop:8, paddingBottom:8,
            }}>
              {/* Top sheen */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'44%', background:'linear-gradient(to bottom,rgba(255,255,255,.2),transparent)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1, textAlign:'center', width:'100%' }}>
                <div style={{ ...labelStyle }}>{me.label ?? 'YOU'}</div>
                <div style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums', textShadow:'0 2px 0 rgba(0,0,0,.25)' }}>{me.score}</div>
                <div style={{ display:'flex', gap:3, marginTop:5 }}>
                  {Array.from({length:5}).map((_,i)=>(
                    <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<me.dots ? '#60A5FA' : 'rgba(255,255,255,.2)', transition:'background .3s', boxShadow: i<me.dots ? '0 0 5px #60A5FA' : 'none' }}/>
                  ))}
                </div>
              </div>
            </div>
            {/* Avatar — centred ON the panel's outer (left) face; z above panel */}
            <div style={{
              position:'absolute', left:0,
              width:AV, height:AV, borderRadius:'50%',
              background:'linear-gradient(150deg,#F59E0B,#FBBF24)',
              border:'3.5px solid #fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:30, zIndex:4,
              boxShadow:'0 4px 16px rgba(0,0,0,.4)',
              // Centre the avatar horizontally on the panel's left edge
              transform:'translateX(0)',
            }}>{me.avatar ?? '🧑🏾'}</div>
          </div>

          {/* ── VS badge — lightning + bold italic text ── */}
          <div style={{ flexShrink:0, zIndex:10, width:54, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
            {/* Left bolt */}
            <svg style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)' }} width="16" height="28" viewBox="0 0 16 28" fill="none">
              <path d="M10 1L2 14h6L4 27l12-15H9L10 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.5"/>
            </svg>
            <span style={{ fontSize:20, fontWeight:900, fontStyle:'italic', color:GOLD, lineHeight:1, letterSpacing:'-.02em', textShadow:`0 0 14px rgba(255,184,0,.7),0 2px 0 ${GOLD2}`, position:'relative', zIndex:1 }}>VS</span>
            {/* Right bolt */}
            <svg style={{ position:'absolute', right:-8, top:'50%', transform:'translateY(-50%)' }} width="16" height="28" viewBox="0 0 16 28" fill="none">
              <path d="M6 1l8 13H8l4 13L0 12h7L6 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.5"/>
            </svg>
          </div>

          {/* ── Computer side ── */}
          <div style={{ flex:1, display:'flex', alignItems:'center', minWidth:0, position:'relative' }}>
            {/* Panel — mirrored parallelogram */}
            <div style={{
              flex:1, minWidth:0,
              background:'linear-gradient(160deg,#7C3AED,#5B20C0)',
              borderRadius:'0 16px 16px 0',
              clipPath:`polygon(${SKEW}px 0, 100% 0, 100% 100%, 0 100%)`,
              boxShadow:'inset 0 -5px 0 rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.14)',
              position:'relative', overflow:'hidden', zIndex:1,
              display:'flex', alignItems:'center', justifyContent:'center',
              paddingRight:`${AV * 0.52 + 4}px`, paddingLeft:`${SKEW + 8}px`,
              paddingTop:8, paddingBottom:8,
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'44%', background:'linear-gradient(to bottom,rgba(255,255,255,.14),transparent)', pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1, textAlign:'center', width:'100%' }}>
                <div style={{ ...labelStyle }}>{opponent.label}</div>
                <div style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums', textShadow:'0 2px 0 rgba(0,0,0,.25)' }}>{opponent.score}</div>
                <div style={{ display:'flex', gap:3, marginTop:5, flexDirection:'row-reverse' }}>
                  {Array.from({length:5}).map((_,i)=>(
                    <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<opponent.dots ? '#C084FC' : 'rgba(255,255,255,.2)', transition:'background .3s', boxShadow: i<opponent.dots ? '0 0 5px #C084FC' : 'none' }}/>
                  ))}
                </div>
              </div>
            </div>
            {/* Opponent avatar + status pill — centred on panel's right face */}
            <div style={{ position:'absolute', right:0, zIndex:4, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width:AV, height:AV, borderRadius:'50%',
                background:'linear-gradient(150deg,#9333EA,#7C3AED)',
                border:'3.5px solid #fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:28,
                boxShadow:'0 4px 16px rgba(0,0,0,.4)',
              }}>{opponent.avatar}</div>
              {/* Status pill */}
              <div aria-live="polite" style={{ background: opponent.answered ? '#16A34A' : '#7C3AED', borderRadius:999, padding:'2px 8px', display:'flex', alignItems:'center', gap:3, boxShadow:'0 2px 6px rgba(0,0,0,.35)', whiteSpace:'nowrap' }}>
                {opponent.answered
                  ? <span style={{ fontSize:8, fontWeight:900, color:'#fff' }}>✓ Answered</span>
                  : <>
                      <span style={{ fontSize:8, fontWeight:900, color:'rgba(255,255,255,.9)' }}>{opponent.waitingText ?? 'Thinking'}</span>
                      {!opponent.idle && (
                        <span style={{ display:'inline-flex', gap:2 }}>
                          {[0,1,2].map(i=><span key={i} style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,.8)', display:'inline-block', animation:`tdot .9s ${i*.2}s ease-in-out infinite` }}/>)}
                        </span>
                      )}
                    </>
                }
              </div>
            </div>
          </div>

          {/* Score float */}
          {float && (
            <div key={float.key} style={{ position:'absolute', top:0, [float.side==='me'?'left':'right']:AV+24, fontSize:18, fontWeight:900, color: float.side==='me'?'#4ADE80':'#F87171', animation:'floatup .8s ease-out forwards', pointerEvents:'none', zIndex:20 }}>{float.text ?? '+10'}</div>
          )}
        </div>

        {/* Desktop Q counter (far right) */}
        <div className="vsh-dt-qc" style={{ alignItems:'center', gap:7, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'9px 16px', color:'#fff', fontSize:13, fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,.25)', whiteSpace:'nowrap', flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 1v12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><path d="M2 1l9 3.5L2 8" fill="white"/></svg>
          Question {qIndex+1} of {total}
        </div>

      </div>
    </div>
  )
}
