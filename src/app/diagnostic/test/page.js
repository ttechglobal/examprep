'use client'

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
  const [setup, setSetup] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toasts, setToasts] = useState([])

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
        subtopic_name: q.subtopics?.name ?? q.subtopic_name ?? '',
        topic_id: q.topic_id,
        topic_name: q.topics?.name ?? q.topic_name ?? '',
        subject_id: q.subject_id,
        subject_name: q.subjects?.name ?? q.subject_name ?? '',
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

  useEffect(() => {
    if (loading || !questions.length || !totalSeconds) return

    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSeconds / 60)

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1

        minuteWarnings.forEach(w => {
          const threshold = w.minutes * 60
          if (next === threshold && !firedWarnings.current.has(threshold)) {
            firedWarnings.current.add(threshold)
            addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning')
          }
        })

        secondWarnings.forEach(w => {
          if (next === w.seconds && !firedWarnings.current.has(`s${w.seconds}`)) {
            firedWarnings.current.add(`s${w.seconds}`)
            addToast(w.label, 'urgent')
          }
        })

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

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0
    ? ((currentIndex + 1) / questions.length) * 100 : 0

  const handleAnswer = ({ questionId, selected, isCorrect, subtopicId, topicId }) => {
    setRevealed(true)
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        selected,
        is_correct: isCorrect,
        subtopic_id: subtopicId,
        topic_id: topicId,
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
    setRevealed(false)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= questions.length) {
      submitTest(answers, questions)
      return
    }
    setCurrentIndex(i => i + 1)
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
          <button onClick={() => router.push('/diagnostic')} className="text-indigo-600 text-sm font-medium hover:underline">
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const timerColor = getTimerColor(secondsLeft, totalSeconds)
  const isLowTime = secondsLeft / totalSeconds <= 0.1

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColor} ${isLowTime ? 'animate-pulse' : ''}`}>
            <span className="text-base">⏱</span>
            {formatTime(secondsLeft)}
          </div>
          <button onClick={() => submitTest(answers, questions)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
            Submit early
          </button>
        </div>
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
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {currentQuestion.subjects?.name ?? currentQuestion.subject_name}
          </span>
          {(currentQuestion.topics?.name ?? currentQuestion.topic_name) && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {currentQuestion.topics?.name ?? currentQuestion.topic_name}
            </span>
          )}
        </div>

        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          showExplanation={true}
        />

        {/* Next button — shown after answering */}
        {revealed && (
          <div className="mt-6">
            <button
              onClick={handleNext}
              className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
            >
              {currentIndex + 1 >= questions.length ? 'See results →' : 'Next →'}
            </button>
          </div>
        )}

        {/* Skip — only when not answered */}
        {!revealed && (
          <div className="mt-4">
            <button onClick={handleSkip} className="w-full py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors">
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}