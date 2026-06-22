'use client'
// src/components/games/renderers/equation-escape.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ITERATION 3 — extends the same InstructionsModal treatment used by Atom
// Builder and Equation Balancer, for consistency across Math Kingdom and
// Chem Lab. Core mechanic (multiple choice rooms 1-7/15-20, numeric input
// rooms 8-14, trap-option diagnostics) is UNCHANGED — Equation Escape
// already has a clear explicit feedback loop (tap an option / type a number
// → immediate correct/wrong feedback), so no "check button" gap existed
// here the way it did in Atom Builder.
//
// Note: this component is the ROOM RENDERER, rendered inside DungeonEngine.
// The instructions modal here covers how to answer a room — DungeonEngine
// itself (hearts, hints, room progress) is unchanged and not duplicated.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import InstructionsModal from '@/components/games/shared/InstructionsModal'

function normalise(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, '')
}

const INSTRUCTION_STEPS = [
  { icon: '🔑', text: 'Solve the equation shown in each room to unlock the next one.' },
  { icon: '👆', text: 'Some rooms give you answer choices — tap the one you think is right.' },
  { icon: '⌨️', text: 'Other rooms ask you to type the answer yourself — no options given.' },
  { icon: '❤️', text: 'You have 3 hearts per room. Running out just shows you the worked solution — you can always keep going.' },
]

export default function EquationEscapeRenderer({ room, onAnswer, isDark, theme }) {
  const [selected,   setSelected]   = useState(null)
  const [numericVal, setNumericVal] = useState('')
  const [feedback,   setFeedback]   = useState(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const payload = room.payload ?? {}
  const { equation, answer, input_type, options, trap_option, trap_explanation } = payload

  useEffect(() => {
    setSelected(null)
    setNumericVal('')
    setFeedback(null)
  }, [room.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('equation_escape_instructions_seen')) {
      setShowInstructions(true)
    }
  }, [])

  const solid = isDark ? theme.darkSolid : theme.solid

  const correctTheme = { solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97', darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11' }
  const wrongTheme   = { solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1', darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d' }
  const trapTheme    = { solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' }

  const handleCloseInstructions = () => {
    setShowInstructions(false)
    if (typeof window !== 'undefined') window.localStorage.setItem('equation_escape_instructions_seen', '1')
  }

  const handleMultipleChoiceSelect = (opt) => {
    if (feedback) return
    setSelected(opt)
    const isCorrect = normalise(opt) === normalise(answer)
    const isTrap = trap_option && normalise(opt) === normalise(trap_option)
    setFeedback({ isCorrect, isTrap, message: isTrap ? trap_explanation : null })
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
      <InstructionsModal
        open={showInstructions}
        onClose={handleCloseInstructions}
        icon="🗝️"
        title="Equation Escape"
        tagline="Solve your way through the algebra dungeon"
        steps={INSTRUCTION_STEPS}
        accentColor={solid}
        isDark={isDark}
      />

      <div className="flex justify-end">
        <button onClick={() => setShowInstructions(true)} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', fontSize: 9 }}>?</span>
          How to play
        </button>
      </div>

      <div className="text-center py-3">
        <p className="text-2xl font-black text-primary tracking-tight">{equation}</p>
      </div>

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
              <button key={opt} onClick={() => handleMultipleChoiceSelect(opt)} disabled={!!feedback} style={style} className="py-3.5 rounded-xl text-base font-black transition-all active:scale-95">
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {input_type === 'numeric' && (
        <div className="flex items-center gap-2.5">
          <input
            type="text" inputMode="decimal" value={numericVal} onChange={(e) => setNumericVal(e.target.value)}
            disabled={!!feedback} placeholder="x = ?" onKeyDown={(e) => e.key === 'Enter' && handleNumericSubmit()}
            className="flex-1 px-4 py-3 rounded-xl text-lg font-black text-center"
            style={{ background: isDark ? '#111827' : '#ffffff', border: `2px solid ${feedback ? (feedback.isCorrect ? correctTheme.solid : wrongTheme.solid) : (isDark ? '#374151' : '#e5e7eb')}`, color: isDark ? '#f9fafb' : '#111827' }}
          />
          <button onClick={handleNumericSubmit} disabled={!!feedback || !numericVal.trim()} className="px-5 py-3 rounded-xl text-sm font-black text-white active:scale-95 transition-all disabled:opacity-40" style={{ background: solid }}>
            Check
          </button>
        </div>
      )}

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