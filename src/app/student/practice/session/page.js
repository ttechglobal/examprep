'use client'
// src/app/student/practice/session/page.js
// Orchestrates a practice session: loads questions, manages phase/state,
// renders the right screen. All UI components live in @/components/session/.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { saveSessionLocally, flushSyncQueue, readLocalStreak } from '@/lib/localSessionSync'

import { BLUE, CYAN, GREEN, RED, ORANGE, GOLD, pct, msToSecs } from '@/components/session/SessionUtils'
import { LoadingScreen, ErrorScreen, EndDialog, QuestionNav, SessionTimer, QuestionCountdown } from '@/components/session/SessionPrimitives'
import { ExplanationBlock } from '@/components/session/ExplanationBlock'
import { Calculator } from '@/components/session/Calculator'
import { QuestionCard } from '@/components/session/QuestionCard'
import { ReviewSession } from '@/components/session/ReviewSession'
import SessionResults from '@/components/student/SessionResults'

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints, showXPToast } = usePoints()

  const [phase,      setPhase]     = useState('loading')
  const [questions,  setQuestions] = useState([])
  const [qIndex,     setQIndex]    = useState(0)
  const [answerMap,  setAnswerMap] = useState({})
  const [skipped,    setSkipped]   = useState(new Set())
  const [config,     setConfig]    = useState(null)
  const [saveData,   setSaveData]  = useState(null)
  const [errMsg,     setErrMsg]    = useState('')
  const [showEnd,    setShowEnd]   = useState(false)
  const [dialogMode, setDialogMode]= useState('end')
  const [pendingMap, setPendingMap]= useState(null)
  const [showCalc,   setShowCalc]  = useState(false)

  const startTimeRef    = useRef(Date.now())
  const sessionIdRef    = useRef(crypto.randomUUID())
  const savedResultsRef = useRef(null)   // set by saveSession; read by results + review screens

  // ── Load questions ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cfg
    try { cfg = JSON.parse(sessionStorage.getItem('practice_config') || '{}') }
    catch { cfg = {} }
    if (!cfg.subjects?.length && !cfg.subject_id) {
      setErrMsg('No practice configuration found. Go back and set up a session.')
      setPhase('error'); return
    }
    setConfig(cfg)
    const p = new URLSearchParams({
      exam:     cfg.examType  || 'WAEC',
      subjects: (cfg.subjects || []).join(','),
      count:    String(cfg.count || 20),
      mode:     cfg.mode      || 'practice',
    })
    if (cfg.subject_id) p.set('subject_id', cfg.subject_id)
    if (cfg.topic_id)   p.set('topic_id',   cfg.topic_id)

    fetch(`/api/student/questions?${p}`)
      .then(r => r.json())
      .then(data => {
        if (!data.questions?.length) {
          setErrMsg(`No questions found for ${cfg.subjects?.join(', ')}.`)
          setPhase('error'); return
        }
        setQuestions(data.questions)
        startTimeRef.current = Date.now()
        try { localStorage.setItem('ep_pending_session', JSON.stringify({ session_id: sessionIdRef.current, config: cfg, savedAt: Date.now() })) } catch {}
        setPhase('session')
      })
      .catch(() => {
        setErrMsg('Failed to load questions. Check your connection and try again.')
        setPhase('error')
      })
  }, [])

  // ── Record answer ──────────────────────────────────────────────────────────
  const recordAnswer = useCallback((idx, answer) => {
    const q = questions[idx]
    const entry = {
      question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
      topic_name: q.topic_name || '', subject_name: q.subject_name || '',
      isCorrect: answer.isCorrect, is_correct: answer.isCorrect,
      selectedIdx: answer.selectedIdx, time_taken_ms: answer.timeTakenMs || 0,
    }
    setAnswerMap(prev => ({ ...prev, [idx]: entry }))
    setSkipped(prev => { const s = new Set(prev); s.delete(idx); return s })
  }, [questions])

  // ── Next / Submit ──────────────────────────────────────────────────────────
  function handleNext({ selectedIdx, isCorrect } = {}) {
    const isLast = qIndex >= questions.length - 1

    // Build the updated map synchronously so we never lose the last answer
    // to React's async batching when saveSession reads answerMap too early.
    let updatedMap = answerMap
    if (selectedIdx !== null && selectedIdx !== undefined) {
      const q = questions[qIndex]
      const entry = {
        question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
        topic_name: q.topic_name || '', subject_name: q.subject_name || '',
        isCorrect, is_correct: isCorrect, selectedIdx, time_taken_ms: 0,
      }
      updatedMap = { ...answerMap, [qIndex]: entry }
      setAnswerMap(updatedMap)
      setSkipped(prev => { const s = new Set(prev); s.delete(qIndex); return s })
    } else {
      setSkipped(prev => new Set([...prev, qIndex]))
    }

    if (isLast) {
      // Pass the fully-updated map directly so saveSession doesn't rely on
      // stale state captured before React flushes the setAnswerMap above.
      setDialogMode('submit')
      setPendingMap(updatedMap)
      setShowEnd(true)
    } else {
      setQIndex(i => i + 1)
    }
  }

  // ── Save session ───────────────────────────────────────────────────────────
  async function saveSession(mapOverride) {
    setPhase('saving')
    const map          = mapOverride ?? answerMap
    const durationSecs = msToSecs(Date.now() - startTimeRef.current)
    const results      = questions.map((q, i) => map[i] ?? {
      question_id: q.id, topic_id: q.topic_id, subject_id: q.subject_id,
      topic_name: q.topic_name || '', subject_name: q.subject_name || '',
      isCorrect: false, is_correct: false, selectedIdx: null, time_taken_ms: 0,
    })

    const correctCount = results.filter(r => r.is_correct).length
    const payload = {
      session_id:      sessionIdRef.current,
      exam:            config?.examType    || 'WAEC',
      mode:            config?.mode        || 'practice',
      subject_name:    config?.subjects?.[0] ?? 'Mixed',
      results,
      duration_secs:   durationSecs,
      questions_count: results.length,
      correct_count:   correctCount,
    }

    // Local-first: instant, never fails
    const localXP = Math.max(5,
      results.filter(r => r.selectedIdx !== null).length * 5 +
      correctCount * 10 +
      (results.length > 0 && Math.round((correctCount / results.length) * 100) >= 80 ? 50
        : Math.round((correctCount / results.length) * 100) >= 60 ? 25 : 0)
    )
    saveSessionLocally(payload, localXP)
    try { localStorage.removeItem('ep_pending_session') } catch {}

    // Freeze the final answers in a ref BEFORE setPhase so that both
    // SessionResults and ReviewSession always read the complete, correct list —
    // never a stale answerMap snapshot from React's async state queue.
    savedResultsRef.current = results

    setTotalPoints((currentXP || 0) + localXP)
    showXPToast(localXP, 'Practice session done!')
    // Read local streak (computed by saveSessionLocally → computeAndSaveStreak)
    const localStreak = readLocalStreak()
    setSaveData({ xp_awarded: localXP, streak_days: localStreak, duration_secs: durationSecs })
    setPhase('results')

    // Background sync — update streak from server response if available
    flushSyncQueue().then(synced => {
      if (synced > 0) {
        fetch('/api/student/profile')
          .then(r => r.ok ? r.json() : null)
          .then(prof => {
            if (prof?.total_points) setTotalPoints(prof.total_points)
            if (prof?.streak_days != null) {
              setSaveData(prev => prev ? { ...prev, streak_days: prof.streak_days } : prev)
            }
          })
          .catch(() => {})
      }
    }).catch(() => {})
  }

  const handleTimeUp      = useCallback(() => saveSession(), [answerMap, questions])
  const handleSpeedTimeUp = useCallback(() => {
    const q   = questions[qIndex]
    const entry = { question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:false, is_correct:false, selectedIdx:null, time_taken_ms:(config?.speedSecs??30)*1000 }
    const newMap = { ...answerMap, [qIndex]: entry }
    setAnswerMap(newMap)
    if (qIndex < questions.length - 1) setQIndex(i => i + 1)
    else saveSession(newMap)
  }, [qIndex, questions, answerMap, config])

  // ── Derived ────────────────────────────────────────────────────────────────
  const sessionType     = config?.sessionType ?? 'practice'
  const isSpeedRound    = config?.mode === 'timed'
  const hasOverallTimer = !isSpeedRound && !!(config?.durationSecs)
  const speedSecs       = isSpeedRound ? (config?.speedSecs ?? 30) : null
  const answeredCount   = Object.keys(answerMap).length
  // After saveSession runs, read from the frozen ref — not from answerMap state
  // which React may not have flushed yet when the results/review screens render.
  const answersArray = savedResultsRef.current
    ? savedResultsRef.current.map(r => ({ selectedIdx: r.selectedIdx, isCorrect: r.isCorrect ?? r.is_correct }))
    : questions.map((_, i) => answerMap[i] ?? null)
  const subjectLabel    = config?.subjects?.[0] ?? ''

  // Called immediately on selection in study mode — makes the desktop explanation
  // panel appear without waiting for the Next button click.
  // Defined here (after sessionType) so the closure captures the correct value.
  const handleAnswerChange = useCallback(({ selectedIdx, isCorrect }) => {
    if (sessionType !== 'study') return
    recordAnswer(qIndex, { isCorrect, selectedIdx, timeTakenMs: 0 })
  }, [qIndex, sessionType, recordAnswer])

  const modeLabel       = { study:'Study', practice:'Practice', timed:'Speed Round', quick5:'Quick 5', mock:'Mock Exam' }[config?.mode] ?? 'Practice'
  const q               = questions[qIndex]

  const navAnswerMap = {}
  for (let i = 0; i < questions.length; i++) {
    navAnswerMap[i] = { answered:!!answerMap[i], correct:answerMap[i]?.isCorrect??null, skipped:skipped.has(i) }
  }

  // ── Phase routing ──────────────────────────────────────────────────────────
  if (phase==='loading'||phase==='saving') return <LoadingScreen/>
  if (phase==='error')   return <ErrorScreen message={errMsg} onBack={() => router.push('/student/practice')}/>
  if (phase==='review')  return <ReviewSession questions={questions} answers={answersArray} onDone={() => setPhase('results')} dark={dark}/>
  if (phase==='results') return (
    <SessionResults
      questions={questions} answers={answersArray} config={config}
      xpAwarded={saveData?.xp_awarded??0} streakDays={saveData?.streak_days??0}
      durationSecs={saveData?.duration_secs ?? msToSecs(Date.now() - startTimeRef.current)}
      onRetry={() => router.push('/student/practice?modal=1')}
      onHome={() => router.push('/student/practice')}
      onReview={() => setPhase('review')}
      dark={dark}
    />
  )

  // ── Active session ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box }
        @keyframes spin { to { transform: rotate(360deg) } }
        .session-q-col, .rev-q-col { user-select: none; -webkit-user-select: none; }
        @media (min-width: 1024px) {
          .session-body { flex-direction: row !important; }
          .session-nav-col {
            width: 200px !important; flex-shrink: 0 !important;
            overflow-y: auto !important; min-height: 0 !important;
            border-right: 1px solid var(--border) !important;
            padding: 16px 12px !important;
          }
          .session-q-col { flex: 1 !important; min-width: 0 !important; max-width: 680px !important; min-height: 0 !important; overflow-y: auto !important; padding: 32px 40px !important; }
          .session-exp-col { flex: 1 !important; min-width: 360px !important; max-width: 560px !important; flex-shrink: 0 !important; min-height: 0 !important; overflow-y: auto !important; padding: 32px 28px 32px 0 !important; border-left: 1px solid var(--border) !important; }
          .session-nav-bottom { display: none !important; }
        }
        @media (max-width: 1023px) {
          .session-nav-col { display: none !important; }
          .session-exp-col { display: none !important; }
          /* leave room for the fixed bottom nav bar */
          .session-q-col { padding-bottom: 180px !important; }
          /* hide QuestionCard's inline nav on mobile — bottom bar handles it */
          .session-q-col .qcard-nav { display: none !important; }
        }
      `}</style>

      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {showEnd && (
        <EndDialog
          answered={answeredCount} total={questions.length} mode={dialogMode}
          onConfirm={() => { setShowEnd(false); saveSession(pendingMap ?? undefined) }}
          onCancel={() => { setShowEnd(false); setPendingMap(null) }}
        />
      )}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} dark={dark}/>}

        {/* TOP BAR */}
        <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'0 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
            <button onClick={() => { setDialogMode('end'); setShowEnd(true) }}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--text-tert)', fontSize:13, fontWeight:700, padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              End
            </button>
            <div style={{ textAlign:'center', flex:1, padding:'0 10px' }}>
              <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>{subjectLabel || 'Practice Session'}</div>
              {config?.topicName && <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>{config.topicName}</div>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {hasOverallTimer && <SessionTimer durationSecs={config.durationSecs} onTimeUp={handleTimeUp}/>}
              <button onClick={() => setShowCalc(c => !c)}
                style={{ width:32, height:32, borderRadius:9, background:showCalc?`${BLUE}15`:'var(--bg-subtle)', border:`1px solid ${showCalc?BLUE:'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:showCalc?BLUE:'var(--text-tert)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>
                {qIndex+1}<span style={{ color:'var(--border-strong)' }}>/</span>{questions.length}
              </span>
            </div>
          </div>
          <div style={{ height:4, background:'var(--bg-subtle)', overflow:'hidden', borderRadius:999 }}>
            <div style={{ height:'100%', width:`${pct(answeredCount, questions.length)}%`, background:`linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius:999, transition:'width .35s ease' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0 9px' }}>
            <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:999, background:`${BLUE}12`, color:BLUE }}>{modeLabel}</span>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{answeredCount}/{questions.length} answered</span>
          </div>
        </div>

        {/* BODY */}
        <div className="session-body" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

          {/* LEFT: question navigator (desktop) */}
          <div className="session-nav-col" style={{ background:'var(--bg-card)' }}>
            <div style={{ fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Questions</div>
            <QuestionNav total={questions.length} current={qIndex} answerMap={navAnswerMap} onJump={setQIndex} sessionType={sessionType} inline={true}/>
          </div>

          {/* CENTRE: question card */}
          <div className="session-q-col" style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
            {q && (
              <QuestionCard
                key={q.id + '-' + qIndex}
                question={q}
                qIndex={qIndex}
                total={questions.length}
                onNext={handleNext}
                onAnswerChange={handleAnswerChange}
                onPrev={() => setQIndex(i => Math.max(0, i-1))}
                sessionType={sessionType}
                speedSecs={speedSecs}
                onSpeedTimeUp={handleSpeedTimeUp}
                dark={dark}
                alreadyAnswered={answerMap[qIndex] ?? null}
                reviewMode={false}
                hideExplanation={sessionType !== 'study'}
                hideNav={false}
              />
            )}
          </div>

          {/* RIGHT: explanation panel (desktop, study mode only) */}
          {sessionType === 'study' && (
            <div className="session-exp-col" style={{ overflowY:'auto', background:'var(--bg-base)', padding: answerMap[qIndex] ? '0' : '0' }}>
              {q?.explanation && answerMap[qIndex] ? (
                <ExplanationBlock explanation={q.explanation} isCorrect={answerMap[qIndex]?.isCorrect} dark={dark}/>
              ) : (
                // Empty panel while question is unanswered — keeps layout stable
                <div style={{ height:'100%' }}/>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM: mobile only — numbered grid + Prev/Next/Submit */}
        <div className="session-nav-bottom" style={{ borderTop:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
          <QuestionNav
            total={questions.length}
            current={qIndex}
            answerMap={navAnswerMap}
            onJump={setQIndex}
            sessionType={sessionType}
            inline={false}
          />
          <div style={{ padding:'0 14px 12px', display:'flex', gap:10 }}>
            <button
              onClick={() => setQIndex(i => Math.max(0, i - 1))}
              disabled={qIndex === 0}
              style={{ flex:1, padding:'12px', borderRadius:13, border:'1px solid var(--border)', cursor:qIndex===0?'default':'pointer', fontFamily:'inherit', fontWeight:700, fontSize:14, background:'transparent', color:qIndex===0?'var(--text-tert)':'var(--text-sec)', opacity:qIndex===0?.4:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Prev
            </button>
            <button
              onClick={() => {
                const isLast = qIndex >= questions.length - 1
                if (isLast) { setDialogMode('submit'); setPendingMap(answerMap); setShowEnd(true) }
                else setQIndex(i => i + 1)
              }}
              style={{ flex:2, padding:'12px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:14, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0`, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {qIndex >= questions.length - 1 ? 'Submit' : 'Next'}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}