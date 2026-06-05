// src/app/student/practice/session/page.js
// DARK MODE: all hardcoded bg-white/bg-gray-*/text-gray-*/border-gray-* replaced
// with CSS token classes (bg-card, bg-base, bg-subtle, text-primary,
// text-secondary, text-tertiary, border-default).
// Logic, timer, and state are unchanged.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/quiz/QuestionCard'
import { getSubjectColor } from '@/lib/theme'

function totalSeconds(cfg) {
  if (cfg.durationSecs) return cfg.durationSecs
  const c = cfg.count ?? 20
  return c <= 10 ? 600 : c <= 20 ? 1200 : c <= 30 ? 1800 : 2400
}

// ── Confirm submit dialog ─────────────────────────────────────────────────────
function ConfirmDialog({ answeredCount, total, secondsLeft, onConfirm, onCancel }) {
  const unanswered = total - answeredCount
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const ss = (secondsLeft % 60).toString().padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-card rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <div className="text-center space-y-2">
          <p className="text-3xl">{unanswered > 0 ? '⚠️' : '✅'}</p>
          <p className="text-lg font-black text-primary">Submit your test?</p>
          {unanswered > 0 ? (
            <p className="text-sm text-secondary">
              You have{' '}
              <span className="font-black text-orange-600">{unanswered}</span>{' '}
              unanswered question{unanswered !== 1 ? 's' : ''}. These will be marked wrong.
            </p>
          ) : (
            <p className="text-sm text-secondary">All {total} questions answered.</p>
          )}
          {secondsLeft > 0 && (
            <p className="text-xs text-tertiary">Time remaining: {mm}:{ss}</p>
          )}
        </div>
        <div className="space-y-2.5">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 bg-red-600 text-white text-sm font-black rounded-2xl hover:bg-red-500 transition-colors"
          >
            Yes, submit now
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 border border-default text-secondary text-sm font-medium rounded-2xl hover:bg-subtle transition-colors"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Question grid (end / exam mode) ──────────────────────────────────────────
function QuestionGrid({ total, current, answeredSet, onJump }) {
  return (
    <div className="bg-subtle rounded-2xl p-4">
      <p className="text-xs font-black text-secondary uppercase tracking-wide mb-3">
        {answeredSet.size}/{total} answered
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
              i === current
                ? 'bg-indigo-600 text-white'
                : answeredSet.has(i)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-card border border-default text-secondary hover:border-indigo-300'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Summary screen ────────────────────────────────────────────────────────────
function SummaryScreen({ questions, answers, onReview, onFinish }) {
  const correctCount = answers.filter(a => a.isCorrect).length
  const total        = questions.length
  const pct          = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const scoreColor   = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
  const msg = pct >= 80 ? 'Outstanding! 🏆'
    : pct >= 60 ? 'Good performance 💪'
    : pct >= 40 ? 'Keep practising 📈'
    : 'Every session is progress 📚'

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-5 py-8">
        <div className="bg-card rounded-3xl shadow-sm border border-default p-6 text-center space-y-3">
          <p className={`text-5xl font-black ${scoreColor}`}>{pct}%</p>
          <p className="text-base font-black text-primary">{msg}</p>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-default">
            <div className="text-center">
              <p className="text-xl font-black text-green-600">{correctCount}</p>
              <p className="text-[10px] text-tertiary">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-red-500">{total - correctCount}</p>
              <p className="text-[10px] text-tertiary">Wrong</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-primary">{total}</p>
              <p className="text-[10px] text-tertiary">Total</p>
            </div>
          </div>
        </div>
        <button
          onClick={onReview}
          className="w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          Review all answers →
        </button>
        <button
          onClick={onFinish}
          className="w-full py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors"
        >
          Save & exit
        </button>
      </div>
    </div>
  )
}

// ── Review mode ───────────────────────────────────────────────────────────────
function ReviewMode({ questions, answers, onDone }) {
  const [idx, setIdx] = useState(0)
  const q   = questions[idx]
  const ans = answers[idx]
  if (!q) return null

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-8">
        {/* Review header bar */}
        <div className="flex items-center justify-between bg-card rounded-2xl shadow-sm border border-default px-4 py-3">
          <p className="text-xs font-bold text-secondary">Review mode</p>
          <span className="text-xs font-black text-primary">{idx + 1}/{questions.length}</span>
          <button
            onClick={onDone}
            className="text-xs font-bold text-indigo-600 hover:opacity-75"
          >
            Done →
          </button>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {q.subject_name && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getSubjectColor(q.subject_name).bg} ${getSubjectColor(q.subject_name).text}`}>
              {q.subject_name}
            </span>
          )}
          {q.topic_name && (
            <span className="text-xs text-secondary bg-subtle px-2.5 py-1 rounded-full">
              {q.topic_name}
            </span>
          )}
        </div>

        {/* Question */}
        <QuestionCard
          key={q.id}
          question={q}
          selectedAnswer={ans?.selected ?? null}
          revealed={true}
          onAnswer={() => {}}
          showExplanation={true}
        />

        {/* Navigation */}
        <div className="flex gap-3">
          {idx > 0 && (
            <button
              onClick={() => setIdx(i => i - 1)}
              className="flex-1 py-3 bg-subtle border border-default rounded-2xl text-sm font-bold text-secondary hover:text-primary transition-colors"
            >
              ← Previous
            </button>
          )}
          {idx < questions.length - 1 ? (
            <button
              onClick={() => setIdx(i => i + 1)}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onDone}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 transition-colors"
            >
              Finish →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main session page ─────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router = useRouter()

  const [config,      setConfig]      = useState(null)
  const [questions,   setQuestions]   = useState([])
  const [index,       setIndex]       = useState(0)
  const [answers,     setAnswers]     = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSecs,   setTotalSecs]   = useState(0)
  const [phase,       setPhase]       = useState('quiz') // quiz | confirm | summary | review

  const timerRef   = useRef(null)
  const answersRef = useRef({})

  // Hide bottom nav during session
  useEffect(() => {
    document.body.dataset.hideNav = 'true'
    return () => { delete document.body.dataset.hideNav }
  }, [])

  const finishSession = useCallback((finalAnswers, finalQuestions) => {
    clearInterval(timerRef.current)
    const arr = (finalQuestions ?? questions).map(q => ({
      questionId: q.id,
      selected:   finalAnswers[q.id]?.selected  ?? null,
      isCorrect:  finalAnswers[q.id]?.isCorrect ?? false,
    }))
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers:   arr,
      questions: (finalQuestions ?? questions).map(q => ({
        id:            q.id,
        subject_name:  q.subject_name,
        subject_id:    q.subject_id,
        topic_name:    q.topic_name,
        topic_id:      q.topic_id,
        subtopic_name: q.subtopic_name,
        subtopic_id:   q.subtopic_id,
        correct_answer: q.correct_answer,
      })),
      config,
    }))
    router.push('/student/practice/results')
  }, [config, router, questions])

  // Load config + questions
  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No session config found.'); setLoading(false); return }
    let cfg
    try { cfg = JSON.parse(raw) } catch { setError('Invalid session config.'); setLoading(false); return }
    setConfig(cfg)

    const params = new URLSearchParams({
      subjects: (cfg.subjects ?? []).join(','),
      exam:     cfg.examType ?? 'WAEC',
      count:    String(cfg.count ?? 20),
      mode:     cfg.mode ?? 'practice',
    })
    if (cfg.topic_id) params.set('topic_id', cfg.topic_id)

    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        if (!data.questions?.length) {
          setError(data.error ?? 'No questions available. Try a different subject or topic.')
          return
        }
        setQuestions(data.questions)
        const secs = totalSeconds(cfg)
        setTotalSecs(secs)
        setSecondsLeft(secs)
      })
      .catch(() => setError('Network error. Check your connection and try again.'))
      .finally(() => setLoading(false))
  }, [])

  // Timer
  useEffect(() => {
    if (!totalSecs || phase !== 'quiz') return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          // Save answers ref state before transitioning
          const finalAnswers = answersRef.current
          setAnswers(finalAnswers)
          setPhase('summary')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, phase])

  const handleAnswer = useCallback((questionId, selectedKey) => {
    const q = questions.find(q => q.id === questionId)
    if (!q || answersRef.current[questionId]) return

    const entry = { selected: selectedKey, isCorrect: selectedKey === q.correct_answer }
    answersRef.current = { ...answersRef.current, [questionId]: entry }
    setAnswers(prev => ({ ...prev, [questionId]: entry }))
  }, [questions])

  const handleConfirmSubmit = useCallback(() => {
    clearInterval(timerRef.current)
    setPhase('summary')
  }, [])

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-secondary">Loading questions…</p>
    </div>
  )

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <span className="text-4xl">😕</span>
      <p className="font-black text-primary">{error}</p>
      <button
        onClick={() => router.push('/student/practice')}
        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 transition-colors"
      >
        Back to Practice
      </button>
    </div>
  )

  // ── Derive mode from config ─────────────────────────────────────────────────
  const revealMode  = config?.revealMode ?? (config?.mode === 'topic' ? 'immediate' : 'end')
  const isExamMode  = config?.mode === 'exam' || config?.mode === 'mock'
  const showGrid    = revealMode === 'end'

  const answeredSet = new Set(
    Object.keys(answers)
      .map(id => questions.findIndex(q => q.id === id))
      .filter(i => i >= 0)
  )

  const answersArr = questions.map(q => ({
    questionId: q.id,
    selected:   answers[q.id]?.selected  ?? null,
    isCorrect:  answers[q.id]?.isCorrect ?? false,
  }))

  // ── Phase: summary ──────────────────────────────────────────────────────────
  if (phase === 'summary') return (
    <SummaryScreen
      questions={questions}
      answers={answersArr}
      onReview={() => setPhase('review')}
      onFinish={() => finishSession(answers, questions)}
    />
  )

  // ── Phase: review ───────────────────────────────────────────────────────────
  if (phase === 'review') return (
    <ReviewMode
      questions={questions}
      answers={answersArr}
      onDone={() => finishSession(answers, questions)}
    />
  )

  // ── Phase: quiz ─────────────────────────────────────────────────────────────
  const currentQ   = questions[index]
  const currentAns = currentQ ? answers[currentQ.id] : null

  // In exam/end mode: never reveal during quiz — QuestionCard shows selection
  // highlight but not green/red correct/wrong colouring until after submit.
  const isRevealed = revealMode === 'immediate' ? !!currentAns : false

  const progress     = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0
  const mm           = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const ss           = (secondsLeft % 60).toString().padStart(2, '0')
  const timerUrgent  = totalSecs > 0 && secondsLeft <= 300 && secondsLeft > 0

  return (
    <div className="min-h-screen bg-base">

      {/* Confirm dialog (rendered above quiz) */}
      {phase === 'confirm' && (
        <ConfirmDialog
          answeredCount={Object.keys(answers).length}
          total={questions.length}
          secondsLeft={secondsLeft}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setPhase('quiz')}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-default px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">

          {/* Exit button */}
          <button
            onClick={() => {
              if (confirm('Exit? Progress will be lost.')) {
                clearInterval(timerRef.current)
                router.push('/student/practice')
              }
            }}
            className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center flex-shrink-0 hover:bg-subtle/80 transition-colors"
          >
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress bar + counter */}
          <div className="flex-1 min-w-0">
            <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Counter + timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-black text-secondary tabular-nums">
              {index + 1}/{questions.length}
            </span>
            {totalSecs > 0 && (
              <span className={`text-sm font-black tabular-nums px-2.5 py-1 rounded-xl transition-colors ${
                timerUrgent
                  ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-subtle text-secondary'
              }`}>
                {mm}:{ss}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Subject / topic tags — hidden in exam mode */}
        {!isExamMode && currentQ && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentQ.subject_name && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getSubjectColor(currentQ.subject_name).bg} ${getSubjectColor(currentQ.subject_name).text}`}>
                {currentQ.subject_name}
              </span>
            )}
            {currentQ.topic_name && (
              <span className="text-xs text-secondary bg-subtle px-2.5 py-1 rounded-full">
                {currentQ.topic_name}
              </span>
            )}
          </div>
        )}

        {/* Question card */}
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

        {/* End-mode: Next after selection (no reveal) */}
        {revealMode === 'end' && currentAns && (
          <button
            onClick={() => {
              const next = index + 1
              if (next >= questions.length) setPhase('confirm')
              else setIndex(next)
            }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            {index + 1 >= questions.length ? 'Submit →' : 'Next →'}
          </button>
        )}

        {/* End-mode: Skip unanswered */}
        {revealMode === 'end' && !currentAns && (
          <button
            onClick={() => {
              const next = index + 1
              if (next >= questions.length) setPhase('confirm')
              else setIndex(next)
            }}
            className="w-full py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors"
          >
            {index + 1 >= questions.length ? 'Submit →' : 'Skip →'}
          </button>
        )}

        {/* Immediate mode: Next after reveal */}
        {revealMode === 'immediate' && isRevealed && (
          <button
            onClick={() => {
              const next = index + 1
              if (next >= questions.length) setPhase('summary')
              else setIndex(next)
            }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            {index + 1 >= questions.length ? 'See results →' : 'Next →'}
          </button>
        )}

        {/* Question grid (end / exam mode) */}
        {showGrid && (
          <QuestionGrid
            total={questions.length}
            current={index}
            answeredSet={answeredSet}
            onJump={setIndex}
          />
        )}

        {/* Submit early — exam mode */}
        {isExamMode && Object.keys(answers).length > 0 && (
          <button
            onClick={() => setPhase('confirm')}
            className="w-full py-3 bg-card border border-default rounded-2xl text-sm font-bold text-secondary hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition-colors"
          >
            Submit test — {Object.keys(answers).length}/{questions.length} answered
          </button>
        )}
      </div>
    </div>
  )
}