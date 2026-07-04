'use client'
// src/components/ui/HeaderXPPill.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The XP pill shown in the app header — directly from the prototype design.
//
// Prototype spec (v3):
//   .xp-pill {
//     display: flex; align-items: center; gap: 5px;
//     background: var(--gold-fill);  ← gold-tinted background
//     border: 1.5px solid var(--gold);
//     padding: 4px 10px;
//     border-radius: 999px;          ← fully rounded pill
//     font-size: 11px; font-weight: 700;
//     color: var(--gold);
//   }
//   Content: "✦ 240 XP"
//
// Additionally shows a streak badge when streak >= 3 days,
// separated by a subtle divider.
//
// Points update live via PointsContext — the pill pulses briefly on award.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { useIsDark } from '@/lib/useIsDark'

export default function HeaderXPPill({ points: initialPoints, streak = 0 }) {
  const { totalPoints, toast } = usePoints()
  const isDark = useIsDark()
  const [pulse, setPulse] = useState(false)

  // Use context points (live) but fall back to SSR-passed initial value
  const displayPoints = totalPoints > 0 ? totalPoints : (initialPoints ?? 0)
  const formattedXP = displayPoints >= 1000
    ? `${(displayPoints / 1000).toFixed(1)}k`
    : String(displayPoints)

  // Pulse on points award
  useEffect(() => {
    if (!toast) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 700)
    return () => clearTimeout(t)
  }, [toast])

  const isHotStreak = streak >= 7

  // Gold values — light mode uses amber-600 family, dark uses gold bright
  const goldText   = isDark ? '#ffc36b' : '#b45309'
  const goldBg     = isDark ? 'rgba(255,195,107,0.12)' : 'rgba(251,191,36,0.12)'
  const goldBorder = isDark ? 'rgba(255,195,107,0.35)' : 'rgba(217,119,6,0.35)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* Streak badge — only when streak >= 3 */}
      {streak >= 3 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 9px',
          borderRadius: 999,
          background: isHotStreak
            ? (isDark ? 'rgba(251,146,60,0.15)' : 'rgba(251,146,60,0.1)')
            : (isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)'),
          border: `1.5px solid ${isHotStreak
            ? (isDark ? 'rgba(251,146,60,0.4)' : 'rgba(251,146,60,0.3)')
            : (isDark ? 'rgba(251,191,36,0.35)' : 'rgba(217,119,6,0.25)')}`,
          fontSize: 11,
          fontWeight: 700,
          color: isHotStreak
            ? (isDark ? '#fb923c' : '#c2410c')
            : (isDark ? '#ffc36b' : '#b45309'),
          transition: 'all .2s',
        }}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>
            {isHotStreak ? '🔥' : '⚡'}
          </span>
          <span style={{ lineHeight: 1 }}>{streak}</span>
        </div>
      )}

      {/* XP pill — ✦ NNN XP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 999,
          background: goldBg,
          border: `1.5px solid ${goldBorder}`,
          fontSize: 11,
          fontWeight: 700,
          color: goldText,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          transform: pulse ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
          cursor: 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 10, lineHeight: 1 }}>✦</span>
        <span>{formattedXP} XP</span>
      </div>
    </div>
  )
}