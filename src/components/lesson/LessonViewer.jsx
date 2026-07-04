'use client'
// src/components/lesson/LessonViewer.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// KEY CHANGES from v1:
//   1. Full light + dark via CSS var tokens — no hardcoded hex fallbacks.
//   2. Slide type pills use opaque fills (both modes) from design system.
//   3. Formula block uses a true reference-card style: bg-inset + active border.
//   4. Interaction/check slides now match QuestionCard answer states.
//   5. Summary slide uses success-bg + success-border for checkmarks.
//   6. Header uses nav-bg (blurs correctly in both modes).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'

// ── Slide type pill ────────────────────────────────────────────────────────────
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

// ── Body text (uses CSS vars) ─────────────────────────────────────────────────
function Body({ text, style = {} }) {
  if (!text) return null
  return (
    <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-sec)', margin: 0, ...style }}>
      {text}
    </p>
  )
}

// ── Hook slide ────────────────────────────────────────────────────────────────
function HookSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '18px 18px', background: `${accent}10`, border: `1.5px solid ${accent}28` }}>
      <SlidePill label="🪝 Hook" style={{ background: `${accent}18`, color: accent, borderColor: `${accent}30` }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.3 }}>
        {slide.heading}
      </p>
      <Body text={slide.body} />
    </div>
  )
}

// ── Concept / definition slide ────────────────────────────────────────────────
function ConceptSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="📖 Concept" style={{ background: `${accent}14`, color: accent, borderColor: `${accent}28` }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10, lineHeight: 1.3 }}>
        {slide.heading}
      </p>
      <Body text={slide.body} />
      {slide.example && (
        <div style={{ marginTop: 12, background: 'var(--bg-inset)', borderRadius: 10, padding: '11px 13px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 9, color: 'var(--text-tert)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Example:</p>
          <p style={{ fontSize: 13, color: 'var(--text-prim)', fontWeight: 600 }}>{slide.example}</p>
        </div>
      )}
    </div>
  )
}

// ── Formula slide ─────────────────────────────────────────────────────────────
function FormulaSlide({ slide, accent }) {
  return (
    <div style={{ borderRadius: 18, padding: '18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="⚡ Formula" style={{ background: 'var(--active-bg)', color: 'var(--active-text)', borderColor: 'var(--active-border)' }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10 }}>{slide.heading}</p>
      <Body text={slide.body} />
      {slide.formula && (
        <div style={{
          margin: '14px 0', background: 'var(--bg-inset)',
          borderRadius: 12, padding: '16px', textAlign: 'center',
          fontSize: 22, fontWeight: 800, color: 'var(--active-text)',
          letterSpacing: '0.03em', border: '1.5px solid var(--active-border)',
        }}>
          {slide.formula}
        </div>
      )}
      {slide.worked_example && (
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>
          {slide.worked_example}
        </p>
      )}
    </div>
  )
}

// ── Summary slide ─────────────────────────────────────────────────────────────
function SummarySlide({ slide }) {
  return (
    <div style={{ borderRadius: 18, padding: '18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="✅ Summary" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }} />
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 14, lineHeight: 1.3 }}>
        {slide.heading ?? "What you've learnt"}
      </p>
      {(slide.points ?? []).map((pt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
          background: 'var(--success-bg)', borderRadius: 10, padding: '9px 12px', border: '1px solid var(--success-border)' }}>
          <span style={{ color: 'var(--success)', fontSize: 14, fontWeight: 800, marginTop: 1, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: 13, color: 'var(--text-prim)', lineHeight: 1.55 }}>{pt}</span>
        </div>
      ))}
      {!slide.points && slide.body && <Body text={slide.body} />}
    </div>
  )
}

// ── Interaction / quiz slide ───────────────────────────────────────────────────
function InteractionSlide({ slide, onUnlock }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const LETTERS = ['A', 'B', 'C', 'D']

  function pick(letter) {
    if (revealed) return
    setSelected(letter)
    setRevealed(true)
    // Always unlock — let student progress regardless of correctness
    onUnlock?.()
  }

  return (
    <div style={{ borderRadius: 18, padding: '18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <SlidePill label="✏️ Check" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }} />
      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6, lineHeight: 1.35 }}>
        {slide.question}
      </p>
      {slide.body && <Body text={slide.body} style={{ marginBottom: 12 }} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {(slide.options ?? []).map((opt, i) => {
          const letter = LETTERS[i]
          const isCorrect  = letter === slide.correct_answer
          const isSelected = selected === letter
          let bg     = 'var(--bg-subtle)'
          let border = '1.5px solid var(--border)'
          let color  = 'var(--text-prim)'
          if (revealed && isCorrect)                { bg = 'var(--success-bg)'; border = '1.5px solid var(--success-border)'; color = 'var(--success)' }
          if (revealed && isSelected && !isCorrect) { bg = 'var(--danger-bg)';  border = '1.5px solid var(--danger-border)';  color = 'var(--danger)' }
          return (
            <button
              key={letter} onClick={() => pick(letter)} disabled={revealed}
              style={{ padding: '10px 12px', borderRadius: 12, background: bg, border, fontSize: 13, fontWeight: 600, color, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9, cursor: revealed ? 'default' : 'pointer', transition: 'all .12s' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--bg-inset)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {revealed && isCorrect ? '✓' : revealed && isSelected ? '✗' : letter}
              </span>
              {typeof opt === 'object' ? opt.text ?? '' : opt}
            </button>
          )
        })}
      </div>
      {revealed && (
        <p style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: selected === slide.correct_answer ? 'var(--success)' : 'var(--danger)' }}>
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
  if (type === 'hook')                                return <HookSlide       slide={slide} accent={accent} />
  if (type === 'definition' || type === 'concept')   return <ConceptSlide    slide={slide} accent={accent} />
  if (type === 'formula')                            return <FormulaSlide    slide={slide} accent={accent} />
  if (type === 'summary')                            return <SummarySlide    slide={slide} />
  if (type === 'interaction' || type === 'end_quiz') return <InteractionSlide slide={slide} onUnlock={onUnlock} />
  return (
    <div style={{ borderRadius: 18, padding: '18px', background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      {slide.heading && <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 10 }}>{slide.heading}</p>}
      {slide.body    && <Body text={slide.body} />}
    </div>
  )
}

// ── 3D press next button ──────────────────────────────────────────────────────
function PressNextButton({ onClick, disabled, isLast }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        flex: 1, padding: 13, borderRadius: 14, fontSize: 13, fontWeight: 700,
        background: '#0b1330', color: '#fff', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: p && !disabled ? 'translateY(2px)' : '',
        boxShadow: p && !disabled ? '0 2px 0 #05070f' : '0 5px 0 #05070f',
        transition: 'transform .1s, box-shadow .1s',
      }}>
      {disabled ? 'Answer to continue' : isLast ? 'Finish ✓' : 'Next →'}
    </button>
  )
}

// ── MAIN LESSON VIEWER ────────────────────────────────────────────────────────
export default function LessonViewer({ lesson, subtopic, onComplete, accentColor }) {
  const accent      = accentColor ?? '#6366f1'
  const slides      = lesson?.slides ?? []
  const totalSlides = slides.length

  const [currentIndex,  setCurrent]  = useState(0)
  const [slideUnlocked, setUnlocked] = useState(false)

  const currentSlide  = slides[currentIndex]
  const isInteraction = currentSlide?.type === 'interaction' || currentSlide?.type === 'end_quiz'
  const isLast        = currentIndex === totalSlides - 1
  const canProgress   = isInteraction ? slideUnlocked : true

  useEffect(() => { setUnlocked(false) }, [currentIndex])

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
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <button
            onClick={() => window.history.back()}
            style={{ fontSize: 12, fontWeight: 700, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>
            Slide {currentIndex + 1} of {totalSlides}
          </span>
        </div>
        <div style={{ marginBottom: 7 }}>
          {subtopic?.topics?.name && (
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tert)', marginBottom: 2 }}>
              {subtopic.topics.name}
            </p>
          )}
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>
            {subtopic?.name ?? lesson?.title ?? ''}
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${progressPct}%`, transition: 'width 0.35s' }} />
        </div>
      </div>

      {/* ── Slide content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 120px', background: 'var(--bg-base)' }}>
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
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <button
          onClick={goPrev} disabled={currentIndex === 0}
          style={{
            flex: 1, padding: 13, borderRadius: 14, fontSize: 13, fontWeight: 700,
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