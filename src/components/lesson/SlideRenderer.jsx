'use client'
// src/components/lesson/SlideRenderer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ILLUSTRATED STYLE — restyled to match the illustrated lesson prototypes:
// badge-pill labels (not plain uppercase text), floating corner icon badges,
// chunky 3px accent borders with offset "pressed" drop-shadows, bigger/bolder
// body text. Still 100% driven by --lesson-* CSS custom properties from
// LessonViewer.jsx, so light/dark mode and subject colour continue to work
// automatically — only the JSX structure and a few new --lesson-* variables
// (shadow offset, badge colours) changed.
//
// Per-slide badge/icon mapping (kept consistent across all 9 slide types):
//   hook            → amber badge,  💡
//   definition      → accent banner (term), 📘 corner icon
//   real_life       → teal badge,   🌍
//   concept         → accent badge, 🧠
//   formula         → accent badge, 🧮
//   interaction     → accent banner (question), ✏️ corner icon
//   worked_example  → accent/purple banner, ✏️ / 🧠 corner icon
//   end_quiz        → accent banner, 📝 corner icon
//   summary         → accent badge, 📋
//
// onUnlock fires only after the LAST step is revealed (worked example) or
// the question is answered (interaction / end_quiz) — unchanged from before.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'

// ── Shared: render text with basic line breaks ────────────────────────────────
function BodyText({ text, style }) {
  if (!text) return null
  return <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0, fontWeight: 600, ...style }}>{text}</p>
}

// ── Shared: image slot ────────────────────────────────────────────────────────
function StudentImageSlot({ image }) {
  const url = typeof image === 'string' ? image : image?.url
  if (!url) return null
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '3px solid var(--lesson-accent)' }}>
      <img src={url} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
    </div>
  )
}

// ── Shared: badge-pill label (replaces the old plain uppercase SlideLabel) ───
// bg/color default to a warm amber tone; pass overrides for slide-specific colours.
function Badge({ icon, text, bg = '#fff3da', color = '#9a6a14' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: bg,
      color: color,
      fontFamily: "'Baloo 2', 'Inter', sans-serif",
      fontWeight: 700,
      fontSize: 12,
      padding: '6px 12px',
      borderRadius: 20,
      marginBottom: 14,
    }}>
      {icon && <span>{icon}</span>}
      {text}
    </span>
  )
}

// ── Shared: floating corner icon badge ────────────────────────────────────────
function IconBadge({ icon }) {
  if (!icon) return null
  return (
    <div style={{
      position: 'absolute',
      top: -14,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 14,
      background: 'var(--lesson-card)',
      border: '3px solid var(--lesson-accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      boxShadow: '0 3px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))',
    }}>
      {icon}
    </div>
  )
}

// ── Shared: illustrated card wrapper — 3px accent border + bouncy drop-shadow ─
function IllustratedCard({ children, style, icon }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      padding: '24px 20px',
      background: 'var(--lesson-surface)',
      border: '3px solid var(--lesson-accent)',
      boxShadow: '0 5px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))',
      ...style,
    }}>
      <IconBadge icon={icon} />
      {children}
    </div>
  )
}

// ── Shared: numbered step circle (used across several slide types) ──────────
function StepNumber({ n, size = 24 }) {
  return (
    <span style={{
      minWidth: size, height: size, borderRadius: size >= 28 ? 10 : 8,
      background: 'var(--lesson-accent)', color: '#fff',
      fontSize: size >= 28 ? 13 : 11, fontWeight: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 2px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.15))',
    }}>{n}</span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────────────────
function HookSlide({ slide, color }) {
  return (
    <div style={{ animation: 'lessonFadeIn 0.35s ease' }}>
      <IllustratedCard icon="💡">
        <Badge icon="⚡" text="Did you know?" />
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)' }} />
      </IllustratedCard>
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
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '3px solid var(--lesson-accent)', boxShadow: '0 5px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))' }}>
        <IconBadge icon="📘" />
        <div style={{ padding: '18px 20px 14px', background: 'var(--lesson-accent)' }}>
          <Badge icon="📘" text="Definition" bg="rgba(255,255,255,0.25)" color="#fff" />
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{slide.term}</p>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--lesson-card)' }}>
          <BodyText text={slide.definition} style={{ color: 'var(--lesson-text)', fontSize: 15 }} />
        </div>
      </div>

      {/* Examples */}
      {slide.examples?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Badge icon="✏️" text="Examples" />
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 16px', borderRadius: 16,
              background: 'var(--lesson-surface)',
              border: '2px solid var(--lesson-border)',
            }}>
              <StepNumber n={i + 1} />
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0, fontWeight: 500 }}>{ex}</p>
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
      <IllustratedCard icon="🌍">
        <Badge icon="🌍" text="Real-life connection" bg="rgba(20,184,166,0.15)" color="#0f766e" />
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)', fontSize: 16 }} />
      </IllustratedCard>
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
      <IllustratedCard icon="🧠">
        <Badge icon="🧠" text="Key Concept" />
        {slide.heading && (
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--lesson-text)', margin: '0 0 12px' }}>{slide.heading}</p>
        )}
        <BodyText text={slide.body} style={{ color: 'var(--lesson-text)', fontSize: 15 }} />
      </IllustratedCard>

      {hasImage && <StudentImageSlot image={slide.image ?? slide.image_url} />}

      {slide.examples?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Badge icon="✏️" text="Examples" />
          {slide.examples.map((ex, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 16px', borderRadius: 16,
              background: 'var(--lesson-surface)',
              border: '2px solid var(--lesson-border)',
            }}>
              <StepNumber n={i + 1} />
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0, fontWeight: 500 }}>{ex}</p>
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
      <IllustratedCard icon="🧮">
        <Badge icon="🧮" text={slide.label ?? 'Formula'} />
        {/* Formula block */}
        <div style={{
          fontFamily: 'monospace', fontSize: 22, fontWeight: 900,
          color: 'var(--lesson-text)',
          background: 'var(--lesson-card)',
          borderRadius: 16, padding: '16px 20px',
          margin: '12px 0', border: '2px solid var(--lesson-border)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.4,
        }}>
          {slide.formula}
        </div>
        <BodyText text={slide.plain_english} style={{ color: 'var(--lesson-text-muted)', fontSize: 14, fontWeight: 500 }} />
      </IllustratedCard>

      {slide.variables?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Badge icon="🔤" text="Variables" />
          {slide.variables.map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', borderRadius: 14,
              background: 'var(--lesson-card)', border: '2px solid var(--lesson-border)',
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
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '3px solid var(--lesson-accent)', boxShadow: '0 5px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))' }}>
        <IconBadge icon="✏️" />
        <div style={{ padding: '18px 18px 16px', background: 'var(--lesson-accent)' }}>
          <Badge icon="⚡" text="Quick Check" bg="rgba(255,255,255,0.25)" color="#fff" />
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
                padding: '14px 16px', borderRadius: 18,
                background: bg, border,
                boxShadow: isThisSelected || (revealed && isThisCorrect) ? '0 3px 0 rgba(0,0,0,0.08)' : 'none',
                cursor: revealed || !interactive ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.18s ease',
              }}
            >
              <span style={{
                minWidth: 28, height: 28, borderRadius: 9,
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
          padding: '14px 18px', borderRadius: 18,
          background: isCorrect ? 'var(--lesson-correct-bg)' : 'var(--lesson-wrong-bg)',
          border: `2px solid ${isCorrect ? 'var(--lesson-correct-bd)' : 'var(--lesson-wrong-bd)'}`,
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
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: `3px solid ${isAttempt ? '#7c3aed' : 'var(--lesson-accent)'}`, boxShadow: '0 5px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))' }}>
        <IconBadge icon={isAttempt ? '🧠' : '✏️'} />
        <div style={{ padding: '18px 18px 16px', background: isAttempt ? '#7c3aed' : 'var(--lesson-accent)' }}>
          <Badge
            icon={isAttempt ? '🧠' : '✏️'}
            text={isAttempt ? 'Your Turn — Try This' : 'Worked Example'}
            bg="rgba(255,255,255,0.25)"
            color="#fff"
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
          padding: '16px 18px', borderRadius: 18, textAlign: 'center',
          background: 'var(--lesson-surface)', border: '2px solid var(--lesson-border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--lesson-text-muted)', margin: '0 0 6px', fontWeight: 600 }}>
            Try solving it yourself first…
          </p>
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 30, fontWeight: 700, color: 'var(--lesson-accent)', margin: 0 }}>{secondsLeft}s</p>
        </div>
      )}

      {/* Steps revealed so far */}
      {revealedCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Badge icon="🪜" text={isAttempt ? 'Solution walkthrough' : 'Step-by-step solution'} />
          {steps.slice(0, revealedCount).map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 18,
                background: 'var(--lesson-card)', border: '2px solid var(--lesson-border)',
                animation: 'lessonFadeIn 0.3s ease',
              }}
            >
              <StepNumber n={i + 1} size={28} />
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
          padding: '18px 20px', borderRadius: 18, textAlign: 'center',
          background: 'var(--lesson-correct-bg)', border: `3px solid var(--lesson-correct-bd)`,
          boxShadow: '0 4px 0 rgba(0,0,0,0.08)',
          animation: 'lessonFadeIn 0.3s ease',
        }}>
          <Badge icon="🏁" text="Final Answer" bg="rgba(255,255,255,0.4)" color="var(--lesson-correct-tx)" />
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
              flex: 1, height: 6, borderRadius: 6,
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
            width: '100%', padding: '15px', borderRadius: 18,
            background: canRevealNext ? 'var(--lesson-accent)' : 'var(--lesson-surface)',
            color: canRevealNext ? '#fff' : 'var(--lesson-text-muted)',
            fontFamily: "'Baloo 2', sans-serif",
            fontSize: 15, fontWeight: 700, border: 'none',
            boxShadow: canRevealNext ? '0 4px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.15))' : 'none',
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
          borderRadius: 24, padding: '28px 20px', textAlign: 'center',
          background: great ? 'var(--lesson-correct-bg)' : 'var(--lesson-surface)',
          border: `3px solid ${great ? 'var(--lesson-correct-bd)' : 'var(--lesson-border)'}`,
          boxShadow: '0 5px 0 rgba(0,0,0,0.08)',
        }}>
          <p style={{ fontSize: 44, margin: '0 0 12px' }}>{great ? '🏆' : '📖'}</p>
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--lesson-text)', margin: '0 0 4px' }}>
            {correctCount}/{total} correct
          </p>
          <p style={{ fontSize: 13, color: 'var(--lesson-text-muted)', margin: 0, fontWeight: 500 }}>
            {great ? 'Excellent work! You\'re ready to move on.' : 'Good effort — review the lesson to strengthen these concepts.'}
          </p>
        </div>
        {/* Per-question summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {answers.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 14, background: 'var(--lesson-card)', border: '2px solid var(--lesson-border)',
            }}>
              <span style={{ fontSize: 16 }}>{a.wasCorrect ? '✅' : '❌'}</span>
              <p style={{ fontSize: 13, color: 'var(--lesson-text)', margin: 0, flex: 1, fontWeight: 500 }}>Question {i + 1}</p>
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
            flex: 1, height: 6, borderRadius: 6,
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
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '3px solid var(--lesson-accent)', boxShadow: '0 5px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.12))' }}>
        <IconBadge icon="📝" />
        <div style={{ padding: '18px 18px 16px', background: 'var(--lesson-accent)' }}>
          <Badge icon="📝" text="End Quiz" bg="rgba(255,255,255,0.25)" color="#fff" />
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
                padding: '14px 16px', borderRadius: 18, background: bg, border,
                boxShadow: isThisSelected || (revealed && isThisCorrect) ? '0 3px 0 rgba(0,0,0,0.08)' : 'none',
                cursor: revealed || !interactive ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.18s ease',
              }}
            >
              <span style={{
                minWidth: 28, height: 28, borderRadius: 9,
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
          padding: '14px 18px', borderRadius: 18,
          background: isCorrect ? 'var(--lesson-correct-bg)' : 'var(--lesson-wrong-bg)',
          border: `2px solid ${isCorrect ? 'var(--lesson-correct-bd)' : 'var(--lesson-wrong-bd)'}`,
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
            width: '100%', padding: '15px', borderRadius: 18,
            background: 'var(--lesson-accent)', color: '#fff',
            fontFamily: "'Baloo 2', sans-serif",
            fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.15))',
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
      <IllustratedCard icon="📋">
        <Badge icon="📋" text="What you learned" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(slide.points ?? []).map((pt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <StepNumber n={i + 1} />
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--lesson-text)', margin: 0, fontWeight: 500 }}>{pt}</p>
            </div>
          ))}
        </div>
      </IllustratedCard>
      {slide.closing && (
        <div style={{
          borderRadius: 20, padding: '18px 20px', textAlign: 'center',
          background: 'var(--lesson-accent)',
          boxShadow: '0 4px 0 var(--lesson-accent-shadow, rgba(0,0,0,0.15))',
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