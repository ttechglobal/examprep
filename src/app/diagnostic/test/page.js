'use client'
// src/app/diagnostic/test/page.js — v3
// Full light + dark via CSS var tokens. No hardcoded dark.
// --screen-* tokens in globals.css drive light vs dark automatically.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import { getTotalSeconds, getWarningThresholds, formatTime, getTimerColor } from '@/lib/practiceTimer'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function Cta3D({ onClick, children }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
        textAlign: 'center', letterSpacing: '-0.01em',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p ? '0 2px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(10,13,26,0.2)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >{children}</button>
  )
}

export default function DiagnosticTestPage() {
  const router = useRouter()
  const [setup,      setSetup]   = useState(null)
  const [questions,  setQs]      = useState([])
  const [qIndex,     setQIndex]  = useState(0)
  const [answers,    setAnswers] = useState({})
  const [loading,    setLoading] = useState(true)
  const [error,      setError]   = useState(null)
  const [toasts,     setToasts]  = useState([])
  const [secsLeft,   setSecs]    = useState(0)
  const [totalSecs,  setTotal]   = useState(0)
  const timerRef = useRef(null)
  const firedRef = useRef(new Set())

  const addToast     = useCallback((msg, type = 'warning') => { const id = Date.now(); setToasts(p => [...p, { id, message: msg, type }]) }, [])
  const dismissToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])

  const submitTest = useCallback((ans, qs) => {
    clearInterval(timerRef.current)
    const setup_ = (() => { try { return JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}') } catch { return {} } })()
    sessionStorage.setItem('diagnostic_results', JSON.stringify({
      setup: setup_, answers: ans,
      questions: (qs ?? []).map(q => ({
        id: q.id, subtopic_id: q.subtopic_id,
        subtopic_name: q.subtopics?.name ?? q.subtopic_name ?? '',
        topic_id: q.topic_id, topic_name: q.topics?.name ?? q.topic_name ?? '',
        subject_id: q.subject_id, subject_name: q.subjects?.name ?? q.subject_name ?? '',
        correct_answer: q.correct_answer,
      })),
    }))
    router.push('/diagnostic/results')
  }, [router])

  useEffect(() => {
    injectMathStyles()
    const raw = sessionStorage.getItem('diagnostic_setup')
    const parsed = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null
    if (!parsed) { setError('No exam setup found. Please go back and try again.'); setLoading(false); return }
    setSetup(parsed)
    const subjects = Array.isArray(parsed.subjects) ? parsed.subjects : []
    const count    = parsed.questionCount ?? 5
    const params   = new URLSearchParams({ subjects: subjects.join(','), exam: parsed.examType ?? 'WAEC', count: String(count), mode: 'diagnostic' })
    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions available.'); setLoading(false); return }
        setQs(qs)
        const s = getTotalSeconds(qs.length)
        setTotal(s); setSecs(s); setLoading(false)
      })
      .catch(() => { setError('Network error. Check your connection.'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (totalSecs <= 0 || loading || questions.length === 0) return
    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSecs / 60)
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); submitTest(answers, questions); return 0 }
        const ns = s - 1
        minuteWarnings.forEach(w => {
          const thr = w.minutes * 60
          if (ns === thr && !firedRef.current.has(thr)) { firedRef.current.add(thr); addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning') }
        })
        secondWarnings.forEach(w => {
          const key = `s${w.seconds}`
          if (ns === w.seconds && !firedRef.current.has(key)) { firedRef.current.add(key); addToast(w.label, 'urgent') }
        })
        return ns
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, loading, questions.length]) // eslint-disable-line

  function handleAnswer(letter) {
    const q = questions[qIndex]
    if (!q || answers[q.id]) return
    const is_correct = letter === q.correct_answer
    const next = { ...answers, [q.id]: { selected: letter, is_correct } }
    setAnswers(next)
    // Auto-advance after 1400ms
    setTimeout(() => {
      const ni = qIndex + 1
      if (ni >= questions.length) submitTest(next, questions)
      else setQIndex(ni)
    }, 1400)
  }

  function handleNext() {
    const ni = qIndex + 1
    if (ni >= questions.length) submitTest(answers, questions)
    else setQIndex(ni)
  }

  if (loading) return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#4338ca', borderTopColor: 'transparent' }} />
      <p className="text-secondary text-sm">Loading questions…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p style={{ fontSize: 32 }}>😕</p>
      <p className="text-primary font-bold text-sm">{error}</p>
      <button onClick={() => router.push('/onboarding')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: '#0b1330' }}>← Back</button>
    </div>
  )

  const q        = questions[qIndex]
  const ans      = q ? answers[q.id] : null
  const revealed = !!ans
  const correct  = q?.correct_answer
  const opts     = q?.options ? (typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options) : []) : []
  const progress = questions.length > 0 ? ((qIndex + 1) / questions.length) * 100 : 0
  const subjectLabel = setup?.subjects?.[0] ?? 'Diagnostic'
  const timerCol = totalSecs > 0 ? getTimerColor(secsLeft, totalSecs) : undefined

  return (
    <div className="min-h-dvh bg-base flex flex-col">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── App bar ── */}
      <div className="flex items-center justify-between px-4 border-b border-default"
        style={{ height: 52, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', flexShrink: 0 }}>
        <button onClick={() => router.push('/onboarding')}
          className="text-secondary font-bold text-sm">← Back</button>
        <span className="text-secondary text-xs font-bold">Diagnostic · {subjectLabel}</span>
        <div className="flex items-center gap-2">
          <span className="text-tertiary text-xs">{qIndex + 1}/{questions.length}</span>
          {totalSecs > 0 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-subtle"
              style={{ color: timerCol ?? 'var(--text-sec)' }}>
              {formatTime(secsLeft)}
            </span>
          )}
        </div>
      </div>

      {/* ── Progress strip ── */}
      <div className="h-1 bg-subtle flex-shrink-0">
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#4338ca,#7c3aed)', width: `${progress}%`, transition: 'width .4s' }} />
      </div>

      {/* ── Scroll zone ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8" style={{ maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Question card — uses bg-card (white in light, navy-dark in dark) */}
        {q && (
          <div className="bg-card rounded-2xl shadow-card border border-default p-4"
            style={{ borderTop: '3px solid #4338ca' }}>
            <p className="text-tertiary font-black uppercase tracking-widest mb-2"
              style={{ fontSize: 9, letterSpacing: '0.1em', color: '#4338ca' }}>
              Question {qIndex + 1}{q.year ? ` · WAEC ${q.year}` : ''}
            </p>
            <MathText
              text={q.question_text ?? q.question ?? ''}
              className="text-primary font-semibold leading-relaxed text-sm"
              as="p"
            />
            {q.topic_name && (
              <p className="text-tertiary text-xs mt-2">{q.topic_name}</p>
            )}
          </div>
        )}

        {/* Answer buttons */}
        {q && (
          <div className="flex flex-col gap-2">
            {opts.map(([letter, text]) => {
              const isCorrectOpt = letter === correct
              const isPickedOpt  = ans?.selected === letter
              // Build styles using CSS vars — no hardcoded dark colours
              let bg     = 'var(--bg-card)'
              let border = '2px solid var(--border)'
              let color  = 'var(--text-secondary)'
              if (revealed && isCorrectOpt) {
                bg = 'var(--success-bg)'; border = '2px solid var(--success-border)'; color = 'var(--success)'
              } else if (revealed && isPickedOpt && !isCorrectOpt) {
                bg = 'var(--danger-bg)'; border = '2px solid var(--danger-border)'; color = 'var(--danger)'
              }
              return (
                <button key={letter} onClick={() => handleAnswer(letter)} disabled={revealed}
                  style={{
                    padding: '11px 13px', borderRadius: 12,
                    background: bg, border, color,
                    fontSize: 13, fontWeight: 600, textAlign: 'left',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    cursor: revealed ? 'default' : 'pointer', transition: 'all .12s',
                    boxShadow: !revealed ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: revealed && isCorrectOpt ? 'var(--success)' :
                                revealed && isPickedOpt  ? 'var(--danger)'  :
                                'var(--bg-subtle)',
                    color: revealed && (isCorrectOpt || (isPickedOpt && !isCorrectOpt)) ? '#fff' : 'var(--text-tertiary)',
                  }}>
                    {revealed && isCorrectOpt ? '✓' : revealed && isPickedOpt && !isCorrectOpt ? '✗' : letter}
                  </span>
                  <MathText text={String(text ?? '')} className="flex-1 leading-snug" as="span" />
                </button>
              )
            })}
          </div>
        )}

        {/* Feedback + Next */}
        {revealed && (
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: ans.is_correct ? 'var(--success-bg)'   : 'var(--danger-bg)',
                border:     ans.is_correct ? '1px solid var(--success-border)' : '1px solid var(--danger-border)',
                color:      ans.is_correct ? 'var(--success)'       : 'var(--danger)',
              }}>
              {ans.is_correct ? '✓ Correct!' : `✗ The correct answer is ${correct}`}
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