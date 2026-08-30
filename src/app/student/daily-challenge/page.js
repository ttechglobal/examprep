'use client'
// src/app/student/daily-challenge/page.js — v2
// Two challenge slots. Explanation rendered as structured object, not string.
// Uses setTotalPoints (not addPoints) from PointsContext.

import { useState, useEffect, useCallback } from 'react'
import { useStudentUser } from '@/app/student/layout'
import { usePoints }      from '@/contexts/PointsContext'
import { useTheme }       from '@/contexts/ThemeContext'
import { MathText }       from '@/lib/mathRenderer'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'

const LETTERS = ['A','B','C','D','E']
const MAX_ATTEMPTS = 2

function useCountdown() {
  const [t, setT] = useState('')
  useEffect(() => {
    function tick() {
      const now = new Date(), mid = new Date(); mid.setHours(24,0,0,0)
      const d = mid - now
      const h = Math.floor(d/3600000), m = Math.floor((d%3600000)/60000), s = Math.floor((d%60000)/1000)
      setT(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return t
}

function normaliseOptions(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return LETTERS.map(l => raw[l]).filter(v => v != null)
}

function ExplanationBox({ explanation }) {
  if (!explanation) return null
  if (typeof explanation === 'string') {
    return (
      <div style={{ padding:'12px 14px', borderRadius:12, background:`${CYAN}08`, border:`1px solid ${CYAN}20`, marginTop:12 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:CYAN, marginBottom:6 }}>Explanation</div>
        <p style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.65, margin:0 }}>
          <MathText text={explanation}/>
        </p>
      </div>
    )
  }
  const { concept='', intro='', answer_note='', correct='', study_tip='', steps=[] } = explanation
  const displayIntro = intro || answer_note || correct || ''
  const displaySteps = Array.isArray(steps) ? steps : []
  return (
    <div style={{ borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-subtle)', overflow:'hidden', marginTop:12 }}>
      <div style={{ padding:'12px 16px', borderBottom:displaySteps.length?'1px solid var(--border)':'none' }}>
        <div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:concept?6:0 }}>Explanation</div>
        {concept && <div style={{ fontSize:13, fontWeight:800, color:BLUE, marginBottom:displayIntro?5:0 }}><MathText text={concept}/></div>}
        {displayIntro && <p style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.65, margin:0 }}><MathText text={displayIntro}/></p>}
      </div>
      {displaySteps.map((step, i) => {
        const lines = Array.isArray(step?.lines) ? step.lines : []
        return (
          <div key={i} style={{ padding:'10px 16px', borderBottom:i<displaySteps.length-1?'1px solid var(--border)':'none' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:10, fontWeight:900, color:BLUE, background:`${BLUE}14`, border:`1px solid ${BLUE}25`, borderRadius:999, padding:'2px 8px', flexShrink:0, marginTop:2 }}>Step {i+1}</span>
              <div style={{ flex:1 }}>
                {step?.title && <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', marginBottom:lines.length?6:0 }}><MathText text={step.title}/></div>}
                {lines.map((line, li) => (
                  <div key={li} style={{ fontSize:13, color:'var(--text-sec)', lineHeight:2, padding:'2px 0' }}>
                    <MathText text={String(line ?? '')}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
      {study_tip && (
        <div style={{ padding:'10px 16px', background:`${GOLD}08`, borderTop:'1px solid var(--border)' }}>
          <span style={{ fontSize:11, fontWeight:700, color:GOLD }}>Tip: </span>
          <span style={{ fontSize:11, color:'var(--text-sec)' }}><MathText text={study_tip}/></span>
        </div>
      )}
    </div>
  )
}

function Pips({ used, max=2, correct }) {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
      {Array.from({length:max}).map((_,i) => {
        const filled = i < used
        const c = filled ? (correct && i===used-1 ? GREEN : RED) : 'transparent'
        return <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:c, border:`2px solid ${filled?(correct&&i===used-1?GREEN:RED):'var(--border)'}`, transition:'all .2s' }}/>
      })}
      <span style={{ fontSize:10, color:'var(--text-tert)', fontWeight:700, marginLeft:2 }}>{used}/{max} attempt{used!==1?'s':''}</span>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <style>{`@keyframes sk{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
      {[100,200,46,46,46].map((h,i) => <div key={i} style={{ height:h, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', animation:'sk 1.5s infinite' }}/>)}
    </div>
  )
}

function TodayBoard({ myId }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/student/daily-quiz/board').then(r=>r.ok?r.json():null).then(d=>{if(d?.board)setRows(d.board)}).catch(()=>{}).finally(()=>setLoading(false))
  }, [])
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)' }}>Today's Board</div>
        <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Students who answered today</div>
      </div>
      {loading ? (
        <div style={{ padding:'22px 18px', textAlign:'center', color:'var(--text-tert)', fontSize:12 }}>Loading…</div>
      ) : !rows.length ? (
        <div style={{ padding:'28px 18px', textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🧩</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', marginBottom:4 }}>No attempts yet today</div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>You could be the first! Answer today's challenge.</div>
        </div>
      ) : rows.map((row,i) => {
        const isMe = row.student_id === myId
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', borderBottom:i<rows.length-1?'1px solid var(--border)':'none', background:isMe?`${BLUE}08`:'transparent' }}>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:20, textAlign:'center', flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:`${BLUE}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:isMe?GOLD:BLUE }}>
              {(row.name||'?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{isMe?'You':row.name}</div>
              {row.school && <div style={{ fontSize:10, color:'var(--text-tert)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.school}</div>}
            </div>
            <div style={{ flexShrink:0, textAlign:'right' }}>
              <div style={{ fontSize:11, fontWeight:800, color:row.correct?GREEN:row.completed?RED:ORANGE }}>
                {row.correct ? '✓ Correct' : row.completed ? '✗ Missed' : '⏳ In progress'}
              </div>
              <div style={{ fontSize:10, color:'var(--text-tert)' }}>{row.attempts_used}/{MAX_ATTEMPTS} attempt{row.attempts_used!==1?'s':''}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionCard({ slot, question, state, onAttempt, submitting }) {
  const [selected, setSelected] = useState(null)
  if (!question) return null
  const attemptsUsed = state?.attempts_used ?? 0
  const isCompleted  = state?.completed ?? false
  const isCorrect    = state?.correct   ?? false
  const xpAwarded    = state?.xp_awarded ?? 0
  const prevPicks    = state?.selected_indices ?? []
  const lastWrong    = !isCompleted && attemptsUsed > 0
  const options      = normaliseOptions(question.options)

  function optionState(idx) {
    if (!isCompleted) return 'neutral'
    const ok = options[idx] === question.correct_answer || LETTERS[idx] === question.correct_answer
    if (ok) return 'correct'
    if (prevPicks.includes(idx)) return 'wrong'
    return 'neutral'
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:`1.5px solid ${isCompleted?(isCorrect?GREEN:RED)+'50':'var(--border)'}`, overflow:'hidden', transition:'border-color .3s' }}>
      <div style={{ padding:'14px 18px 12px', borderBottom:'1px solid var(--border)', background:isCompleted?`${isCorrect?GREEN:RED}08`:`${NAVY}10` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:8, background:`${BLUE}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:BLUE }}>{slot}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>{question.subject_name}</div>
              {question.topic_name && <div style={{ fontSize:10, color:'var(--text-tert)' }}>{question.topic_name}</div>}
            </div>
          </div>
          {question.year && <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', background:'var(--bg-subtle)', padding:'3px 8px', borderRadius:7 }}>{question.exam_type} {question.year}</span>}
        </div>
        <Pips used={attemptsUsed} max={MAX_ATTEMPTS} correct={isCorrect} />
      </div>
      <div style={{ padding:'16px 18px' }}>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--text-prim)', lineHeight:1.7, marginBottom:16 }}>{question.text}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {options.map((opt, idx) => {
            const oState = optionState(idx)
            const isPicked = selected === idx
            const wasPicked = prevPicks.includes(idx)
            let bg='var(--bg-subtle)', border='var(--border)', color='var(--text-prim)'
            if (isCompleted) {
              if (oState==='correct'){bg=`${GREEN}14`;border=GREEN;color=GREEN}
              else if(oState==='wrong'){bg=`${RED}08`;border=`${RED}50`}
            } else if(isPicked){bg=`${BLUE}12`;border=BLUE}
            const lBg = isCompleted ? oState==='correct'?GREEN:oState==='wrong'?RED:'rgba(255,255,255,.06)' : isPicked?BLUE:'rgba(255,255,255,.06)'
            return (
              <button key={idx} onClick={()=>!isCompleted&&setSelected(idx)} disabled={isCompleted}
                style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color, cursor:isCompleted?'default':'pointer', textAlign:'left', width:'100%', fontFamily:'inherit', transition:'all .15s' }}>
                <span style={{ width:22, height:22, borderRadius:7, flexShrink:0, background:lBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:(isPicked||oState!=='neutral')?'#fff':'var(--text-tert)', transition:'background .15s' }}>
                  {isCompleted&&oState==='correct'?'✓':isCompleted&&oState==='wrong'&&wasPicked?'✗':LETTERS[idx]}
                </span>
                <span style={{ fontSize:13, fontWeight:isPicked||oState==='correct'?700:500, lineHeight:1.5, paddingTop:2 }}>{String(opt??'')}</span>
              </button>
            )
          })}
        </div>
        {lastWrong && <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:10, background:`${RED}10`, border:`1px solid ${RED}30`, fontSize:12, color:RED, fontWeight:700 }}>Not quite — one attempt left. Choose carefully.</div>}
        {!isCompleted && (
          <button onClick={()=>{if(selected!==null&&!submitting)onAttempt(slot,selected)}} disabled={selected===null||submitting}
            style={{ width:'100%', padding:'13px 0', borderRadius:12, border:'none', background:selected===null||submitting?'rgba(255,255,255,.04)':NAVY, color:selected===null||submitting?'var(--text-tert)':'#fff', fontSize:14, fontWeight:800, cursor:selected===null||submitting?'not-allowed':'pointer', boxShadow:selected!==null&&!submitting?'0 4px 0 #03153d':'none', fontFamily:'inherit', transition:'all .15s' }}>
            {submitting?'Checking…':'Submit answer →'}
          </button>
        )}
        {isCompleted && (
          <div>
            <div style={{ padding:'12px 16px', borderRadius:12, background:isCorrect?`${GREEN}12`:`${RED}10`, border:`1px solid ${isCorrect?GREEN:RED}30`, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22 }}>{isCorrect?'🎉':'💪'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:900, color:isCorrect?GREEN:RED, marginBottom:2 }}>
                  {isCorrect ? `Correct! ${attemptsUsed===1?'First try!':'Got it on attempt '+attemptsUsed+'.'}` : 'Better luck tomorrow!'}
                </div>
                {!isCorrect && <div style={{ fontSize:11, color:'var(--text-tert)' }}>Correct answer: {String(question.correct_answer??'')}</div>}
              </div>
              {xpAwarded>0 && <div style={{ padding:'5px 12px', borderRadius:999, background:`${GOLD}20`, border:`1px solid ${GOLD}40`, fontSize:13, fontWeight:900, color:GOLD, flexShrink:0 }}>+{xpAwarded} XP</div>}
            </div>
            <ExplanationBox explanation={question.explanation} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function DailyChallengePage() {
  const profile               = useStudentUser()
  const { dark }              = useTheme()
  const { totalPoints, setTotalPoints } = usePoints()
  const countdown             = useCountdown()
  const [loading, setLoading]     = useState(true)
  const [challenges, setChallenges] = useState([])
  const [error, setError]         = useState(false)
  const [submitting, setSubmitting] = useState(null)
  const myId = profile?.id ?? null

  const fetchQuiz = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const subs = [...new Set([...(profile?.subjects_waec??[]),...(profile?.subjects_jamb??[]),...(profile?.subjects??[])])]
      const param = subs.length ? `?subjects=${encodeURIComponent(subs.join(','))}` : ''
      const res = await fetch(`/api/student/daily-quiz${param}`)
      if (!res.ok) { setError(true); return }
      const data = await res.json()
      setChallenges(data.challenges ?? [])
    } catch { setError(true) }
    finally   { setLoading(false) }
  }, [profile])

  useEffect(() => { if (profile !== null) fetchQuiz() }, [fetchQuiz, profile])

  async function handleAttempt(slot, selectedIdx) {
    const ch = challenges.find(c => c.slot === slot)
    if (!ch || submitting !== null) return
    setSubmitting(slot)
    try {
      const res = await fetch('/api/student/daily-quiz/attempt', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question_id:ch.question.id, selected_index:selectedIdx, subject_name:ch.question.subject_name, slot }),
      })
      const data = await res.json()
      if (!data.ok) return
      setChallenges(prev => prev.map(c => {
        if (c.slot !== slot) return c
        return {
          ...c,
          state: { ...c.state, attempts_used:data.attempts_used, completed:data.completed, correct:data.correct, selected_indices:[...(c.state.selected_indices??[]),selectedIdx], xp_awarded:data.xp_awarded },
          question: data.completed ? { ...c.question, correct_answer:data.correct_answer, explanation:data.explanation } : c.question,
        }
      }))
      if (data.xp_awarded > 0) setTotalPoints(totalPoints + data.xp_awarded)
    } finally { setSubmitting(null) }
  }

  const allDone = challenges.length > 0 && challenges.every(c => c.state?.completed)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`@media(min-width:1024px){.dc-grid{display:grid!important;grid-template-columns:1fr 300px!important;gap:18px!important;align-items:flex-start!important}}`}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.035em' }}>Daily Challenge</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>Two questions · Two attempts each · No hints</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {!allDone && countdown && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:12 }}>⏰</span>
              <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>Resets in {countdown}</span>
            </div>
          )}
          {allDone && <div style={{ padding:'7px 14px', borderRadius:999, background:`${GREEN}15`, border:`1px solid ${GREEN}30`, fontSize:12, fontWeight:800, color:GREEN }}>✓ All done today!</div>}
        </div>
      </div>
      <div className="dc-grid" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {loading ? <Skeleton /> : error||!challenges.length ? (
            <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'32px 20px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🧩</div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No challenge available</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, marginBottom:16 }}>Set up your subjects so we can pick today's questions.</div>
              <Link href="/student/profile" style={{ textDecoration:'none', display:'inline-block', padding:'10px 22px', borderRadius:12, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Set up subjects →</Link>
            </div>
          ) : challenges.filter(ch => ch.question).map(ch => (
            <QuestionCard key={ch.slot} slot={ch.slot} question={ch.question} state={ch.state} onAttempt={handleAttempt} submitting={submitting===ch.slot} />
          ))}
        </div>
        <div><TodayBoard myId={myId} /></div>
      </div>
    </div>
  )
}