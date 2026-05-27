'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import {
  getTotalSeconds,
  getWarningThresholds,
  formatTime,
  getTimerColor,
} from '@/lib/practiceTimer'

export default function DiagnosticTestPage() {
  const router = useRouter()
  const [setup, setSetup] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const timerRef = useRef(null)
  const firedWarnings = useRef(new Set())

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
        id: q.id,
        subtopic_id: q.subtopic_id,
        subtopic_name: q.subtopic_name,
        topic_id: q.topic_id,
        topic_name: q.topic_name,
        subject_id: q.subject_id,
        subject_name: q.subject_name,
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
  }, [router])

  // Start timer once questions are loaded
  useEffect(() => {
    if (loading || !questions.length || !totalSeconds) return

    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSeconds / 60)

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1

        // Check minute-based warnings
        minuteWarnings.forEach(w => {
          const threshold = w.minutes * 60
          if (next === threshold && !firedWarnings.current.has(threshold)) {
            firedWarnings.current.add(threshold)
            addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning')
          }
        })

        // Check second-based warnings
        secondWarnings.forEach(w => {
          if (next === w.seconds && !firedWarnings.current.has(`s${w.seconds}`)) {
            firedWarnings.current.add(`s${w.seconds}`)
            addToast(w.label, 'urgent')
          }
        })

        // Force submit at zero
        if (next <= 0) {
          clearInterval(timerRef.current)
          addToast('Time is up! Submitting your answers...', 'urgent')
          setTimeout(() => {
            setAnswers(currentAnswers => {
              setQuestions(currentQuestions => {
                submitTest(currentAnswers, currentQuestions)
                return currentQuestions
              })
              return currentAnswers
            })
          }, 1500)
          return 0
        }

        return next
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [loading, questions.length, totalSeconds, addToast, submitTest])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0
    ? ((currentIndex + 1) / questions.length) * 100 : 0

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)

    const isCorrect = currentQuestion.options.find(o => o.key === key)?.is_correct ?? false
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        selected: key,
        is_correct: isCorrect,
        subtopic_id: currentQuestion.subtopic_id,
        topic_id: currentQuestion.topic_id,
        subject_id: currentQuestion.subject_id,
      }
    }))
  }

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      submitTest(answers, questions)
      return
    }
    setCurrentIndex(i => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= questions.length) {
      submitTest(answers, questions)
      return
    }
    setCurrentIndex(i => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your questions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push('/diagnostic')}
            className="text-indigo-600 text-sm font-medium hover:underline"
          >
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const correctKey = currentQuestion.options?.find(o => o.is_correct)?.key
  const timerColor = getTimerColor(secondsLeft, totalSeconds)
  const isLowTime = secondsLeft / totalSeconds <= 0.1

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast stack */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            {currentIndex + 1} / {questions.length}
          </span>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor} ${
            isLowTime ? 'animate-pulse' : ''
          }`}>
            <span className="text-base">⏱</span>
            {formatTime(secondsLeft)}
          </div>

          <button
            onClick={() => submitTest(answers, questions)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            Submit early
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Tags */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {currentQuestion.subject_name}
          </span>
          {currentQuestion.topic_name && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {currentQuestion.topic_name}
            </span>
          )}
        </div>

        <h2 className="text-base font-semibold text-gray-900 leading-relaxed mb-6">
          {currentQuestion.question_text}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options?.map(option => {
            let style = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            if (revealed) {
              if (option.key === correctKey) {
                style = 'border-green-400 bg-green-50 text-green-800'
              } else if (option.key === selected) {
                style = 'border-red-400 bg-red-50 text-red-700'
              } else {
                style = 'border-gray-100 bg-gray-50 text-gray-400'
              }
            } else if (option.key === selected) {
              style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
            }

            return (
              <button
                key={option.key}
                onClick={() => handleSelect(option.key)}
                disabled={revealed}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors ${style}`}
              >
                <span className="font-bold mr-2">{option.key}.</span>
                {option.text}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {revealed && (
          <div className={`p-4 rounded-xl mb-6 text-sm ${
            answers[currentQuestion.id]?.is_correct
              ? 'bg-green-50 border border-green-200'
              : 'bg-orange-50 border border-orange-200'
          }`}>
            <p className={`font-semibold mb-1 ${
              answers[currentQuestion.id]?.is_correct
                ? 'text-green-800' : 'text-orange-800'
            }`}>
              {answers[currentQuestion.id]?.is_correct ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p className="text-gray-700">{currentQuestion.explanation}</p>
            {!answers[currentQuestion.id]?.is_correct && selected && (
              <p className="text-gray-500 text-xs mt-2 italic">
                {currentQuestion.options?.find(o => o.key === selected)?.distractor_explanation}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {!revealed && (
            <button
              onClick={handleSkip}
              className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
          )}
          {revealed && (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
            >
              {currentIndex + 1 >= questions.length ? 'See results →' : 'Next →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}