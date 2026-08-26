'use client'
// src/app/student/practice/session/page.js — v1 (clean build)
// Full practice session: loads questions → renders one at a time →
// collects answers → shows results → saves to API.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function msToSecs(ms) { return Math.round(ms / 1000) }
function pct(a, b)   { return b > 0 ? Math.round((a / b) * 100) : 0 }

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ dark }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:'50%', border:`4px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text-tert)' }}>Loading questions…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── ERROR SCREEN ─────────────────────────────────────────────────────────────
function ErrorScreen({ message, onBack }) {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:24, background:'var(--bg-base)' }}>
      <div style={{ fontSize:48 }}>😕</div>
      <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', textAlign:'center' }}>Something went wrong</div>
      <div style={{ fontSize:14, color:'var(--text-tert)', textAlign:'center', maxWidth:340 }}>{message}</div>
      <button onClick={onBack} style={{ padding:'12px 28px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:800, fontFamily:'inherit' }}>← Back to Practice</button>
    </div>
  )
}

// ─── QUESTION CARD ────────────────────────────────────────────────────────────
function QuestionCard({ question, qIndex, total, onAnswer, answerMode, dark }) {
  const [selected,   setSelected]   = useState(null)
  const [revealed,   setRevealed]   = useState(false)
  const [startTime]                 = useState(Date.now())
  const options = question.options ?? []
  const letters = ['A','B','C','D','E']

  function handleSelect(opt, idx) {
    if (revealed) return
    setSelected(idx)
    const isCorrect = opt === question.correct_answer ||
                      letters[idx] === question.correct_answer ||
                      idx === question.correct_answer

    if (answerMode === 'instant') {
      setRevealed(true)
      setTimeout(() => {
        onAnswer({ isCorrect, selectedIdx: idx, timeTakenMs: Date.now() - startTime })
      }, 1200)
    } else {
      setRevealed(true) // show immediately in review mode too
    }
  }

  function handleNext() {
    if (selected === null) return
    const isCorrect = options[selected] === question.correct_answer ||
                      letters[selected] === question.correct_answer ||
                      selected === question.correct_answer
    onAnswer({ isCorrect, selectedIdx: selected, timeTakenMs: Date.now() - startTime })
  }

  function getOptionState(idx) {
    if (!revealed) return selected === idx ? 'selected' : 'idle'
    const letter = letters[idx]
    const isCorrectOpt = options[idx] === question.correct_answer || letter === question.correct_answer
    if (isCorrectOpt) return 'correct'
    if (idx === selected && !isCorrectOpt) return 'wrong'
    return 'idle'
  }

  const optColors = {
    idle:     { bg: dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.03)', border:'var(--border)',            text:'var(--text-prim)' },
    selected: { bg: `${BLUE}14`,                                        border:BLUE,                       text:BLUE },
    correct:  { bg: `${GREEN}14`,                                       border:GREEN,                      text:GREEN },
    wrong:    { bg: `${RED}12`,                                         border:RED,                        text:RED },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Progress bar */}
      <div style={{ height:5, background:'var(--border)', borderRadius:999, marginBottom:20, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct(qIndex+1, total)}%`, background:`linear-gradient(90deg,${BLUE},${BLUE}cc)`, borderRadius:999, transition:'width .4s ease' }}/>
      </div>

      {/* Meta */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:999, background:`${BLUE}14`, color:BLUE }}>Q {qIndex+1} / {total}</span>
          {question.topic_name && <span style={{ fontSize:11, color:'var(--text-tert)' }}>{question.topic_name}</span>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {question.year && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-tert)' }}>{question.year}</span>}
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-tert)', textTransform:'capitalize' }}>{question.difficulty}</span>
        </div>
      </div>

      {/* Question text */}
      <div style={{ fontSize:17, fontWeight:700, color:'var(--text-prim)', lineHeight:1.65, marginBottom:22, flex:'0 0 auto' }}>
        {question.text}
      </div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
        {options.map((opt, idx) => {
          const state = getOptionState(idx)
          const c     = optColors[state]
          return (
            <button key={idx} onClick={() => handleSelect(opt, idx)} disabled={revealed && state==='idle'}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:14, border:`2px solid ${c.border}`, background:c.bg, cursor:revealed&&state==='idle'?'default':'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .12s', width:'100%' }}>
              <div style={{ width:28, height:28, borderRadius:9, background:state==='idle'?dark?'rgba(255,255,255,.06)':'rgba(6,42,120,.06)':c.border, border:state==='idle'?'1px solid var(--border)':'none', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:state==='idle'?'var(--text-tert)':'#fff', fontSize:12, fontWeight:900 }}>
                {letters[idx]}
              </div>
              <span style={{ fontSize:14, fontWeight:600, color:c.text, lineHeight:1.45, flex:1 }}>{opt}</span>
              {state==='correct' && <span style={{ fontSize:18 }}>✓</span>}
              {state==='wrong'   && <span style={{ fontSize:18 }}>✗</span>}
            </button>
          )
        })}
      </div>

      {/* Explanation (review mode) */}
      {revealed && question.explanation && (
        <div style={{ marginTop:16, padding:'14px 16px', borderRadius:14, background:dark?'rgba(255,255,255,.04)':'rgba(18,100,229,.04)', border:`1px solid ${BLUE}25` }}>
          <div style={{ fontSize:11, fontWeight:800, color:BLUE, marginBottom:4, textTransform:'uppercase', letterSpacing:'.08em' }}>Explanation</div>
          <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6 }}>{question.explanation}</div>
        </div>
      )}

      {/* Next button (review mode) */}
      {revealed && answerMode === 'review' && (
        <button onClick={handleNext} style={{ marginTop:16, width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', boxShadow:`0 5px 0 #0a3fa0,0 8px 20px ${BLUE}40` }}>
          {qIndex < total-1 ? 'Next Question →' : 'See Results →'}
        </button>
      )}
    </div>
  )
}

// ─── TIMED BAR ────────────────────────────────────────────────────────────────
function TimedBar({ durationSecs, onTimeUp }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(e => {
        if (e+1 >= durationSecs) { clearInterval(iv); onTimeUp(); return durationSecs }
        return e+1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [durationSecs, onTimeUp])

  const remaining = durationSecs - elapsed
  const pctLeft   = pct(durationSecs - elapsed, durationSecs)
  const mins      = Math.floor(remaining / 60)
  const secs      = remaining % 60
  const color     = pctLeft > 40 ? GREEN : pctLeft > 20 ? ORANGE : RED

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:6, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pctLeft}%`, background:color, borderRadius:999, transition:'width 1s linear' }}/>
      </div>
      <span style={{ fontSize:13, fontWeight:900, color, minWidth:40, textAlign:'right' }}>
        {mins}:{String(secs).padStart(2,'0')}
      </span>
    </div>
  )
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, xpAwarded, streakDays, onRetry, onHome, dark }) {
  const correct  = answers.filter(a => a.isCorrect).length
  const total    = answers.length
  const accuracy = pct(correct, total)
  const color    = accuracy >= 70 ? GREEN : accuracy >= 40 ? ORANGE : RED

  const emoji    = accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : accuracy >= 40 ? '💪' : '📚'
  const msg      = accuracy >= 80 ? 'Excellent work!' : accuracy >= 60 ? 'Great effort!' : accuracy >= 40 ? 'Keep practising!' : 'Keep going — you\'re improving!'

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg-base)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:18 }}>
        {/* Score card */}
        <div style={{ borderRadius:22, overflow:'hidden', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,${NAVY},#1040a0)`, padding:'28px 24px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
          <div style={{ fontSize:52, marginBottom:12 }}>{emoji}</div>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.55)', marginBottom:8 }}>Session Complete</div>
          <div style={{ fontSize:64, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1 }}>{accuracy}%</div>
          <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.6)', marginTop:8 }}>{msg}</div>
          <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.5)', marginTop:6 }}>{correct} / {total} correct</div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { icon:'🎯', label:'Accuracy',   value:`${accuracy}%`,    color },
            { icon:'⚡', label:'XP Earned',  value:`+${xpAwarded}`,   color:GOLD },
            { icon:'🔥', label:'Streak',     value:`${streakDays}d`,  color:ORANGE },
          ].map((s,i)=>(
            <div key={i} style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', padding:'14px 12px', textAlign:'center' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.color, marginBottom:3 }}>{s.value}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Per-question review */}
        <div style={{ background:'var(--bg-card)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px 8px', fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>Question Review</div>
          {questions.map((q, i) => {
            const a = answers[i]
            if (!a) return null
            return (
              <div key={q.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 18px', borderTop:'1px solid var(--border)' }}>
                <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:a.isCorrect?`${GREEN}18`:`${RED}12`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
                  <span style={{ fontSize:14 }}>{a.isCorrect?'✓':'✗'}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text-prim)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{q.text}</div>
                  {!a.isCorrect && q.correct_answer && (
                    <div style={{ fontSize:11, color:GREEN, marginTop:3, fontWeight:700 }}>Correct: {q.correct_answer}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={onRetry} style={{ flex:1, padding:'14px', borderRadius:14, border:`1.5px solid ${BLUE}`, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:14, background:'transparent', color:BLUE }}>Try Again</button>
          <button onClick={onHome}  style={{ flex:1, padding:'14px', borderRadius:14, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:14, background:BLUE, color:'#fff', boxShadow:`0 5px 0 #0a3fa0` }}>Back to Practice</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN SESSION PAGE ────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router     = useRouter()
  const { dark }   = useTheme()

  const [phase,     setPhase]     = useState('loading') // loading | session | saving | results | error
  const [questions, setQuestions] = useState([])
  const [qIndex,    setQIndex]    = useState(0)
  const [answers,   setAnswers]   = useState([])
  const [config,    setConfig]    = useState(null)
  const [saveData,  setSaveData]  = useState(null) // xp, streak from save response
  const [errMsg,    setErrMsg]    = useState('')
  const startTimeRef  = useRef(Date.now())
  const sessionIdRef  = useRef(crypto.randomUUID()) // generated once, used for dedup

  // ── Load config from sessionStorage, then fetch questions ─────────────────
  useEffect(() => {
    let cfg
    try {
      cfg = JSON.parse(sessionStorage.getItem('practice_config') || '{}')
    } catch { cfg = {} }

    if (!cfg.subjects?.length && !cfg.subject_id) {
      setErrMsg('No practice configuration found. Please go back and set up a session.')
      setPhase('error')
      return
    }

    setConfig(cfg)

    const params = new URLSearchParams({
      exam:    cfg.examType || 'WAEC',
      subjects: (cfg.subjects || []).join(','),
      count:   String(cfg.count || 20),
      mode:    cfg.mode || 'mixed',
    })
    if (cfg.subject_id)  params.set('subject_id', cfg.subject_id)
    if (cfg.topic_id)    params.set('topic_id', cfg.topic_id)

    fetch(`/api/student/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        if (!data.questions?.length) {
          setErrMsg(`No questions found for ${cfg.subjects?.join(', ')}. Make sure questions have been added for this exam.`)
          setPhase('error')
          return
        }
        setQuestions(data.questions)
        startTimeRef.current = Date.now()
        // Persist config + session_id for recovery if save fails
        try {
          localStorage.setItem('ep_pending_session', JSON.stringify({
            session_id: sessionIdRef.current,
            config:     cfg,
            savedAt:    Date.now(),
          }))
        } catch {}
        setPhase('session')
      })
      .catch(err => {
        console.error(err)
        setErrMsg('Failed to load questions. Please check your connection and try again.')
        setPhase('error')
      })
  }, [])

  // ── Handle answer ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback((answer) => {
    const q = questions[qIndex]
    const newAnswer = {
      question_id:   q.id,
      topic_id:      q.topic_id,
      subject_id:    q.subject_id,
      isCorrect:     answer.isCorrect,
      is_correct:    answer.isCorrect,
      time_taken_ms: answer.timeTakenMs,
    }
    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)

    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1)
    } else {
      // Last question — save session
      saveSession(newAnswers)
    }
  }, [qIndex, questions, answers, config])

  // ── Save session ──────────────────────────────────────────────────────────
  async function saveSession(finalAnswers) {
    setPhase('saving')
    const durationSecs = msToSecs(Date.now() - startTimeRef.current)

    try {
      const res = await fetch('/api/student/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:    sessionIdRef.current,   // deduplication key
          exam:          config?.examType || 'WAEC',
          mode:          config?.mode || 'mixed',
          results:       finalAnswers,
          duration_secs: durationSecs,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        // Clear the pending session backup — successfully saved
        try { localStorage.removeItem('ep_pending_session') } catch {}
      }
      setSaveData(data.ok ? data : { xp_awarded: 0, streak_days: 0 })
    } catch {
      // Session stays in localStorage for potential recovery later
      setSaveData({ xp_awarded: 0, streak_days: 0 })
    }
    setPhase('results')
  }

  // ── Time up (timed mode) ──────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    const remaining = questions.slice(qIndex).map(q => ({
      question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
      isCorrect: false, is_correct: false, time_taken_ms: 0,
    }))
    const allAnswers = [...answers, ...remaining]
    setAnswers(allAnswers)
    saveSession(allAnswers)
  }, [qIndex, questions, answers, config])

  const isTimed    = config?.mode === 'timed'
  const answerMode = isTimed ? 'instant' : 'review'
  const q          = questions[qIndex]

  if (phase === 'loading' || phase === 'saving') return <LoadingScreen dark={dark}/>
  if (phase === 'error')   return <ErrorScreen message={errMsg} onBack={() => router.push('/student/practice')}/>

  if (phase === 'results') return (
    <ResultsScreen
      questions={questions}
      answers={answers}
      xpAwarded={saveData?.xp_awarded ?? 0}
      streakDays={saveData?.streak_days ?? 0}
      onRetry={() => router.push('/student/practice?modal=1')}
      onHome={() => router.push('/student/practice')}
      dark={dark}
    />
  )

  return (
    <>
      <style>{`* { box-sizing: border-box }`}</style>
      <div style={{ minHeight:'100dvh', background:'var(--bg-base)', display:'flex', flexDirection:'column' }}>
        {/* Top nav */}
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', backdropFilter:'blur(12px)' }}>
          <button onClick={() => router.push('/student/practice')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--text-tert)', fontSize:13, fontWeight:700, padding:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Practice
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {config?.subjects?.[0] && (
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>{config.subjects[0]}</span>
            )}
            <span style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.06)', color:'var(--text-tert)', textTransform:'capitalize' }}>{config?.mode}</span>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>{qIndex+1} / {questions.length}</span>
        </div>

        {/* Timer bar */}
        {isTimed && config?.durationSecs && (
          <div style={{ padding:'10px 20px 0', background:'var(--bg-card)' }}>
            <TimedBar durationSecs={config.durationSecs} onTimeUp={handleTimeUp}/>
          </div>
        )}

        {/* Question */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px', maxWidth:640, width:'100%', margin:'0 auto' }}>
          {q && (
            <QuestionCard
              key={q.id + qIndex}
              question={q}
              qIndex={qIndex}
              total={questions.length}
              onAnswer={handleAnswer}
              answerMode={answerMode}
              dark={dark}
            />
          )}
        </div>
      </div>
    </>
  )
}