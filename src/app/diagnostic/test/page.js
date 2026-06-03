'use client'
// src/app/diagnostic/test/page.js
// FIXES:
// 1. Imports getTotalSeconds, getWarningThresholds, formatTime, getTimerColor
//    from @/lib/practiceTimer (matching the real file's imports)
// 2. Dark mode tokens throughout (bg-base, bg-card, border-default, etc.)
// 3. Subject/topic tags use dark-safe classes
// 4. Progress bar track uses bg-subtle
// 5. Skip/submit buttons use border-default text-secondary
//
// NOTE: This page uses the ORIGINAL structure (practiceTimer lib, full timer
// warning system) — it does NOT use the simplified version from earlier.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import QuestionCard from '@/components/quiz/QuestionCard'
import {
  getTotalSeconds,
  getWarningThresholds,
  formatTime,
  getTimerColor,
} from '@/lib/practiceTimer'

export default function DiagnosticTestPage() {
  const router = useRouter()
  const [setup, setSetup]           = useState(null)
  const [questions, setQuestions]   = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers]       = useState({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [toasts, setToasts]         = useState([])
  const [secondsLeft, setSecondsLeft]   = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const timerRef       = useRef(null)
  const firedWarnings  = useRef(new Set())

  const addToast = useCallback((message, type = 'warning') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const submitTest = useCallback((currentAnswers, currentQuestions) => {
    clearInterval(timerRef.current)
    sessionStorage.setItem('diagnostic_results', JSON.stringify({
      setup: JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}'),
      answers: currentAnswers,
      questions: currentQuestions.map(q => ({
        id:            q.id,
        subtopic_id:   q.subtopic_id,
        subtopic_name: q.subtopics?.name ?? q.subtopic_name ?? '',
        topic_id:      q.topic_id,
        topic_name:    q.topics?.name ?? q.topic_name ?? '',
        subject_id:    q.subject_id,
        subject_name:  q.subjects?.name ?? q.subject_name ?? '',
      })),
    }))
    router.push('/diagnostic/results')
  }, [router])

  useEffect(() => {
    const raw = sessionStorage.getItem('diagnostic_setup')
    if (!raw) { router.push('/diagnostic'); return }
    const parsed = JSON.parse(raw)
    setSetup(parsed)

    const count = parsed.questionCount ?? 10
    const total = getTotalSeconds(count)
    setTotalSeconds(total)
    setSecondsLeft(total)

    fetch(`/api/diagnostic/questions?subjects=${parsed.subjects.join(',')}&exam=${parsed.examType}&count=${count}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setQuestions(data.questions)
        setLoading(false)
      })
      .catch(() => setError('Failed to load questions. Please try again.'))
  }, [router, submitTest])

  // Timer + warning toasts
  useEffect(() => {
    if (loading || questions.length === 0) return
    const thresholds = getWarningThresholds(totalSeconds)

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1

        // Fire warning toasts
        for (const [threshold, message, type] of thresholds) {
          if (next <= threshold && !firedWarnings.current.has(threshold)) {
            firedWarnings.current.add(threshold)
            addToast(message, type)
          }
        }

        if (next <= 0) {
          clearInterval(timerRef.current)
          addToast('Time is up! Submitting...', 'urgent')
          setTimeout(() => {
            setAnswers(a => { setQuestions(q => { submitTest(a, q); return q }); return a })
          }, 1500)
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [loading, questions.length, totalSeconds, addToast, submitTest])

  const handleAnswer = useCallback((questionId, selectedKey) => {
    const q = questions.find(q => q.id === questionId)
    if (!q || answers[questionId]) return
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        selected:    selectedKey,
        is_correct:  selectedKey === q.correct_answer,
        subtopic_id: q.subtopic_id,
        topic_id:    q.topic_id,
        subject_id:  q.subject_id,
      },
    }))
  }, [questions, answers])

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) { submitTest(answers, questions); return }
    setCurrentIndex(i => i + 1)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= questions.length) { submitTest(answers, questions); return }
    setCurrentIndex(i => i + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-secondary text-sm">Loading your questions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-4xl">⚠️</p>
          <p className="text-primary font-bold">{error}</p>
          <button onClick={() => router.push('/diagnostic')}
            className="text-indigo-500 text-sm font-medium hover:underline">
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  if (!questions.length) return null

  const currentQuestion = questions[currentIndex]
  const currentAnswer   = answers[currentQuestion?.id]
  const isRevealed      = !!currentAnswer
  const selectedAnswer  = currentAnswer?.selected ?? null
  const progress        = ((currentIndex + 1) / questions.length) * 100
  const timerColor      = getTimerColor(secondsLeft, totalSeconds)
  const isLowTime       = secondsLeft / totalSeconds <= 0.1

  return (
    <div className="min-h-screen bg-base">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-default px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-secondary">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor} ${isLowTime ? 'animate-pulse' : ''}`}>
            <span className="text-base">⏱</span>
            {formatTime(secondsLeft)}
          </div>
          <button
            onClick={() => submitTest(answers, questions)}
            className="text-xs text-tertiary hover:text-secondary font-medium transition-colors"
          >
            Submit early
          </button>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Question ────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Subject / topic tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
            {currentQuestion?.subjects?.name ?? currentQuestion?.subject_name}
          </span>
          {(currentQuestion?.topics?.name ?? currentQuestion?.topic_name) && (
            <span className="text-xs text-secondary bg-subtle px-2.5 py-1 rounded-full">
              {currentQuestion?.topics?.name ?? currentQuestion?.topic_name}
            </span>
          )}
        </div>

        <QuestionCard
          key={currentQuestion?.id}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          revealed={isRevealed}
          onAnswer={handleAnswer}
          showExplanation={true}
        />

        {isRevealed && (
          <div className="mt-5">
            <button onClick={handleNext}
              className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 active:scale-[0.99] transition-all">
              {currentIndex + 1 >= questions.length ? 'See results →' : 'Next →'}
            </button>
          </div>
        )}

        {!isRevealed && (
          <div className="mt-4">
            <button onClick={handleSkip}
              className="w-full py-3 border border-default text-secondary text-sm font-medium rounded-2xl hover:bg-subtle transition-colors">
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}