'use client'
// src/app/diagnostic/test/page.js — v2
// REDESIGN: matches prototype screen 2 exactly.
// KEY VISUAL DETAILS FROM PROTOTYPE:
//   • Dark bg (#0d0e14), NO layout wrapper/shell
//   • app-bar: h=52px, flex space-between, border-bottom rgba(255,255,255,.07)
//     LEFT: "← Back" (13px, dim, 700)
//     CENTER: "Diagnostic · Chemistry" (12px, dim, 700)
//     RIGHT: "3 / 5" counter (11px, dim)
//   • diag-header: padding 14px 18px 0, OUTSIDE scroll zone
//     progress-strip: h=4px, bg rgba(255,255,255,.06), fill gradient chem→phys, margin-bottom 14px
//   • scroll-zone: flex-1, overflow-y auto, padding 20px 18px 24px, gap 12px
//   • q-card: bg #fff, border-radius 18px, padding 18px,
//     border: 2px solid #9b7ae0, box-shadow: 0 8px 0 rgba(0,0,0,.08) 0 14px 28px rgba(11,19,48,.15)
//   • q-num: 9px, 800, uppercase, letter-spacing .1em, color #9b7ae0, margin-bottom 7px
//   • q-text: 14px, 700, color #13162a, line-height 1.4
//   • q-year: 10px, color #9ca1bc, margin-top 5px
//   • ans-btn: dark glass pill, gap 9px, letter box 22×22px border-radius 6px
//     hover: chem purple tint
//     correct: rgba(108,206,142,.15) border rgba(108,206,142,.5) color #6cce8e
//     wrong: rgba(239,93,78,.12) border rgba(239,93,78,.4) color #ef5d4e
//   • feedback-pill: inline-flex, padding 6px 12px, border-radius 999px, 11px 700
//     .right: green bg/border/text  .wrong: red bg/border/text
//   • After answer: feedback pill + navy CTA appear inline in the scroll zone
//   • Auto-advance on correct after 1400ms; on wrong, show "Next question →" CTA manually

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import { getTotalSeconds, getWarningThresholds, formatTime, getTimerColor } from '@/lib/practiceTimer'

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0d0e14',
  surface:  '#13141f',
  border:   'rgba(255,255,255,0.07)',
  text:     '#eef0fa',
  dim:      '#7b7f9e',
  chem:     '#9b7ae0',
  phys:     '#ff8fab',
  success:  '#6cce8e',
  danger:   '#ef5d4e',
  gold:     '#ffc36b',
  navy:     '#0b1330',
  navyDeep: '#05070f',
}

// ── 3D navy CTA ───────────────────────────────────────────────────────────────
function Cta3D({ onClick, children }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 15, borderRadius: 14,
        background: C.navy, color: '#fff',
        fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
        textAlign: 'center', letterSpacing: '-0.01em',
        transform: p ? 'translateY(3px)' : '',
        boxShadow: p
          ? `0 3px 0 ${C.navyDeep}`
          : `0 6px 0 ${C.navyDeep}, 0 10px 24px rgba(0,0,0,.4)`,
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <style>{`@keyframes ep-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid ${C.chem}`, borderTopColor: 'transparent',
        animation: 'ep-spin .8s linear infinite',
      }} />
    </>
  )
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function DiagnosticTestPage() {
  const router = useRouter()
  const [setup,       setSetup]    = useState(null)
  const [questions,   setQs]       = useState([])
  const [qIndex,      setQIndex]   = useState(0)
  const [answers,     setAnswers]  = useState({})   // { [qId]: { selected, is_correct } }
  const [loading,     setLoading]  = useState(true)
  const [error,       setError]    = useState(null)
  const [toasts,      setToasts]   = useState([])
  const [secondsLeft, setSecs]     = useState(0)
  const [totalSecs,   setTotal]    = useState(0)
  const timerRef      = useRef(null)
  const firedRef      = useRef(new Set())

  const addToast    = useCallback((msg, type = 'warning') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message: msg, type }])
  }, [])
  const dismissToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])

  // ── Submit test ─────────────────────────────────────────────────────────────
  const submitTest = useCallback((ans, qs) => {
    clearInterval(timerRef.current)
    const setup_ = (() => { try { return JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}') } catch { return {} } })()
    sessionStorage.setItem('diagnostic_results', JSON.stringify({
      setup: setup_,
      answers: ans,
      questions: (qs ?? []).map(q => ({
        id:            q.id,
        subtopic_id:   q.subtopic_id,
        subtopic_name: q.subtopics?.name ?? q.subtopic_name ?? '',
        topic_id:      q.topic_id,
        topic_name:    q.topics?.name ?? q.topic_name ?? '',
        subject_id:    q.subject_id,
        subject_name:  q.subjects?.name ?? q.subject_name ?? '',
        correct_answer: q.correct_answer,
      })),
    }))
    router.push('/diagnostic/results')
  }, [router])

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('diagnostic_setup')
    const parsed = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null
    if (!parsed) { setError('No exam setup found. Please go back and try again.'); setLoading(false); return }
    setSetup(parsed)

    const subjects = Array.isArray(parsed.subjects) ? parsed.subjects : []
    const count    = parsed.questionCount ?? 5
    const params   = new URLSearchParams({
      subjects: subjects.join(','),
      exam:     parsed.examType ?? 'WAEC',
      count:    String(count),
      mode:     'diagnostic',
    })

    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions available for these subjects.'); setLoading(false); return }
        setQs(qs)
        const secs = getTotalSeconds(qs.length)
        setTotal(secs)
        setSecs(secs)
        setLoading(false)
      })
      .catch(() => { setError('Network error. Check your connection and try again.'); setLoading(false) })
  }, [])

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (totalSecs <= 0 || loading || questions.length === 0) return
    // getWarningThresholds(totalMinutes) → { minuteWarnings, secondWarnings }
    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSecs / 60)
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          submitTest(answers, questions)
          return 0
        }
        const ns = s - 1
        minuteWarnings.forEach(w => {
          const thr = w.minutes * 60
          if (ns === thr && !firedRef.current.has(thr)) {
            firedRef.current.add(thr)
            addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning')
          }
        })
        secondWarnings.forEach(w => {
          const key = `s${w.seconds}`
          if (ns === w.seconds && !firedRef.current.has(key)) {
            firedRef.current.add(key)
            addToast(w.label, 'urgent')
          }
        })
        return ns
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, loading, questions.length]) // eslint-disable-line

  // ── Answer handler ───────────────────────────────────────────────────────────
  function handleAnswer(letter) {
    const q = questions[qIndex]
    if (!q || answers[q.id]) return

    const is_correct = letter === q.correct_answer
    const entry = { selected: letter, is_correct }
    const nextAnswers = { ...answers, [q.id]: entry }
    setAnswers(nextAnswers)

    // Auto-advance after 1400ms
    setTimeout(() => {
      const nextIdx = qIndex + 1
      if (nextIdx >= questions.length) {
        submitTest(nextAnswers, questions)
      } else {
        setQIndex(nextIdx)
      }
    }, 1400)
  }

  function handleNext() {
    const nextIdx = qIndex + 1
    if (nextIdx >= questions.length) submitTest(answers, questions)
    else setQIndex(nextIdx)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Spinner />
      <p style={{ fontSize: 13, color: C.dim }}>Loading questions…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 32 }}>😕</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{error}</p>
      <button
        onClick={() => router.push('/')}
        style={{ padding: '10px 20px', background: C.chem, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
      >
        ← Back
      </button>
    </div>
  )

  // ── Current question ─────────────────────────────────────────────────────────
  const q       = questions[qIndex]
  const ans     = q ? answers[q.id] : null
  const revealed = !!ans
  const correct  = q?.correct_answer
  const opts = q?.options && typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options).map(([letter, text]) => ({ letter, text })) : []
  const subjectLabel = setup?.subjects?.[0] ?? 'Diagnostic'
  const progress = questions.length > 0 ? ((qIndex + 1) / questions.length) * 100 : 0
  const timerCol = totalSecs > 0 ? getTimerColor(secondsLeft, totalSecs) : C.dim

  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── App bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: `1px solid ${C.border}`,
        background: 'rgba(13,14,20,.96)', backdropFilter: 'blur(14px)', flexShrink: 0,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ fontSize: 13, color: C.dim, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
        >← Back</button>

        <span style={{ fontSize: 12, fontWeight: 700, color: C.dim }}>
          Diagnostic · {subjectLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: C.dim }}>
            {qIndex + 1} / {questions.length}
          </span>
          {totalSecs > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: timerCol,
              background: 'rgba(255,255,255,.06)', padding: '2px 7px', borderRadius: 6,
            }}>
              {formatTime(secondsLeft)}
            </span>
          )}
        </div>
      </div>

      {/* ── Progress strip (OUTSIDE scroll zone, like prototype) ────────────── */}
      <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg, ${C.chem}, ${C.phys})`,
            width: `${progress}%`, transition: 'width .4s',
          }} />
        </div>
      </div>

      {/* ── Scroll zone ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 18px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* Question card — white, accent border, hard shadow */}
        {q && (
          <div style={{
            background: '#ffffff', borderRadius: 18, padding: 18,
            border: `2px solid ${C.chem}`,
            boxShadow: '0 8px 0 rgba(0,0,0,.08), 0 14px 28px rgba(11,19,48,.15)',
          }}>
            <p style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: C.chem, marginBottom: 7,
            }}>
              Question {qIndex + 1}
              {q.year ? ` · ${q.exam_type ?? 'WAEC'} ${q.year}` : ''}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#13162a', lineHeight: 1.4 }}>
              {q.question_text ?? q.question ?? ''}
            </p>
            {(q.topic_name || q.difficulty) && (
              <p style={{ fontSize: 10, color: '#9ca1bc', marginTop: 5, fontWeight: 500 }}>
                {[q.topic_name, q.difficulty].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* Answer buttons */}
        {q && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {opts.map(({ letter, text }) => {
              // letter comes from opts entry directly
              const isCorrectOpt = letter === correct
              const isPickedOpt  = ans?.selected === letter

              let bg     = 'rgba(255,255,255,.04)'
              let border = '1.5px solid rgba(255,255,255,.08)'
              let color  = 'rgba(255,255,255,.65)'

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
                    padding: '11px 13px', borderRadius: 12,
                    background: bg, border, color,
                    fontSize: 13, fontWeight: 600, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 9,
                    cursor: revealed ? 'default' : 'pointer',
                    transition: 'all .12s',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(255,255,255,.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                  }}>
                    {letter}
                  </span>
                  {text}
                </button>
              )
            })}
          </div>
        )}

        {/* Feedback pill + Next CTA — appear after answering */}
        {revealed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 999,
              fontSize: 11, fontWeight: 700,
              ...(ans.is_correct
                ? { background: 'rgba(108,206,142,.15)', color: C.success, border: '1px solid rgba(108,206,142,.3)' }
                : { background: 'rgba(239,93,78,.1)',    color: C.danger,  border: '1px solid rgba(239,93,78,.3)'  }
              ),
            }}>
              {ans.is_correct
                ? `✓ Correct!`
                : `✗ The correct answer is ${correct}`
              }
            </div>
            <Cta3D onClick={handleNext}>
              {qIndex < questions.length - 1 ? 'Next question →' : 'See my results →'}
            </Cta3D>
          </div>
        )}
      </div>
    </div>
  )
}