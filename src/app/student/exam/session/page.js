'use client'
// src/app/student/exam/session/page.js
//
// EXAM MODE SESSION — reuses practice session structure but with key differences:
//   1. No "Why?" button, no explanation — answers revealed only AFTER submitting
//   2. Answer can be CHANGED before submitting (click again to change)
//   3. Prev/Next navigation lets student review before submitting the whole paper
//   4. "Submit Paper" button only appears when on the last question (or via review)
//   5. Timer counts down — auto-submits at 0
//   6. Questions marked as answered/skipped via mini progress strip
//   7. No mid-session feedback — only final score report

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatTime, getTimerColor } from '@/lib/practiceTimer'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { ToastStack } from '@/components/ui/Toast'

function safeJson(val, fb) {
  if (!val) return fb
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fb }
}

// Mini question map — shows answered/current/unanswered
function QuestionMap({ total, current, answers, onJump }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 12px' }}>
      {Array.from({ length: total }, (_, i) => {
        const isAnswered = answers[i] !== undefined
        const isCurrent  = i === current
        return (
          <button key={i} onClick={() => onJump(i)}
            style={{
              width: 28, height: 28, borderRadius: 7, fontSize: 9, fontWeight: 800,
              cursor: 'pointer', border: 'none',
              background: isCurrent
                ? '#0b1330'
                : isAnswered ? 'var(--success-bg)' : 'var(--bg-subtle)',
              color: isCurrent ? '#fff' : isAnswered ? 'var(--success)' : 'var(--text-tert)',
              outline: isCurrent ? '2px solid #0b1330' : 'none',
              outlineOffset: 1,
            }}>
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

export default function ExamSessionPage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const timerRef = useRef(null)
  const answersRef = useRef({})

  const [config,    setConfig]    = useState(null)
  const [questions, setQs]        = useState([])
  const [index,     setIndex]     = useState(0)
  // answers: { [questionIndex]: selectedLetter }
  const [answers,   setAnswers]   = useState({})
  const [secsLeft,  setSecs]      = useState(0)
  const [totalSecs, setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showMap,   setShowMap]   = useState(false)
  const [toasts,    setToasts]    = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const addToast = useCallback((msg, type = 'warning') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message: msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  function submitPaper(ans, qs) {
    clearInterval(timerRef.current)
    // Build results in the same shape as practice results
    const results = qs.map((q, i) => ({
      ...q,
      userAnswer: ans[i],
      isCorrect: ans[i] === q.correct_answer,
    }))
    sessionStorage.setItem('exam_results', JSON.stringify({
      results,
      config,
      isExamMode: true,
      submittedAt: new Date().toISOString(),
    }))
    router.push('/student/exam/results')
  }

  useEffect(() => {
    injectMathStyles()
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No exam config found.'); setLoading(false); return }
    let cfg; try { cfg = JSON.parse(raw) } catch { setError('Invalid config.'); setLoading(false); return }
    if (!cfg.isExamMode) { router.push('/student/exam'); return }
    setConfig(cfg)

    const params = new URLSearchParams({
      subjects: (cfg.subjects ?? []).join(','),
      exam:     cfg.examType ?? 'WAEC',
      count:    String(cfg.count ?? 50),
      mode:     'exam',
      source:   'all',
    })

    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions found.'); setLoading(false); return }
        setQs(qs)
        const s = cfg.durationSecs ?? 5400; setTotal(s); setSecs(s)
        setLoading(false)
      })
      .catch(() => { setError('Network error loading questions.'); setLoading(false) })
  }, []) // eslint-disable-line

  // Timer
  useEffect(() => {
    if (totalSecs <= 0 || loading || !questions.length) return
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          addToast('Time is up! Submitting your paper…', 'urgent')
          setTimeout(() => submitPaper(answersRef.current, questions), 1200)
          return 0
        }
        if (s === 300) addToast('5 minutes remaining!', 'warning')
        if (s === 60)  addToast('1 minute remaining!', 'urgent')
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, loading, questions.length]) // eslint-disable-line

  function selectAnswer(letter) {
    const newAns = { ...answersRef.current, [index]: letter }
    answersRef.current = newAns
    setAnswers(newAns)
  }

  function handleSubmit() {
    const answered   = Object.keys(answersRef.current).length
    const unanswered = questions.length - answered
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return
    }
    setSubmitting(true)
    submitPaper(answersRef.current, questions)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid var(--active-border)', borderTopColor: 'var(--active-text)', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>Loading exam paper…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 32 }}>😕</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-prim)' }}>{error}</p>
      <button onClick={() => router.push('/student/exam')} style={{ padding: '10px 20px', borderRadius: 12, background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>← Back to Exam Mode</button>
    </div>
  )

  const q           = questions[index]
  const subjectName = q?.subject_name ?? config?.subjects?.[0] ?? ''
  const subColors   = resolveSubjectColors(subjectName, isDark)
  const accent      = subColors.solid
  const opts        = q?.options ? safeJson(q.options, {}) : {}
  const optEntries  = Object.entries(opts)
  const answered    = Object.keys(answers).length
  const isLast      = index === questions.length - 1
  const timerCol    = getTimerColor(secsLeft, totalSecs)
  const myAnswer    = answers[index]
  const urgentTime  = secsLeft < 300

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (min-width: 900px) {
          .exam-sidebar     { display: flex !important; }
          .exam-map-drawer  { display: none !important; }
          .exam-hud-timer   { display: none !important; }
          /* Inner content cap for comfortable reading width */
          .exam-scroll-inner { max-width: 740px; margin-left: auto; margin-right: auto; }
          .exam-bottom-inner { max-width: 740px; margin-left: auto; margin-right: auto; width: 100%; }
        }
        @media (max-width: 899px) {
          .exam-sidebar { display: none !important; }
        }
      `}</style>

      <div className="exam-shell" style={{ height: '100dvh', display: 'flex', flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />

        {/* ── Desktop sidebar ── */}
        <div className="exam-sidebar" style={{ display: 'none', width: 240, flexShrink: 0, height: '100%', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
          {/* Top info */}
          <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>{subjectName}</p>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,185,66,.12)', border: '1px solid rgba(245,185,66,.25)', marginBottom: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#d97706' }}>📝 {config?.examType ?? 'WAEC'} Mock Exam</span>
            </div>
            {/* Big timer */}
            <div style={{ padding: '10px 12px', borderRadius: 12, background: urgentTime ? 'var(--danger-bg)' : 'var(--bg-subtle)', border: `1px solid ${urgentTime ? 'var(--danger-border)' : 'var(--border)'}`, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>Time left</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: timerCol, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{formatTime(secsLeft)}</span>
            </div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Answered', value: answered, color: 'var(--text-prim)' },
                { label: 'Left', value: questions.length - answered, color: 'var(--text-tert)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '7px 0', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 8, color: 'var(--text-tert)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Question grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
              Questions · {questions.length} total
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {questions.map((_, i) => {
                const isAns  = answers[i] !== undefined
                const isCurr = i === index
                let bg     = 'var(--bg-subtle)'
                let border = '1px solid var(--border)'
                let color  = 'var(--text-tert)'
                if (isCurr) { bg = accent; border = `1px solid ${accent}`; color = '#fff' }
                else if (isAns) { bg = 'var(--success-bg)'; border = '1px solid var(--success-border)'; color = 'var(--success)' }
                return (
                  <button key={i} onClick={() => setIndex(i)}
                    style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: bg, border, color, fontWeight: isCurr ? 800 : 600, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            {/* Legend */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { bg: 'var(--bg-subtle)',    border: '1px solid var(--border)',          label: 'Not answered' },
                { bg: 'var(--success-bg)',   border: '1px solid var(--success-border)',  label: 'Answered' },
              ].map(({ bg, border, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content column — full width, inner content capped ── */}
        <div className="exam-inner" style={{ flex: 1, minWidth: 0, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* HUD bar */}
          <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowSubmitModal(true)}
              style={{ height: 34, padding: '0 12px', borderRadius: 10, background: answered >= questions.length ? '#059669' : 'var(--bg-subtle)', border: `1px solid ${answered >= questions.length ? '#059669' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: answered >= questions.length ? '#fff' : 'var(--text-tert)', cursor: 'pointer', flexShrink: 0, letterSpacing: '-0.01em', transition: 'all .2s', whiteSpace: 'nowrap' }}>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none"><path d="M4 10L8.5 14.5L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Submit
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: accent, width: `${((index + 1) / questions.length) * 100}%`, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={() => setShowMap(m => !m)}
                  style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Q{index + 1} / {questions.length}
                </button>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>{answered} answered</span>
              </div>
            </div>
            {/* Timer — mobile only, hidden on desktop via CSS */}
            <div className="exam-hud-timer" style={{ background: urgentTime ? 'var(--danger-bg)' : 'var(--bg-subtle)', border: `1px solid ${urgentTime ? 'var(--danger-border)' : 'var(--border)'}`, borderRadius: 9, padding: '4px 10px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: timerCol, lineHeight: 1 }}>{formatTime(secsLeft)}</p>
              <p style={{ fontSize: 7, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 1 }}>left</p>
            </div>
          </div>

          {/* Mobile question map drawer */}
          {showMap && (
            <div className="exam-map-drawer" style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <QuestionMap total={questions.length} current={index} answers={answers} onJump={i => { setIndex(i); setShowMap(false) }} />
            </div>
          )}

          {/* Scroll zone — full width, inner content capped for reading comfort */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 6px', minHeight: 0 }}>
          <div className="exam-scroll-inner" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Question card */}
            {q && (
              <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 18px 14px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: accent }}>
                    Question {index + 1} of {questions.length}
                  </span>
                  {q.year && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${accent}18`, color: accent }}>
                      {config?.examType ?? 'WAEC'} {q.year}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,.05)', color: '#555' }}>
                    Exam mode
                  </span>
                </div>
                <MathText
                  text={q.question_text ?? q.question ?? ''}
                  style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: '#0a0d1a' }}
                  as="p"
                />
              </div>
            )}

            {/* Options */}
            {q && optEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {optEntries.map(([letter, text]) => {
                  const isSelected = myAnswer === letter
                  return (
                    <button key={letter} onClick={() => selectAnswer(letter)}
                      style={{
                        padding: '13px 14px', borderRadius: 16, width: '100%',
                        background: isSelected ? 'var(--active-bg)' : 'var(--bg-card)',
                        border: `${isSelected ? '2px' : '1.5px'} solid ${isSelected ? 'var(--active-border)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        textAlign: 'left', cursor: 'pointer', transition: 'all .12s',
                      }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        fontSize: 11, fontWeight: 800, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? 'var(--active-text)' : 'var(--bg-subtle)',
                        color: isSelected ? '#fff' : 'var(--text-tert)',
                        border: isSelected ? 'none' : '1px solid var(--border)',
                      }}>
                        {letter}
                      </span>
                      <MathText
                        text={String(text ?? '')}
                        as="span"
                        style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--active-text)' : 'var(--text-prim)', lineHeight: 1.55 }}
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>{/* end exam-scroll-inner */}
          </div>{/* end scroll zone */}

          {/* Bottom bar — full width, inner content capped */}
          <div style={{ flexShrink: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--border)', padding: '10px 24px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="exam-bottom-inner" style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              style={{ width: 48, height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700, background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1, flexShrink: 0 }}>
              ←
            </button>
            {/* Next/Submit — Submit gets a distinct green style even mid-paper via the modal */}
            {isLast ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={submitting}
                style={{ flex: 1, height: 52, borderRadius: 14, fontSize: 15, fontWeight: 900, background: submitting ? '#047857' : '#059669', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 5px 0 #047857, 0 8px 20px rgba(5,150,105,.35)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'box-shadow .1s' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10L8.5 14.5L16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {submitting ? 'Submitting…' : 'Submit Paper'}
              </button>
            ) : (
              <button
                onClick={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
                style={{ flex: 1, height: 52, borderRadius: 14, fontSize: 15, fontWeight: 800, background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 5px 0 #05070f, 0 8px 20px rgba(0,0,0,.18)', letterSpacing: '-0.01em' }}>
                Next →
              </button>
            )}
            {/* Submit shortcut — always visible, dimmed when not last */}
            {!isLast && (
              <button
                onClick={() => setShowSubmitModal(true)}
                title="Submit exam"
                style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: answered >= questions.length ? '#059669' : 'var(--bg-subtle)', border: `1.5px solid ${answered >= questions.length ? '#059669' : 'var(--border)'}`, color: answered >= questions.length ? '#fff' : 'var(--text-tert)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexDirection: 'column', gap: 1, transition: 'all .2s' }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10L8.5 14.5L16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 7, letterSpacing: '0.03em' }}>SUB</span>
              </button>
            )}
          </div>{/* end exam-bottom-inner */}
          </div>{/* end bottom bar */}

          {/* ── Submit confirmation modal ── */}
          {showSubmitModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
              onClick={() => setShowSubmitModal(false)}>
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: 'var(--bg-card)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.4)', border: '1px solid var(--border)' }}>
                <div style={{ background: 'linear-gradient(135deg,#0b1330 0%,#1a2c6e 100%)', padding: '24px 24px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Submit exam paper?</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 5 }}>{config?.examType ?? 'WAEC'} Mock Exam</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { val: answered,                    lbl: 'Answered',   col: '#16a34a' },
                    { val: questions.length - answered, lbl: 'Unanswered', col: answered < questions.length ? '#dc2626' : 'var(--text-tert)' },
                  ].map(({ val, lbl, col }, i) => (
                    <div key={lbl} style={{ padding: '14px 0', textAlign: 'center', borderRight: i === 0 ? '1px solid var(--border)' : 'none' }}>
                      <p style={{ fontSize: 24, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 3 }}>{val}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{lbl}</p>
                    </div>
                  ))}
                </div>
                {answered < questions.length && (
                  <div style={{ padding: '12px 20px 4px', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.5 }}>
                      {questions.length - answered} question{questions.length - answered > 1 ? 's' : ''} unanswered. Go back to complete them or submit now.
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, padding: '10px 20px 20px' }}>
                  <button onClick={() => setShowSubmitModal(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 13, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}>
                    Keep answering
                  </button>
                  <button onClick={() => { setShowSubmitModal(false); setSubmitting(true); submitPaper(answersRef.current, questions) }}
                    style={{ flex: 1, padding: '13px 0', borderRadius: 13, fontSize: 14, fontWeight: 800, background: '#059669', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #047857' }}>
                    Submit ✓
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>{/* end .exam-inner */}
      </div>{/* end .exam-shell */}
    </>
  )
}