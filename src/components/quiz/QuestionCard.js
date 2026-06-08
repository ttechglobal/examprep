'use client'
// src/components/quiz/QuestionCard.js

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'

function safeParseJson(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

// ── Explanation Modal ─────────────────────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose }) {
  const isCorrect   = selectedKey === question.correct_answer
  const explanation = safeParseJson(question.explanation, {})

  useEffect(() => {
    injectMathStyles()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const wrongOptions = Object.entries(explanation.wrong_options ?? {})
    .filter(([k]) => k !== question.correct_answer)

  const hasWorkings = !!(
    explanation.workings?.length ||
    (typeof explanation.workings === 'string' && explanation.workings.trim())
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl flex flex-col max-h-[90vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Result banner — icon + label ONLY, no explanation text here */}
        <div className={`mx-5 mb-3 mt-2 rounded-2xl flex-shrink-0 ${
          isCorrect
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-black text-white ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <p className={`text-sm font-black ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {isCorrect ? 'Correct!' : `Incorrect — the answer is ${question.correct_answer}`}
            </p>
          </div>
        </div>

        {/* Scrollable body — explanation text lives here at full width */}
        <div className="overflow-y-auto flex-1 px-5 space-y-4 pb-2">

          {/* Correct answer explanation — full width, properly spaced */}
          {explanation.correct && (
            <div className="bg-base rounded-2xl px-4 py-3 border border-default">
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
                Explanation
              </p>
              <MathText
                text={explanation.correct}
                className="text-sm text-primary leading-relaxed"
                as="p"
              />
            </div>
          )}

          {/* Step-by-step workings */}
          {hasWorkings && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Workings</p>
              <div className="bg-base rounded-2xl p-4">
                <WorkingsBlock workings={explanation.workings} />
              </div>
            </div>
          )}

          {/* Why wrong options are wrong */}
          {wrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
                Why the other options are wrong
              </p>
              <div className="space-y-2">
                {wrongOptions.map(([key, reason]) => (
                  <div key={key} className={`flex gap-3 px-4 py-3 rounded-2xl border ${
                    key === selectedKey
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-base border-default'
                  }`}>
                    <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      key === selectedKey
                        ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {key}
                    </span>
                    <MathText text={reason} className="text-xs text-primary leading-relaxed flex-1" as="p" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Close button */}
        <div className="flex-shrink-0 px-5 pb-6 pt-2 bg-card border-t border-default">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-black rounded-2xl hover:bg-gray-700 dark:hover:bg-white active:scale-[0.98] transition-all"
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>,
    document.body
  )
}

// ── Main QuestionCard ─────────────────────────────────────────────────────────
export default function QuestionCard({
  question,
  selectedAnswer,
  revealed,
  onAnswer,
  showExplanation = true,
}) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { injectMathStyles() }, [])
  useEffect(() => { setShowModal(false) }, [question?.id])

  const options     = safeParseJson(question?.options,     {})
  const explanation = safeParseJson(question?.explanation, {})
  const normalisedQuestion = { ...question, options, explanation }

  const handleSelect = useCallback((key) => {
    if (revealed) return
    onAnswer?.(question.id, key)
  }, [revealed, onAnswer, question?.id])

  const isCorrect      = revealed && selectedAnswer === question.correct_answer
  const hasExplanation = !!(
    explanation.correct ||
    explanation.workings?.length ||
    Object.keys(explanation.wrong_options ?? {}).length
  )

  return (
    <div className="space-y-3">
      {/* Question text */}
      <MathText
        text={question.question_text ?? ''}
        className="text-sm font-medium text-primary leading-relaxed"
        as="p"
      />

      {/* Question image */}
      {question.has_image && question.image_url && (
        <div className="rounded-2xl overflow-hidden border border-default bg-subtle">
          <img
            src={question.image_url}
            alt={question.image_description ?? 'Question diagram'}
            className="w-full object-contain max-h-48"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(options).map(([key, text]) => {
          const isSelected = key === selectedAnswer
          const isCorrectKey = key === question.correct_answer

          let style    = 'border-default bg-card text-primary hover:border-indigo-300 dark:hover:border-indigo-700'
          let dotStyle = 'border-gray-300 dark:border-gray-600 text-gray-500'

          if (revealed) {
            if (isCorrectKey) {
              style    = 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700 text-primary'
              dotStyle = 'border-green-500 bg-green-500 text-white'
            } else if (isSelected) {
              style    = 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-700 text-primary'
              dotStyle = 'border-red-500 bg-red-500 text-white'
            } else {
              style    = 'border-default bg-subtle text-tertiary opacity-60'
              dotStyle = 'border-gray-300 dark:border-gray-600 text-gray-400'
            }
          } else if (isSelected) {
            style    = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-primary'
            dotStyle = 'border-indigo-500 bg-indigo-500 text-white'
          }

          const dotContent = revealed && isCorrectKey ? '✓'
            : revealed && isSelected   ? '✗'
            : key

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all duration-150 ${style} ${!revealed ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full border-2 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${dotStyle}`}>
                  {dotContent}
                </span>
                <MathText text={String(text ?? '')} className="flex-1 leading-snug" as="span" />
              </div>
            </button>
          )
        })}
      </div>

      {/* See explanation button */}
      {revealed && showExplanation && hasExplanation && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm font-black rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
        >
          See explanation →
        </button>
      )}

      {showModal && (
        <ExplanationModal
          question={normalisedQuestion}
          selectedKey={selectedAnswer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}