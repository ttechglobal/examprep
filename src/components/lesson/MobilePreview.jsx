'use client'

import { useState } from 'react'
import SlideRenderer from './SlideRenderer'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { LESSON_CSS_VARS_SCOPED, getAccentOverride } from '@/lib/lessonCssVars'
import { SLIDE_TYPE_LABELS } from '@/lib/lessonParser'

// ─────────────────────────────────────────────────────────────────────────────
// MobilePreview.jsx
// Phone-frame slide preview used in the admin lesson uploader/reviewer.
//
// PREVIOUSLY: this file had its own complete set of slide-type renderers
// (HookPreview, DefinitionPreview, ConceptPreview, etc.) — a second,
// independent reimplementation of what SlideRenderer.jsx already does.
// That meant every improvement to SlideRenderer (the illustrated restyle,
// dark mode, subject colour) silently did NOT apply here, and this preview
// was missing a slide type entirely (end_quiz fell through to "Unknown
// type"). Same failure mode as the old duplicated SUBJECT_STYLES maps.
//
// NOW: this component is just chrome (phone frame, status bar, slide-type
// pills, prev/next nav) around the one real SlideRenderer. Any future
// SlideRenderer change — new slide type, restyle, bugfix — appears here
// automatically, with zero changes needed in this file.
//
// subjectName + isDark are optional props. If a consumer doesn't pass them
// (neither current consumer does yet), the preview still renders correctly
// using SlideRenderer's built-in default --lesson-accent (indigo), just
// without subject colour. Pass them in when available for full fidelity
// with what the student actually sees.
// ─────────────────────────────────────────────────────────────────────────────

export default function MobilePreview({ lesson, subjectName, isDark = false }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="w-[320px] h-[580px] bg-gray-100 dark:bg-gray-800 rounded-[36px] border-4 border-gray-300 dark:border-gray-700 flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center px-8">
            Paste valid lesson JSON to see the preview
          </p>
        </div>
      </div>
    )
  }

  const slides = lesson.slides ?? []
  const slide = slides[currentSlide]
  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0
  const color = subjectName ? resolveSubjectColors(subjectName, isDark) : null
  const accentOverride = color ? getAccentOverride(color) : {}

  return (
    <div className="flex flex-col items-center gap-4">
      <style>{LESSON_CSS_VARS_SCOPED('mobile-preview-scope')}</style>

      {/* Phone frame */}
      <div className="w-[320px] h-[580px] bg-card rounded-[36px] border-4 border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="bg-gray-800 px-6 pt-2 pb-1 flex justify-between items-center flex-shrink-0">
          <span className="text-white text-[10px]">9:41</span>
          <div className="w-16 h-4 bg-gray-900 rounded-full" />
          <span className="text-white text-[10px]">●●●</span>
        </div>

        {/* Progress bar — subject-coloured when subjectName is provided */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: color?.solid ?? '#6366f1' }}
          />
        </div>

        {/* Slide content — delegates to the real SlideRenderer, scoped to
            this preview's own --lesson-* variables so it doesn't depend on
            (or interfere with) whatever full-page lesson vars might exist
            elsewhere on this admin page. */}
        <div
          className={`mobile-preview-scope${isDark ? ' dark' : ''} flex-1 overflow-y-auto`}
          style={accentOverride}
        >
          {slide ? (
            <div className="p-4">
              <SlideRenderer slide={slide} />
            </div>
          ) : (
            <div className="p-4 text-xs text-gray-400">No slides yet</div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
            disabled={currentSlide === 0}
            className="text-sm text-gray-500 dark:text-gray-400 disabled:opacity-30 font-medium"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {slides.length > 0 ? `${currentSlide + 1} / ${slides.length}` : '0 / 0'}
          </span>
          <button
            onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
            disabled={currentSlide >= slides.length - 1}
            className="text-sm font-medium disabled:opacity-30"
            style={{ color: color?.solid ?? '#4f46e5' }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Slide type pills — same SLIDE_TYPE_LABELS used by the admin editor's
          slide list, not a third re-invention of "what do we call this type". */}
      <div className="flex flex-wrap gap-1 w-[320px] justify-center">
        {slides.map((s, i) => {
          const isActive = i === currentSlide
          return (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={isActive ? { background: color?.solid ?? '#4f46e5', borderColor: color?.solid ?? '#4f46e5' } : undefined}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              {i + 1} · {SLIDE_TYPE_LABELS[s.type] ?? s.type}
            </button>
          )
        })}
      </div>
    </div>
  )
}