'use client'
// src/components/dashboard/ChallengeParty.jsx — v1
// ─────────────────────────────────────────────────────────────────────────────
// Challenge Party — one random question from the student's subjects.
// Timed. Earn XP. Personal best tracked.
//
// States:
//   idle      → shows the card with "Accept Challenge →" button
//   loading   → fetching the question
//   active    → countdown timer running, question shown, options tappable
//   answered  → result shown (correct/wrong), explanation preview, XP awarded
//   done      → already completed today (shows today's result)
//
// Personal best: fastest correct answer time, stored in localStorage.
//   key: exl_challenge_best_ms
//
// XP: +20 for answering, +10 bonus for correct, +15 bonus for beating personal best
//   Awarded via the existing /api/practice/save endpoint.
//
// Placement: between DownloadsCard and TargetStrip on the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MathText } from '@/lib/mathRenderer'

// ── Constants ─────────────────────────────────────────────────────────────────
const CHALLENGE_XP_ANSWER  = 20  // just for answering
const CHALLENGE_XP_CORRECT = 10  // bonus for correct
const CHALLENGE_XP_PB      = 15  // bonus for beating personal best
const TIME_LIMIT_MS        = 30000 // 30 seconds
const STORAGE_KEY_BEST     = 'exl_challenge_best_ms'
const STORAGE_KEY_TODAY    = 'exl_challenge_today'  // { date, questionId, correct, timeMs }

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}
function getPersonalBest() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY_BEST) ?? '0', 10) || 0 } catch { return 0 }
}
function setPersonalBest(ms) {
  try { localStorage.setItem(STORAGE_KEY_BEST, String(ms)) } catch {}
}
function getTodayResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TODAY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.date !== getTodayKey()) return null
    return parsed
  } catch { return null }
}
function saveTodayResult(result) {
  try { localStorage.setItem(STORAGE_KEY_TODAY, JSON.stringify({ ...result, date: getTodayKey() })) } catch {}
}

// ── Timer arc (SVG) ──────────────────────────────────────────────────────────
function TimerArc({ elapsed, total, size = 48, stroke = 4 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, 1 - elapsed / total)
  const col  = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#FFB800' : '#f87171'
  const secs = Math.ceil((total - elapsed) / 1000)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: 'stroke-dasharray .1s linear, stroke .3s' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: col, lineHeight: 1 }}>{secs}</span>
      </div>
    </div>
  )
}

// ── Option button ─────────────────────────────────────────────────────────────
function OptionBtn({ label, text, onClick, state, accent }) {
  // state: 'idle' | 'correct' | 'wrong' | 'reveal' | 'disabled'
  const bg = state === 'correct' ? 'rgba(74,222,128,.18)'
           : state === 'wrong'   ? 'rgba(248,113,113,.18)'
           : state === 'reveal'  ? 'rgba(74,222,128,.08)'
           : 'var(--bg-subtle)'
  const border = state === 'correct' ? '#4ade80'
               : state === 'wrong'   ? '#f87171'
               : state === 'reveal'  ? 'rgba(74,222,128,.3)'
               : 'var(--border)'
  const textCol = state === 'correct' ? '#4ade80'
                : state === 'wrong'   ? '#f87171'
                : 'var(--text-prim)'

  return (
    <button
      onClick={onClick}
      disabled={state === 'disabled' || state === 'correct' || state === 'wrong' || state === 'reveal'}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 12px',
        borderRadius: 12, border: `1.5px solid ${border}`,
        background: bg, cursor: state === 'idle' ? 'pointer' : 'default',
        textAlign: 'left', fontFamily: 'inherit',
        transition: 'all .15s',
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 6, background: border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: state === 'idle' ? 'var(--text-tert)' : '#fff', flexShrink: 0, transition: 'all .15s' }}>
        {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : label}
      </span>
      <MathText text={text} style={{ fontSize: 13, fontWeight: 600, color: textCol, lineHeight: 1.4 }} as="span" />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChallengeParty({ profile, subjects = [] }) {
  const supabase = createClient()

  const [phase,     setPhase]     = useState('idle')   // idle | loading | active | answered | done
  const [question,  setQuestion]  = useState(null)
  const [elapsed,   setElapsed]   = useState(0)
  const [selected,  setSelected]  = useState(null)     // 'A'|'B'|'C'|'D' or null
  const [expired,   setExpired]   = useState(false)
  const [xpEarned,  setXpEarned]  = useState(0)
  const [beatPB,    setBeatPB]    = useState(false)
  const [todayDone, setTodayDone] = useState(null)     // saved result

  const startMs   = useRef(null)
  const timerRef  = useRef(null)
  const elapsedMs = useRef(0)

  // Check if already completed today on mount
  useEffect(() => {
    const result = getTodayResult()
    if (result) { setTodayDone(result); setPhase('done') }
  }, [])

  // ── Timer ─────────────────────────────────────────────────────────────────
  function startTimer() {
    startMs.current = Date.now()
    timerRef.current = setInterval(() => {
      const ms = Date.now() - startMs.current
      elapsedMs.current = ms
      setElapsed(ms)
      if (ms >= TIME_LIMIT_MS) {
        clearInterval(timerRef.current)
        setExpired(true)
        handleExpired()
      }
    }, 100)
  }
  function stopTimer() {
    clearInterval(timerRef.current)
    return elapsedMs.current
  }

  // ── Fetch question ────────────────────────────────────────────────────────
  async function fetchQuestion() {
    setPhase('loading')
    try {
      const examType = profile?.exam_type ?? 'WAEC'
      const subjectList = subjects.map(s => s.name ?? s.subjects?.name).filter(Boolean)
      if (!subjectList.length) { setPhase('idle'); return }

      const params = new URLSearchParams({
        exam:     examType,
        subjects: subjectList.join(','),
        count:    '1',
        mode:     'practice',
        source:   'all',
      })
      const res = await fetch(`/api/practice/questions?${params}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      const q = data.questions?.[0]
      if (!q) throw new Error('no question')

      setQuestion(q)
      setSelected(null)
      setExpired(false)
      setElapsed(0)
      elapsedMs.current = 0
      setPhase('active')
      startTimer()
    } catch {
      setPhase('idle')
    }
  }

  // ── Handle answer ─────────────────────────────────────────────────────────
  async function handleAnswer(key) {
    if (selected || expired) return
    const ms      = stopTimer()
    const correct = key === question.correct_answer
    setSelected(key)
    setPhase('answered')

    // XP calculation
    const pb       = getPersonalBest()
    let xp         = CHALLENGE_XP_ANSWER
    if (correct) xp += CHALLENGE_XP_CORRECT
    const newBest  = correct && (pb === 0 || ms < pb)
    if (newBest) { xp += CHALLENGE_XP_PB; setPersonalBest(ms); setBeatPB(true) }

    setXpEarned(xp)

    // Save today's result
    const result = { questionId: question.id, correct, timeMs: ms, xp }
    saveTodayResult(result)
    setTodayDone(result)

    // Award XP + record attempt (fire and forget)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetch('/api/practice/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempts: [{
              question_id: question.id,
              is_correct: correct,
              selected_answer: key,
              time_taken_ms: ms,
            }],
            xp_earned: xp,
            mode: 'challenge',
          }),
        })
      }
    } catch {}
  }

  // ── Handle timer expired ──────────────────────────────────────────────────
  function handleExpired() {
    setSelected(null)
    setPhase('answered')
    const result = { questionId: question?.id, correct: false, timeMs: TIME_LIMIT_MS, xp: 0 }
    saveTodayResult(result)
    setTodayDone(result)
  }

  // ── Option states ─────────────────────────────────────────────────────────
  function getOptionState(key) {
    if (phase !== 'answered') return 'idle'
    if (key === question?.correct_answer) return 'correct'
    if (key === selected) return 'wrong'
    return 'reveal'
  }

  const options = question
    ? (typeof question.options === 'object' && !Array.isArray(question.options)
        ? Object.entries(question.options)
        : (Array.isArray(question.options) ? question.options.map((v, i) => [String.fromCharCode(65+i), v]) : []))
    : []

  const correctPct = phase === 'answered' && question
    ? null // could add community stat in future
    : null

  const explanation = question?.explanation
    ? (typeof question.explanation === 'string' ? (() => { try { return JSON.parse(question.explanation) } catch { return { correct: question.explanation } } })() : question.explanation)
    : null

  // ── DONE state — already answered today ───────────────────────────────────
  if (phase === 'done' && todayDone) {
    const pb = getPersonalBest()
    const secs = (todayDone.timeMs / 1000).toFixed(1)
    return (
      <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 2 }}>Daily Challenge</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.015em' }}>Challenge Party ⚡</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: todayDone.correct ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)', color: todayDone.correct ? '#4ade80' : '#f87171', border: `1px solid ${todayDone.correct ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.25)'}` }}>
              {todayDone.correct ? '✓ Correct' : '✗ Missed'}
            </span>
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--text-tert)', marginBottom: 4 }}>Today's result</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sec)' }}>⏱ {secs}s</span>
              {todayDone.xp > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#FFB800' }}>+{todayDone.xp} XP earned</span>
              )}
              {pb > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>
                  🏅 Personal best: {(pb / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tert)', flexShrink: 0 }}>Come back tomorrow</p>
        </div>
      </div>
    )
  }

  // ── IDLE state ────────────────────────────────────────────────────────────
  if (phase === 'idle' || phase === 'loading') {
    const pb = getPersonalBest()
    return (
      <div
        onClick={phase === 'idle' ? fetchQuestion : undefined}
        style={{
          borderRadius: 18, overflow: 'hidden', cursor: phase === 'idle' ? 'pointer' : 'default',
          background: 'linear-gradient(145deg, #1a0a30 0%, #0f0820 55%, #0a0c14 100%)',
          border: '1.5px solid rgba(155,122,224,.3)',
          padding: 16, position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,122,224,.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(155,122,224,.2)', border: '1px solid rgba(155,122,224,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(196,181,253,.5)', marginBottom: 2 }}>Daily Challenge</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-.015em' }}>Challenge Party</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>
              1 question · 30 seconds · {CHALLENGE_XP_ANSWER + CHALLENGE_XP_CORRECT} XP to win
            </p>
          </div>
          {pb > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginBottom: 1 }}>Personal best</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#FFB800' }}>{(pb / 1000).toFixed(1)}s</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, position: 'relative', zIndex: 1 }}>
          {phase === 'loading' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 12, background: 'rgba(155,122,224,.15)', border: '1px solid rgba(155,122,224,.2)' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #a78bfa', borderTopColor: 'transparent', animation: 'challenge-spin .7s linear infinite' }} />
              <style>{`@keyframes challenge-spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(196,181,253,.7)' }}>Getting your question…</span>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); fetchQuestion() }}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: '#9b7ae0', color: '#fff', fontSize: 14, fontWeight: 900,
                cursor: 'pointer', letterSpacing: '-.015em', fontFamily: 'inherit',
                boxShadow: '0 5px 0 #6d35c3, 0 8px 20px rgba(155,122,224,.3)',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', backgroundSize: '200% 100%', animation: 'challenge-shimmer 2.5s infinite', pointerEvents: 'none' }} />
              <style>{`@keyframes challenge-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
              ⚡ Accept Challenge
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── ACTIVE + ANSWERED states ───────────────────────────────────────────────
  const isAnswered = phase === 'answered'
  const isCorrect  = selected === question?.correct_answer
  const subjectName = question?.subjects?.name ?? question?.subject_name ?? ''

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(90deg, rgba(155,122,224,.06) 0%, transparent 100%)',
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 1 }}>Challenge Party</p>
          {subjectName && <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>{subjectName}</p>}
        </div>
        {!isAnswered ? (
          <TimerArc elapsed={elapsed} total={TIME_LIMIT_MS} size={44} stroke={4} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {xpEarned > 0 && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,184,0,.12)', color: '#FFB800', border: '1px solid rgba(255,184,0,.2)' }}>
                +{xpEarned} XP
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: isCorrect ? 'rgba(74,222,128,.12)' : expired ? 'rgba(251,191,36,.12)' : 'rgba(248,113,113,.12)', color: isCorrect ? '#4ade80' : expired ? '#fbbf24' : '#f87171', border: `1px solid ${isCorrect ? 'rgba(74,222,128,.25)' : expired ? 'rgba(251,191,36,.25)' : 'rgba(248,113,113,.25)'}` }}>
              {expired ? '⏱ Time up!' : isCorrect ? '✓ Correct!' : '✗ Wrong'}
            </span>
          </div>
        )}
      </div>

      {/* Question */}
      <div style={{ padding: '16px 16px 12px' }}>
        <MathText
          text={question?.question_text ?? ''}
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-prim)', lineHeight: 1.55, marginBottom: 14 }}
          as="p"
        />

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {options.map(([key, text]) => (
            <OptionBtn
              key={key}
              label={key}
              text={String(text)}
              onClick={() => handleAnswer(key)}
              state={isAnswered ? getOptionState(key) : 'idle'}
              accent="#a78bfa"
            />
          ))}
        </div>
      </div>

      {/* Post-answer section */}
      {isAnswered && (
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>

          {/* Personal best badge */}
          {beatPB && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,184,0,.08)', border: '1px solid rgba(255,184,0,.2)' }}>
              <span style={{ fontSize: 14 }}>🏅</span>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#FFB800' }}>New personal best! {(elapsedMs.current / 1000).toFixed(1)}s</p>
            </div>
          )}

          {/* Explanation preview */}
          {explanation?.correct && (
            <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', marginBottom: 10 }}>
              {explanation.concept && (
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a78bfa', marginBottom: 4 }}>
                  {explanation.concept}
                </p>
              )}
              <MathText
                text={explanation.correct}
                style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.55 }}
                as="p"
              />
            </div>
          )}

          {/* Time + come back tomorrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>
              ⏱ {(elapsedMs.current / 1000).toFixed(1)}s
              {getPersonalBest() > 0 && !beatPB && ` · best: ${(getPersonalBest() / 1000).toFixed(1)}s`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>New challenge tomorrow ✦</span>
          </div>
        </div>
      )}
    </div>
  )
}