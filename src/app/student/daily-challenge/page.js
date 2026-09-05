'use client'
// src/app/student/daily-challenge/page.js — v3
// One question at a time. Start screen with timer. No past-question badge.
// XP: 50 (1st try correct) | 25 (2nd try correct) | 0 (both wrong).

import { useState, useEffect, useCallback, useRef } from 'react'
import { useStudentUser } from '@/app/student/layout'
import { usePoints }      from '@/contexts/PointsContext'
import { useTheme }       from '@/contexts/ThemeContext'
import { MathText }       from '@/lib/mathRenderer'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const LETTERS = ['A','B','C','D','E']
const MAX_ATTEMPTS = 2

// ── Countdown to midnight ─────────────────────────────────────────────────────
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

// ── Elapsed seconds timer (ticks while active) ────────────────────────────────
function useElapsed(active) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!active) return
    setSecs(0)
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  return secs
}

function fmtMs(ms) {
  if (!ms && ms !== 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s/60)}m ${s%60}s`
}

function normaliseOptions(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return LETTERS.map(l => raw[l]).filter(v => v != null)
}

// ── Explanation box ───────────────────────────────────────────────────────────
function ExplanationBox({ explanation }) {
  if (!explanation) return null
  if (typeof explanation === 'string') {
    return (
      <div style={{ padding:'12px 14px', borderRadius:12, background:`${CYAN}08`, border:`1px solid ${CYAN}20`, marginTop:12 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:CYAN, marginBottom:6 }}>Explanation</div>
        <p style={{ fontSize:12, color:'var(--text-sec)', lineHeight:1.65, margin:0 }}><MathText text={explanation}/></p>
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
                  <div key={li} style={{ fontSize:13, color:'var(--text-sec)', lineHeight:2, padding:'2px 0' }}><MathText text={String(line ?? '')}/></div>
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

// ── Attempt pips ──────────────────────────────────────────────────────────────
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <style>{`@keyframes sk{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
      {[120,200,46,46,46].map((h,i) => <div key={i} style={{ height:h, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', animation:'sk 1.5s infinite' }}/>)}
    </div>
  )
}

// ── Leaderboard board ─────────────────────────────────────────────────────────
const BOARD_CACHE_KEY = 'ep_daily_board_cache'
const AV_COLORS_DC = ['#FF6A00','#1264E5','#7C3AED','#18B7F2','#22c55e','#FFB800']

function readBoardCache() {
  try {
    const c = JSON.parse(localStorage.getItem(BOARD_CACHE_KEY) || 'null')
    if (!c) return null
    if (c.date !== new Date().toISOString().slice(0,10)) return null
    if (Date.now() - (c.ts||0) > 180_000) return null
    return c.board ?? null
  } catch { return null }
}
function writeBoardCache(board) {
  try { localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0,10), board, ts: Date.now() })) } catch {}
}

function TodayBoard({ myId, refreshKey = 0 }) {
  const [rows, setRows]       = useState(() => readBoardCache() ?? [])
  const [loading, setLoading] = useState(!readBoardCache())

  useEffect(() => {
    // Always fetch fresh — the board changes as students complete challenges
    setLoading(rows.length === 0)
    fetch('/api/student/daily-quiz/board')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.board) { setRows(d.board); writeBoardCache(d.board) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey]) // re-fetch when refreshKey changes (after completion)

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)' }}>Today's Board</div>
          <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>Students who answered today</div>
        </div>
        <span style={{ fontSize:18 }}>🏆</span>
      </div>
      {loading ? (
        <div style={{ padding:'18px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity: 0.5 - i*0.12 }}>
              <div style={{ width:20, height:14, borderRadius:4, background:'var(--bg-subtle)' }}/>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)' }}/>
              <div style={{ flex:1, height:12, borderRadius:6, background:'var(--bg-subtle)' }}/>
              <div style={{ width:36, height:12, borderRadius:6, background:'var(--bg-subtle)' }}/>
            </div>
          ))}
        </div>
      ) : !rows.length ? (
        <div style={{ padding:'28px 18px', textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🧩</div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', marginBottom:4 }}>No attempts yet today</div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>Be the first! Answer today's challenge.</div>
        </div>
      ) : (
        <div>
          {rows.slice(0, 10).map((row, i) => {
            const isMe = row.student_id === myId
            const avColor = AV_COLORS_DC[i % AV_COLORS_DC.length]
            return (
              <div key={row.student_id ?? i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom: i < Math.min(rows.length,10)-1 ? '1px solid var(--border)' : 'none', background: isMe ? `${BLUE}08` : 'transparent' }}>
                <div style={{ width:22, textAlign:'center', flexShrink:0 }}>
                  {i < 3 ? <span style={{ fontSize:15 }}>{['🥇','🥈','🥉'][i]}</span> : <span style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)' }}>{i+1}</span>}
                </div>
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background: isMe ? `linear-gradient(135deg,${NAVY},${BLUE})` : `${avColor}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color: isMe ? GOLD : avColor, border: isMe ? `2px solid ${GOLD}40` : 'none' }}>
                  {(row.name||row.first_name||'?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {isMe ? 'You' : (row.name||row.first_name||'Student')}
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>
                    {row.correct}/{row.total ?? 2} correct
                    {row.completed && <span style={{ marginLeft:5, color:GREEN, fontWeight:700 }}>✓</span>}
                  </div>
                </div>
                {(row.xp_earned > 0) && (
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:900, color:GOLD }}>+{row.xp_earned}</div>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
                  </div>
                )}
              </div>
            )
          })}
          {rows.length > 10 && (
            <div style={{ padding:'10px', textAlign:'center', fontSize:11, color:'var(--text-tert)', borderTop:'1px solid var(--border)' }}>
              +{rows.length - 10} more students today
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Single question card ──────────────────────────────────────────────────────
function QuestionCard({ question, state, onAttempt, submitting, elapsedSecs }) {
  const [selected, setSelected] = useState(null)
  if (!question) return null

  const attemptsUsed = state?.attempts_used ?? 0
  const isCompleted  = state?.completed ?? false
  const isCorrect    = state?.correct   ?? false
  const xpAwarded    = state?.xp_awarded ?? 0
  const prevPicks    = state?.selected_indices ?? []
  const lastWrong    = !isCompleted && attemptsUsed > 0   // failed 1st, still has 2nd
  const options      = normaliseOptions(question.options)

  // After a wrong attempt, reset selection so they must pick again
  const attemptKey = attemptsUsed  // changing this key resets selected implicitly
  // We manage this via the button disable logic — selection persists intentionally
  // so student can see what they picked, but submit clears it via parent re-render

  function optionState(idx) {
    if (!isCompleted) return 'neutral'
    const ok = options[idx] === question.correct_answer || LETTERS[idx] === question.correct_answer
    if (ok) return 'correct'
    if (prevPicks.includes(idx)) return 'wrong'
    return 'neutral'
  }

  // After wrong attempt (not completed), also highlight what they picked last
  function midOptionState(idx) {
    if (isCompleted || attemptsUsed === 0) return null
    // last picked index is last in prevPicks
    const lastPick = prevPicks[prevPicks.length - 1]
    if (idx === lastPick) return 'wrong'
    return null
  }

  function handleSelect(idx) {
    if (isCompleted) return
    setSelected(idx)
  }

  function handleSubmit() {
    if (selected === null || submitting || isCompleted) return
    onAttempt(selected, () => setSelected(null))
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:`1.5px solid ${isCompleted?(isCorrect?GREEN:RED)+'50':'var(--border)'}`, overflow:'hidden', transition:'border-color .3s' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px 12px', borderBottom:'1px solid var(--border)', background:isCompleted?`${isCorrect?GREEN:RED}08`:`${NAVY}10` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)' }}>{question.subject_name}</div>
            {question.topic_name && <div style={{ fontSize:10, color:'var(--text-tert)' }}>{question.topic_name}</div>}
          </div>
          {/* Elapsed timer — shows while question is active */}
          {!isCompleted && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,.06)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:10 }}>⏱</span>
              <span style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>{elapsedSecs}s</span>
            </div>
          )}
        </div>
        <Pips used={attemptsUsed} max={MAX_ATTEMPTS} correct={isCorrect} />
      </div>

      {/* Body */}
      <div style={{ padding:'16px 18px' }}>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--text-prim)', lineHeight:1.7, marginBottom:16 }}>
          <MathText text={question.text ?? ''}/>
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {options.map((opt, idx) => {
            const oState    = optionState(idx)
            const midState  = midOptionState(idx)
            const isPicked  = selected === idx

            let bg     = 'var(--bg-subtle)'
            let border = 'var(--border)'
            let color  = 'var(--text-prim)'
            let lBg    = 'rgba(255,255,255,.06)'

            if (isCompleted) {
              if (oState === 'correct') { bg = `${GREEN}14`; border = GREEN; color = GREEN; lBg = GREEN }
              else if (oState === 'wrong') { bg = `${RED}08`; border = `${RED}50`; lBg = RED }
            } else if (midState === 'wrong') {
              // Highlight last wrong pick after 1st failed attempt (non-completed state)
              bg = `${RED}08`; border = `${RED}40`; lBg = RED
            } else if (isPicked) {
              bg = `${BLUE}12`; border = BLUE; lBg = BLUE
            }

            const wasPicked = prevPicks.includes(idx)

            return (
              <button key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isCompleted}
                style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color, cursor:isCompleted?'default':'pointer', textAlign:'left', width:'100%', fontFamily:'inherit', transition:'all .15s' }}>
                <span style={{ width:22, height:22, borderRadius:7, flexShrink:0, background:lBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:(isPicked||midState||oState!=='neutral')?'#fff':'var(--text-tert)', transition:'background .15s' }}>
                  {isCompleted&&oState==='correct'?'✓' : isCompleted&&oState==='wrong'&&wasPicked?'✗' : LETTERS[idx]}
                </span>
                <span style={{ fontSize:13, fontWeight:isPicked||oState==='correct'?700:500, lineHeight:1.5, paddingTop:2 }}>
                  <MathText text={String(opt??'')}/>
                </span>
              </button>
            )
          })}
        </div>

        {/* Wrong-but-not-out feedback */}
        {lastWrong && (
          <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:10, background:`${RED}10`, border:`1px solid ${RED}30`, fontSize:12, color:RED, fontWeight:700 }}>
            ✗ Not quite — you have one attempt left. Choose carefully.
          </div>
        )}

        {/* Submit button */}
        {!isCompleted && (
          <button
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            style={{ width:'100%', padding:'13px 0', borderRadius:12, border:'none', background:selected===null||submitting?'rgba(255,255,255,.04)':NAVY, color:selected===null||submitting?'var(--text-tert)':'#fff', fontSize:14, fontWeight:800, cursor:selected===null||submitting?'not-allowed':'pointer', boxShadow:selected!==null&&!submitting?'0 4px 0 #03153d':'none', fontFamily:'inherit', transition:'all .15s' }}>
            {submitting ? 'Checking…' : 'Submit answer →'}
          </button>
        )}

        {/* Result + explanation */}
        {isCompleted && (
          <div>
            <div style={{ padding:'12px 16px', borderRadius:12, background:isCorrect?`${GREEN}12`:`${RED}10`, border:`1px solid ${isCorrect?GREEN:RED}30`, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22 }}>{isCorrect?'🎉':'💪'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:900, color:isCorrect?GREEN:RED, marginBottom:2 }}>
                  {isCorrect
                    ? `Correct! ${attemptsUsed===1?'First try — perfect!':'Got it on attempt '+attemptsUsed+'.'}`
                    : 'Not this time — study the explanation below.'}
                </div>
                {!isCorrect && question.correct_answer && (
                  <div style={{ fontSize:11, color:'var(--text-tert)' }}>Correct answer: {String(question.correct_answer)}</div>
                )}
              </div>
              {xpAwarded > 0 && (
                <div style={{ padding:'5px 12px', borderRadius:999, background:`${GOLD}20`, border:`1px solid ${GOLD}40`, fontSize:13, fontWeight:900, color:GOLD, flexShrink:0 }}>
                  +{xpAwarded} XP
                </div>
              )}
            </div>
            <ExplanationBox explanation={question.explanation}/>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
const DAILY_CACHE_KEY = 'ep_daily_quiz_cache'

function readDailyCache() {
  try {
    const c = JSON.parse(localStorage.getItem(DAILY_CACHE_KEY) || 'null')
    if (!c) return null
    if (c.date !== new Date().toISOString().slice(0, 10)) return null
    return c.challenges ?? null
  } catch { return null }
}
function isDailyCacheComplete() {
  try {
    const c = JSON.parse(localStorage.getItem(DAILY_CACHE_KEY) || 'null')
    if (!c) return false
    if (c.date !== new Date().toISOString().slice(0, 10)) return false
    const ch = c.challenges ?? []
    return ch.length > 0 && ch.every(x => x.state?.completed)
  } catch { return false }
}
function writeDailyCache(challenges) {
  try {
    localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0,10), challenges, ts: Date.now() }))
  } catch {}
}

// ── Start screen ──────────────────────────────────────────────────────────────
function StartScreen({ challenges, countdown, onStart, dark }) {
  const subjects = [...new Set(challenges.filter(c => c.question).map(c => c.question.subject_name))].filter(Boolean)
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
      {/* Hero banner */}
      <div style={{ background:`linear-gradient(135deg,${NAVY} 0%,#0c2360 60%,#1548b8 100%)`, padding:'32px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.5)', marginBottom:10 }}>Daily Challenge</div>
        <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.15, marginBottom:8 }}>Ready for today's<br/>challenge? 🔥</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.6, marginBottom:20 }}>
          2 questions · 2 attempts each · Timer starts now
        </div>
        {subjects.length > 0 && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
            {subjects.map(s => (
              <span key={s} style={{ padding:'4px 12px', borderRadius:999, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,.85)' }}>{s}</span>
            ))}
          </div>
        )}
        <button onClick={onStart}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, border:'none', background:GOLD, color:NAVY, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 6px 20px rgba(255,184,0,.4)', letterSpacing:'-.01em' }}>
          <span>⚡</span> Start Challenge
        </button>
      </div>
      {/* Rules */}
      <div style={{ padding:'20px 24px' }}>
        <div style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginBottom:14 }}>How it works</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            ['🎯', 'One question at a time', 'Answer Q1, see if you got it, then move to Q2.'],
            ['⚡', '2 attempts per question', 'First try correct = 50 XP. Second try = 25 XP. Both wrong = 0 XP.'],
            ['⏱', 'Your time is tracked', 'We track how long you spend. Fast + correct = impressive.'],
            ['🏆', 'Get on the leaderboard', 'Most correct answers + most XP ranks you at the top.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:2 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        {countdown && (
          <div style={{ marginTop:20, padding:'10px 14px', borderRadius:12, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>⏰</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Challenge resets in <span style={{ fontVariantNumeric:'tabular-nums', color:'var(--text-prim)' }}>{countdown}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Already-done screen ───────────────────────────────────────────────────────
function DoneScreen({ challenges, timings, countdown }) {
  const totalXP     = challenges.reduce((a, c) => a + (c.state?.xp_awarded ?? 0), 0)
  const correctCount = challenges.filter(c => c.state?.correct).length
  const avgMs       = timings.filter(Boolean).length
    ? timings.filter(Boolean).reduce((a,b) => a+b, 0) / timings.filter(Boolean).length
    : null

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ background:`linear-gradient(135deg,${NAVY},#0c2360)`, padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>
          {correctCount === 2 ? '🏆' : correctCount === 1 ? '👏' : '💪'}
        </div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:6 }}>
          {correctCount === 2 ? 'Perfect score!' : correctCount === 1 ? 'One down!' : 'Challenge complete!'}
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:20 }}>
          You got {correctCount} of 2 correct today
        </div>
        {totalXP > 0 && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:999, background:`${GOLD}20`, border:`1px solid ${GOLD}50` }}>
            <span style={{ fontSize:20 }}>⚡</span>
            <span style={{ fontSize:20, fontWeight:900, color:GOLD }}>+{totalXP} XP earned</span>
          </div>
        )}
      </div>
      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Per-question recap */}
        {challenges.map((ch, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:18 }}>{ch.state?.correct ? '✅' : '❌'}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)' }}>Question {i+1} — {ch.question?.subject_name}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)' }}>
                {ch.state?.correct
                  ? `Correct on attempt ${ch.state.attempts_used}`
                  : 'Both attempts used — no XP'}
                {timings[i] ? ` · ${fmtMs(timings[i])}` : ''}
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:900, color:ch.state?.xp_awarded>0?GOLD:'var(--text-tert)' }}>
              {ch.state?.xp_awarded>0 ? `+${ch.state.xp_awarded} XP` : '0 XP'}
            </div>
          </div>
        ))}
        {avgMs && (
          <div style={{ padding:'10px 14px', borderRadius:12, background:`${CYAN}08`, border:`1px solid ${CYAN}25`, display:'flex', alignItems:'center', gap:8 }}>
            <span>⏱</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-sec)' }}>
              Avg time per question: <strong>{fmtMs(avgMs)}</strong>
            </span>
          </div>
        )}
        {countdown && (
          <div style={{ padding:'10px 14px', borderRadius:12, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>⏰</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>New challenge in <span style={{ fontVariantNumeric:'tabular-nums', color:'var(--text-prim)' }}>{countdown}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DailyChallengePage() {
  const profile    = useStudentUser()
  const { dark }   = useTheme()
  const { totalPoints, setTotalPoints } = usePoints()
  const countdown  = useCountdown()
  const myId       = profile?.id ?? null

  // ── Data state ───────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(() => !readDailyCache())
  const [challenges, setChallenges] = useState(() => readDailyCache() ?? [])
  const [error, setError]           = useState(false)

  // ── Challenge flow state ─────────────────────────────────────────────────
  // phase: 'loading' | 'start' | 'question' | 'done'
  const [phase, setPhase]           = useState(() => isDailyCacheComplete() ? 'done' : 'start')
  const [currentStep, setCurrentStep] = useState(0)   // 0 or 1
  const [boardRefreshKey, setBoardRefreshKey] = useState(0)
  const [submitting, setSubmitting]   = useState(false)

  // ── Timing state ─────────────────────────────────────────────────────────
  // timings[i] = ms spent on question i (recorded when it completes)
  const [timings, setTimings]       = useState([null, null])
  const questionStartRef            = useRef(null)   // Date.now() when current Q became active
  const timerActive                 = phase === 'question' && !challenges[currentStep]?.state?.completed
  const elapsedSecs                 = useElapsed(timerActive)

  // ── Fetch challenges ─────────────────────────────────────────────────────
  const fetchQuiz = useCallback(async () => {
    if (isDailyCacheComplete()) { setLoading(false); return }
    setError(false)
    try {
      const subs = [...new Set([...(profile?.subjects_waec??[]),...(profile?.subjects_jamb??[]),...(profile?.subjects??[])])]
      const param = subs.length ? `?subjects=${encodeURIComponent(subs.join(','))}` : ''
      const res = await fetch(`/api/student/daily-quiz${param}`)
      if (!res.ok) { setError(true); return }
      const data = await res.json()
      const list = data.challenges ?? []
      setChallenges(list)
      writeDailyCache(list)
      // If server says already done, skip to done phase
      if (list.length > 0 && list.every(c => c.state?.completed)) {
        setPhase('done')
      }
    } catch { setError(true) }
    finally   { setLoading(false) }
  }, [profile])

  useEffect(() => { if (profile !== null) fetchQuiz() }, [fetchQuiz, profile])

  // ── Start challenge ───────────────────────────────────────────────────────
  function handleStart() {
    questionStartRef.current = Date.now()
    setCurrentStep(0)
    setPhase('question')
  }

  // ── Submit an attempt ─────────────────────────────────────────────────────
  async function handleAttempt(selectedIdx, resetSelected) {
    if (submitting) return
    const ch = challenges[currentStep]
    if (!ch) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/student/daily-quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          question_id:    ch.question.id,
          selected_index: selectedIdx,
          subject_name:   ch.question.subject_name,
        }),
      })
      const data = await res.json()
      if (!data.ok) return

      const now = Date.now()

      setChallenges(prev => {
        const updated = prev.map((c, i) => {
          if (i !== currentStep) return c
          return {
            ...c,
            state: {
              ...c.state,
              attempts_used:    data.attempts_used,
              completed:        data.completed,
              correct:          data.correct,
              selected_indices: [...(c.state?.selected_indices ?? []), selectedIdx],
              xp_awarded:       data.xp_awarded,
            },
            question: data.completed
              ? { ...c.question, correct_answer: data.correct_answer, explanation: data.explanation }
              : c.question,
          }
        })
        writeDailyCache(updated)
        return updated
      })

      if (data.xp_awarded > 0) setTotalPoints(totalPoints + data.xp_awarded)

      if (data.completed) {
        // Record time for this question
        const ms = questionStartRef.current ? now - questionStartRef.current : null
        setTimings(prev => { const t = [...prev]; t[currentStep] = ms; return t })

        // Refresh the board so the student's completion appears immediately
        fetch('/api/student/daily-quiz/board')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.board) writeBoardCache(d.board) })
          .catch(() => {})
        setBoardRefreshKey(k => k + 1)

        // Do NOT auto-advance — let the student read the explanation and tap Next themselves
      } else {
        // Wrong but not done — reset selection so they pick again
        if (resetSelected) resetSelected()
      }

    } finally { setSubmitting(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const validChallenges = challenges.filter(ch => ch.question)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`@media(min-width:1024px){.dc-grid{display:grid!important;grid-template-columns:1fr 300px!important;gap:18px!important;align-items:flex-start!important}}`}</style>

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.035em' }}>Daily Challenge</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>Two questions · Two attempts each · No hints</div>
        </div>
        {countdown && phase !== 'done' && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:12 }}>⏰</span>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', fontVariantNumeric:'tabular-nums' }}>Resets in {countdown}</span>
          </div>
        )}
        {phase === 'done' && (
          <div style={{ padding:'7px 14px', borderRadius:999, background:`${GREEN}15`, border:`1px solid ${GREEN}30`, fontSize:12, fontWeight:800, color:GREEN }}>✓ All done today!</div>
        )}
      </div>

      <div className="dc-grid" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div>
          {/* Loading */}
          {loading && <Skeleton/>}

          {/* Error / no questions */}
          {!loading && (error || !validChallenges.length) && (
            <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', padding:'32px 20px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🧩</div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No challenge available</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, marginBottom:16 }}>Set up your subjects so we can pick today's questions.</div>
              <Link href="/student/profile" style={{ textDecoration:'none', display:'inline-block', padding:'10px 22px', borderRadius:12, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Set up subjects →</Link>
            </div>
          )}

          {/* Start screen */}
          {!loading && !error && validChallenges.length > 0 && phase === 'start' && (
            <StartScreen challenges={validChallenges} countdown={countdown} onStart={handleStart} dark={dark}/>
          )}

          {/* Active question */}
          {!loading && !error && validChallenges.length > 0 && phase === 'question' && (() => {
            const ch = validChallenges[currentStep]
            if (!ch) return null
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Progress indicator */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {validChallenges.map((_, i) => (
                    <div key={i} style={{ flex:1, height:4, borderRadius:999, background: i < currentStep ? GREEN : i === currentStep ? BLUE : 'var(--border)', transition:'background .3s' }}/>
                  ))}
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--text-tert)', flexShrink:0 }}>Q{currentStep+1} of {validChallenges.length}</span>
                </div>
                <QuestionCard
                  question={ch.question}
                  state={ch.state}
                  onAttempt={handleAttempt}
                  submitting={submitting}
                  elapsedSecs={elapsedSecs}
                />
                {/* Manual advance button — only shows when question is completed */}
                {ch.state?.completed && (
                  <button
                    onClick={() => {
                      if (currentStep < validChallenges.length - 1) {
                        setCurrentStep(s => s + 1)
                        questionStartRef.current = Date.now()
                      } else {
                        setPhase('done')
                      }
                    }}
                    style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 0 #0a3fa0,0 6px 20px ${BLUE}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {currentStep < validChallenges.length - 1 ? 'Next Question →' : '🎉 See My Results'}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Done screen */}
          {!loading && !error && validChallenges.length > 0 && phase === 'done' && (
            <DoneScreen challenges={validChallenges} timings={timings} countdown={countdown}/>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <div><TodayBoard myId={myId} refreshKey={boardRefreshKey}/></div>
      </div>
    </div>
  )
}