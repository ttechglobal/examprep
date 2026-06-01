'use client'
// src/components/quiz/QuestionCard.js
// ─────────────────────────────────────────────────────────────────────────────
// This is the SINGLE shared question card used by BOTH the diagnostic test
// and the practice session. The session/page.js should import and use THIS
// component — not its own inline copy.
//
// Fully controlled: parent owns selectedAnswer + revealed state.
// Math rendered via MathText / WorkingsBlock throughout.
// Explanation modal: polished bottom sheet with step-by-step workings.
// Core topic logic: entirely invisible to students — no labels, no badges.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'

// ── Explanation Modal — bottom sheet ─────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose }) {
  const isCorrect   = selectedKey === question.correct_answer
  const explanation = question.explanation ?? {}

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
              <p className={`text-base font-black leading-tight ${
                isCorrect ? 'text-green-900' : 'text-red-900'
              }`}>
                {isCorrect ? 'You got this right!' : 'Not quite right'}
              </p>
              {!isCorrect && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {selectedKey && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-200 text-red-900 rounded-lg text-xs font-black">
                      ✗ You chose: {selectedKey}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-200 text-green-900 rounded-lg text-xs font-black">
                    ✓ Correct: {question.correct_answer}
                  </span>
                </div>
              )}
              {isCorrect && (
                <p className="text-xs text-green-700 mt-0.5">See the full explanation below.</p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 space-y-4 pb-2">

          {/* Approach sentence */}
          {explanation.correct && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1.5">
                Why {question.correct_answer} is correct
              </p>
              <MathText
                text={explanation.correct}
                className="text-sm text-gray-800 leading-relaxed"
                as="p"
              />
            </div>
          )}

          {/* Step-by-step workings — each step on its own line, never prose */}
          {hasWorkings && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
                Step-by-step working
              </p>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 divide-y divide-gray-100">
                <WorkingsBlock
                  workings={explanation.workings}
                  className="space-y-0"
                />
              </div>
            </div>
          )}

          {/* Why other options are wrong */}
          {wrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
                Why the other options are wrong
              </p>
              <div className="space-y-2">
                {wrongOptions.map(([key, reason]) => (
                  <div key={key} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    key === selectedKey ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
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

  const handleSelect = useCallback((key) => {
    if (revealed) return
    onAnswer?.(question.id, key)
  }, [revealed, onAnswer, question.id])

  const isCorrect = revealed && selectedAnswer === question.correct_answer

  const hasExplanation = !!(
    question.explanation?.correct ||
    question.explanation?.workings?.length > 0
  )

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

      {/* Answer options */}
      <div className="space-y-2.5">
        {Object.entries(question.options ?? {}).map(([key, text]) => {
          // ── Option styling — matches diagnostic test exactly ───────────────
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
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all duration-150 ${style} ${!revealed ? 'active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 transition-all duration-150 ${dotStyle}`}>
                  {dotContent}
                </span>
                <MathText text={text} className="leading-snug flex-1 pt-px" as="span" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Post-answer: result pill + Why button */}
      {revealed && showExplanation && (
        <div className="flex items-center justify-between pt-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
            isCorrect ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            <span>{isCorrect ? '🎉' : '🤔'}</span>
            <span>{isCorrect ? 'Correct!' : `Answer: ${question.correct_answer}`}</span>
          </div>

          {hasExplanation && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-full hover:bg-indigo-500 active:scale-95 transition-all"
            >
              <span>💡</span>
              <span>Why?</span>
            </button>
          )}
        </div>
      )}

      {/* Explanation modal */}
      {showModal && (
        <ExplanationModal
          question={question}
          selectedKey={selectedAnswer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}