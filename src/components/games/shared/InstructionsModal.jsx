'use client'
// src/components/games/shared/InstructionsModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ONE shared, animated instructions modal — used by Atom Builder, Equation
// Balancer, Equation Escape, and any future game. Replaces the flat inline
// strip with a real overlay: backdrop fade-in, panel scale+slide entrance,
// staggered reveal of each instruction line (each line animates in with a
// short delay after the previous), and a satisfying "Let's go" exit.
//
// Each game supplies: icon, title, tagline, steps (array of {icon, text}),
// accentColor, and a localStorage key for "seen" persistence (handled by
// the CALLING component, not this modal — this modal is pure presentation).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export default function InstructionsModal({ open, onClose, icon, title, tagline, steps, accentColor, isDark }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [open])

  if (!open) return null

  const panelBg = isDark ? '#161b26' : '#ffffff'
  const textPrimary = isDark ? '#f9fafb' : '#111827'
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
        transition: 'background 0.25s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes instrPanelIn {
          0%   { transform: translateY(40px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes instrIconPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes instrStepIn {
          0%   { transform: translateX(-12px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes instrGlowPulse {
          0%, 100% { box-shadow: 0 0 0px var(--instr-glow); }
          50%      { box-shadow: 0 0 28px var(--instr-glow); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: panelBg, borderRadius: '24px 24px 0 0',
          padding: '8px 24px 28px',
          animation: visible ? 'instrPanelIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
              background: `radial-gradient(circle at 35% 30%, ${accentColor}, ${accentColor}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
              animation: 'instrIconPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s backwards',
              '--instr-glow': `${accentColor}66`,
              boxShadow: `0 0 20px ${accentColor}55`,
            }}
          >
            {icon}
          </div>
          <p style={{ fontSize: 18, fontWeight: 900, color: textPrimary, margin: 0 }}>{title}</p>
          {tagline && <p style={{ fontSize: 12, color: textSecondary, margin: '4px 0 0' }}>{tagline}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 12px', borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                animation: `instrStepIn 0.35s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s backwards`,
              }}
            >
              <span
                style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: `${accentColor}22`, color: accentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900,
                }}
              >
                {step.icon ?? i + 1}
              </span>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: textPrimary, margin: 0, paddingTop: 3 }}>{step.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 16,
            background: accentColor, color: '#0b0f17', fontWeight: 900, fontSize: 14,
            border: 'none', cursor: 'pointer',
            animation: `instrStepIn 0.35s cubic-bezier(0.16,1,0.3,1) ${0.2 + steps.length * 0.1}s backwards`,
          }}
        >
          Let's go →
        </button>
      </div>
    </div>
  )
}