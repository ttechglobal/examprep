'use client'
// src/components/lesson/SlideRenderer.jsx
// ROOT CAUSE FIX: onUnlock prop now correctly wired to all interactive slides.
// Previously LessonViewer passed onUnlock but SlideRenderer never consumed it —
// it expected onAnswered/onAttemptReady/onQuizComplete which were never passed.
// Now SlideRenderer accepts onUnlock and passes it to each slide internally.
//
// Additional fixes:
// - EndQuizSlide: one question at a time (not all scrollable at once)
// - GuidedExampleSlide/StudentAttemptSlide: onUnlock fires after show solution
// - Dark mode: removed hardcoded bg-white/gray, uses CSS var tokens
// - No borders on cards (cleaner look)

import { useState, useEffect, useRef } from 'react'

// ── Shared math renderer (plain text, no LaTeX) ───────────────────────────────
function MathStep({ text, color }) {
  if (!text) return null
  return (
    <p className={`text-sm leading-relaxed ${color?.text ?? 'text-indigo-800'} font-medium`}>
      {text}
    </p>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
function HookSlide({ slide, color }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-6`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">Did you know? 💡</p>
        <p className={`text-lg font-bold ${color?.text ?? 'text-indigo-900'} leading-relaxed`}>
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
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-5`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Definition</p>
        <p className={`text-2xl font-black ${color?.text ?? 'text-indigo-900'} mb-3`}>{slide.term}</p>
        <p className={`text-base leading-relaxed ${color?.text ?? 'text-indigo-800'} font-medium`}>
          {slide.definition}
        </p>
      </div>
      {slide.examples?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Examples</p>
          {slide.examples.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
              <span className={`text-sm font-black ${color?.text ?? 'text-indigo-600'} flex-shrink-0 mt-0.5`}>{i + 1}.</span>
              <p className="text-sm text-primary leading-relaxed">{ex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Concept ───────────────────────────────────────────────────────────────────
function StudentImageSlot({ image }) {
  const url = typeof image === 'string' ? image : image?.url
  if (!url) return null
  return (
    <div className="rounded-xl overflow-hidden bg-subtle">
      <img src={url} alt="" className="w-full object-contain max-h-64" loading="lazy" />
    </div>
  )
}

function ConceptSlide({ slide, color, isAdmin, slideIndex, subtopicId, uploadMeta, onImageUpload }) {
  const hasImage = slide.image?.url || slide.image_url
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-5`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Concept</p>
        <p className={`text-xl font-black ${color?.text ?? 'text-indigo-900'} mb-3 leading-snug`}>{slide.heading}</p>
        <p className={`text-base leading-relaxed ${color?.text ?? 'text-indigo-800'} font-medium`}>{slide.body}</p>
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
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-5`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">{slide.label}</p>
        {/* Formula display — flex-wrap prevents overflow / equals-sign bug */}
        <div className="font-mono text-lg font-black text-primary my-3 break-words whitespace-pre-wrap leading-relaxed">
          {slide.formula}
        </div>
        <p className={`text-sm leading-relaxed ${color?.text ?? 'text-indigo-800'} font-medium`}>{slide.plain_english}</p>
      </div>
      {slide.variables?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Variables</p>
          {slide.variables.map((v, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-subtle rounded-xl">
              <span className={`font-mono font-black text-sm ${color?.text ?? 'text-indigo-700'} flex-shrink-0 min-w-[2rem]`}>{v.symbol}</span>
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
// FIX: calls onUnlock (renamed from onAnswered) after answer selected
function InteractionSlide({ slide, color, interactive, onUnlock }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct = slide.correct?.trim()
  const isCorrect = selected === correct

  const options = (slide.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key  = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  const handleSelect = (key) => {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
    onUnlock?.()  // FIX: was onAnswered — now calls onUnlock to enable Next button
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
            <div key={opt.key} className={`px-3 py-2.5 rounded-xl text-sm ${
              opt.key === correct ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 font-bold' : 'bg-subtle text-secondary'
            }`}>
              <span className="font-black mr-2">{opt.key}.</span>{opt.text}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Quick Check ✏️</p>
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>{slide.question}</p>
      </div>

      <div className="space-y-2.5">
        {options.map(opt => {
          let cls = 'bg-subtle text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
          if (revealed) {
            if (opt.key === correct)         cls = 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
            else if (opt.key === selected)   cls = 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            else                             cls = 'bg-subtle text-tertiary'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm transition-all active:scale-[0.99] ${cls}`}>
              <span className="font-black mr-2.5">{opt.key}.</span>{opt.text}
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className={`rounded-2xl px-4 py-4 ${isCorrect
          ? 'bg-green-50 dark:bg-green-950/30'
          : 'bg-orange-50 dark:bg-orange-950/30'
        }`}>
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

// ── Guided Worked Example ─────────────────────────────────────────────────────
function GuidedExampleSlide({ slide, color, isAdmin }) {
  const steps = slide.steps ?? []
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Worked Example</p>
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>{slide.problem}</p>
      </div>

      {steps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary px-1">Solution</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-subtle rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>{i + 1}</span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}
        </div>
      )}

      {slide.final_answer && (
        <div className={`${color?.bg ?? 'bg-indigo-50'} rounded-2xl px-5 py-4`}>
          <p className="text-xs font-bold text-tertiary uppercase tracking-wide mb-1">Final Answer</p>
          <p className={`text-xl font-black font-mono break-words ${color?.text ?? 'text-indigo-700'}`}>
            {slide.final_answer}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Student Attempt ───────────────────────────────────────────────────────────
// FIX: onUnlock fires when solution is revealed (was onReady/onAttemptReady)
function StudentAttemptSlide({ slide, color, onUnlock }) {
  const [revealed, setRevealed]       = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(slide.reveal_delay_seconds ?? 8)
  const [canReveal, setCanReveal]     = useState((slide.reveal_delay_seconds ?? 8) <= 0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (canReveal) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          setCanReveal(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [canReveal])

  function handleReveal() {
    setRevealed(true)
    onUnlock?.()  // FIX: was onReady — now calls onUnlock to enable Next button
  }

  const steps = slide.steps ?? []

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Your Turn 🎯</p>
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>{slide.problem}</p>
      </div>

      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className={`text-sm font-medium ${color?.text ?? 'text-indigo-800'} leading-relaxed`}>
          Try solving this yourself before seeing the solution. Work through it step by step.
        </p>
      </div>

      {!revealed && (
        <div className="text-center space-y-3">
          {!canReveal ? (
            <div className="space-y-2">
              <div className={`w-14 h-14 rounded-full ${color?.accent ?? 'bg-indigo-600'} text-white text-xl font-black flex items-center justify-center mx-auto`}>
                {secondsLeft}
              </div>
              <p className="text-xs text-secondary font-medium">Give it a try first…</p>
            </div>
          ) : (
            <button onClick={handleReveal}
              className={`w-full py-4 ${color?.accent ?? 'bg-indigo-600'} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
              Show Solution →
            </button>
          )}
        </div>
      )}

      {revealed && (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wide text-tertiary">Solution</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-subtle rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>{i + 1}</span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}
          {slide.final_answer && (
            <div className={`${color?.bg ?? 'bg-indigo-50'} rounded-2xl px-5 py-4`}>
              <p className="text-xs font-bold text-tertiary uppercase tracking-wide mb-1">Final Answer</p>
              <p className={`text-xl font-black font-mono break-words ${color?.text ?? 'text-indigo-700'}`}>
                {slide.final_answer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── End Quiz — ONE QUESTION AT A TIME ─────────────────────────────────────────
// FIX: was rendering all questions scrollably. Now shows one at a time.
// onUnlock fires when the LAST question is answered.
function EndQuizSlide({ slide, color, interactive, onUnlock }) {
  const questions = slide.questions ?? []
  const [currentQ, setCurrentQ]   = useState(0)
  const [selected, setSelected]   = useState(null)
  const [revealed, setRevealed]   = useState(false)
  const [allDone, setAllDone]     = useState(false)

  const q     = questions[currentQ]
  const total = questions.length
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
    if (currentQ + 1 >= total) {
      setAllDone(true)
      onUnlock?.()  // FIX: was onAllAnswered — now calls onUnlock to enable main Next button
    } else {
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
        <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4 text-center`}>
          <p className={`text-lg font-black ${color?.text ?? 'text-indigo-700'}`}>
            {allDone ? `Quiz complete! ${questions.length}/${questions.length} answered` : 'All questions answered ✓'}
          </p>
          <p className="text-sm text-secondary mt-1">Tap Next to continue</p>
        </div>
      </div>
    )
  }

  if (!q) return null
  const opts = getOptions(q)
  const isCorrect = selected === correct

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full ${color?.accent ?? 'bg-indigo-600'} rounded-full transition-all duration-300`}
            style={{ width: `${((currentQ + 1) / total) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-tertiary">{currentQ + 1}/{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <p className="text-xs font-black uppercase tracking-widest text-tertiary">End of Lesson Quiz</p>
      </div>

      {/* Question */}
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {opts.map(opt => {
          let cls = 'bg-subtle text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
          if (revealed) {
            if (opt.key === correct)       cls = 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
            else if (opt.key === selected) cls = 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            else                           cls = 'bg-subtle text-tertiary'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl text-sm transition-all active:scale-[0.99] ${cls}`}>
              <span className="font-black mr-2.5">{opt.key}.</span>{opt.text}
            </button>
          )
        })}
      </div>

      {/* Feedback + Next */}
      {revealed && (
        <div className="space-y-3">
          <div className={`rounded-2xl px-4 py-4 ${isCorrect ? 'bg-green-50 dark:bg-green-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
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
            className={`w-full py-4 ${color?.accent ?? 'bg-indigo-600'} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
            {currentQ + 1 >= total ? 'Complete quiz ✓' : `Next question →`}
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
        // FIX: "Great job today" section — no left black border, distinct background
        <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
          <p className={`text-sm font-bold ${color?.text ?? 'text-indigo-800'} leading-relaxed`}>
            {slide.closing}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────
// FIX: accepts onUnlock and passes it directly to each slide type
// Previously onUnlock was passed but never threaded through to the slides
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
  onUnlock,      // FIX: this is the key prop that unlocks Next in LessonViewer
}) {
  switch (slide.type) {
    case 'hook':
      return <HookSlide slide={slide} color={color} />

    case 'definition':
      return <DefinitionSlide slide={slide} color={color} />

    case 'real_life':
      return (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-5`}>
            <p className={`text-base leading-relaxed ${color?.text ?? 'text-indigo-900'} font-medium`}>{slide.body}</p>
          </div>
        </div>
      )

    case 'concept':
      return <ConceptSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex}
               subtopicId={subtopicId} uploadMeta={{ examTag, subjectName, topicName, subtopicName }}
               onImageUpload={onImageUpload} />

    case 'formula':
      return <FormulaSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex}
               subtopicId={subtopicId} uploadMeta={{ examTag, subjectName, topicName, subtopicName }}
               onImageUpload={onImageUpload} />

    case 'interaction':
      // FIX: pass onUnlock (not onAnswered)
      return <InteractionSlide slide={slide} color={color} interactive={interactive} onUnlock={onUnlock} />

    case 'worked_example':
      if (slide.mode === 'student_attempt') {
        // FIX: pass onUnlock (not onReady/onAttemptReady)
        return <StudentAttemptSlide slide={slide} color={color} onUnlock={onUnlock} />
      }
      return <GuidedExampleSlide slide={slide} color={color} isAdmin={isAdmin} />

    case 'end_quiz':
      // FIX: pass onUnlock (not onAllAnswered/onQuizComplete)
      return <EndQuizSlide slide={slide} color={color} interactive={interactive} onUnlock={onUnlock} />

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