'use client'
// src/app/student/practice/results/page.js — v7
// Changes vs v6:
//  • "Go again — Quick 5" and "Try another" buttons now write practice_config
//    to sessionStorage and navigate directly to /student/practice/session.
//    No modal, no round trip. Instant restart.
//  • Kept all review mode, score ring, confetti, XP pills unchanged.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { usePoints } from '@/contexts/PointsContext'
import { MathText } from '@/lib/mathRenderer'

function safeJson(val, fb) {
  if (!val) return fb
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fb }
}

function buildSummary(parsed) {
  let questions = [], answerMap = {}
  if (parsed.results && Array.isArray(parsed.results)) {
    questions = parsed.results
    for (const r of parsed.results) answerMap[r.id] = { isCorrect: r.isCorrect ?? false, selected: r.userAnswer }
  } else if (parsed.questions && Array.isArray(parsed.questions)) {
    questions = parsed.questions
    for (const a of (parsed.answers ?? [])) answerMap[a.questionId] = { isCorrect: a.isCorrect ?? false }
  }
  if (!questions.length) return { topics: [], subjects: {}, totalCorrect: 0, totalAnswered: 0, overallPct: 0, config: null }
  const byTopic = {}, bySubject = {}
  questions.forEach(q => {
    const tKey = q.topic_name || q.subtopic_name || 'General'
    const sKey = q.subject_name || 'General'
    const correct = answerMap[q.id]?.isCorrect ? 1 : 0
    if (!byTopic[tKey]) byTopic[tKey] = { name: tKey, subjectName: sKey, topicId: q.topic_id, total: 0, correct: 0 }
    byTopic[tKey].total++; byTopic[tKey].correct += correct
    if (!bySubject[sKey]) bySubject[sKey] = { name: sKey, total: 0, correct: 0 }
    bySubject[sKey].total++; bySubject[sKey].correct += correct
  })
  const totalCorrect  = questions.filter(q => answerMap[q.id]?.isCorrect).length
  const totalAnswered = questions.length
  const overallPct    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const topics        = Object.values(byTopic).sort((a, b) => (a.correct/a.total) - (b.correct/b.total))
  return { topics, subjects: bySubject, totalCorrect, totalAnswered, overallPct }
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, correct, total, size = 128 }) {
  const stroke = 10, r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => { const t = setTimeout(() => setDash((pct / 100) * circ), 120); return () => clearTimeout(t) }, [pct, circ])
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: 'drop-shadow(0 0 10px #1264E588)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1264E5" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.34,1.56,.64,1)' }}/>
      <text x={size/2} y={size/2 - 6} textAnchor="middle" style={{ fontSize: size*0.21, fontWeight: 900, fill: 'var(--text-prim)', fontFamily: 'inherit' }}>
        {correct !== undefined ? `${correct}/${total}` : `${pct}%`}
      </text>
      <text x={size/2} y={size/2 + 11} textAnchor="middle" style={{ fontSize: size*0.085, fill: 'var(--text-tert)', fontFamily: 'inherit' }}>correct</text>
    </svg>
  )
}

// ── Review mode ───────────────────────────────────────────────────────────────
function ReviewMode({ questions, answerMap, onClose }) {
  const isDark = useIsDark()
  const [idx, setIdx] = useState(0)
  const [showWhyModal, setShowWhyModal] = useState(false)
  const q = questions[idx], ans = q ? answerMap[q.id] : null
  const opts = q?.options ? safeJson(q.options, {}) : {}
  const optEntries = Object.entries(opts)
  const correct = q?.correct_answer
  const subColors = resolveSubjectColors(q?.subject_name || 'default', isDark)
  const accent = subColors.solid

  return (
    <div style={{ position:'fixed',inset:0,zIndex:500,background:'var(--bg-base)',display:'flex',flexDirection:'column' }}>
      <div style={{ flexShrink:0,height:56,display:'flex',alignItems:'center',gap:12,padding:'0 16px',borderBottom:'1px solid var(--border)',background:'var(--bg-card)' }}>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:10,background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-sec)',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-tert)' }}>Review answers</p>
          <p style={{ fontSize:12,fontWeight:700,color:'var(--text-prim)' }}>Question {idx + 1} of {questions.length}</p>
        </div>
        <div style={{ display:'flex',gap:6,flexShrink:0 }}>
          <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} style={{ width:32,height:32,borderRadius:10,background:'var(--bg-subtle)',border:'1px solid var(--border)',fontSize:14,cursor:idx===0?'not-allowed':'pointer',opacity:idx===0?0.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>←</button>
          <button onClick={()=>setIdx(i=>Math.min(questions.length-1,i+1))} disabled={idx>=questions.length-1} style={{ width:32,height:32,borderRadius:10,background:'var(--bg-subtle)',border:'1px solid var(--border)',fontSize:14,cursor:idx>=questions.length-1?'not-allowed':'pointer',opacity:idx>=questions.length-1?0.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>→</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:4,padding:'8px 16px',overflowX:'auto',flexShrink:0,borderBottom:'1px solid var(--border)',background:'var(--bg-card)' }}>
        {questions.map((qq,i)=>{
          const a=answerMap[qq.id];const isCurr=i===idx
          let bg='var(--bg-subtle)',bdr='1px solid var(--border)',col='var(--text-tert)'
          if(isCurr){bg=accent;bdr=`1px solid ${accent}`;col='#fff'}
          else if(a?.isCorrect){bg='#dcfce7';bdr='1px solid #86efac';col='#15803d'}
          else if(a&&!a.isCorrect){bg='#fee2e2';bdr='1px solid #fca5a5';col='#dc2626'}
          return(<button key={qq.id} onClick={()=>setIdx(i)} style={{ width:28,height:28,borderRadius:7,flexShrink:0,fontSize:10,fontWeight:800,background:bg,border:bdr,color:col,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>{i+1}</button>)
        })}
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:12,maxWidth:620,width:'100%',margin:'0 auto' }}>
        {q && (
          <>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff',background:ans?.isCorrect?'#22c55e':ans?'#ef4444':'var(--text-tert)' }}>{ans?.isCorrect?'✓':ans?'✗':'—'}</div>
              <div>
                <p style={{ fontSize:12,fontWeight:800,color:ans?.isCorrect?'#22c55e':ans?'#ef4444':'var(--text-tert)' }}>{ans?.isCorrect?'You got this right':ans?'You got this wrong':'Not answered'}</p>
                {q.subject_name&&<p style={{ fontSize:10,color:'var(--text-tert)' }}>{q.subject_name}{q.topic_name?` · ${q.topic_name}`:''}{q.year?` · ${q.year}`:''}</p>}
              </div>
            </div>
            <div style={{ borderRadius:16,background:'var(--bg-card)',border:'1px solid var(--border)',padding:'16px 18px' }}>
              <p style={{ fontSize:15,fontWeight:600,lineHeight:1.6,color:'var(--text-prim)' }}><MathText text={q.question_text??q.question??''} as="span"/></p>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
              {optEntries.map(([letter,text])=>{
                const isCorrectOpt=letter===correct;const isPickedOpt=ans?.selected===letter;const isWrongPick=isPickedOpt&&!isCorrectOpt
                let bg=isDark?'rgba(255,255,255,.04)':'#fafafa',border=isDark?'1.5px solid rgba(255,255,255,.08)':'1.5px solid #e5e7eb',textColor=isDark?'rgba(255,255,255,.6)':'#6b7280',letterBg=isDark?'rgba(255,255,255,.07)':'#f3f4f6',letterColor=isDark?'rgba(255,255,255,.4)':'#9ca3af',letterContent=letter
                if(isCorrectOpt){bg=isDark?'rgba(52,211,153,.1)':'#f0fdf4';border='2px solid #86efac';textColor=isDark?'#34d399':'#15803d';letterBg='#22c55e';letterColor='#fff';letterContent='✓'}
                else if(isWrongPick){bg=isDark?'rgba(248,113,113,.08)':'#fef2f2';border='2px solid #fca5a5';textColor=isDark?'#f87171':'#dc2626';letterBg='#ef4444';letterColor='#fff';letterContent='✗'}
                return(
                  <div key={letter} style={{ padding:'12px 14px',borderRadius:12,background:bg,border,display:'flex',alignItems:'flex-start',gap:12 }}>
                    <span style={{ width:28,height:28,borderRadius:8,flexShrink:0,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',background:letterBg,color:letterColor,marginTop:1 }}>{letterContent}</span>
                    <span style={{ fontSize:14,fontWeight:isCorrectOpt?600:400,lineHeight:1.5,color:textColor,flex:1,paddingTop:3 }}><MathText text={String(text??'')} as="span"/></span>
                    {isCorrectOpt&&<span style={{ fontSize:9,fontWeight:800,color:'#16a34a',background:'#dcfce7',borderRadius:6,padding:'2px 6px',flexShrink:0,marginTop:5 }}>CORRECT</span>}
                    {isWrongPick&&<span style={{ fontSize:9,fontWeight:800,color:'#dc2626',background:'#fee2e2',borderRadius:6,padding:'2px 6px',flexShrink:0,marginTop:5 }}>YOUR ANSWER</span>}
                  </div>
                )
              })}
            </div>
            {q&&(()=>{
              const expl=safeJson(q.explanation??q.explanation_json,{});const concept=expl.concept??'';const whyCorrect=expl.why_correct??expl.correct??''
              const hasExpl=concept||whyCorrect||(expl.workings?.length>0)||expl.misconception||Object.keys(expl.wrong_options??{}).length>0
              const snippet=concept||whyCorrect
              return(
                <div style={{ borderRadius:16,padding:'14px 16px 16px',background:'var(--bg-card)',border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:snippet?10:0 }}>
                    <div style={{ width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',background:ans?.isCorrect?'#22c55e':ans?.selected?'#ef4444':'#94a3b8' }}>{ans?.isCorrect?'✓':ans?.selected?'✗':'—'}</div>
                    <span style={{ fontSize:15,fontWeight:800,color:'var(--text-prim)' }}>{ans?.isCorrect?'Correct!':ans?.selected?`The correct answer is ${correct}`:'Not answered'}</span>
                  </div>
                  {snippet&&<p style={{ fontSize:13,color:'var(--text-sec)',lineHeight:1.6,marginBottom:hasExpl?10:0 }}>{snippet}</p>}
                  {hasExpl&&<button onClick={()=>setShowWhyModal(true)} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`${accent}14`,border:`1px solid ${accent}28`,fontSize:13,fontWeight:800,color:accent,cursor:'pointer' }}>💡 Why?</button>}
                </div>
              )
            })()}
          </>
        )}
      </div>
      <div style={{ flexShrink:0,padding:'12px 16px',borderTop:'1px solid var(--border)',background:'var(--bg-card)',display:'flex',gap:8,maxWidth:620,width:'100%',margin:'0 auto' }}>
        <button onClick={()=>{setIdx(i=>Math.max(0,i-1));setShowWhyModal(false)}} disabled={idx===0} style={{ flex:1,padding:'13px 0',borderRadius:14,fontSize:13,fontWeight:700,background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-sec)',cursor:idx===0?'not-allowed':'pointer',opacity:idx===0?0.4:1 }}>← Previous</button>
        {idx<questions.length-1
          ?<button onClick={()=>{setIdx(i=>i+1);setShowWhyModal(false)}} style={{ flex:1,padding:'13px 0',borderRadius:14,fontSize:13,fontWeight:800,background:'#1264E5',border:'none',color:'#fff',cursor:'pointer',boxShadow:'0 4px 0 #0a3fa0' }}>Next →</button>
          :<button onClick={onClose} style={{ flex:1,padding:'13px 0',borderRadius:14,fontSize:13,fontWeight:800,background:'#1264E5',border:'none',color:'#fff',cursor:'pointer',boxShadow:'0 4px 0 #0a3fa0' }}>Done ✓</button>
        }
      </div>
      {showWhyModal&&q&&<ReviewExplModal question={q} selectedKey={ans?.selected} accent={accent} onClose={()=>setShowWhyModal(false)} onNext={()=>{setShowWhyModal(false);if(idx<questions.length-1)setIdx(i=>i+1)}} isLast={idx>=questions.length-1}/>}
    </div>
  )
}

function ReviewExplModal({ question, selectedKey, accent, onClose, onNext, isLast }) {
  const isCorrect=selectedKey===question?.correct_answer
  const expl=safeJson(question?.explanation??question?.explanation_json,{})
  const concept=expl.concept??'';const whyCorrect=expl.why_correct??expl.correct??''
  const misconception=expl.misconception??'';const wrongOptions=expl.wrong_options??{};const workings=expl.workings??[]
  const myWrongReason=!isCorrect&&selectedKey?(wrongOptions[selectedKey]??''):''
  const otherWrong=Object.entries(wrongOptions).filter(([k])=>k!==question?.correct_answer)
  const subjectName=question?.subject_name??'';const isLangSubject=/english|literature|yoruba|igbo|hausa/i.test(subjectName)
  const tabs=[
    ...(workings.length>0?[{key:'worked',label:isLangSubject?'Explanation':'Worked solution'}]:[]),
    ...(workings.length===0?[{key:'explain',label:'Explanation'}]:[{key:'explain',label:'Why this answer'}]),
    ...(otherWrong.length>0?[{key:'wrong',label:'Distractors'}]:[]),
  ]
  const [tab,setTab]=useState(tabs[0]?.key??'explain')
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow=''}},[])
  return(
    <div style={{ position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,.65)',backdropFilter:'blur(6px)',display:'flex',flexDirection:'column' }} onClick={onClose}>
      <div style={{ marginTop:'auto',width:'100%',maxWidth:540,marginLeft:'auto',marginRight:'auto',background:'var(--bg-card)',borderRadius:'28px 28px 0 0',borderTop:'1px solid var(--border)',maxHeight:'88vh',boxShadow:'0 -20px 60px rgba(0,0,0,.3)',display:'flex',flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px' }}><div style={{ width:38,height:4,borderRadius:2,background:'var(--border)' }}/></div>
        <div style={{ padding:'4px 20px 12px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
            <div style={{ width:40,height:40,borderRadius:13,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',background:isCorrect?'#22c55e':'#ef4444',boxShadow:'0 3px 0 rgba(0,0,0,.18)' }}>{isCorrect?'✓':'✗'}</div>
            <div style={{ flex:1 }}><p style={{ fontSize:14,fontWeight:800,color:isCorrect?'#22c55e':'#ef4444',marginBottom:2 }}>{isCorrect?'Correct answer!':"Not quite — here's why"}</p><p style={{ fontSize:11,color:'var(--text-sec)' }}>Correct answer: <strong style={{ color:'var(--text-prim)' }}>{question?.correct_answer}</strong></p></div>
            <button onClick={onClose} style={{ width:30,height:30,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-tert)',fontSize:13,cursor:'pointer' }}>✕</button>
          </div>
          {tabs.length>1&&<div style={{ display:'flex',gap:3,padding:3,borderRadius:11,background:'var(--bg-subtle)' }}>{tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1,padding:'7px 4px',borderRadius:9,fontSize:11,fontWeight:700,cursor:'pointer',border:'none',background:tab===t.key?'var(--bg-card)':'transparent',color:tab===t.key?'var(--active-text)':'var(--text-tert)',boxShadow:tab===t.key?'0 1px 4px rgba(0,0,0,.08)':'none',fontFamily:'inherit' }}>{t.label}</button>)}</div>}
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'14px 20px 16px',display:'flex',flexDirection:'column',gap:10 }}>
          {tab==='worked'&&workings.map((step,i)=>(<div key={i} style={{ display:'flex',gap:10 }}>{!isLangSubject&&<span style={{ width:20,height:20,borderRadius:6,background:`${accent}18`,color:accent,fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>{i+1}</span>}<p style={{ fontSize:13,lineHeight:1.6,color:'var(--text-sec)',flex:1 }}><MathText text={typeof step==='string'?step:step.text??step.step??''} as="span"/></p></div>))}
          {tab==='explain'&&<>{concept&&<div style={{ display:'flex',gap:10,padding:'10px 14px',borderRadius:16,background:`${accent}12`,border:`1px solid ${accent}28` }}><span style={{ fontSize:15,flexShrink:0,marginTop:1 }}>💡</span><p style={{ fontSize:13,fontWeight:600,lineHeight:1.55,color:accent }}>{concept}</p></div>}{!isCorrect&&(myWrongReason||misconception)&&<div style={{ padding:'10px 14px',borderRadius:16,background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)' }}><p style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:'#ef4444',marginBottom:5 }}>Why {selectedKey} is wrong</p><p style={{ fontSize:13,lineHeight:1.6,color:'var(--text-sec)' }}><MathText text={myWrongReason||misconception} as="p"/></p></div>}{whyCorrect&&<div style={{ padding:'10px 14px',borderRadius:16,background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.2)' }}><p style={{ fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:isCorrect?'#22c55e':'var(--text-tert)',marginBottom:5 }}>{isCorrect?"Why you're right":`Why ${question?.correct_answer} is correct`}</p><p style={{ fontSize:13,lineHeight:1.6,color:'var(--text-sec)' }}><MathText text={whyCorrect} as="p"/></p></div>}</>}
          {tab==='wrong'&&otherWrong.map(([key,reason])=>(<div key={key} style={{ display:'flex',gap:10,padding:'9px 13px',borderRadius:14,background:'var(--bg-base)',border:'1px solid var(--border)' }}><span style={{ width:22,height:22,borderRadius:7,flexShrink:0,fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-sec)',marginTop:1 }}>{key}</span><p style={{ fontSize:13,lineHeight:1.55,flex:1,color:'var(--text-sec)' }}><MathText text={reason} as="span"/></p></div>))}
        </div>
        <div style={{ padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:8,flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1,padding:'13px 0',borderRadius:14,fontSize:13,fontWeight:700,background:'var(--bg-subtle)',border:'1px solid var(--border)',color:'var(--text-sec)',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
          <button onClick={onNext} style={{ flex:2,padding:'13px 0',borderRadius:14,fontSize:13,fontWeight:800,background:'#1264E5',border:'none',color:'#fff',cursor:'pointer',boxShadow:'0 4px 0 #0a3fa0',fontFamily:'inherit' }}>{isLast?'Done ✓':'Next question →'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PracticeResultsPage() {
  const router   = useRouter()
  const savedRef = useRef(false)
  const { setTotalPoints } = usePoints()

  const [summary,      setSummary]      = useState(null)
  const [saveResult,   setSaveResult]   = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [isStudy,      setIsStudy]      = useState(false)
  const [showReview,   setShowReview]   = useState(false)
  const [allQuestions, setAllQuestions] = useState([])
  const [answerMap,    setAnswerMap]    = useState({})
  const [isGuest,      setIsGuest]      = useState(false)
  const [lastConfig,   setLastConfig]   = useState(null) // stored to rebuild "Go again" config
  const [confettiPieces, setConfettiPieces] = useState([])

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_results')
    if (!raw) { router.push('/student/practice'); return }
    let parsed
    try { parsed = JSON.parse(raw) } catch { router.push('/student/practice'); return }

    if (parsed.results && Array.isArray(parsed.results)) {
      setAllQuestions(parsed.results)
      const aMap = {}
      for (const r of parsed.results) aMap[r.id] = { isCorrect: r.isCorrect ?? false, selected: r.userAnswer }
      setAnswerMap(aMap)
    }

    setSummary(buildSummary(parsed))
    setIsStudy(parsed.config?.answerMode === 'study')
    setLastConfig(parsed.config ?? null) // save config for "go again"

    const isGuestSession = !!parsed.config?.isGuest
    setIsGuest(isGuestSession)

    if (savedRef.current) return
    savedRef.current = true
    if (isGuestSession) return

    setSaving(true)
    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then(r => r.json())
      .then(data => {
        setSaveResult(data)
        setSaving(false)
        if (data.new_total_points != null) setTotalPoints(data.new_total_points)
      })
      .catch(() => setSaving(false))
  }, [router, setTotalPoints])

  useEffect(() => {
    if (!summary || summary.overallPct < 70) return
    const COLORS = ['#ff8fab','#9b7ae0','#fbbf24','#6cce8e','#5cb8ea','#f87171']
    const pieces = Array.from({ length: 48 }, (_, i) => ({
      id: i, left: `${Math.random() * 100}%`, color: COLORS[i % COLORS.length],
      width: 6 + Math.random() * 6, height: 6 + Math.random() * 6,
      delay: Math.random() * 0.8, duration: 1.6 + Math.random() * 1.8,
    }))
    setConfettiPieces(pieces)
    const t = setTimeout(() => setConfettiPieces([]), 4000)
    return () => clearTimeout(t)
  }, [summary?.overallPct]) // eslint-disable-line

  // ── "Go again" — write same config with Quick 5 mode and jump to session ──
  function goAgain() {
    const config = {
      ...(lastConfig ?? {}),
      count:       5,
      mode:        'mixed',
      answerMode:  'practice',
      topic:       null,
      topic_id:    null,
      topicName:   null,
      durationSecs: null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  // ── "Try another" — same subject, mixed, 10 questions ────────────────────
  function tryAnother() {
    // Go to practice page with modal auto-open signal
    router.push('/student/practice?modal=1')
  }

  if (!summary) return (
    <div style={{ minHeight:'100dvh',background:'var(--bg-base)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ width:28,height:28,borderRadius:'50%',border:'3px solid var(--border)',borderTopColor:'#1264E5',animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const xp          = saveResult?.points_awarded ?? Math.min(50, 5 + summary.totalCorrect * 2)
  const isGreatScore = summary.overallPct >= 70
  const sessionType = isStudy ? 'Study' : 'Practice'
  const wrongCount  = summary.totalAnswered - summary.totalCorrect

  return (
    <>
      <style>{`
        @keyframes exl-slide-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes exl-bounce-in { 0%{opacity:0;transform:scale(.8)} 60%{transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        @keyframes exl-shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes confettiFall  { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .go-again-btn:hover { opacity:.92; transform:translateY(-1px) }
        .go-again-btn:active { transform:translateY(2px)!important; box-shadow:0 2px 0 #0a3fa0!important }
      `}</style>

      <div style={{ minHeight:'100dvh',background:'var(--bg-base)',paddingBottom:48 }}>
        <div style={{ maxWidth:520,margin:'0 auto',padding:'0 16px' }}>

          {/* Confetti */}
          {confettiPieces.length > 0 && (
            <div style={{ position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:50 }}>
              {confettiPieces.map(p=>(
                <div key={p.id} style={{ position:'absolute',top:0,left:p.left,width:p.width,height:p.height,borderRadius:2,background:p.color,animation:`confettiFall ${p.duration}s ${p.delay}s linear forwards` }}/>
              ))}
            </div>
          )}

          {/* Header */}
          <div style={{ padding:'20px 0 16px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.12em',color:'var(--text-tert)' }}>{sessionType} complete</p>
              <h1 style={{ fontSize:22,fontWeight:900,color:'var(--text-prim)',letterSpacing:'-0.025em' }}>Your results</h1>
            </div>
            {saving&&<span style={{ fontSize:11,color:'var(--text-tert)',fontWeight:600 }}>Saving…</span>}
          </div>

          {/* Score hero */}
          <div style={{ textAlign:'center',marginBottom:20,animation:'exl-slide-up .4s ease' }}>
            <div style={{ display:'inline-block',marginBottom:14,animation:'exl-bounce-in .5s ease' }}>
              <ScoreRing pct={summary.overallPct} correct={summary.totalCorrect} total={summary.totalAnswered}/>
            </div>
            <p style={{ fontSize:21,fontWeight:900,color:'var(--text-prim)',letterSpacing:'-0.025em',marginBottom:4 }}>
              {isGreatScore?'Nice work! 🎉':summary.overallPct>=40?'📈 Keep going!':'📚 Every session counts'}
            </p>
            <p style={{ fontSize:12,color:'var(--text-tert)',marginBottom:16 }}>{summary.topics[0]?.name??'Practice session'}</p>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',animation:'exl-bounce-in .5s .1s ease both' }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:999,background:'rgba(255,184,0,.12)',border:'1.5px solid rgba(255,184,0,.28)' }}>
                <span>✦</span><span style={{ fontSize:12,fontWeight:800,color:'#FFB800' }}>+{xp} XP earned</span>
              </div>
              {summary.overallPct>=60&&(
                <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:999,background:'rgba(255,106,0,.12)',border:'1.5px solid rgba(255,106,0,.28)',animation:'exl-bounce-in .5s .15s ease both' }}>
                  <span>🔥</span><span style={{ fontSize:12,fontWeight:800,color:'#FF6A00' }}>Streak alive!</span>
                </div>
              )}
            </div>
          </div>

          {/* Review hero */}
          {allQuestions.length > 0 && (
            <button onClick={() => setShowReview(true)} style={{ width:'100%',marginBottom:14,padding:0,border:'none',background:'none',cursor:'pointer',textAlign:'left',display:'block' }}>
              <div style={{ borderRadius:20,background:'linear-gradient(135deg, #0c1f5e 0%, #1264E5 100%)',boxShadow:'0 6px 0 #0a3fa0, 0 10px 30px rgba(18,100,229,.35)',padding:'18px 20px',position:'relative' }}>
                <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)',backgroundSize:'200% 100%',animation:'exl-shimmer 3s infinite',pointerEvents:'none',borderRadius:20 }}/>
                {/* Score pills row */}
                <div style={{ display:'flex',gap:12,marginBottom:12,position:'relative',zIndex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:10,background:'rgba(34,197,94,.15)',border:'1px solid rgba(34,197,94,.25)' }}>
                    <span style={{ fontSize:13 }}>✓</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#4ade80' }}>{summary.totalCorrect} right</span>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:10,background:'rgba(248,113,113,.15)',border:'1px solid rgba(248,113,113,.25)' }}>
                    <span style={{ fontSize:13 }}>✗</span>
                    <span style={{ fontSize:14,fontWeight:900,color:'#f87171' }}>{wrongCount} wrong</span>
                  </div>
                </div>
                {/* CTA text */}
                <div style={{ position:'relative',zIndex:1 }}>
                  <p style={{ fontSize:16,fontWeight:900,color:'#fff',marginBottom:3,letterSpacing:'-0.02em' }}>Review questions & answers</p>
                  <p style={{ fontSize:12,color:'rgba(255,255,255,.55)',lineHeight:1.4 }}>
                    {wrongCount > 0 ? `See why those ${wrongCount} question${wrongCount!==1?'s':''} tripped you up` : 'See full explanations for all questions'}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Mastery hook */}
          {summary.overallPct < 90 && (
            <div style={{ padding:14,background:'var(--active-bg)',border:'1.5px solid var(--active-border)',borderRadius:14,marginBottom:12,animation:'exl-slide-up .4s .2s ease both' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'var(--text-sec)' }}>⚡ {summary.topics[0]?.subjectName??'Overall'} — {summary.overallPct}% this session</p>
                <span style={{ fontSize:10,fontWeight:800,color:'#18B7F2' }}>{summary.overallPct<70?'Push to 70%!':'Almost 90%!'}</span>
              </div>
              <div style={{ height:5,borderRadius:99,overflow:'hidden',background:'var(--border)' }}>
                <div style={{ height:'100%',width:`${summary.overallPct}%`,background:'linear-gradient(90deg,#18B7F2,#1264E5)',borderRadius:99,transition:'width .8s cubic-bezier(.34,1.56,.64,1)' }}/>
              </div>
              <p style={{ fontSize:10,color:'var(--text-tert)',marginTop:5 }}>One more quick session pushes your mastery up.</p>
            </div>
          )}

          {/* Zara reaction */}
          <div style={{ padding:'11px 13px',background:'rgba(18,100,229,.08)',border:'1.5px solid rgba(18,100,229,.22)',borderRadius:14,display:'flex',gap:10,alignItems:'center',marginBottom:14,animation:'exl-slide-up .4s .35s ease both' }}>
            <span style={{ fontSize:18,flexShrink:0 }}>{summary.overallPct>=80?'🌟':summary.overallPct>=60?'💪':'📚'}</span>
            <p style={{ fontSize:12,fontWeight:500,color:'var(--text-sec)',lineHeight:1.5 }}>
              {summary.overallPct>=80?`${summary.totalCorrect}/${summary.totalAnswered} correct — strong session! Go again to lock in that mastery.`
                :summary.overallPct>=60?`${summary.totalCorrect}/${summary.totalAnswered} correct — you're building. One more Quick 5 pushes you higher.`
                :`${summary.totalCorrect}/${summary.totalAnswered} correct — every session teaches you something. Keep going.`}
            </p>
          </div>

          {/* ── Go again — DIRECT to session, no modal ── */}
          {!isGuest && (
            <div style={{ padding:16,background:'rgba(255,184,0,.07)',border:'1.5px solid rgba(255,184,0,.18)',borderRadius:18,marginBottom:10,textAlign:'center',animation:'exl-slide-up .4s .3s ease both' }}>
              <p style={{ fontSize:15,fontWeight:900,color:'var(--text-prim)',marginBottom:4 }}>
                {summary.overallPct>=80?'Smash 90% next round 🔥':'Push your mastery higher ⚡'}
              </p>
              <p style={{ fontSize:12,color:'var(--text-tert)',marginBottom:14 }}>Same subject · 5 questions · starts immediately</p>
              <button onClick={goAgain} className="go-again-btn"
                style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 0',width:'100%',background:'linear-gradient(135deg,#FFB800,#FF6A00)',color:'#fff',borderRadius:14,fontSize:14,fontWeight:900,border:'none',cursor:'pointer',boxShadow:'0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.25)',letterSpacing:'-0.015em',position:'relative',overflow:'hidden',transition:'transform .15s, box-shadow .15s',fontFamily:'inherit' }}>
                <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)',backgroundSize:'200% 100%',animation:'exl-shimmer 2.5s infinite',pointerEvents:'none' }}/>
                Go again — Quick 5 ⚡
              </button>
            </div>
          )}

          {/* Secondary CTAs — also direct to session */}
          <div style={{ display:'flex',gap:8,marginBottom:14 }}>
            <button onClick={tryAnother}
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'12px 0',background:'var(--bg-card)',color:'var(--text-sec)',borderRadius:13,fontSize:12,fontWeight:700,border:'1px solid var(--border)',cursor:'pointer',fontFamily:'inherit' }}>
              Try another →
            </button>
            <Link href="/student/dashboard"
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'12px 0',background:'var(--bg-card)',color:'var(--text-sec)',borderRadius:13,fontSize:12,fontWeight:700,textDecoration:'none',border:'1px solid var(--border)' }}>
              Back home
            </Link>
          </div>

          <div style={{ paddingBottom:32 }}>
            <Link href="/student/progress"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 0',background:'#1264E5',color:'#fff',borderRadius:14,fontSize:14,fontWeight:800,textDecoration:'none',boxShadow:'0 5px 0 #0a3fa0',letterSpacing:'-0.01em' }}>
              View full progress →
            </Link>
          </div>

          {isGuest && (
            <div style={{ background:'#062A78',borderRadius:20,padding:'24px 20px',marginBottom:32 }}>
              <p style={{ fontSize:22,textAlign:'center',marginBottom:10 }}>🔓</p>
              <p style={{ fontSize:17,fontWeight:900,color:'#fff',textAlign:'center',marginBottom:6,letterSpacing:'-0.02em' }}>Save your progress</p>
              <p style={{ fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.5,textAlign:'center',marginBottom:16 }}>Create a free account to track your mastery and see where to go next.</p>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                <a href="/signup" style={{ display:'block',padding:'14px 0',borderRadius:13,background:'#FFB800',color:'#062A78',fontSize:15,fontWeight:900,textAlign:'center',textDecoration:'none',boxShadow:'0 4px 0 #d97706' }}>Create free account →</a>
                <a href="/login" style={{ display:'block',padding:'12px 0',borderRadius:13,background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.7)',fontSize:14,fontWeight:700,textAlign:'center',textDecoration:'none',border:'1px solid rgba(255,255,255,.12)' }}>Log in</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReview&&<ReviewMode questions={allQuestions} answerMap={answerMap} onClose={()=>setShowReview(false)}/>}
    </>
  )
}