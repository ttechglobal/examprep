'use client'
// src/app/student/practice/session/page.js — v2
// REDESIGN: matches prototype screen 5 (practice session) exactly.
//
// KEY VISUAL DETAILS FROM PROTOTYPE:
//   practice-bg: radial-gradient(ellipse 90% 70% at 60% 30%, #140e2a 0%, #08090f 100%)
//   practice-ambient SVG: absolute inset:0 opacity:.07 — tiled molecular pattern
//   
//   p-hud: flex space-between, padding 10px 14px,
//     bg rgba(0,0,0,.2), border-bottom rgba(255,255,255,.06)
//     LEFT: back btn 30×30 rounded-8 bg rgba(255,255,255,.07)
//     CENTER: "Chemistry · Alkanes & Alkenes" (subject in accent colour)
//     RIGHT: stat cards — bg rgba(255,255,255,.06) radius 8px padding 4px 9px
//       val: 14px 800 white; gold variant: #ffc36b
//       lbl: 8px 700 uppercase 0.05em rgba(255,255,255,.3)
//   
//   p-mission: margin 10px 14px, padding 10px 13px, radius 11px
//     bg rgba(255,255,255,.05) border rgba(255,255,255,.07)
//     mission-lbl: 8px 800 uppercase 0.08em rgba(255,255,255,.3) mb 3px
//     mission-text: 12px 600 rgba(255,255,255,.7)
//     p-progress: h 2px, bg rgba(255,255,255,.06), fill gradient chem→phys, mt 8px
//   
//   p-content: flex:1, overflow-y auto, padding 10px 14px 0 (NO overflow on page itself)
//     p-q-card: bg #fff, radius 16px, padding 16px
//       border: 2.5px solid accent, shadow: 0 8px 0 rgba(0,0,0,.08) 0 14px 28px rgba(11,19,48,.15)
//       p-q-num: 9px 800 uppercase 0.1em accent mb 6px
//       p-q-text: 13px 700 #13162a line-height 1.4
//       p-q-meta: 9px #9ca1bc mt 4px
//     p-answers: flex-col gap 6px mb 10px
//       p-ans-btn: dark glass, 10px 12px, radius 11px, font 12px 600
//         p-letter: 20×20 radius 5px bg rgba(255,255,255,.07)
//         hover: chem purple highlight
//         correct: rgba(108,206,142,.15) rgba(108,206,142,.5) #6cce8e
//         wrong: rgba(239,93,78,.12) rgba(239,93,78,.4) #ef5d4e
//   
//   p-submit: OUTSIDE scroll area — margin 0 14px 10px, padding 12px, radius 12px
//     bg navy, shadow 0 5px 0 navy-deep, 13px 700
//     width calc(100% - 28px) — flex-shrink:0
//     active: translateY(3px) shadow 0 2px 0 navy-deep
//
// LAYOUT STRUCTURE (critical — prototype has flex-col full-height):
//   div.practice-bg (flex-col, flex:1)
//     ambient SVG (absolute)
//     p-hud (flex-shrink:0)
//     p-mission (flex-shrink:0)
//     p-content (flex:1, overflow-y:auto) ← scroll here only
//     p-submit button (flex-shrink:0) ← always visible outside scroll

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import { getTotalSeconds, getWarningThresholds, formatTime, getTimerColor } from '@/lib/practiceTimer'

const C = {
  text:     '#eef0fa',
  dim:      '#7b7f9e',
  success:  '#6cce8e',
  danger:   '#ef5d4e',
  gold:     '#ffc36b',
  navy:     '#0b1330',
  navyDeep: '#05070f',
}

// Per-subject accent colours (all explicit hex — no dynamic Tailwind)
const ACCENT = {
  'Physics':             '#ff8fab',
  'Chemistry':           '#9b7ae0',
  'Biology':             '#6cce8e',
  'Mathematics':         '#5cb8ea',
  'Further Mathematics': '#5cb8ea',
  'English Language':    '#a78bfa',
  'Use of English':      '#a78bfa',
  'Economics':           '#fcd34d',
  'Government':          '#f87171',
  'Geography':           '#34d399',
  'default':             '#9b7ae0',
}
const getAccent = name => ACCENT[name] ?? ACCENT.default

// ── Ambient tiled molecular SVG ───────────────────────────────────────────────
function AmbientPattern({ accent }) {
  const patId = `pat${accent.replace(/[^a-z0-9]/gi, '')}`
  const c2 = '#ff8fab' // secondary node colour
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0.07, pointerEvents: 'none', zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patId} x="0" y="0" width="120" height="90" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="3" fill={accent} opacity=".7"/>
          <circle cx="60" cy="10" r="2" fill={accent} opacity=".5"/>
          <circle cx="100" cy="25" r="3" fill={c2}     opacity=".5"/>
          <circle cx="40" cy="55" r="2" fill={accent} opacity=".4"/>
          <circle cx="80" cy="70" r="3" fill={accent} opacity=".6"/>
          <line x1="20" y1="20" x2="60"  y2="10" stroke={accent} strokeWidth="1" opacity=".4"/>
          <line x1="60" y1="10" x2="100" y2="25" stroke={accent} strokeWidth="1" opacity=".4"/>
          <line x1="40" y1="55" x2="80"  y2="70" stroke={accent} strokeWidth="1" opacity=".3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patId})`}/>
    </svg>
  )
}

// ── Stat card in HUD ──────────────────────────────────────────────────────────
function StatCard({ val, lbl, gold }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '4px 9px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: gold ? C.gold : '#fff' }}>{val}</div>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,.3)' }}>{lbl}</div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <style>{`@keyframes ep-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #9b7ae0', borderTopColor: 'transparent', animation: 'ep-spin .8s linear infinite' }}/>
    </>
  )
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function totalSeconds(cfg) {
  if (cfg.durationSecs) return cfg.durationSecs
  const c = cfg.count ?? 10
  return c <= 10 ? 600 : c <= 20 ? 1200 : c <= 30 ? 1800 : 2400
}

export default function PracticeSessionPage() {
  const router = useRouter()
  const [config,      setConfig]   = useState(null)
  const [questions,   setQs]       = useState([])
  const [index,       setIndex]    = useState(0)
  const [answers,     setAnswers]  = useState({})
  const [xp,          setXP]       = useState(0)
  const [loading,     setLoading]  = useState(true)
  const [error,       setError]    = useState(null)
  const [secondsLeft, setSecs]     = useState(0)
  const [totalSecs,   setTotal]    = useState(0)
  const [toasts,      setToasts]   = useState([])
  const timerRef   = useRef(null)
  const answersRef = useRef({})
  const firedRef   = useRef(new Set())

  const addToast    = useCallback((msg, type = 'warning') => { const id = Date.now(); setToasts(p => [...p, { id, message: msg, type }]) }, [])
  const dismissToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])

  // Hide layout bottom nav during practice
  useEffect(() => {
    document.body.dataset.hideNav = 'true'
    return () => { delete document.body.dataset.hideNav }
  }, [])

  const finishSession = useCallback((finalAnswers, finalQs) => {
    clearInterval(timerRef.current)
    const qs = finalQs ?? questions
    const arr = qs.map(q => ({
      questionId: q.id,
      selected:   finalAnswers[q.id]?.selected  ?? null,
      isCorrect:  finalAnswers[q.id]?.isCorrect ?? false,
    }))
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers: arr,
      questions: qs.map(q => ({
        id: q.id, subject_name: q.subject_name, subject_id: q.subject_id,
        topic_name: q.topic_name, topic_id: q.topic_id,
        subtopic_name: q.subtopic_name, subtopic_id: q.subtopic_id,
        correct_answer: q.correct_answer,
      })),
      config,
    }))
    router.push('/student/practice/results')
  }, [config, router, questions])

  // Load questions
  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No session config found.'); setLoading(false); return }
    let cfg
    try { cfg = JSON.parse(raw) } catch { setError('Invalid config.'); setLoading(false); return }
    setConfig(cfg)

    const params = new URLSearchParams({
      subjects: (cfg.subjects ?? []).join(','),
      exam:     cfg.examType ?? 'WAEC',
      count:    String(cfg.count ?? 10),
      mode:     cfg.mode ?? 'practice',
    })
    if (cfg.topic_id)    params.set('topic_id', cfg.topic_id)
    if (cfg.subject_id)  params.set('subject_id', cfg.subject_id)

    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions available.'); setLoading(false); return }
        setQs(qs)
        const s = totalSeconds(cfg)
        setTotal(s); setSecs(s)
        setLoading(false)
      })
      .catch(() => { setError('Network error. Try again.'); setLoading(false) })
  }, [])

  // Timer
  useEffect(() => {
    if (totalSecs <= 0 || loading || questions.length === 0) return
    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSecs / 60)
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); finishSession(answersRef.current, questions); return 0 }
        const ns = s - 1
        minuteWarnings.forEach(w => {
          const thr = w.minutes * 60
          if (ns === thr && !firedRef.current.has(thr)) {
            firedRef.current.add(thr); addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning')
          }
        })
        secondWarnings.forEach(w => {
          const key = `s${w.seconds}`
          if (ns === w.seconds && !firedRef.current.has(key)) {
            firedRef.current.add(key); addToast(w.label, 'urgent')
          }
        })
        return ns
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, loading, questions.length]) // eslint-disable-line

  function handleAnswer(letter) {
    const q = questions[index]
    if (!q || answersRef.current[q.id]) return
    const isCorrect = letter === q.correct_answer
    const entry = { selected: letter, isCorrect }
    answersRef.current = { ...answersRef.current, [q.id]: entry }
    setAnswers(prev => ({ ...prev, [q.id]: entry }))
    if (isCorrect) setXP(x => x + 20)
    // Auto-advance after 1200ms
    setTimeout(() => {
      const next = index + 1
      if (next >= questions.length) finishSession(answersRef.current, questions)
      else setIndex(next)
    }, 1200)
  }

  function handleSubmitNext() {
    const next = index + 1
    if (next >= questions.length) finishSession(answersRef.current, questions)
    else setIndex(next)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0d0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Spinner />
      <p style={{ fontSize: 13, color: '#7b7f9e' }}>Loading questions…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100dvh', background: '#0d0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#eef0fa' }}>{error}</p>
      <button onClick={() => router.push('/student/practice')} style={{ padding: '10px 20px', background: '#0b1330', color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Back</button>
    </div>
  )

  const q       = questions[index]
  const ans     = q ? answers[q.id] : null
  const revealed = !!ans
  const correct  = q?.correct_answer
  const opts = q?.options && typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options).map(([letter, text]) => ({ letter, text })) : []
  const subjectName = q?.subject_name ?? config?.subjects?.[0] ?? ''
  const topicName   = q?.topic_name   ?? config?.topicName ?? ''
  const accent      = getAccent(subjectName)
  const progress    = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0
  const timerCol    = totalSecs > 0 ? getTimerColor(secondsLeft, totalSecs) : null

  return (
    // Full-height flex column — critical for layout
    <div style={{
      height: '100dvh', overflow: 'hidden',
      background: 'radial-gradient(ellipse 90% 70% at 60% 30%, #140e2a 0%, #08090f 100%)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Tiled ambient pattern — absolute, behind everything */}
      <AmbientPattern accent={accent} />

      {/* ── HUD ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        background: 'rgba(0,0,0,.2)', borderBottom: '1px solid rgba(255,255,255,.06)',
        position: 'relative', zIndex: 2, flexShrink: 0,
      }}>
        {/* Back button */}
        <button
          onClick={() => {
            if (window.confirm('Exit? Progress will be lost.')) {
              clearInterval(timerRef.current)
              router.push('/student/practice')
            }
          }}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: 'rgba(255,255,255,.6)',
            border: 'none', cursor: 'pointer',
          }}
        >←</button>

        {/* Subject · Topic */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)' }}>
          <span style={{ color: accent }}>{subjectName}</span>
          {topicName ? ` · ${topicName}` : ''}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 6 }}>
          <StatCard val={`${index + 1}/${questions.length}`} lbl="Qns" />
          <StatCard val={`✦ ${xp}`} lbl="XP" gold />
          {totalSecs > 0 && (
            <StatCard val={formatTime(secondsLeft)} lbl="Time" />
          )}
        </div>
      </div>

      {/* ── Mission bar ─────────────────────────────────────────────────────── */}
      <div style={{
        margin: '10px 14px',
        padding: '10px 13px', borderRadius: 11,
        background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)',
        position: 'relative', zIndex: 2, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 8, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'rgba(255,255,255,.3)', marginBottom: 3,
        }}>
          {topicName ? `${topicName} — ` : ''}Q{index + 1} of {questions.length}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>
          {index < questions.length - 1
            ? `${questions.length - index - 1} more question${questions.length - index - 1 !== 1 ? 's' : ''} to go`
            : 'Last question — give it your best!'}
        </div>
        {/* Progress strip */}
        <div style={{ height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 1, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 1,
            background: `linear-gradient(90deg, ${accent}, #ff8fab)`,
            width: `${progress}%`, transition: 'width .4s',
          }} />
        </div>
      </div>

      {/* ── Scrollable content (question + answers only) ─────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '10px 14px 0',
        position: 'relative', zIndex: 2,
      }}>
        {/* White question card */}
        {q && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 16,
            border: `2.5px solid ${accent}`,
            boxShadow: '0 8px 0 rgba(0,0,0,.08), 0 14px 28px rgba(11,19,48,.15)',
            marginBottom: 10,
          }}>
            <p style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: accent, marginBottom: 6,
            }}>
              Question {index + 1}{q.year ? ` · WAEC ${q.year}` : ''}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#13162a', lineHeight: 1.4 }}>
              {q.question_text ?? q.question ?? ''}
            </p>
            {q.difficulty && (
              <p style={{ fontSize: 9, color: '#9ca1bc', marginTop: 4 }}>{q.difficulty}</p>
            )}
          </div>
        )}

        {/* Answer buttons */}
        {q && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {opts.map(({ letter, text }) => {
              // letter from entry
              const isCorrectOpt  = letter === correct
              const isPickedOpt   = ans?.selected === letter

              let bg     = 'rgba(255,255,255,.04)'
              let border = '1.5px solid rgba(255,255,255,.07)'
              let color  = 'rgba(255,255,255,.6)'

              if (revealed && isCorrectOpt) {
                bg     = 'rgba(108,206,142,.15)'
                border = '1.5px solid rgba(108,206,142,.5)'
                color  = C.success
              } else if (revealed && isPickedOpt && !isCorrectOpt) {
                bg     = 'rgba(239,93,78,.12)'
                border = '1.5px solid rgba(239,93,78,.4)'
                color  = C.danger
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  disabled={revealed}
                  style={{
                    padding: '10px 12px', borderRadius: 11,
                    background: bg, border, color,
                    fontSize: 12, fontWeight: 600, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: revealed ? 'default' : 'pointer',
                    transition: 'all .1s',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: 'rgba(255,255,255,.07)',
                    fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {letter}
                  </span>
                  {text}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Submit / Next button — OUTSIDE scroll, always visible ─────────── */}
      {revealed && (
        <SubmitButton onClick={handleSubmitNext} isLast={index >= questions.length - 1} />
      )}
    </div>
  )
}

// ── Submit button with 3D press effect ───────────────────────────────────────
function SubmitButton({ onClick, isLast }) {
  const [p, setP] = useState(false)
  return (
    <div style={{ position: 'relative', zIndex: 2, margin: '0 14px 10px', flexShrink: 0 }}>
      <button
        onClick={onClick}
        onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
        onMouseLeave={() => setP(false)}
        onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
        style={{
          width: '100%', padding: 12, borderRadius: 12,
          background: C.navy, color: '#fff',
          fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
          transform: p ? 'translateY(3px)' : '',
          boxShadow: p
            ? `0 2px 0 ${C.navyDeep}`
            : `0 5px 0 ${C.navyDeep}, 0 8px 16px rgba(0,0,0,.4)`,
          transition: 'transform .1s, box-shadow .1s',
        }}
      >
        {isLast ? 'See my results →' : 'Next Question →'}
      </button>
    </div>
  )
}