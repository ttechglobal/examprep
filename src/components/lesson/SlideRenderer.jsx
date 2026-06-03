'use client'
// src/components/lesson/SlideRenderer.jsx
// Changes in this version:
// 1. GuidedExampleSlide — step-by-step reveal: one step at a time, user presses
//    "Next step →" to advance. onUnlock fires after the LAST step is revealed.
// 2. EndQuizSlide — onQuizComplete(correctCount, totalCount) callback added.
//    LessonViewer uses this to award bonus points per correct answer.
// 3. All dark mode token classes preserved from previous audit.

import { useState, useEffect, useRef } from 'react'

// ── Shared math renderer ──────────────────────────────────────────────────────
function MathStep({ text, color }) {
  if (!text) return null
  return (
    <p className={`text-sm leading-relaxed ${color?.text ?? 'text-primary'} font-medium`}>
      {text}
    </p>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
function HookSlide({ slide, color }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-6`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-3 ${color?.text ?? 'text-secondary'}`}>
          Did you know? 💡
        </p>
        <p className={`text-lg font-bold ${color?.text ?? 'text-primary'} leading-relaxed`}>
          {slide.body}
        </p>
      </div>
    </div>
  )
}

// ── Definition ────────────────────────────────────────────────────────────────
function DefinitionSlide({ slide, color }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-5`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${color?.text ?? 'text-secondary'}`}>
          Definition
        </p>
        <p className={`text-2xl font-black ${color?.text ?? 'text-primary'} mb-3`}>{slide.term}</p>
        <p className={`text-base leading-relaxed ${color?.text ?? 'text-primary'} font-medium`}>
          {slide.definition}
        </p>
      </div>
      {slide.examples?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Examples</p>
          {slide.examples.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
              <span className={`text-sm font-black ${color?.text ?? 'text-secondary'} flex-shrink-0 mt-0.5`}>{i + 1}.</span>
              <p className="text-sm text-primary leading-relaxed">{ex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared image slot ─────────────────────────────────────────────────────────
function StudentImageSlot({ image }) {
  const url = typeof image === 'string' ? image : image?.url
  if (!url) return null
  return (
    <div className="rounded-xl overflow-hidden bg-subtle">
      <img src={url} alt="" className="w-full object-contain max-h-64" loading="lazy" />
    </div>
  )
}

// ── Concept ───────────────────────────────────────────────────────────────────
function ConceptSlide({ slide, color, isAdmin, slideIndex, subtopicId, uploadMeta, onImageUpload }) {
  const hasImage = slide.image?.url || slide.image_url
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-5`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${color?.text ?? 'text-secondary'}`}>Concept</p>
        <p className={`text-xl font-black ${color?.text ?? 'text-primary'} mb-3 leading-snug`}>{slide.heading}</p>
        <p className={`text-base leading-relaxed ${color?.text ?? 'text-primary'} font-medium`}>{slide.body}</p>
      </div>
      {slide.examples?.length > 0 && (
        <div className="space-y-2">
          {slide.examples.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
              <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>{i + 1}</span>
              <p className="text-sm text-primary leading-relaxed">{ex}</p>
            </div>
          ))}
        </div>
      )}
      {hasImage && <StudentImageSlot image={slide.image ?? slide.image_url} />}
    </div>
  )
}

// ── Formula ───────────────────────────────────────────────────────────────────
function FormulaSlide({ slide, color, isAdmin, slideIndex, subtopicId, uploadMeta, onImageUpload }) {
  const hasImage = slide.image?.url || slide.image_url
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-5`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${color?.text ?? 'text-secondary'}`}>{slide.label}</p>
        <div className="font-mono text-lg font-black text-primary my-3 break-words whitespace-pre-wrap leading-relaxed">
          {slide.formula}
        </div>
        <p className={`text-sm leading-relaxed ${color?.text ?? 'text-primary'} font-medium`}>{slide.plain_english}</p>
      </div>
      {slide.variables?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Variables</p>
          {slide.variables.map((v, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
              <span className={`font-mono font-black text-sm ${color?.text ?? 'text-secondary'} flex-shrink-0 min-w-[2rem]`}>{v.symbol}</span>
              <span className="text-sm text-primary leading-relaxed">{v.meaning}</span>
            </div>
          ))}
        </div>
      )}
      {hasImage && <StudentImageSlot image={slide.image ?? slide.image_url} />}
    </div>
  )
}

// ── Interaction ───────────────────────────────────────────────────────────────
function InteractionSlide({ slide, color, interactive, onUnlock }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct  = slide.correct?.trim()
  const isCorrect = selected === correct

  const options = (slide.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key  = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  function handleSelect(key) {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
    onUnlock?.()
  }

  if (!interactive) {
    return (
      <div className="rounded-2xl overflow-hidden animate-in fade-in duration-300">
        <div className={`px-4 py-3 ${color?.accent ?? 'bg-indigo-600'}`}>
          <p className="text-xs font-black text-white/80 uppercase tracking-wide mb-1">Quick Check ✏️</p>
          <p className="text-sm font-bold text-white leading-snug">{slide.question}</p>
        </div>
        <div className="bg-card p-4 space-y-2">
          {options.map(opt => (
            <div key={opt.key} className={`px-3 py-2.5 rounded-xl text-sm border ${
              opt.key === correct
                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-bold'
                : 'bg-subtle border-default text-secondary'
            }`}>
              <span className="font-bold mr-2">{opt.key}.</span>{opt.text}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden animate-in fade-in duration-300">
      <div className={`px-4 py-3 ${color?.accent ?? 'bg-indigo-600'}`}>
        <p className="text-xs font-black text-white/80 uppercase tracking-wide mb-1">Quick Check ✏️</p>
        <p className="text-sm font-bold text-white leading-snug">{slide.question}</p>
      </div>
      <div className="bg-card p-4 space-y-2">
        {options.map(opt => {
          const isSelected = selected === opt.key
          const isRight    = opt.key === correct
          let optClass = 'border-default bg-subtle text-primary'
          if (revealed) {
            if (isRight)         optClass = 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'
            else if (isSelected) optClass = 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            else                 optClass = 'border-default bg-subtle text-secondary opacity-50'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={revealed}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-all ${optClass} ${
                !revealed ? 'hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.98]' : ''
              }`}>
              <span className="font-bold mr-2">{opt.key}.</span>{opt.text}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className={`px-4 py-3 border-t border-default ${isCorrect ? 'bg-green-50 dark:bg-green-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
          <p className={`text-sm font-bold leading-relaxed ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
            {isCorrect ? `✓ ${slide.feedback_correct}` : `✗ ${slide.feedback_wrong}`}
          </p>
          {!isCorrect && slide.feedback_correct && (
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-1.5 leading-relaxed">
              Correct: <span className="font-bold">{correct}</span> — {slide.feedback_correct}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Guided Worked Example — STEP BY STEP ──────────────────────────────────────
// NEW: reveals one step at a time. User presses "Next step →" to advance.
// onUnlock fires after the final step is shown.
function GuidedExampleSlide({ slide, color, onUnlock }) {
  const steps    = slide.steps ?? []
  const total    = steps.length
  const [visibleCount, setVisibleCount] = useState(1) // start with step 1 shown
  const allShown = visibleCount >= total

  // Fire onUnlock once all steps are visible
  useEffect(() => {
    if (allShown) onUnlock?.()
  }, [allShown, onUnlock])

  function showNext() {
    setVisibleCount(n => Math.min(n + 1, total))
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Problem */}
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-4`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${color?.text ?? 'text-secondary'}`}>
          Worked Example
        </p>
        <p className={`text-base font-bold ${color?.text ?? 'text-primary'} leading-snug`}>
          {slide.problem}
        </p>
      </div>

      {/* Steps — reveal one at a time */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-wide text-tertiary">Solution</p>
            <p className="text-xs text-tertiary">
              Step {Math.min(visibleCount, total)} of {total}
            </p>
          </div>

          {steps.slice(0, visibleCount).map((s, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 bg-subtle rounded-xl ${
                i === visibleCount - 1 ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''
              }`}
            >
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {i + 1}
              </span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}

          {/* Next step button — shown while steps remain */}
          {!allShown && (
            <button
              onClick={showNext}
              className={`w-full py-3 border-2 border-dashed ${
                color?.border ?? 'border-indigo-200 dark:border-indigo-800'
              } rounded-2xl text-sm font-bold ${
                color?.text ?? 'text-indigo-600 dark:text-indigo-400'
              } hover:bg-subtle transition-colors active:scale-[0.98]`}
            >
              Next step →
            </button>
          )}
        </div>
      )}

      {/* Final answer — only once all steps shown */}
      {allShown && slide.final_answer && (
        <div className={`${color?.bg ?? 'bg-subtle'} rounded-2xl px-5 py-4 animate-in fade-in duration-300`}>
          <p className="text-xs font-bold text-tertiary uppercase tracking-wide mb-1">Final Answer</p>
          <p className={`text-xl font-black font-mono break-words ${color?.text ?? 'text-primary'}`}>
            {slide.final_answer}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Student Attempt ───────────────────────────────────────────────────────────
function StudentAttemptSlide({ slide, color, onUnlock }) {
  const [revealed, setRevealed]       = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(slide.reveal_delay_seconds ?? 8)
  const [canReveal, setCanReveal]     = useState((slide.reveal_delay_seconds ?? 8) <= 0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (canReveal) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); setCanReveal(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [canReveal])

  function handleReveal() { setRevealed(true); onUnlock?.() }

  const steps = slide.steps ?? []

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-4`}>
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${color?.text ?? 'text-secondary'}`}>Your Turn ✏️</p>
        <p className={`text-base font-bold ${color?.text ?? 'text-primary'} leading-snug`}>{slide.problem}</p>
      </div>
      {!revealed && (
        <div className="px-4 py-3 bg-subtle rounded-2xl text-center">
          <p className="text-sm text-secondary">Work it out on paper first, then reveal the solution.</p>
        </div>
      )}
      {!revealed && (
        <button onClick={handleReveal} disabled={!canReveal}
          className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all ${
            canReveal
              ? `${color?.accent ?? 'bg-indigo-600'} text-white hover:opacity-90 active:scale-[0.98]`
              : 'bg-subtle text-tertiary cursor-not-allowed'
          }`}>
          {canReveal ? 'Show solution →' : `Show solution in ${secondsLeft}s`}
        </button>
      )}
      {revealed && steps.length > 0 && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Solution</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-subtle rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>{i + 1}</span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}
          {slide.final_answer && (
            <div className={`${color?.bg ?? 'bg-subtle'} rounded-2xl px-5 py-4`}>
              <p className="text-xs font-bold text-tertiary uppercase tracking-wide mb-1">Final Answer</p>
              <p className={`text-xl font-black font-mono break-words ${color?.text ?? 'text-primary'}`}>{slide.final_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── End Quiz — one question at a time, reports score ─────────────────────────
// NEW: onQuizComplete(correctCount, totalCount) fires when all questions done.
// LessonViewer uses this to award per-answer bonus points.
function EndQuizSlide({ slide, color, interactive, onUnlock, onQuizComplete }) {
  const questions = slide.questions ?? []
  const [currentQ, setCurrentQ]       = useState(0)
  const [selected, setSelected]       = useState(null)
  const [revealed, setRevealed]       = useState(false)
  const [allDone, setAllDone]         = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  const q       = questions[currentQ]
  const total   = questions.length
  const correct = q?.correct?.trim()

  const getOptions = (q) => (q?.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key  = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  function handleSelect(key) {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
  }

  function handleNext() {
    const wasCorrect = selected === correct
    const newCorrect = correctCount + (wasCorrect ? 1 : 0)

    if (currentQ + 1 >= total) {
      setCorrectCount(newCorrect)
      setAllDone(true)
      onUnlock?.()
      onQuizComplete?.(newCorrect, total)
    } else {
      setCorrectCount(newCorrect)
      setCurrentQ(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  if (!interactive || allDone) {
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📝</span>
          <p className="text-xs font-black uppercase tracking-widest text-tertiary">End of Lesson Quiz</p>
        </div>
        <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-4 text-center`}>
          <p className={`text-lg font-black ${color?.text ?? 'text-primary'}`}>
            {allDone
              ? `Quiz complete! ${correctCount}/${total} correct 🎉`
              : `${total} question${total !== 1 ? 's' : ''}`}
          </p>
          {allDone && correctCount === total && (
            <p className="text-sm text-secondary mt-1">Perfect score! 🏆</p>
          )}
        </div>
      </div>
    )
  }

  if (!q) return null
  const isCorrect = selected === correct
  const options   = getOptions(q)

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <p className="text-xs font-black uppercase tracking-widest text-tertiary">End of Lesson Quiz</p>
        </div>
        <p className="text-xs font-bold text-tertiary">{currentQ + 1} / {total}</p>
      </div>
      <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
        <div
          className={`h-full ${color?.accent ?? 'bg-indigo-500'} rounded-full transition-all duration-500`}
          style={{ width: `${(currentQ / total) * 100}%` }}
        />
      </div>
      <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-4`}>
        <p className={`text-base font-bold ${color?.text ?? 'text-primary'} leading-snug`}>{q.question}</p>
      </div>
      <div className="space-y-2">
        {options.map(opt => {
          const isSelected = selected === opt.key
          const isRight    = opt.key === correct
          let optClass = 'border-default bg-subtle text-primary'
          if (revealed) {
            if (isRight)         optClass = 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'
            else if (isSelected) optClass = 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            else                 optClass = 'border-default bg-subtle text-secondary opacity-50'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={revealed}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-all ${optClass} ${
                !revealed ? 'hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.98]' : ''
              }`}>
              <span className="font-bold mr-2">{opt.key}.</span>{opt.text}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className="space-y-3">
          <div className={`px-4 py-3 rounded-2xl ${isCorrect ? 'bg-green-50 dark:bg-green-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
            <p className={`text-sm font-bold leading-relaxed ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
              {isCorrect ? `✓ ${q.feedback_correct ?? 'Correct!'}` : `✗ ${q.feedback_wrong ?? 'Not quite.'}`}
            </p>
            {!isCorrect && q.feedback_correct && (
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-1.5 leading-relaxed">
                Correct: <span className="font-bold">{correct}</span> — {q.feedback_correct}
              </p>
            )}
          </div>
          <button onClick={handleNext}
            className={`w-full py-4 ${color?.accent ?? 'bg-indigo-600'} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98]`}>
            {currentQ + 1 >= total ? 'Complete quiz ✓' : 'Next question →'}
          </button>
        </div>
      )}
      {!revealed && (
        <p className="text-center text-xs text-tertiary">Tap an answer to continue</p>
      )}
    </div>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────
function SummarySlide({ slide, color }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📋</span>
        <p className="text-xs font-black uppercase tracking-widest text-tertiary">Summary</p>
      </div>
      <div className="space-y-2">
        {(slide.points ?? []).map((point, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
            <div className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-primary font-medium leading-relaxed">{point}</p>
          </div>
        ))}
      </div>
      {slide.closing && (
        <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-4`}>
          <p className={`text-sm font-bold ${color?.text ?? 'text-primary'} leading-relaxed`}>{slide.closing}</p>
        </div>
      )}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function SlideRenderer({
  slide,
  slideIndex,
  color,
  interactive = true,
  isAdmin = false,
  subtopicId,
  examTag,
  subjectName,
  topicName,
  subtopicName,
  onImageUpload,
  onUnlock,
  onQuizComplete,  // NEW: (correctCount, totalCount) => void
}) {
  switch (slide.type) {
    case 'hook':
      return <HookSlide slide={slide} color={color} />
    case 'definition':
      return <DefinitionSlide slide={slide} color={color} />
    case 'real_life':
      return (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className={`rounded-2xl ${color?.bg ?? 'bg-subtle'} px-5 py-5`}>
            <p className={`text-base leading-relaxed ${color?.text ?? 'text-primary'} font-medium`}>{slide.body}</p>
          </div>
        </div>
      )
    case 'concept':
      return (
        <ConceptSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex}
          subtopicId={subtopicId} uploadMeta={{ examTag, subjectName, topicName, subtopicName }}
          onImageUpload={onImageUpload} />
      )
    case 'formula':
      return (
        <FormulaSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex}
          subtopicId={subtopicId} uploadMeta={{ examTag, subjectName, topicName, subtopicName }}
          onImageUpload={onImageUpload} />
      )
    case 'interaction':
      return <InteractionSlide slide={slide} color={color} interactive={interactive} onUnlock={onUnlock} />
    case 'worked_example':
      if (slide.mode === 'student_attempt') {
        return <StudentAttemptSlide slide={slide} color={color} onUnlock={onUnlock} />
      }
      return <GuidedExampleSlide slide={slide} color={color} onUnlock={onUnlock} />
    case 'end_quiz':
      return (
        <EndQuizSlide
          slide={slide} color={color} interactive={interactive}
          onUnlock={onUnlock} onQuizComplete={onQuizComplete}
        />
      )
    case 'summary':
      return <SummarySlide slide={slide} color={color} />
    default:
      return (
        <div className="p-4 bg-subtle rounded-2xl text-xs text-tertiary text-center">
          Unknown slide type: {slide.type}
        </div>
      )
  }
}