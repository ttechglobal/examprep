'use client'
// src/app/student/battle/session/page.js
// Exact reference game UI: sky bg · VS header · 2×2 coloured tiles · sand wave
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import { createComputerOpponent, readLocalBattleStats, saveLocalBattleStats } from '@/lib/battleAI'
import { computeSessionXP } from '@/lib/xp'
import { saveSessionLocally, flushSyncQueue } from '@/lib/localSessionSync'
import { MathText } from '@/lib/mathRenderer'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'

// ── Brand constants ───────────────────────────────────────────────────────────
const NAVY  = '#12195A'
const NAVY2 = '#1A2468'
const GOLD  = '#FFB800'
const GOLD2 = '#CC8F00'
const GREEN = '#16A34A'
const RED   = '#DC2626'

const TILE = [
  { bg:'#3B82F6', press:'#1D4ED8', glow:'rgba(59,130,246,.35)'   }, // A blue
  { bg:'#22C55E', press:'#15803D', glow:'rgba(34,197,94,.35)'    }, // B green
  { bg:'#F97316', press:'#C2410C', glow:'rgba(249,115,22,.35)'   }, // C orange
  { bg:'#8B5CF6', press:'#6D28D9', glow:'rgba(139,92,246,.35)'   }, // D purple
]
const LETTERS = ['A','B','C','D']

// ── Helpers ───────────────────────────────────────────────────────────────────
function normaliseOptions(options) {
  if (!options) return []
  if (Array.isArray(options)) return options.map(o => typeof o === 'string' ? o : o?.text ?? o?.value ?? String(o))
  if (typeof options === 'object') return Object.values(options).map(String)
  return []
}
function checkCorrect(opts, idx, correct_answer) {
  if (idx === null || idx === undefined) return false
  return opts[idx] === correct_answer || LETTERS[idx] === correct_answer
}
function subjectEmoji(name = '') {
  const n = name.toLowerCase()
  if (n.includes('chem'))   return '⚗️'
  if (n.includes('phys'))   return '⚡'
  if (n.includes('bio'))    return '🔬'
  if (n.includes('math'))   return '📐'
  if (n.includes('english') || n.includes('lit')) return '📖'
  if (n.includes('econ'))   return '📊'
  if (n.includes('gov'))    return '🏛️'
  if (n.includes('geo'))    return '🌍'
  return '📚'
}

// ── Shared battle background ──────────────────────────────────────────────────
function BattleBg({ overlay = null }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0 }}>
      <img
        src="/images/battle/session-bg.png"
        alt=""
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center bottom', display:'block' }}
      />
      {overlay && <div style={{ position:'absolute', inset:0, background:overlay }}/>}
    </div>
  )
}
// Keep alias so any internal callers still work without rename
const SkyBg = BattleBg

// ── Molecule tile decorations ─────────────────────────────────────────────────
const DECOS = [
  <svg key="a" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="11" cy="4" r="3" stroke="white" strokeWidth="1.4"/><circle cx="4" cy="16" r="3" stroke="white" strokeWidth="1.4"/><circle cx="18" cy="16" r="3" stroke="white" strokeWidth="1.4"/><line x1="11" y1="7" x2="6" y2="14" stroke="white" strokeWidth="1.1"/><line x1="11" y1="7" x2="16" y2="14" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="b" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="5" cy="5" r="3" stroke="white" strokeWidth="1.4"/><circle cx="17" cy="5" r="3" stroke="white" strokeWidth="1.4"/><circle cx="5" cy="17" r="3" stroke="white" strokeWidth="1.4"/><circle cx="17" cy="17" r="3" stroke="white" strokeWidth="1.4"/><line x1="8" y1="5" x2="14" y2="5" stroke="white" strokeWidth="1.1"/><line x1="5" y1="8" x2="5" y2="14" stroke="white" strokeWidth="1.1"/><line x1="17" y1="8" x2="17" y2="14" stroke="white" strokeWidth="1.1"/><line x1="8" y1="17" x2="14" y2="17" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="c" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1.4"/><line x1="11" y1="2" x2="11" y2="7" stroke="white" strokeWidth="1.1"/><line x1="11" y1="15" x2="11" y2="20" stroke="white" strokeWidth="1.1"/><line x1="2" y1="11" x2="7" y2="11" stroke="white" strokeWidth="1.1"/><line x1="15" y1="11" x2="20" y2="11" stroke="white" strokeWidth="1.1"/></svg>,
  <svg key="d" width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".28"><polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.4" fill="none"/><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1" strokeDasharray="2 2"/></svg>,
]

// ── VS Header ─────────────────────────────────────────────────────────────────
// Desktop: [☰ Menu] ←──── wide gap ────[Avatar|PANEL ⚡VS⚡ PANEL|Avatar]──── wide gap ────→ [🚩 Q X of Y]
// Mobile:  [☰ Menu] ──────────────────────────────────────── [🚩 Q X/Y]
//          [Avatar | PANEL ⚡VS⚡ PANEL | Avatar]   (full-width row)
//
// Panel shape: parallelogram — outer edge rounded, inner edge angled toward VS.
// Avatar is positioned so it sits perfectly centred on the panel's outer face.
function VSHeader({ qIndex, total, studentScore, cpuScore, studentDots, cpuDots, onMenu, floatSide, floatKey, cpuAnswered }) {
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
          Menu
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
          Menu
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
                <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.65)', lineHeight:1, marginBottom:3 }}>YOU</div>
                <div style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums', textShadow:'0 2px 0 rgba(0,0,0,.25)' }}>{studentScore}</div>
                <div style={{ display:'flex', gap:3, marginTop:5 }}>
                  {Array.from({length:5}).map((_,i)=>(
                    <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<studentDots ? '#60A5FA' : 'rgba(255,255,255,.2)', transition:'background .3s', boxShadow: i<studentDots ? '0 0 5px #60A5FA' : 'none' }}/>
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
            }}>🧑🏾</div>
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
                <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.65)', lineHeight:1, marginBottom:3 }}>COMPUTER</div>
                <div style={{ fontSize:30, fontWeight:900, color:'#fff', lineHeight:1, fontVariantNumeric:'tabular-nums', textShadow:'0 2px 0 rgba(0,0,0,.25)' }}>{cpuScore}</div>
                <div style={{ display:'flex', gap:3, marginTop:5, flexDirection:'row-reverse' }}>
                  {Array.from({length:5}).map((_,i)=>(
                    <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<cpuDots ? '#C084FC' : 'rgba(255,255,255,.2)', transition:'background .3s', boxShadow: i<cpuDots ? '0 0 5px #C084FC' : 'none' }}/>
                  ))}
                </div>
              </div>
            </div>
            {/* CPU Avatar + status pill — centred on panel's right face */}
            <div style={{ position:'absolute', right:0, zIndex:4, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width:AV, height:AV, borderRadius:'50%',
                background:'linear-gradient(150deg,#9333EA,#7C3AED)',
                border:'3.5px solid #fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:28,
                boxShadow:'0 4px 16px rgba(0,0,0,.4)',
              }}>🤖</div>
              {/* CPU status pill */}
              <div style={{ background: cpuAnswered ? '#16A34A' : '#7C3AED', borderRadius:999, padding:'2px 8px', display:'flex', alignItems:'center', gap:3, boxShadow:'0 2px 6px rgba(0,0,0,.35)', whiteSpace:'nowrap' }}>
                {cpuAnswered
                  ? <span style={{ fontSize:8, fontWeight:900, color:'#fff' }}>✓ Answered</span>
                  : <>
                      <span style={{ fontSize:8, fontWeight:900, color:'rgba(255,255,255,.9)' }}>Thinking</span>
                      <span style={{ display:'inline-flex', gap:2 }}>
                        {[0,1,2].map(i=><span key={i} style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,.8)', display:'inline-block', animation:`tdot .9s ${i*.2}s ease-in-out infinite` }}/>)}
                      </span>
                    </>
                }
              </div>
            </div>
          </div>

          {/* Score float */}
          {floatSide && (
            <div key={floatKey} style={{ position:'absolute', top:0, [floatSide==='student'?'left':'right']:AV+24, fontSize:18, fontWeight:900, color: floatSide==='student'?'#4ADE80':'#F87171', animation:'floatup .8s ease-out forwards', pointerEvents:'none', zIndex:20 }}>+10</div>
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

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ onDone }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    const t1 = setTimeout(() => setN(2), 900)
    const t2 = setTimeout(() => setN(1), 1800)
    const t3 = setTimeout(onDone, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <SkyBg/>
      <div style={{ fontSize:110, fontWeight:900, color:NAVY2, lineHeight:1, animation:'cdpop .4s ease', position:'relative', zIndex:5 }}>{n}</div>
      <div style={{ fontSize:13, fontWeight:900, color:'rgba(26,36,104,.6)', textTransform:'uppercase', letterSpacing:'.12em', position:'relative', zIndex:5 }}>Get ready!</div>
      <style>{`@keyframes cdpop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ── Timer Ring ────────────────────────────────────────────────────────────────
function TimerRing({ secs, onTimeUp, revealed }) {
  const [rem, setRem] = useState(secs)
  const start = useRef(Date.now())
  const fired = useRef(false)
  useEffect(() => {
    if (revealed) return
    const id = setInterval(() => {
      const left = Math.max(0, secs - (Date.now() - start.current) / 1000)
      setRem(left)
      if (left <= 0 && !fired.current) { fired.current = true; clearInterval(id); onTimeUp() }
    }, 100)
    return () => clearInterval(id)
  }, [secs, onTimeUp, revealed])
  const pct  = rem / secs
  const r    = 13, circ = 2 * Math.PI * r
  const col  = pct > .5 ? GREEN : pct > .25 ? GOLD : RED
  return (
    <div style={{ position:'relative', width:34, height:34, flexShrink:0 }}>
      <svg width="34" height="34" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"/>
        <circle cx="17" cy="17" r={r} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{ transition:'stroke-dashoffset .1s linear,stroke .3s' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:NAVY, fontVariantNumeric:'tabular-nums' }}>{Math.ceil(rem)}</div>
    </div>
  )
}

// ── Pause menu overlay ────────────────────────────────────────────────────────
function PauseMenu({ onResume, onQuit }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(18,25,90,.8)', backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'24px 20px', width:'100%', maxWidth:340, boxShadow:'0 20px 60px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize:20, fontWeight:900, color:NAVY2, letterSpacing:'-.03em', marginBottom:4 }}>⏸ Game Paused</div>
        <div style={{ fontSize:12, color:'#6B7280', marginBottom:20 }}>Battle is waiting for you</div>
        <button onClick={onResume}
          style={{ width:'100%', padding:'14px', borderRadius:16, border:'none', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 #031548', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          ▶ Resume Battle
        </button>
        <button onClick={onQuit}
          style={{ width:'100%', padding:'13px', borderRadius:14, border:'2px solid rgba(220,38,38,.2)', background:'#FEF2F2', color:'#B91C1C', fontSize:13, fontWeight:800, fontFamily:'inherit', cursor:'pointer' }}>
          🚪 Quit to Lobby
        </button>
      </div>
    </div>
  )
}

// ── BattleResults ─────────────────────────────────────────────────────────────
function BattleResults({ questions, answersLog, studentScore, cpuScore, xpAwarded, onRematch, onNewBattle, onHome, onReview }) {
  const outcome = studentScore > cpuScore ? 'win' : studentScore < cpuScore ? 'loss' : 'draw'
  const correctCount = answersLog.filter(a => a.isCorrect).length
  const weakTopics   = Object.entries(
    questions.reduce((acc, q, i) => { if (!answersLog[i]?.isCorrect) { const t = q.topic_name||'General'; acc[t]=(acc[t]||0)+1 } return acc }, {})
  ).filter(([,c]) => c >= 2).map(([t]) => t)

  const OUTCOME = {
    win:  { icon:'🏆', label:'You Won!',       sub:'Outstanding performance!',        heroBg:`linear-gradient(160deg,#0C1240 0%,#1A2468 55%,#0D1A5C 100%)`, accentColor:GOLD,      },
    draw: { icon:'🤝', label:"It's a Draw!",  sub:'A very close match!',             heroBg:'linear-gradient(160deg,#0369A1 0%,#0E4C7A 55%,#083460 100%)',  accentColor:'#60A5FA', },
    loss: { icon:'🤖', label:'Computer Won',   sub:"Keep practising — you'll get it!", heroBg:'linear-gradient(160deg,#3B1280 0%,#5B21B6 55%,#2D0E6B 100%)', accentColor:'#C4B5FD', },
  }[outcome]

  const shBtn    = `0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)`
  const shBtnPrs = `0 1px 0 #031548`
  const pr = e => { e.currentTarget.style.transform='translateY(3px)'; e.currentTarget.style.boxShadow=shBtnPrs }
  const rl = e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=shBtn }

  const SKEW = 16
  const ScorePanel = ({ label, score, isWinner, side }) => (
    <div style={{ flex:1, display:'flex', alignItems:'stretch', minWidth:0 }}>
      <div style={{
        flex:1, minWidth:0,
        background: isWinner
          ? (side==='left' ? 'linear-gradient(160deg,#2A5CE8,#1A3FC0)' : 'linear-gradient(160deg,#7C3AED,#5B20C0)')
          : 'rgba(26,36,104,.08)',
        borderRadius: side==='left' ? '14px 0 0 14px' : '0 14px 14px 0',
        clipPath: side==='left'
          ? `polygon(0 0, calc(100% - ${SKEW}px) 0, 100% 100%, 0 100%)`
          : `polygon(${SKEW}px 0, 100% 0, 100% 100%, 0 100%)`,
        padding: side==='left' ? `14px ${SKEW+14}px 14px 18px` : `14px 18px 14px ${SKEW+14}px`,
        textAlign: side==='left' ? 'left' : 'right',
        border: `1.5px solid ${isWinner ? 'rgba(255,255,255,.2)' : 'rgba(26,36,104,.1)'}`,
        boxShadow: isWinner ? 'inset 0 -4px 0 rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.18)' : 'none',
        position:'relative', overflow:'hidden',
      }}>
        {isWinner && <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'linear-gradient(to bottom,rgba(255,255,255,.16),transparent)', pointerEvents:'none' }}/>}
        <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color: isWinner ? 'rgba(255,255,255,.7)' : '#9CA3AF', lineHeight:1, marginBottom:5 }}>{label}</div>
        <div style={{ fontSize:38, fontWeight:900, lineHeight:1, fontVariantNumeric:'tabular-nums', color: isWinner ? '#fff' : '#374151', textShadow: isWinner ? '0 2px 0 rgba(0,0,0,.25)' : 'none' }}>{score}</div>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <SkyBg/>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* Hero */}
        <div style={{ background:OUTCOME.heroBg, padding:'52px 22px 0', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='52' height='46' viewBox='0 0 52 46' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M26 2L50 15v16L26 44 2 31V15z' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize:'52px 46px', pointerEvents:'none' }}/>
          <div style={{ fontSize:60, lineHeight:1, marginBottom:10, position:'relative', zIndex:1, filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }}>{OUTCOME.icon}</div>
          <div style={{ fontSize:30, fontWeight:900, color:OUTCOME.accentColor, letterSpacing:'-.04em', lineHeight:1, marginBottom:6, position:'relative', zIndex:1, textShadow:'0 2px 0 rgba(0,0,0,.3)' }}>{OUTCOME.label}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:6, position:'relative', zIndex:1 }}>{OUTCOME.sub}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:26, position:'relative', zIndex:1 }}>
            {questions[0]?.subject_name ?? 'Battle'} · {questions.length} questions
          </div>
          <svg viewBox="0 0 520 28" fill="none" preserveAspectRatio="none" style={{ display:'block', width:'100%', position:'relative', zIndex:6, marginBottom:-1 }}>
            <path d="M0 28 L0 14 Q65 0 130 10 Q195 20 260 8 Q325 0 390 12 Q455 22 520 10 L520 28 Z" fill="#D5E5F5"/>
          </svg>
        </div>

        {/* Score panels + VS */}
        <div style={{ background:'#D5E5F5', padding:'6px 16px 0' }}>
          <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
            <ScorePanel label="YOU" score={studentScore} isWinner={outcome==='win'} side="left"/>
            <div style={{ flexShrink:0, width:52, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', zIndex:2 }}>
              <svg style={{ position:'absolute', left:-5, top:'50%', transform:'translateY(-50%)' }} width="13" height="22" viewBox="0 0 13 22" fill="none">
                <path d="M8 1L1 11h5L2 21l11-13H8L8 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.4"/>
              </svg>
              <span style={{ fontSize:17, fontWeight:900, fontStyle:'italic', color:GOLD, textShadow:`0 0 10px rgba(255,184,0,.5),0 1px 0 ${GOLD2}` }}>VS</span>
              <svg style={{ position:'absolute', right:-5, top:'50%', transform:'translateY(-50%)' }} width="13" height="22" viewBox="0 0 13 22" fill="none">
                <path d="M5 1l7 10H7l3 10L0 8h5L5 1z" fill={GOLD} stroke={GOLD2} strokeWidth="0.4"/>
              </svg>
            </div>
            <ScorePanel label="COMPUTER" score={cpuScore} isWinner={outcome==='loss'} side="right"/>
          </div>
        </div>

        {/* Stats card */}
        <div style={{ background:'#D5E5F5', padding:'12px 16px 0' }}>
          <div style={{ background:'#fff', border:'2.5px solid rgba(26,36,104,.12)', borderRadius:20, padding:14, boxShadow:'0 6px 0 rgba(26,36,104,.1),0 10px 24px rgba(26,36,104,.1),inset 0 1px 0 rgba(255,255,255,.9)' }}>
            {/* XP badge */}
            <div style={{ background:`linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius:14, padding:'11px 14px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12, boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.3)` }}>
              <span style={{ fontSize:18 }}>⚡</span>
              <span style={{ fontSize:15, fontWeight:900, color:NAVY }}>+{xpAwarded} XP earned this battle</span>
            </div>
            {/* Stat chips */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { num:correctCount,                     label:'Correct',  color:'#15803D', bg:'#DCFCE7', border:'rgba(34,197,94,.2)'  },
                { num:questions.length - correctCount,  label:'Missed',   color:'#B91C1C', bg:'#FEE2E2', border:'rgba(239,68,68,.2)'  },
                { num:`${Math.round(correctCount/questions.length*100)}%`, label:'Accuracy', color:NAVY, bg:'#EEF2FF', border:'rgba(26,36,104,.12)' },
              ].map(({ num, label, color, bg, border }) => (
                <div key={label} style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:14, padding:'12px 8px', textAlign:'center', boxShadow:'inset 0 2px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{num}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.08em', marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div style={{ margin:'10px 16px 0', background:'rgba(245,158,11,.08)', border:'1.5px solid rgba(245,158,11,.3)', borderRadius:14, padding:'11px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:900, color:'#92400E', marginBottom:2 }}>Missed multiple on:</div>
              <div style={{ fontSize:11, color:'#78350F', lineHeight:1.5 }}>{weakTopics.join(' · ')}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding:'14px 16px max(100px,calc(80px + env(safe-area-inset-bottom)))', display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onReview}
            style={{ width:'100%', padding:'15px', borderRadius:18, border:'2.5px solid rgba(26,36,104,.2)', background:'#fff', color:NAVY2, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 rgba(26,36,104,.15),0 7px 18px rgba(26,36,104,.08)', display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}
            onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='0 1px 0 rgba(26,36,104,.15)'}}
            onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 5px 0 rgba(26,36,104,.15),0 7px 18px rgba(26,36,104,.08)'}}
            onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 5px 0 rgba(26,36,104,.15),0 7px 18px rgba(26,36,104,.08)'}}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke={NAVY2} strokeWidth="1.6"/><line x1="5" y1="6" x2="11" y2="6" stroke={NAVY2} strokeWidth="1.4" strokeLinecap="round"/><line x1="5" y1="9" x2="9" y2="9" stroke={NAVY2} strokeWidth="1.4" strokeLinecap="round"/></svg>
            📋 Review Answers
          </button>
          <button onClick={onRematch}
            style={{ width:'100%', padding:'15px', borderRadius:18, border:'none', background:`linear-gradient(135deg,${NAVY2},#2A3A8C)`, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:shBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}
            onPointerDown={pr} onPointerUp={rl} onPointerLeave={rl}>
            🔁 Rematch
          </button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { l:'⚔️ New Battle', fn:onNewBattle, bg:`linear-gradient(135deg,${GOLD},#FBBF24)`, color:NAVY,  sh:`0 5px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.3)` },
              { l:'🏠 Home',       fn:onHome,       bg:'#fff',                                    color:NAVY2, sh:'0 4px 0 rgba(26,36,104,.1)', border:'2px solid rgba(26,36,104,.14)' },
            ].map(({ l, fn, bg, color, sh, border }) => (
              <button key={l} onClick={fn}
                style={{ padding:'13px', borderRadius:16, background:bg, border:border||'none', color, fontSize:13, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:sh, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                onPointerDown={e=>{e.currentTarget.style.transform='translateY(2px)'}}
                onPointerUp={e=>{e.currentTarget.style.transform=''}}
                onPointerLeave={e=>{e.currentTarget.style.transform=''}}>
                {l}
              </button>
            ))}
          </div>
        </div>

      </div>{/* /maxWidth:520 */}
      </div>
    </div>
  )
}


// ── BattleReview ──────────────────────────────────────────────────────────────
function BattleReview({ questions, answersLog, cpuChoices, config, onDone }) {
  const [idx, setIdx] = useState(0)
  const canvasRef = useRef(null)

  // Previous / Next always land at the top of the new question, even if the
  // student had scrolled down to read an explanation.
  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [idx])

  const q          = questions[idx]
  const opts       = q ? normaliseOptions(q.options) : []
  const log        = answersLog[idx] ?? {}
  const selIdx     = log.selectedIdx ?? null
  const isCorrect  = log.isCorrect ?? false
  const skipped    = selIdx === null && !isCorrect
  const correctIdx = opts.findIndex((_, i) => checkCorrect(opts, i, q?.correct_answer))
  const cpuAns     = cpuChoices[idx]
  const cpuIdx     = cpuAns != null ? opts.indexOf(cpuAns) : -1
  const total      = questions.length
  const hasExpl    = hasDisplayableExplanation(q?.explanation)
  const selectedKey = selIdx != null ? LETTERS[selIdx] ?? null : null

  const sh    = `0 5px 0 #031548,0 7px 16px rgba(26,36,104,.3)`
  const shPrs = `0 1px 0 #031548`

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <SkyBg/>

      {/* ── Top bar — matches game header style ── */}
      <div style={{ background:`linear-gradient(180deg,#0B1138 0%,${NAVY2} 100%)`, flexShrink:0, zIndex:100, boxShadow:'0 4px 0 rgba(3,10,50,.6),0 6px 20px rgba(0,0,0,.4)', paddingTop:'env(safe-area-inset-top,0px)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px 10px' }}>
          {/* Back to results */}
          <button onClick={onDone} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(8,14,60,.6)', border:'1.5px solid rgba(255,255,255,.18)', borderRadius:12, padding:'8px 14px', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Results
          </button>
          {/* Centre label */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.1em', lineHeight:1, marginBottom:3 }}>Reviewing</div>
            <div style={{ fontSize:14, fontWeight:900, color:'#fff' }}>Q {idx+1} of {total}</div>
          </div>
          {/* Score chip */}
          <div style={{ background:'rgba(255,184,0,.15)', border:'1.5px solid rgba(255,184,0,.35)', borderRadius:12, padding:'7px 12px', fontSize:12, fontWeight:900, color:GOLD }}>
            {answersLog.filter(a => a.isCorrect).length}/{total} ✓
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, margin:'0 14px 0', background:'rgba(255,255,255,.1)', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${((idx+1)/total)*100}%`, background:`linear-gradient(90deg,${GOLD},#FF6A00)`, borderRadius:999, transition:'width .4s ease' }}/>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div ref={canvasRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>
        <style>{`
          .rtiles{display:grid;grid-template-columns:1fr;gap:22px;padding-top:6px}
          .rtile{min-height:68px;padding:14px 14px 16px 0}
          @media(min-width:640px){
            .rtiles{grid-template-columns:1fr 1fr;gap:22px 16px}
            .rtile{min-height:84px}
          }
        `}</style>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 18px 0', display:'flex', flexDirection:'column', gap:22 }}>

          {/* ── Question card — game style, no icon ── */}
          <div style={{ position:'relative', marginTop:14 }}>
            {/* Subject pill */}
            <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, border:'3px solid rgba(255,255,255,.5)', borderRadius:999, padding:'5px 20px', display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:900, color:NAVY, whiteSpace:'nowrap', zIndex:5, boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.35)` }}>
              <span>{subjectEmoji(config?.subject_name)}</span>
              <span>{config?.subject_name || q?.subject_name || 'Question'}</span>
            </div>
            <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:22, boxShadow:'0 8px 0 rgba(26,36,104,.22),0 12px 28px rgba(26,36,104,.14),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible' }}>
              {[{left:'-9px'},{right:'-9px'}].map((s,i)=>(
                <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:16, height:16, borderRadius:'50%', background:'#3B5BDB', border:'2.5px solid #D5E5F5', boxShadow:'0 2px 5px rgba(0,0,0,.22)', zIndex:2, ...s }}/>
              ))}
              <div style={{ padding:'34px 24px 26px' }}>
                <div style={{ fontSize:17, fontWeight:900, color:'#1A1F5E', lineHeight:1.65, wordBreak:'break-word' }}>
                  <MathText text={q?.text ?? q?.question_text ?? ''} as="span" className=""/>
                </div>
              </div>
            </div>
          </div>

          {/* ── Answer tiles — 1 col mobile, 2-col desktop, matching active battle style ── */}
          <div className="rtiles">
            {opts.map((opt, i) => {
              const isC    = i === correctIdx
              const isW    = i === selIdx && !isCorrect
              const dim    = !isC && !isW
              const tileBg = isC ? '#16A34A' : isW ? '#DC2626' : TILE[i]?.bg ?? '#3B82F6'
              const tileSh = isC ? '0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)' : isW ? '0 5px 0 #991B1B,0 7px 18px rgba(220,38,38,.4)' : `0 5px 0 ${TILE[i]?.press ?? '#1D4ED8'}`
              const letter = isC ? '✓' : isW ? '✗' : LETTERS[i]
              const ltrBg  = isC || isW ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.22)'
              const showYou = i === selIdx
              const showCpu = i === cpuIdx
              return (
                <div key={i} style={{ position:'relative', borderRadius:18, opacity: dim ? .4 : 1 }}>
                  <div className="rtile" style={{ display:'flex', alignItems:'center', borderRadius:18, background:tileBg, boxShadow:tileSh, position:'relative', overflow:'hidden', border:`2px solid ${isC ? 'rgba(255,255,255,.4)' : 'transparent'}` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'42%', background:'linear-gradient(to bottom,rgba(255,255,255,.25),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:5, background:'rgba(0,0,0,.16)', borderRadius:'0 0 16px 16px', pointerEvents:'none' }}/>
                    <div style={{ width:44, height:44, borderRadius:'50%', background:ltrBg, border:'2px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', flexShrink:0, margin:'0 14px', boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)', position:'relative', zIndex:1 }}>{letter}</div>
                    <div style={{ flex:1, fontSize:15, fontWeight:800, color:'#fff', lineHeight:1.5, minWidth:0, wordBreak:'break-word', position:'relative', zIndex:1, paddingRight:(showYou || showCpu) ? 30 : 0 }}>
                      <MathText text={String(opt ?? '')} as="span" className=""/>
                    </div>
                    {DECOS[i] && <div style={{ flexShrink:0, position:'relative', zIndex:1, marginRight:4 }}>{DECOS[i]}</div>}
                  </div>
                  {/* Player / CPU choice badges */}
                  {(showYou || showCpu) && (
                    <div style={{ position:'absolute', top:-13, right:8, display:'flex', gap:4, zIndex:10 }}>
                      {showYou && !showCpu && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>👤</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#3B5BDB', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>You</span>
                        </div>
                      )}
                      {showCpu && !showYou && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'#6D28D9', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤖</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#6D28D9', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>CPU</span>
                        </div>
                      )}
                      {showCpu && showYou && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:NAVY2, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤝</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:NAVY2, borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>Both</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Result banner — game-styled ── */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderRadius:18, background: isCorrect ? 'linear-gradient(135deg,#DCFCE7,#F0FDF4)' : skipped ? 'linear-gradient(135deg,#F3F4F6,#F9FAFB)' : 'linear-gradient(135deg,#FEE2E2,#FFF5F5)', border:`2.5px solid ${isCorrect ? 'rgba(34,197,94,.35)' : skipped ? 'rgba(107,114,128,.25)' : 'rgba(239,68,68,.3)'}`, boxShadow:'0 4px 0 rgba(26,36,104,.08),0 5px 14px rgba(26,36,104,.06)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background: isCorrect ? '#16A34A' : skipped ? '#6B7280' : '#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', flexShrink:0, boxShadow:`0 4px 10px ${isCorrect ? 'rgba(22,163,74,.4)' : skipped ? 'rgba(107,114,128,.3)' : 'rgba(220,38,38,.35)'}` }}>
              {isCorrect ? '✓' : skipped ? '⏱' : '✗'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:900, color: isCorrect ? '#15803D' : skipped ? '#4B5563' : '#B91C1C' }}>
                {isCorrect ? 'Correct — +10 pts' : skipped ? "Time's up — 0 pts" : 'Wrong — 0 pts'}
              </div>
              {!isCorrect && !skipped && q?.correct_answer && (
                <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>
                  Correct: <strong style={{ color:'#15803D' }}>{opts[correctIdx] ?? q.correct_answer}</strong>
                </div>
              )}
            </div>
            {isCorrect && <div style={{ fontSize:12, fontWeight:900, color:'#92400E', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, borderRadius:999, padding:'5px 12px', flexShrink:0, boxShadow:`0 3px 0 ${GOLD2}` }}>+10 XP ⚡</div>}
          </div>

          {/* Explanation */}
          {hasExpl && q && (
            <ExplanationBlock
              explanation={q.explanation}
              isCorrect={isCorrect}
              dark={false}
              mobileModal={false}
              selectedKey={selectedKey}
              question={q}
            />
          )}

          {/* Dot progress */}
          <div style={{ display:'flex', gap:5, justifyContent:'center', padding:'4px 0' }}>
            {questions.map((_, i) => (
              <div key={i} style={{ height:7, borderRadius:4, transition:'all .25s', background: i < idx ? GOLD : i === idx ? NAVY2 : 'rgba(26,36,104,.15)', width: i === idx ? 20 : i < idx ? 14 : 8 }}/>
            ))}
          </div>

          <div style={{ height:24, flexShrink:0 }}/>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div style={{ flexShrink:0, zIndex:100, background:`linear-gradient(to top,#C8DDEF 65%,transparent)`, padding:'10px 14px', paddingBottom:'max(14px,env(safe-area-inset-bottom))' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, maxWidth:680, margin:'0 auto' }}>
          <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx===0}
            style={{ padding:'13px', borderRadius:999, border:'2.5px solid rgba(26,36,104,.2)', background:'#fff', color:NAVY2, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor: idx===0 ? 'not-allowed' : 'pointer', opacity: idx===0 ? .4 : 1, boxShadow: idx===0 ? 'none' : '0 4px 0 rgba(26,36,104,.15)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>
          {idx < total-1 ? (
            <button onClick={() => setIdx(i => i+1)}
              style={{ padding:'13px', borderRadius:999, border:'none', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:sh, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
              onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=shPrs}}
              onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=sh}}
              onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=sh}}>
              Next <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ) : (
            <button onClick={onDone}
              style={{ padding:'13px', borderRadius:999, border:'none', background:`linear-gradient(135deg,${GOLD},#FBBF24)`, color:NAVY, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
              onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=`0 1px 0 ${GOLD2}`}}
              onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`}}
              onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 5px 0 ${GOLD2},0 7px 16px rgba(245,158,11,.35)`}}>
              🏁 Back to Results
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes slidein{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

// ── Explanation helpers ───────────────────────────────────────────────────────
// ExplanationBlock (from session/ExplanationBlock.jsx) is the canonical renderer.
// Explanations are shown only in the post-match review, never mid-battle.
function hasDisplayableExplanation(explanation) {
  if (!explanation) return false
  if (typeof explanation === 'string') return explanation.trim().length > 0
  if (typeof explanation !== 'object') return false
  return !!(
    explanation.concept || explanation.correct || explanation.answer_note ||
    explanation.intro   || explanation.study_tip || explanation.hint ||
    (Array.isArray(explanation.steps) && explanation.steps.length) ||
    (Array.isArray(explanation.workings) && explanation.workings.length) ||
    (explanation.wrong_options && Object.keys(explanation.wrong_options).length) ||
    explanation.formula_box || explanation.svg_diagram
  )
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function BattleSessionPage() {

  const router = useRouter()
  const { totalPoints: currentXP, setTotalPoints, showXPToast } = usePoints()

  const [phase,        setPhase]       = useState('loading')
  const [questions,    setQuestions]   = useState([])
  const [config,       setConfig]      = useState(null)
  const [errMsg,       setErrMsg]      = useState('')
  const [qIndex,       setQIndex]      = useState(0)
  const [selectedIdx,  setSelectedIdx] = useState(null)
  const [popKey,       setPopKey]      = useState(0)     // forces animation to re-fire on same tile re-tap
  const [revealed,     setRevealed]    = useState(false)
  const [cpuAnswered,  setCpuAnswered] = useState(false)
  const [timerKey,     setTimerKey]    = useState(0)
  const [studentScore, setStudentScore]= useState(0)
  const [cpuScore,     setCpuScore]    = useState(0)
  const [floatSide,    setFloatSide]   = useState(null)
  const [floatKey,     setFloatKey]    = useState(0)
  const [saveData,     setSaveData]    = useState(null)
  const [studentDots,  setStudentDots] = useState(0)
  const [cpuDots,      setCpuDots]     = useState(0)
  const [paused,       setPaused]      = useState(false)

  const opponent   = useRef(null)
  const cpuChoices = useRef([])
  const answersLog = useRef([])
  const cpuTimer   = useRef(null)
  const sessionId  = useRef(crypto.randomUUID())
  const canvasRef  = useRef(null)

  // Each new question starts at the top of the screen.
  useEffect(() => {
    canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [qIndex])

  // ── Load questions — progressive (matches practice session pattern) ──────────
  // Phase 1: fetch FIRST_BATCH questions immediately → start countdown fast.
  // Phase 2: fetch remaining in background while student is in countdown + answering.
  // CPU choices and answersLog are extended as each batch arrives.
  const FIRST_BATCH = 3

  useEffect(() => {
    let ignore = false
    let cfg
    try { cfg = JSON.parse(sessionStorage.getItem('battle_config') || '{}') } catch { cfg = {} }
    if (!cfg.subject_id && !cfg.subject_name) { setErrMsg('No battle configuration found.'); setPhase('error'); return }
    setConfig(cfg)

    const stats = readLocalBattleStats()
    opponent.current = createComputerOpponent(stats.ai_difficulty || 'easy')

    const totalCount  = cfg.count || 10
    const baseParams  = { mode: 'battle', _t: String(Date.now()), exam: cfg.exam || 'WAEC' }
    if (cfg.subject_id)   baseParams.subject_id = cfg.subject_id
    else if (cfg.subject_name) baseParams.subjects = cfg.subject_name
    if (cfg.topic_id)    baseParams.topic_id = cfg.topic_id
    // On rematch: exclude previous question IDs so we get a fresh set
    if (cfg._exclude)    baseParams.exclude = cfg._exclude

    // ── Phase 1: first batch ─────────────────────────────────────────────────
    const p1 = new URLSearchParams({ ...baseParams, count: String(Math.min(FIRST_BATCH, totalCount)) })
    fetch(`/api/student/questions?${p1}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error ?? `Error ${r.status}`) }))
      .then(data => {
        if (ignore) return
        if (!data.questions?.length) { setErrMsg('No questions found for this subject.'); setPhase('error'); return }

        const firstBatch = data.questions
        setQuestions(firstBatch)
        // Initialise CPU choices and answers log for first batch
        cpuChoices.current = firstBatch.map(q => opponent.current.decide(q))
        answersLog.current = firstBatch.map(q => ({
          question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
          topic_name: q.topic_name || '', subject_name: q.subject_name || '',
          isCorrect: false, is_correct: false, selectedIdx: null,
        }))
        setPhase('countdown')

        // ── Phase 2: fetch remaining in background ──────────────────────────
        const remaining = totalCount - firstBatch.length
        if (remaining <= 0) return

        const seenIds = firstBatch.map(q => q.id).join(',')
        const p2 = new URLSearchParams({ ...baseParams, count: String(remaining), exclude: seenIds })
        // Re-timestamp so it's a fresh request
        p2.set('_t', String(Date.now() + 1))
        fetch(`/api/student/questions?${p2}`)
          .then(r => r.ok ? r.json() : null)
          .then(data2 => {
            if (ignore || !data2?.questions?.length) return
            const more = data2.questions
            // Extend state and refs atomically — ref arrays grow to match questions array
            setQuestions(prev => {
              const combined = [...prev, ...more]
              cpuChoices.current = [
                ...cpuChoices.current,
                ...more.map(q => opponent.current.decide(q)),
              ]
              answersLog.current = [
                ...answersLog.current,
                ...more.map(q => ({
                  question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
                  topic_name: q.topic_name || '', subject_name: q.subject_name || '',
                  isCorrect: false, is_correct: false, selectedIdx: null,
                })),
              ]
              return combined
            })
          })
          .catch(() => {}) // non-fatal — student already has first batch
      })
      .catch(err => { if (!ignore) { setErrMsg(err?.message || 'Failed to load questions.'); setPhase('error') } })

    return () => { ignore = true }
  }, [])

  // CPU thinking timer
  useEffect(() => {
    if (phase !== 'battle') return
    setCpuAnswered(false)
    clearTimeout(cpuTimer.current)
    const delay = opponent.current?.getThinkingDelay() ?? 5000
    cpuTimer.current = setTimeout(() => setCpuAnswered(true), delay)
    return () => clearTimeout(cpuTimer.current)
  }, [phase, qIndex])

  function animateFloat(side) {
    setFloatSide(side); setFloatKey(k => k + 1)
    setTimeout(() => setFloatSide(null), 900)
  }

  function handleSelect(idx) { if (revealed) return; setSelectedIdx(idx); setPopKey(k => k + 1) }

  function handleNext() {
    if (!revealed) {
      const q    = questions[qIndex]
      const opts = normaliseOptions(q.options)
      const sCorr = selectedIdx !== null && checkCorrect(opts, selectedIdx, q.correct_answer)
      const cpuAns = cpuChoices.current[qIndex]
      const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
      if (sCorr) { setStudentScore(s => s+10); setStudentDots(d => d+1); animateFloat('student') }
      if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); if (!sCorr) animateFloat('cpu') }
      answersLog.current[qIndex] = { ...answersLog.current[qIndex], isCorrect:sCorr, is_correct:sCorr, selectedIdx }
      setCpuAnswered(true); setRevealed(true)
    } else {
      if (qIndex < questions.length - 1) {
        setQIndex(i => i+1); setSelectedIdx(null); setRevealed(false); setTimerKey(k => k+1); setPopKey(0)
      } else { finishMatch() }
    }
  }

  const handleTimerUp = useCallback(() => {
    if (revealed) return
    const q = questions[qIndex], opts = normaliseOptions(q.options)
    const cpuAns = cpuChoices.current[qIndex]
    const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
    if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); animateFloat('cpu') }
    answersLog.current[qIndex] = { ...answersLog.current[qIndex], isCorrect:false, is_correct:false, selectedIdx:null }
    setCpuAnswered(true); setRevealed(true)
  }, [revealed, qIndex, questions])

  function finishMatch() {
    setPhase('saving')
    const correct = answersLog.current.filter(a => a.is_correct).length
    const finalS  = correct * 10
    // Guard: cpuChoices may have been pre-filled for questions that never arrived
    const finalC  = cpuChoices.current.reduce((acc, ans, i) => {
      const q = questions[i]
      if (!q || !ans) return acc   // ← crash fix: skip if question didn't arrive
      const opts = normaliseOptions(q.options)
      const cor = opts.indexOf(ans) >= 0 ? checkCorrect(opts, opts.indexOf(ans), q.correct_answer) : ans === q.correct_answer
      return acc + (cor ? 10 : 0)
    }, 0)
    const outcome = finalS > finalC ? 'win' : finalS < finalC ? 'loss' : 'draw'
    const xp      = computeSessionXP('battle', answersLog.current, { outcome })
    saveSessionLocally({ session_id:sessionId.current, exam:config?.examType||'WAEC', mode:'battle', session_type:'battle', opponent:'computer', opponent_score:finalC, battle_outcome:outcome, subject_name:config?.subject_name??'Mixed', results:answersLog.current, questions_count:questions.length, correct_count:correct }, xp)
    setTotalPoints((currentXP||0) + xp)
    showXPToast(xp, 'Battle done!')
    const local = readLocalBattleStats()
    const newWins = (local.battles_won||0) + (outcome==='win'?1:0)
    saveLocalBattleStats({ battles_played:(local.battles_played||0)+1, battles_won:newWins, battles_drawn:(local.battles_drawn||0)+(outcome==='draw'?1:0), battles_lost:(local.battles_lost||0)+(outcome==='loss'?1:0), total_battle_xp:(local.total_battle_xp||0)+xp, last_battle_at:new Date().toISOString(), ai_difficulty:newWins>=8?'hard':newWins>=3?'medium':'easy' })
    flushSyncQueue().catch(()=>{})
    fetch('/api/student/battle/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outcome,xp_awarded:xp})}).catch(()=>{})
    setSaveData({ finalS, finalC, xp, outcome })
    setPhase('results')
  }

  // ── Phase renders ─────────────────────────────────────────────────────────
  if (phase==='loading'||phase==='saving') return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      {/* Battle background image */}
      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <img src="/images/battle/session-bg.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center bottom' }}/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(8,18,80,.55) 0%, rgba(8,18,80,.38) 50%, rgba(8,18,80,.65) 100%)' }}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:.7}50%{opacity:1}}`}</style>

      <div style={{ position:'relative', zIndex:5, width:'100%', maxWidth:420, padding:'0 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:20, animation:'fadeUp .4s ease both' }}>

        {/* ── YOU VS COMPUTER CARD ── */}
        <div style={{
          width:'100%',
          background:'rgba(12,20,90,.82)',
          backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
          border:'1px solid rgba(255,255,255,.14)',
          borderRadius:24,
          overflow:'hidden',
          boxShadow:'0 8px 0 rgba(0,0,0,.3), 0 16px 40px rgba(0,0,0,.3)',
        }}>
          {/* Header */}
          <div style={{ background:`linear-gradient(135deg,${NAVY},#1264E5)`, padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.5)', textAlign:'center', marginBottom:14 }}>
              ⚔️ &nbsp; Battle Loading &nbsp; ⚔️
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 56px 1fr', alignItems:'center', gap:8 }}>
              {/* Player */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.4)', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, boxShadow:'0 3px 12px rgba(0,0,0,.25)' }}>🎓</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>You</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:600 }}>Challenger</div>
                </div>
              </div>
              {/* VS badge */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:GOLD, color:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, fontStyle:'italic', boxShadow:`0 4px 0 ${GOLD2}, 0 0 0 3px rgba(255,184,0,.25)` }}>VS</div>
              </div>
              {/* Computer */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.4)', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, boxShadow:'0 3px 12px rgba(0,0,0,.25)' }}>🤖</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>Computer</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', fontWeight:600 }}>Difficulty: Easy</div>
                </div>
              </div>
            </div>
          </div>

          {/* Config summary */}
          {config && (
            <div style={{ padding:'14px 20px', display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
              {[
                { icon:'📚', val: config.subject_name || 'Mixed' },
                { icon:'📋', val: `${config.count || 10} Questions` },
                { icon: config.timerEnabled ? '⏱' : '∞', val: config.timerEnabled ? `${config.timerSecs}s Timer` : 'No Timer' },
              ].map(({ icon, val }) => (
                <div key={val} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:14 }}>{icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.75)' }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Spinner + label ── */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(255,255,255,.18)', borderTopColor:GOLD, animation:'spin .7s linear infinite' }}/>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.75)', animation:'pulse 1.6s ease infinite', letterSpacing:'.02em' }}>
            {phase === 'saving' ? 'Saving results…' : 'Loading battle…'}
          </div>
        </div>

      </div>
    </div>
  )
  if (phase==='error') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
      <SkyBg/>
      <div style={{ fontSize:18, fontWeight:900, color:NAVY2, textAlign:'center', position:'relative', zIndex:5 }}>{errMsg}</div>
      <button onClick={() => router.push('/student/battle')} style={{ padding:'12px 24px', borderRadius:12, background:NAVY2, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontFamily:'inherit', position:'relative', zIndex:5, boxShadow:'0 4px 0 #031548' }}>Back to Battle</button>
    </div>
  )
  if (phase==='countdown') return <Countdown onDone={() => setPhase('battle')}/>
  if (phase==='results') return (
    <BattleResults
      questions={questions} answersLog={answersLog.current}
      studentScore={saveData.finalS} cpuScore={saveData.finalC} xpAwarded={saveData.xp}
      onRematch={() => {
        try {
          const cfg = { ...config }
          // Always bust cache so the API fetches a fresh set
          cfg._rematch_t = Date.now()
          // For non-topic-drill modes, also exclude the current question IDs
          // so the student never gets the exact same questions again
          if (!cfg.topic_id) {
            cfg._exclude = questions.map(q => q.id).join(',')
          }
          sessionStorage.setItem('battle_config', JSON.stringify(cfg))
        } catch {}
        window.location.reload()
      }}
      onNewBattle={() => router.push('/student/battle/setup')}
      onHome={() => router.push('/student/home')}
      onReview={() => setPhase('review')}
    />
  )
  if (phase==='review') return (
    <BattleReview questions={questions} answersLog={answersLog.current} cpuChoices={cpuChoices.current} config={config} onDone={() => setPhase('results')}/>
  )

  // ── Active battle ─────────────────────────────────────────────────────────
  const q      = questions[qIndex]
  const opts   = q ? normaliseOptions(q.options) : []
  const cpuAns = cpuChoices.current[qIndex]
  const cpuIdx = cpuAns ? opts.indexOf(cpuAns) : -1
  const isLast = qIndex >= questions.length - 1

  const submitSh    = `0 5px 0 #031548,0 7px 18px rgba(26,36,104,.35)`
  const submitShPrs = `0 1px 0 #031548`

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-32px);opacity:0}}
        @keyframes slidein{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes tdot{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-4px);opacity:1}}
        @keyframes tilepop{0%{transform:scale(1)}25%{transform:scale(0.91)}65%{transform:scale(1.05)}100%{transform:scale(1)}}
        .tile-pop{animation:tilepop .2s cubic-bezier(.36,.07,.19,.97)}
        @keyframes modalin{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <SkyBg/>
        {paused && <PauseMenu onResume={() => setPaused(false)} onQuit={() => { clearTimeout(cpuTimer.current); router.push('/student/battle') }}/>}

        <VSHeader
          qIndex={qIndex} total={questions.length}
          studentScore={studentScore} cpuScore={cpuScore}
          studentDots={studentDots} cpuDots={cpuDots}
          onMenu={() => setPaused(true)}
          floatSide={floatSide} floatKey={floatKey}
          cpuAnswered={cpuAnswered}
        />

        {/* Canvas */}
        <div ref={canvasRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', position:'relative', zIndex:5, padding:'20px 20px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:'100%', maxWidth:860, display:'flex', flexDirection:'column', gap:14, animation:'slidein .3s ease' }}>

            {/* Question card */}
            {q && (
              <div style={{ position:'relative', marginTop:14 }}>
                {/* Subject pill */}
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#F59E0B,#FBBF24)', border:'3px solid #D5E5F5', borderRadius:999, padding:'5px 18px', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:900, color:NAVY, whiteSpace:'nowrap', boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.35)`, zIndex:5 }}>
                  <span>{subjectEmoji(config?.subject_name)}</span>
                  <span>{config?.subject_name || q.subject_name || 'Question'}</span>
                  {config?.timerEnabled && !revealed && (
                    <TimerRing key={timerKey} secs={config.timerSecs||30} onTimeUp={handleTimerUp} revealed={revealed}/>
                  )}
                </div>
                {/* Card — question only, no icon */}
                <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:24, boxShadow:'0 10px 0 rgba(26,36,104,.2),0 14px 32px rgba(26,36,104,.14),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible' }}>
                  {[{left:'-10px'},{right:'-10px'}].map((s,i)=>(
                    <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #D5E5F5', boxShadow:'0 2px 6px rgba(0,0,0,.25)', ...s }}/>
                  ))}
                  <div style={{ padding:'clamp(32px,5vw,52px) clamp(22px,4vw,38px) clamp(24px,4vw,40px)' }}>
                    <div style={{ fontSize:'clamp(17px,2.4vw,26px)', fontWeight:900, color:'#1A1F5E', lineHeight:1.65, wordBreak:'break-word' }}>
                      <MathText text={q.text ?? q.question_text ?? ''} as="span" className=""/>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Answer tiles — 1 col mobile, 2×2 desktop */}
            <style>{`
              .btiles{display:grid;grid-template-columns:1fr;gap:11px;align-items:stretch}
              .btile-h{min-height:clamp(56px,8vw,72px)}
              @media(min-width:600px){
                .btiles{grid-template-columns:1fr 1fr;gap:clamp(10px,1.5vw,16px)}
                .btile-h{min-height:clamp(80px,12vw,110px)}
              }
            `}</style>
            <div className="btiles">
              {opts.map((opt, idx) => {
                const tile   = TILE[idx] ?? TILE[0]
                const isCor  = checkCorrect(opts, idx, q?.correct_answer)
                const isSel  = selectedIdx === idx
                const isCPU  = cpuIdx === idx

                // ── Visual state resolution ───────────────────────────────
                let bg      = tile.bg
                let shadow  = `0 6px 0 ${tile.press},0 8px 20px ${tile.glow}`
                let ltrBg   = 'rgba(255,255,255,.22)'
                let opacity = 1
                let border  = '2px solid transparent'
                let tileScale = 'none'

                if (revealed) {
                  if (isCor)              { bg='#16A34A'; shadow='0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)'; ltrBg='rgba(255,255,255,.35)'; border='2px solid rgba(255,255,255,.45)' }
                  else if (isSel&&!isCor) { bg='#DC2626'; shadow='0 5px 0 #991B1B,0 7px 18px rgba(220,38,38,.4)'; ltrBg='rgba(255,255,255,.3)'; border='2px solid rgba(255,255,255,.3)' }
                  else                    { opacity=.25; shadow='none' }
                } else if (isSel) {
                  // Selected but not yet submitted — clear bright ring + lighter tint
                  bg = tile.bg
                  border = '2px solid rgba(255,255,255,.9)'
                  shadow = `0 0 0 3px rgba(255,255,255,.35), 0 6px 0 ${tile.press}, 0 8px 22px ${tile.glow}`
                  ltrBg  = 'rgba(255,255,255,.45)'
                }

                const letter = revealed && isCor ? '✓' : revealed && isSel && !isCor ? '✗' : LETTERS[idx]

                return (
                  <button
                    key={`tile-${idx}-${isSel ? popKey : 0}`}
                    onClick={() => handleSelect(idx)}
                    disabled={revealed}
                    className={isSel && !revealed ? 'tile-pop' : ''}
                    style={{ background:'none', border:'none', padding:0, cursor:revealed?'default':'pointer', borderRadius:18, opacity, WebkitTapHighlightColor:'transparent', position:'relative', display:'flex', flexDirection:'column' }}
                  >
                    <div className="btile-h" style={{ flex:1, display:'flex', alignItems:'center', padding:'0 clamp(12px,2vw,18px) 0 0', borderRadius:18, background:bg, boxShadow:shadow, border, position:'relative', overflow:'hidden', transition:'box-shadow .1s, opacity .1s' }}>
                      {/* Sheen */}
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'42%', background:'linear-gradient(to bottom,rgba(255,255,255,.28),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                      {/* Press shadow strip */}
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:6, background:'rgba(0,0,0,.18)', borderRadius:'0 0 16px 16px', pointerEvents:'none' }}/>
                      {/* Letter badge */}
                      <div style={{ width:'clamp(44px,6vw,58px)', height:'clamp(44px,6vw,58px)', borderRadius:'50%', background:ltrBg, border: isSel && !revealed ? '2px solid rgba(255,255,255,.9)' : '2px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(18px,2.8vw,26px)', fontWeight:900, color:'#fff', flexShrink:0, margin:'0 clamp(12px,2vw,18px)', boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)', position:'relative', zIndex:1, transition:'background .1s, border .1s' }}>{letter}</div>
                      <div style={{ flex:1, fontSize:'clamp(13px,1.8vw,18px)', fontWeight:800, color:'#fff', textAlign:'left', lineHeight:1.45, minWidth:0, wordBreak:'break-word', position:'relative', zIndex:1 }}>
                        <MathText text={String(opt??'')} as="span" className=""/>
                      </div>
                      <div style={{ flexShrink:0, position:'relative', zIndex:1 }}>{DECOS[idx]}</div>
                    </div>

                    {/* Pre-reveal "your pick" indicator */}
                    {isSel && !revealed && (
                      <div style={{ position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)', background:'#fff', color:tile.bg, fontSize:9, fontWeight:900, borderRadius:999, padding:'2px 9px', letterSpacing:'.04em', boxShadow:'0 2px 6px rgba(0,0,0,.2)', whiteSpace:'nowrap', zIndex:10 }}>
                        YOUR PICK ✓
                      </div>
                    )}

                    {/* Post-reveal player/CPU badges — large & visible */}
                    {revealed && (isSel || isCPU) && (
                      <div style={{ position:'absolute', top:-16, right:6, display:'flex', gap:4, zIndex:5 }}>
                        {isSel && !isCPU && (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>👤</div>
                            <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#3B5BDB', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>You</span>
                          </div>
                        )}
                        {isCPU && !isSel && (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:'#6D28D9', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤖</div>
                            <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#6D28D9', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>CPU</span>
                          </div>
                        )}
                        {isCPU && isSel && (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:NAVY2, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤝</div>
                            <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:NAVY2, borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>Both</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ height:24, flexShrink:0 }}/>
          </div>
        </div>

        {/* Action dock — always on screen, so Next never needs a scroll */}
        {(() => {
          const cor = revealed && selectedIdx !== null && checkCorrect(opts, selectedIdx, q?.correct_answer)
          const skp = revealed && selectedIdx === null
          const label = !revealed ? (selectedIdx === null ? 'Skip' : 'Submit') : isLast ? 'Finish' : 'Next'
          return (
            <div style={{ flexShrink:0, position:'relative', zIndex:20, padding:'10px 16px', paddingBottom:'max(12px,env(safe-area-inset-bottom))', background:'linear-gradient(to top,rgba(200,221,239,.98) 70%,rgba(200,221,239,0))' }}>
              <div style={{ maxWidth:860, margin:'0 auto', display:'flex', alignItems:'center', gap:10, background:'#fff', border:'2px solid rgba(26,36,104,.12)', borderRadius:20, padding:'8px 8px 8px 12px', boxShadow:'0 6px 0 rgba(26,36,104,.1),0 10px 24px rgba(26,36,104,.12)' }}>
                {revealed ? (
                  <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:10, animation:'slidein .2s ease' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:cor?'#16A34A':skp?'#6B7280':'#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, color:'#fff' }}>
                      {cor?'✓':skp?'⏱':'✗'}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:900, color:cor?'#15803D':skp?'#4B5563':'#B91C1C', lineHeight:1.2 }}>
                        {cor ? 'Correct! +10' : skp ? "Time's up" : 'Wrong'}
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {cor ? 'Keep it going' : 'See why in review'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex:1, minWidth:0, fontSize:13, fontWeight:800, color: selectedIdx === null ? '#6B7280' : NAVY2 }}>
                    {selectedIdx === null ? 'Pick an answer' : `Your pick: ${LETTERS[selectedIdx] ?? ''}`}
                    <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', marginTop:1 }}>Question {qIndex + 1} of {questions.length}</div>
                  </div>
                )}
                <button onClick={handleNext}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'13px clamp(22px,4vw,34px)', borderRadius:999, border:'none', background: revealed && isLast ? `linear-gradient(135deg,${GOLD},#FBBF24)` : NAVY2, color: revealed && isLast ? NAVY : '#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:submitSh, letterSpacing:'-.01em', flexShrink:0 }}
                  onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=submitShPrs}}
                  onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=submitSh}}
                  onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=submitSh}}>
                  {label}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 7h6M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}