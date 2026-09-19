'use client'
// src/app/student/battle/session/page.js
// Exact reference game UI: sky bg · VS header · 2×2 coloured tiles · sand wave
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import { createComputerOpponent, readLocalBattleStats, saveLocalBattleStats } from '@/lib/battleAI'
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
function VSHeader({ qIndex, total, studentScore, cpuScore, studentDots, cpuDots, onMenu, floatSide, floatKey, cpuAnswered }) {
  // Avatar size — same for both sides so the overlap is consistent
  const AV = 54
  return (
    <div style={{ background:`linear-gradient(180deg,${NAVY} 0%,${NAVY2} 100%)`, flexShrink:0, zIndex:100, boxShadow:`0 4px 0 rgba(3,21,72,.5),0 6px 20px rgba(26,36,104,.25)`, paddingTop:'env(safe-area-inset-top,0px)' }}>
      <style>{`
        /* Top utility bar — always visible, provides breathing room on mobile */
        .vs-topbar { display:flex; align-items:center; justify-content:space-between; padding:10px 16px 0; }
        /* Progress bar */
        .vs-progress { height:3px; margin:6px 16px 0; background:rgba(255,255,255,.12); border-radius:999px; overflow:hidden; }
        /* VS strip — full width on mobile, capped on desktop */
        .vs-strip { display:grid; grid-template-columns:1fr ${AV}px 1fr; padding:10px 14px 14px; align-items:center; position:relative; max-width:860px; margin:0 auto; }
      `}</style>

      {/* ── Top utility bar: Menu (left) · Q counter (right) ── */}
      <div className="vs-topbar" style={{ maxWidth:860, margin:'0 auto' }}>
        <button onClick={onMenu}
          style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:10, padding:'7px 12px', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h10M2 10h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
          Menu
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:10, padding:'7px 12px', fontSize:11, fontWeight:900, color:'#fff' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 4l3.5.5-2.5 2.5.6 3.5L6 9l-3.1 1.5.6-3.5L1 4.5 4.5 4z" fill="white" opacity=".8"/></svg>
          Question {qIndex + 1} of {total}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="vs-progress">
        <div style={{ height:'100%', width:`${((qIndex + 1) / total) * 100}%`, background:`linear-gradient(90deg,${GOLD},#FF6A00)`, borderRadius:999, transition:'width .4s ease' }}/>
      </div>

      {/* ── VS strip ── */}
      <div className="vs-strip">

        {/* ── Player side ── */}
        <div style={{ display:'flex', alignItems:'center' }}>
          {/* Score panel — right side rounded, left side square so avatar covers it */}
          <div style={{ flex:1, background:'rgba(59,91,219,.9)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'14px 14px 14px 14px', padding:`7px 12px 7px ${AV * 0.55}px`, minWidth:0, boxShadow:'inset 0 -3px 0 rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.12)', position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.7)', lineHeight:1 }}>YOU</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>{studentScore}</div>
            <div style={{ display:'flex', gap:2, marginTop:4 }}>
              {Array.from({length:5}).map((_,i)=><div key={i} style={{ flex:1, height:4, borderRadius:3, background: i < studentDots ? '#60A5FA' : 'rgba(255,255,255,.2)', transition:'background .3s' }}/>)}
            </div>
          </div>
          {/* Avatar — overlaps the score panel's left edge */}
          <div style={{ width:AV, height:AV, borderRadius:'50%', border:'3px solid #fff', background:'linear-gradient(135deg,#F59E0B,#FBBF24)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0, zIndex:5, marginLeft:`-${AV * 0.42}px`, boxShadow:'0 3px 10px rgba(0,0,0,.3)' }}>🧑🏾</div>
        </div>

        {/* ── VS badge ── */}
        <div style={{ width:AV, height:AV, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, alignSelf:'center', flexShrink:0, boxShadow:`0 3px 0 ${GOLD2},0 0 0 3px rgba(255,184,0,.2),0 5px 12px rgba(0,0,0,.35)` }}>
          <span style={{ fontSize:15, fontWeight:900, color:NAVY, fontStyle:'italic', letterSpacing:'-.02em' }}>VS</span>
        </div>

        {/* ── Computer side ── */}
        <div style={{ display:'flex', alignItems:'center', flexDirection:'row-reverse' }}>
          {/* Score panel — left side rounded, right side square so avatar covers it */}
          <div style={{ flex:1, background:'rgba(109,40,217,.9)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'14px 14px 14px 14px', padding:`7px ${AV * 0.55}px 7px 12px`, textAlign:'right', minWidth:0, boxShadow:'inset 0 -3px 0 rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.12)', position:'relative', overflow:'hidden' }}>
            <div style={{ fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.7)', lineHeight:1 }}>COMPUTER</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1.1, fontVariantNumeric:'tabular-nums' }}>{cpuScore}</div>
            <div style={{ display:'flex', gap:2, marginTop:4, flexDirection:'row-reverse' }}>
              {Array.from({length:5}).map((_,i)=><div key={i} style={{ flex:1, height:4, borderRadius:3, background: i < cpuDots ? '#C084FC' : 'rgba(255,255,255,.2)', transition:'background .3s' }}/>)}
            </div>
          </div>
          {/* Avatar + CPU status stacked — overlaps the score panel's right edge */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, marginRight:`-${AV * 0.42}px`, zIndex:5, gap:3 }}>
            <div style={{ width:AV, height:AV, borderRadius:'50%', border:'3px solid #fff', background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 3px 10px rgba(0,0,0,.3)' }}>🤖</div>
            {/* CPU status pill */}
            <div style={{ background: cpuAnswered ? '#16A34A' : '#7C3AED', borderRadius:999, padding:'2px 7px', display:'flex', alignItems:'center', gap:3, boxShadow:'0 2px 6px rgba(0,0,0,.3)', whiteSpace:'nowrap', minWidth:52 }}>
              {cpuAnswered
                ? <span style={{ fontSize:8, fontWeight:900, color:'#fff', letterSpacing:'.02em' }}>✓ Answered</span>
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
          <div key={floatKey} style={{ position:'absolute', top:0, [floatSide==='student'?'left':'right']:60, fontSize:16, fontWeight:900, color: floatSide==='student' ? '#4ADE80' : '#F87171', animation:'floatup .8s ease-out forwards', pointerEvents:'none', zIndex:20 }}>+10</div>
        )}
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
    win:  { icon:'🏆', label:'You Won!',       color:GOLD,      heroBg:`linear-gradient(150deg,${NAVY} 0%,${NAVY2} 60%,#1a1060 100%)` },
    draw: { icon:'🤝', label:"It's a Draw!",   color:'#60A5FA', heroBg:'linear-gradient(150deg,#0369A1 0%,#0E4C7A 60%,#0c3060 100%)' },
    loss: { icon:'🤖', label:'Computer Won',   color:'#C4B5FD', heroBg:'linear-gradient(150deg,#4C1D95 0%,#6D28D9 60%,#1a1060 100%)' },
  }[outcome]

  const sh    = `0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)`
  const shPrs = `0 1px 0 #031548`
  const pr = e => { e.currentTarget.style.transform='translateY(3px)'; e.currentTarget.style.boxShadow=shPrs }
  const rl = e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=sh }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <SkyBg/>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>

        {/* Hero */}
        <div style={{ background:OUTCOME.heroBg, padding:'52px 18px 0', textAlign:'center', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 2 L58 17 L58 35 L30 50 L2 35 L2 17 Z' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='1.2'/%3E%3C/svg%3E\")", backgroundSize:'60px 52px', pointerEvents:'none' }}/>
          <div style={{ fontSize:52, marginBottom:6, position:'relative', zIndex:1 }}>{OUTCOME.icon}</div>
          <div style={{ fontSize:28, fontWeight:900, color:OUTCOME.color, letterSpacing:'-.04em', lineHeight:1, marginBottom:5, position:'relative', zIndex:1, textShadow:'0 2px 0 rgba(0,0,0,.3)' }}>{OUTCOME.label}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:22, position:'relative', zIndex:1 }}>
            {questions[0]?.subject_name ?? 'Battle'} · {questions.length} questions
          </div>
          <svg viewBox="0 0 375 24" fill="none" preserveAspectRatio="none" style={{ display:'block', width:'100%', marginTop:'-1px', position:'relative', zIndex:6 }}>
            <path d="M0 24 L0 12 Q60 0 120 9 Q180 18 240 7 Q300 0 375 11 L375 24 Z" fill="#D5E5F5"/>
          </svg>
        </div>

        {/* Scoreboard */}
        <div style={{ padding:'0 16px', marginTop:'-16px', position:'relative', zIndex:10 }}>
          <div style={{ background:'#fff', border:'2.5px solid rgba(26,36,104,.14)', borderRadius:22, padding:16, boxShadow:'0 8px 0 rgba(26,36,104,.12),0 12px 28px rgba(26,36,104,.12),inset 0 1px 0 rgba(255,255,255,.9)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center' }}>
              <div style={{ background: outcome==='win'?'rgba(255,215,0,.1)':'#F0F4FF', border:`1.5px solid ${outcome==='win'?'rgba(255,184,0,.35)':'rgba(26,36,104,.1)'}`, borderRadius:14, padding:'12px 10px', textAlign:'center', boxShadow:'inset 0 2px 5px rgba(26,36,104,.06)' }}>
                <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'#6B7280', marginBottom:5 }}>You</div>
                <div style={{ fontSize:38, fontWeight:900, color: outcome==='win'?'#B45309':'#1A1F5E', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{studentScore}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:900, color:'#9CA3AF', textAlign:'center' }}>VS</div>
              <div style={{ background: outcome==='loss'?'rgba(255,215,0,.1)':'#F0F4FF', border:`1.5px solid ${outcome==='loss'?'rgba(255,184,0,.35)':'rgba(26,36,104,.1)'}`, borderRadius:14, padding:'12px 10px', textAlign:'center', boxShadow:'inset 0 2px 5px rgba(26,36,104,.06)' }}>
                <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'#6B7280', marginBottom:5 }}>Computer</div>
                <div style={{ fontSize:38, fontWeight:900, color: outcome==='loss'?'#B45309':'#1A1F5E', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{cpuScore}</div>
              </div>
            </div>
            <div style={{ marginTop:10, background:'rgba(245,158,11,.1)', border:'1.5px solid rgba(245,158,11,.25)', borderRadius:12, padding:'9px 12px', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:13, fontWeight:900, color:'#92400E' }}>
              ⚡ +{xpAwarded} XP earned this battle
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:10 }}>
              {[
                { num:correctCount,                     label:'Correct',  color:'#15803D' },
                { num:questions.length - correctCount,  label:'Missed',   color:'#B91C1C' },
                { num:`${Math.round(correctCount/questions.length*100)}%`, label:'Accuracy', color:'#1A1F5E' },
              ].map(({ num, label, color }) => (
                <div key={label} style={{ background:'#F0F4FF', border:'1.5px solid rgba(26,36,104,.08)', borderRadius:12, padding:'10px 8px', textAlign:'center', boxShadow:'inset 0 2px 5px rgba(26,36,104,.05)' }}>
                  <div style={{ fontSize:20, fontWeight:900, color, lineHeight:1 }}>{num}</div>
                  <div style={{ fontSize:8, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.08em', marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak topics */}
        {weakTopics.length > 0 && (
          <div style={{ margin:'10px 16px 0', background:'rgba(245,158,11,.08)', border:'1.5px solid rgba(245,158,11,.25)', borderRadius:14, padding:'11px 13px' }}>
            <div style={{ fontSize:11, fontWeight:900, color:'#92400E', marginBottom:3 }}>⚠ You missed multiple questions on:</div>
            <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{weakTopics.join(', ')} — consider revising.</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding:'12px 16px 100px', display:'flex', flexDirection:'column', gap:9 }}>
          {/* Review Session */}
          <button onClick={onReview}
            style={{ width:'100%', padding:'14px', borderRadius:16, border:'2.5px solid #1A2468', background:'#fff', color:'#1A2468', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 5px 0 rgba(26,36,104,.2),0 7px 16px rgba(26,36,104,.1)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'-.01em' }}
            onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='0 2px 0 rgba(26,36,104,.2)'}}
            onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 5px 0 rgba(26,36,104,.2),0 7px 16px rgba(26,36,104,.1)'}}
            onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 5px 0 rgba(26,36,104,.2),0 7px 16px rgba(26,36,104,.1)'}}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="#1A2468" strokeWidth="1.6"/><line x1="5" y1="6" x2="11" y2="6" stroke="#1A2468" strokeWidth="1.4" strokeLinecap="round"/><line x1="5" y1="9" x2="9" y2="9" stroke="#1A2468" strokeWidth="1.4" strokeLinecap="round"/></svg>
            📋 Review Session
          </button>
          <button onClick={onRematch}
            style={{ width:'100%', padding:'14px', borderRadius:16, border:'none', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:sh, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            onPointerDown={pr} onPointerUp={rl} onPointerLeave={rl}>
            🔁 Rematch
          </button>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
            {[{l:'⚔️ New Battle',fn:onNewBattle},{l:'🏠 Home',fn:onHome}].map(({l,fn})=>(
              <button key={l} onClick={fn}
                style={{ padding:'12px', borderRadius:14, background:'#fff', border:'2px solid rgba(26,36,104,.12)', color:'#1A1F5E', fontSize:12, fontWeight:800, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 0 rgba(26,36,104,.1),0 5px 12px rgba(26,36,104,.06)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BattleReview ──────────────────────────────────────────────────────────────
function BattleReview({ questions, answersLog, cpuChoices, config, onDone }) {
  const [idx, setIdx] = useState(0)

  const q         = questions[idx]
  const opts      = q ? normaliseOptions(q.options) : []
  const log       = answersLog[idx] ?? {}
  const selIdx    = log.selectedIdx ?? null
  const isCorrect = log.isCorrect ?? false
  const skipped   = selIdx === null && !isCorrect
  const correctIdx = opts.findIndex((_, i) => checkCorrect(opts, i, q?.correct_answer))
  const cpuAns    = cpuChoices[idx]
  const cpuIdx    = cpuAns != null ? opts.indexOf(cpuAns) : -1
  const total     = questions.length
  const hasExpl   = hasDisplayableExplanation(q?.explanation)
  // Selected answer letter for wrong_options highlighting (same as ReviewSession)
  const selectedKey = selIdx != null ? LETTERS[selIdx] ?? null : null

  const sh    = `0 5px 0 #031548,0 7px 16px rgba(26,36,104,.3)`
  const shPrs = `0 1px 0 #031548`

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <SkyBg/>

      {/* Review top bar */}
      <div style={{ background:`linear-gradient(180deg,${NAVY} 0%,${NAVY2} 100%)`, flexShrink:0, zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,.4)', paddingTop:'env(safe-area-inset-top)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px 8px' }}>
          <button onClick={onDone}
            style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:10, padding:'7px 12px', color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Results
          </button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, fontWeight:900, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:'.1em' }}>Reviewing</div>
            <div style={{ fontSize:13, fontWeight:900, color:'#fff' }}>Question {idx + 1} of {total}</div>
          </div>
          <div style={{ background:'rgba(255,184,0,.15)', border:'1px solid rgba(255,184,0,.3)', borderRadius:9, padding:'5px 10px', fontSize:11, fontWeight:900, color:'#FCD34D' }}>
            {answersLog.filter(a => a.isCorrect).length}/{total} ✓
          </div>
        </div>
        <div style={{ height:3, margin:'0 12px 10px', background:'rgba(255,255,255,.12)', borderRadius:999, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${((idx + 1) / total) * 100}%`, background:`linear-gradient(90deg,${GOLD},#FF6A00)`, borderRadius:999, transition:'width .4s ease' }}/>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5, padding:'18px 13px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Question card */}
          <div style={{ position:'relative', marginTop:16 }}>
            <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#F59E0B,#FBBF24)', border:'3px solid #D5E5F5', borderRadius:999, padding:'5px 18px', display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:900, color:NAVY, whiteSpace:'nowrap', zIndex:5, boxShadow:`0 4px 0 ${GOLD2},0 6px 14px rgba(245,158,11,.35)` }}>
              <span>{subjectEmoji(config?.subject_name)}</span>
              <span>{config?.subject_name || q?.subject_name || 'Question'}</span>
            </div>
            <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:22, boxShadow:'0 6px 0 rgba(26,36,104,.25),0 10px 24px rgba(26,36,104,.15),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible' }}>
              {[{left:'-8px'},{right:'-8px'}].map((s,i)=>(
                <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:14, height:14, borderRadius:'50%', background:'#3B5BDB', border:'2.5px solid #D5E5F5', boxShadow:'0 2px 4px rgba(0,0,0,.2)', ...s }}/>
              ))}
              <div style={{ padding:'28px 16px 18px', display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ flex:1, fontSize:16, fontWeight:900, color:'#1A1F5E', lineHeight:1.6, minWidth:0, wordBreak:'break-word' }}>
                  <MathText text={q?.text ?? q?.question_text ?? ''} as="span" className=""/>
                </div>
                <div style={{ fontSize:40, flexShrink:0, alignSelf:'center', filter:'drop-shadow(0 3px 6px rgba(0,0,0,.14))' }}>{subjectEmoji(config?.subject_name)}</div>
              </div>
            </div>
          </div>

          {/* Answer tiles — frozen post-reveal */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {opts.map((opt, i) => {
              const isC    = i === correctIdx
              const isW    = i === selIdx && !isCorrect
              const dim    = !isC && !isW
              const tileBg = isC ? '#16A34A' : isW ? '#DC2626' : TILE[i]?.bg ?? '#3B82F6'
              const tileSh = isC ? '0 5px 0 #15803D,0 7px 18px rgba(22,163,74,.4)' : isW ? '0 5px 0 #991B1B,0 7px 18px rgba(220,38,38,.4)' : `0 6px 0 ${TILE[i]?.press ?? '#1D4ED8'}`
              const letter = isC ? '✓' : isW ? '✗' : LETTERS[i]
              const ltrBg  = isC || isW ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.25)'
              const showYou = i === selIdx
              const showCpu = i === cpuIdx
              return (
                <div key={i} style={{ position:'relative', borderRadius:18, opacity: dim ? .26 : 1 }}>
                  <div style={{ display:'flex', alignItems:'center', padding:'0 9px 0 0', borderRadius:18, background:tileBg, boxShadow:tileSh, minHeight:64, position:'relative', overflow:'hidden', border:`2px solid ${isC ? 'rgba(255,255,255,.4)' : 'transparent'}` }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'42%', background:'linear-gradient(to bottom,rgba(255,255,255,.25),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:ltrBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', flexShrink:0, margin:'0 10px', boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)', position:'relative', zIndex:1 }}>{letter}</div>
                    <div style={{ flex:1, fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.35, minWidth:0, wordBreak:'break-word', position:'relative', zIndex:1 }}>
                      <MathText text={String(opt ?? '')} as="span" className=""/>
                    </div>
                    <div style={{ flexShrink:0, position:'relative', zIndex:1 }}>{DECOS[i]}</div>
                  </div>
                  {/* ── Player / CPU choice badges — large & clear ── */}
                  {(showYou || showCpu) && (
                    <div style={{ position:'absolute', top:-14, right:6, display:'flex', gap:4, zIndex:10 }}>
                      {showYou && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>👤</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#3B5BDB', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>You</span>
                        </div>
                      )}
                      {showCpu && !showYou && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:'#6D28D9', border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤖</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'#6D28D9', borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>CPU</span>
                        </div>
                      )}
                      {showCpu && showYou && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:NAVY2, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 3px 8px rgba(0,0,0,.35)' }}>🤝</div>
                          <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:NAVY2, borderRadius:999, padding:'1px 5px', boxShadow:'0 1px 4px rgba(0,0,0,.3)', whiteSpace:'nowrap' }}>Both</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Result banner */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:16, background: isCorrect?'#DCFCE7':skipped?'#F3F4F6':'#FEE2E2', border:`2px solid ${isCorrect?'rgba(34,197,94,.3)':skipped?'rgba(107,114,128,.2)':'rgba(239,68,68,.25)'}`, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background: isCorrect?'#16A34A':skipped?'#6B7280':'#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', flexShrink:0, boxShadow:`0 3px 8px ${isCorrect?'rgba(22,163,74,.35)':'rgba(220,38,38,.3)'}` }}>
              {isCorrect ? '✓' : skipped ? '⏱' : '✗'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:900, color: isCorrect?'#15803D':skipped?'#4B5563':'#B91C1C' }}>
                {isCorrect ? 'Correct — +10 pts' : skipped ? "Time's up — 0 pts" : 'Wrong — 0 pts'}
              </div>
              {!isCorrect && !skipped && q?.correct_answer && (
                <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>
                  Correct: <strong style={{ color:'#15803D' }}>{opts[correctIdx] ?? q.correct_answer}</strong>
                </div>
              )}
            </div>
            {isCorrect && <div style={{ fontSize:12, fontWeight:900, color:'#92400E', background:'#FEF3C7', border:'1px solid rgba(245,158,11,.3)', borderRadius:999, padding:'3px 10px', flexShrink:0 }}>+10 XP ⚡</div>}
          </div>

          {/* Explanation — uses ExplanationBlock, identical to practice ReviewSession */}
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
          <div style={{ height:'max(90px,calc(80px + env(safe-area-inset-bottom)))', flexShrink:0 }}/>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, zIndex:100, background:'linear-gradient(to top,#D5E5F5 65%,transparent)', padding:'10px 14px', paddingBottom:'max(14px,env(safe-area-inset-bottom))' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, maxWidth:480, margin:'0 auto' }}>
          <button onClick={() => { setIdx(i => Math.max(0, i - 1)) }} disabled={idx === 0}
            style={{ padding:'13px', borderRadius:999, border:'2px solid rgba(26,36,104,.2)', background:'#fff', color:NAVY2, fontSize:14, fontWeight:900, fontFamily:'inherit', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? .4 : 1, boxShadow: idx === 0 ? 'none' : '0 4px 0 rgba(26,36,104,.15)', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Previous
          </button>
          {idx < total - 1 ? (
            <button onClick={() => { setIdx(i => i + 1) }}
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
// This helper is only used to decide whether to show the "Explain" button.
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

// ── Battle Explanation Bottom Sheet ──────────────────────────────────────────
// Styled to match the battle UI: dark navy header, gold accent, battle colours.
// On desktop capped at 540px wide and centred — not a full-width sheet.
function BattleExplanationSheet({ question, isCorrect, selectedKey, onClose }) {
  if (!question?.explanation) return null
  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:4000, background:'rgba(6,12,44,.88)', backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center' }}
    >
      {/* Tap backdrop to close */}
      <div style={{ flex:1, width:'100%' }} onClick={onClose}/>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:540,
          background:'#fff',
          borderRadius:'24px 24px 0 0',
          maxHeight:'88dvh',
          display:'flex', flexDirection:'column',
          overflow:'hidden',
          boxShadow:'0 -12px 50px rgba(0,0,0,.5)',
          animation:'modalin .28s cubic-bezier(.32,.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0', flexShrink:0, background:NAVY }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'rgba(255,255,255,.25)' }}/>
        </div>

        {/* Header — battle-themed navy */}
        <div style={{
          background: `linear-gradient(135deg,${NAVY},#1264E5)`,
          padding:'14px 20px 16px',
          flexShrink:0,
          borderBottom:`3px solid ${GOLD}`,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* Result icon */}
              <div style={{
                width:38, height:38, borderRadius:12, flexShrink:0,
                background: isCorrect ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)',
                border: `2px solid ${isCorrect ? 'rgba(74,222,128,.5)' : 'rgba(248,113,113,.5)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: isCorrect ? '0 0 12px rgba(74,222,128,.3)' : '0 0 12px rgba(248,113,113,.25)',
              }}>
                <span style={{ fontSize:20, fontWeight:900, color: isCorrect ? '#4ade80' : '#f87171' }}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#fff', letterSpacing:'-.02em' }}>Explanation</div>
                <div style={{ fontSize:11, fontWeight:800, color: isCorrect ? '#4ade80' : '#f87171', marginTop:2, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </div>
              </div>
            </div>
            {/* XP badge if correct */}
            {isCorrect && (
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,184,0,.18)', border:'1.5px solid rgba(255,184,0,.4)', borderRadius:999, padding:'4px 12px', flexShrink:0 }}>
                <span style={{ fontSize:12 }}>⚡</span>
                <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>+10 XP</span>
              </div>
            )}
            <button onClick={onClose}
              style={{ width:32, height:32, borderRadius:9, border:'1.5px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.7)', fontSize:16, fontWeight:700, fontFamily:'inherit', marginLeft:8, flexShrink:0 }}>
              ×
            </button>
          </div>
        </div>

        {/* Gold divider line */}
        <div style={{ height:3, background:`linear-gradient(90deg,${GOLD},#FF6A00,${GOLD})`, flexShrink:0 }}/>

        {/* Scrollable body — ExplanationBlock renders everything */}
        <div style={{ overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'20px 20px 16px', flex:1, background:'#fff' }}>
          <ExplanationBlock
            explanation={question.explanation}
            isCorrect={isCorrect}
            dark={false}
            mobileModal={false}
            selectedKey={selectedKey}
            question={question}
          />
        </div>

        {/* Close button — battle navy style */}
        <div style={{ padding:'12px 20px 24px', flexShrink:0, background:'#fff', borderTop:'1px solid #f1f5f9' }}>
          <button onClick={onClose}
            style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:'pointer', background:NAVY2, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:`0 5px 0 #031548,0 8px 20px rgba(26,36,104,.3)`, letterSpacing:'-.01em' }}>
            Got it ✓
          </button>
        </div>
      </div>
    </div>
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
  const [explOpen,     setExplOpen]    = useState(false)
  const [saveData,     setSaveData]    = useState(null)
  const [studentDots,  setStudentDots] = useState(0)
  const [cpuDots,      setCpuDots]     = useState(0)
  const [paused,       setPaused]      = useState(false)

  const opponent   = useRef(null)
  const cpuChoices = useRef([])
  const answersLog = useRef([])
  const cpuTimer   = useRef(null)
  const sessionId  = useRef(crypto.randomUUID())

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
    const baseParams  = { mode: 'battle', _t: String(Date.now()) }
    if (cfg.subject_id)   baseParams.subject_id = cfg.subject_id
    else if (cfg.subject_name) baseParams.subjects = cfg.subject_name
    if (cfg.topic_id)    baseParams.topic_id = cfg.topic_id

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
      setCpuAnswered(true); setRevealed(true); setExplOpen(false)
    } else {
      if (qIndex < questions.length - 1) {
        setQIndex(i => i+1); setSelectedIdx(null); setRevealed(false); setTimerKey(k => k+1); setExplOpen(false); setPopKey(0)
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
    setCpuAnswered(true); setRevealed(true); setExplOpen(false)
  }, [revealed, qIndex, questions])

  function finishMatch() {
    setPhase('saving')
    const correct = answersLog.current.filter(a => a.is_correct).length
    const finalS  = correct * 10
    const finalC  = cpuChoices.current.reduce((acc, ans, i) => {
      const q = questions[i], opts = normaliseOptions(q.options)
      const cor = opts.indexOf(ans) >= 0 ? checkCorrect(opts, opts.indexOf(ans), q.correct_answer) : ans === q.correct_answer
      return acc + (cor ? 10 : 0)
    }, 0)
    const outcome = finalS > finalC ? 'win' : finalS < finalC ? 'loss' : 'draw'
    const xp      = correct * 10 + (outcome==='win'?20:outcome==='draw'?10:0)
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
      onRematch={() => { try{sessionStorage.setItem('battle_config',JSON.stringify(config))}catch{} window.location.reload() }}
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
        {explOpen && q?.explanation && (
          <BattleExplanationSheet
            question={q}
            isCorrect={selectedIdx !== null && checkCorrect(normaliseOptions(q.options), selectedIdx, q.correct_answer)}
            selectedKey={selectedIdx !== null ? LETTERS[selectedIdx] ?? null : null}
            onClose={() => setExplOpen(false)}
          />
        )}

        <VSHeader
          qIndex={qIndex} total={questions.length}
          studentScore={studentScore} cpuScore={cpuScore}
          studentDots={studentDots} cpuDots={cpuDots}
          onMenu={() => setPaused(true)}
          floatSide={floatSide} floatKey={floatKey}
          cpuAnswered={cpuAnswered}
        />

        {/* Canvas */}
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', position:'relative', zIndex:5, padding:'20px 20px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
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
                {/* Card */}
                <div style={{ background:'#FAFBFF', border:'3px solid #1A2468', borderRadius:24, boxShadow:'0 10px 0 rgba(26,36,104,.2),0 14px 32px rgba(26,36,104,.14),inset 0 1px 0 rgba(255,255,255,.9)', position:'relative', overflow:'visible', minHeight:'clamp(140px,20vw,240px)' }}>
                  {[{left:'-10px'},{right:'-10px'}].map((s,i)=>(
                    <div key={i} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:18, height:18, borderRadius:'50%', background:'#3B5BDB', border:'3px solid #D5E5F5', boxShadow:'0 2px 6px rgba(0,0,0,.25)', ...s }}/>
                  ))}
                  <div style={{ padding:'clamp(32px,5vw,52px) clamp(20px,4vw,36px) clamp(24px,4vw,40px)', display:'flex', alignItems:'flex-start', gap:18, minHeight:'clamp(140px,20vw,240px)' }}>
                    <div style={{ flex:1, fontSize:'clamp(17px,2.4vw,26px)', fontWeight:900, color:'#1A1F5E', lineHeight:1.65, minWidth:0, wordBreak:'break-word' }}>
                      <MathText text={q.text ?? q.question_text ?? ''} as="span" className=""/>
                    </div>
                    <div style={{ fontSize:'clamp(46px,7vw,68px)', flexShrink:0, alignSelf:'center', filter:'drop-shadow(0 3px 8px rgba(0,0,0,.16))' }}>
                      {subjectEmoji(config?.subject_name)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2×2 Answer tiles */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'clamp(10px,1.5vw,16px)', alignItems:'stretch' }}>
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
                    <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 clamp(12px,2vw,20px) 0 0', borderRadius:18, background:bg, boxShadow:shadow, border, minHeight:'clamp(80px,12vw,110px)', position:'relative', overflow:'hidden', transition:'box-shadow .1s, opacity .1s' }}>
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

            {/* Reveal banner */}
            {revealed && (() => {
              const cor = selectedIdx !== null && checkCorrect(opts, selectedIdx, q?.correct_answer)
              const skp = selectedIdx === null
              const hasExpl = hasDisplayableExplanation(q?.explanation)
              return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderRadius:16, flexWrap:'wrap', background:cor?'#DCFCE7':skp?'#F3F4F6':'#FEE2E2', border:`2px solid ${cor?'rgba(34,197,94,.3)':skp?'rgba(107,114,128,.2)':'rgba(239,68,68,.25)'}`, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:cor?'#16A34A':skp?'#6B7280':'#DC2626', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', flexShrink:0, boxShadow:`0 3px 8px ${cor?'rgba(22,163,74,.35)':skp?'rgba(107,114,128,.2)':'rgba(220,38,38,.3)'}` }}>
                    {cor?'✓':skp?'⏱':'✗'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:900, color:cor?'#15803D':skp?'#4B5563':'#B91C1C' }}>
                      {cor?'Correct! +10 pts':skp?`Time's up — 0 pts`:`Wrong — 0 pts`}
                    </div>
                    {!cor && !skp && q?.correct_answer && (
                      <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>
                        Correct: <strong style={{ color:'#15803D' }}>{opts[opts.findIndex((_,i)=>checkCorrect(opts,i,q.correct_answer))] ?? q.correct_answer}</strong>
                      </div>
                    )}
                  </div>
                  {cor && <div style={{ fontSize:12, fontWeight:900, color:'#92400E', background:'#FEF3C7', border:'1px solid rgba(245,158,11,.3)', borderRadius:999, padding:'4px 12px', flexShrink:0 }}>+10 XP ⚡</div>}
                  {hasExpl && (
                    <button onClick={() => setExplOpen(true)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:NAVY2, border:'none', boxShadow:`0 4px 0 #031548,0 5px 14px rgba(26,36,104,.3)`, fontSize:13, fontWeight:900, color:'#fff', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      📖 Explain
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Progress dots + Next row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4 }}>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {questions.map((_, i) => (
                  <div key={i} style={{ height:9, width:9, borderRadius:'50%', background: i < qIndex ? GOLD : i === qIndex ? NAVY2 : 'rgba(26,36,104,.18)', boxShadow: i === qIndex ? `0 0 6px ${GOLD}` : 'none', transition:'all .25s' }}/>
                ))}
              </div>
              <button onClick={handleNext}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'clamp(11px,1.5vw,16px) clamp(22px,3vw,36px)', borderRadius:999, border:'none', background:NAVY2, color:'#fff', fontSize:'clamp(14px,1.6vw,18px)', fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:submitSh, letterSpacing:'-.01em' }}
                onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow=submitShPrs}}
                onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=submitSh}}
                onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=submitSh}}>
                {!revealed ? (selectedIdx===null?'Skip':'Submit') : isLast?'Finish':'Next'}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 7h6M8 4l3 3-3 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <div style={{ height:'max(80px,calc(70px + env(safe-area-inset-bottom)))', flexShrink:0 }}/>
          </div>
        </div>
      </div>
    </>
  )
}