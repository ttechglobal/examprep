'use client'

import { useState, useEffect, useRef } from 'react'
import { StudentImageSlot } from './ImageSlot'
import { AdminImageSlot } from './ImageSlot'

// ── Hook ──────────────────────────────────────────────────────
function HookSection({ section, color }) {
  return (
    <div className={`${color?.bg ?? 'bg-amber-50'} border-l-4 ${color?.border ? color.border.replace('border', 'border-l') : 'border-l-amber-400'} rounded-r-2xl px-5 py-4`}>
      <p className="text-sm font-bold text-gray-900 leading-relaxed">
        {section.body}
      </p>
    </div>
  )
}

// ── Definition ────────────────────────────────────────────────
function DefinitionSection({ section, color }) {
  return (
    <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden">
      <div className={`px-5 py-3 ${color?.bg ?? 'bg-indigo-600'}`}>
        <p className="text-xs font-black uppercase tracking-widest text-white/80">
          Definition
        </p>
        <p className={`text-xl font-black text-white mt-0.5`}>
          {section.term}
        </p>
      </div>
      <div className="px-5 py-4 bg-white space-y-3">
        <p className={`text-base font-bold ${color?.text ?? 'text-indigo-800'} leading-snug`}>
          {section.definition}
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          {section.explanation}
        </p>
        {section.example && (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              Example
            </p>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              {section.example}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Explanation ───────────────────────────────────────────────
function ExplanationSection({ section, color, isAdmin, sectionIndex, subtopicId, onImageUpload }) {
  return (
    <div className="space-y-3">
      <h3 className={`text-base font-black ${color?.text ?? 'text-gray-900'} leading-snug`}>
        {section.heading}
      </h3>

      {/* Image slot */}
      {isAdmin ? (
        <AdminImageSlot
          imageUrl={section.image_url}
          imagePrompt={section.image_prompt}
          subtopicId={subtopicId}
          sectionIndex={sectionIndex}
          onUpload={(url) => onImageUpload?.(sectionIndex, url)}
        />
      ) : (
        <StudentImageSlot imageUrl={section.image_url} />
      )}

      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {section.body}
      </p>
    </div>
  )
}

// ── Formula ───────────────────────────────────────────────────
function FormulaSection({ section, color }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 overflow-hidden">
      <div className={`px-4 py-2.5 ${color?.bg ?? 'bg-indigo-50'}`}>
        <p className={`text-xs font-black uppercase tracking-wide ${color?.text ?? 'text-indigo-700'}`}>
          {section.label}
        </p>
      </div>
      <div className="bg-white px-5 py-5 space-y-4">
        <div className="bg-gray-900 rounded-xl py-5 px-4 text-center">
          <p className="text-2xl font-black text-white font-mono tracking-wide">
            {section.formula}
          </p>
        </div>
        {(section.variables ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Where:
            </p>
            {section.variables.map((v, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-sm font-black font-mono ${color?.text ?? 'text-indigo-700'} flex-shrink-0 w-8`}>
                  {v.symbol}
                </span>
                <span className="text-sm text-gray-600 leading-snug">
                  = {v.meaning}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quick Check ───────────────────────────────────────────────
function QuickCheckSection({ section, color, interactive }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correctKey = section.correct?.split('.')[0]?.trim() ?? section.correct
  const isCorrect = selected === correctKey || selected === section.correct

  if (!interactive) {
    return (
      <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden">
        <div className={`px-4 py-3 ${color?.bg ?? 'bg-indigo-600'}`}>
          <p className="text-xs font-black text-white/80 uppercase tracking-wide">
            Quick Check ✏️
          </p>
          <p className="text-sm font-semibold text-white mt-1 leading-snug">
            {section.question}
          </p>
        </div>
        <div className="bg-white p-4 space-y-2">
          {(section.options ?? []).map((opt, i) => (
            <div key={i} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
              {opt}
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">
            Answer: <span className="font-bold text-green-600">{section.correct}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden">
      <div className={`px-4 py-3 ${color?.bg ?? 'bg-indigo-600'}`}>
        <p className="text-xs font-black text-white/80 uppercase tracking-wide mb-1">
          Quick Check ✏️
        </p>
        <p className="text-sm font-semibold text-white leading-snug">
          {section.question}
        </p>
      </div>
      <div className="bg-white p-4 space-y-2">
        {(section.options ?? []).map((opt, i) => {
          const optKey = opt.split('.')[0]?.trim()
          const isThisCorrect = optKey === correctKey || opt === section.correct
          const isThisSelected = optKey === selected || opt === selected

          let style = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          if (revealed) {
            if (isThisCorrect) style = 'border-green-400 bg-green-50 text-green-800'
            else if (isThisSelected) style = 'border-red-300 bg-red-50 text-red-700'
            else style = 'border-gray-100 bg-gray-50 text-gray-400'
          } else if (isThisSelected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
          }

          return (
            <button
              key={i}
              onClick={() => { if (!revealed) { setSelected(optKey); setRevealed(true) } }}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${style} ${!revealed ? 'active:scale-[0.99]' : ''}`}
            >
              {opt}
            </button>
          )
        })}

        {revealed && (
          <div className={`rounded-xl p-3 mt-2 text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className={`font-black mb-1 ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
              {isCorrect ? '🎉 Correct! Well done.' : '🤔 Not quite — but that\'s okay!'}
            </p>
            <p className="text-gray-700 leading-relaxed">{section.explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Worked Example — Guided ───────────────────────────────────
function GuidedExample({ section, color, isAdmin }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [microAnswer, setMicroAnswer] = useState('')
  const [microRevealed, setMicroRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const steps = section.steps ?? []
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (isLastStep) { setDone(true); return }
    setCurrentStep(i => i + 1)
    setMicroAnswer('')
    setMicroRevealed(false)
  }

  if (isAdmin) {
    return (
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-800">
          <p className="text-xs font-black text-white uppercase tracking-wide">
            Worked Example · Guided · {section.problem}
          </p>
        </div>
        <div className="bg-white p-4 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className={`w-6 h-6 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}>
                {i + 1}
              </span>
              <div>
                <p className="text-sm text-gray-700">{s.instruction}</p>
                {s.micro_question && (
                  <p className="text-xs text-amber-600 mt-1 italic">
                    Micro-check: {s.micro_question} → {s.micro_answer}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div className={`${color?.bg ?? 'bg-indigo-50'} rounded-xl px-4 py-3`}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Answer</p>
            <p className={`text-base font-black ${color?.text ?? 'text-indigo-700'}`}>
              {section.final_answer}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-800">
        <p className="text-xs font-black text-white uppercase tracking-wide">
          Worked Example
        </p>
      </div>

      <div className="bg-white p-4 space-y-4">
        {/* Problem */}
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Problem</p>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{section.problem}</p>
        </div>

        {/* Image slot */}
        {section.image_url && <StudentImageSlot imageUrl={section.image_url} />}

        {/* Step progress */}
        {!done && (
          <div className="flex items-center gap-1 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < currentStep ? (color?.accent ?? 'bg-indigo-500') :
                  i === currentStep ? (color?.accent ?? 'bg-indigo-500') + ' opacity-50' :
                  'bg-gray-100'
                }`}
              />
            ))}
          </div>
        )}

        {/* Current step */}
        {!done && step && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className={`w-7 h-7 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {currentStep + 1}
              </span>
              <p className="text-sm text-gray-700 leading-relaxed flex-1">
                {step.instruction}
              </p>
            </div>

            {/* Micro question */}
            {step.micro_question && !microRevealed && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-amber-700 mb-2">Quick micro-check:</p>
                <p className="text-sm text-amber-900 font-medium mb-3">{step.micro_question}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={microAnswer}
                    onChange={e => setMicroAnswer(e.target.value)}
                    placeholder="Your answer..."
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={() => setMicroRevealed(true)}
                    className="px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Check
                  </button>
                </div>
              </div>
            )}

            {step.micro_question && microRevealed && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-green-700 mb-1">Answer: {step.micro_answer}</p>
              </div>
            )}

            {/* Next step button — only show if no micro_question or micro is revealed */}
            {(!step.micro_question || microRevealed) && (
              <button
                onClick={handleNext}
                className={`w-full py-3 ${color?.accent ?? 'bg-indigo-500'} text-white text-sm font-black rounded-xl hover:opacity-90 transition-opacity`}
              >
                {isLastStep ? 'See answer →' : `Next step (${currentStep + 1}/${steps.length}) →`}
              </button>
            )}
          </div>
        )}

        {/* Done — show final answer */}
        {done && (
          <div className="space-y-3">
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {i + 1}
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">{s.instruction}</p>
                </div>
              ))}
            </div>
            <div className={`${color?.bg ?? 'bg-indigo-50'} border ${color?.border ?? 'border-indigo-200'} rounded-xl px-4 py-3`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Final Answer</p>
              <p className={`text-base font-black ${color?.text ?? 'text-indigo-700'}`}>
                {section.final_answer}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Worked Example — Student Attempt ─────────────────────────
function StudentAttemptExample({ section, color }) {
  const delay = section.reveal_delay_seconds ?? 8
  const [secondsLeft, setSecondsLeft] = useState(delay)
  const [canReveal, setCanReveal] = useState(delay === 0)
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (delay <= 0) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setCanReveal(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [delay])

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-800">
        <p className="text-xs font-black text-white uppercase tracking-wide">
          Your Turn — Try This One
        </p>
      </div>

      <div className="bg-white p-4 space-y-4">
        {/* Problem */}
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Problem</p>
          <p className="text-sm text-gray-800 leading-relaxed font-medium">{section.problem}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-amber-800">
            Attempt this yourself before looking at the solution 💪
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Work it out on paper or in your head first.
          </p>
        </div>

        {/* Reveal button with countdown */}
        {!revealed && (
          <div className="text-center">
            {canReveal ? (
              <button
                onClick={() => setRevealed(true)}
                className={`w-full py-3 ${color?.accent ?? 'bg-indigo-500'} text-white text-sm font-black rounded-xl hover:opacity-90 transition-opacity`}
              >
                Show Solution →
              </button>
            ) : (
              <div className="w-full py-3 bg-gray-100 rounded-xl flex items-center justify-center gap-2">
                <div className="w-5 h-5 relative">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle
                      cx="10" cy="10" r="8"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <circle
                      cx="10" cy="10" r="8"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 8}`}
                      strokeDashoffset={`${2 * Math.PI * 8 * (secondsLeft / delay)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  Show Solution in {secondsLeft}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Solution */}
        {revealed && section.steps?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Solution</p>
            {section.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{s.instruction}</p>
              </div>
            ))}
            <div className={`${color?.bg ?? 'bg-indigo-50'} border ${color?.border ?? 'border-indigo-200'} rounded-xl px-4 py-3`}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Answer</p>
              <p className={`text-base font-black ${color?.text ?? 'text-indigo-700'}`}>
                {section.final_answer}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Summary ───────────────────────────────────────────────────
function SummarySection({ section, color }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">📋</span>
        <h3 className="text-base font-black text-gray-900">What you learned</h3>
      </div>
      <div className="space-y-2">
        {(section.points ?? []).map((point, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${color?.bg ?? 'bg-indigo-50'}`}>
            <span className={`w-5 h-5 rounded-full ${color?.accent ?? 'bg-indigo-500'} text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {i + 1}
            </span>
            <p className={`text-sm leading-relaxed font-medium ${color?.text ?? 'text-indigo-800'}`}>
              {point}
            </p>
          </div>
        ))}
      </div>
      {section.closing_encouragement && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl px-5 py-4 text-white text-center">
          <p className="text-sm font-bold leading-relaxed">
            {section.closing_encouragement}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────
export default function SectionRenderer({
  section,
  index,
  color,
  interactive = true,
  isAdmin = false,
  subtopicId,
  onImageUpload,
}) {
  switch (section.type) {
    case 'hook':
      return <HookSection section={section} color={color} />
    case 'definition':
      return <DefinitionSection section={section} color={color} />
    case 'explanation':
      return (
        <ExplanationSection
          section={section}
          color={color}
          isAdmin={isAdmin}
          sectionIndex={index}
          subtopicId={subtopicId}
          onImageUpload={onImageUpload}
        />
      )
    case 'formula':
      return <FormulaSection section={section} color={color} />
    case 'quick_check':
      return <QuickCheckSection section={section} color={color} interactive={interactive} />
    case 'worked_example':
      if (section.mode === 'student_attempt') {
        return <StudentAttemptExample section={section} color={color} />
      }
      return <GuidedExample section={section} color={color} isAdmin={isAdmin} />
    case 'summary':
      return <SummarySection section={section} color={color} />
    default:
      return (
        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400">
          Unknown section type: {section.type}
        </div>
      )
  }
}