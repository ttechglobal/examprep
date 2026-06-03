'use client'
// src/components/quiz/QuestionCard.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared question card — diagnostic test + practice session.
// Fully controlled: parent owns selectedAnswer + revealed state.
//
// FIX: TypeError: e is not iterable (at useState, initial render)
//   Root cause: question.options and question.explanation can arrive from
//   Supabase as JSON strings (text / json column) instead of parsed objects.
//   Object.entries("string") / Object.entries(null) throws during render,
//   which React's minified fiber reports as a useState error.
//
//   Fix: normalise options + explanation at the very top of every render
//   path before any .map() / Object.entries() / Object.keys() call.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'

// ── Safe JSON parse helper ────────────────────────────────────────────────────
// Returns `fallback` when val is already an object, null, undefined, or
// an unparseable string.  Never throws.
function safeParseJson(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

// ── Explanation Modal — bottom sheet ─────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose }) {
  const isCorrect   = selectedKey === question.correct_answer
  // Safely parse explanation in case it arrived as a string
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

  // Normalise workings — handles [{step, instruction}], string[], or plain string
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
        className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl flex flex-col max-h-[90vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Result banner */}
        <div className={`mx-5 mb-3 mt-2 rounded-2xl overflow-hidden flex-shrink-0 ${
          isCorrect
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-4 px-4 py-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black text-white ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black ${isCorrect ? 'text-green-800' : 'text-red-700'}`}>
                {isCorrect ? 'Correct!' : `Incorrect — Answer is ${question.correct_answer}`}
              </p>
              {explanation.correct && (
                <MathText
                  text={explanation.correct}
                  className="text-xs text-gray-600 leading-relaxed mt-0.5"
                  as="p"
                />
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 space-y-4 pb-2">

          {/* Step-by-step workings */}
          {hasWorkings && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Workings</p>
              <div className="bg-gray-50 rounded-2xl p-4">
                <WorkingsBlock workings={explanation.workings} />
              </div>
            </div>
          )}

          {/* Why wrong options are wrong */}
          {wrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Why the other options are wrong</p>
              <div className="space-y-2">
                {wrongOptions.map(([key, reason]) => (
                  <div key={key} className={`flex gap-3 px-4 py-3 rounded-2xl border ${
                    key === selectedKey
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      key === selectedKey ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {key}
                    </span>
                    <MathText text={reason} className="text-xs text-gray-600 leading-relaxed flex-1" as="p" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Close */}
        <div className="flex-shrink-0 px-5 pb-6 pt-2 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gray-900 text-white text-sm font-black rounded-2xl hover:bg-gray-700 active:scale-[0.98] transition-all"
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

// ── Main QuestionCard — fully controlled ──────────────────────────────────────
export default function QuestionCard({
  question,
  selectedAnswer,   // string | null  — controlled by parent
  revealed,         // boolean        — controlled by parent
  onAnswer,         // (questionId, selectedKey) => void
  showExplanation = true,
}) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { injectMathStyles() }, [])
  useEffect(() => { setShowModal(false) }, [question?.id])

  // ── FIX: normalise options + explanation before any render logic ──────────
  // Supabase can return JSONB columns as strings when the column type is
  // `text` or `json`. Object.entries(string) is not iterable and crashes
  // the render. Parse here once so all downstream code gets a plain object.
  const options     = safeParseJson(question?.options, {})
  const explanation = safeParseJson(question?.explanation, {})

  // Rebuild question with normalised fields so ExplanationModal also gets them
  const normalisedQuestion = { ...question, options, explanation }

  const handleSelect = useCallback((key) => {
    if (revealed) return
    onAnswer?.(question.id, key)
  }, [revealed, onAnswer, question.id])

  const isCorrect = revealed && selectedAnswer === question.correct_answer

  const hasExplanation = !!(
    explanation.correct ||
    explanation.workings?.length > 0
  )

  // Guard: if options is empty after normalisation, show a safe fallback
  const optionEntries = Object.entries(options)

  return (
    <div className="space-y-3">

      {/* Question image */}
      {question.has_image && question.image_url && (
        <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
          <img
            src={question.image_url}
            alt={question.image_description ?? 'Question diagram'}
            className="w-full object-contain max-h-52"
          />
          {question.image_description && (
            <p className="text-xs text-gray-500 text-center px-3 py-2 italic border-t border-gray-100">
              {question.image_description}
            </p>
          )}
        </div>
      )}

      {/* Question text */}
      <MathText
        text={question.question_text}
        className="text-base font-semibold text-gray-900 leading-relaxed block"
        as="p"
      />

      {/* Guard: no options */}
      {optionEntries.length === 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-xs text-amber-700 font-medium">Options unavailable for this question.</p>
        </div>
      )}

      {/* Answer options */}
      <div className="space-y-2.5">
        {optionEntries.map(([key, text]) => {
          // ── Option styling ────────────────────────────────────────────────
          let style    = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30'
          let dotStyle = 'border-current text-current'

          if (revealed) {
            if (key === question.correct_answer) {
              style    = 'border-green-400 bg-green-50 text-green-800'
              dotStyle = 'border-green-400 bg-green-100 text-green-700'
            } else if (key === selectedAnswer) {
              style    = 'border-red-300 bg-red-50 text-red-700'
              dotStyle = 'border-red-300 bg-red-100 text-red-600'
            } else {
              style    = 'border-gray-100 bg-gray-50/80 text-gray-400'
              dotStyle = 'border-gray-200 text-gray-400'
            }
          } else if (key === selectedAnswer) {
            style    = 'border-indigo-400 bg-indigo-50 text-indigo-800'
            dotStyle = 'border-indigo-400 bg-indigo-100 text-indigo-700'
          }

          const dotContent = revealed && key === question.correct_answer ? '✓'
            : revealed && key === selectedAnswer ? '✗'
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

      {/* Explanation trigger — shown after answering */}
      {revealed && showExplanation && hasExplanation && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 border-2 border-indigo-200 text-indigo-600 text-sm font-black rounded-2xl hover:bg-indigo-50 transition-colors"
        >
          See explanation →
        </button>
      )}

      {/* Explanation modal */}
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