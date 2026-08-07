'use client'
// src/components/student/QuestionStudentPreview.jsx
//
// Renders a single question the way a student sees it — handling all the
// rich content that can be attached to a question:
//
//   passage_text        — a reading passage shown above the question (English)
//   passage_image_url   — an image that IS the passage (e.g. a diagram)
//   instruction_text    — an italicised instruction line above the question stem
//   question_text       — the main question stem
//   has_image / image_url / image_description — a diagram embedded in the question
//   options             — { A, B, C, D, E } answer choices
//   correct_answer      — correct key (shown only when showAnswer=true)
//   explanation         — { correct, workings[] }
//
// Props
//   question            — the question object (required)
//   showAnswer          — show correct answer highlight + explanation (default false)
//   selectedAnswer      — key the student picked, for highlighting
//   onSelectAnswer(key) — called when student taps an option
//   showRawTab          — show a "Raw JSON" debug tab for admin previews (default false)
//   compact             — tighter spacing for list views (default false)

import { useState } from 'react'

// ── Passage block ─────────────────────────────────────────────────────────────
// Displayed above the question when passage_text or passage_image_url is present.
// English comprehension questions share a passage across several questions,
// so this is visually distinct from the question itself.

function PassageBlock({ text, imageUrl, imageDescription }) {
  const [collapsed, setCollapsed] = useState(false)

  if (!text && !imageUrl) return null

  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
      {/* header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-100 border-b border-blue-200 hover:bg-blue-200/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-sm">📄</span>
          <span className="text-xs font-black text-blue-700 uppercase tracking-wide">
            Read the passage below
          </span>
        </div>
        <span className="text-blue-500 text-xs font-bold">
          {collapsed ? 'Show ▼' : 'Hide ▲'}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 py-3 space-y-3">
          {/* Passage image (e.g. a printed extract scanned from paper) */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden border border-blue-200 bg-white">
              <img
                src={imageUrl}
                alt={imageDescription ?? 'Passage'}
                className="w-full object-contain max-h-72"
              />
              {imageDescription && (
                <p className="text-[11px] text-blue-400 px-3 py-1.5 border-t border-blue-100">
                  {imageDescription}
                </p>
              )}
            </div>
          )}

          {/* Passage text */}
          {text && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif italic">
              {text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Option button ─────────────────────────────────────────────────────────────

function OptionButton({ letterKey, text, state, onClick, disabled }) {
  // state: 'default' | 'selected' | 'correct' | 'wrong' | 'reveal-correct'
  const styles = {
    default:        'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50',
    selected:       'border-indigo-400 bg-indigo-50 text-indigo-900',
    correct:        'border-green-400 bg-green-50 text-green-900',
    wrong:          'border-red-400 bg-red-50 text-red-900',
    'reveal-correct': 'border-green-300 bg-green-50/60 text-green-800',
  }

  const letterStyles = {
    default:        'bg-gray-100 text-gray-500',
    selected:       'bg-indigo-600 text-white',
    correct:        'bg-green-600 text-white',
    wrong:          'bg-red-500 text-white',
    'reveal-correct': 'bg-green-400 text-white',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
        ${styles[state] ?? styles.default}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 transition-colors ${letterStyles[state] ?? letterStyles.default}`}>
        {letterKey}
      </span>
      <span className="text-sm leading-relaxed flex-1">{text}</span>
      {state === 'correct' && (
        <span className="text-green-600 text-sm flex-shrink-0 mt-0.5">✓</span>
      )}
      {state === 'wrong' && (
        <span className="text-red-500 text-sm flex-shrink-0 mt-0.5">✗</span>
      )}
    </button>
  )
}

// ── Explanation block ─────────────────────────────────────────────────────────

function ExplanationBlock({ explanation, explanationImageUrl }) {
  if (!explanation) return null
  const { correct, workings } = explanation
  if (!correct && !workings?.length && !explanationImageUrl) return null

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-100 border-b border-indigo-200">
        <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Explanation</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {correct && (
          <p className="text-sm text-gray-800 leading-relaxed">{correct}</p>
        )}
        {workings?.length > 0 && (
          <div className="bg-white rounded-xl p-3 space-y-1.5 border border-indigo-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Workings</p>
            {workings.map((w, i) => (
              <p key={i} className="text-xs text-gray-700 font-mono leading-relaxed">
                {i + 1}. {typeof w === 'string' ? w : w.instruction ?? JSON.stringify(w)}
              </p>
            ))}
          </div>
        )}
        {explanationImageUrl && (
          <div className="rounded-xl overflow-hidden border border-indigo-200 bg-white">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wide px-3 py-1.5 border-b border-indigo-100">
              Solution diagram
            </p>
            <img
              src={explanationImageUrl}
              alt="Solution diagram"
              className="w-full object-contain max-h-64 p-2"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function QuestionStudentPreview({
  question,
  showAnswer      = false,
  selectedAnswer  = null,
  onSelectAnswer  = null,
  showRawTab      = false,
  compact         = false,
}) {
  const [activeTab, setActiveTab] = useState('question') // 'question' | 'raw'

  if (!question) return null

  const opts    = question.options ?? {}
  const optKeys = Object.keys(opts).sort()
  const correct = question.correct_answer

  // Determine per-option display state
  function optionState(key) {
    if (!showAnswer && !selectedAnswer) return 'default'
    if (showAnswer) {
      if (key === correct) return 'correct'
      if (key === selectedAnswer && key !== correct) return 'wrong'
      return 'default'
    }
    // selectedAnswer only (student mid-question, answer not revealed yet)
    if (key === selectedAnswer) return 'selected'
    return 'default'
  }

  const answeredOrShowing = showAnswer || !!selectedAnswer

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>

      {/* Admin debug tab bar */}
      {showRawTab && (
        <div className="flex gap-1 border-b border-gray-100 pb-2 mb-1">
          {['question', 'raw'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors capitalize ${
                activeTab === t
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'raw' ? (
        <pre className="text-[10px] font-mono bg-gray-50 p-3 rounded-xl border border-gray-200 overflow-auto max-h-96 text-gray-600">
          {JSON.stringify(question, null, 2)}
        </pre>
      ) : (
        <>
          {/* ── PASSAGE ── */}
          <PassageBlock
            text={question.passage_text}
            imageUrl={question.passage_image_url}
            imageDescription={question.passage_image_description}
          />

          {/* ── INSTRUCTION TEXT ── */}
          {question.instruction_text && (
            <p className="text-sm italic text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3">
              {question.instruction_text}
            </p>
          )}

          {/* ── QUESTION STEM ── */}
          <p className={`font-semibold text-gray-900 leading-relaxed ${compact ? 'text-sm' : 'text-base'}`}>
            {question.question_text}
          </p>

          {/* ── QUESTION IMAGE (diagram embedded in the question) ── */}
          {question.has_image && question.image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
              <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Diagram</p>
              </div>
              <img
                src={question.image_url}
                alt={question.image_description ?? 'Question diagram'}
                className="w-full object-contain max-h-80 bg-white p-3"
              />
              {question.image_description && (
                <p className="text-xs text-gray-400 px-3 pb-2 italic">{question.image_description}</p>
              )}
            </div>
          )}

          {/* ── OPTIONS ── */}
          {optKeys.length > 0 && (
            <div className="space-y-2">
              {optKeys.map(key => (
                <OptionButton
                  key={key}
                  letterKey={key}
                  text={opts[key]}
                  state={optionState(key)}
                  disabled={answeredOrShowing || !onSelectAnswer}
                  onClick={() => onSelectAnswer?.(key)}
                />
              ))}
            </div>
          )}

          {/* ── EXPLANATION ── */}
          {showAnswer && (
            <ExplanationBlock
              explanation={question.explanation}
              explanationImageUrl={
                question.explanation_has_image ? question.explanation_image_url : null
              }
            />
          )}
        </>
      )}
    </div>
  )
}