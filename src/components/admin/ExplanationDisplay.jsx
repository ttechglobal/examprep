'use client'
// src/components/admin/ExplanationDisplay.jsx
//
// Phase 1C — Teach-mode explanation rendering for admin question preview.
//
// Surfaces the new Phase 1B explanation fields (concept, why_correct,
// misconception, wrong_options) alongside the legacy `correct` field.
// Questions that only have the old schema continue to render correctly.
//
// Usage:
//   <ExplanationDisplay question={question} selectedAnswer="B" />

export default function ExplanationDisplay({ question, selectedAnswer }) {
  if (!question) return null

  const explanation = question.explanation ?? {}

  // New fields (Phase 1B schema)
  const concept       = explanation.concept       ?? ''
  const whyCorrect    = explanation.why_correct   ?? ''
  const misconception = explanation.misconception ?? ''

  // Legacy fallback
  const legacyCorrect = explanation.correct ?? ''
  const correctText   = whyCorrect || legacyCorrect

  const workings      = explanation.workings    ?? []
  const wrongOptions  = explanation.wrong_options ?? {}

  const isCorrect     = selectedAnswer === question.correct_answer
  const hasExplImage  = question.explanation_has_image && question.explanation_image_url

  // Wrong option text for the selected answer
  const thisWrongReason = !isCorrect && selectedAnswer
    ? (wrongOptions[selectedAnswer] ?? '')
    : ''

  const otherWrongOptions = Object.entries(wrongOptions)
    .filter(([k]) => k !== question.correct_answer)

  const hasAnything = concept || correctText || workings.length || hasExplImage || otherWrongOptions.length

  if (!hasAnything) return null

  return (
    <div className="space-y-3 mt-4">

      {/* Correct / incorrect header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${
        isCorrect
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        <span className="text-lg">{isCorrect ? '✅' : '❌'}</span>
        <p className={`text-sm font-black ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          {isCorrect ? 'Correct!' : `Wrong — the answer is ${question.correct_answer}`}
        </p>
      </div>

      {/* Concept pill */}
      {concept && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
          <span className="text-indigo-500 dark:text-indigo-400 text-base leading-none mt-0.5 flex-shrink-0">💡</span>
          <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{concept}</p>
        </div>
      )}

      {/* Why the student's answer was wrong */}
      {!isCorrect && (thisWrongReason || misconception) && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
          <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
            Why {selectedAnswer} is wrong
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
            {thisWrongReason || misconception}
          </p>
        </div>
      )}

      {/* Correct answer explanation */}
      {correctText && (
        <div className="px-4 py-3 bg-card border border-default rounded-2xl">
          <p className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
            {isCorrect ? "Why you're right" : `Why ${question.correct_answer} is correct`}
          </p>
          <p className="text-sm text-primary leading-relaxed">{correctText}</p>
        </div>
      )}

      {/* Workings */}
      {workings.length > 0 && (
        <div className="px-4 py-3 bg-card border border-default rounded-2xl">
          <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
            Workings
          </p>
          <div className="space-y-1.5">
            {workings.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-mono text-primary leading-relaxed">
                  {typeof step === 'string' ? step : step.instruction ?? step.step ?? ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation diagram */}
      {hasExplImage && (
        <div className="rounded-2xl overflow-hidden border border-default bg-card">
          <div className="px-3 py-2 border-b border-default bg-subtle">
            <p className="text-xs font-black text-secondary uppercase tracking-wide">Solution diagram</p>
          </div>
          <img
            src={question.explanation_image_url}
            alt="Solution diagram"
            className="w-full object-contain max-h-64 bg-white dark:bg-gray-900 p-3"
          />
        </div>
      )}

      {/* Why other options are wrong */}
      {otherWrongOptions.length > 0 && (
        <div className="px-4 py-3 bg-card border border-default rounded-2xl">
          <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
            Why the other options are wrong
          </p>
          <div className="space-y-2">
            {otherWrongOptions.map(([key, reason]) => (
              <div key={key} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${
                key === selectedAnswer
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-subtle border-default'
              }`}>
                <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  key === selectedAnswer
                    ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {key}
                </span>
                <p className="text-sm text-primary leading-relaxed flex-1">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}