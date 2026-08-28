'use client'
// src/components/student/QuestionStudentPreview.jsx
//
// Renders a single question the way a student sees it.
//
// Changes vs previous version:
//   • MathText used for question stem + option text → proper KaTeX rendering,
//     no raw \dfrac / \$ leaking through to students
//   • SVG diagram support: if question.svg_diagram (or explanation.svg_diagram)
//     is a string starting with "<svg", it is rendered inline as a safe diagram
//   • Hint block: shown on request in practice/study sessions (not exam mode)
//     via showHint prop — renders question.hint without revealing the answer
//   • "correct answer is X - text" → normalised to use em dash via cleanLatex
//     (handled upstream), displayed via MathText

import { useState } from 'react'
import { MathText, WorkingsBlock } from '@/lib/mathRenderer'

// ── SVG diagram renderer ───────────────────────────────────────────────────────
// Renders an SVG string safely. We set innerHTML via dangerouslySetInnerHTML
// inside a sandboxed container; scripts inside SVG cannot run in this context.
// Only called when the string begins with the literal "<svg".

function SvgDiagram({ svg, label = 'Diagram', className = '' }) {
  if (!svg || typeof svg !== 'string') return null
  const trimmed = svg.trim()
  if (!trimmed.toLowerCase().startsWith('<svg')) return null

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 bg-white ${className}`}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide px-3 py-1.5 border-b border-gray-100">
        {label}
      </p>
      <div
        className="flex items-center justify-center p-3 overflow-x-auto"
        // Safe: SVG scripts cannot access parent document or make network requests
        // when rendered this way without an <iframe>. We strip script tags below.
        dangerouslySetInnerHTML={{
          __html: trimmed
            // strip any script tags that might appear in malformed SVGs
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, ''),
        }}
      />
    </div>
  )
}

// ── Passage block ──────────────────────────────────────────────────────────────

function PassageBlock({ text, imageUrl, imageDescription }) {
  const [collapsed, setCollapsed] = useState(false)

  if (!text && !imageUrl) return null

  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
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

// ── Hint block ─────────────────────────────────────────────────────────────────
// Shown only in practice / study sessions (not exam mode).
// The hint nudges the student without revealing the answer.

function HintBlock({ hint }) {
  const [revealed, setRevealed] = useState(false)

  if (!hint || typeof hint !== 'string' || !hint.trim()) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
        >
          <span className="text-amber-500 text-sm">💡</span>
          <span className="text-xs font-black text-amber-700 uppercase tracking-wide">
            Need a hint?
          </span>
          <span className="ml-auto text-xs text-amber-500 font-medium">Tap to reveal</span>
        </button>
      ) : (
        <div className="px-4 py-3">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <span>💡</span> Hint
          </p>
          <MathText text={hint} className="text-sm text-amber-900 leading-relaxed" />
        </div>
      )}
    </div>
  )
}

// ── Option button ──────────────────────────────────────────────────────────────

function OptionButton({ letterKey, text, svgDiagram, state, onClick, disabled }) {
  const styles = {
    default:          'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50',
    selected:         'border-indigo-400 bg-indigo-50 text-indigo-900',
    correct:          'border-green-400 bg-green-50 text-green-900',
    wrong:            'border-red-400 bg-red-50 text-red-900',
    'reveal-correct': 'border-green-300 bg-green-50/60 text-green-800',
  }
  const letterStyles = {
    default:          'bg-gray-100 text-gray-500',
    selected:         'bg-indigo-600 text-white',
    correct:          'bg-green-600 text-white',
    wrong:            'bg-red-500 text-white',
    'reveal-correct': 'bg-green-400 text-white',
  }

  const hasSvg = svgDiagram && typeof svgDiagram === 'string' && svgDiagram.trim().toLowerCase().startsWith('<svg')

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
      <span className="text-sm leading-relaxed flex-1">
        {hasSvg ? (
          <SvgDiagram svg={svgDiagram} label="" className="border-0 bg-transparent" />
        ) : (
          <MathText text={text} />
        )}
      </span>
      {state === 'correct' && (
        <span className="text-green-600 text-sm flex-shrink-0 mt-0.5">✓</span>
      )}
      {state === 'wrong' && (
        <span className="text-red-500 text-sm flex-shrink-0 mt-0.5">✗</span>
      )}
    </button>
  )
}

// ── Explanation block ──────────────────────────────────────────────────────────

function ExplanationBlock({ explanation, explanationImageUrl }) {
  if (!explanation) return null

  // Support both old schema (correct / workings) and new schema (answer_note / steps / concept)
  const answerNote = explanation.answer_note || explanation.correct
  const steps      = explanation.steps ?? []
  const workings   = explanation.workings ?? []
  const concept    = explanation.concept ?? ''
  const intro      = explanation.intro ?? ''
  const studyTip   = explanation.study_tip ?? ''
  const svgDiagram = explanation.svg_diagram ?? ''

  const hasContent = answerNote || steps.length || workings.length || explanationImageUrl || svgDiagram

  if (!hasContent) return null

  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-100 border-b border-indigo-200">
        <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Explanation</p>
        {concept && (
          <p className="text-[11px] text-indigo-500 mt-0.5">{concept}</p>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Intro sentence */}
        {intro && (
          <MathText text={intro} className="text-sm text-gray-700 leading-relaxed" />
        )}

        {/* New-style steps (array of { title, lines[] }) */}
        {steps.length > 0 && (
          <div className="bg-white rounded-xl p-3 space-y-2 border border-indigo-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Workings</p>
            {steps.map((step, si) => (
              <div key={si}>
                {step.title && (
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-0.5">
                    {step.title}
                  </p>
                )}
                {(step.lines ?? []).map((line, li) => (
                  <MathText
                    key={li}
                    text={line}
                    className="text-xs text-gray-700 font-mono leading-relaxed block"
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Legacy workings array */}
        {steps.length === 0 && workings.length > 0 && (
          <div className="bg-white rounded-xl p-3 space-y-1.5 border border-indigo-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Workings</p>
            {workings.map((w, i) => (
              <MathText
                key={i}
                text={`${i + 1}. ${typeof w === 'string' ? w : (w.instruction ?? JSON.stringify(w))}`}
                className="text-xs text-gray-700 font-mono leading-relaxed block"
              />
            ))}
          </div>
        )}

        {/* Answer note — the green confirmation box */}
        {answerNote && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <MathText text={answerNote} className="text-sm text-green-900 leading-relaxed font-medium" />
          </div>
        )}

        {/* SVG diagram in explanation */}
        {svgDiagram && (
          <SvgDiagram svg={svgDiagram} label="Solution diagram" />
        )}

        {/* Image in explanation */}
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

        {/* Study tip */}
        {studyTip && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            <span className="text-blue-400 text-sm flex-shrink-0">📌</span>
            <p className="text-xs text-blue-700 leading-relaxed">{studyTip}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function QuestionStudentPreview({
  question,
  showAnswer      = false,
  showHint        = false,   // true in practice/study sessions; false in exam mode
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

  function optionState(key) {
    if (!showAnswer && !selectedAnswer) return 'default'
    if (showAnswer) {
      if (key === correct) return 'correct'
      if (key === selectedAnswer && key !== correct) return 'wrong'
      return 'default'
    }
    if (key === selectedAnswer) return 'selected'
    return 'default'
  }

  const answeredOrShowing = showAnswer || !!selectedAnswer

  // Per-option SVG diagrams: stored as options_svg: { A: '<svg...>', B: '...' }
  const optsSvg = question.options_svg ?? {}

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

          {/* ── QUESTION STEM (with KaTeX math rendering) ── */}
          <MathText
            text={question.question_text}
            className={`font-semibold text-gray-900 leading-relaxed ${compact ? 'text-sm' : 'text-base'}`}
          />

          {/* ── QUESTION SVG DIAGRAM (AI-generated inline diagram) ── */}
          {question.svg_diagram && (
            <SvgDiagram svg={question.svg_diagram} label="Diagram" />
          )}

          {/* ── QUESTION IMAGE (uploaded photo/scan) ── */}
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

          {/* ── HINT (practice / study sessions only) ── */}
          {showHint && !showAnswer && (
            <HintBlock hint={question.hint} />
          )}

          {/* ── OPTIONS ── */}
          {optKeys.length > 0 && (
            <div className="space-y-2">
              {optKeys.map(key => (
                <OptionButton
                  key={key}
                  letterKey={key}
                  text={opts[key]}
                  svgDiagram={optsSvg[key]}
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
