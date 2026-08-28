'use client'
// src/components/quiz/QuestionCard.js
//
// Real student-facing question card — practice and exam sessions.
//
// Features:
//   • MathText (KaTeX) for question stem, options, and all explanation lines
//   • FormulaBox — named formula + variables key shown above steps
//   • HintBlock — collapsible single-level hint for stuck students
//   • SVG diagram support (question-level and explanation-level)
//   • instruction_text for fill-gap, synonym, etc.
//   • ExplanationModal — full explanation as a bottom sheet
//   • Single schema: concept / formula_box / variables_key / intro /
//     steps / answer_note / svg_diagram / hint / study_tip / wrong_options

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'

function safeParseJson(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}

// ── SVG renderer ──────────────────────────────────────────────────────────────
function SvgBlock({ svg, label }) {
  if (!svg || typeof svg !== 'string') return null
  const trimmed = svg.trim()
  if (!trimmed.toLowerCase().startsWith('<svg')) return null
  const safe = trimmed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
  return (
    <div className="rounded-[20px] overflow-hidden border-2 border-default bg-card">
      {label && (
        <div className="px-3 py-2 border-b-2 border-default bg-subtle">
          <p className="text-xs font-black text-secondary uppercase tracking-wide"
            style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
            {label}
          </p>
        </div>
      )}
      <div
        className="flex items-center justify-center p-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </div>
  )
}

// ── Formula Box ───────────────────────────────────────────────────────────────
// Named formula in a highlighted box + variables key below it.
// Shown at the top of an explanation, before the steps.
function FormulaBox({ formulaBox, variablesKey, accent = '#4f46e5' }) {
  if (!formulaBox || !formulaBox.trim()) return null
  const vars = Array.isArray(variablesKey) ? variablesKey.filter(Boolean) : []
  return (
    <div
      className="rounded-[20px] overflow-hidden border-2"
      style={{ borderColor: `${accent}40`, background: `${accent}09` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: `${accent}16`, borderBottom: `1px solid ${accent}28` }}
      >
        <span className="text-sm">&#x1F4D0;</span>
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: accent, fontFamily: "'Baloo 2', 'Inter', sans-serif" }}
        >Formula</span>
      </div>
      {/* Formula — large, centred */}
      <div className="px-4 py-3 text-center">
        <MathText text={formulaBox} as="div" className="text-lg font-bold text-primary" />
      </div>
      {/* Variables key */}
      {vars.length > 0 && (
        <div
          className="px-4 pb-3 flex flex-col gap-1 pt-2"
          style={{ borderTop: `1px solid ${accent}25` }}
        >
          {vars.map((v, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-xs flex-shrink-0" style={{ color: `${accent}70` }}>&middot;</span>
              <MathText text={v} as="span" className="text-xs text-secondary leading-relaxed" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Hint button ───────────────────────────────────────────────────────────────
function HintButton({ hint, accent }) {
  const [open, setOpen] = useState(false)
  if (!hint || typeof hint !== 'string' || !hint.trim()) return null

  return (
    <div className="rounded-[18px] border-2 overflow-hidden"
      style={{ borderColor: open ? '#f59e0b60' : '#f59e0b40', background: open ? '#fffbeb' : '#fefce8' }}>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left">
          <span className="text-base">&#x1F4A1;</span>
          <span className="text-sm font-bold text-amber-700"
            style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
            Need a hint?
          </span>
          <span className="ml-auto text-xs text-amber-500">Tap to reveal</span>
        </button>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs font-black text-amber-600 uppercase tracking-wide mb-1.5"
            style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
            &#x1F4A1; Hint
          </p>
          <MathText text={hint} className="text-sm text-amber-900 leading-relaxed" as="p" />
        </div>
      )}
    </div>
  )
}

// ── Explanation Modal ─────────────────────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose, color }) {
  const isCorrect    = selectedKey === question.correct_answer
  const explanation  = safeParseJson(question.explanation, {})
  const accent       = color?.solid ?? '#4f46e5'
  const accentShadow = color?.text ? `${color.text}40` : 'rgba(79,70,229,0.25)'

  useEffect(() => {
    injectMathStyles()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const concept       = explanation.concept       ?? ''
  const formulaBox    = explanation.formula_box   ?? ''
  const variablesKey  = explanation.variables_key ?? []
  const answerNote    = explanation.answer_note   ?? explanation.correct ?? ''
  const steps         = explanation.steps         ?? []
  const wrongOptions  = explanation.wrong_options ?? {}
  const svgDiagram    = explanation.svg_diagram   ?? ''
  const studyTip      = explanation.study_tip     ?? ''

  const thisWrongReason = !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''
  const otherWrongOptions = Object.entries(wrongOptions)
    .filter(([k]) => k !== question.correct_answer)
  const hasSteps = steps.length > 0

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto bg-card rounded-t-[28px] w-full max-w-lg mx-auto shadow-2xl flex flex-col max-h-[90vh] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-inset border border-default" />
        </div>

        {/* Result banner */}
        <div className={`mx-5 mb-3 mt-2 rounded-[22px] flex-shrink-0 border-2 ${
          isCorrect ? 'bg-success border-success' : 'bg-danger border-danger'
        }`} style={{ boxShadow: isCorrect ? '0 3px 0 rgba(34,197,94,0.18)' : '0 3px 0 rgba(239,68,68,0.18)' }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-black text-white ${
              isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`} style={{ boxShadow: '0 2px 0 rgba(0,0,0,0.12)' }}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <p className={`text-sm font-bold ${isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
              style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
              {isCorrect ? 'Correct!' : `Incorrect — the answer is ${question.correct_answer}`}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 space-y-3 pb-2">

          {/* Concept pill */}
          {concept && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-[20px] border-2"
              style={{ background: `${accent}14`, borderColor: `${accent}40` }}>
              <p className="text-sm leading-relaxed" style={{ color: accent }}>{concept}</p>
            </div>
          )}

          {/* Formula box */}
          {formulaBox && (
            <FormulaBox formulaBox={formulaBox} variablesKey={variablesKey} accent={accent} />
          )}

          {/* Why this answer was wrong */}
          {!isCorrect && thisWrongReason && (
            <div className="px-4 py-3 bg-warning border-2 border-warning rounded-[20px]">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5"
                style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
                Why {selectedKey} is wrong
              </p>
              <MathText text={thisWrongReason} className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed" as="p" />
            </div>
          )}

          {/* Steps */}
          {hasSteps && (
            <div className="rounded-[20px] border-2 border-default overflow-hidden">
              {steps.map((step, si) => (
                <div key={si} className={`px-4 py-3 ${si < steps.length - 1 ? 'border-b-2 border-default' : ''}`}>
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-0.5 px-2.5 py-0.5 rounded-full border"
                      style={{ background: `${accent}15`, borderColor: `${accent}40` }}>
                      <span className="text-[10px] font-black" style={{ color: accent }}>Step {si + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {step.title && (
                        <p className="text-sm font-bold text-primary mb-1" style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
                          {step.title}
                        </p>
                      )}
                      {(step.lines ?? []).map((line, li) => (
                        <div key={li} style={{ lineHeight: 2.0 }}>
                          <MathText text={line} as="span" className="text-sm text-primary overflow-x-auto block" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Correct answer explanation */}
          {answerNote && (
            <div className="px-4 py-3 bg-base border-2 border-default rounded-[20px]">
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-1.5"
                style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
                {isCorrect ? "Why you're right" : `Why ${question.correct_answer} is correct`}
              </p>
              <MathText text={answerNote} className="text-sm text-primary leading-relaxed" as="p" />
            </div>
          )}

          {/* SVG diagram */}
          {svgDiagram && <SvgBlock svg={svgDiagram} label="Solution diagram" />}

          {/* Study tip */}
          {studyTip && (
            <div className="flex items-start gap-2 px-4 py-3 bg-base border-2 border-default rounded-[20px]">
              <span className="text-sm flex-shrink-0">&#x1F4CC;</span>
              <MathText text={studyTip} className="text-xs text-secondary leading-relaxed" as="p" />
            </div>
          )}

          {/* Why other options are wrong */}
          {otherWrongOptions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2"
                style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>
                Why the other options are wrong
              </p>
              <div className="space-y-2">
                {otherWrongOptions.map(([key, reason]) => (
                  <div key={key} className={`flex gap-3 px-4 py-3 rounded-[18px] border-2 ${
                    key === selectedKey ? 'bg-danger border-danger' : 'bg-base border-default'
                  }`}>
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      key === selectedKey
                        ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                        : 'bg-inset border border-default text-tertiary'
                    }`}>{key}</span>
                    <MathText text={reason} className="text-sm text-primary leading-relaxed flex-1" as="p" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Close */}
        <div className="flex-shrink-0 px-5 pb-6 pt-2 bg-card border-t-2 border-default">
          <button
            onClick={onClose}
            style={{
              fontFamily: "'Baloo 2', 'Inter', sans-serif",
              fontSize: 15, fontWeight: 700, padding: '14px',
              borderRadius: 18, background: accent, color: '#fff',
              boxShadow: `0 4px 0 ${accentShadow}`,
              width: '100%',
            }}
          >Got it</button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>,
    document.body
  )
}

// ── Main QuestionCard ─────────────────────────────────────────────────────────
export default function QuestionCard({
  question,
  selectedAnswer,
  revealed,
  onAnswer,
  showExplanation = true,
  showHint        = false,
  color,
}) {
  const [showModal, setShowModal] = useState(false)
  const accent       = color?.solid ?? '#4f46e5'
  const accentShadow = color?.text ? `${color.text}40` : 'rgba(79,70,229,0.25)'

  useEffect(() => { injectMathStyles() }, [])
  useEffect(() => { setShowModal(false) }, [question?.id])

  const options     = safeParseJson(question?.options,     {})
  const explanation = safeParseJson(question?.explanation, {})
  const normalisedQuestion = { ...question, options, explanation }

  const handleSelect = useCallback((key) => {
    if (revealed) return
    onAnswer?.(question.id, key)
  }, [revealed, onAnswer, question?.id])

  const isCorrect = revealed && selectedAnswer === question.correct_answer

  const hasExplanation = !!(
    explanation.answer_note  ||
    explanation.correct      ||
    explanation.concept      ||
    explanation.formula_box  ||
    explanation.steps?.length ||
    explanation.svg_diagram  ||
    Object.keys(explanation.wrong_options ?? {}).length
  )

  const optionEntries = Object.entries(options)

  return (
    <div className="space-y-3">

      {/* Passage */}
      {(question.passage_text || question.passage_image_url) && (
        <div className="rounded-[20px] border-2 overflow-hidden"
          style={{ borderColor: `${accent}40`, background: `${accent}08` }}>
          <div className="px-4 py-2 border-b-2 flex items-center gap-2"
            style={{ borderColor: `${accent}30`, background: `${accent}12` }}>
            <span className="text-xs" style={{ color: accent }}>&#x1F4C4;</span>
            <p className="text-xs font-black uppercase tracking-wide"
              style={{ color: accent, fontFamily: "'Baloo 2', 'Inter', sans-serif" }}>Read this first</p>
          </div>
          {question.passage_image_url && (
            <div className="border-b-2 border-default">
              <img src={question.passage_image_url} alt="Shared passage"
                className="w-full object-contain max-h-64 bg-card p-3" />
            </div>
          )}
          {question.passage_text && (
            <div className="px-4 py-3">
              <MathText text={question.passage_text} className="text-sm text-primary leading-relaxed" as="div" />
            </div>
          )}
        </div>
      )}

      {/* Instruction text */}
      {question.instruction_text && (
        <p className="text-sm italic text-secondary leading-relaxed border-l-2 pl-3"
          style={{ borderColor: `${accent}60` }}>
          {question.instruction_text}
        </p>
      )}

      {/* Question image */}
      {question.has_image && question.image_url && (
        <div className="rounded-[20px] overflow-hidden bg-base border-2 border-default">
          <img src={question.image_url} alt={question.image_description ?? 'Question diagram'}
            className="w-full object-contain max-h-64 bg-card p-3" />
        </div>
      )}

      {/* Question SVG */}
      {question.svg_diagram && <SvgBlock svg={question.svg_diagram} label="Diagram" />}

      {/* Question text */}
      <MathText
        text={question.question_text ?? ''}
        className="text-base text-primary leading-relaxed font-medium"
        as="p"
      />

      {/* Hint — practice/study mode only, before answering */}
      {showHint && !revealed && (
        <HintButton hint={question.hint} accent={accent} />
      )}

      {/* Options */}
      <div className="space-y-2.5">
        {optionEntries.map(([key, text]) => {
          const isSelected = selectedAnswer === key
          const isRight    = revealed && key === question.correct_answer
          const isWrong    = revealed && isSelected && !isRight

          let optStyle = {}
          if (isRight) {
            optStyle = { background: 'var(--success-bg)', border: '2px solid var(--success)', boxShadow: '0 3px 0 rgba(34,197,94,0.20)' }
          } else if (isWrong) {
            optStyle = { background: 'var(--danger-bg)', border: '2px solid var(--danger)', boxShadow: '0 3px 0 rgba(239,68,68,0.20)' }
          } else if (isSelected) {
            optStyle = { background: '#0b1330', border: '2px solid #0b1330', boxShadow: '0 5px 0 #05070f', transform: 'translateY(-1px)' }
          } else {
            optStyle = { background: 'var(--bg-base)', border: '1.5px solid var(--border)' }
          }

          let badgeBg = 'var(--bg-subtle)', badgeColor = 'var(--text-tert)', badgeBorder = '1px solid var(--border)'
          if (isRight)                 { badgeBg = 'var(--success)'; badgeColor = '#fff'; badgeBorder = 'none' }
          if (isWrong)                 { badgeBg = 'var(--danger)';  badgeColor = '#fff'; badgeBorder = 'none' }
          if (isSelected && !revealed) { badgeBg = 'rgba(255,255,255,.15)'; badgeColor = '#fff'; badgeBorder = 'none' }

          const badgeContent = isRight ? '✓' : isWrong ? '✗' : key
          const textColor = (isSelected && !revealed) ? '#fff'
            : isRight ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--text-prim)'

          return (
            <button key={key} onClick={() => handleSelect(key)} disabled={revealed}
              style={{
                width: '100%', textAlign: 'left', padding: '15px 16px', borderRadius: 16,
                display: 'flex', alignItems: 'flex-start', gap: 12,
                cursor: revealed ? 'default' : 'pointer',
                transition: 'transform .1s, box-shadow .1s, background .15s',
                ...optStyle,
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0, fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: badgeBg, color: badgeColor, border: badgeBorder, marginTop: 1,
              }}>{badgeContent}</span>
              <MathText
                text={String(text ?? '')}
                style={{ flex: 1, lineHeight: 1.55, fontSize: 14, fontWeight: isSelected || isRight ? 600 : 400, color: textColor, paddingTop: 2 }}
                as="span"
              />
            </button>
          )
        })}
      </div>

      {/* See explanation button */}
      {revealed && showExplanation && hasExplanation && (
        <button onClick={() => setShowModal(true)}
          style={{ fontFamily: "'Baloo 2', 'Inter', sans-serif", color: accent, borderColor: accent }}
          className="w-full py-3 border-2 text-sm font-bold rounded-[20px] hover:opacity-80 transition-opacity">
          See explanation →
        </button>
      )}

      {showModal && (
        <ExplanationModal
          question={normalisedQuestion}
          selectedKey={selectedAnswer}
          onClose={() => setShowModal(false)}
          color={color}
        />
      )}
    </div>
  )
}