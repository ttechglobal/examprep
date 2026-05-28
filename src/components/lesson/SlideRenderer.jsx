'use client'

import { useState, useEffect, useCallback } from 'react'
import { StudentImageSlot, AdminImageSlot } from './ImageSlot'

// ─────────────────────────────────────────────────────────────────────────────
// SlideRenderer.jsx
// FIX 1  — real_life slide type removed (kept as graceful fallback only)
// FIX 3  — summary closing box: no gradient, clean solid + left border
// FIX 4  — math steps rendered as structured blocks, not prose
// FIX 5  — micro-questions removed from guided worked examples
// FIX 6  — guided worked example header has proper breathing room
// FIX 7  — end_quiz slide type added
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared: math step renderer ────────────────────────────────────────────────
// Detects if a step instruction looks like a math calculation and renders it
// as a structured block instead of prose.
function MathStep({ text, color }) {
  // Lines that start with "Step N:", "Answer:", or contain = ÷ × are math
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const isMath = lines.length > 1 || /[=÷×]/.test(text) || /^step\s+\d/i.test(text)

  if (!isMath) {
    return <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
  }

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isAnswer = /^answer:/i.test(line)
        const isLabel  = /^step\s+\d/i.test(line)
        return (
          <div key={i} className={`font-mono text-sm ${
            isAnswer
              ? `font-black ${color?.text ?? 'text-indigo-700'}`
              : isLabel
              ? 'text-xs font-black uppercase tracking-wide text-gray-400 font-sans'
              : 'text-gray-800'
          }`}>
            {line}
          </div>
        )
      })}
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
function HookSlide({ slide, color }) {
  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">💭</span>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-snug">
        {slide.body}
      </p>
      <div className={`h-0.5 w-12 rounded-full ${color?.accent ?? 'bg-indigo-500'} opacity-40`} />
    </div>
  )
}

// ── Definition ────────────────────────────────────────────────────────────────
function DefinitionSlide({ slide, color }) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden animate-in fade-in duration-300">
      <div className={`px-5 py-4 ${color?.accent ?? 'bg-indigo-600'}`}>
        <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-1">Definition</p>
        <p className="text-2xl font-black text-white leading-tight">{slide.term}</p>
      </div>
      <div className="bg-white px-5 py-4 space-y-4">
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>
          {slide.definition}
        </p>
        {(slide.examples ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">Examples in real life</p>
            {slide.examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{ex}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Concept ───────────────────────────────────────────────────────────────────
function ConceptSlide({ slide, color, isAdmin, slideIndex, subtopicId, onImageUpload, uploadMeta }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className={`text-xl font-black ${color?.text ?? 'text-gray-900'} leading-snug`}>
        {slide.heading}
      </h2>

      {(slide.image?.needed !== false) && (slide.image?.url || slide.image?.prompt || slide.image_url || slide.image_prompt) && (
        isAdmin ? (
          <AdminImageSlot
            image={slide.image}
            imageUrl={slide.image_url}
            imagePrompt={slide.image_prompt}
            subtopicId={subtopicId}
            slideIndex={slideIndex}
            {...uploadMeta}
            onUpload={(imgObj) => onImageUpload?.(slideIndex, imgObj)}
          />
        ) : (
          <StudentImageSlot image={slide.image ?? slide.image_url} />
        )
      )}

      <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">{slide.body}</p>

      {(slide.examples ?? []).length > 0 && (
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">For example</p>
          {slide.examples.map((ex, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-2xl ${color?.bg ?? 'bg-indigo-50'}`}>
              <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {i + 1}
              </span>
              <p className={`text-sm leading-relaxed ${color?.text ?? 'text-indigo-900'} font-medium`}>{ex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Formula ───────────────────────────────────────────────────────────────────
function FormulaSlide({ slide, color, isAdmin, slideIndex, subtopicId, onImageUpload, uploadMeta }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <span className="text-lg">📐</span>
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">{slide.label}</p>
      </div>

      <div className="bg-gray-900 rounded-2xl py-6 px-5 text-center">
        <p className="text-2xl font-black text-white font-mono tracking-wide leading-relaxed">
          {slide.formula}
        </p>
      </div>

      <div className={`rounded-xl ${color?.bg ?? 'bg-indigo-50'} px-4 py-3`}>
        <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-1">What this means</p>
        <p className={`text-sm font-medium ${color?.text ?? 'text-indigo-800'} leading-relaxed`}>
          {slide.plain_english}
        </p>
      </div>

      {(slide.variables ?? []).length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Where:</p>
          {slide.variables.map((v, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-sm font-black font-mono ${color?.text ?? 'text-indigo-700'} flex-shrink-0 w-8`}>
                {v.symbol}
              </span>
              <span className="text-sm text-gray-600 leading-snug">= {v.meaning}</span>
            </div>
          ))}
        </div>
      )}

      {(slide.image?.needed !== false) && (slide.image?.url || slide.image?.prompt || slide.image_url || slide.image_prompt) && (
        isAdmin ? (
          <AdminImageSlot
            image={slide.image}
            imageUrl={slide.image_url}
            imagePrompt={slide.image_prompt}
            subtopicId={subtopicId}
            slideIndex={slideIndex}
            {...uploadMeta}
            onUpload={(imgObj) => onImageUpload?.(slideIndex, imgObj)}
          />
        ) : (
          <StudentImageSlot image={slide.image ?? slide.image_url} />
        )
      )}
    </div>
  )
}

// ── Interaction ───────────────────────────────────────────────────────────────
export function InteractionSlide({ slide, color, interactive, onAnswered }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct = slide.correct?.trim()
  const isCorrect = selected === correct

  const options = (slide.options ?? []).map((opt) => {
    if (typeof opt === 'string') {
      const key = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  const handleSelect = (key) => {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
    onAnswered?.()
  }

  if (!interactive) {
    return (
      <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden animate-in fade-in duration-300">
        <div className={`px-4 py-3 ${color?.accent ?? 'bg-indigo-600'}`}>
          <p className="text-xs font-black text-white/80 uppercase tracking-wide mb-1">Quick Check ✏️</p>
          <p className="text-sm font-bold text-white leading-snug">{slide.question}</p>
        </div>
        <div className="bg-white p-4 space-y-2">
          {options.map((opt) => (
            <div key={opt.key} className={`px-3 py-2.5 rounded-xl border-2 text-sm ${
              opt.key === correct
                ? 'border-green-400 bg-green-50 text-green-800 font-bold'
                : 'border-gray-100 text-gray-600'
            }`}>
              <span className="font-black mr-2">{opt.key}.</span>{opt.text}
            </div>
          ))}
          <div className="bg-indigo-50 rounded-xl p-3 mt-2">
            <p className="text-xs font-bold text-indigo-700 mb-0.5">Correct feedback:</p>
            <p className="text-xs text-indigo-800">{slide.feedback_correct}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
        <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Quick Check ✏️</p>
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-900'} leading-snug`}>{slide.question}</p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          let style = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.99]'
          let icon = null
          if (revealed) {
            if (opt.key === correct) { style = 'border-green-400 bg-green-50 text-green-800'; icon = '✓' }
            else if (opt.key === selected) { style = 'border-red-300 bg-red-50 text-red-700'; icon = '✗' }
            else { style = 'border-gray-100 bg-gray-50 text-gray-400' }
          } else if (opt.key === selected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
          }
          return (
            <button key={opt.key} onClick={() => handleSelect(opt.key)} disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all text-sm font-medium ${style}`}>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  revealed && opt.key === correct ? 'border-green-400 bg-green-100 text-green-700'
                  : revealed && opt.key === selected ? 'border-red-300 bg-red-100 text-red-600'
                  : 'border-gray-300 text-gray-500'
                }`}>{icon ?? opt.key}</span>
                <span className="leading-snug">{opt.text}</span>
              </div>
            </button>
          )
        })}
      </div>

      {revealed && (
        <div className={`rounded-2xl p-4 space-y-1.5 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
          <p className={`font-black text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
            {isCorrect ? '🎉 Correct!' : "🤔 Not quite — but that's okay!"}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {isCorrect ? slide.feedback_correct : slide.feedback_wrong}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Worked Example — Guided ───────────────────────────────────────────────────
// FIX 5: micro-questions removed — pure step-by-step tap-through
// FIX 6: header has proper breathing room matching "Your Turn"
// FIX 4: steps rendered with MathStep (structured blocks for calculations)
export function GuidedExampleSlide({ slide, color, isAdmin }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [done, setDone] = useState(false)

  const steps = slide.steps ?? []
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (isLastStep) { setDone(true); return }
    setCurrentStep((i) => i + 1)
  }

  // Admin — show all steps at once
  if (isAdmin) {
    return (
      <div className="rounded-2xl border border-gray-200 overflow-hidden animate-in fade-in duration-300">
        <div className="px-5 py-4 bg-gray-800">
          <p className="text-xs font-black text-white/60 uppercase tracking-wide mb-1">Worked Example · Guided</p>
          <p className="text-sm font-bold text-white leading-relaxed">{slide.problem}</p>
        </div>
        <div className="bg-white p-4 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}>
                {i + 1}
              </span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}
          <div className={`${color?.bg ?? 'bg-indigo-50'} rounded-xl px-4 py-3`}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Answer</p>
            <p className={`text-base font-black font-mono ${color?.text ?? 'text-indigo-700'}`}>{slide.final_answer}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header — FIX 6: matches "Your Turn" spacing */}
      <div className="flex items-center gap-2">
        <span className="text-lg">✏️</span>
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Worked Example</p>
      </div>

      {/* Problem — same dark card as "Your Turn" */}
      <div className="bg-gray-900 rounded-2xl px-5 py-5">
        <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">Problem</p>
        <p className="text-base font-bold text-white leading-relaxed">{slide.problem}</p>
      </div>

      {/* Steps — reveal one at a time, no micro-questions */}
      {!done && step && (
        <div className="space-y-4">
          {/* Completed steps */}
          {currentStep > 0 && (
            <div className="space-y-2">
              {steps.slice(0, currentStep).map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {i + 1}
                  </span>
                  <MathStep text={s.instruction} color={color} />
                </div>
              ))}
            </div>
          )}

          {/* Current step — highlighted */}
          <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${color?.border ?? 'border-indigo-200'} ${color?.bg ?? 'bg-indigo-50'}`}>
            <span className={`w-7 h-7 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {currentStep + 1}
            </span>
            <div className="flex-1">
              <MathStep text={step.instruction} color={color} />
            </div>
          </div>

          <button onClick={handleNext}
            className={`w-full py-4 ${color?.accent ?? 'bg-indigo-600'} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}>
            {isLastStep ? 'See answer →' : `Next step (${currentStep + 1}/${steps.length}) →`}
          </button>
        </div>
      )}

      {/* All steps done */}
      {done && (
        <div className="space-y-3">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {i + 1}
                </span>
                <MathStep text={s.instruction} color={color} />
              </div>
            ))}
          </div>
          <div className={`${color?.bg ?? 'bg-indigo-50'} border ${color?.border ?? 'border-indigo-200'} rounded-2xl px-5 py-4`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Final Answer</p>
            <p className={`text-xl font-black font-mono ${color?.text ?? 'text-indigo-700'}`}>{slide.final_answer}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Worked Example — Student Attempt ─────────────────────────────────────────
export function StudentAttemptSlide({ slide, color, onReady }) {
  const delay = slide.reveal_delay_seconds ?? 8
  const [secondsLeft, setSecondsLeft] = useState(delay)
  const [canReveal, setCanReveal] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) { setCanReveal(true); return }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const handleReveal = () => { setRevealed(true); onReady?.() }
  const steps = slide.steps ?? []

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <span className="text-lg">🧠</span>
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Your Turn</p>
      </div>

      <div className="bg-gray-900 rounded-2xl px-5 py-5">
        <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">Problem</p>
        <p className="text-base font-bold text-white leading-relaxed">{slide.problem}</p>
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
              <p className="text-xs text-gray-400 font-medium">Give it a try first…</p>
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
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">Solution</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {i + 1}
              </span>
              <MathStep text={s.instruction} color={color} />
            </div>
          ))}
          <div className={`${color?.bg ?? 'bg-indigo-50'} border ${color?.border ?? 'border-indigo-200'} rounded-2xl px-5 py-4`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Final Answer</p>
            <p className={`text-xl font-black font-mono ${color?.text ?? 'text-indigo-700'}`}>{slide.final_answer}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── End Quiz (FIX 7) ──────────────────────────────────────────────────────────
// Multi-question quiz slide — all questions must be answered before Next unlocks
export function EndQuizSlide({ slide, color, interactive, onAllAnswered }) {
  const questions = slide.questions ?? []
  const [answers, setAnswers] = useState({})    // { index: selectedKey }
  const [revealed, setRevealed] = useState({})  // { index: true }

  const allAnswered = questions.length > 0 && questions.every((_, i) => revealed[i])

  useEffect(() => {
    if (allAnswered) onAllAnswered?.()
  }, [allAnswered])

  const handleSelect = (qIndex, key) => {
    if (revealed[qIndex] || !interactive) return
    setAnswers(prev => ({ ...prev, [qIndex]: key }))
    setRevealed(prev => ({ ...prev, [qIndex]: true }))
  }

  const getOptions = (q) => (q.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  if (!interactive) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">End of Lesson Quiz</p>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className={`px-4 py-3 ${color?.accent ?? 'bg-indigo-600'}`}>
              <p className="text-xs font-black text-white/70 uppercase mb-0.5">Question {qi + 1}</p>
              <p className="text-sm font-bold text-white leading-snug">{q.question}</p>
            </div>
            <div className="bg-white p-3 space-y-1.5">
              {getOptions(q).map(opt => (
                <div key={opt.key} className={`px-3 py-2 rounded-xl border text-xs ${opt.key === q.correct ? 'border-green-400 bg-green-50 text-green-800 font-bold' : 'border-gray-100 text-gray-500'}`}>
                  <span className="font-black mr-1">{opt.key}.</span>{opt.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">End of Lesson Quiz</p>
      </div>
      <p className="text-sm text-gray-500">Answer all questions to complete this lesson.</p>

      {questions.map((q, qi) => {
        const opts = getOptions(q)
        const selected = answers[qi]
        const isRevealed = !!revealed[qi]
        const isCorrect = selected === q.correct

        return (
          <div key={qi} className="space-y-3">
            {/* Question */}
            <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Question {qi + 1}</p>
              <p className={`text-base font-bold ${color?.text ?? 'text-indigo-900'} leading-snug`}>{q.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {opts.map(opt => {
                let style = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40'
                let icon = null
                if (isRevealed) {
                  if (opt.key === q.correct) { style = 'border-green-400 bg-green-50 text-green-800'; icon = '✓' }
                  else if (opt.key === selected) { style = 'border-red-300 bg-red-50 text-red-700'; icon = '✗' }
                  else { style = 'border-gray-100 bg-gray-50 text-gray-400' }
                }
                return (
                  <button key={opt.key} onClick={() => handleSelect(qi, opt.key)} disabled={isRevealed}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all text-sm font-medium ${style}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        isRevealed && opt.key === q.correct ? 'border-green-400 bg-green-100 text-green-700'
                        : isRevealed && opt.key === selected ? 'border-red-300 bg-red-100 text-red-600'
                        : 'border-gray-300 text-gray-500'
                      }`}>{icon ?? opt.key}</span>
                      <span className="leading-snug">{opt.text}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Feedback */}
            {isRevealed && (
              <div className={`rounded-2xl p-4 space-y-1 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`font-black text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
                  {isCorrect ? '🎉 Correct!' : "🤔 Not quite — but that's okay!"}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {isCorrect ? q.feedback_correct : q.feedback_wrong}
                </p>
              </div>
            )}

            {/* Divider between questions */}
            {qi < questions.length - 1 && <div className="border-t border-gray-100" />}
          </div>
        )
      })}

      {/* Progress indicator */}
      {!allAnswered && (
        <p className="text-center text-xs text-gray-400">
          {Object.keys(revealed).length} of {questions.length} answered
        </p>
      )}
    </div>
  )
}

// ── Summary (FIX 3) ───────────────────────────────────────────────────────────
// No gradient — clean solid bg + left border accent
function SummarySlide({ slide, color }) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="text-center">
        <span className="text-4xl">📋</span>
        <h2 className="text-xl font-black text-gray-900 mt-2">What you learned</h2>
      </div>

      <div className="space-y-3">
        {(slide.points ?? []).map((point, i) => (
          <div key={i} className={`flex items-start gap-3 p-3.5 rounded-2xl ${color?.bg ?? 'bg-indigo-50'}`}>
            <div className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <span className="text-white text-xs font-black">{i + 1}</span>
            </div>
            <p className={`text-sm leading-relaxed ${color?.text ?? 'text-indigo-800'} font-medium`}>{point}</p>
          </div>
        ))}
      </div>

      {/* FIX 3: no gradient — solid bg + left accent border */}
      {slide.closing && (
        <div className={`rounded-2xl border-l-4 ${color?.border?.replace('border', 'border-l') ?? 'border-l-indigo-500'} ${color?.bg ?? 'bg-indigo-50'} px-5 py-4`}>
          <p className={`text-sm font-bold ${color?.text ?? 'text-indigo-800'} leading-relaxed`}>
            {slide.closing}
          </p>
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
  onAnswered,
  onAttemptReady,
  onQuizComplete,
}) {
  const uploadMeta = { examTag, subjectName, topicName, subtopicName }

  switch (slide.type) {
    case 'hook':
      return <HookSlide slide={slide} color={color} />

    case 'definition':
      return <DefinitionSlide slide={slide} color={color} />

    // FIX 1: real_life removed from generation but graceful fallback kept
    case 'real_life':
      return (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className={`rounded-2xl ${color?.bg ?? 'bg-indigo-50'} px-5 py-5`}>
            <p className={`text-base leading-relaxed ${color?.text ?? 'text-indigo-900'} font-medium`}>{slide.body}</p>
          </div>
        </div>
      )

    case 'concept':
      return <ConceptSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex} subtopicId={subtopicId} uploadMeta={uploadMeta} onImageUpload={onImageUpload} />

    case 'formula':
      return <FormulaSlide slide={slide} color={color} isAdmin={isAdmin} slideIndex={slideIndex} subtopicId={subtopicId} uploadMeta={uploadMeta} onImageUpload={onImageUpload} />

    case 'interaction':
      return <InteractionSlide slide={slide} color={color} interactive={interactive} onAnswered={onAnswered} />

    case 'worked_example':
      if (slide.mode === 'student_attempt') {
        return <StudentAttemptSlide slide={slide} color={color} onReady={onAttemptReady} />
      }
      return <GuidedExampleSlide slide={slide} color={color} isAdmin={isAdmin} />

    case 'end_quiz':
      return <EndQuizSlide slide={slide} color={color} interactive={interactive} onAllAnswered={onQuizComplete} />

    case 'summary':
      return <SummarySlide slide={slide} color={color} />

    default:
      return (
        <div className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-400 text-center">
          Unknown slide type: {slide.type}
        </div>
      )
  }
}