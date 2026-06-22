'use client'
// src/components/games/engines/AssembleEngine.jsx (Counter variant)
// ─────────────────────────────────────────────────────────────────────────────
// ATOM BUILDER — the counter-based Assemble mechanic.
//
// Student adjusts 3 independent counters (protons/neutrons/electrons).
// Result is derived LIVE on every change via deriveAtomIdentity() — no
// submit button needed to see what you've built, only to confirm a mission
// target is reached.
//
// SOFT MISTAKES: there is no "wrong answer" state. The atom you've built is
// just... whatever you've built. The UI tells you clearly whether it
// matches the current mission, and lets you keep adjusting freely. This is
// the natural shape for "no fail state" — the interaction itself doesn't
// have a concept of being wrong, only "not yet matching."
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { deriveAtomIdentity, getElementByZ } from '@/lib/periodicTable'

const COUNTER_CONFIG = [
  { key: 'protons',   label: 'Protons',   symbol: '+', color: '#dc2626', bg: '#fef2f2', darkBg: '#450a0a', darkColor: '#f87171' },
  { key: 'neutrons',  label: 'Neutrons',  symbol: '○', color: '#6b7280', bg: '#f3f4f6', darkBg: '#1f2937', darkColor: '#9ca3af' },
  { key: 'electrons', label: 'Electrons', symbol: '−', color: '#2563eb', bg: '#eff6ff', darkBg: '#172554', darkColor: '#60a5fa' },
]

// ── Visual atom diagram — nucleus with proton/neutron dots, electron ring ────
function AtomDiagram({ protons, neutrons, electrons, isDark, solid }) {
  const nucleusSize = Math.min(56, 28 + (protons + neutrons) * 1.2)
  const ringRadius = nucleusSize / 2 + 28

  // Distribute electrons around the ring (simple even spacing, not real shells)
  const electronDots = Array.from({ length: Math.min(electrons, 18) }).map((_, i) => {
    const angle = (i / Math.max(electrons, 1)) * 2 * Math.PI
    const x = Math.cos(angle) * ringRadius
    const y = Math.sin(angle) * ringRadius
    return { x, y }
  })

  return (
    <div className="relative flex items-center justify-center" style={{ height: ringRadius * 2 + 32 }}>
      {/* Electron orbit ring */}
      <div
        className="absolute rounded-full border-2 border-dashed"
        style={{ width: ringRadius * 2, height: ringRadius * 2, borderColor: isDark ? 'rgba(96,165,250,0.3)' : 'rgba(37,99,235,0.25)' }}
      />
      {/* Electrons */}
      {electronDots.map((pos, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            background: isDark ? '#60a5fa' : '#2563eb',
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: 'transform 0.3s ease',
          }}
        />
      ))}
      {/* Nucleus */}
      <div
        className="rounded-full flex items-center justify-center font-black text-white transition-all duration-300"
        style={{ width: nucleusSize, height: nucleusSize, background: solid, fontSize: nucleusSize * 0.32 }}
      >
        {protons + neutrons}
      </div>
    </div>
  )
}

function CounterControl({ config, value, onChange, isDark }) {
  const bg = isDark ? config.darkBg : config.bg
  const color = isDark ? config.darkColor : config.color

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: bg }}>
      <span className="text-base font-black w-6 text-center" style={{ color }}>{config.symbol}</span>
      <span className="text-xs font-bold flex-1" style={{ color }}>{config.label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm active:scale-90 transition-transform"
        style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color }}
      >
        −
      </button>
      <span className="text-base font-black w-7 text-center tabular-nums" style={{ color }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm active:scale-90 transition-transform"
        style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color }}
      >
        +
      </button>
    </div>
  )
}

/**
 * mission shape:
 * {
 *   id, label: "Build Sodium",
 *   target: { protons: 11, neutrons: 12, electrons: 11 },
 *   targetLabel: "Na",      // what success looks like
 *   hint: "Sodium has atomic number 11",
 *   topicId,
 * }
 */
export default function AtomBuilderRenderer({ mission, onComplete, isDark, theme }) {
  const [counts, setCounts] = useState({ protons: 0, neutrons: 0, electrons: 0 })
  const [matched, setMatched] = useState(false)

  useEffect(() => {
    setCounts({ protons: 0, neutrons: 0, electrons: 0 })
    setMatched(false)
  }, [mission.id])

  const identity = deriveAtomIdentity(counts.protons, counts.neutrons, counts.electrons)

  const isTargetMatch =
    counts.protons === mission.target.protons &&
    counts.neutrons === mission.target.neutrons &&
    counts.electrons === mission.target.electrons

  useEffect(() => {
    if (isTargetMatch && !matched) {
      setMatched(true)
      const t = setTimeout(() => onComplete(true), 900) // small celebratory beat before advancing
      return () => clearTimeout(t)
    }
  }, [isTargetMatch, matched, onComplete])

  const solid = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text

  const handleChange = (key, value) => {
    if (matched) return
    setCounts(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Mission */}
      <div className="rounded-xl px-4 py-3" style={{ background: softBg }}>
        <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: softText, opacity: 0.7 }}>Mission</p>
        <p className="text-base font-black" style={{ color: softText }}>{mission.label}</p>
      </div>

      {/* Live atom visual */}
      <AtomDiagram {...counts} isDark={isDark} solid={isTargetMatch ? '#16a34a' : solid} />

      {/* Live identity readout */}
      <div className="text-center">
        <p className="text-2xl font-black text-primary">{identity.label}</p>
        <p className="text-xs text-secondary mt-0.5">{identity.description}</p>
      </div>

      {/* Match indicator */}
      <div
        className="text-center py-2.5 rounded-xl text-xs font-bold transition-colors"
        style={
          isTargetMatch
            ? { background: isDark ? '#173404' : '#eaf3de', color: isDark ? '#c0dd97' : '#27500a' }
            : { background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }
        }
      >
        {isTargetMatch ? `✓ That's ${mission.targetLabel}!` : `Target: ${mission.targetLabel}`}
      </div>

      {/* Counters */}
      <div className="space-y-2">
        {COUNTER_CONFIG.map(cfg => (
          <CounterControl
            key={cfg.key}
            config={cfg}
            value={counts[cfg.key]}
            onChange={(v) => handleChange(cfg.key, v)}
            isDark={isDark}
          />
        ))}
      </div>

      {mission.hint && (
        <p className="text-[11px] text-tertiary text-center px-4">💡 {mission.hint}</p>
      )}
    </div>
  )
}