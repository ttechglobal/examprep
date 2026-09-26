'use client'
// src/app/student/battle/session/page.js
// Battle vs the computer: countdown, questions, reveal, results and review.
// The look (header, tiles, question card, review) is shared with 1v1 and lives
// in components/battle/arena.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import { createComputerOpponent, readLocalBattleStats, recordLocalBattleResult } from '@/lib/battleAI'
import { computeSessionXP } from '@/lib/xp'
import { saveSessionLocally } from '@/lib/localSessionSync'
import { normaliseOptions, checkCorrect } from '@/lib/answers'
import BattleBg from '@/components/battle/arena/BattleBg'
import VSHeader from '@/components/battle/arena/VSHeader'
import Countdown from '@/components/battle/arena/Countdown'
import TimerRing from '@/components/battle/arena/TimerRing'
import QuestionCard from '@/components/battle/arena/QuestionCard'
import AnswerTiles from '@/components/battle/arena/AnswerTiles'
import BattleReview from '@/components/battle/arena/BattleReview'
import ScoreDuel from '@/components/battle/arena/ScoreDuel'
import ResultHero from '@/components/battle/arena/ResultHero'
import { NAVY, NAVY2, GOLD, GOLD2, LETTERS, optionText } from '@/components/battle/arena/theme'

const CPU = { emoji: '🤖', label: 'CPU', color: '#6D28D9' }
const COUNTDOWN_MS = 2700

// Option texts in A/B/C/D order; the computer's pick is one of these strings.
function optionList(q) {
  return q ? normaliseOptions(q.options).map(optionText) : []
}
function correctIndex(opts, q) {
  return opts.findIndex((_, i) => checkCorrect(opts, i, q?.correct_answer))
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
    win:  { icon:'🏆', label:'You Won!',     sub:'Outstanding performance!'        },
    draw: { icon:'🤝', label:"It's a Draw!", sub:'A very close match!'             },
    loss: { icon:'🤖', label:'Computer Won', sub:"Keep practising — you'll get it!" },
  }[outcome]

  const shBtn    = `0 5px 0 #031548,0 8px 20px rgba(26,36,104,.35)`
  const shBtnPrs = `0 1px 0 #031548`
  const pr = e => { e.currentTarget.style.transform='translateY(3px)'; e.currentTarget.style.boxShadow=shBtnPrs }
  const rl = e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=shBtn }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <BattleBg/>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', position:'relative', zIndex:5 }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        <ResultHero tone={outcome} icon={OUTCOME.icon} title={OUTCOME.label} sub={OUTCOME.sub}
          meta={`${questions[0]?.subject_name ?? 'Battle'} · ${questions.length} questions`}/>

        {/* Score panels + VS */}
        <div style={{ background:'#D5E5F5', padding:'6px 16px 0' }}>
          <ScoreDuel
            left={{ label: 'YOU', score: studentScore, winner: outcome === 'win' }}
            right={{ label: 'COMPUTER', score: cpuScore, winner: outcome === 'loss' }}
          />
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


// Review rows in the shape the shared BattleReview expects.
function reviewItems(questions, answersLog, cpuChoices) {
  return questions.map((q, i) => {
    const opts = optionList(q)
    const mine = answersLog[i]?.selectedIdx ?? null
    const cpu  = cpuChoices[i] != null ? opts.indexOf(cpuChoices[i]) : -1
    return {
      text: q.text ?? q.question_text ?? '', options: opts, correctIdx: correctIndex(opts, q),
      mineIdx: mine, theirsIdx: cpu >= 0 ? cpu : null, points: 10,
      explanation: q.explanation, question: q,
    }
  })
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
  const [questionEndsAt, setQuestionEndsAt] = useState(null)   // timer end for the current question
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
  const countdownEndsAt = useRef(0)
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
        countdownEndsAt.current = Date.now() + COUNTDOWN_MS
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

  function startQuestionTimer() {
    setQuestionEndsAt(Date.now() + (config?.timerSecs || 30) * 1000)
  }

  function animateFloat(side) {
    setFloatSide(side); setFloatKey(k => k + 1)
    setTimeout(() => setFloatSide(null), 900)
  }

  function handleSelect(idx) { if (revealed) return; setSelectedIdx(idx); setPopKey(k => k + 1) }

  function handleNext() {
    if (!revealed) {
      const q    = questions[qIndex]
      const opts = optionList(q)
      const sCorr = selectedIdx !== null && checkCorrect(opts, selectedIdx, q.correct_answer)
      const cpuAns = cpuChoices.current[qIndex]
      const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
      if (sCorr) { setStudentScore(s => s+10); setStudentDots(d => d+1); animateFloat('me') }
      if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); if (!sCorr) animateFloat('opponent') }
      answersLog.current[qIndex] = { ...answersLog.current[qIndex], isCorrect:sCorr, is_correct:sCorr, selectedIdx }
      setCpuAnswered(true); setRevealed(true)
    } else {
      if (qIndex < questions.length - 1) {
        setQIndex(i => i+1); setSelectedIdx(null); setRevealed(false); setPopKey(0); startQuestionTimer()
      } else { finishMatch() }
    }
  }

  const handleTimerUp = useCallback(() => {
    if (revealed) return
    const q = questions[qIndex], opts = optionList(q)
    const cpuAns = cpuChoices.current[qIndex]
    const cCorr  = opts.indexOf(cpuAns) >= 0 ? checkCorrect(opts, opts.indexOf(cpuAns), q.correct_answer) : cpuAns === q.correct_answer
    if (cCorr) { setCpuScore(s => s+10); setCpuDots(d => d+1); animateFloat('opponent') }
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
      const opts = optionList(q)
      const cor = opts.indexOf(ans) >= 0 ? checkCorrect(opts, opts.indexOf(ans), q.correct_answer) : ans === q.correct_answer
      return acc + (cor ? 10 : 0)
    }, 0)
    const outcome = finalS > finalC ? 'win' : finalS < finalC ? 'loss' : 'draw'
    const xp      = computeSessionXP('battle', answersLog.current, { outcome })
    saveSessionLocally({ session_id:sessionId.current, exam:config?.exam||'WAEC', mode:'battle', session_type:'battle', opponent:'computer', opponent_score:finalC, battle_outcome:outcome, subject_name:config?.subject_name??'Mixed', results:answersLog.current, questions_count:questions.length, correct_count:correct }, xp)
    setTotalPoints((currentXP||0) + xp)
    showXPToast(xp, 'Battle done!')
    recordLocalBattleResult({ outcome, xp })
    fetch('/api/student/battle/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({outcome,xp_awarded:xp,session_id:sessionId.current})}).catch(()=>{})
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
      <BattleBg/>
      <div style={{ fontSize:18, fontWeight:900, color:NAVY2, textAlign:'center', position:'relative', zIndex:5 }}>{errMsg}</div>
      <button onClick={() => router.push('/student/battle')} style={{ padding:'12px 24px', borderRadius:12, background:NAVY2, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontFamily:'inherit', position:'relative', zIndex:5, boxShadow:'0 4px 0 #031548' }}>Back to Battle</button>
    </div>
  )
  if (phase==='countdown') return <Countdown endsAt={countdownEndsAt.current} onDone={() => { setPhase('battle'); startQuestionTimer() }}/>
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
    <BattleReview items={reviewItems(questions, answersLog.current, cpuChoices.current)} subject={config?.subject_name} opponent={CPU} onDone={() => setPhase('results')}/>
  )

  // ── Active battle ─────────────────────────────────────────────────────────
  const q      = questions[qIndex]
  const opts   = optionList(q)
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
        @keyframes modalin{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <BattleBg/>
        {paused && <PauseMenu onResume={() => setPaused(false)} onQuit={() => { clearTimeout(cpuTimer.current); router.push('/student/battle') }}/>}

        <VSHeader
          qIndex={qIndex} total={questions.length}
          me={{ score: studentScore, dots: studentDots }}
          opponent={{ label: 'COMPUTER', avatar: '🤖', score: cpuScore, dots: cpuDots, answered: cpuAnswered }}
          onMenu={() => setPaused(true)}
          float={floatSide ? { side: floatSide, key: floatKey } : null}
        />

        {/* Canvas */}
        <div ref={canvasRef} style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', position:'relative', zIndex:5, padding:'20px 20px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:'100%', maxWidth:860, display:'flex', flexDirection:'column', gap:14, animation:'slidein .3s ease' }}>

            {q && (
              <QuestionCard
                subject={config?.subject_name || q.subject_name}
                text={q.text ?? q.question_text}
                timer={config?.timerEnabled && !revealed && questionEndsAt
                  ? <TimerRing secs={config.timerSecs || 30} endsAt={questionEndsAt} onTimeUp={handleTimerUp}/>
                  : null}
              />
            )}

            <AnswerTiles
              options={opts}
              selectedIdx={selectedIdx}
              reveal={revealed ? { correctIdx: correctIndex(opts, q), theirsIdx: cpuIdx } : null}
              opponent={CPU}
              onSelect={handleSelect}
              popKey={popKey}
            />

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