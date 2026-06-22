'use client'
// src/components/games/renderers/equation-balancer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ITERATION 3 — full layout restructure to fix "disorganised and confusing":
//
//   OLD LAYOUT (the problem): equation row + 2-column element grid + status
//   banner, all the same visual weight, no reading order, coefficient
//   steppers competing visually with formula text.
//
//   NEW LAYOUT: a single vertical "balance scale" reading order —
//     1. The equation itself, BIGGER, with coefficients visually subordinate
//        (smaller, muted until tapped) so the formulas read first
//     2. ONE unified status line directly below (not a separate banner) —
//        "2 of 3 elements balanced" with inline coloured dots, replacing the
//        flat 2-column grid that gave everything equal visual weight
//     3. Tapping the status line expands the full per-element breakdown
//        (collapsed by default — most of the "confusing" feeling came from
//        showing the full breakdown ALWAYS, even when irrelevant)
//   This creates a clear top-to-bottom hierarchy: equation → quick status →
//   detail-on-demand, instead of three competing panels.
//
// Instructions are now the shared animated InstructionsModal (popup).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import InstructionsModal from '@/components/games/shared/InstructionsModal'

function computeElementTotals(compounds, coefficients) {
  const totals = {}
  compounds.forEach((compound, i) => {
    const coef = coefficients[i] ?? 1
    Object.entries(compound.atoms).forEach(([element, count]) => {
      totals[element] = (totals[element] ?? 0) + (count * coef)
    })
  })
  return totals
}

function CoefficientChip({ value, onChange, disabled, accent, isDark }) {
  const isOne = value === 1
  return (
    <div
      className="flex items-center rounded-full transition-all"
      style={{
        background: isOne ? 'transparent' : `${accent}1a`,
        padding: isOne ? '0' : '2px 4px',
        gap: 2,
      }}
    >
      {!isOne && (
        <button onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black active:scale-90 transition-transform"
          style={{ color: accent }}>−</button>
      )}
      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="font-black tabular-nums active:scale-90 transition-transform"
        style={{
          fontSize: isOne ? 13 : 15,
          color: isOne ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : accent,
          minWidth: 16, textAlign: 'center', cursor: 'pointer', border: 'none', background: 'none',
        }}
        title="Tap to increase coefficient"
      >
        {value}
      </button>
    </div>
  )
}

function FormulaSide({ compounds, coefficients, onChangeCoef, disabled, accent, isDark }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {compounds.map((compound, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-base font-black mx-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>+</span>}
          <CoefficientChip value={coefficients[i] ?? 1} onChange={(v) => onChangeCoef(i, v)} disabled={disabled} accent={accent} isDark={isDark} />
          <span className="text-xl font-black text-primary">{compound.formula}</span>
        </div>
      ))}
    </div>
  )
}

const INSTRUCTION_STEPS = [
  { icon: '🔢', text: 'Tap a number to increase its coefficient — that\u2019s the count of molecules in the reaction.' },
  { icon: '⚖️', text: 'Every element needs the SAME total count on both sides of the arrow.' },
  { icon: '👁️', text: 'Tap "Show details" any time to see exactly which elements still need fixing.' },
]

export default function EquationBalancerRenderer({ mission: reaction, onComplete, isDark, theme, missionIndex, totalMissions }) {
  const [reactantCoefs, setReactantCoefs] = useState(() => reaction.reactants.map(() => 1))
  const [productCoefs, setProductCoefs] = useState(() => reaction.products.map(() => 1))
  const [matched, setMatched] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    setReactantCoefs(reaction.reactants.map(() => 1))
    setProductCoefs(reaction.products.map(() => 1))
    setMatched(false)
    setShowDetails(false)
  }, [reaction.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('equation_balancer_instructions_seen')) {
      setShowInstructions(true)
    }
  }, [])

  const reactantTotals = useMemo(() => computeElementTotals(reaction.reactants, reactantCoefs), [reaction.reactants, reactantCoefs])
  const productTotals = useMemo(() => computeElementTotals(reaction.products, productCoefs), [reaction.products, productCoefs])
  const allElements = useMemo(() => [...new Set([...Object.keys(reactantTotals), ...Object.keys(productTotals)])], [reactantTotals, productTotals])

  const elementStatus = allElements.map(el => ({ el, r: reactantTotals[el] ?? 0, p: productTotals[el] ?? 0, ok: (reactantTotals[el] ?? 0) === (productTotals[el] ?? 0) }))
  const balancedCount = elementStatus.filter(e => e.ok).length
  const isBalanced = balancedCount === allElements.length
  const isDefaultState = reactantCoefs.every(c => c === 1) && productCoefs.every(c => c === 1)

  useEffect(() => {
    if (isBalanced && !matched) {
      setMatched(true)
      const t = setTimeout(() => onComplete(true), 1000)
      return () => clearTimeout(t)
    }
  }, [isBalanced, matched, onComplete])

  const accent = isDark ? theme.darkSolid : theme.solid
  const softBg = isDark ? theme.darkBg : theme.bg
  const softText = isDark ? theme.darkText : theme.text
  const labBg = isDark ? '#0b0f17' : '#f8fafc'

  const handleReactantChange = (i, v) => { if (matched) return; setReactantCoefs(prev => prev.map((c, idx) => idx === i ? v : c)) }
  const handleProductChange = (i, v) => { if (matched) return; setProductCoefs(prev => prev.map((c, idx) => idx === i ? v : c)) }
  const handleReset = () => { if (matched) return; setReactantCoefs(reaction.reactants.map(() => 1)); setProductCoefs(reaction.products.map(() => 1)) }
  const handleCloseInstructions = () => { setShowInstructions(false); if (typeof window !== 'undefined') window.localStorage.setItem('equation_balancer_instructions_seen', '1') }

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes eqBalancedPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.15); } }
        .eq-balanced-pulse { animation: eqBalancedPulse 0.6s ease-in-out; }
        @keyframes eqDetailExpand { from { opacity: 0; transform: translateY(-6px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 200px; } }
        .eq-detail-expand { animation: eqDetailExpand 0.25s ease-out forwards; overflow: hidden; }
        .eq-reset-btn { transition: transform 0.12s ease; }
        .eq-reset-btn:active { transform: scale(0.92) rotate(-25deg); }
      `}</style>

      <InstructionsModal
        open={showInstructions}
        onClose={handleCloseInstructions}
        icon="⚖️"
        title="Equation Balancer"
        tagline="Balance chemical equations by adjusting coefficients"
        steps={INSTRUCTION_STEPS}
        accentColor={accent}
        isDark={isDark}
      />

      <div className="flex items-center justify-between">
        {totalMissions ? (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: softBg, color: softText }}>
            Mission {missionIndex} of {totalMissions}
          </span>
        ) : <span />}
        <button onClick={() => setShowInstructions(true)} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', fontSize: 9 }}>?</span>
          How to play
        </button>
      </div>

      <div className="rounded-xl px-4 py-3" style={{ background: softBg }}>
        <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: softText, opacity: 0.7 }}>Balance this reaction</p>
        <p className="text-base font-black" style={{ color: softText }}>{reaction.label}</p>
      </div>

      {/* STEP 1 — the equation, the clear visual hero */}
      <div className={matched ? 'eq-balanced-pulse relative rounded-2xl px-4 pt-8 pb-6' : 'relative rounded-2xl px-4 pt-8 pb-6'} style={{ background: labBg }}>
        {!isDefaultState && !matched && (
          <button onClick={handleReset} className="eq-reset-btn" title="Reset coefficients"
            style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-5M20 15a8 8 0 01-14 5" /></svg>
            Reset
          </button>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <FormulaSide compounds={reaction.reactants} coefficients={reactantCoefs} onChangeCoef={handleReactantChange} disabled={matched} accent={accent} isDark={isDark} />
          <span className="text-2xl font-black" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af' }}>→</span>
          <FormulaSide compounds={reaction.products} coefficients={productCoefs} onChangeCoef={handleProductChange} disabled={matched} accent={accent} isDark={isDark} />
        </div>
      </div>

      {/* STEP 2 — one unified status line, the only thing competing for attention */}
      <button
        onClick={() => setShowDetails(d => !d)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
        style={isBalanced
          ? { background: isDark ? '#173404' : '#eaf3de' }
          : { background: isDark ? '#1f2937' : '#f3f4f6' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {elementStatus.map(({ el, ok }) => (
              <span key={el} className="w-2 h-2 rounded-full" style={{ background: ok ? '#3b6d11' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)') }} />
            ))}
          </div>
          <span className="text-xs font-bold" style={{ color: isBalanced ? (isDark ? '#c0dd97' : '#27500a') : (isDark ? '#9ca3af' : '#6b7280') }}>
            {isBalanced ? `✓ Balanced — all ${allElements.length} elements match` : `${balancedCount} of ${allElements.length} elements balanced`}
          </span>
        </div>
        <span className="text-[10px] font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
          {showDetails ? 'Hide' : 'Show details'}
        </span>
      </button>

      {/* STEP 3 — detail on demand, not always-on */}
      {showDetails && (
        <div className="eq-detail-expand grid grid-cols-2 gap-2">
          {elementStatus.map(({ el, r, p, ok }) => (
            <div key={el} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold"
              style={ok
                ? { background: isDark ? '#173404' : '#eaf3de', color: isDark ? '#c0dd97' : '#27500a' }
                : { background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }}>
              <span>{el}</span>
              <span className="tabular-nums">{r} {ok ? '=' : '≠'} {p}</span>
            </div>
          ))}
        </div>
      )}

      {reaction.hint && <p className="text-[11px] text-tertiary text-center px-4">💡 {reaction.hint}</p>}
    </div>
  )
}