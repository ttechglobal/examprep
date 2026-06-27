'use client'
// src/components/games/renderers/chemistry-detective.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders inside AssembleRunner (mechanic: 'assemble', assembleVariant:
// 'detective'). Same MissionRenderer contract as atom-builder.jsx and
// equation-balancer.jsx: { mission, onComplete, isDark, theme, missionIndex,
// totalMissions } — here `mission` is one entry from
// CHEMISTRY_DETECTIVE_CASES.
//
// FLOW:
//   1. First clue is shown automatically. The suspect board shows all 18
//      elements, none eliminated yet.
//   2. Player can request the next clue (if any remain) or accuse at any
//      point. Each revealed clue visibly eliminates non-matching tiles.
//   3. WRONG accusation: does NOT end the case. Shows a brief "not quite"
//      flash, increments a wrongAttempts counter (which reduces final
//      score via scoreForAccusation), and returns the player to the same
//      board state — they can request more clues or accuse again.
//   4. CORRECT accusation: case closes, shows score (based on clues used
//      + wrong attempts) and the full explanation.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { getRemainingSuspects, getElementName, scoreForAccusation, ELEMENT_TABLE } from '@/lib/games/missions/chemistryDetective'

const FAMILY_COLOR = {
  alkali:    { bg: '#FAEEDA', border: '#EF9F27', text: '#633806' },
  alkaline:  { bg: '#FAECE7', border: '#F0997B', text: '#712B13' },
  metalloid: { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441' },
  metal:     { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C' },
  nonmetal:  { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041' },
  halogen:   { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E' },
  noble:     { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489' },
}

export default function ChemistryDetectiveRenderer({ mission, onComplete, missionIndex, totalMissions }) {
  const [cluesRevealed, setCluesRevealed] = useState(1) // first clue shown automatically
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [accusing, setAccusing] = useState(false)
  const [result, setResult] = useState(null) // { correct: bool, score, symbol }
  const [lastWrongSymbol, setLastWrongSymbol] = useState(null)

  const cluesApplied = useMemo(() => mission.clues.slice(0, cluesRevealed), [mission, cluesRevealed])
  const remaining = useMemo(() => getRemainingSuspects(cluesApplied), [cluesApplied])
  const remainingSymbols = useMemo(() => new Set(remaining.map(e => e.symbol)), [remaining])
  const hasMoreClues = cluesRevealed < mission.clues.length

  const handleNextClue = () => {
    if (hasMoreClues) setCluesRevealed(n => n + 1)
  }

  const handleAccuse = (symbol) => {
    const isCorrect = symbol === mission.answerSymbol
    if (isCorrect) {
      const score = scoreForAccusation(cluesRevealed, wrongAttempts)
      setResult({ correct: true, score, symbol })
    } else {
      setWrongAttempts(n => n + 1)
      setLastWrongSymbol(symbol)
      setTimeout(() => setLastWrongSymbol(null), 1200)
    }
    setAccusing(false)
  }

  if (result) {
    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-3xl">✓</p>
        <p className="text-sm font-black text-primary">
          Case closed — it was {getElementName(result.symbol)}.
        </p>
        <p className="text-xs text-secondary">
          solved with {cluesRevealed} clue{cluesRevealed > 1 ? 's' : ''}
          {wrongAttempts > 0 ? ` · ${wrongAttempts} wrong attempt${wrongAttempts > 1 ? 's' : ''}` : ''}
          {' · '}+{result.score} pts
        </p>
        <div className="rounded-2xl p-4 text-left bg-subtle">
          <p className="text-xs text-secondary leading-relaxed">{mission.explanation}</p>
        </div>
        <button
          onClick={() => onComplete?.({ correct: true, score: result.score, missionId: mission.id })}
          className="px-8 py-3 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all bg-indigo-600"
        >
          Next case →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-wide text-tertiary mb-1">
          case {missionIndex} of {totalMissions} · clue {cluesRevealed} of {mission.clues.length}
        </p>
        <div className="space-y-1.5">
          {cluesApplied.map((clue, i) => (
            <p key={i} className="text-sm font-black text-primary leading-snug">
              Clue {i + 1}: {clue.text}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {ELEMENT_TABLE.map(el => {
          const c = FAMILY_COLOR[el.family]
          const isEliminated = !remainingSymbols.has(el.symbol)
          const isWrongFlash = lastWrongSymbol === el.symbol
          return (
            <div
              key={el.symbol}
              className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all"
              style={{
                background: c.bg,
                border: isWrongFlash ? '2px solid #a32d2d' : `1.5px solid ${c.border}`,
                opacity: isEliminated ? 0.18 : 1,
                transform: isEliminated ? 'scale(0.92)' : 'scale(1)',
              }}
            >
              <span className="text-[9px] absolute top-1 left-1" style={{ color: c.text, opacity: 0.65 }}>{el.number}</span>
              <span className="text-sm font-black" style={{ color: c.text }}>{el.symbol}</span>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-tertiary">
        remaining suspects: {remaining.length}
        {wrongAttempts > 0 ? ` · ${wrongAttempts} wrong attempt${wrongAttempts > 1 ? 's' : ''} so far` : ''}
      </p>

      {!accusing ? (
        <div className="flex gap-2.5">
          <button
            onClick={handleNextClue}
            disabled={!hasMoreClues}
            className="flex-1 py-3 text-sm font-bold rounded-2xl bg-subtle disabled:opacity-40 active:scale-[0.97] transition-all"
          >
            {hasMoreClues ? 'Get next clue' : 'No more clues'}
          </button>
          <button
            onClick={() => setAccusing(true)}
            className="flex-1 py-3 text-sm font-bold rounded-2xl text-white active:scale-[0.97] transition-all bg-indigo-600"
          >
            Make accusation
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-4 bg-subtle">
          <p className="text-xs font-bold text-center mb-2.5 text-secondary">who is it?</p>
          <div className="grid grid-cols-3 gap-2">
            {remaining.map(el => (
              <button
                key={el.symbol}
                onClick={() => handleAccuse(el.symbol)}
                className="px-3 py-2.5 text-sm font-bold rounded-xl bg-card border border-default active:scale-95 transition-transform"
              >
                {el.symbol}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAccusing(false)}
            className="w-full mt-2.5 py-2 text-xs font-bold text-tertiary"
          >
            cancel
          </button>
        </div>
      )}
    </div>
  )
}