'use client'
// src/app/student/practice/session/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Complete rewrite — now uses the shared QuestionCard component (same as
// diagnostic test) instead of a custom inline copy. This ensures identical
// styling, math rendering, and explanation behaviour across both flows.
//
// Changes:
// - Imports QuestionCard from @/components/quiz/QuestionCard
// - No inline QuestionCard or ExplanationModal — the shared component handles
//   all of that including math, workings, and option styling
// - Core topics: entirely invisible. No badges, no labels.
// - Question grid: flows at bottom of page content (not fixed/sticky)
// - Confirmation dialog before submit in exam/mock mode
// - Subject/topic tags shown in practice mode, hidden in exam/mock mode
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QuestionCard from '@/components/quiz/QuestionCard'
import { getSubjectColor } from '@/lib/theme'

// ── Timer helpers ─────────────────────────────────────────────────────────────
function totalSeconds(cfg) {
  if (cfg.durationSecs) return cfg.durationSecs
  const c = cfg.count ?? 20
  if (c <= 10)  return 15 * 60
  if (c <= 20)  return 20 * 60
  if (c <= 30)  return 30 * 60
  return              40 * 60
}
function formatTime(s) {
  if (s <= 0) return '0:00'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
function timerColorClass(secs, total) {
  const p = secs / Math.max(total, 1)
  if (p > 0.4)  return 'text-gray-700'
  if (p > 0.15) return 'text-amber-600'
  return 'text-red-600 animate-pulse'
}

// ── Question navigation grid — flows at page bottom, not fixed ────────────────
function QuestionGrid({ total, current, answeredSet, onJump }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-black text-gray-500 mr-auto">Questions</p>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" /> Current
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-300 inline-block" /> Done
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200 inline-block" /> Skip
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = answeredSet.has(i)
          const isCurrent  = i === current
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-300 ring-offset-1'
                  : isAnswered
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ answeredCount, total, secondsLeft, onConfirm, onCancel }) {
  const unanswered = total - answeredCount
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-5 space-y-4">
          <p className="font-black text-gray-900 text-base">Submit your answers?</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            You've answered {answeredCount} of {total} questions.{' '}
            {unanswered > 0 && (
              <span className="text-red-600 font-semibold">
                {unanswered} unanswered {unanswered === 1 ? 'question' : 'questions'} will be marked wrong.
              </span>
            )}{' '}
            You cannot change answers after submitting.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors">
              Keep going
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-500 transition-colors">
              Submit now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Summary screen ────────────────────────────────────────────────────────────
function SummaryScreen({ questions, answers, onReview, onFinish }) {
  const total   = questions.length
  const correct = answers.filter(a => a.isCorrect).length
  const wrong   = answers.filter(a => a.selected !== null && !a.isCorrect).length
  const skipped = answers.filter(a => a.selected === null).length
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0
  const ringColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'

  const grade = pct >= 80 ? { label: 'Excellent!', emoji: '🏆' }
    : pct >= 60            ? { label: 'Good work',  emoji: '👍' }
    : pct >= 40            ? { label: 'Getting there', emoji: '📈' }
    :                        { label: 'Keep at it', emoji: '💪' }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6 pb-8">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="12"/>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={ringColor} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 326.7} 326.7`}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-gray-900">{pct}%</span>
          <span className="text-xs text-gray-500 font-bold">{grade.label}</span>
        </div>
      </div>
      <span className="text-4xl">{grade.emoji}</span>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-200">
          <p className="text-2xl font-black text-green-700">{correct}</p>
          <p className="text-xs text-green-600 mt-0.5 font-medium">Correct</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-200">
          <p className="text-2xl font-black text-red-700">{wrong}</p>
          <p className="text-xs text-red-600 mt-0.5 font-medium">Wrong</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-200">
          <p className="text-2xl font-black text-gray-600">{skipped}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Skipped</p>
        </div>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        <button onClick={onReview}
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
          Review answers →
        </button>
        <button onClick={onFinish}
          className="w-full py-3 bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-200 transition-colors">
          Finish without reviewing
        </button>
      </div>
    </div>
  )
}

// ── Review mode ───────────────────────────────────────────────────────────────
// Uses the shared QuestionCard with revealed=true so styling matches diagnostic
function ReviewMode({ questions, answers, onDone }) {
  const [idx, setIdx] = useState(0)
  const q   = questions[idx]
  const ans = answers[idx]
  if (!q) return null

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <p className="text-xs font-bold text-gray-500">Review mode</p>
        <span className="text-xs font-black text-gray-900">{idx + 1}/{questions.length}</span>
        <button onClick={onDone} className="text-xs font-bold text-indigo-600 hover:opacity-75">Done →</button>
      </div>

      {/* Subject/topic context */}
      <div className="flex items-center gap-2 flex-wrap">
        {q.subject_name && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getSubjectColor(q.subject_name).bg} ${getSubjectColor(q.subject_name).text}`}>
            {q.subject_name}
          </span>
        )}
        {q.topic_name && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {q.topic_name}
          </span>
        )}
      </div>

      {/* Shared QuestionCard in revealed mode */}
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
          <button onClick={() => setIdx(i => i - 1)}
            className="flex-1 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:text-gray-900">
            ← Previous
          </button>
        )}
        {idx < questions.length - 1 ? (
          <button onClick={() => setIdx(i => i + 1)}
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
  )
}

// ── Main session page ─────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router = useRouter()

  const [config,      setConfig]      = useState(null)
  const [questions,   setQuestions]   = useState([])
  const [index,       setIndex]       = useState(0)
  const [answers,     setAnswers]     = useState({})   // questionId → {selected, isCorrect}
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalSecs,   setTotalSecs]   = useState(0)
  const [phase,       setPhase]       = useState('quiz')  // quiz|confirm|summary|review

  const timerRef = useRef(null)
  const answersRef = useRef({})

  useEffect(() => {
    document.body.dataset.hideNav = 'true'
    return () => { delete document.body.dataset.hideNav }
  }, [])

  const finishSession = useCallback((finalAnswers, finalQuestions) => {
    clearInterval(timerRef.current)
    const arr = (finalQuestions ?? questions).map((q, i) => ({
      questionId: q.id,
      selected:   finalAnswers[q.id]?.selected   ?? null,
      isCorrect:  finalAnswers[q.id]?.isCorrect  ?? false,
    }))
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers:   arr,
      questions: (finalQuestions ?? questions).map(q => ({
        id: q.id, subject_name: q.subject_name, subject_id: q.subject_id,
        topic_name: q.topic_name, topic_id: q.topic_id,
        subtopic_name: q.subtopic_name, subtopic_id: q.subtopic_id,
        correct_answer: q.correct_answer,
      })),
      config,
    }))
    router.push('/student/practice/results')
  }, [config, router, questions])

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
        if (data.error) { setError(data.error); setLoading(false); return }
        if (!data.questions?.length) { setError('No questions found.'); setLoading(false); return }
        setQuestions(data.questions)
        const secs = totalSeconds(cfg)
        setTotalSecs(secs)
        setSecondsLeft(secs)
        setLoading(false)
        timerRef.current = setInterval(() => {
          setSecondsLeft(s => {
            if (s <= 1) { clearInterval(timerRef.current); setPhase('summary'); return 0 }
            return s - 1
          })
        }, 1000)
      })
      .catch(() => { setError('Failed to load questions.'); setLoading(false) })
    return () => clearInterval(timerRef.current)
  }, [])

  // Handle answer from QuestionCard (controlled component pattern)
  const handleAnswer = useCallback((questionId, selectedKey) => {
    const q = questions.find(q => q.id === questionId)
    if (!q || answersRef.current[questionId]) return  // already answered

    const entry = { selected: selectedKey, isCorrect: selectedKey === q.correct_answer }
    answersRef.current = { ...answersRef.current, [questionId]: entry }
    setAnswers(prev => ({ ...prev, [questionId]: entry }))

    // In immediate mode: auto-advance after a short delay so student sees result
    const revealMode = config?.revealMode ?? (config?.mode === 'topic' ? 'immediate' : 'end')
    if (revealMode === 'immediate') {
      setTimeout(() => {
        setIndex(i => {
          const next = i + 1
          if (next >= questions.length) { setPhase('summary'); return i }
          return next
        })
      }, 1200)
    }
  }, [questions, config])

  const handleConfirmSubmit = useCallback(() => {
    clearInterval(timerRef.current)
    setPhase('summary')
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
      <p className="text-sm text-gray-500">Loading questions…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <span className="text-4xl">😕</span>
      <p className="font-black text-gray-900">{error}</p>
      <button onClick={() => router.push('/student/practice')}
        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500">
        Back to Practice
      </button>
    </div>
  )

  const revealMode   = config?.revealMode ?? (config?.mode === 'topic' ? 'immediate' : 'end')
  const isExamMode   = config?.mode === 'exam' || config?.mode === 'mock'
  const showGrid     = revealMode === 'end'
  const answeredSet  = new Set(Object.keys(answers).map(id => questions.findIndex(q => q.id === id)).filter(i => i >= 0))

  // Convert answers map to array for summary/review
  const answersArr = questions.map(q => ({
    questionId: q.id,
    selected:   answers[q.id]?.selected   ?? null,
    isCorrect:  answers[q.id]?.isCorrect  ?? false,
  }))

  if (phase === 'summary') return (
    <SummaryScreen
      questions={questions}
      answers={answersArr}
      onReview={() => setPhase('review')}
      onFinish={() => finishSession(answers, questions)}
    />
  )

  if (phase === 'review') return (
    <ReviewMode
      questions={questions}
      answers={answersArr}
      onDone={() => finishSession(answers, questions)}
    />
  )

  const currentQ   = questions[index]
  const currentAns = currentQ ? answers[currentQ.id] : null
  const isRevealed = !!currentAns

  const progress = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Confirm dialog */}
      {phase === 'confirm' && (
        <ConfirmDialog
          answeredCount={Object.keys(answers).length}
          total={questions.length}
          secondsLeft={secondsLeft}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setPhase('quiz')}
        />
      )}

      {/* Header — matches diagnostic test exactly */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Exit? Progress will be lost.')) {
                clearInterval(timerRef.current)
                router.push('/student/practice')
              }
            }}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            ← Exit
          </button>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${timerColorClass(secondsLeft, totalSecs)}`}>
            <span className="text-base">⏱</span>
            {formatTime(secondsLeft)}
          </div>
          <span className="text-sm font-medium text-gray-500">{index + 1}/{questions.length}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}/>
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Subject/topic tags — hidden in exam/mock mode */}
        {!isExamMode && currentQ && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentQ.subject_name && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSubjectColor(currentQ.subject_name).bg} ${getSubjectColor(currentQ.subject_name).text}`}>
                {currentQ.subject_name}
              </span>
            )}
            {currentQ.topic_name && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {currentQ.topic_name}
              </span>
            )}
            {currentQ.difficulty && !isExamMode && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                currentQ.difficulty === 'easy'   ? 'bg-green-50 text-green-700 border-green-200'
                : currentQ.difficulty === 'hard' ? 'bg-red-50 text-red-700 border-red-200'
                :                                  'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {currentQ.difficulty}
              </span>
            )}
          </div>
        )}

        {/* Shared QuestionCard — identical to diagnostic */}
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

        {/* Next button (end-of-session reveal mode) */}
        {isRevealed && revealMode === 'end' && (
          <button
            onClick={() => {
              const next = index + 1
              if (next >= questions.length) { setPhase('summary') }
              else setIndex(next)
            }}
            className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            {index + 1 >= questions.length ? 'See results →' : 'Next →'}
          </button>
        )}

        {/* Submit early */}
        {isExamMode && Object.keys(answers).length > 0 && (
          <button
            onClick={() => setPhase('confirm')}
            className="w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            Submit test — {Object.keys(answers).length}/{questions.length} answered
          </button>
        )}

        {/* Question grid — in page flow, not fixed */}
        {showGrid && (
          <QuestionGrid
            total={questions.length}
            current={index}
            answeredSet={answeredSet}
            onJump={setIndex}
          />
        )}
      </div>
    </div>
  )
}