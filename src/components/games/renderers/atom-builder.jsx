'use client'
// src/components/games/renderers/atom-builder.jsx
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGNED — "identify-first" Atom Builder.
//
// FLOW per mission:
//   1. Show the scenario ("An atom has 12 protons and 12 electrons.") —
//      NEVER the element name.
//   2. Student sets proton/electron (and neutron, for 'isotope' tier)
//      counts using +/- steppers until they match the target.
//   3. Once matched, "Which element have you created?" appears as
//      multiple choice (correct answer + 3 nearby-atomic-number distractors).
//   4. For 'isotope' tier missions only: a second question follows —
//      "is this the standard isotope, or a different one?" — introducing
//      mass-number reasoning once the core proton-defines-identity point
//      is already secured by question 3.
//
// Renders inside AssembleRunner (mechanic: 'assemble', assembleVariant:
// 'identify') — same engine, same onComplete contract as
// equation-balancer.jsx. AssembleRunner itself is UNCHANGED; only this
// renderer and the mission data are new.
//
// Props match AssembleRunner's MissionRenderer contract exactly:
//   mission, onComplete, isDark, theme, missionIndex, totalMissions
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { getDistractorsFor } from '@/lib/games/missions/atomBuilder'

function Counter({ label, value, onChange, color, icon }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-wide text-tertiary">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-subtle active:scale-90 transition-transform"
        >
          −
        </button>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
          style={{ background: color.bg, color: color.text, border: `1.5px solid ${color.border}` }}
        >
          {value}
        </div>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-subtle active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  )
}

const PARTICLE_COLOR = {
  protons:  { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  neutrons: { bg: '#F1EFE8', text: '#444441', border: '#B4B2A9' },
  electrons:{ bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },
}

export default function AtomBuilderRenderer({ mission, onComplete, isDark, missionIndex, totalMissions }) {
  const [protons, setProtons]   = useState(0)
  const [electrons, setElectrons] = useState(0)
  const [neutrons, setNeutrons] = useState(0)
  const [stage, setStage] = useState('building') // 'building' | 'identify' | 'isotopeCheck' | 'done'
  const [identifyChoice, setIdentifyChoice] = useState(null)
  const [isotopeChoice, setIsotopeChoice] = useState(null)

  const needsNeutrons = mission.tier === 'isotope'
  const matched =
    protons === mission.target.protons &&
    electrons === mission.target.electrons &&
    (!needsNeutrons || neutrons === mission.target.neutrons)

  const choices = useMemo(() => getDistractorsFor(mission), [mission])

  const handleLockIn = () => {
    if (matched) setStage('identify')
  }

  const handleIdentify = (choice) => {
    setIdentifyChoice(choice)
    if (needsNeutrons) {
      setTimeout(() => setStage('isotopeCheck'), 700)
    } else {
      setTimeout(() => setStage('done'), 700)
    }
  }

  const handleIsotopeCheck = (answer) => {
    setIsotopeChoice(answer)
    setTimeout(() => setStage('done'), 700)
  }

  if (stage === 'done') {
    const identityCorrect = identifyChoice?.number === mission.correctNumber
    const isotopeCorrect = !needsNeutrons || isotopeChoice === mission.isStandardIsotope
    const overallCorrect = identityCorrect && isotopeCorrect

    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-3xl">{overallCorrect ? '✨' : '📖'}</p>
        <p className="text-sm font-black text-primary">
          {identityCorrect ? `Correct — atomic number ${mission.correctNumber} is ${choices.find(c => c.number === mission.correctNumber)?.name}.` : `Not quite — it was ${choices.find(c => c.number === mission.correctNumber)?.name} (atomic number ${mission.correctNumber}).`}
        </p>
        {needsNeutrons && (
          <p className="text-xs text-secondary">
            {isotopeCorrect ? 'And you correctly identified the isotope.' : `This was actually ${mission.isStandardIsotope ? 'the standard isotope' : 'a non-standard isotope'} — mass number ${mission.massNumber}.`}
          </p>
        )}
        <div className="rounded-2xl p-4 text-left bg-subtle">
          <p className="text-xs text-secondary leading-relaxed">{mission.explanation}</p>
        </div>
        <button
          onClick={() => onComplete?.({ correct: overallCorrect, missionId: mission.id })}
          className="px-8 py-3 text-sm font-black rounded-2xl text-white active:scale-[0.97] transition-all bg-indigo-600"
        >
          Continue →
        </button>
      </div>
    )
  }

  if (stage === 'isotopeCheck') {
    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-sm font-black text-primary">Is this the standard isotope, or a different one?</p>
        <p className="text-xs text-secondary">{mission.target.protons} protons + {mission.target.neutrons} neutrons → mass number {mission.target.protons + mission.target.neutrons}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => handleIsotopeCheck(true)} className="px-5 py-3 text-sm font-bold rounded-2xl bg-subtle active:scale-95 transition-transform">
            Standard isotope
          </button>
          <button onClick={() => handleIsotopeCheck(false)} className="px-5 py-3 text-sm font-bold rounded-2xl bg-subtle active:scale-95 transition-transform">
            A different isotope
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'identify') {
    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-sm font-black text-primary">Which element have you created?</p>
        <div className="grid grid-cols-2 gap-2.5 max-w-xs mx-auto">
          {choices.map(c => (
            <button
              key={c.symbol}
              onClick={() => handleIdentify(c)}
              disabled={identifyChoice !== null}
              className="px-4 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: identifyChoice?.symbol === c.symbol
                  ? (c.number === mission.correctNumber ? '#eaf3de' : '#fcebeb')
                  : 'var(--color-background-secondary, #f3f1ec)',
                border: identifyChoice?.symbol === c.symbol
                  ? `2px solid ${c.number === mission.correctNumber ? '#3b6d11' : '#a32d2d'}`
                  : '2px solid transparent',
              }}
            >
              {c.name} <span className="opacity-50">({c.symbol})</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── BUILDING STAGE ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 py-2">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-wide text-tertiary mb-1">mission {missionIndex} of {totalMissions}</p>
        <p className="text-sm font-black text-primary leading-snug">{mission.scenario}</p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Counter label="protons" value={protons} onChange={setProtons} color={PARTICLE_COLOR.protons} />
        {needsNeutrons && (
          <Counter label="neutrons" value={neutrons} onChange={setNeutrons} color={PARTICLE_COLOR.neutrons} />
        )}
        <Counter label="electrons" value={electrons} onChange={setElectrons} color={PARTICLE_COLOR.electrons} />
      </div>

      <button
        onClick={handleLockIn}
        disabled={!matched}
        className="w-full py-3.5 text-sm font-black rounded-2xl text-white transition-all active:scale-[0.97] disabled:opacity-40"
        style={{ background: matched ? '#4f46e5' : '#9ca3af' }}
      >
        {matched ? 'Lock in atom →' : 'Set the particle counts to continue'}
      </button>
    </div>
  )
}