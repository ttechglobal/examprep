'use client'
// src/app/practice/page.js
// DARK MODE FIX: all hardcoded bg-white/bg-gray-*/text-gray-*/border-gray-*
// replaced with CSS token classes (bg-card, bg-base, bg-subtle, text-primary,
// text-secondary, text-tertiary, border-default).
// Semantic status colours (green, red, amber) kept — they're intentional.

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'
import QuestionCard from '@/components/quiz/QuestionCard'

const WAEC_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Literature in English', 'Geography',
  'Agricultural Science', 'Further Mathematics', 'Commerce',
]

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct }) {
  const r = 46, circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 80)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="mx-auto">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="10"/>
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
      <text x="64" y="59" textAnchor="middle"
        style={{ fontSize: 26, fontWeight: 900, fill: 'var(--text-prim)' }}>{pct}%</text>
      <text x="64" y="76" textAnchor="middle"
        style={{ fontSize: 11, fill: 'var(--text-tert)' }}>score</text>
    </svg>
  )
}

// ── Confirm submit ────────────────────────────────────────────────────────────
function ConfirmDialog({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-2">
          <p className="text-2xl">{unanswered > 0 ? '⚠️' : '✅'}</p>
          <p className="text-lg font-black text-primary">Submit your exam?</p>
          <p className="text-sm text-secondary leading-relaxed">
            {unanswered > 0
              ? `${unanswered} question${unanswered !== 1 ? 's' : ''} unanswered — ${unanswered !== 1 ? 'they' : 'it'} will be marked wrong.`
              : 'All questions answered. Ready to submit?'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 border border-default rounded-2xl text-sm font-bold text-secondary hover:bg-subtle transition-colors">
            Keep going
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 transition-colors">
            Submit →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session ───────────────────────────────────────────────────────────────────
function Session({ subject, config, questions, onDone }) {
  const [index, setIndex]   = useState(0)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase]   = useState('quiz')
  const [reviewIdx, setReviewIdx] = useState(0)

  const isExamMode   = config?.mode === 'exam'
  const revealMode   = config?.revealMode ?? 'immediate'
  const total        = questions.length
  const currentQ     = questions[index]
  const currentAns   = answers[index]
  const isRevealed   = isExamMode ? false : (revealMode === 'immediate' ? !!currentAns : false)
  const answeredCount = Object.keys(answers).length
  const color        = getSubjectColor(subject)

  // Timer
  const timerRef  = useRef(null)
  const totalSecs = config?.durationSecs ?? 0
  const [secsLeft, setSecsLeft] = useState(totalSecs)
  useEffect(() => {
    if (!totalSecs || phase !== 'quiz') return
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); setPhase('summary'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, phase])

  const handleAnswer = useCallback((qId, key) => {
    setAnswers(prev => ({ ...prev, [index]: { selected: key, isCorrect: key === currentQ.correct_answer } }))
  }, [index, currentQ])

  if (phase === 'confirm') {
    return (
      <ConfirmDialog
        answered={answeredCount} total={total}
        onConfirm={() => { clearInterval(timerRef.current); setPhase('summary') }}
        onCancel={() => setPhase('quiz')}
      />
    )
  }

  if (phase === 'summary') {
    const correct = Object.values(answers).filter(a => a.isCorrect).length
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0
    const msg     = pct >= 80 ? 'Outstanding! 🏆' : pct >= 60 ? 'Good work 💪' : pct >= 40 ? 'Keep going 📈' : 'Every session counts 📚'
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-5 py-8">
          <div className="bg-card rounded-3xl border border-default p-6 text-center space-y-3">
            <ScoreRing pct={pct} />
            <p className="text-base font-black text-primary">{msg}</p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-default">
              <div className="text-center">
                <p className="text-xl font-black text-green-600">{correct}</p>
                <p className="text-[10px] text-tertiary">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-red-500">{total - correct}</p>
                <p className="text-[10px] text-tertiary">Wrong</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-primary">{total}</p>
                <p className="text-[10px] text-tertiary">Total</p>
              </div>
            </div>
          </div>
          <button onClick={() => { setPhase('review'); setReviewIdx(0) }}
            className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 transition-colors">
            Review answers →
          </button>
          <button onClick={onDone}
            className="w-full py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'review') {
    const q   = questions[reviewIdx]
    const ans = answers[reviewIdx]
    return (
      <div className="min-h-screen bg-base px-4 py-6 space-y-4 pb-10">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between bg-card rounded-2xl border border-default px-4 py-3">
            <p className="text-xs font-bold text-secondary">Review</p>
            <span className="text-xs font-black text-primary">{reviewIdx + 1}/{questions.length}</span>
            <button onClick={onDone} className="text-xs font-bold text-indigo-600 hover:opacity-75">Done →</button>
          </div>
          {q.subject_name && (
            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${getSubjectColor(q.subject_name).bg} ${getSubjectColor(q.subject_name).text}`}>
              {q.subject_name}
            </span>
          )}
          <QuestionCard key={q.id} question={q} selectedAnswer={ans?.selected ?? null}
            revealed={true} onAnswer={() => {}} showExplanation={true} />
          <div className="flex gap-3">
            {reviewIdx > 0 && (
              <button onClick={() => setReviewIdx(i => i - 1)}
                className="flex-1 py-3 bg-subtle border border-default rounded-2xl text-sm font-bold text-secondary hover:text-primary">
                ← Previous
              </button>
            )}
            {reviewIdx < questions.length - 1 ? (
              <button onClick={() => setReviewIdx(i => i + 1)}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500">
                Next →
              </button>
            ) : (
              <button onClick={onDone}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500">
                Finish →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz phase ──────────────────────────────────────────────────────────────
  const mm = Math.floor(secsLeft / 60).toString().padStart(2, '0')
  const ss = (secsLeft % 60).toString().padStart(2, '0')
  const timerLow = totalSecs > 0 && secsLeft < 60

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-default px-4 py-3 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={onDone} className="text-sm text-secondary hover:text-primary font-medium">← Exit</button>
          <span className="text-xs font-black text-secondary">{index + 1}/{total}</span>
          {totalSecs > 0 && (
            <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${timerLow ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-subtle text-secondary'}`}>
              {mm}:{ss}
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-4 pb-24">
        <QuestionCard
          key={currentQ.id}
          question={currentQ}
          selectedAnswer={currentAns?.selected ?? null}
          revealed={isRevealed}
          onAnswer={handleAnswer}
          showExplanation={revealMode === 'immediate'}
        />

        {revealMode === 'end' && currentAns && (
          <button onClick={() => { const n = index + 1; if (n >= total) setPhase('confirm'); else setIndex(n) }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500">
            {index + 1 >= total ? 'Submit →' : 'Next →'}
          </button>
        )}
        {revealMode === 'end' && !currentAns && (
          <button onClick={() => { const n = index + 1; if (n >= total) setPhase('confirm'); else setIndex(n) }}
            className="w-full py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle">
            {index + 1 >= total ? 'Submit →' : 'Skip →'}
          </button>
        )}
        {revealMode === 'immediate' && isRevealed && (
          <button onClick={() => { const n = index + 1; if (n >= total) setPhase('summary'); else setIndex(n) }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500">
            {index + 1 >= total ? 'See results →' : 'Next →'}
          </button>
        )}
        {isExamMode && answeredCount > 0 && (
          <button onClick={() => setPhase('confirm')}
            className="w-full py-3 bg-card border border-default rounded-2xl text-sm font-bold text-secondary hover:text-red-600 hover:border-red-200 transition-colors">
            Submit exam — {answeredCount}/{total} answered
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicPracticePage() {
  const [step,       setStep]       = useState('subject')
  const [subject,    setSubject]    = useState(null)
  const [mode,       setMode]       = useState(null)
  const [count,      setCount]      = useState(20)
  const [revealMode, setRevealMode] = useState('immediate')
  const [timerOn,    setTimerOn]    = useState(false)
  const [timerMins,  setTimerMins]  = useState(20)
  const [questions,  setQuestions]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [config,     setConfig]     = useState(null)

  async function startSession(cfg) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        subjects: cfg.subjects.join(','),
        exam:     'WAEC',
        count:    String(cfg.count),
        mode:     cfg.mode,
      })
      const res  = await fetch(`/api/practice/questions?${params}`)
      const data = await res.json()
      if (!data.questions?.length) {
        setError(data.error ?? 'No questions available yet — try another subject or check back soon.')
        setLoading(false)
        return
      }
      setQuestions(data.questions)
      setConfig(cfg)
      setStep('session')
    } catch {
      setError('Network error — check your connection and try again.')
    }
    setLoading(false)
  }

  if (step === 'session' && questions.length > 0) {
    return (
      <Session
        subject={subject}
        config={config}
        questions={questions}
        onDone={() => { setStep('subject'); setQuestions([]); setConfig(null); setSubject(null); setMode(null) }}
      />
    )
  }

  const color = subject ? getSubjectColor(subject) : null

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-card border-b border-default px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">EP</span>
            </div>
            <span className="text-base font-black text-primary">ExamPrep</span>
          </div>
          <Link href="/login" className="text-xs font-bold text-indigo-600 hover:underline">Sign in →</Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {step !== 'subject' && (
          <button onClick={() => { setStep('subject'); setMode(null); setError(null) }}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
            ← Back
          </button>
        )}

        {/* Step 1: Subject */}
        {step === 'subject' && (
          <>
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-primary">Practice for WAEC</h1>
              <p className="text-sm text-secondary">No sign-in needed. Pick a subject.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {WAEC_SUBJECTS.map(sub => {
                const c = getSubjectColor(sub)
                return (
                  <button key={sub} onClick={() => { setSubject(sub); setStep('mode') }}
                    className={`flex items-center px-4 py-3.5 rounded-2xl text-left transition-all hover:shadow-sm active:scale-[0.97] ${c.bg}`}>
                    <span className={`text-sm font-black ${c.text} leading-snug`}>{sub}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-tertiary">
              <Link href="/signup" className="text-indigo-600 font-bold hover:underline">Create a free account</Link>
              {' '}to save results and track progress.
            </p>
          </>
        )}

        {/* Step 2: Mode + config */}
        {step === 'mode' && subject && (
          <div className="space-y-4">
            <div className={`flex items-center justify-between ${color.bg} rounded-2xl px-4 py-3`}>
              <p className={`text-base font-black ${color.text}`}>{subject}</p>
              <span className={`text-xs font-bold ${color.text} opacity-70`}>WAEC</span>
            </div>

            {error && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">😕 {error}</p>
                <button onClick={() => { setStep('subject'); setError(null) }}
                  className="text-xs text-amber-600 hover:underline mt-1">
                  Try another subject →
                </button>
              </div>
            )}

            {/* Practice card */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all bg-card ${mode === 'practice' ? 'border-indigo-500' : 'border-default'}`}>
              <button className="w-full text-left p-4" onClick={() => setMode(mode === 'practice' ? null : 'practice')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl flex-shrink-0">📖</div>
                  <div className="flex-1">
                    <p className="font-black text-primary">Practice</p>
                    <p className="text-xs text-secondary">Pick question count · optional timer</p>
                  </div>
                  <span className={`text-secondary text-sm transition-transform ${mode === 'practice' ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>
              {mode === 'practice' && (
                <div className="border-t border-default px-4 py-4 space-y-4 bg-subtle">
                  <div>
                    <p className="text-xs font-bold text-secondary mb-2">Questions</p>
                    <div className="flex gap-2">
                      {[10, 20, 30, 40].map(n => (
                        <button key={n} onClick={() => setCount(n)}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${count === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-default text-secondary bg-card hover:border-indigo-300'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-secondary mb-2">Answer reveal</p>
                    <div className="flex gap-2">
                      {[['immediate', 'After each'], ['end', 'At the end']].map(([val, label]) => (
                        <button key={val} onClick={() => setRevealMode(val)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${revealMode === val ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-default text-secondary bg-card'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-secondary">Timer</p>
                    <button onClick={() => setTimerOn(t => !t)}
                      className={`w-10 h-6 rounded-full transition-colors ${timerOn ? 'bg-indigo-600' : 'bg-subtle border border-default'}`}>
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${timerOn ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                  {timerOn && (
                    <div className="flex gap-2">
                      {[10, 20, 30, 45].map(m => (
                        <button key={m} onClick={() => setTimerMins(m)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${timerMins === m ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-default text-secondary bg-card'}`}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => startSession({ subjects: [subject], count, mode: 'practice', revealMode, durationSecs: timerOn ? timerMins * 60 : 0 })}
                    disabled={loading}
                    className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    {loading ? 'Loading questions…' : `Start ${count} questions →`}
                  </button>
                </div>
              )}
            </div>

            {/* Exam card */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all bg-card ${mode === 'exam' ? 'border-indigo-500' : 'border-default'}`}>
              <button className="w-full text-left p-4" onClick={() => setMode(mode === 'exam' ? null : 'exam')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl flex-shrink-0">⏱</div>
                  <div className="flex-1">
                    <p className="font-black text-primary">Exam simulation</p>
                    <p className="text-xs text-secondary">50 questions · timed · answers at the end</p>
                  </div>
                  <span className={`text-secondary text-sm transition-transform ${mode === 'exam' ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>
              {mode === 'exam' && (
                <div className="border-t border-default px-4 py-4 bg-subtle">
                  <button
                    onClick={() => startSession({ subjects: [subject], count: 50, mode: 'exam', revealMode: 'end', durationSecs: 3600 })}
                    disabled={loading}
                    className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    {loading ? 'Loading…' : 'Start exam →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}