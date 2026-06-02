'use client'
// src/app/practice/page.js
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES v2:
//   1. Review phase — uses QuestionCard fully revealed, step-by-step navigation
//      with Back/Next buttons, progress indicator. Identical feel to app.
//   2. Immediate mode — no auto-advance. Student sees the result (correct/wrong)
//      and taps "Next →" themselves. They can take as long as they want.
//   3. Timer toggle in practice mode — optional. If enabled, pick 10/20/30/45 min.
//   4. "No questions" error message friendly — tells them to try another subject.
// ─────────────────────────────────────────────────────────────────────────────

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
      <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10"/>
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
      <text x="64" y="59" textAnchor="middle" style={{ fontSize: 26, fontWeight: 900, fill: '#0f172a' }}>{pct}%</text>
      <text x="64" y="76" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>score</text>
    </svg>
  )
}

// ── Confirm submit ────────────────────────────────────────────────────────────
function ConfirmDialog({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-2">
          <p className="text-2xl">{unanswered > 0 ? '⚠️' : '✅'}</p>
          <p className="text-lg font-black text-gray-900">Submit your exam?</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            {unanswered > 0
              ? `${unanswered} question${unanswered !== 1 ? 's' : ''} unanswered — will be marked wrong.`
              : `All ${total} questions answered. Ready to submit?`}
          </p>
        </div>
        <div className="space-y-2.5">
          <button onClick={onConfirm}
            className="w-full py-3.5 bg-red-600 text-white text-sm font-black rounded-2xl hover:bg-red-500 transition-colors">
            Yes, submit now
          </button>
          <button onClick={onCancel}
            className="w-full py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors">
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session ───────────────────────────────────────────────────────────────────
function Session({ subject, config, questions, onDone }) {
  const [index,       setIndex]       = useState(0)
  const [answers,     setAnswers]     = useState({})
  const [phase,       setPhase]       = useState('quiz') // quiz | confirm | results | review
  const [secondsLeft, setSecondsLeft] = useState(config.durationSecs ?? 0)
  const [reviewIdx,   setReviewIdx]   = useState(0)
  const timerRef = useRef(null)

  const isExamMode = config.mode === 'exam'
  const revealMode = isExamMode ? 'end' : (config.revealMode ?? 'immediate')
  const total      = questions.length
  const answeredCount = Object.keys(answers).length

  useEffect(() => {
    if (!config.durationSecs) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); setPhase('results'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [config.durationSecs])

  const handleAnswer = useCallback((questionId, selectedKey) => {
    const q = questions.find(q => q.id === questionId)
    if (!q || answers[questionId]) return
    setAnswers(prev => ({ ...prev, [questionId]: { selected: selectedKey, isCorrect: selectedKey === q.correct_answer } }))
    // NO auto-advance in any mode — student taps Next themselves
  }, [questions, answers])

  function handleSubmit() {
    clearInterval(timerRef.current)
    setPhase('results')
  }

  function handleReview() {
    setReviewIdx(0)
    setPhase('review')
  }

  // Timer display
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const ss = (secondsLeft % 60).toString().padStart(2, '0')
  const timerUrgent = secondsLeft > 0 && secondsLeft <= 300

  const currentQ   = questions[index]
  const currentAns = currentQ ? answers[currentQ.id] : null
  // In exam/end mode: never reveal during quiz. In immediate mode: reveal after answering.
  const isRevealed = revealMode === 'immediate' ? !!currentAns : false
  const color      = getSubjectColor(subject)

  // ── Review phase ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    const rq  = questions[reviewIdx]
    const ra  = answers[rq?.id]
    const isLast = reviewIdx >= total - 1

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setPhase('results')}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Reviewing · {subject}</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div className={`h-full ${color.accent} rounded-full transition-all duration-300`}
                  style={{ width: `${((reviewIdx + 1) / total) * 100}%` }}/>
              </div>
            </div>
            <span className="text-xs font-black text-gray-500 tabular-nums flex-shrink-0">
              {reviewIdx + 1}/{total}
            </span>
          </div>
        </div>

        {/* Question — fully revealed, with explanation */}
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-32">
          {/* Correct/wrong banner */}
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
            ra?.isCorrect
              ? 'bg-green-50 border border-green-200'
              : ra?.selected
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
          }`}>
            <span className="text-xl">
              {ra?.isCorrect ? '✅' : ra?.selected ? '❌' : '⬜'}
            </span>
            <p className={`text-sm font-bold ${
              ra?.isCorrect ? 'text-green-800' : ra?.selected ? 'text-red-700' : 'text-gray-600'
            }`}>
              {ra?.isCorrect ? 'Correct!' : ra?.selected ? `Wrong — you chose ${ra.selected}` : 'Not answered'}
            </p>
          </div>

          {rq && (
            <QuestionCard
              key={rq.id}
              question={rq}
              selectedAnswer={ra?.selected ?? null}
              revealed={true}
              onAnswer={() => {}}
              showExplanation={true}
            />
          )}
        </div>

        {/* Fixed bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-lg mx-auto flex gap-3">
            {reviewIdx > 0 && (
              <button onClick={() => setReviewIdx(i => i - 1)}
                className="flex-1 py-4 border border-gray-200 text-gray-600 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-colors">
                ← Back
              </button>
            )}
            {isLast ? (
              <button onClick={onDone}
                className={`flex-1 py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
                Done ✓
              </button>
            ) : (
              <button onClick={() => setReviewIdx(i => i + 1)}
                className="flex-1 py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Results phase ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    const totalCorrect = questions.filter(q => answers[q.id]?.isCorrect).length
    const overallPct   = total > 0 ? Math.round((totalCorrect / total) * 100) : 0
    const msg = overallPct >= 80 ? 'Excellent! 🏆'
      : overallPct >= 60 ? 'Good performance 💪'
      : overallPct >= 40 ? 'Keep practising 📈'
      : 'Every session builds knowledge 📚'

    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

          {/* Score card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className={`${color.bg} px-6 pt-8 pb-6 text-center`}>
              <ScoreRing pct={overallPct} />
              <p className={`mt-3 text-sm font-bold ${color.text}`}>{msg}</p>
              <p className={`text-xs ${color.text} opacity-70 mt-0.5`}>{subject} · WAEC</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
              <div className="px-4 py-3 text-center">
                <p className="text-xl font-black text-green-600">{totalCorrect}</p>
                <p className="text-[10px] text-gray-400">Correct</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xl font-black text-red-500">{total - totalCorrect}</p>
                <p className="text-[10px] text-gray-400">Wrong</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xl font-black text-gray-700">{total}</p>
                <p className="text-[10px] text-gray-400">Total</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button onClick={handleReview}
            className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 transition-colors shadow-sm">
            Review all answers →
          </button>

          {/* Create account CTA */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-center space-y-3">
            <p className="text-white font-black text-sm">Track your progress over time</p>
            <p className="text-indigo-200 text-xs leading-relaxed">
              Create a free account to get a personalised study plan, see weak areas, and study smarter before your exam.
            </p>
            <Link href="/signup"
              className="block w-full py-3 bg-white text-indigo-700 text-sm font-black rounded-xl hover:bg-indigo-50 transition-colors">
              Create free account →
            </Link>
            <button onClick={onDone}
              className="block w-full text-indigo-300 text-xs hover:text-white transition-colors py-1">
              Practice another subject
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz phase ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {phase === 'confirm' && (
        <ConfirmDialog answered={answeredCount} total={total}
          onConfirm={handleSubmit} onCancel={() => setPhase('quiz')} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => { if (confirm('Exit? Progress will be lost.')) { clearInterval(timerRef.current); onDone() } }}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-400 truncate">{subject} · {isExamMode ? 'Exam Simulation' : 'Practice'}</p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
              <div className={`h-full ${color.accent} rounded-full transition-all duration-300`}
                style={{ width: `${((index + 1) / total) * 100}%` }}/>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-black text-gray-500 tabular-nums">{index + 1}/{total}</span>
            {config.durationSecs > 0 && (
              <span className={`text-sm font-black tabular-nums px-2.5 py-1 rounded-xl ${
                timerUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
              }`}>{mm}:{ss}</span>
            )}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-32">
        {currentQ && (
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            selectedAnswer={currentAns?.selected ?? null}
            revealed={isRevealed}
            onAnswer={handleAnswer}
            showExplanation={revealMode === 'immediate'}
          />
        )}

        {/* Next button — shown after answering (both modes) */}
        {currentAns && (
          <button onClick={() => {
            const next = index + 1
            if (next >= total) {
              if (isExamMode) setPhase('confirm')
              else setPhase('results')
            } else {
              setIndex(next)
            }
          }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all">
            {index + 1 >= total
              ? (isExamMode ? 'Review & Submit →' : 'See results →')
              : 'Next →'}
          </button>
        )}

        {/* Skip — only for end-mode, no answer yet */}
        {!currentAns && revealMode === 'end' && (
          <button onClick={() => {
            const next = index + 1
            if (next >= total) setPhase('confirm')
            else setIndex(next)
          }}
            className="w-full py-3 border border-gray-200 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-colors">
            {index + 1 >= total ? 'Submit →' : 'Skip →'}
          </button>
        )}

        {/* Question grid for exam mode */}
        {revealMode === 'end' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
              {answeredCount}/{total} answered
            </p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => {
                const ans = answers[q.id]
                return (
                  <button key={i} onClick={() => setIndex(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                      i === index   ? 'bg-indigo-600 text-white'
                      : ans         ? 'bg-green-100 text-green-700'
                      :               'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Submit early — exam mode */}
        {isExamMode && answeredCount > 0 && (
          <button onClick={() => setPhase('confirm')}
            className="w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors">
            Submit exam — {answeredCount}/{total} answered
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main public practice page ─────────────────────────────────────────────────
export default function PublicPracticePage() {
  const [step,        setStep]        = useState('subject')
  const [subject,     setSubject]     = useState(null)
  const [mode,        setMode]        = useState(null)
  const [count,       setCount]       = useState(20)
  const [revealMode,  setRevealMode]  = useState('immediate')
  const [timerOn,     setTimerOn]     = useState(false)
  const [timerMins,   setTimerMins]   = useState(20)
  const [questions,   setQuestions]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [config,      setConfig]      = useState(null)

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
        setError(data.error ?? 'No questions available for this subject yet — try another subject or check back soon.')
        setLoading(false)
        return
      }
      setQuestions(data.questions)
      setConfig(cfg)
      setStep('session')
    } catch {
      setError('Network error — please check your connection and try again.')
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">EP</span>
            </div>
            <span className="text-base font-black text-gray-900">ExamPrep</span>
          </div>
          <Link href="/login" className="text-xs font-bold text-indigo-600 hover:underline">Sign in →</Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* Back button */}
        {step !== 'subject' && (
          <button onClick={() => { setStep('subject'); setMode(null); setError(null) }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
        )}

        {/* Step 1: Subject */}
        {step === 'subject' && (
          <>
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-gray-900">Practice for WAEC</h1>
              <p className="text-sm text-gray-500">No sign-in needed. Pick a subject and start now.</p>
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
            <p className="text-center text-xs text-gray-400">
              <Link href="/signup" className="text-indigo-600 font-bold hover:underline">Create a free account</Link>
              {' '}to save your results and track progress.
            </p>
          </>
        )}

        {/* Step 2: Mode + config */}
        {step === 'mode' && subject && (
          <div className="space-y-4">
            {/* Subject header */}
            <div className={`flex items-center justify-between ${color.bg} rounded-2xl px-4 py-3`}>
              <p className={`text-base font-black ${color.text}`}>{subject}</p>
              <span className={`text-xs font-bold ${color.text} opacity-70`}>WAEC</span>
            </div>

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-sm font-bold text-amber-800">😕 {error}</p>
                <button onClick={() => { setStep('subject'); setError(null) }}
                  className="text-xs text-amber-600 hover:underline mt-1">
                  Try another subject →
                </button>
              </div>
            )}

            {/* Practice card */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
              mode === 'practice' ? 'border-indigo-500 bg-white' : 'border-gray-200 bg-white'
            }`}>
              <button className="w-full text-left p-4" onClick={() => setMode(mode === 'practice' ? null : 'practice')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0">📖</div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">Practice</p>
                    <p className="text-xs text-gray-500">Pick question count · choose answer reveal · optional timer</p>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${mode === 'practice' ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>

              {mode === 'practice' && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4" onClick={e => e.stopPropagation()}>
                  {/* Question count */}
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Questions</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 20, 40].map(n => (
                        <button key={n} onClick={() => setCount(n)}
                          className={`py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                            count === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                          }`}>{n}</button>
                      ))}
                    </div>
                  </div>

                  {/* Reveal mode */}
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">See answers</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: 'immediate', label: 'After each question', icon: '⚡' },
                        { id: 'end',       label: 'At the end',          icon: '📋' }].map(opt => (
                        <button key={opt.id} onClick={() => setRevealMode(opt.id)}
                          className={`py-3 px-3 rounded-xl text-left border-2 transition-all ${
                            revealMode === opt.id
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-indigo-200'
                          }`}>
                          <span className="text-base block mb-0.5">{opt.icon}</span>
                          <p className="text-xs font-black">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timer toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Timer</p>
                      <button onClick={() => setTimerOn(t => !t)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${timerOn ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${timerOn ? 'translate-x-5' : ''}`}/>
                      </button>
                    </div>
                    {timerOn && (
                      <div className="grid grid-cols-4 gap-2">
                        {[10, 20, 30, 45].map(m => (
                          <button key={m} onClick={() => setTimerMins(m)}
                            className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                              timerMins === m ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                            }`}>{m}m</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Exam simulation card */}
            <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
              mode === 'exam' ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white'
            }`}>
              <button className="w-full text-left p-4" onClick={() => setMode(mode === 'exam' ? null : 'exam')}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">🏆</div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">Exam Simulation</p>
                    <p className="text-xs text-gray-500">50 questions · 45 minutes · real WAEC conditions</p>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${mode === 'exam' ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>

              {mode === 'exam' && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-1.5">
                  <p className="text-xs font-black text-orange-700">⚠️ Real exam conditions:</p>
                  <p className="text-xs text-orange-600">• 45-minute countdown starts immediately</p>
                  <p className="text-xs text-orange-600">• Answers hidden until you submit</p>
                  <p className="text-xs text-orange-600">• You must confirm before submitting</p>
                </div>
              )}
            </div>

            {/* Start */}
            {mode && (
              <button
                disabled={loading}
                onClick={() => startSession({
                  mode,
                  subjects:     [subject],
                  count:        mode === 'exam' ? 50 : count,
                  revealMode:   mode === 'exam' ? 'end' : revealMode,
                  durationSecs: mode === 'exam' ? 45 * 60 : (timerOn ? timerMins * 60 : 0),
                  examType:     'WAEC',
                })}
                className={`w-full py-4 text-white text-sm font-black rounded-2xl shadow-md transition-all disabled:opacity-50 active:scale-[0.98] ${
                  mode === 'exam'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}>
                {loading ? 'Loading questions…'
                  : mode === 'exam'
                    ? `Start ${subject} Exam Simulation →`
                    : `Start ${count} Questions${timerOn ? ` · ${timerMins}min` : ''} →`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}