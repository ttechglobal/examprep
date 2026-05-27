'use client'

import { useState } from 'react'
import { SLIDE_TYPES } from '@/lib/constants'

// ── Text slide ────────────────────────────────────────────────────
function TextSlide({ slide, color }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className="text-xl font-black text-gray-900 leading-snug">
        {slide.title}
      </h2>
      <p className="text-base text-gray-700 leading-relaxed">
        {slide.body}
      </p>
      {slide.callout && (
        <div className={`rounded-2xl p-4 border-l-4 ${
          slide.callout.type === 'tip'
            ? `bg-blue-50 border-blue-400`
            : slide.callout.type === 'warning'
            ? `bg-amber-50 border-amber-400`
            : `bg-gray-50 border-gray-300`
        }`}>
          <p className={`text-xs font-black uppercase tracking-wide mb-1 ${
            slide.callout.type === 'tip' ? 'text-blue-600' :
            slide.callout.type === 'warning' ? 'text-amber-600' : 'text-gray-500'
          }`}>
            {slide.callout.type}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {slide.callout.text}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Image slot slide ──────────────────────────────────────────────
function ImageSlotSlide({ slide }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className="text-xl font-black text-gray-900 leading-snug">
        {slide.title}
      </h2>
      {slide.image_url ? (
        <img
          src={slide.image_url}
          alt={slide.caption ?? slide.title}
          className="w-full rounded-2xl object-contain max-h-64"
        />
      ) : (
        <div className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">🖼️</span>
          <span className="text-xs text-gray-400 text-center px-6">
            Illustration coming soon
          </span>
        </div>
      )}
      {slide.caption && (
        <p className="text-xs text-gray-500 text-center italic">{slide.caption}</p>
      )}
    </div>
  )
}

// ── Inline question slide ─────────────────────────────────────────
function InlineQuestionSlide({ slide, color, onNext }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const q = slide.question
  const correctKey = q?.options?.find(o => o.is_correct)?.key
  const isCorrect = selected === correctKey

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Question header */}
      <div className={`${color.bg} rounded-2xl p-4`}>
        <p className={`text-xs font-black uppercase tracking-wide ${color.text} mb-2`}>
          Quick check ✏️
        </p>
        <p className="text-base font-semibold text-gray-900 leading-snug">
          {q?.text}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {q?.options?.map(option => {
          let style = 'border-gray-200 bg-white text-gray-700'
          let icon = null

          if (revealed) {
            if (option.key === correctKey) {
              style = 'border-green-400 bg-green-50 text-green-800'
              icon = '✓'
            } else if (option.key === selected) {
              style = 'border-red-300 bg-red-50 text-red-700'
              icon = '✗'
            } else {
              style = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          }

          return (
            <button
              key={option.key}
              onClick={() => handleSelect(option.key)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${style} ${
                !revealed ? 'hover:border-gray-300 active:scale-[0.99]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  revealed && option.key === correctKey
                    ? 'border-green-400 bg-green-100 text-green-700'
                    : revealed && option.key === selected
                    ? 'border-red-300 bg-red-100 text-red-600'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {icon ?? option.key}
                </span>
                <span className="leading-snug">{option.text}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className={`rounded-2xl p-4 space-y-2 ${
          isCorrect ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
        }`}>
          <p className={`font-black text-sm ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
            {isCorrect ? '🎉 Correct! Well done.' : '🤔 Not quite — but that\'s okay!'}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {q?.explanation}
          </p>
          {!isCorrect && selected && (
            <p className="text-xs text-gray-500 italic leading-relaxed">
              {q?.options?.find(o => o.key === selected)?.distractor_explanation}
            </p>
          )}
        </div>
      )}

      {/* Next button — only appears after answering */}
      {revealed && (
        <button
          onClick={onNext}
          className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
        >
          Continue →
        </button>
      )}
    </div>
  )
}

// ── Summary slide ─────────────────────────────────────────────────
function SummarySlide({ slide, color }) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="text-center">
        <span className="text-4xl">📋</span>
        <h2 className="text-xl font-black text-gray-900 mt-2">{slide.title}</h2>
      </div>
      <div className="space-y-3">
        {slide.points?.map((point, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3.5 rounded-2xl ${color.bg}`}
          >
            <div className={`w-6 h-6 rounded-full ${color.accent} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <span className="text-white text-xs font-black">{i + 1}</span>
            </div>
            <p className={`text-sm leading-relaxed ${color.text} font-medium`}>
              {point}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Video slide ───────────────────────────────────────────────────
function VideoSlide({ slide }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {slide.title && (
        <h2 className="text-xl font-black text-gray-900">{slide.title}</h2>
      )}
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-900">
        <iframe
          src={`https://www.youtube.com/embed/${slide.youtube_id}`}
          className="w-full h-full"
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
      {slide.caption && (
        <p className="text-xs text-gray-500 text-center">{slide.caption}</p>
      )}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────
export default function SlideRenderer({ slide, slideIndex, color, onNext }) {
  switch (slide.type) {
    case SLIDE_TYPES.TEXT:
      return <TextSlide slide={slide} color={color} />
    case SLIDE_TYPES.IMAGE_SLOT:
      return <ImageSlotSlide slide={slide} />
    case SLIDE_TYPES.INLINE_QUESTION:
      return <InlineQuestionSlide slide={slide} color={color} onNext={onNext} />
    case SLIDE_TYPES.SUMMARY:
      return <SummarySlide slide={slide} color={color} />
    case SLIDE_TYPES.VIDEO:
      return <VideoSlide slide={slide} />
    default:
      return (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm">Unknown slide type: {slide.type}</p>
        </div>
      )
  }
}