'use client'
// src/app/student/practice/mock/page.js
// WAEC: 1 subject, 50q, 60min | JAMB: 2–4 subjects (user-selected), 40q each, 2hrs
//
// v2: always starts at "Choose your exam" (it used to skip straight to the
//     exam the Practice page was showing). Subjects come from the profile per
//     exam (hooks/useExamSubjects) instead of a list handed over in
//     sessionStorage('mock_config'), so their ids always match the exam.
//     Setup screens: components/student/mock/MockSetupScreens.jsx.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { saveSessionLocally, flushSyncQueue, readLocalStreak } from '@/lib/localSessionSync'
import { computeSessionXP } from '@/lib/xp'

import { BLUE, GREEN, RED, ORANGE, PURPLE, pct, msToSecs } from '@/components/session/SessionUtils'
import { ErrorScreen, EndDialog, SessionTimer } from '@/components/session/SessionPrimitives'
import { Calculator } from '@/components/session/Calculator'
import { QuestionCard } from '@/components/session/QuestionCard'
import { ReviewSession } from '@/components/session/ReviewSession'
import SessionResults from '@/components/student/SessionResults'
import { ExamChooser, MockSetup, MOCK_RULES } from '@/components/student/mock/MockSetupScreens'
import { useStudentUser } from '@/app/student/layout'
import { useExamSubjects } from '@/hooks/useExamSubjects'

const WAEC_COUNT = MOCK_RULES.WAEC.count
const WAEC_MINS  = MOCK_RULES.WAEC.mins
const JAMB_COUNT = MOCK_RULES.JAMB.perSubject
const JAMB_MINS  = MOCK_RULES.JAMB.mins

// ─── CBT QUESTION GRID ────────────────────────────────────────────────────────
function QuestionGrid({ total, current, answerMap, onJump, compact = false }) {
  const size = compact ? 30 : 34
  const radius = compact ? 8 : 9
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap: compact ? 5 : 6, padding: compact ? '12px 16px' : '14px 12px' }}>
      {Array.from({ length: total }, (_, i) => {
        const answered  = !!answerMap[i]
        const isCurrent = i === current
        let bg, border, color
        if (isCurrent)     { bg=BLUE;         border=BLUE;         color='#fff' }
        else if (answered) { bg=`${BLUE}18`;  border=`${BLUE}60`; color=BLUE   }
        else               { bg='var(--bg-subtle)'; border='var(--border)'; color='var(--text-tert)' }
        return (
          <button key={i} onClick={() => onJump(i)}
            style={{ width:size, height:size, borderRadius:radius, border:`2px solid ${border}`, background:bg, color, fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {i+1}
          </button>
        )
      })}
    </div>
  )
}

// ─── JAMB SUBJECT TABS ────────────────────────────────────────────────────────
function SubjectTabs({ subjects, activeIdx, answerMaps, onSwitch }) {
  return (
    <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', overflowX:'auto', flexShrink:0 }}>
      {subjects.map((s, i) => {
        const answered = Object.keys(answerMaps[i] ?? {}).length
        const isActive = i === activeIdx
        const done     = answered >= JAMB_COUNT
        return (
          <button key={i} onClick={() => onSwitch(i)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 14px', border:'none', borderBottom:`3px solid ${isActive?BLUE:'transparent'}`, background:'transparent', cursor:'pointer', fontFamily:'inherit', flexShrink:0, minWidth:72, gap:2 }}>
            <span style={{ fontSize:11, fontWeight:isActive?900:600, color:isActive?BLUE:'var(--text-tert)', whiteSpace:'nowrap' }}>{s.name.split(' ')[0]}</span>
            <span style={{ fontSize:10, color:done?GREEN:isActive?BLUE:'var(--text-tert)', fontWeight:700 }}>{answered}/{JAMB_COUNT}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function MockPage() {
  const router   = useRouter()
  const { dark } = useTheme()
  const { totalPoints: currentXP, setTotalPoints, showXPToast } = usePoints()

  const profile = useStudentUser()
  const [phase,     setPhase]    = useState('pick-exam')
  const [examType,  setExamType] = useState(null)
  const examSubjects = useExamSubjects(profile, examType ?? 'WAEC')
  const [sessionSubjects, setSessionSubjects] = useState([]) // user-selected for this session
  const [errMsg,    setErrMsg]   = useState('')
  const [config,    setConfig]   = useState(null)
  const [saveData,  setSaveData] = useState(null)
  const [showEnd,   setShowEnd]  = useState(false)
  const [showCalc,  setShowCalc] = useState(false)

  // WAEC
  const [questions, setQuestions] = useState([])
  const [qIndex,    setQIndex]    = useState(0)
  const [answerMap, setAnswerMap] = useState({})

  // JAMB
  const [activeTab,     setActiveTab]     = useState(0)
  const [subjectQs,     setSubjectQs]     = useState([])
  const [subjectLoaded, setSubjectLoaded] = useState([])
  const [answerMaps,    setAnswerMaps]    = useState([])

  const startTimeRef = useRef(Date.now())
  const sessionIdRef = useRef(crypto.randomUUID())
  const fetchedRef   = useRef(new Set())
  const qColRef      = useRef(null)
  const cardRef      = useRef(null)   // ref to QuestionCard — mobile bottom bar reads live selection

  useEffect(() => {
    if (qColRef.current) qColRef.current.scrollTop = 0
  }, [qIndex, activeTab])

  // ── Fetch one non-WAEC subject (JAMB) ────────────────────────────────────
  // examType is captured from state at call time — do NOT hardcode 'JAMB' here.
  const fetchSubjectQuestions = useCallback(async (idx, subList, resolvedExam) => {
    if (fetchedRef.current.has(idx)) return
    fetchedRef.current.add(idx)
    const s = subList[idx]
    if (!s?.id) return
    try {
      const p = new URLSearchParams({ exam: resolvedExam, subject_id: s.id, count: String(JAMB_COUNT), mode: 'mock' })
      const data = await fetch(`/api/student/questions?${p}`).then(r => r.json())
      setSubjectQs(prev => { const n=[...prev]; n[idx]=data.questions??[]; return n })
      setSubjectLoaded(prev => { const n=[...prev]; n[idx]=true; return n })
    } catch {
      setSubjectLoaded(prev => { const n=[...prev]; n[idx]=true; return n })
    }
  }, [])

  // ── Start ─────────────────────────────────────────────────────────────────
  async function handleStart(picked) {
    // picked: the subjects chosen on the setup screen, ids already for examType.
    const subList = picked
    setSessionSubjects(subList)
    setPhase('session')
    startTimeRef.current = Date.now()
    sessionIdRef.current = crypto.randomUUID()
    fetchedRef.current   = new Set()

    if (examType === 'WAEC') {
      const s = subList[0]
      setConfig(prev => ({ ...prev, activeSubject: s.name, subject_id: s.id }))
      try {
        const p = new URLSearchParams({ exam: 'WAEC', subject_id: s.id, count: String(WAEC_COUNT), mode: 'mock' })
        const data = await fetch(`/api/student/questions?${p}`).then(r => r.json())
        if (!data.questions?.length) { setErrMsg(`No questions found for ${s.name}.`); setPhase('error'); return }
        setQuestions(data.questions); setQIndex(0); setAnswerMap({})
      } catch { setErrMsg('Failed to load questions.'); setPhase('error') }
    } else {
      const len = subList.length
      setSubjectQs(Array(len).fill([])); setSubjectLoaded(Array(len).fill(false))
      setAnswerMaps(Array(len).fill({})); setActiveTab(0); setQIndex(0)
      fetchSubjectQuestions(0, subList, examType)
      for (let i = 1; i < len; i++) setTimeout(() => fetchSubjectQuestions(i, subList, examType), i * 800)
    }
  }

  function handleSwitchTab(idx) {
    setActiveTab(idx); setQIndex(0)
    if (!fetchedRef.current.has(idx)) fetchSubjectQuestions(idx, sessionSubjects, examType)
  }

  // ── Record answer immediately when option is tapped ───────────────────────
  function handleAnswerChange(idx, answer) {
    if (examType === 'WAEC') {
      const q = questions[idx]
      if (!q) return
      setAnswerMap(prev => ({ ...prev, [idx]: { question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:answer.isCorrect, is_correct:answer.isCorrect, selectedIdx:answer.selectedIdx, time_taken_ms:0 } }))
    } else {
      const q = (subjectQs[activeTab] ?? [])[idx]
      if (!q) return
      setAnswerMaps(prev => { const n=[...prev]; n[activeTab]={ ...n[activeTab], [idx]:{ question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:answer.isCorrect, is_correct:answer.isCorrect, selectedIdx:answer.selectedIdx, time_taken_ms:0 } }; return n })
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function saveSession() {
    const durationSecs = msToSecs(Date.now() - startTimeRef.current)
    const results = examType === 'WAEC'
      ? questions.map((q,i) => answerMap[i] ?? { question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:false, is_correct:false, selectedIdx:null, time_taken_ms:0 })
      : sessionSubjects.flatMap((_,i) => (subjectQs[i]??[]).map((q,j) => answerMaps[i]?.[j] ?? { question_id:q.id, topic_id:q.topic_id, subject_id:q.subject_id, topic_name:q.topic_name||'', subject_name:q.subject_name||'', isCorrect:false, is_correct:false, selectedIdx:null, time_taken_ms:0 }))
    const correctCount = results.filter(r => r.is_correct).length
    const payload = { session_id:sessionIdRef.current, exam:examType, mode:'mock', subject_name:examType==='WAEC'?(config?.activeSubject??'WAEC'):'JAMB Mock', results, duration_secs:durationSecs, questions_count:results.length, correct_count:correctCount }
    const localXP = computeSessionXP('mock', results)
    saveSessionLocally(payload, localXP)
    setTotalPoints((currentXP||0)+localXP)
    showXPToast(localXP, 'Mock exam complete!')
    const localStreak = readLocalStreak()
    setSaveData({ xp_awarded:localXP, streak_days:localStreak, duration_secs:durationSecs })
    setPhase('results')
    flushSyncQueue().then(s=>{ if(s>0) fetch('/api/student/profile').then(r=>r.ok?r.json():null).then(p=>{ if(p?.total_points)setTotalPoints(p.total_points); if(p?.streak_days!=null)setSaveData(prev=>prev?{...prev,streak_days:p.streak_days}:prev) }).catch(()=>{}) }).catch(()=>{})
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isWAEC       = examType === 'WAEC'
  const activeQs     = isWAEC ? questions : (subjectQs[activeTab]??[])
  const activeAmap   = isWAEC ? answerMap  : (answerMaps[activeTab]??{})
  const q            = activeQs[qIndex]
  const allQuestions = isWAEC ? questions : sessionSubjects.flatMap((_,i)=>subjectQs[i]??[])
  const allAnswers   = isWAEC ? questions.map((_,i)=>answerMap[i]??null) : sessionSubjects.flatMap((_,i)=>(subjectQs[i]??[]).map((__,j)=>answerMaps[i]?.[j]??null))
  const totalQs      = isWAEC ? WAEC_COUNT : sessionSubjects.length * JAMB_COUNT
  const durationS    = (isWAEC ? WAEC_MINS : JAMB_MINS) * 60
  const isTabLoading = !isWAEC && !subjectLoaded[activeTab]
  const jambBreakdown = !isWAEC ? sessionSubjects.map((s,i)=>({ name:s.name, correct:(subjectQs[i]??[]).filter((_,j)=>answerMaps[i]?.[j]?.isCorrect).length, total:(subjectQs[i]??[]).length })) : []

  // ── Phase routing ─────────────────────────────────────────────────────────
  if (phase==='error')     return <ErrorScreen message={errMsg} onBack={()=>router.push('/student/practice')}/>
  if (phase==='pick-exam') return <ExamChooser onPick={e=>{setExamType(e);setPhase('setup')}} onBack={()=>router.push('/student/practice')}/>
  if (phase==='setup')     return <MockSetup exam={examType} subjects={examSubjects.subjects} loading={examSubjects.loading} hasAny={examSubjects.hasAny} dark={dark} onStart={handleStart} onBack={()=>setPhase('pick-exam')}/>
  if (phase==='review')    return <ReviewSession
    questions={allQuestions}
    answers={allAnswers}
    onDone={() => setPhase('results')}
    dark={dark}
    subjects={!isWAEC ? sessionSubjects : undefined}
    subjectSize={!isWAEC ? JAMB_COUNT : undefined}
  />
  if (phase==='results')   return (
    <>
      <SessionResults
        questions={allQuestions} answers={allAnswers}
        config={{ ...config, mode:'mock', subjects:[isWAEC?(config?.activeSubject??'WAEC'):examType+' Mock'] }}
        xpAwarded={saveData?.xp_awarded??0} streakDays={saveData?.streak_days??0}
        durationSecs={saveData?.duration_secs??0}
        onRetry={()=>setPhase('pick-exam')}
        onHome={()=>router.push('/student/practice')}
        onReview={()=>setPhase('review')}
        dark={dark}
      />
      {!isWAEC && jambBreakdown.length > 0 && (
        <div style={{ padding:'0 16px 40px', maxWidth:520, margin:'0 auto' }}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:14 }}>Subject Breakdown</div>
            {jambBreakdown.map((s,i)=>{ const acc=s.total>0?Math.round(s.correct/s.total*100):0; const col=acc>=70?GREEN:acc>=40?ORANGE:RED; return (
              <div key={i} style={{ marginBottom:i<jambBreakdown.length-1?14:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)' }}>{s.name}</span>
                  <span style={{ fontSize:13, fontWeight:900, color:col }}>{s.correct}/{s.total}</span>
                </div>
                <div style={{ height:7, borderRadius:999, background:'var(--bg-subtle)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${acc}%`, background:col, borderRadius:999, transition:'width .8s ease' }}/>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </>
  )

  // ── Active session ────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box }
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (min-width: 1024px) {
          .mock-nav-col { display: flex !important; flex-direction: column !important; }
          .mock-q-grid-mobile { display: none !important; }
        }
        @media (max-width: 1023px) {
          .mock-nav-col { display: none !important; }
        }
      `}</style>

      {/* zIndex:1000 — covers StudentBottomNav (zIndex:100) and MobileTopbar */}
      <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--bg-base)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* EndDialog (zIndex:1200) and Calculator (zIndex:1200) sit above the */}
        {/* session container (zIndex:1000) so they are always clickable.       */}
        {showEnd && (
          <EndDialog
            answered={allAnswers.filter(Boolean).length} total={totalQs} mode="submit"
            onConfirm={()=>{ setShowEnd(false); saveSession() }}
            onCancel={()=>setShowEnd(false)}
          />
        )}
        {showCalc && <Calculator onClose={()=>setShowCalc(false)} dark={dark}/>}

        {/* TOP BAR */}
        <div style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)', padding:'0 16px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
            <button onClick={()=>setShowEnd(true)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', color:'var(--text-tert)', fontSize:13, fontWeight:700, padding:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              End
            </button>
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>{examType} Mock Exam</div>
              {isWAEC && config?.activeSubject && <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>{config.activeSubject}</div>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button onClick={()=>setShowCalc(c=>!c)}
                style={{ width:32, height:32, borderRadius:9, background:showCalc?`${BLUE}15`:'var(--bg-subtle)', border:`1px solid ${showCalc?BLUE:'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:showCalc?BLUE:'var(--text-tert)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <SessionTimer durationSecs={durationS} onTimeUp={()=>{ setShowEnd(false); saveSession() }}/>
            </div>
          </div>
          <div style={{ height:4, background:'var(--bg-subtle)', overflow:'hidden', borderRadius:999, margin:'5px 0' }}>
            <div style={{ height:'100%', width:`${pct(allAnswers.filter(Boolean).length, totalQs)}%`, background:`linear-gradient(90deg,${PURPLE},${BLUE})`, borderRadius:999, transition:'width .3s' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0 8px' }}>
            <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:999, background:`${PURPLE}12`, color:PURPLE }}>Mock Exam</span>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{allAnswers.filter(Boolean).length}/{totalQs} answered</span>
          </div>
        </div>

        {/* JAMB tabs */}
        {!isWAEC && <SubjectTabs subjects={sessionSubjects} activeIdx={activeTab} answerMaps={answerMaps} onSwitch={handleSwitchTab}/>}

        {/* BODY */}
        <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

          {/* LEFT: desktop question grid */}
          <div className="mock-nav-col" style={{ display:'none', width:220, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg-card)', overflowY:'auto' }}>
            <div style={{ padding:'12px 12px 4px', fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.08em' }}>Questions</div>
            <QuestionGrid total={activeQs.length} current={qIndex} answerMap={activeAmap} onJump={setQIndex}/>
            <div style={{ padding:'0 12px 12px', display:'flex', gap:10, flexWrap:'wrap' }}>
              {[{bg:`${BLUE}18`,border:`${BLUE}60`,label:'Answered'},{bg:'var(--bg-subtle)',border:'var(--border)',label:'Not done'}].map((l,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:l.bg, border:`1.5px solid ${l.border}` }}/>
                  <span style={{ fontSize:9, fontWeight:700, color:'var(--text-tert)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CENTRE: question */}
          {isTabLoading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
              <div style={{ fontSize:13, color:'var(--text-tert)', fontWeight:600 }}>Loading questions…</div>
            </div>
          ) : (
            <div ref={qColRef} style={{ flex:1, overflowY:'auto', padding:'20px 20px 0', maxWidth:700, width:'100%', margin:'0 auto' }}>
              {q ? (
                <>
                  <QuestionCard
                    ref={cardRef}
                    key={`${activeTab}-${q.id}-${qIndex}`}
                    question={q} qIndex={qIndex} total={activeQs.length}
                    onNext={() => {}}
                    onPrev={()=>setQIndex(i=>Math.max(0,i-1))}
                    onAnswerChange={ans => handleAnswerChange(qIndex, ans)}
                    sessionType="practice" dark={dark}
                    alreadyAnswered={activeAmap[qIndex]??null}
                    reviewMode={false} hideExplanation={true} hideHint={true} hideNav={true}
                  />
                  {/* Mobile question grid — below question card */}
                  <div className="mock-q-grid-mobile" style={{ marginTop:20, borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-card)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px 4px', fontSize:11, fontWeight:900, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.07em' }}>Questions</div>
                    <QuestionGrid total={activeQs.length} current={qIndex} answerMap={activeAmap} onJump={setQIndex} compact={true}/>
                  </div>
                  <div style={{ height:20 }}/>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:40, color:'var(--text-tert)', fontSize:14 }}>No questions available.</div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAV BAR */}
        <div style={{ borderTop:'1px solid var(--border)', background:'var(--bg-card)', padding:'12px 16px', display:'flex', gap:10, flexShrink:0, alignItems:'center' }}>
          <button onClick={()=>setQIndex(i=>Math.max(0,i-1))} disabled={qIndex===0}
            style={{ flex:1, padding:'12px', borderRadius:13, border:'1px solid var(--border)', cursor:qIndex===0?'default':'pointer', fontFamily:'inherit', fontWeight:700, fontSize:13, background:'transparent', color:qIndex===0?'var(--text-tert)':'var(--text-sec)', opacity:qIndex===0?.4:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Prev
          </button>
          <div style={{ flex:1, textAlign:'center' }}>
            <span style={{ fontSize:13, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>{qIndex+1} / {activeQs.length}</span>
          </div>
          <button onClick={()=>{
            // Flush the live selection from cardRef before advancing/submitting.
            // On mobile, React's async batching can leave answerMap stale at
            // the moment the student taps Next — reading the ref is synchronous
            // and always reflects the last tap.
            const live = cardRef.current?.getSelection()
            if (live?.selectedIdx !== null && live?.selectedIdx !== undefined) {
              handleAnswerChange(qIndex, { selectedIdx: live.selectedIdx, isCorrect: live.isCorrect })
            }
            const isLast = qIndex >= activeQs.length-1
            if (isLast) {
              if (examType==='WAEC') { setShowEnd(true); return }
              const nextTab = sessionSubjects.findIndex((_,i)=>i!==activeTab && Object.keys(answerMaps[i]??{}).length < JAMB_COUNT)
              if (nextTab!==-1) handleSwitchTab(nextTab); else setShowEnd(true)
            } else { setQIndex(i=>i+1) }
          }}
            style={{ flex:1, padding:'12px', borderRadius:13, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:13, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {qIndex>=activeQs.length-1 ? (isWAEC?'Submit':'Done') : 'Next'}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </>
  )
}