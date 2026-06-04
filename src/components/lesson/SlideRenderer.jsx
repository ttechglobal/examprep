'use client'
// src/components/lesson/SlideRenderer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGN:
// 1. ALL slides use CSS custom properties (--lesson-*) from LessonViewer
//    so they automatically respect light/dark mode without any hardcoded colours
// 2. Worked examples (guided AND student_attempt) are fully step-by-step:
//    one step revealed at a time, user presses "Next step →" to advance.
//    onUnlock fires only after the LAST step is revealed.
// 3. Quiz options (interaction + end_quiz) have sharp, high-contrast selected/
//    correct/wrong states that are beautiful and unmistakably clear.
// 4. Warm learning-environment aesthetic throughout.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'

// ── Shared: render text with basic line breaks ────────────────────────────────
function BodyText({ text, style }) {
  if (!text) return null
  return <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, ...style }}>{text}</p>
}

// ── Shared: image slot ────────────────────────────────────────────────────────
function StudentImageSlot({ image }) {
  const url = typeof image === 'string' ? image : image?.url
  if (!url) return null
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--lesson-border)' }}>
      <img src={url} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
    </div>
  )
}

// ── Slide type label ──────────────────────────────────────────────────────────
function SlideLabel({ text, accent }) {
  return (
    <p style={{
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: accent ?? 'var(--lesson-text-muted)',
      marginBottom: 10,
    }}>
      {text}
    </p>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────
function HookSlide({ slide, color }) {
  return (
    <div style={{ animation: 'lessonFadeIn 0.35s ease' }}>
      <div style={{
        borderRadius: 20,
        padding: '24px 20px',
        background: 'var(--lesson-surface)',
        borderLeft: `4px solid var(--lesson-accent)`,
      }}>
        <SlideLabel text="Did you know? 💡" />
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)', fontWeight: 600, fontSize: 18 }} />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// DEFINITION
// ────────────────────────────────────────────────────────────────────────────
function DefinitionSlide({ slide, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>
      {/* Term banner */}
      <div style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'var(--lesson-accent)' }}>
          <SlideLabel text="Definition" accent="rgba(255,255,255,0.7)" />
          <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.2 }}>{slide.term}</p>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--lesson-card)', borderTop: '1px solid var(--lesson-border)' }}>
          <BodyText text={slide.definition} style={{ color: 'var(--lesson-text)', fontWeight: 500 }} />
        </div>
      </div>

      {/* Examples */}
      {slide.examples?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SlideLabel text="Examples" />
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 16px', borderRadius: 14,
              background: 'var(--lesson-surface)',
              border: '1px solid var(--lesson-border)',
            }}>
              <span style={{
                minWidth: 24, height: 24, borderRadius: 8,
                background: 'var(--lesson-accent)', color: '#fff',
                fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0 }}>{ex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// REAL LIFE
// ────────────────────────────────────────────────────────────────────────────
function RealLifeSlide({ slide, color }) {
  return (
    <div style={{ animation: 'lessonFadeIn 0.35s ease' }}>
      <div style={{
        borderRadius: 20, padding: '24px 20px',
        background: 'var(--lesson-surface)',
        border: '1px solid var(--lesson-border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 80, height: 80,
          background: 'var(--lesson-accent)',
          opacity: 0.06, borderRadius: '0 20px 0 80px',
        }} />
        <SlideLabel text="Real-life connection 🌍" />
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)', fontWeight: 500, fontSize: 16 }} />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// CONCEPT
// ────────────────────────────────────────────────────────────────────────────
function ConceptSlide({ slide, color }) {
  const hasImage = slide.image?.url || (typeof slide.image === 'string' && slide.image)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>
      <div style={{ padding: '20px', borderRadius: 20, background: 'var(--lesson-card)', border: '1px solid var(--lesson-border)' }}>
        {slide.heading && (
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--lesson-text)', margin: '0 0 12px' }}>{slide.heading}</p>
        )}
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)', fontWeight: 500 }} />
      </div>

      {hasImage && <StudentImageSlot image={slide.image ?? slide.image_url} />}

      {slide.examples?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SlideLabel text="Examples" />
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 16px', borderRadius: 14,
              background: 'var(--lesson-surface)',
              border: '1px solid var(--lesson-border)',
            }}>
              <span style={{
                minWidth: 22, height: 22, borderRadius: 6,
                background: 'var(--lesson-accent)', color: '#fff',
                fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0 }}>{ex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// FORMULA
// ────────────────────────────────────────────────────────────────────────────
function FormulaSlide({ slide, color }) {
  const hasImage = slide.image?.url || (typeof slide.image === 'string' && slide.image)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>
      <div style={{ padding: '20px', borderRadius: 20, background: 'var(--lesson-surface)', border: '1px solid var(--lesson-border)' }}>
        <SlideLabel text={slide.label ?? 'Formula'} />
        {/* Formula block */}
        <div style={{
          fontFamily: 'monospace', fontSize: 22, fontWeight: 900,
          color: 'var(--lesson-text)',
          background: 'var(--lesson-card)',
          borderRadius: 14, padding: '16px 20px',
          margin: '12px 0', border: '1px solid var(--lesson-border)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.4,
        }}>
          {slide.formula}
        </div>
        <BodyText text={slide.plain_english} style={{ color: 'var(--lesson-text-muted)', fontSize: 14 }} />
      </div>

      {slide.variables?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SlideLabel text="Variables" />
          {slide.variables.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', borderRadius: 12,
              background: 'var(--lesson-card)', border: '1px solid var(--lesson-border)',
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 15, color: 'var(--lesson-accent)', minWidth: 32 }}>{v.symbol}</span>
              <p style={{ fontSize: 14, color: 'var(--lesson-text)', margin: 0, lineHeight: 1.5 }}>{v.meaning}</p>
            </div>
          ))}
        </div>
      )}

      {hasImage && <StudentImageSlot image={slide.image ?? slide.image_url} />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// INTERACTION (quick check quiz)
// ────────────────────────────────────────────────────────────────────────────
function InteractionSlide({ slide, color, interactive, onUnlock }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const correct = slide.correct?.trim()
  const isCorrect = selected === correct

  const options = (slide.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key  = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  function handleSelect(key) {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
    onUnlock?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'lessonFadeIn 0.35s ease' }}>
      {/* Question header */}
      <div style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: 'var(--lesson-accent)' }}>
          <SlideLabel text="✏️ Quick Check" accent="rgba(255,255,255,0.7)" />
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.5 }}>{slide.question}</p>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          const isThisCorrect = opt.key === correct
          const isThisSelected = opt.key === selected

          let bg = 'var(--lesson-option-bg)'
          let border = '2px solid var(--lesson-option-bd)'
          let textColor = 'var(--lesson-option-tx)'
          let labelBg = 'var(--lesson-surface)'
          let labelColor = 'var(--lesson-text-muted)'

          if (revealed) {
            if (isThisCorrect) {
              bg = 'var(--lesson-correct-bg)'
              border = `2px solid var(--lesson-correct-bd)`
              textColor = 'var(--lesson-correct-tx)'
              labelBg = 'var(--lesson-correct-bd)'
              labelColor = '#fff'
            } else if (isThisSelected && !isThisCorrect) {
              bg = 'var(--lesson-wrong-bg)'
              border = `2px solid var(--lesson-wrong-bd)`
              textColor = 'var(--lesson-wrong-tx)'
              labelBg = 'var(--lesson-wrong-bd)'
              labelColor = '#fff'
            }
          } else if (isThisSelected) {
            bg = 'var(--lesson-option-sel)'
            border = `2px solid var(--lesson-option-selbd)`
            textColor = 'var(--lesson-option-seltx)'
            labelBg = 'var(--lesson-option-selbd)'
            labelColor = '#fff'
          }

          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              disabled={revealed || !interactive}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 16px', borderRadius: 16,
                background: bg, border,
                cursor: revealed || !interactive ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.18s ease',
              }}
            >
              <span style={{
                minWidth: 28, height: 28, borderRadius: 8,
                background: labelBg, color: labelColor,
                fontSize: 13, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.18s ease',
              }}>{opt.key}</span>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: textColor, margin: 0, fontWeight: revealed && isThisCorrect ? 700 : 500, transition: 'color 0.18s' }}>{opt.text}</p>
              {revealed && isThisCorrect && (
                <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✓</span>
              )}
              {revealed && isThisSelected && !isThisCorrect && (
                <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✗</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div style={{
          padding: '14px 18px', borderRadius: 16,
          background: isCorrect ? 'var(--lesson-correct-bg)' : 'var(--lesson-wrong-bg)',
          border: `1px solid ${isCorrect ? 'var(--lesson-correct-bd)' : 'var(--lesson-wrong-bd)'}`,
          animation: 'lessonFadeIn 0.25s ease',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: isCorrect ? 'var(--lesson-correct-tx)' : 'var(--lesson-wrong-tx)', margin: 0, lineHeight: 1.5 }}>
            {isCorrect
              ? (slide.feedback_correct || '✅ Correct! Well done.')
              : (slide.feedback_wrong  || `❌ Not quite. The correct answer is ${correct}.`)}
          </p>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// WORKED EXAMPLE — fully step-by-step for BOTH guided and student_attempt
// One step shown at a time. User taps "Next step →" to reveal each one.
// onUnlock fires only when the final step is revealed.
// ────────────────────────────────────────────────────────────────────────────
function WorkedExampleSlide({ slide, color, interactive, onUnlock }) {
  const steps        = slide.steps ?? []
  const totalSteps   = steps.length
  const isAttempt    = slide.mode === 'student_attempt'

  // Safety: if slide has no steps at all, unlock immediately so student is never stuck
  useEffect(() => {
    if (totalSteps === 0) onUnlock?.()
  }, [])

  const [revealedCount, setRevealedCount] = useState(0)
  const [timerDone,     setTimerDone]     = useState(!isAttempt)
  const [secondsLeft,   setSecondsLeft]   = useState(slide.reveal_delay_seconds ?? 8)
  const [isDone,        setIsDone]        = useState(false)
  const intervalRef = useRef(null)

  // Student attempt: countdown before first step can be shown
  useEffect(() => {
    if (!isAttempt || timerDone) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setTimerDone(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isAttempt, timerDone])

  function handleRevealNext() {
    const next = revealedCount + 1
    setRevealedCount(next)
    if (next >= totalSteps) {
      setIsDone(true)
      onUnlock?.()
    }
  }

  const canRevealNext = timerDone && revealedCount < totalSteps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>

      {/* Header */}
      <div style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: isAttempt ? '#7c3aed' : 'var(--lesson-accent)' }}>
          <SlideLabel
            text={isAttempt ? '🧠 Your Turn — Try This' : '✏️ Worked Example'}
            accent="rgba(255,255,255,0.7)"
          />
          {/* Problem statement */}
          <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {slide.problem}
          </p>
        </div>
      </div>

      {/* Attempt countdown */}
      {isAttempt && !timerDone && (
        <div style={{
          padding: '14px 18px', borderRadius: 16, textAlign: 'center',
          background: 'var(--lesson-surface)', border: '1px solid var(--lesson-border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--lesson-text-muted)', margin: '0 0 6px' }}>
            Try solving it yourself first…
          </p>
          <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--lesson-accent)', margin: 0 }}>{secondsLeft}s</p>
        </div>
      )}

      {/* Steps revealed so far */}
      {revealedCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SlideLabel text={isAttempt ? 'Solution walkthrough' : 'Step-by-step solution'} />
          {steps.slice(0, revealedCount).map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 16,
                background: 'var(--lesson-card)', border: '1px solid var(--lesson-border)',
                animation: 'lessonFadeIn 0.3s ease',
              }}
            >
              <span style={{
                minWidth: 28, height: 28, borderRadius: 8,
                background: 'var(--lesson-accent)', color: '#fff',
                fontSize: 12, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <p style={{
                fontFamily: /[=÷×]/.test(s.instruction) ? 'monospace' : 'inherit',
                fontSize: 15, lineHeight: 1.65, color: 'var(--lesson-text)',
                margin: 0, fontWeight: 500,
              }}>{s.instruction}</p>
            </div>
          ))}
        </div>
      )}

      {/* Final answer — only shown when all steps are revealed */}
      {isDone && slide.final_answer && (
        <div style={{
          padding: '16px 20px', borderRadius: 16, textAlign: 'center',
          background: 'var(--lesson-correct-bg)', border: `2px solid var(--lesson-correct-bd)`,
          animation: 'lessonFadeIn 0.3s ease',
        }}>
          <p style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lesson-correct-tx)', margin: '0 0 6px' }}>
            Final Answer
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: 'var(--lesson-correct-tx)', margin: 0 }}>
            {slide.final_answer}
          </p>
        </div>
      )}

      {/* Progress indicator */}
      {totalSteps > 0 && revealedCount > 0 && revealedCount < totalSteps && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: i < revealedCount ? 'var(--lesson-accent)' : 'var(--lesson-track)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      )}

      {/* Next step / reveal button */}
      {timerDone && !isDone && (
        <button
          onClick={handleRevealNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: canRevealNext ? 'var(--lesson-accent)' : 'var(--lesson-surface)',
            color: canRevealNext ? '#fff' : 'var(--lesson-text-muted)',
            fontSize: 14, fontWeight: 900, border: 'none',
            cursor: canRevealNext ? 'pointer' : 'not-allowed',
            transition: 'all 0.18s',
          }}
        >
          {revealedCount === 0
            ? (isAttempt ? 'Show solution →' : 'Show first step →')
            : revealedCount >= totalSteps - 1
              ? 'Show final step →'
              : `Next step → (${revealedCount}/${totalSteps})`}
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// END QUIZ — one question at a time
// ────────────────────────────────────────────────────────────────────────────
function EndQuizSlide({ slide, color, interactive, onUnlock, onQuizComplete }) {
  const questions = slide.questions ?? []
  const [currentQ,    setCurrentQ]    = useState(0)
  const [selected,    setSelected]    = useState(null)
  const [revealed,    setRevealed]    = useState(false)
  const [allDone,     setAllDone]     = useState(false)
  const [correctCount,setCorrectCount]= useState(0)
  const [answers,     setAnswers]     = useState([]) // track per-question for score display

  const q       = questions[currentQ]
  const total   = questions.length
  const correct = q?.correct?.trim()

  const getOptions = (q) => (q?.options ?? []).map(opt => {
    if (typeof opt === 'string') {
      const key  = opt.split('.')[0]?.trim()
      const text = opt.split('.').slice(1).join('.').trim() || opt
      return { key, text }
    }
    return opt
  })

  function handleSelect(key) {
    if (revealed || !interactive) return
    setSelected(key)
    setRevealed(true)
  }

  function handleNext() {
    const wasCorrect = selected === correct
    const newCorrect = correctCount + (wasCorrect ? 1 : 0)
    const newAnswers = [...answers, { selected, correct, wasCorrect }]

    if (currentQ + 1 >= total) {
      setCorrectCount(newCorrect)
      setAnswers(newAnswers)
      setAllDone(true)
      onUnlock?.()
      onQuizComplete?.(newCorrect, total)
    } else {
      setCorrectCount(newCorrect)
      setAnswers(newAnswers)
      setCurrentQ(q => q + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  if (allDone) {
    const pct = Math.round((correctCount / total) * 100)
    const great = pct >= 70
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>
        <div style={{
          borderRadius: 20, padding: '24px 20px', textAlign: 'center',
          background: great ? 'var(--lesson-correct-bg)' : 'var(--lesson-surface)',
          border: `2px solid ${great ? 'var(--lesson-correct-bd)' : 'var(--lesson-border)'}`,
        }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>{great ? '🏆' : '📖'}</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--lesson-text)', margin: '0 0 4px' }}>
            {correctCount}/{total} correct
          </p>
          <p style={{ fontSize: 13, color: 'var(--lesson-text-muted)', margin: 0 }}>
            {great ? 'Excellent work! You\'re ready to move on.' : 'Good effort — review the lesson to strengthen these concepts.'}
          </p>
        </div>
        {/* Per-question summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {answers.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 12, background: 'var(--lesson-card)', border: '1px solid var(--lesson-border)',
            }}>
              <span style={{ fontSize: 16 }}>{a.wasCorrect ? '✅' : '❌'}</span>
              <p style={{ fontSize: 13, color: 'var(--lesson-text)', margin: 0, flex: 1 }}>Question {i + 1}</p>
              {!a.wasCorrect && (
                <p style={{ fontSize: 12, color: 'var(--lesson-text-muted)', margin: 0 }}>Answer: {a.correct}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!q) return null
  const options = getOptions(q)
  const isCorrect = selected === correct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'lessonFadeIn 0.35s ease' }}>
      {/* Progress pills */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 4,
            background: i < currentQ ? 'var(--lesson-accent)' : i === currentQ ? 'var(--lesson-accent)' : 'var(--lesson-track)',
            opacity: i === currentQ ? 1 : i < currentQ ? 0.5 : 0.3,
            transition: 'all 0.3s',
          }} />
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lesson-text-muted)', flexShrink: 0 }}>
          {currentQ + 1}/{total}
        </span>
      </div>

      {/* Question */}
      <div style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: 'var(--lesson-accent)' }}>
          <SlideLabel text="📝 End Quiz" accent="rgba(255,255,255,0.7)" />
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.5 }}>{q.question}</p>
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          const isThisCorrect  = opt.key === correct
          const isThisSelected = opt.key === selected

          let bg = 'var(--lesson-option-bg)'
          let border = '2px solid var(--lesson-option-bd)'
          let textColor = 'var(--lesson-option-tx)'
          let labelBg = 'var(--lesson-surface)'
          let labelColor = 'var(--lesson-text-muted)'

          if (revealed) {
            if (isThisCorrect) {
              bg = 'var(--lesson-correct-bg)'; border = `2px solid var(--lesson-correct-bd)`
              textColor = 'var(--lesson-correct-tx)'; labelBg = 'var(--lesson-correct-bd)'; labelColor = '#fff'
            } else if (isThisSelected) {
              bg = 'var(--lesson-wrong-bg)'; border = `2px solid var(--lesson-wrong-bd)`
              textColor = 'var(--lesson-wrong-tx)'; labelBg = 'var(--lesson-wrong-bd)'; labelColor = '#fff'
            }
          } else if (isThisSelected) {
            bg = 'var(--lesson-option-sel)'; border = `2px solid var(--lesson-option-selbd)`
            textColor = 'var(--lesson-option-seltx)'; labelBg = 'var(--lesson-option-selbd)'; labelColor = '#fff'
          }

          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              disabled={revealed || !interactive}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 16px', borderRadius: 16, background: bg, border,
                cursor: revealed || !interactive ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.18s ease',
              }}
            >
              <span style={{
                minWidth: 28, height: 28, borderRadius: 8,
                background: labelBg, color: labelColor,
                fontSize: 13, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.18s ease',
              }}>{opt.key}</span>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: textColor, margin: 0, fontWeight: revealed && isThisCorrect ? 700 : 500 }}>{opt.text}</p>
              {revealed && isThisCorrect  && <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✓</span>}
              {revealed && isThisSelected && !isThisCorrect && <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✗</span>}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div style={{
          padding: '14px 18px', borderRadius: 16,
          background: isCorrect ? 'var(--lesson-correct-bg)' : 'var(--lesson-wrong-bg)',
          border: `1px solid ${isCorrect ? 'var(--lesson-correct-bd)' : 'var(--lesson-wrong-bd)'}`,
          animation: 'lessonFadeIn 0.25s ease',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: isCorrect ? 'var(--lesson-correct-tx)' : 'var(--lesson-wrong-tx)', margin: 0, lineHeight: 1.5 }}>
            {isCorrect
              ? (q.feedback_correct || '✅ Correct! Great work.')
              : (q.feedback_wrong  || `❌ Not quite. The correct answer is ${correct}.`)}
          </p>
        </div>
      )}

      {/* Next question button */}
      {revealed && (
        <button
          onClick={handleNext}
          style={{
            width: '100%', padding: '14px', borderRadius: 16,
            background: 'var(--lesson-accent)', color: '#fff',
            fontSize: 14, fontWeight: 900, border: 'none', cursor: 'pointer',
            transition: 'opacity 0.18s', animation: 'lessonFadeIn 0.25s ease',
          }}
        >
          {currentQ + 1 >= total ? 'See my results →' : `Next question → (${currentQ + 1}/${total})`}
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ────────────────────────────────────────────────────────────────────────────
function SummarySlide({ slide, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lessonFadeIn 0.35s ease' }}>
      <div style={{ padding: '20px', borderRadius: 20, background: 'var(--lesson-surface)', border: '1px solid var(--lesson-border)' }}>
        <SlideLabel text="📋 What you learned" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(slide.points ?? []).map((pt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{
                minWidth: 22, height: 22, borderRadius: 6,
                background: 'var(--lesson-accent)', color: '#fff',
                fontSize: 11, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              }}>{i + 1}</span>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0, fontWeight: 500 }}>{pt}</p>
            </div>
          ))}
        </div>
      </div>
      {slide.closing && (
        <div style={{
          borderRadius: 18, padding: '16px 20px', textAlign: 'center',
          background: 'var(--lesson-accent)',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.5 }}>{slide.closing}</p>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN DISPATCHER
// ────────────────────────────────────────────────────────────────────────────
export default function SlideRenderer({ slide, color, onUnlock, onQuizComplete }) {
  if (!slide) return null
  const interactive = true

  const props = { slide, color, interactive, onUnlock, onQuizComplete }

  return (
    <>
      <style>{`
        @keyframes lessonFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {slide.type === 'hook'           && <HookSlide           {...props} />}
      {slide.type === 'definition'     && <DefinitionSlide     {...props} />}
      {slide.type === 'real_life'      && <RealLifeSlide       {...props} />}
      {slide.type === 'concept'        && <ConceptSlide        {...props} />}
      {slide.type === 'formula'        && <FormulaSlide        {...props} />}
      {slide.type === 'interaction'    && <InteractionSlide    {...props} />}
      {slide.type === 'worked_example' && <WorkedExampleSlide  {...props} />}
      {slide.type === 'end_quiz'       && <EndQuizSlide        {...props} />}
      {slide.type === 'summary'        && <SummarySlide        {...props} />}
      {!['hook','definition','real_life','concept','formula','interaction','worked_example','end_quiz','summary'].includes(slide.type) && (
        <div style={{ padding: 20, borderRadius: 16, background: 'var(--lesson-surface)', color: 'var(--lesson-text-muted)', fontSize: 13 }}>
          Unknown slide type: {slide.type}
        </div>
      )}
    </>
  )
}