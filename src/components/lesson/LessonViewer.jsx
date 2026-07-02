'use client'
// src/components/lesson/LessonViewer.jsx — REDESIGN
// Matches prototype screen 6:
//   • Dark header: purple gradient bg, "← Dashboard" | slide counter, subject/topic label, progress bar
//   • Slide types rendered with prototype cards: hook (purple tint), concept (surface),
//     formula (blue tint), interaction/end_quiz (dark), summary (surface)
//   • Slide type pill at top of each card
//   • Prev ← / Next → bottom nav buttons (navy 3D for Next)
//   • Inline check questions MUST be answered to progress (onUnlock gate)
//   • Uses existing --lesson-* CSS variables from parent shell

import { useState, useEffect, useCallback } from 'react'

// ─── CSS variable tokens (all via var() — respected by existing lesson shell) ─
// Fallback values match the dark prototype skin
const V = (name, fallback) => `var(${name}, ${fallback})`

// ── Slide type pill ────────────────────────────────────────────────────────────
function SlidePill({ label, bg, color }) {
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 9px', borderRadius: 999,
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
      background: bg, color, marginBottom: 10,
    }}>
      {label}
    </span>
  )
}

// ── Body text ─────────────────────────────────────────────────────────────────
function Body({ text, style = {} }) {
  if (!text) return null
  return <p style={{ fontSize: 14, lineHeight: 1.65, color: V('--lesson-text-muted', '#9499b5'), margin: 0, ...style }}>{text}</p>
}

// ── Hook slide ────────────────────────────────────────────────────────────────
function HookSlide({ slide, accent }) {
  return (
    <div style={{
      borderRadius: 18, padding: '20px 18px',
      background: `linear-gradient(135deg, ${accent}14, rgba(255,143,171,.08))`,
      border: `1px solid ${accent}28`,
    }}>
      <SlidePill label="🪝 Hook" bg={`${accent}18`} color={accent} />
      <p style={{ fontSize: 17, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 10, lineHeight: 1.3 }}>
        {slide.heading}
      </p>
      <Body text={slide.body} />
    </div>
  )
}

// ── Concept / definition slide ────────────────────────────────────────────────
function ConceptSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px 18px', background: V('--lesson-surface', '#13141f'), border: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}` }}>
      <SlidePill label="📖 Concept" bg={`${accent}14`} color={accent} />
      <p style={{ fontSize: 17, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 10, lineHeight: 1.3 }}>{slide.heading}</p>
      <Body text={slide.body} />
      {slide.example && (
        <div style={{ marginTop: 12, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '11px 13px' }}>
          <p style={{ fontSize: 10, color: V('--lesson-text-muted', '#7b7f9e'), marginBottom: 4 }}>Example:</p>
          <p style={{ fontSize: 13, color: V('--lesson-text', '#eef0fa'), fontWeight: 600 }}>{slide.example}</p>
        </div>
      )}
    </div>
  )
}

// ── Formula slide ─────────────────────────────────────────────────────────────
function FormulaSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px 18px', background: 'rgba(92,184,234,.08)', border: '1px solid rgba(92,184,234,.2)' }}>
      <SlidePill label="⚡ Formula" bg="rgba(92,184,234,.12)" color="#5cb8ea" />
      <p style={{ fontSize: 17, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 10 }}>{slide.heading}</p>
      <Body text={slide.body} />
      {slide.formula && (
        <div style={{ margin: '12px 0', background: 'rgba(0,0,0,.25)', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#5cb8ea', letterSpacing: '0.04em' }}>
          {slide.formula}
        </div>
      )}
      {slide.worked_example && (
        <div style={{ fontSize: 13, color: V('--lesson-text-muted', '#7b7f9e'), lineHeight: 1.6 }}>
          {slide.worked_example}
        </div>
      )}
    </div>
  )
}

// ── Summary slide ─────────────────────────────────────────────────────────────
function SummarySlide({ slide, accent, onPractise }) {
  return (
    <div style={{ borderRadius: 18, padding: '20px 18px', background: V('--lesson-surface', '#13141f'), border: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}` }}>
      <SlidePill label="✅ Summary" bg="rgba(108,206,142,.12)" color="#6cce8e" />
      <p style={{ fontSize: 17, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 12 }}>{slide.heading ?? "What you've learnt"}</p>
      {(slide.points ?? []).map((pt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <span style={{ color: '#6cce8e', fontSize: 14, marginTop: 2 }}>✓</span>
          <span style={{ fontSize: 13, color: V('--lesson-text-muted', '#7b7f9e'), lineHeight: 1.55 }}>{pt}</span>
        </div>
      ))}
      {!slide.points && slide.body && <Body text={slide.body} />}
    </div>
  )
}

// ── Interaction / quiz slide ───────────────────────────────────────────────────
function InteractionSlide({ slide, accent, onUnlock }) {
  const [selected, setSelected]  = useState(null)
  const [revealed, setRevealed]  = useState(false)
  const LETTERS = ['A', 'B', 'C', 'D']

  function pick(letter) {
    if (revealed) return
    setSelected(letter)
    setRevealed(true)
    if (letter === slide.correct_answer) onUnlock?.()
    else onUnlock?.() // still unlock after seeing answer — let them progress
  }

  return (
    <div style={{ borderRadius: 18, padding: '20px 18px', background: V('--lesson-surface', '#13141f'), border: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}` }}>
      <SlidePill label="✏️ Check Question" bg="rgba(255,195,107,.1)" color="#ffc36b" />
      <p style={{ fontSize: 16, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 8, lineHeight: 1.3 }}>{slide.question}</p>
      {slide.body && <Body text={slide.body} style={{ marginBottom: 12 }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
        {(slide.options ?? []).map((opt, i) => {
          const letter = LETTERS[i]
          const isCorrect  = letter === slide.correct_answer
          const isSelected = selected === letter
          let bg = 'rgba(255,255,255,.04)', border = '1.5px solid rgba(255,255,255,.08)', color = 'rgba(255,255,255,.65)'
          if (revealed && isCorrect)                { bg = 'rgba(108,206,142,.15)'; border = '1.5px solid rgba(108,206,142,.5)'; color = '#6cce8e' }
          if (revealed && isSelected && !isCorrect) { bg = 'rgba(239,93,78,.12)';  border = '1.5px solid rgba(239,93,78,.4)';  color = '#ef5d4e' }
          return (
            <button
              key={letter} onClick={() => pick(letter)} disabled={revealed}
              style={{ padding: '10px 12px', borderRadius: 11, background: bg, border, fontSize: 13, fontWeight: 600, color, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9, cursor: revealed ? 'default' : 'pointer', transition: 'all .12s', }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,.07)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{letter}</span>
              {typeof opt === 'object' ? opt.text ?? '' : opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <p style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: selected === slide.correct_answer ? '#6cce8e' : '#ef5d4e' }}>
          {selected === slide.correct_answer ? '✓ Correct!' : `✗ The answer is ${slide.correct_answer}`}
        </p>
      )}
    </div>
  )
}

// ── Slide dispatcher ──────────────────────────────────────────────────────────
function SlideRenderer({ slide, accent, onUnlock }) {
  if (!slide) return null
  const type = slide.type
  if (type === 'hook')               return <HookSlide        slide={slide} accent={accent} />
  if (type === 'definition' || type === 'concept') return <ConceptSlide slide={slide} accent={accent} />
  if (type === 'formula')            return <FormulaSlide     slide={slide} accent={accent} />
  if (type === 'summary')            return <SummarySlide     slide={slide} accent={accent} onPractise={() => onUnlock?.()} />
  if (type === 'interaction' || type === 'end_quiz') return <InteractionSlide slide={slide} accent={accent} onUnlock={onUnlock} />
  // Default fallback
  return (
    <div style={{ borderRadius: 18, padding: '20px 18px', background: V('--lesson-surface', '#13141f'), border: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}` }}>
      {slide.heading && <p style={{ fontSize: 17, fontWeight: 800, color: V('--lesson-text', '#eef0fa'), marginBottom: 10 }}>{slide.heading}</p>}
      {slide.body && <Body text={slide.body} />}
    </div>
  )
}

// ── MAIN LESSON VIEWER ────────────────────────────────────────────────────────
export default function LessonViewer({ lesson, subtopic, onComplete, accentColor }) {
  const accent     = accentColor ?? '#9b7ae0'
  const slides     = lesson?.slides ?? []
  const totalSlides = slides.length

  const [currentIndex,  setCurrent]   = useState(0)
  const [slideUnlocked, setUnlocked]  = useState(false)

  const currentSlide = slides[currentIndex]
  const isInteraction = currentSlide?.type === 'interaction' || currentSlide?.type === 'end_quiz'
  const isSummary     = currentSlide?.type === 'summary'
  const isLast        = currentIndex === totalSlides - 1

  // Non-interaction slides are always unlocked
  const canProgress = isInteraction ? slideUnlocked : true

  useEffect(() => {
    setUnlocked(false)
  }, [currentIndex])

  function goNext() {
    if (!canProgress) return
    if (isLast) { onComplete?.(); return }
    setCurrent(i => i + 1)
  }
  function goPrev() { if (currentIndex > 0) setCurrent(i => i - 1) }

  const progressPct = totalSlides > 0 ? Math.round(((currentIndex + 1) / totalSlides) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100dvh' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 16px',
        background: `linear-gradient(160deg, ${accent}28 0%, rgba(14,10,28,1) 100%)`,
        borderBottom: `1px solid ${accent}28`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <button
            onClick={() => window.history.back()}
            style={{ fontSize: 12, fontWeight: 700, color: `${accent}b0`, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, color: `${accent}99` }}>
            Slide {currentIndex + 1} of {totalSlides}
          </span>
        </div>
        <div style={{ marginBottom: 6 }}>
          {subtopic?.topics?.name && (
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: `${accent}80`, marginBottom: 2 }}>
              {subtopic.topics.name}
            </p>
          )}
          <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{subtopic?.name ?? lesson?.title ?? ''}</p>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${progressPct}%`, transition: 'width 0.35s' }} />
        </div>
      </div>

      {/* ── Slide content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 120px' }}>
        <SlideRenderer
          slide={currentSlide}
          accent={accent}
          onUnlock={() => setUnlocked(true)}
        />
      </div>

      {/* ── Bottom nav ── */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '10px 16px 20px',
        background: V('--lesson-header', 'rgba(13,14,20,.96)'),
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}`,
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          style={{
            flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: V('--lesson-surface', '#1a1b28'), color: V('--lesson-text-muted', '#7b7f9e'),
            border: `1px solid ${V('--lesson-border', 'rgba(255,255,255,.07)')}`,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.35 : 1,
          }}
        >
          ← Prev
        </button>
        <PressNextButton onClick={goNext} disabled={!canProgress} isLast={isLast} />
      </div>
    </div>
  )
}

function PressNextButton({ onClick, disabled, isLast }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700,
        background: '#0b1330', color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: p && !disabled ? 'translateY(2px)' : '',
        boxShadow: p && !disabled ? '0 2px 0 #05070f' : '0 4px 0 #05070f',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {disabled ? 'Answer to continue' : isLast ? 'Finish ✓' : 'Next →'}
    </button>
  )
}