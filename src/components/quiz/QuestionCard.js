'use client'
// src/components/quiz/QuestionCard.js
//
// Phase 1C — Teach-mode ExplanationModal
//
// WHAT CHANGED (ExplanationModal only — QuestionCard itself unchanged):
//
//   New fields surfaced (from Phase 1B explanation schema):
//     explanation.concept       — the principle this question tests
//     explanation.why_correct   — why the correct answer is right (specific)
//     explanation.misconception — most common wrong answer + exact mistake
//     explanation.wrong_options — per-option mistake explanations
//
//   New render order:
//     WRONG answer: concept pill → "why your answer was wrong" → correct answer
//                   explained → workings (if calc) → wrong options list
//     CORRECT answer: concept pill → why it's right → workings (if calc)
//
//   BACKWARD COMPAT: All new fields are optional. Questions that only have
//   explanation.correct (old schema) render exactly as before — concept pill
//   and misconception block are simply omitted when the fields are empty.
//
//   hasExplanation guard now also fires on new fields so old questions that
//   only have wrong_options still show the "See explanation" button.

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

  // ── Extract explanation fields ──────────────────────────────────────────────
  // New fields (Phase 1B schema)
  const concept       = explanation.concept       ?? ''
  const whyCorrect    = explanation.why_correct   ?? ''
  const misconception = explanation.misconception ?? ''

  // Legacy field — used as fallback when why_correct is empty
  const legacyCorrect = explanation.correct ?? ''

  // The explanation text to show for the correct answer
  const correctText = whyCorrect || legacyCorrect

  // Wrong option explanation for the student's specific answer
  const wrongOptions    = explanation.wrong_options ?? {}
  const thisWrongReason = !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''

  // All wrong options except correct answer (for the "why others are wrong" list)
  const otherWrongOptions = Object.entries(wrongOptions)
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

        {/* Result banner */}
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

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-2">

          {/* ── CONCEPT PILL ─────────────────────────────────────────────────
              New field. Only shown when present. Gives the student a one-line
              anchor: "what principle does this question test?" */}
          {concept && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
              <span className="text-indigo-500 dark:text-indigo-400 text-base leading-none mt-0.5 flex-shrink-0">💡</span>
              <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                {concept}
              </p>
            </div>
          )}

          {/* ── WHY YOUR ANSWER WAS WRONG ─────────────────────────────────────
              Only shown when student got it wrong AND we have a specific reason.
              Falls back to misconception if no per-option explanation. */}
          {!isCorrect && (thisWrongReason || misconception) && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
              <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                Why {selectedKey} is wrong
              </p>
              <MathText
                text={thisWrongReason || misconception}
                className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed"
                as="p"
              />
            </div>
          )}

          {/* ── CORRECT ANSWER EXPLANATION ───────────────────────────────────
              Always shown when there's text. Uses why_correct (new) or
              falls back to legacy explanation.correct. */}
          {correctText && (
            <div className="px-4 py-3 bg-base border border-default rounded-2xl">
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
                {isCorrect ? 'Why you\'re right' : `Why ${question.correct_answer} is correct`}
              </p>
              <MathText
                text={correctText}
                className="text-sm text-primary leading-relaxed"
                as="p"
              />
            </div>
          )}

          {/* ── STEP-BY-STEP WORKINGS ────────────────────────────────────────
              Calculation questions only. */}
          {hasWorkings && (
            <div className="px-4 py-3 bg-base border border-default rounded-2xl">
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
                Workings
              </p>
              <WorkingsBlock workings={explanation.workings} />
            </div>
          )}

          {/* ── EXPLANATION DIAGRAM ──────────────────────────────────────────
              Only shown when visual_needed + explanation_image_url present.
              Same image rendering pattern as question images. */}
          {question.explanation_has_image && question.explanation_image_url && (
            <div className="rounded-2xl overflow-hidden border border-default bg-card">
              <div className="px-3 py-2 border-b border-default bg-subtle">
                <p className="text-xs font-black text-secondary uppercase tracking-wide">
                  Diagram
                </p>
              </div>
              <img
                src={question.explanation_image_url}
                alt="Solution diagram"
                className="w-full object-contain max-h-64 bg-white dark:bg-gray-900 p-3"
              />
            </div>
          )}

          {/* ── WHY OTHER OPTIONS ARE WRONG ──────────────────────────────────
              Full wrong options list — shown for both correct and wrong.
              Students who got it right still learn what traps exist. */}
          {otherWrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
                Why the other options are wrong
              </p>
              <div className="space-y-2">
                {otherWrongOptions.map(([key, reason]) => (
                  <div
                    key={key}
                    className={`flex gap-3 px-4 py-3 rounded-2xl border ${
                      key === selectedKey
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-base border-default'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      key === selectedKey
                        ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {key}
                    </span>
                    <MathText
                      text={reason}
                      className="text-sm text-primary leading-relaxed flex-1"
                      as="p"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Close */}
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

  const isCorrect = revealed && selectedAnswer === question.correct_answer

  // hasExplanation: true if there's anything worth showing in the modal.
  // Covers both old schema (explanation.correct) and new schema fields.
  const hasExplanation = !!(
    explanation.correct      ||
    explanation.why_correct  ||
    explanation.concept      ||
    explanation.workings?.length ||
    Object.keys(explanation.wrong_options ?? {}).length
  )

  const optionEntries = Object.entries(options)

  return (
    <div className="space-y-3">

      {/* Question image */}
      {question.has_image && question.image_url && (
        <div className="rounded-2xl overflow-hidden bg-base border border-default">
          <img
            src={question.image_url}
            alt={question.image_description ?? 'Question diagram'}
            className="w-full object-contain max-h-64 bg-white dark:bg-gray-900 p-3"
          />
        </div>
      )}

      {/* Question text */}
      <MathText
        text={question.question_text ?? ''}
        className="text-base text-primary leading-relaxed font-medium"
        as="p"
      />

      {/* Options */}
      <div className="space-y-2.5">
        {optionEntries.map(([key, text]) => {
          const isSelected = selectedAnswer === key
          const isRight    = revealed && key === question.correct_answer
          const isWrong    = revealed && isSelected && !isRight

          const style =
            isRight  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
            isWrong  ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
            isSelected ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' :
            'border-default bg-base hover:border-indigo-300 dark:hover:border-indigo-700'

          const dotStyle =
            isRight  ? 'border-green-500 bg-green-500 text-white' :
            isWrong  ? 'border-red-400 bg-red-400 text-white' :
            isSelected ? 'border-indigo-400 text-indigo-600 dark:text-indigo-400' :
            'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'

          const dotContent =
            isRight   ? '✓' :
            isWrong   ? '✗' :
            key

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