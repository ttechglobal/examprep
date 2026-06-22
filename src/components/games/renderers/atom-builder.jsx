'use client'
// src/components/games/renderers/atom-builder.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ITERATION 3 —
//
//   1. EXPLICIT CHECK: matching is no longer silently auto-detected. The
//      player builds an atom, then taps "Check atom" for a real verdict:
//      - Correct match → the existing anticipate/payoff sequence fires
//      - Close (right element, wrong charge/isotope, or off by 1-2 particles)
//        → an honest "close, but not quite" message naming what's off
//      - Way off → an encouraging nudge to look at the target again
//      No fail state still holds — checking is free, unlimited, never
//      penalised. It just gives the player a clear verdict on demand
//      instead of leaving them guessing.
//
//   2. Instructions are now the shared animated InstructionsModal (popup,
//      not inline strip) — entrance animation, staggered steps, glowing icon.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { deriveAtomIdentity } from '@/lib/periodicTable'
import InstructionsModal from '@/components/games/shared/InstructionsModal'

const SHELL_CAPACITY = [2, 8, 8, 18]

function getShellLayout(electronCount) {
  const shells = []
  let remaining = electronCount
  for (const capacity of SHELL_CAPACITY) {
    if (remaining <= 0) break
    const inThisShell = Math.min(remaining, capacity)
    shells.push(inThisShell)
    remaining -= inThisShell
  }
  return shells
}

function Particle({ type, x, y, delay = 0 }) {
  const style = {
    proton:   { size: 18, fill: '#ff6b5a', glow: 'rgba(255,107,90,0.55)' },
    neutron:  { size: 16, fill: '#8a93a6', glow: 'rgba(138,147,166,0.35)' },
    electron: { size: 11, fill: '#5ad1ff', glow: 'rgba(90,209,255,0.65)' },
  }[type]
  return (
    <div className="atom-particle-enter" style={{
      position: 'absolute', left: x, top: y,
      width: style.size, height: style.size,
      marginLeft: -style.size / 2, marginTop: -style.size / 2,
      borderRadius: '50%', background: style.fill,
      boxShadow: `0 0 ${style.size * 0.9}px ${style.glow}`,
      animationDelay: `${delay}ms`, zIndex: type === 'electron' ? 3 : 2,
    }} />
  )
}

function Nucleus({ protons, neutrons, isMatched, isShaking, resetKey }) {
  const total = protons + neutrons
  const clusterRadius = Math.min(34, 12 + total * 1.4)
  const positions = useRef([])
  const lastResetKey = useRef(resetKey)
  if (lastResetKey.current !== resetKey) { positions.current = []; lastResetKey.current = resetKey }
  if (positions.current.length < total) {
    for (let i = positions.current.length; i < total; i++) {
      const angle = (i * 137.5) % 360
      const r = clusterRadius * Math.sqrt(i / Math.max(total, 1)) * 0.85
      positions.current.push({ x: Math.cos(angle * Math.PI / 180) * r, y: Math.sin(angle * Math.PI / 180) * r })
    }
  }
  const particles = []
  for (let i = 0; i < protons; i++) particles.push({ type: 'proton', pos: positions.current[i] })
  for (let i = 0; i < neutrons; i++) particles.push({ type: 'neutron', pos: positions.current[protons + i] })

  return (
    <div
      className={[isMatched && 'atom-nucleus-matched', isShaking && 'atom-nucleus-shake'].filter(Boolean).join(' ')}
      style={{ position: 'relative', width: clusterRadius * 2 + 24, height: clusterRadius * 2 + 24 }}
    >
      {isMatched && <div className="atom-match-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #fff', opacity: 0 }} />}
      {particles.map((p, i) => <Particle key={i} type={p.type} x={clusterRadius + 12 + p.pos.x} y={clusterRadius + 12 + p.pos.y} delay={i * 18} />)}
    </div>
  )
}

function ElectronShells({ electronCount, nucleusRadius }) {
  const shells = getShellLayout(electronCount)
  return (
    <>
      {shells.map((countInShell, shellIdx) => {
        const radius = nucleusRadius + 26 + shellIdx * 22
        return (
          <div key={shellIdx} className="atom-shell-ring" style={{
            position: 'absolute', width: radius * 2, height: radius * 2,
            left: '50%', top: '50%', marginLeft: -radius, marginTop: -radius,
            borderRadius: '50%', border: '1.5px dashed rgba(90,209,255,0.22)',
            animation: `atomShellSpin ${14 + shellIdx * 6}s linear infinite ${shellIdx % 2 ? 'reverse' : 'normal'}`,
          }}>
            {Array.from({ length: countInShell }).map((_, i) => {
              const angle = (i / countInShell) * 2 * Math.PI
              return <Particle key={i} type="electron" x={radius + Math.cos(angle) * radius} y={radius + Math.sin(angle) * radius} delay={i * 30} />
            })}
          </div>
        )
      })}
    </>
  )
}

function ParticleSourceButton({ type, label, onAdd, onRemove, count, disabled }) {
  const cfg = {
    proton:   { fill: '#ff6b5a', glow: 'rgba(255,107,90,0.4)', symbol: '+' },
    neutron:  { fill: '#8a93a6', glow: 'rgba(138,147,166,0.3)', symbol: '○' },
    electron: { fill: '#5ad1ff', glow: 'rgba(90,209,255,0.4)', symbol: '−' },
  }[type]
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ opacity: disabled ? 0.5 : 1 }}>
      <button onClick={onAdd} disabled={disabled} className="atom-source-btn" style={{
        width: 52, height: 52, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${cfg.fill}, ${cfg.fill}cc)`,
        boxShadow: `0 0 18px ${cfg.glow}, inset 0 2px 4px rgba(255,255,255,0.25)`,
        color: '#0b0f17', fontWeight: 900, fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: disabled ? 'default' : 'pointer',
      }}>{cfg.symbol}</button>
      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={onRemove} disabled={disabled || count === 0} className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', opacity: count === 0 ? 0.3 : 1 }}>−</button>
        <span className="text-sm font-black tabular-nums" style={{ color: cfg.fill, minWidth: 18, textAlign: 'center' }}>{count}</span>
        <span className="w-5 h-5" />
      </div>
    </div>
  )
}

const INSTRUCTION_STEPS = [
  { icon: '+', text: 'Tap a particle button to add one — protons and neutrons join the nucleus, electrons join a shell around it.' },
  { icon: '−', text: 'Tap the small minus next to a count to remove a particle.' },
  { icon: '✓', text: 'When you think you\u2019ve built the target, tap "Check atom" to see if you\u2019re right.' },
]

export default function AtomBuilderRenderer({ mission, onComplete, isDark, theme, missionIndex, totalMissions }) {
  const [counts, setCounts] = useState({ protons: 0, neutrons: 0, electrons: 0 })
  const [matchPhase, setMatchPhase] = useState('idle') // 'idle' | 'anticipating' | 'matched'
  const [verdict, setVerdict] = useState(null) // null | { tier: 'close'|'far', message }
  const [isShaking, setIsShaking] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [showInstructions, setShowInstructions] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    setCounts({ protons: 0, neutrons: 0, electrons: 0 })
    setMatchPhase('idle')
    setVerdict(null)
    completedRef.current = false
    setResetKey(k => k + 1)
  }, [mission.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.localStorage.getItem('atom_builder_instructions_seen')) {
      setShowInstructions(true)
    }
  }, [])

  const identity = deriveAtomIdentity(counts.protons, counts.neutrons, counts.electrons)
  const hasAnyParticles = counts.protons + counts.neutrons + counts.electrons > 0

  const handleAdd = (key) => { if (matchPhase === 'matched') return; setVerdict(null); setCounts(prev => ({ ...prev, [key]: prev[key] + 1 })) }
  const handleRemove = (key) => { if (matchPhase === 'matched') return; setVerdict(null); setCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) })) }
  const handleReset = () => { if (matchPhase === 'matched') return; setVerdict(null); setCounts({ protons: 0, neutrons: 0, electrons: 0 }); setResetKey(k => k + 1) }
  const handleCloseInstructions = () => { setShowInstructions(false); if (typeof window !== 'undefined') window.localStorage.setItem('atom_builder_instructions_seen', '1') }

  const handleCheck = () => {
    if (matchPhase === 'matched') return
    const t = mission.target
    const isExactMatch = counts.protons === t.protons && counts.neutrons === t.neutrons && counts.electrons === t.electrons

    if (isExactMatch) {
      setMatchPhase('anticipating')
      const timer = setTimeout(() => {
        setMatchPhase('matched')
        completedRef.current = true
        setTimeout(() => onComplete(true), 1100)
      }, 350)
      return () => clearTimeout(timer)
    }

    // Not a match — give an honest, specific verdict
    const protonDiff = counts.protons - t.protons
    const neutronDiff = counts.neutrons - t.neutrons
    const electronDiff = counts.electrons - t.electrons
    const totalDiff = Math.abs(protonDiff) + Math.abs(neutronDiff) + Math.abs(electronDiff)

    let message
    if (protonDiff !== 0) {
      message = `Wrong element — check your proton count.`
    } else if (electronDiff !== 0) {
      message = electronDiff > 0 ? `Too many electrons for this target.` : `Not enough electrons for this target.`
    } else if (neutronDiff !== 0) {
      message = neutronDiff > 0 ? `Too many neutrons — that's a different isotope.` : `Not enough neutrons for this isotope.`
    } else {
      message = `Not quite right yet.`
    }

    setVerdict({ tier: totalDiff <= 2 ? 'close' : 'far', message })
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 400)
  }

  const nucleusRadius = Math.min(34, 12 + (counts.protons + counts.neutrons) * 1.4)
  const accentColor = isDark ? theme.darkSolid : theme.solid

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes atomShellSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes atomParticleEnter { 0% { opacity:0; transform: scale(0.2) translateY(-40px); } 60% { opacity:1; transform: scale(1.15) translateY(2px); } 100% { opacity:1; transform: scale(1) translateY(0); } }
        .atom-particle-enter { animation: atomParticleEnter 0.45s cubic-bezier(0.34,1.56,0.64,1) backwards; }
        @keyframes atomMatchBurst { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
        .atom-nucleus-matched { animation: atomMatchBurst 0.6s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes atomMatchRingExpand { 0% { transform: scale(0.8); opacity:0.9; } 100% { transform: scale(2.4); opacity:0; } }
        .atom-match-ring { animation: atomMatchRingExpand 0.7s ease-out forwards; }
        @keyframes atomShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .atom-nucleus-shake { animation: atomShake 0.35s ease; }
        .atom-source-btn { transition: transform 0.12s cubic-bezier(0.34,1.56,0.64,1); }
        .atom-source-btn:active { transform: scale(0.88); }
        .atom-reset-btn { transition: transform 0.12s ease; }
        .atom-reset-btn:active { transform: scale(0.92) rotate(-25deg); }
        @keyframes checkBtnPulse { 0%,100% { box-shadow: 0 0 0 ${accentColor}55; } 50% { box-shadow: 0 0 18px ${accentColor}55; } }
        .atom-check-btn-ready { animation: checkBtnPulse 1.6s ease-in-out infinite; }
      `}</style>

      <InstructionsModal
        open={showInstructions}
        onClose={handleCloseInstructions}
        icon="⚛️"
        title="Atom Builder"
        tagline="Build atoms from particles and test what you've made"
        steps={INSTRUCTION_STEPS}
        accentColor="#5ad1ff"
        isDark={isDark}
      />

      <div className="flex items-center justify-between">
        {totalMissions ? (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: isDark ? theme.darkBg : theme.bg, color: isDark ? theme.darkText : theme.text }}>
            Mission {missionIndex} of {totalMissions}
          </span>
        ) : <span />}
        <button onClick={() => setShowInstructions(true)} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
          <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)', fontSize: 9 }}>?</span>
          How to play
        </button>
      </div>

      <div className="rounded-xl px-4 py-3" style={{ background: isDark ? theme.darkBg : theme.bg }}>
        <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: isDark ? theme.darkText : theme.text, opacity: 0.7 }}>Mission</p>
        <p className="text-base font-black" style={{ color: isDark ? theme.darkText : theme.text }}>{mission.label}</p>
      </div>

      <div className={isShaking ? '' : ''} style={{ position: 'relative', background: '#0b0f17', borderRadius: 20, height: 240, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasAnyParticles && matchPhase !== 'matched' && (
          <button onClick={handleReset} className="atom-reset-btn" title="Reset this mission" style={{
            position: 'absolute', top: 10, right: 10, zIndex: 5, width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-5M20 15a8 8 0 01-14 5" />
            </svg>
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <ElectronShells electronCount={counts.electrons} nucleusRadius={nucleusRadius} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Nucleus protons={counts.protons} neutrons={counts.neutrons} isMatched={matchPhase === 'matched'} isShaking={isShaking} resetKey={resetKey} />
          </div>
        </div>

        <div style={{ position: 'absolute', left: 14, bottom: 12 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>{identity.label}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{identity.description}</p>
        </div>
      </div>

      {/* Verdict / target readout */}
      {matchPhase === 'matched' ? (
        <div className="text-center py-2.5 rounded-xl text-xs font-bold" style={{ background: isDark ? '#173404' : '#eaf3de', color: isDark ? '#c0dd97' : '#27500a' }}>
          ✓ That's {mission.targetLabel}!
        </div>
      ) : verdict ? (
        <div className="text-center py-2.5 rounded-xl text-xs font-bold" style={
          verdict.tier === 'close'
            ? { background: isDark ? '#412402' : '#faeeda', color: isDark ? '#fac775' : '#633806' }
            : { background: isDark ? '#501313' : '#fcebeb', color: isDark ? '#f7c1c1' : '#791f1f' }
        }>
          {verdict.tier === 'close' ? '🟡 ' : '🔴 '}{verdict.message}
        </div>
      ) : (
        <div className="text-center py-2.5 rounded-xl text-xs font-bold" style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }}>
          Target: {mission.targetLabel}
        </div>
      )}

      <div className="flex items-center justify-center gap-5 py-2">
        <ParticleSourceButton type="proton" label="Proton" count={counts.protons} disabled={matchPhase === 'matched'} onAdd={() => handleAdd('protons')} onRemove={() => handleRemove('protons')} />
        <ParticleSourceButton type="neutron" label="Neutron" count={counts.neutrons} disabled={matchPhase === 'matched'} onAdd={() => handleAdd('neutrons')} onRemove={() => handleRemove('neutrons')} />
        <ParticleSourceButton type="electron" label="Electron" count={counts.electrons} disabled={matchPhase === 'matched'} onAdd={() => handleAdd('electrons')} onRemove={() => handleRemove('electrons')} />
      </div>

      {/* Explicit check action */}
      {matchPhase !== 'matched' && (
        <button
          onClick={handleCheck}
          disabled={!hasAnyParticles}
          className={hasAnyParticles ? 'atom-check-btn-ready' : ''}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 16,
            background: hasAnyParticles ? accentColor : (isDark ? '#1f2937' : '#f3f4f6'),
            color: hasAnyParticles ? '#0b0f17' : (isDark ? '#6b7280' : '#9ca3af'),
            fontWeight: 900, fontSize: 14, border: 'none',
            cursor: hasAnyParticles ? 'pointer' : 'default',
          }}
        >
          Check atom
        </button>
      )}

      {mission.hint && <p className="text-[11px] text-tertiary text-center px-4">💡 {mission.hint}</p>}
    </div>
  )
}