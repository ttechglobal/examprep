'use client'
// src/app/student/practice/session/page.js
// Self-contained practice session.
// Reads config from sessionStorage['practice_config'].
// On completion, saves results to sessionStorage['practice_results'] and
// routes to /student/practice/results.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

// ── Timer helpers ────────────────────────────────────────────────────────────
function totalSeconds(count) {
  if (count <= 10) return 15 * 60
  if (count <= 20) return 30 * 60
  return 45 * 60
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function timerColor(seconds, total) {
  const pct = seconds / total
  if (pct > 0.4) return 'text-gray-600'
  if (pct > 0.15) return 'text-amber-500'
  return 'text-red-500'
}

// ── QuestionCard ─────────────────────────────────────────────────────────────
function QuestionCard({ question, index, total, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const color    = getSubjectColor(question.subject_name)
  const correct  = question.correct_answer
  const options  = question.options ?? {}
  const explanation = question.explanation ?? {}

  function handleSelect(key) {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  function handleNext() {
    onAnswer({ questionId: question.id, selected, isCorrect: selected === correct })
  }

  const isRight = selected === correct

  return (
    <div className="space-y-4">
      {/* Progress + meta */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color.accent} rounded-full transition-all duration-300`}
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-400 flex-shrink-0">
          {index + 1}/{total}
        </span>
      </div>

      {/* Subject + topic tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
          {question.subject_name}
        </span>
        {question.topic_name && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {question.topic_name}
          </span>
        )}
        {question.difficulty && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            question.difficulty === 'easy'   ? 'bg-green-100 text-green-700' :
            question.difficulty === 'hard'   ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {question.difficulty}
          </span>
        )}
      </div>

      {/* Question text */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
        <p className="text-base font-bold text-gray-900 leading-relaxed">
          {question.question_text}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {Object.entries(options).map(([key, text]) => {
          let style = 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
          if (revealed) {
            if (key === correct)                 style = 'border-green-400 bg-green-50 text-green-900'
            else if (key === selected)           style = 'border-red-300 bg-red-50 text-red-800'
            else                                 style = 'border-gray-100 bg-gray-50 text-gray-400'
          } else if (key === selected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-900'
          }

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all text-sm font-medium leading-snug ${style}`}
            >
              <span className="font-black mr-2.5">{key}.</span>
              {text}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="space-y-3">
          {/* Result banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
            isRight ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <span className="text-xl">{isRight ? '🎉' : '💡'}</span>
            <p className={`text-sm font-bold ${isRight ? 'text-green-800' : 'text-red-800'}`}>
              {isRight ? 'Correct!' : `Correct answer: ${correct}`}
            </p>
          </div>

          {/* Why correct */}
          {explanation.correct && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1.5">
                Why {correct} is correct
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">{explanation.correct}</p>
            </div>
          )}

          {/* Why selected was wrong */}
          {!isRight && selected && explanation.wrong_options?.[selected] && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
              <p className="text-xs font-black text-red-400 uppercase tracking-wide mb-1.5">
                Why {selected} is wrong
              </p>
              <p className="text-sm text-red-800 leading-relaxed">
                {explanation.wrong_options[selected]}
              </p>
            </div>
          )}

          {/* Next */}
          <button
            onClick={handleNext}
            className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
          >
            {index + 1 >= total ? 'See my results 🏆' : 'Next question →'}
          </button>
        </div>
      )}

      {/* Unanswered — show Next to skip */}
      {!revealed && selected === null && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Tap an answer to continue
        </p>
      )}
    </div>
  )
}

// ── Main session ─────────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router = useRouter()

  const [config, setConfig]     = useState(null)
  const [questions, setQuestions] = useState([])
  const [index, setIndex]       = useState(0)
  const [answers, setAnswers]   = useState([]) // { questionId, selected, isCorrect }[]
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSecs, setTotalSecs]     = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { router.push('/student/practice'); return }
    const cfg = JSON.parse(raw)
    setConfig(cfg)

    const secs = totalSeconds(cfg.count)
    setTotalSecs(secs)
    setSecondsLeft(secs)

    // Fetch questions
    const subjects = cfg.subjects.join(',')
    fetch(`/api/practice/questions?subjects=${subjects}&exam=${cfg.examType}&count=${cfg.count}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setQuestions(data.questions ?? [])
        setLoading(false)
      })
      .catch(() => setError('Failed to load questions. Please try again.'))
  }, [])

  // Timer
  useEffect(() => {
    if (loading || questions.length === 0) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          finishSession(answers, questions)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, questions.length])

  const finishSession = useCallback((finalAnswers, finalQuestions) => {
    clearInterval(timerRef.current)
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers: finalAnswers,
      questions: finalQuestions.map(q => ({
        id:           q.id,
        subject_name: q.subject_name,
        topic_name:   q.topic_name ?? '',
        subtopic_name: q.subtopics?.name ?? q.subtopic_name ?? '',
        subtopic_id:  q.subtopic_id,
        topic_id:     q.topic_id,
        subject_id:   q.subject_id,
        difficulty:   q.difficulty,
      })),
    }))
    router.push('/student/practice/results')
  }, [router])

  function handleAnswer(result) {
    const next = [...answers, result]
    setAnswers(next)
    if (index + 1 >= questions.length) {
      finishSession(next, questions)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading questions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4 px-4">
        <p className="text-4xl">😕</p>
        <p className="font-bold text-gray-900">No questions available yet</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={() => router.push('/student/practice')}
          className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          Back to Practice
        </button>
      </div>
    )
  }

  const currentQ = questions[index]

  return (
    <div className="space-y-4 pb-8">
      {/* Timer bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <button
          onClick={() => router.push('/student/practice')}
          className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Exit
        </button>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-sm font-black tabular-nums ${timerColor(secondsLeft, totalSecs)}`}>
            {formatTime(secondsLeft)}
          </span>
        </div>
        <span className="text-xs text-gray-400">{index + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      {currentQ && (
        <QuestionCard
          question={currentQ}
          index={index}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}