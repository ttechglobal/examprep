'use client'
// src/components/lesson/LessonViewer.jsx — v3
// ─────────────────────────────────────────────────────────────────────────────
// FIXES vs v2:
//   1. CRITICAL: lesson prop was never being passed from the page — page now
//      parses lesson_content and passes it. This file handles the null case.
//   2. DefinitionSlide added — schema is term/definition/examples, NOT heading/body
//      (v2 was sending definition slides to ConceptSlide which showed nothing)
//   3. WorkedExampleSlide added — guided and student_attempt modes
//   4. RealLifeSlide added — treated like a hook variant
//   5. EndQuizSlide added — multi-question end-of-lesson quiz (was going to
//      InteractionSlide which expected a single question, not questions array)
//   6. Null-safe: if lesson is null/unparseable, shows a clear error state
//      instead of silently rendering an empty viewer with 0 slides
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Shared primitives ──────────────────────────────────────────────────────────
function SlidePill({ label, style }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 12, border: '1.5px solid', ...style,
    }}>
      {label}
    </span>
  )
}

function Body({ text, style = {} }) {
  if (!text) return null
  return (
    <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-sec)', margin: 0, ...style }}>
      {text}
    </p>
  )
}

// ── Hook slide ─────────────────────────────────────────────────────────────────
function HookSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: `${accent}10`, border: `1.5px solid ${accent}28` }}>
      <SlidePill label="🪝 Hook" style={{ background: `${accent}18`, color: accent, borderColor: `${accent}30` }} />
      {slide.heading && (
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.3 }}>
          {slide.heading}
        </p>
      )}
      <Body text={slide.body} />
    </div>
  )
}

// ── Real-life slide (same visual as hook, different pill) ──────────────────────
function RealLifeSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: `${accent}10`, border: `1.5px solid ${accent}28` }}>
      <SlidePill label="🌍 Real Life" style={{ background: `${accent}18`, color: accent, borderColor: `${accent}30` }} />
      {slide.heading && (
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.3 }}>
          {slide.heading}
        </p>
      )}
      <Body text={slide.body} />
    </div>
  )
}

// ── Definition slide — schema: term, definition, examples[] ───────────────────
function DefinitionSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="📘 Definition" style={{ background: `${accent}14`, color: accent, borderColor: `${accent}28` }} />
      <p style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 8, lineHeight: 1.2 }}>
        {slide.term}
      </p>
      <p style={{ fontSize: 15, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: 14 }}>
        {slide.definition}
      </p>
      {Array.isArray(slide.examples) && slide.examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tert)', marginBottom: 2 }}>
            Examples
          </p>
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              background: 'var(--bg-inset)', borderRadius: 10,
              padding: '9px 12px', border: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text-prim)', lineHeight: 1.5,
            }}>
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Concept slide — schema: heading, body, examples[], image? ──────────────────
function ConceptSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="📖 Concept" style={{ background: `${accent}14`, color: accent, borderColor: `${accent}28` }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.3 }}>
        {slide.heading}
      </p>
      <Body text={slide.body} />
      {Array.isArray(slide.examples) && slide.examples.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              background: 'var(--bg-inset)', borderRadius: 10,
              padding: '9px 12px', border: '1px solid var(--border)',
              fontSize: 13, color: 'var(--text-prim)',
            }}>
              {ex}
            </div>
          ))}
        </div>
      )}
      {slide.image?.url && (
        <img src={slide.image.url} alt={slide.image.learning_objective ?? ''} style={{ marginTop: 14, borderRadius: 12, width: '100%', objectFit: 'cover' }} />
      )}
    </div>
  )
}

// ── Formula slide ──────────────────────────────────────────────────────────────
function FormulaSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="⚡ Formula" style={{ background: 'var(--active-bg)', color: 'var(--active-text)', borderColor: 'var(--active-border)' }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 8 }}>
        {slide.label ?? slide.heading}
      </p>
      {slide.plain_english && <Body text={slide.plain_english} style={{ marginBottom: 12 }} />}
      {slide.formula && (
        <div style={{
          margin: '14px 0', background: 'var(--bg-inset)',
          borderRadius: 12, padding: '18px', textAlign: 'center',
          fontSize: 22, fontWeight: 800, color: 'var(--active-text)',
          letterSpacing: '0.03em', border: '1.5px solid var(--active-border)',
          lineHeight: 1.4,
        }}>
          {slide.formula}
        </div>
      )}
      {Array.isArray(slide.variables) && slide.variables.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tert)', marginBottom: 4 }}>
            Variables
          </p>
          {slide.variables.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--active-text)', minWidth: 28 }}>{v.symbol}</span>
              <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>= {v.meaning}</span>
            </div>
          ))}
        </div>
      )}
      {slide.worked_example && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>{slide.worked_example}</p>
      )}
    </div>
  )
}

// ── Worked example slide — modes: guided | student_attempt ────────────────────
function WorkedExampleSlide({ slide, accent }) {
  const [revealed, setRevealed] = useState(slide.mode !== 'student_attempt')
  const isStudentAttempt = slide.mode === 'student_attempt'

  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill
        label={isStudentAttempt ? '✏️ Your Turn' : '📊 Worked Example'}
        style={{
          background: isStudentAttempt ? 'var(--warning-bg)' : `${accent}14`,
          color: isStudentAttempt ? 'var(--warning)' : accent,
          borderColor: isStudentAttempt ? 'var(--warning-border)' : `${accent}28`,
        }}
      />

      {/* Problem statement */}
      <div style={{ background: 'var(--bg-inset)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tert)', marginBottom: 4 }}>
          Problem
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-prim)', lineHeight: 1.5 }}>
          {slide.problem}
        </p>
      </div>

      {/* Student attempt: show timer/reveal button first */}
      {isStudentAttempt && !revealed && (
        <button
          onClick={() => setRevealed(true)}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: 'var(--warning-bg)', border: '1.5px solid var(--warning-border)',
            color: 'var(--warning)', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          Show solution →
        </button>
      )}

      {/* Steps */}
      {revealed && Array.isArray(slide.steps) && slide.steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tert)', marginBottom: 2 }}>
            Solution
          </p>
          {slide.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: `${accent}20`, border: `1.5px solid ${accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: accent,
              }}>
                {i + 1}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-prim)', lineHeight: 1.55, paddingTop: 2, flex: 1 }}>
                {step.instruction ?? step}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Final answer */}
      {revealed && slide.final_answer && (
        <div style={{
          background: 'var(--success-bg)', borderRadius: 10,
          padding: '10px 14px', border: '1px solid var(--success-border)',
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--success)', marginBottom: 3 }}>
            Answer
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>{slide.final_answer}</p>
        </div>
      )}
    </div>
  )
}

// ── Interaction slide — single question with options ───────────────────────────
function InteractionSlide({ slide, onUnlock }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const LETTERS = ['A', 'B', 'C', 'D']

  function pick(letter) {
    if (revealed) return
    setSelected(letter)
    setRevealed(true)
    onUnlock?.()
  }

  const isCorrect = selected === slide.correct_answer
  const feedback  = revealed
    ? (isCorrect ? slide.feedback_correct : slide.feedback_wrong)
    : null

  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="✏️ Check" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }} />
      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6, lineHeight: 1.35 }}>
        {slide.question}
      </p>
      {slide.body && <Body text={slide.body} style={{ marginBottom: 12 }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {(slide.options ?? []).map((opt, i) => {
          const letter      = typeof opt === 'object' ? opt.key : LETTERS[i]
          const text        = typeof opt === 'object' ? opt.text : opt
          const isCorrectOpt = letter === slide.correct_answer
          const isSelectedOpt = selected === letter
          let bg     = 'var(--bg-subtle)'
          let border = '1.5px solid var(--border)'
          let color  = 'var(--text-prim)'
          if (revealed && isCorrectOpt)                { bg = 'var(--success-bg)'; border = '1.5px solid var(--success-border)'; color = 'var(--success)' }
          if (revealed && isSelectedOpt && !isCorrectOpt) { bg = 'var(--danger-bg)'; border = '1.5px solid var(--danger-border)';  color = 'var(--danger)' }
          return (
            <button key={letter} onClick={() => pick(letter)} disabled={revealed}
              style={{ padding: '10px 12px', borderRadius: 12, background: bg, border, fontSize: 13, fontWeight: 600, color, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9, cursor: revealed ? 'default' : 'pointer', transition: 'all .12s', width: '100%' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--bg-inset)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {revealed && isCorrectOpt ? '✓' : revealed && isSelectedOpt ? '✗' : letter}
              </span>
              {text}
            </button>
          )
        })}
      </div>
      {feedback && (
        <div style={{
          marginTop: 12, padding: '10px 13px', borderRadius: 12,
          background: isCorrect ? 'var(--success-bg)' : 'var(--warning-bg)',
          border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--warning-border)'}`,
          fontSize: 13, fontWeight: 600,
          color: isCorrect ? 'var(--success)' : 'var(--warning)',
          lineHeight: 1.5,
        }}>
          {feedback}
        </div>
      )}
    </div>
  )
}

// ── End quiz slide — questions[] array, must answer ALL before proceeding ───────
function EndQuizSlide({ slide, onUnlock }) {
  const questions    = slide.questions ?? []
  const [answers,    setAnswers]    = useState({})   // qIndex → selected letter
  const [revealed,   setRevealed]   = useState({})   // qIndex → bool
  const [unlockedRef, setUnlocked]  = useState(false)

  function pick(qIdx, letter) {
    if (revealed[qIdx]) return
    setAnswers(prev => ({ ...prev, [qIdx]: letter }))
    setRevealed(prev => ({ ...prev, [qIdx]: true }))
    // Unlock when ALL questions answered
    const newRevealedCount = Object.keys(revealed).length + 1
    if (newRevealedCount >= questions.length && !unlockedRef) {
      setUnlocked(true)
      onUnlock?.()
    }
  }

  const allAnswered = Object.keys(revealed).length >= questions.length

  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="🧠 End Quiz" style={{ background: 'var(--active-bg)', color: 'var(--active-text)', borderColor: 'var(--active-border)' }} />
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 16, lineHeight: 1.4 }}>
        Answer all questions to complete this lesson.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => {
          const sel       = answers[qi]
          const rev       = revealed[qi]
          const correct   = q.correct_answer ?? q.correct
          const isCorrect = sel === correct
          return (
            <div key={qi} style={{ paddingTop: qi > 0 ? 16 : 0, borderTop: qi > 0 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.45 }}>
                {qi + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(q.options ?? []).map((opt, oi) => {
                  const letter       = typeof opt === 'object' ? opt.key : ['A','B','C','D'][oi]
                  const text         = typeof opt === 'object' ? opt.text : opt
                  const isCorrectOpt = letter === correct
                  const isSelOpt     = sel === letter
                  let bg     = 'var(--bg-subtle)'
                  let border = '1px solid var(--border)'
                  let color  = 'var(--text-prim)'
                  if (rev && isCorrectOpt)             { bg = 'var(--success-bg)'; border = '1px solid var(--success-border)'; color = 'var(--success)' }
                  if (rev && isSelOpt && !isCorrectOpt){ bg = 'var(--danger-bg)';  border = '1px solid var(--danger-border)';  color = 'var(--danger)' }
                  return (
                    <button key={letter} onClick={() => pick(qi, letter)} disabled={rev}
                      style={{ padding: '9px 11px', borderRadius: 10, background: bg, border, fontSize: 12, fontWeight: 600, color, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, cursor: rev ? 'default' : 'pointer', transition: 'all .12s', width: '100%' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--bg-inset)', border: '1px solid var(--border)', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {rev && isCorrectOpt ? '✓' : rev && isSelOpt ? '✗' : letter}
                      </span>
                      {text}
                    </button>
                  )
                })}
              </div>
              {rev && (
                <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, lineHeight: 1.5, color: isCorrect ? 'var(--success)' : 'var(--warning)', padding: '8px 10px', borderRadius: 9, background: isCorrect ? 'var(--success-bg)' : 'var(--warning-bg)' }}>
                  {isCorrect ? (q.feedback_correct ?? '✓ Correct!') : (q.feedback_wrong ?? `The answer is ${correct}`)}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {!allAnswered && (
        <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-tert)', textAlign: 'center' }}>
          Answer all {questions.length} questions to continue
        </p>
      )}
    </div>
  )
}

// ── Summary slide ──────────────────────────────────────────────────────────────
function SummarySlide({ slide }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="✅ Summary" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 14, lineHeight: 1.3 }}>
        {slide.heading ?? "What you've learnt"}
      </p>
      {(slide.points ?? []).map((pt, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9,
          background: 'var(--success-bg)', borderRadius: 10,
          padding: '9px 12px', border: '1px solid var(--success-border)',
        }}>
          <span style={{ color: 'var(--success)', fontSize: 14, fontWeight: 800, marginTop: 1, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: 13, color: 'var(--text-prim)', lineHeight: 1.55 }}>{pt}</span>
        </div>
      ))}
      {!slide.points && slide.body && <Body text={slide.body} />}
      {slide.closing && (
        <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.5 }}>
          {slide.closing}
        </p>
      )}
    </div>
  )
}

// ── Slide dispatcher ───────────────────────────────────────────────────────────
function SlideRenderer({ slide, accent, onUnlock }) {
  if (!slide) return null
  const { type } = slide
  if (type === 'hook')                              return <HookSlide         slide={slide} accent={accent} />
  if (type === 'real_life')                         return <RealLifeSlide     slide={slide} accent={accent} />
  if (type === 'definition')                        return <DefinitionSlide   slide={slide} accent={accent} />
  if (type === 'concept')                           return <ConceptSlide      slide={slide} accent={accent} />
  if (type === 'formula')                           return <FormulaSlide      slide={slide} accent={accent} />
  if (type === 'worked_example')                    return <WorkedExampleSlide slide={slide} accent={accent} />
  if (type === 'summary')                           return <SummarySlide      slide={slide} />
  if (type === 'interaction')                       return <InteractionSlide  slide={slide} onUnlock={onUnlock} />
  if (type === 'end_quiz')                          return <EndQuizSlide      slide={slide} onUnlock={onUnlock} />
  // Fallback for unknown types
  return (
    <div style={{ borderRadius: 18, padding: '20px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      {slide.heading && <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10 }}>{slide.heading}</p>}
      {slide.body    && <Body text={slide.body} />}
    </div>
  )
}

// ── 3D press next button ───────────────────────────────────────────────────────
function PressNextButton({ onClick, disabled, isLast }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        flex: 2, padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800,
        background: '#0b1330', color: '#fff', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: p && !disabled ? 'translateY(2px)' : '',
        boxShadow: p && !disabled ? '0 2px 0 #05070f' : '0 5px 0 #05070f',
        transition: 'transform .1s, box-shadow .1s',
        letterSpacing: '-0.01em',
      }}>
      {disabled ? 'Answer to continue' : isLast ? 'Finish lesson ✓' : 'Next →'}
    </button>
  )
}

// ── Error state ────────────────────────────────────────────────────────────────
function LessonError({ subtopic }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-base)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
        <button onClick={() => window.history.back()}
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 12 }}>
        <p style={{ fontSize: 40 }}>📖</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)' }}>{subtopic?.name ?? 'Lesson'}</p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6, maxWidth: 300 }}>
          This lesson content couldn't be loaded. It may not have been published yet or there was a formatting issue.
        </p>
        <button onClick={() => window.history.back()}
          style={{ padding: '11px 22px', borderRadius: 12, background: '#0b1330', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f', marginTop: 8 }}>
          ← Back to Learn
        </button>
      </div>
    </div>
  )
}

// ── MAIN LESSON VIEWER ─────────────────────────────────────────────────────────
export default function LessonViewer({ lesson, subtopic, userId, existingProgress, onComplete, accentColor }) {
  const accent      = accentColor ?? '#6366f1'
  const slides      = lesson?.slides ?? []
  const totalSlides = slides.length

  const [currentIndex,  setCurrent]  = useState(0)
  const [slideUnlocked, setUnlocked] = useState(false)

  const currentSlide  = slides[currentIndex]
  const isInteraction = currentSlide?.type === 'interaction'
  const isEndQuiz     = currentSlide?.type === 'end_quiz'
  const needsUnlock   = isInteraction || isEndQuiz
  const isLast        = currentIndex === totalSlides - 1
  const canProgress   = needsUnlock ? slideUnlocked : true

  useEffect(() => { setUnlocked(false) }, [currentIndex])

  function goNext() {
    if (!canProgress) return
    if (isLast) { onComplete?.(); return }
    setCurrent(i => i + 1)
  }
  function goPrev() { if (currentIndex > 0) setCurrent(i => i - 1) }

  const progressPct = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0

  // If lesson is null or has no slides, show error
  if (!lesson || totalSlides === 0) {
    return <LessonError subtopic={subtopic} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <button
            onClick={() => window.history.back()}
            style={{ fontSize: 12, fontWeight: 700, color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>
            {currentIndex + 1} / {totalSlides}
          </span>
        </div>
        {subtopic?.topics?.name && (
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tert)', marginBottom: 2 }}>
            {subtopic.topics.subjects?.name ?? ''} · {subtopic.topics.name}
          </p>
        )}
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 5 }}>
          {subtopic?.name ?? lesson?.title ?? ''}
        </p>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${progressPct}%`, transition: 'width 0.35s' }} />
        </div>
      </div>

      {/* ── Slide content — scrollable ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', background: 'var(--bg-base)', minHeight: 0 }}>
        <SlideRenderer
          slide={currentSlide}
          accent={accent}
          onUnlock={() => setUnlocked(true)}
        />
      </div>

      {/* ── Bottom nav — sticky, never scrolls away ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 16px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={goPrev} disabled={currentIndex === 0}
          style={{
            flex: 1, padding: 14, borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: 'var(--bg-subtle)', color: 'var(--text-sec)',
            border: '1.5px solid var(--border)',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.35 : 1,
          }}>
          ← Prev
        </button>
        <PressNextButton onClick={goNext} disabled={!canProgress} isLast={isLast} />
      </div>
    </div>
  )
}