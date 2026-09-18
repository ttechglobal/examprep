'use client'
// src/app/student/battle/session/page.js
// Game UI matching the reference design: VS header, 2×2 coloured tiles, avatars.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter }  from 'next/navigation'
import { useTheme }   from '@/contexts/ThemeContext'
import { usePoints }  from '@/contexts/PointsContext'
import { createComputerOpponent, readLocalBattleStats, saveLocalBattleStats } from '@/lib/battleAI'
import { saveSessionLocally, flushSyncQueue } from '@/lib/localSessionSync'
import { MathText }   from '@/lib/mathRenderer'

// ─── Brand ───────────────────────────────────────────────────────────────────
const NAVY='#062A78', GOLD='#FFB800', GREEN='#22c55e', RED='#f43f5e'
const TILE_COLORS = [
  { bg:'#3B82F6', shadow:'#1D4ED8', glow:'rgba(59,130,246,.3)'  }, // A blue
  { bg:'#22c55e', shadow:'#15803D', glow:'rgba(34,197,94,.3)'   }, // B green
  { bg:'#F59E0B', shadow:'#B45309', glow:'rgba(245,158,11,.3)'  }, // C amber
  { bg:'#8B5CF6', shadow:'#6D28D9', glow:'rgba(139,92,246,.3)'  }, // D purple
]
const LETTERS = ['A','B','C','D']

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
function subjectIllustration(name = '') {
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function PlayerAvatar() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#1264E5"/>
      <circle cx="19" cy="15" r="6" fill={GOLD}/>
      <ellipse cx="19" cy="30" rx="10" ry="7" fill={GOLD}/>
    </svg>
  )
}
function CPUAvatar() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <circle cx="19" cy="19" r="19" fill="#7C3AED"/>
      <rect x="10" y="12" width="18" height="14" rx="4" fill="#a78bfa"/>
      <rect x="14" y="16" width="4" height="4" rx="1" fill="#fff"/>
      <rect x="20" y="16" width="4" height="4" rx="1" fill="#fff"/>
      <rect x="16" y="22" width="6" height="2" rx="1" fill="#fff" opacity=".6"/>
      <rect x="17" y="8" width="4" height="5" rx="2" fill="#a78bfa"/>
      <circle cx="19" cy="8" r="2" fill={GOLD}/>
    </svg>
  )
}
function MoleculeA() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".22"><circle cx="11" cy="4" r="3" stroke="white" strokeWidth="1.5"/><circle cx="4" cy="16" r="3" stroke="white" strokeWidth="1.5"/><circle cx="18" cy="16" r="3" stroke="white" strokeWidth="1.5"/><line x1="11" y1="7" x2="6" y2="14" stroke="white" strokeWidth="1.2"/><line x1="11" y1="7" x2="16" y2="14" stroke="white" strokeWidth="1.2"/></svg>
}
function MoleculeB() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".22"><circle cx="5" cy="5" r="3" stroke="white" strokeWidth="1.5"/><circle cx="17" cy="5" r="3" stroke="white" strokeWidth="1.5"/><circle cx="5" cy="17" r="3" stroke="white" strokeWidth="1.5"/><circle cx="17" cy="17" r="3" stroke="white" strokeWidth="1.5"/><line x1="8" y1="5" x2="14" y2="5" stroke="white" strokeWidth="1.2"/><line x1="5" y1="8" x2="5" y2="14" stroke="white" strokeWidth="1.2"/><line x1="17" y1="8" x2="17" y2="14" stroke="white" strokeWidth="1.2"/><line x1="8" y1="17" x2="14" y2="17" stroke="white" strokeWidth="1.2"/></svg>
}
function MoleculeC() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".22"><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1.5"/><line x1="11" y1="2" x2="11" y2="7" stroke="white" strokeWidth="1.2"/><line x1="11" y1="15" x2="11" y2="20" stroke="white" strokeWidth="1.2"/><line x1="2" y1="11" x2="7" y2="11" stroke="white" strokeWidth="1.2"/><line x1="15" y1="11" x2="20" y2="11" stroke="white" strokeWidth="1.2"/></svg>
}
function MoleculeD() {
  return <svg width="22" height="22" viewBox="0 0 22 22" fill="none" opacity=".22"><polygon points="11,2 20,7 20,15 11,20 2,15 2,7" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="11" cy="11" r="4" stroke="white" strokeWidth="1" strokeDasharray="2 2"/></svg>
}
const DECOS = [<MoleculeA/>, <MoleculeB/>, <MoleculeC/>, <MoleculeD/>]

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ onDone }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    const t1 = setTimeout(() => setN(2), 900)
    const t2 = setTimeout(() => setN(1), 1800)
    const t3 = setTimeout(onDone, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--bg-base)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontSize:100, fontWeight:900, color:'var(--text-prim)', lineHeight:1, letterSpacing:'-.05em', animation:'cdpop .4s ease' }}>{n}</div>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.1em' }}>Get ready to battle!</div>
      <style>{`@keyframes cdpop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ─── Timer Ring ───────────────────────────────────────────────────────────────
function TimerRing({ secs, onTimeUp, revealed }) {
  const [rem, setRem]   = useState(secs)
  const start           = useRef(Date.now())
  const fired           = useRef(false)
  useEffect(() => {
    if (revealed) return
    const id = setInterval(() => {
      const left = Math.max(0, secs - (Date.now() - start.current) / 1000)
      setRem(left)
      if (left <= 0 && !fired.current) { fired.current = true; clearInterval(id); onTimeUp() }
    }, 100)
    return () => clearInterval(id)
  }, [secs, onTimeUp, revealed])
  const pct   = rem / secs
  const r     = 14, circ = 2 * Math.PI * r
  const color = pct > .5 ? GREEN : pct > .25 ? GOLD : RED
  return (
    <div style={{ position:'relative', width:36, height:36, flexShrink:0 }}>
      <svg width="36" height="36" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="3"/>
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{ transition:'stroke-dashoffset .1s linear,stroke .3s' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color, fontVariantNumeric:'tabular-nums' }}>{Math.ceil(rem)}</div>
    </div>
  )
}

// ─── Background Shapes ────────────────────────────────────────────────────────
function BgShapes() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:0 }} aria-hidden="true">
      <svg style={{ position:'absolute', top:'6%', left:'3%', width:70, opacity:.12 }} viewBox="0 0 80 80">
        <circle cx="40" cy="20" r="4" fill="#1264E5"/><circle cx="20" cy="55" r="4" fill="#1264E5"/><circle cx="60" cy="55" r="4" fill="#1264E5"/>
        <line x1="40" y1="20" x2="20" y2="55" stroke="#1264E5" strokeWidth="2"/><line x1="40" y1="20" x2="60" y2="55" stroke="#1264E5" strokeWidth="2"/><line x1="20" y1="55" x2="60" y2="55" stroke="#1264E5" strokeWidth="2"/>
        <circle cx="40" cy="20" r="8" fill="none" stroke="#1264E5" strokeWidth="1.5" opacity=".5"/><circle cx="20" cy="55" r="8" fill="none" stroke="#1264E5" strokeWidth="1.5" opacity=".5"/><circle cx="60" cy="55" r="8" fill="none" stroke="#1264E5" strokeWidth="1.5" opacity=".5"/>
      </svg>
      <svg style={{ position:'absolute', top:'10%', right:'3%', width:56, opacity:.13 }} viewBox="0 0 64 64">
        <polygon points="32,4 60,52 4,52" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinejoin="round"/>
      </svg>
      <svg style={{ position:'absolute', bottom:'30%', left:'2%', width:52, opacity:.1 }} viewBox="0 0 56 56">
        <rect x="8" y="8" width="40" height="40" rx="4" fill="none" stroke={GOLD} strokeWidth="2.5" transform="rotate(20 28 28)"/>
      </svg>
      <svg style={{ position:'absolute', bottom:'20%', right:'2%', width:62, opacity:.12 }} viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="12" fill="none" stroke="#1264E5" strokeWidth="2"/>
        <ellipse cx="35" cy="35" rx="30" ry="12" fill="none" stroke="#1264E5" strokeWidth="1.5"/>
        <ellipse cx="35" cy="35" rx="30" ry="12" fill="none" stroke="#1264E5" strokeWidth="1.5" transform="rotate(60 35 35)"/>
        <ellipse cx="35" cy="35" rx="30" ry="12" fill="none" stroke="#1264E5" strokeWidth="1.5" transform="rotate(120 35 35)"/>
      </svg>
    </div>
  )
}

// ─── Score Float ──────────────────────────────────────────────────────────────
function ScoreFloat({ side, key: k }) {
  return (
    <div key={k} style={{ position:'absolute', top:-16, [side==='student'?'left':'right']:40, fontSize:14, fontWeight:900, color:side==='student'?GREEN:RED, animation:'floatup .8s ease-out forwards', pointerEvents:'none', zIndex:20 }}>
      +10
    </div>
  )
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function BattleResults({ questions, answersLog, cpuAnswers, studentScore, cpuScore, xpAwarded, onRematch, onNewBattle, onHome }) {
  const { dark } = useTheme()
  const outcome  = studentScore > cpuScore ? 'win' : studentScore < cpuScore ? 'loss' : 'draw'
  const [expanded, setExpanded] = useState(false)
  const weakTopics = Object.entries(
    questions.reduce((acc, q, i) => { if (!answersLog[i]?.isCorrect) { const t = q.topic_name||'General'; acc[t]=(acc[t]||0)+1 } return acc }, {})
  ).filter(([,c]) => c >= 2).map(([t]) => t)
  const OUTCOME = { win:{icon:'🏆',label:'You Won!',color:GOLD}, draw:{icon:'🤝',label:"It's a Draw!",color:'#1264E5'}, loss:{icon:'⚡',label:'CPU Wins This Round',color:RED} }[outcome]

  const cardStyle = { background:'var(--bg-card)', border:`3px solid #1E3A8A`, borderRadius:22, padding:'24px 20px', boxShadow:dark?'0 6px 0 rgba(30,58,138,.3),0 10px 28px rgba(6,42,120,.15)':'0 8px 0 rgba(30,58,138,.25),0 12px 32px rgba(6,42,120,.12)' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, background:'var(--bg-base)', overflowY:'auto', WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 14px', paddingBottom:'max(80px,env(safe-area-inset-bottom,80px))', gap:14 }}>
      <BgShapes/>
      <div style={{ ...cardStyle, width:'100%', maxWidth:480, textAlign:'center', position:'relative', zIndex:1 }}>
        <div style={{ fontSize:52, marginBottom:10 }}>{OUTCOME.icon}</div>
        <div style={{ fontSize:24, fontWeight:900, color:OUTCOME.color, letterSpacing:'-.03em', marginBottom:20 }}>{OUTCOME.label}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center' }}>
          {[{label:'You',score:studentScore},{label:null},{label:'CPU',score:cpuScore}].map((item,i) => item.label
            ? <div key={i} style={{ background:'var(--bg-subtle)', border:'1.5px solid var(--border)', borderRadius:14, padding:'14px 10px', boxShadow:dark?'0 2px 8px rgba(0,0,0,.2)':'0 2px 8px rgba(6,42,120,.06)' }}>
                <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:6 }}>{item.label}</div>
                <div style={{ fontSize:34, fontWeight:900, color:'var(--text-prim)', fontVariantNumeric:'tabular-nums' }}>{item.score}</div>
              </div>
            : <div key={i} style={{ fontSize:13, fontWeight:900, color:'var(--text-tert)' }}>VS</div>
          )}
        </div>
        <div style={{ marginTop:14, padding:'11px 14px', background:dark?'rgba(255,184,0,.08)':'rgba(255,184,0,.06)', border:`1px solid ${dark?'rgba(255,184,0,.2)':'rgba(255,184,0,.15)'}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:15, fontWeight:900, color:dark?GOLD:'#a06000' }}>
          ⚡ +{xpAwarded} XP earned
        </div>
      </div>

      {weakTopics.length > 0 && (
        <div style={{ background:dark?'rgba(255,184,0,.06)':'rgba(255,184,0,.05)', border:`1px solid ${dark?'rgba(255,184,0,.2)':'rgba(255,184,0,.15)'}`, borderRadius:14, padding:'13px 16px', width:'100%', maxWidth:480, position:'relative', zIndex:1 }}>
          <div style={{ fontSize:12, fontWeight:800, color:dark?GOLD:'#a06000', marginBottom:5 }}>⚠ You missed multiple questions on:</div>
          <div style={{ fontSize:13, color:'var(--text-sec)', lineHeight:1.5 }}>{weakTopics.join(', ')} — consider revising.</div>
        </div>
      )}

      {/* Breakdown */}
      <div style={{ ...cardStyle, width:'100%', maxWidth:480, padding:0, overflow:'hidden', position:'relative', zIndex:1 }}>
        <button onClick={() => setExpanded(e=>!e)} style={{ width:'100%', padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:800, color:'var(--text-prim)' }}>
          Question breakdown
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform:expanded?'rotate(180deg)':'none', transition:'transform .2s', flexShrink:0 }}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {expanded && (
          <div style={{ borderTop:'1px solid var(--border)' }}>
            {questions.map((q, i) => {
              const correct = answersLog[i]?.isCorrect
              return (
                <div key={i} style={{ padding:'9px 16px', borderBottom:i<questions.length-1?'1px solid var(--border)':'none', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, background:correct?(dark?'rgba(34,197,94,.15)':'rgba(34,197,94,.1)'):(dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:correct?GREEN:RED, fontWeight:900 }}>{correct?'✓':'✗'}</div>
                  <div style={{ flex:1, fontSize:11, color:'var(--text-sec)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Q{i+1}. {q.text??q.question_text??''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:480, position:'relative', zIndex:1 }}>
        <button onClick={onRematch} style={{ padding:'14px', borderRadius:999, border:'none', background:NAVY, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='0 1px 0 #031548'}}
          onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)'}}
          onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)'}}>
          🔁 Rematch
        </button>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[{ label:'⚔️ New Battle', onClick:onNewBattle },{ label:'🏠 Home', onClick:onHome }].map(({ label, onClick }) => (
            <button key={label} onClick={onClick} style={{ padding:'12px', borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:13, fontWeight:800, fontFamily:'inherit', cursor:'pointer', boxShadow:dark?'0 2px 8px rgba(0,0,0,.2)':'0 2px 8px rgba(6,42,120,.06)' }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function BattleSessionPage() {
  const router  = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints, showXPToast } = usePoints()

  const [phase,        setPhase]       = useState('loading')
  const [questions,    setQuestions]   = useState([])
  const [config,       setConfig]      = useState(null)
  const [errMsg,       setErrMsg]      = useState('')
  const [qIndex,       setQIndex]      = useState(0)
  const [selectedIdx,  setSelectedIdx] = useState(null)
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

  const opponent   = useRef(null)
  const cpuChoices = useRef([])
  const answersLog = useRef([])
  const cpuTimer   = useRef(null)
  const sessionId  = useRef(crypto.randomUUID())

  // Load questions
  useEffect(() => {
    let cfg
    try { cfg = JSON.parse(sessionStorage.getItem('battle_config') || '{}') } catch { cfg = {} }
    if (!cfg.subject_id && !cfg.subject_name) { setErrMsg('No battle configuration found.'); setPhase('error'); return }
    setConfig(cfg)
    const stats = readLocalBattleStats()
    opponent.current = createComputerOpponent(stats.ai_difficulty || 'easy')
    const params = new URLSearchParams({ count: String(cfg.count || 10), mode: 'battle' })
    if (cfg.subject_id) params.set('subject_id', cfg.subject_id)
    else if (cfg.subject_name) params.set('subjects', cfg.subject_name)
    if (cfg.topic_id) params.set('topic_id', cfg.topic_id)
    fetch(`/api/student/questions?${params}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error ?? `Error ${r.status}`) }))
      .then(data => {
        if (!data.questions?.length) { setErrMsg('No questions found.'); setPhase('error'); return }
        const qs = data.questions
        setQuestions(qs)
        cpuChoices.current = qs.map(q => opponent.current.decide(q))
        answersLog.current = qs.map(q => ({ question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:false, is_correct:false, selectedIdx:null }))
        setPhase('countdown')
      })
      .catch(err => { setErrMsg(err?.message || 'Failed to load questions.'); setPhase('error') })
  }, [])

  // Start CPU thinking timer on each new question
  useEffect(() => {
    if (phase !== 'battle') return
    setCpuAnswered(false)
    clearTimeout(cpuTimer.current)
    const delay = opponent.current?.getThinkingDelay() ?? 5000
    cpuTimer.current = setTimeout(() => setCpuAnswered(true), delay)
    return () => clearTimeout(cpuTimer.current)
  }, [phase, qIndex])

  function animateFloat(side) {
    setFloatSide(side)
    setFloatKey(k => k + 1)
    setTimeout(() => setFloatSide(null), 900)
  }

  function handleSelect(idx) {
    if (revealed) return
    setSelectedIdx(idx)
  }

  function handleNext() {
    if (!revealed) {
      // Reveal
      const q     = questions[qIndex]
      const opts  = normaliseOptions(q.options)
      const sCorr = selectedIdx !== null && checkCorrect(opts, selectedIdx, q.correct_answer)
      const cpuAns= cpuChoices.current[qIndex]
      const cCorr = opts.indexOf(cpuAns) >= 0
        ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer)
        : cpuAns === q.correct_answer

      if (sCorr) { setStudentScore(s => s+10); setStudentDots(d => d+1); animateFloat('student') }
      if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); if (!sCorr) animateFloat('cpu') }

      answersLog.current[qIndex] = { ...answersLog.current[qIndex], isCorrect:sCorr, is_correct:sCorr, selectedIdx }
      setCpuAnswered(true)
      setRevealed(true)
      setExplOpen(false)
    } else {
      if (qIndex < questions.length - 1) {
        setQIndex(i => i+1)
        setSelectedIdx(null)
        setRevealed(false)
        setTimerKey(k => k+1)
        setExplOpen(false)
      } else {
        finishMatch()
      }
    }
  }

  const handleTimerUp = useCallback(() => {
    if (revealed) return
    const q     = questions[qIndex]
    const opts  = normaliseOptions(q.options)
    const cpuAns= cpuChoices.current[qIndex]
    const cCorr = opts.indexOf(cpuAns) >= 0
      ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer)
      : cpuAns === q.correct_answer
    if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); animateFloat('cpu') }
    answersLog.current[qIndex] = { ...answersLog.current[qIndex], isCorrect:false, is_correct:false, selectedIdx:null }
    setCpuAnswered(true)
    setRevealed(true)
    setExplOpen(false)
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

  // ── Phase renders ──────────────────────────────────────────────────────────
  if (phase==='loading'||phase==='saving') return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg-base)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <div style={{ width:34, height:34, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'#1264E5', animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>{phase==='saving'?'Saving results…':'Loading questions…'}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (phase==='error') return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg-base)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
      <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center' }}>{errMsg}</div>
      <button onClick={() => router.push('/student/battle')} style={{ padding:'12px 24px', borderRadius:12, background:NAVY, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontFamily:'inherit' }}>Back to Battle</button>
    </div>
  )
  if (phase==='countdown') return <Countdown onDone={() => setPhase('battle')}/>
  if (phase==='results') return (
    <BattleResults
      questions={questions} answersLog={answersLog.current} cpuAnswers={cpuChoices.current}
      studentScore={saveData.finalS} cpuScore={saveData.finalC} xpAwarded={saveData.xp}
      onRematch={() => { try{sessionStorage.setItem('battle_config',JSON.stringify(config))}catch{} window.location.reload() }}
      onNewBattle={() => router.push('/student/battle/setup')}
      onHome={() => router.push('/student/home')}
    />
  )

  // ── Active battle ──────────────────────────────────────────────────────────
  const q    = questions[qIndex]
  const opts = q ? normaliseOptions(q.options) : []
  const cpuAns = cpuChoices.current[qIndex]
  const cpuIdx = cpuAns ? opts.indexOf(cpuAns) : -1
  const isLast = qIndex >= questions.length - 1

  // Canvas background colour — light indigo/blue matching reference
  const canvas = dark ? '#0a0c14' : '#EEF2FF'

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes floatup{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-32px);opacity:0}}
        @keyframes slidein{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes cdpop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        .tile-btn{transition:transform .12s,box-shadow .12s}
        .tile-btn:active .tile-inner{transform:translateY(3px)!important}
        @media(max-width:360px){.q-illus{display:none}.xp-dots{display:none}}
        @media(max-width:480px){.tile-deco{display:none}}
        @media(max-height:580px){.q-illus{display:none}.xp-dots{display:none}}
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:canvas, display:'flex', flexDirection:'column', overflow:'hidden', paddingTop:'env(safe-area-inset-top)' }}>

        <BgShapes/>

        {/* ── TOP BAR ───────────────────────────────────────────────────── */}
        <div style={{ background:'#062A78', flexShrink:0, zIndex:10, boxShadow:'0 4px 16px rgba(6,42,120,.5)' }}>
          {/* Row 1: Menu + Q counter */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px 0', gap:8 }}>
            <button onClick={() => { clearTimeout(cpuTimer.current); router.push('/student/battle') }} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', borderRadius:9, padding:'7px 10px', color:'#fff', fontSize:12, fontWeight:700, fontFamily:'inherit', cursor:'pointer', flexShrink:0 }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
              <span style={{ display:'none' }} className="menu-label">Menu</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', borderRadius:9, padding:'7px 10px', color:'#fff', fontSize:11, fontWeight:800, flexShrink:0, whiteSpace:'nowrap' }}>
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L8.5 5l4 .5-3 2.5.7 4-3.7-2-3.7 2 .7-4-3-2.5 4-.5z" fill="white" opacity=".7"/></svg>
              Question {qIndex+1} of {questions.length}
            </div>
          </div>
          {/* Row 2: VS Strip */}
          <div style={{ padding:'6px 12px 10px', position:'relative' }}>
            <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
              {/* Student */}
              <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, padding:'7px 8px 7px 7px', borderRadius:'12px 0 0 12px', background:'rgba(18,100,229,.95)', border:'1.5px solid rgba(255,255,255,.15)', borderRight:'none', minWidth:0 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(255,255,255,.5)', flexShrink:0, overflow:'hidden', boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}><PlayerAvatar/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.65)', lineHeight:1 }}>YOU</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1.15, fontVariantNumeric:'tabular-nums' }}>{studentScore}</div>
                  <div className="xp-dots" style={{ display:'flex', gap:3, marginTop:3 }}>
                    {Array.from({length:5}).map((_,i) => <div key={i} style={{ width:9, height:5, borderRadius:3, background:i<studentDots?GOLD:'rgba(255,255,255,.22)', flexShrink:0, transition:'background .3s' }}/>)}
                  </div>
                </div>
              </div>
              {/* VS */}
              <div style={{ width:40, height:40, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:NAVY, boxShadow:`0 0 0 3px rgba(255,184,0,.25),0 3px 10px rgba(0,0,0,.4)`, zIndex:2, flexShrink:0, margin:'0 -4px', alignSelf:'center', position:'relative' }}>VS</div>
              {/* CPU */}
              <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, padding:'7px 7px 7px 8px', borderRadius:'0 12px 12px 0', background:'rgba(124,58,237,.95)', border:'1.5px solid rgba(255,255,255,.15)', borderLeft:'none', flexDirection:'row-reverse', minWidth:0 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(255,255,255,.5)', flexShrink:0, overflow:'hidden', boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}><CPUAvatar/></div>
                <div style={{ flex:1, minWidth:0, textAlign:'right' }}>
                  <div style={{ fontSize:8, fontWeight:900, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.65)', lineHeight:1 }}>CPU</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#fff', lineHeight:1.15, fontVariantNumeric:'tabular-nums' }}>{cpuScore}</div>
                  <div className="xp-dots" style={{ display:'flex', gap:3, marginTop:3, flexDirection:'row-reverse' }}>
                    {Array.from({length:5}).map((_,i) => <div key={i} style={{ width:9, height:5, borderRadius:3, background:i<cpuDots?GOLD:'rgba(255,255,255,.22)', flexShrink:0, transition:'background .3s' }}/>)}
                  </div>
                </div>
              </div>
            </div>
            {/* Float animations */}
            {floatSide && (
              <div key={floatKey} style={{ position:'absolute', top:0, [floatSide==='student'?'left':'right']:48, fontSize:14, fontWeight:900, color:floatSide==='student'?GREEN:RED, animation:'floatup .8s ease-out forwards', pointerEvents:'none', zIndex:20 }}>+10</div>
            )}
          </div>
        </div>

        {/* ── CANVAS ────────────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 12px 0', gap:12 }}>
          <div style={{ width:'100%', maxWidth:680, display:'flex', flexDirection:'column', gap:12, animation:'slidein .3s ease' }}>

            {/* ── QUESTION CARD ───────────────────────────────────────── */}
            {q && (
              <div style={{ position:'relative' }}>
                {/* Subject pill floating above card */}
                <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:GOLD, border:'2.5px solid #fff', borderRadius:999, padding:'5px 18px', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:900, color:NAVY, whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(255,184,0,.35),0 2px 4px rgba(0,0,0,.2)', zIndex:5 }}>
                  <span>{subjectIllustration(config?.subject_name)}</span>
                  <span>{config?.subject_name || q.subject_name || 'Question'}</span>
                  {config?.timerEnabled && !revealed && (
                    <TimerRing key={timerKey} secs={config.timerSecs||30} onTimeUp={handleTimerUp} revealed={revealed}/>
                  )}
                </div>
                {/* Card */}
                <div style={{ background:dark?'#111827':'#fff', border:`3px solid #1E3A8A`, borderRadius:22, boxShadow:dark?'0 6px 0 rgba(30,58,138,.3),0 10px 28px rgba(6,42,120,.15)':'0 8px 0 rgba(30,58,138,.25),0 12px 32px rgba(6,42,120,.1)', overflow:'visible', position:'relative' }}>
                  {/* Connector nodes */}
                  {[{pos:'left',style:{left:-9}},{pos:'right',style:{right:-9}}].map(({pos,style})=>(
                    <div key={pos} style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', width:16, height:16, borderRadius:'50%', background:'#1E3A8A', border:`2.5px solid ${dark?'#111827':'#fff'}`, boxShadow:'0 2px 4px rgba(0,0,0,.2)', ...style }}/>
                  ))}
                  <div style={{ padding:'28px 18px 18px', display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1, fontSize:16, fontWeight:800, color:dark?'#bfdbfe':'#1E3A8A', lineHeight:1.65, minWidth:0, wordBreak:'break-word' }}>
                      <MathText text={q.text ?? q.question_text ?? ''} as="span" className=""/>
                    </div>
                    <div className="q-illus" style={{ fontSize:44, flexShrink:0, alignSelf:'center', filter:'drop-shadow(0 3px 6px rgba(0,0,0,.15))' }}>
                      {subjectIllustration(config?.subject_name)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2×2 TILES ───────────────────────────────────────────── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {opts.map((opt, idx) => {
                const tile    = TILE_COLORS[idx]
                const isCorrect = checkCorrect(opts, idx, q?.correct_answer)
                const isSelStudent = selectedIdx === idx
                const isCPU   = cpuIdx === idx

                let bg     = tile.bg
                let shadow = `0 6px 0 ${tile.shadow}, 0 8px 20px ${tile.glow}`
                let letterBg = 'rgba(255,255,255,.25)'
                let opacity = 1
                let borderC = 'transparent'

                if (revealed) {
                  if (isCorrect) { bg='#22c55e'; shadow='0 5px 0 #15803d,0 8px 20px rgba(34,197,94,.35)'; letterBg='rgba(255,255,255,.35)' }
                  else if (isSelStudent && !isCorrect) { bg='#f43f5e'; shadow='0 5px 0 #9f1239,0 8px 20px rgba(244,63,94,.3)'; letterBg='rgba(255,255,255,.35)' }
                  else { opacity=.45; shadow='none' }
                } else if (isSelStudent) {
                  borderC='rgba(255,255,255,.6)'; shadow=`0 4px 0 ${tile.shadow}`; letterBg='rgba(255,255,255,.35)'
                }

                return (
                  <button
                    key={idx}
                    className="tile-btn"
                    onClick={() => handleSelect(idx)}
                    disabled={revealed}
                    style={{ background:'none', border:'none', padding:0, cursor:revealed?'default':'pointer', borderRadius:16, opacity, WebkitTapHighlightColor:'transparent', position:'relative' }}
                  >
                    <div className="tile-inner" style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 12px', borderRadius:16, background:bg, boxShadow:shadow, border:`2px solid ${borderC}`, minHeight:58, transition:'transform .12s,box-shadow .12s', transform:isSelStudent&&!revealed?'translateY(3px)':'none' }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:letterBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:'inset 0 2px 4px rgba(0,0,0,.15)' }}>
                        {revealed && isCorrect ? '✓' : revealed && isSelStudent && !isCorrect ? '✗' : LETTERS[idx]}
                      </div>
                      <div className="tile-text" style={{ flex:1, fontSize:13, fontWeight:800, color:'#fff', textAlign:'left', lineHeight:1.35, minWidth:0, wordBreak:'break-word' }}>
                        <MathText text={String(opt??'')} as="span" className=""/>
                      </div>
                      <div className="tile-deco" style={{ flexShrink:0 }}>{DECOS[idx]}</div>
                    </div>
                    {/* Markers */}
                    {revealed && (isSelStudent || isCPU) && (
                      <div style={{ position:'absolute', top:-8, right:10, display:'flex', gap:3, zIndex:5 }}>
                        {isSelStudent && <div style={{ width:22, height:22, borderRadius:999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, boxShadow:'0 2px 6px rgba(0,0,0,.2)' }}>👤</div>}
                        {isCPU && !isSelStudent && <div style={{ width:22, height:22, borderRadius:999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, boxShadow:'0 2px 6px rgba(0,0,0,.2)' }}>🤖</div>}
                        {isCPU && isSelStudent && <div style={{ width:22, height:22, borderRadius:999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, boxShadow:'0 2px 6px rgba(0,0,0,.2)' }}>👤🤖</div>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── CPU INDICATOR ───────────────────────────────────────── */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12, background:cpuAnswered?(dark?'rgba(34,197,94,.08)':'rgba(34,197,94,.06)'):(dark?'rgba(124,58,237,.1)':'rgba(124,58,237,.07)'), border:`1px solid ${cpuAnswered?(dark?'rgba(34,197,94,.2)':'rgba(34,197,94,.15)'):(dark?'rgba(124,58,237,.2)':'rgba(124,58,237,.15)')}`, fontSize:12, fontWeight:700, color:cpuAnswered?(dark?'#34d399':'#059669'):(dark?'#a78bfa':'#7C3AED'), transition:'all .3s' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="2" fill="currentColor" opacity=".7"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="6" y1="12" x2="6" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="10" y1="12" x2="10" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="6" x2="4" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="12" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="12" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              {cpuAnswered ? 'CPU has selected an answer ✓' : (
                <span>CPU is thinking <span style={{ display:'inline-flex', gap:2, marginLeft:2 }}>
                  {[0,1,2].map(i=><span key={i} style={{ width:4, height:4, borderRadius:'50%', background:'currentColor', display:'inline-block', animation:`dot${i} 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
                </span></span>
              )}
              <style>{`@keyframes dot0{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}@keyframes dot1{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}@keyframes dot2{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
            </div>

            {/* ── REVEAL BANNER ────────────────────────────────────────── */}
            {revealed && (() => {
              const correct = selectedIdx !== null && checkCorrect(opts, selectedIdx, q?.correct_answer)
              const skipped = selectedIdx === null
              return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, flexWrap:'wrap', background:correct?(dark?'rgba(34,197,94,.1)':'rgba(34,197,94,.07)'):skipped?'var(--bg-subtle)':(dark?'rgba(244,63,94,.08)':'rgba(244,63,94,.05)'), border:`1px solid ${correct?(dark?'rgba(34,197,94,.25)':'rgba(34,197,94,.18)'):skipped?'var(--border)':(dark?'rgba(244,63,94,.25)':'rgba(244,63,94,.15)')}` }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:correct?GREEN:skipped?'#6b7280':RED, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', flexShrink:0, boxShadow:`0 2px 6px ${correct?'rgba(34,197,94,.3)':skipped?'rgba(107,114,128,.2)':'rgba(244,63,94,.3)'}` }}>
                    {correct?'✓':skipped?'⏱':'✗'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:900, color:correct?(dark?'#34d399':'#059669'):skipped?'var(--text-sec)':(dark?'#f87171':RED) }}>
                      {correct?'Correct! +10 pts':skipped?`Time's up — 0 pts`:`Wrong — 0 pts`}
                    </div>
                    {!correct && !skipped && q?.correct_answer && (
                      <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>
                        Correct: <strong style={{ color:dark?'#34d399':'#059669' }}>{opts[opts.indexOf(q.correct_answer)] ?? q.correct_answer}</strong>
                      </div>
                    )}
                  </div>
                  {correct && <span style={{ fontSize:13, fontWeight:900, color:dark?GOLD:'#a06000', flexShrink:0 }}>+10 XP</span>}
                  {q?.explanation && (
                    <button onClick={() => setExplOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:8, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', border:`1px solid ${dark?'rgba(255,255,255,.12)':'rgba(6,42,120,.12)'}`, fontSize:11, fontWeight:800, color:'var(--text-sec)', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      📖 Explain
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transform:explOpen?'rotate(180deg)':'none', transition:'transform .2s' }}><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Explanation */}
            {revealed && explOpen && q?.explanation && (
              <div style={{ background:dark?'rgba(255,255,255,.04)':'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'13px 15px', fontSize:13, color:'var(--text-sec)', lineHeight:1.7, boxShadow:dark?'0 2px 8px rgba(0,0,0,.2)':'0 1px 4px rgba(6,42,120,.05)', animation:'slidein .2s ease' }}>
                <MathText text={typeof q.explanation==='string'?q.explanation:q.explanation?.text??q.explanation?.body??''} as="span" className=""/>
              </div>
            )}

            {/* Dot progress */}
            <div style={{ display:'flex', gap:5, justifyContent:'center', paddingTop:4 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ height:7, borderRadius:4, background:i<qIndex?GOLD:i===qIndex?NAVY:'rgba(30,58,138,.15)', width:i===qIndex?20:i<qIndex?16:8, transition:'all .25s' }}/>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ height:'max(80px,calc(70px + env(safe-area-inset-bottom)))', flexShrink:0 }}/>
          </div>
        </div>

        {/* ── BOTTOM BAR ────────────────────────────────────────────────── */}
        <div style={{ flexShrink:0, background:canvas, borderTop:`1.5px solid rgba(30,58,138,${dark?.06:.12})`, padding:'10px 14px', paddingBottom:'max(10px,env(safe-area-inset-bottom))', zIndex:10 }}>
          <button
            onClick={handleNext}
            style={{ width:'100%', padding:'13px', borderRadius:999, border:'none', cursor:'pointer', background:NAVY, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', letterSpacing:'-.01em', boxShadow:'0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'transform .1s,box-shadow .1s', WebkitTapHighlightColor:'transparent' }}
            onPointerDown={e=>{e.currentTarget.style.transform='translateY(3px)';e.currentTarget.style.boxShadow='0 1px 0 #031548'}}
            onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)'}}
            onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 #031548,0 6px 16px rgba(6,42,120,.2)'}}
          >
            {!revealed ? (selectedIdx===null?'Skip →':'Submit Answer') : isLast?'See Results':'Next Question →'}
            {!(!revealed && selectedIdx===null) && (
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M5 9h8M10 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
