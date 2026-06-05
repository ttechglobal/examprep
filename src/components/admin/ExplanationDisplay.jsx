'use client'
// src/components/student/ExplanationDisplay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders the full explanation for a question after it's answered.
// Handles:
//   • Text explanation (correct answer reasoning)
//   • Workings steps (for calculation questions)
//   • Wrong option explanations
//   • Explanation diagram image (new — from explanation_image_url)
//
// Usage:
//   <ExplanationDisplay
//     question={question}
//     selectedAnswer="B"
//   />
// ─────────────────────────────────────────────────────────────────────────────

export default function ExplanationDisplay({ question, selectedAnswer }) {
  if (!question) return null

  const explanation      = question.explanation ?? {}
  const correct          = explanation.correct  ?? ''
  const workings         = explanation.workings ?? []
  const wrongOptions     = explanation.wrong_options ?? {}
  const isCorrect        = selectedAnswer === question.correct_answer
  const hasExplImage     = question.explanation_has_image && question.explanation_image_url
  const hasQuestionImage = question.has_image && question.image_url

  // Wrong option explanation for this student's specific wrong answer
  const wrongExpl = !isCorrect && selectedAnswer
    ? (wrongOptions[selectedAnswer] ?? null)
    : null

  if (!correct && !workings.length && !wrongExpl && !hasExplImage) return null

  return (
    <div className="space-y-3 mt-4">

      {/* Correct / incorrect header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${
        isCorrect
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        <span className="text-lg">{isCorrect ? '✅' : '❌'}</span>
        <div>
          <p className={`text-sm font-black ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {isCorrect ? 'Correct!' : `Wrong — the answer is ${question.correct_answer}`}
          </p>
        </div>
      </div>

      {/* Wrong option explanation — shown first when student got it wrong */}
      {wrongExpl && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
          <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
            Why {selectedAnswer} is wrong
          </p>
          <p className="text-sm text-primary leading-relaxed">{wrongExpl}</p>
        </div>
      )}

      {/* Correct answer explanation */}
      {correct && (
        <div className="px-4 py-3 bg-card border border-default rounded-2xl">
          <p className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
            Explanation
          </p>
          <p className="text-sm text-primary leading-relaxed">{correct}</p>
        </div>
      )}

      {/* Workings — for calculation questions */}
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
                <p className="text-sm font-mono text-primary leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation diagram — shown after text explanation */}
      {hasExplImage && (
        <div className="rounded-2xl overflow-hidden border border-default bg-card">
          <div className="px-3 py-2 border-b border-default bg-subtle">
            <p className="text-[11px] font-black text-secondary uppercase tracking-wide">
              Solution diagram
            </p>
          </div>
          <img
            src={question.explanation_image_url}
            alt="Solution diagram"
            className="w-full object-contain max-h-64 p-2"
            loading="lazy"
          />
        </div>
      )}

      {/* Original question image — re-shown for reference if it exists */}
      {hasQuestionImage && !isCorrect && (
        <div className="rounded-2xl overflow-hidden border border-default bg-card">
          <div className="px-3 py-2 border-b border-default bg-subtle">
            <p className="text-[11px] font-black text-secondary uppercase tracking-wide">
              Question diagram (reference)
            </p>
          </div>
          <img
            src={question.image_url}
            alt="Question diagram"
            className="w-full object-contain max-h-48 p-2"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}