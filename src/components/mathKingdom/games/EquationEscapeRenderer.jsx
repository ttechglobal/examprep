'use client'
// src/components/mathkingdom/games/EquationEscapeRenderer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Game-specific room renderer for Equation Escape. Plugs into RoomRunner as
// the `RoomRenderer` prop. Handles both input_type variants from the room
// payload: 'multiple_choice' (rooms 1-7, 15-20) and 'numeric' (rooms 8-14).
//
// Trap option handling (rooms 15-20): if the student picks the trap_option,
// they see trap_explanation specifically — turning the wrong answer into a
// diagnostic moment about the EXACT mistake, not just "incorrect."
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

function normalise(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, '')
}

export default function EquationEscapeRenderer({ room, onAnswer, isDark, theme }) {
  const [selected,   setSelected]   = useState(null)
  const [numericVal, setNumericVal] = useState('')
  const [feedback,   setFeedback]   = useState(null) // { isCorrect, isTrap, message } | null

  const payload = room.payload ?? {}
  const { equation, answer, input_type, options, trap_option, trap_explanation } = payload

  useEffect(() => {
    setSelected(null)
    setNumericVal('')
    setFeedback(null)
  }, [room.id])

  const solid = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text

  const correctTheme = { solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97', darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11' }
  const wrongTheme   = { solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1', darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d' }
  const trapTheme    = { solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' }

  const handleMultipleChoiceSelect = (opt) => {
    if (feedback) return
    setSelected(opt)
    const isCorrect = normalise(opt) === normalise(answer)
    const isTrap = trap_option && normalise(opt) === normalise(trap_option)

    setFeedback({
      isCorrect,
      isTrap,
      message: isTrap ? trap_explanation : null,
    })

    // Give the student a beat to read feedback before RoomRunner advances
    setTimeout(() => onAnswer(isCorrect), isTrap ? 2200 : 900)
  }

  const handleNumericSubmit = () => {
    if (feedback || !numericVal.trim()) return
    const isCorrect = normalise(numericVal) === normalise(answer)
    setFeedback({ isCorrect, isTrap: false, message: null })
    setTimeout(() => onAnswer(isCorrect), 900)
  }

  return (
    <div className="space-y-4">
      {/* Equation display */}
      <div className="text-center py-3">
        <p className="text-2xl font-black text-primary tracking-tight">{equation}</p>
      </div>

      {/* Multiple choice */}
      {input_type === 'multiple_choice' && (
        <div className="grid grid-cols-2 gap-2.5">
          {options.map(opt => {
            const isSelected = selected === opt
            const isCorrectOpt = normalise(opt) === normalise(answer)
            const isTrapOpt = trap_option && normalise(opt) === normalise(trap_option)

            let style = { background: isDark ? '#111827' : '#ffffff', border: `2px solid ${isDark ? '#374151' : '#e5e7eb'}`, color: isDark ? '#f9fafb' : '#111827' }

            if (feedback && isSelected) {
              const t = feedback.isTrap ? trapTheme : feedback.isCorrect ? correctTheme : wrongTheme
              style = { background: isDark ? t.darkBg : t.bg, border: `2px solid ${isDark ? t.darkBorder : t.border}`, color: isDark ? t.darkText : t.text }
            } else if (feedback && isCorrectOpt) {
              style = { background: isDark ? correctTheme.darkBg : correctTheme.bg, border: `2px solid ${isDark ? correctTheme.darkBorder : correctTheme.border}`, color: isDark ? correctTheme.darkText : correctTheme.text }
            } else if (feedback) {
              style = { ...style, opacity: 0.5 }
            }

            return (
              <button
                key={opt}
                onClick={() => handleMultipleChoiceSelect(opt)}
                disabled={!!feedback}
                style={style}
                className="py-3.5 rounded-xl text-base font-black transition-all active:scale-95"
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* Numeric input */}
      {input_type === 'numeric' && (
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            inputMode="decimal"
            value={numericVal}
            onChange={(e) => setNumericVal(e.target.value)}
            disabled={!!feedback}
            placeholder="x = ?"
            onKeyDown={(e) => e.key === 'Enter' && handleNumericSubmit()}
            className="flex-1 px-4 py-3 rounded-xl text-lg font-black text-center"
            style={{
              background: isDark ? '#111827' : '#ffffff',
              border: `2px solid ${feedback ? (feedback.isCorrect ? correctTheme.solid : wrongTheme.solid) : (isDark ? '#374151' : '#e5e7eb')}`,
              color: isDark ? '#f9fafb' : '#111827',
            }}
          />
          <button
            onClick={handleNumericSubmit}
            disabled={!!feedback || !numericVal.trim()}
            className="px-5 py-3 rounded-xl text-sm font-black text-white active:scale-95 transition-all disabled:opacity-40"
            style={{ background: solid }}
          >
            Check
          </button>
        </div>
      )}

      {/* Feedback message (trap explanation gets the spotlight) */}
      {feedback?.isTrap && (
        <div className="px-4 py-3 rounded-xl text-xs leading-relaxed" style={{ background: isDark ? trapTheme.darkBg : trapTheme.bg, color: isDark ? trapTheme.darkText : trapTheme.text }}>
          <span className="font-black">Close, but watch this: </span>{feedback.message}
        </div>
      )}
      {feedback && !feedback.isTrap && !feedback.isCorrect && (
        <div className="px-4 py-3 rounded-xl text-xs leading-relaxed text-center font-bold" style={{ background: isDark ? wrongTheme.darkBg : wrongTheme.bg, color: isDark ? wrongTheme.darkText : wrongTheme.text }}>
          Not quite — try again
        </div>
      )}
      {feedback?.isCorrect && (
        <div className="px-4 py-3 rounded-xl text-xs leading-relaxed text-center font-bold" style={{ background: isDark ? correctTheme.darkBg : correctTheme.bg, color: isDark ? correctTheme.darkText : correctTheme.text }}>
          Correct! ✓
        </div>
      )}
    </div>
  )
}