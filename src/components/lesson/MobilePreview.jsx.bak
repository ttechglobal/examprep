'use client'

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// MobilePreview.jsx
// Lightweight phone-frame slide preview used in the admin lesson uploader.
// Updated for the slide-based schema (lesson.slides instead of lesson.sections).
// ─────────────────────────────────────────────────────────────────────────────

// ── Minimal per-type preview renderers (no interaction, just display) ─────────

function HookPreview({ slide }) {
  return (
    <div className="p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5">
        Think about this
      </p>
      <p className="text-xs font-bold text-gray-900 leading-relaxed">{slide.body}</p>
    </div>
  )
}

function DefinitionPreview({ slide }) {
  return (
    <div className="overflow-hidden rounded-xl mx-3 my-2 border border-indigo-200">
      <div className="bg-indigo-600 px-3 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-0.5">
          Definition
        </p>
        <p className="text-sm font-black text-white">{slide.term}</p>
      </div>
      <div className="bg-white px-3 py-2.5 space-y-2">
        <p className="text-xs font-bold text-indigo-800 leading-snug">{slide.definition}</p>
        {(slide.examples ?? []).slice(0, 2).map((ex, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[10px] text-gray-600 leading-relaxed">{ex}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RealLifePreview({ slide }) {
  return (
    <div className="p-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
        🌍 Where you see this
      </p>
      <div className="bg-indigo-50 rounded-xl px-3 py-3">
        <p className="text-xs font-medium text-indigo-900 leading-relaxed">{slide.body}</p>
      </div>
    </div>
  )
}

function ConceptPreview({ slide }) {
  return (
    <div className="p-4 space-y-2">
      <p className="text-sm font-black text-gray-900 leading-snug">{slide.heading}</p>
      {slide.image_prompt && (
        <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-[8px] text-gray-400 italic px-3 text-center line-clamp-2">
            {slide.image_prompt}
          </p>
        </div>
      )}
      <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{slide.body}</p>
    </div>
  )
}

function FormulaPreview({ slide }) {
  return (
    <div className="p-4 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
        📐 {slide.label}
      </p>
      <div className="bg-gray-900 rounded-xl py-4 text-center">
        <p className="text-sm font-black text-white font-mono">{slide.formula}</p>
      </div>
      {slide.plain_english && (
        <p className="text-xs text-indigo-700 font-medium leading-relaxed">{slide.plain_english}</p>
      )}
      {(slide.variables ?? []).slice(0, 3).map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-[10px] font-black font-mono text-indigo-600 w-5">{v.symbol}</span>
          <span className="text-[10px] text-gray-500">= {v.meaning}</span>
        </div>
      ))}
    </div>
  )
}

function InteractionPreview({ slide }) {
  const options = (slide.options ?? []).map((opt) => {
    if (typeof opt === 'string') {
      return { key: opt.split('.')[0]?.trim(), text: opt.split('.').slice(1).join('.').trim() || opt }
    }
    return opt
  })
  return (
    <div className="p-4 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
        ✏️ Quick Check
      </p>
      <p className="text-xs font-bold text-gray-900 leading-snug">{slide.question}</p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <div
            key={opt.key}
            className={`px-2.5 py-2 rounded-lg border text-[10px] ${
              opt.key === slide.correct
                ? 'border-green-400 bg-green-50 text-green-800 font-bold'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <span className="font-black mr-1">{opt.key}.</span>
            {opt.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkedExamplePreview({ slide }) {
  const steps = slide.steps ?? []
  return (
    <div className="p-4 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
          {slide.mode === 'student_attempt' ? '🧠 Your Turn' : '✏️ Worked Example'}
        </span>
      </div>
      <div className="bg-gray-900 rounded-xl px-3 py-2.5">
        <p className="text-xs font-bold text-white leading-relaxed">{slide.problem}</p>
      </div>
      {slide.mode === 'student_attempt' ? (
        <div className="bg-indigo-50 rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] text-indigo-600 font-medium">
            Solution reveals after {slide.reveal_delay_seconds ?? 8}s
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {steps.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[10px] text-gray-600 leading-relaxed">{s.instruction}</p>
            </div>
          ))}
          {steps.length > 3 && (
            <p className="text-[9px] text-gray-400 pl-5">+{steps.length - 3} more steps…</p>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryPreview({ slide }) {
  return (
    <div className="p-4 space-y-2.5">
      <p className="text-sm font-black text-gray-900">📋 What you learned</p>
      <div className="space-y-1.5">
        {(slide.points ?? []).map((pt, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[10px] text-gray-700 leading-relaxed">{pt}</p>
          </div>
        ))}
      </div>
      {slide.closing && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold text-white leading-relaxed">{slide.closing}</p>
        </div>
      )}
    </div>
  )
}

function SlidePreview({ slide }) {
  if (!slide) return null
  switch (slide.type) {
    case 'hook': return <HookPreview slide={slide} />
    case 'definition': return <DefinitionPreview slide={slide} />
    case 'real_life': return <RealLifePreview slide={slide} />
    case 'concept': return <ConceptPreview slide={slide} />
    case 'formula': return <FormulaPreview slide={slide} />
    case 'interaction': return <InteractionPreview slide={slide} />
    case 'worked_example': return <WorkedExamplePreview slide={slide} />
    case 'summary': return <SummaryPreview slide={slide} />
    default:
      return <div className="p-4 text-[10px] text-gray-400">Unknown type: {slide.type}</div>
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobilePreview({ lesson }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="w-[320px] h-[580px] bg-gray-100 rounded-[36px] border-4 border-gray-300 flex items-center justify-center">
          <p className="text-gray-400 text-sm text-center px-8">
            Paste valid lesson JSON to see the preview
          </p>
        </div>
      </div>
    )
  }

  const slides = lesson.slides ?? []
  const slide = slides[currentSlide]
  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div className="w-[320px] h-[580px] bg-white rounded-[36px] border-4 border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="bg-gray-800 px-6 pt-2 pb-1 flex justify-between items-center flex-shrink-0">
          <span className="text-white text-[10px]">9:41</span>
          <div className="w-16 h-4 bg-gray-900 rounded-full" />
          <span className="text-white text-[10px]">●●●</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto">
          <SlidePreview slide={slide} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="text-sm text-gray-500 disabled:opacity-30 font-medium"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
            disabled={currentSlide === slides.length - 1}
            className="text-sm text-indigo-600 disabled:opacity-30 font-medium"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Slide type pills */}
      <div className="flex flex-wrap gap-1 w-[320px] justify-center">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              i === currentSlide
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-500 border-gray-300 hover:border-indigo-300'
            }`}
          >
            {i + 1} · {s.type}
          </button>
        ))}
      </div>
    </div>
  )
}