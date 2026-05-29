'use client'

// src/components/quiz/QuestionCard.js
// ─────────────────────────────────────────────────────────────────────────────
// Three fixes in this rewrite:
//
// 1. ANSWER CARRY-OVER BUG (root cause + fix)
//    The bug: QuestionCard holds `selected` and `revealed` in local state.
//    The parent renders <QuestionCard question={currentQuestion} /> without
//    a `key` prop, so React reuses the same component instance when
//    currentIndex changes — local state persists across questions.
//
//    Fix A (this file): Make the component fully controlled — `selected` and
//    `revealed` are props, not local state. The component owns nothing.
//    Fix B (parent): Pass `key={question.id}` on the call site so React
//    always unmounts/remounts on question change as a belt-and-suspenders
//    guarantee. See diagnostic/test/page.js.
//
// 2. MATH RENDERING
//    Question text and all explanation text passes through renderMath() which
//    converts x^2 → x², 3/4 → stacked fraction, Greek letters, etc.
//    Rendered with dangerouslySetInnerHTML (the input is our own DB content,
//    never user-supplied — safe here).
//
// 3. "WHY" BUTTON + EXPLANATION MODAL
//    After answering, a "Why?" button opens a full-screen bottom sheet modal
//    showing the formatted explanation. The inline explanation block is
//    replaced by this modal so the question card stays clean.
//    Explanation formatting:
//      - Lead sentence (approach)
//      - Step-by-step workings (numbered, monospaced, math-rendered)
//      - Wrong-option explanations (compact, per-option)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MathText, injectMathStyles } from '@/lib/mathRenderer'

// ── Explanation Modal ─────────────────────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose }) {
  const isCorrect = selectedKey === question.correct_answer
  const explanation = question.explanation ?? {}

  // Trap focus + close on Escape
  useEffect(() => {
    injectMathStyles()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const wrongOptions = Object.entries(explanation.wrong_options ?? {})
    .filter(([k]) => k !== question.correct_answer)

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl animate-slide-up">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className={`px-5 py-3 flex items-center justify-between flex-shrink-0 border-b ${
          isCorrect ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${
              isCorrect ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
            }`}>
              {isCorrect ? '✓' : '✗'}
            </span>
            <div>
              <p className={`text-sm font-black ${isCorrect ? 'text-green-800' : 'text-orange-800'}`}>
                {isCorrect ? 'Correct!' : 'Not quite'}
              </p>
              <p className={`text-xs ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                Correct answer: <strong>{question.correct_answer}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-700 transition-colors text-lg leading-none"
            aria-label="Close explanation"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Correct answer explanation — lead sentence */}
          {explanation.correct && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Why {question.correct_answer} is correct
              </p>
              <MathText
                text={explanation.correct}
                className="text-sm text-gray-800 leading-relaxed"
                as="p"
              />
            </div>
          )}

          {/* Step-by-step workings */}
          {explanation.workings?.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                Step-by-step working
              </p>
              <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {explanation.workings.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 tabular-nums">
                      {w.step ?? i + 1}
                    </span>
                    <MathText
                      text={w.instruction ?? w}
                      className="text-sm font-mono text-gray-800 leading-relaxed flex-1"
                      as="p"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wrong-option explanations */}
          {wrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                Why the other options are wrong
              </p>
              <div className="space-y-2">
                {wrongOptions.map(([key, reason]) => (
                  <div
                    key={key}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                      key === selectedKey
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      key === selectedKey
                        ? 'bg-red-200 text-red-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {key}
                    </span>
                    <MathText
                      text={reason}
                      className="text-xs text-gray-600 leading-relaxed flex-1"
                      as="p"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>

        {/* Close button */}
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

// ── Main QuestionCard ─────────────────────────────────────────────────────────
export default function QuestionCard({
  question,
  // Controlled props — parent owns the answer state
  selectedAnswer,   // string | null  — the key the student picked
  revealed,         // boolean        — whether answer has been submitted
  onAnswer,         // (questionId, selectedKey) => void
  // Optional
  showExplanation = true,
  color,
}) {
  const [showModal, setShowModal] = useState(false)

  // Inject math styles on mount
  useEffect(() => { injectMathStyles() }, [])

  // When question changes (parent passes a new one), close any open modal
  useEffect(() => { setShowModal(false) }, [question?.id])

  const handleSelect = useCallback((key) => {
    if (revealed) return
    onAnswer?.(question.id, key)
  }, [revealed, onAnswer, question.id])

  const isCorrect = revealed && selectedAnswer === question.correct_answer

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

      {/* Question text — math-rendered */}
      <MathText
        text={question.question_text}
        className="text-base font-semibold text-gray-900 leading-relaxed block"
        as="p"
      />

      {/* Options */}
      <div className="space-y-2.5">
        {Object.entries(question.options ?? {}).map(([key, text]) => {
          let style = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30'
          let dotStyle = 'border-current text-current'

          if (revealed) {
            if (key === question.correct_answer) {
              style = 'border-green-400 bg-green-50 text-green-800'
              dotStyle = 'border-green-400 bg-green-100 text-green-700'
            } else if (key === selectedAnswer) {
              style = 'border-red-300 bg-red-50 text-red-700'
              dotStyle = 'border-red-300 bg-red-100 text-red-600'
            } else {
              style = 'border-gray-100 bg-gray-50/80 text-gray-400'
              dotStyle = 'border-gray-200 text-gray-400'
            }
          } else if (key === selectedAnswer) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
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

      {/* Post-answer row: result pill + Why button */}
      {revealed && showExplanation && (
        <div className="flex items-center justify-between pt-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
            isCorrect
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            <span>{isCorrect ? '🎉' : '🤔'}</span>
            <span>{isCorrect ? 'Correct!' : `Answer: ${question.correct_answer}`}</span>
          </div>

          {(question.explanation?.correct || question.explanation?.workings?.length > 0) && (
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
