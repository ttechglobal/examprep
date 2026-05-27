'use client'

import { useState } from 'react'
import { SLIDE_TYPES } from '@/lib/constants'

function SlidePreview({ slide }) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [revealed, setRevealed] = useState(false)

  if (!slide) return null

  switch (slide.type) {
    case SLIDE_TYPES.TEXT:
      return (
        <div className="p-4 space-y-3">
          <h2 className="text-base font-bold text-gray-900 leading-tight">{slide.title}</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{slide.body}</p>
          {slide.callout && (
            <div className={`p-3 rounded-lg text-xs ${
              slide.callout.type === 'tip' ? 'bg-blue-50 text-blue-800 border-l-4 border-blue-400' :
              slide.callout.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-l-4 border-yellow-400' :
              'bg-gray-50 text-gray-700 border-l-4 border-gray-400'
            }`}>
              <span className="font-semibold capitalize">{slide.callout.type}: </span>
              {slide.callout.text}
            </div>
          )}
        </div>
      )

    case SLIDE_TYPES.IMAGE_SLOT:
      return (
        <div className="p-4 space-y-3">
          <h2 className="text-base font-bold text-gray-900">{slide.title}</h2>
          <div className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
            <span className="text-2xl">🖼️</span>
            <span className="text-xs text-gray-500 mt-1 text-center px-4">{slide.image_prompt}</span>
          </div>
          {slide.caption && (
            <p className="text-xs text-gray-500 text-center italic">{slide.caption}</p>
          )}
        </div>
      )

    case SLIDE_TYPES.INLINE_QUESTION:
      const q = slide.question
      const correctKey = q.options?.find(o => o.is_correct)?.key
      return (
        <div className="p-4 space-y-3">
          <div className="bg-indigo-50 rounded-lg p-3">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Check your understanding</span>
            <p className="text-sm font-medium text-gray-900 mt-1 leading-snug">{q.text}</p>
          </div>
          <div className="space-y-2">
            {q.options?.map(option => {
              let style = 'border-gray-200 text-gray-700'
              if (revealed) {
                if (option.key === correctKey) style = 'border-green-400 bg-green-50 text-green-800'
                else if (option.key === selectedOption) style = 'border-red-400 bg-red-50 text-red-700'
              } else if (option.key === selectedOption) {
                style = 'border-indigo-400 bg-indigo-50 text-indigo-800'
              }
              return (
                <button
                  key={option.key}
                  onClick={() => { setSelectedOption(option.key); setRevealed(true) }}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border-2 transition-colors ${style}`}
                >
                  <span className="font-bold mr-2">{option.key}.</span> {option.text}
                </button>
              )
            })}
          </div>
          {revealed && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
              <span className="font-semibold">Explanation: </span>{q.explanation}
            </div>
          )}
        </div>
      )

    case SLIDE_TYPES.SUMMARY:
      return (
        <div className="p-4 space-y-3">
          <h2 className="text-base font-bold text-gray-900">{slide.title}</h2>
          <ul className="space-y-2">
            {slide.points?.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )

    case SLIDE_TYPES.VIDEO:
      return (
        <div className="p-4">
          <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl">▶</span>
          </div>
          {slide.caption && (
            <p className="text-xs text-gray-500 text-center mt-2">{slide.caption}</p>
          )}
        </div>
      )

    default:
      return (
        <div className="p-4 text-xs text-gray-400">Unknown slide type: {slide.type}</div>
      )
  }
}

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

  const slides = lesson.slides || []
  const slide = slides[currentSlide]
  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div className="w-[320px] h-[580px] bg-white rounded-[36px] border-4 border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Phone status bar */}
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

        {/* Hook video badge */}
        {currentSlide === 0 && lesson.hook_video && (
          <div className="mx-4 mt-3 bg-gray-900 rounded-lg aspect-video flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl">▶</span>
          </div>
        )}

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto">
          <SlidePreview slide={slide} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="text-sm text-gray-500 disabled:opacity-30 font-medium"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400">{currentSlide + 1} / {slides.length}</span>
          <button
            onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))}
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