'use client'

// src/components/lesson/PrerequisiteGate.jsx
// Wraps lesson entry on the student side.
// Checks for unmet prerequisites, shows a soft quiz popup if found.
// NEVER blocks the student — always lets them proceed.
// Three tiers: mastered (silent), advisory (gentle), strong advisory (clear but non-blocking).

import { useState, useEffect } from 'react'
import { getSubjectColor } from '@/lib/theme'

// ── Score tier logic ──────────────────────────────────────────────────────────
function getScoreTier(score, threshold) {
  if (score >= threshold)       return 'mastered'   // ≥ threshold%  — silent pass
  if (score >= threshold - 20)  return 'advisory'   // 20pts below   — gentle nudge
  return 'strong_advisory'                           // well below    — clear message
}

// ── Mini quiz ─────────────────────────────────────────────────────────────────
function MiniQuiz({ prereqData, threshold, onComplete, onSkip }) {
  const { topic, questions } = prereqData
  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState([])
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const q         = questions[current]
  const total     = questions.length
  const isLast    = current + 1 >= total
  const correct   = q?.correct_answer
  const isRight   = selected === correct

  if (!q) return null

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  const handleNext = () => {
    const newAnswers = [...answers, { selected, correct, isRight: selected === correct }]
    if (isLast) {
      const score = Math.round((newAnswers.filter(a => a.isRight).length / total) * 100)
      onComplete(topic.id, score)
    } else {
      setAnswers(newAnswers)
      setSelected(null)
      setRevealed(false)
      setCurrent(c => c + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{topic.name}</span>
        <span>{current + 1} / {total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${((current) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-indigo-50 rounded-2xl px-4 py-3.5">
        <p className="text-sm font-bold text-indigo-900 leading-snug">{q.question_text}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(q.options ?? {}).map(([key, text]) => {
          let style = 'border-gray-200 bg-card text-gray-800'
          if (revealed) {
            if (key === correct)   style = 'border-green-400 bg-green-50 text-green-900'
            else if (key === selected) style = 'border-red-300 bg-red-50 text-red-800'
            else                   style = 'border-gray-100 bg-base text-gray-400'
          } else if (key === selected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-900'
          }
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left text-sm px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${style}`}
            >
              <span className="w-6 h-6 rounded-full border-2 border-current flex-shrink-0 flex items-center justify-center text-xs font-black">{key}</span>
              <span className="flex-1">{text}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className={`rounded-2xl px-4 py-3 text-sm ${isRight ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {isRight
              ? <><span className="font-bold">Correct! </span>{q.explanation?.correct}</>
              : <><span className="font-bold">The answer is {correct}. </span>{q.explanation?.correct}</>
            }
          </div>
          {!isRight && q.explanation?.wrong_options?.[selected] && (
            <div className="bg-base border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700">
              <span className="font-bold text-red-600">Why {selected} is wrong: </span>
              {q.explanation.wrong_options[selected]}
            </div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            {isLast ? 'See result →' : 'Next question →'}
          </button>
        </div>
      )}

      {/* Skip link — always available, subtle */}
      <button
        onClick={onSkip}
        className="w-full text-xs text-gray-300 hover:text-gray-400 transition-colors pt-1"
      >
        Skip and go straight to the lesson
      </button>
    </div>
  )
}

// ── Score result screen ───────────────────────────────────────────────────────
function ScoreResult({ score, threshold, topicName, onContinue, onReviewLesson, subjectName }) {
  const tier  = getScoreTier(score, threshold)
  const color = getSubjectColor(subjectName)

  const content = {
    mastered: {
      emoji:   '🎉',
      heading: 'You\'re ready!',
      message: `You scored ${score}% on ${topicName}. You clearly know this well — the lesson is unlocked.`,
      ctaLabel: 'Go to lesson →',
      showReview: false,
    },
    advisory: {
      emoji:   '💡',
      heading: 'Almost there',
      message: `You scored ${score}% on ${topicName}. You might find the next topic easier after a quick review, but you can go ahead if you feel ready.`,
      ctaLabel: 'Continue to lesson →',
      showReview: true,
    },
    strong_advisory: {
      emoji:   '📚',
      heading: 'Worth reviewing first',
      message: `You scored ${score}% on ${topicName}. This topic is a building block for what you\'re about to learn. We'd recommend reviewing it first — but the lesson is yours if you want to jump in.`,
      ctaLabel: 'Continue anyway →',
      showReview: true,
    },
  }

  const c = content[tier]

  return (
    <div className="text-center space-y-4 py-4">
      <p className="text-5xl">{c.emoji}</p>
      <div>
        <p className="text-xl font-black text-gray-900">{c.heading}</p>
        <div className="mx-auto mt-2 w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              tier === 'mastered' ? 'bg-green-500' :
              tier === 'advisory' ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-1">{score}%</p>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{c.message}</p>
      <div className="space-y-2 pt-2">
        <button
          onClick={onContinue}
          className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
        >
          {c.ctaLabel}
        </button>
        {c.showReview && (
          <button
            onClick={onReviewLesson}
            className="w-full py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-base transition-colors"
          >
            Review {topicName} first
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main gate modal ───────────────────────────────────────────────────────────
export default function PrerequisiteGate({
  topicId,
  subjectName,
  onProceed,        // called when student proceeds to lesson
  onGoToPrereq,     // called when student chooses to review a prereq lesson
  children,         // the lesson component — rendered when gate is passed
}) {
  const [phase, setPhase]                 = useState('checking') // 'checking' | 'gate' | 'quiz' | 'result' | 'open'
  const [prereqs, setPrereqs]             = useState([])
  const [currentPrereqIndex, setCurrentPrereqIndex] = useState(0)
  const [quizResults, setQuizResults]     = useState([]) // { topicId, score }[]
  const [threshold, setThreshold]         = useState(60)
  const [currentResult, setCurrentResult] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/prerequisites/check?topicId=${topicId}`)
        const data = await res.json()

        if (!data.gateActive || data.unmetPrerequisites?.length === 0) {
          setPhase('open')
          return
        }

        const withQuestions = data.unmetPrerequisites.filter(p => p.hasQuestions)

        if (withQuestions.length === 0) {
          // No questions available for any prereqs — let student through silently
          setPhase('open')
          return
        }

        setPrereqs(withQuestions)
        setThreshold(data.passThreshold ?? 60)
        setPhase('gate')
      } catch {
        // On error, always open the lesson — never block
        setPhase('open')
      }
    }
    check()
  }, [topicId])

  const handleQuizComplete = async (topicId, score) => {
    // Save mastery
    await fetch('/api/prerequisites/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, score }),
    })
    const newResults = [...quizResults, { topicId, score }]
    setQuizResults(newResults)
    setCurrentResult({ topicId, score, topicName: prereqs[currentPrereqIndex]?.topic?.name })
    setPhase('result')
  }

  const handleContinueAfterResult = () => {
    const nextIndex = currentPrereqIndex + 1
    if (nextIndex < prereqs.length) {
      setCurrentPrereqIndex(nextIndex)
      setCurrentResult(null)
      setPhase('quiz')
    } else {
      // All prereqs checked — open lesson
      setPhase('open')
      onProceed?.()
    }
  }

  const handleGoToPrereq = () => {
    const prereqTopicId = currentResult?.topicId
    setPhase('open') // don't leave them stuck
    onGoToPrereq?.(prereqTopicId)
  }

  const handleSkip = () => {
    setPhase('open')
    onProceed?.()
  }

  const currentPrereq = prereqs[currentPrereqIndex]

  // ── Lesson is open ───────────────────────────────────────────────────────────
  if (phase === 'open') return children

  // ── Checking ─────────────────────────────────────────────────────────────────
  if (phase === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Getting your lesson ready…</p>
        </div>
      </div>
    )
  }

  // ── Modal wrapper ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">

          {/* ── Gate intro ── */}
          {phase === 'gate' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🧠</p>
                <h2 className="text-lg font-black text-gray-900">Quick check before we start</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Before jumping in, let's check one quick thing — it'll only take 2 minutes and will make this topic much easier to understand.
                </p>
              </div>

              <div className="space-y-2">
                {prereqs.map((p, i) => (
                  <div key={p.topic.id} className="flex items-center gap-3 bg-base rounded-2xl px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{p.topic.name}</p>
                      <p className="text-xs text-gray-400">{p.questions.length} questions · ~2 min</p>
                    </div>
                    {p.currentStatus === 'weak' && (
                      <span className="ml-auto text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold flex-shrink-0">
                        Needs review
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('quiz')}
                className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
              >
                Let's check →
              </button>

              {/* Proceed anyway — subtle, not prominent */}
              <button
                onClick={handleSkip}
                className="w-full text-xs text-gray-300 hover:text-gray-400 transition-colors"
              >
                I'm ready — take me straight to the lesson
              </button>
            </div>
          )}

          {/* ── Quiz ── */}
          {phase === 'quiz' && currentPrereq && (
            <MiniQuiz
              prereqData={currentPrereq}
              threshold={threshold}
              onComplete={handleQuizComplete}
              onSkip={handleSkip}
            />
          )}

          {/* ── Result ── */}
          {phase === 'result' && currentResult && (
            <ScoreResult
              score={currentResult.score}
              threshold={threshold}
              topicName={currentResult.topicName}
              subjectName={subjectName}
              onContinue={handleContinueAfterResult}
              onReviewLesson={handleGoToPrereq}
            />
          )}
        </div>
      </div>
    </div>
  )
}