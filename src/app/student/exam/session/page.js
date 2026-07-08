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
      source:   'past_paper',
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
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--active-border)', borderTopColor: 'var(--active-text)' }} />
      <p className="text-secondary text-sm">Loading exam paper…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p style={{ fontSize: 32 }}>😕</p>
      <p className="text-primary font-bold text-sm">{error}</p>
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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Minimal immersive exam bar — no logo, focused */}
      <div style={{ flexShrink: 0, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
        {/* Exit */}
        <button onClick={() => { if (window.confirm('Exit exam? All progress will be lost.')) { clearInterval(timerRef.current); router.push('/student/exam') } }}
          style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-tert)', cursor: 'pointer' }}>
          ✕
        </button>
        {/* Q map toggle — compact */}
        <button onClick={() => setShowMap(m => !m)}
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sec)', background: showMap ? 'var(--active-bg)' : 'var(--bg-subtle)', border: showMap ? '1px solid var(--active-border)' : '1px solid var(--border)', padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}>
          {answered}/{questions.length} ✓
        </button>
        {/* Timer */}
        <div style={{ background: urgentTime ? 'var(--danger-bg)' : 'var(--bg-subtle)', border: `1px solid ${urgentTime ? 'var(--danger-border)' : 'var(--border)'}`, borderRadius: 7, padding: '3px 9px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: timerCol }}>{formatTime(secsLeft)}</p>
          <p style={{ fontSize: 7, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Time</p>
        </div>
      </div>

      {/* Question map drawer */}
      {showMap && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <QuestionMap total={questions.length} current={index} answers={answers} onJump={i => { setIndex(i); setShowMap(false) }} />
        </div>
      )}

      {/* Progress bar */}
      <div style={{ flexShrink: 0, margin: '8px 12px 0', height: 4, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: accent, width: `${((index + 1) / questions.length) * 100}%`, transition: 'width .3s' }} />
      </div>

      {/* Scroll zone */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 6px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>

        {/* Question card */}
        {q && (
          <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `4px solid ${accent}`, padding: '13px 15px 11px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
              <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: accent }}>Q{index + 1} of {questions.length}</span>
              {q.year && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: `${accent}18`, color: accent }}>WAEC {q.year}</span>}
            </div>
            <MathText text={q.question_text ?? q.question ?? ''} className="text-primary" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.55 }} as="p" />
          </div>
        )}

        {/* Answer options — selectable but no verdict shown */}
        {q && optEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
            {optEntries.map(([letter, text]) => {
              const isSelected = myAnswer === letter
              return (
                <button key={letter} onClick={() => selectAnswer(letter)}
                  style={{
                    padding: '11px 13px', borderRadius: 14, width: '100%',
                    background: isSelected ? 'var(--active-bg)' : 'var(--bg-card)',
                    border: `${isSelected ? '2px' : '1.5px'} solid ${isSelected ? 'var(--active-border)' : 'var(--border)'}`,
                    color: isSelected ? 'var(--active-text)' : 'var(--text-prim)',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    textAlign: 'left', fontSize: 13, fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer', transition: 'all .12s',
                  }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--active-text)' : 'var(--bg-subtle)', color: isSelected ? '#fff' : 'var(--text-tert)' }}>
                    {letter}
                  </span>
                  <MathText text={String(text ?? '')} as="span" style={{ lineHeight: 1.5 }} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pinned bottom bar */}
      <div style={{ flexShrink: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--border)', padding: '10px 12px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
        <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}
          style={{ flex: 1, height: 46, borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.35 : 1 }}>
          ← Prev
        </button>

        {isLast ? (
          <button onClick={handleSubmit} disabled={submitting}
            style={{ flex: 2, height: 46, borderRadius: 14, fontSize: 14, fontWeight: 800, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #047857' }}>
            {submitting ? 'Submitting…' : 'Submit Paper ✓'}
          </button>
        ) : (
          <button onClick={() => setIndex(i => Math.min(questions.length - 1, i + 1))}
            style={{ flex: 2, height: 46, borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  )
}