// src/components/ui/primitives.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES — used on every student-facing page
//
// These are the building blocks that make the app visually consistent.
// Import from here, never reinvent locally.
//
// Exports:
//   Card             — rounded-2xl, bg-card, border-default, shadow-card
//   SectionHeader    — uppercase label + optional right action
//   NavyButton       — the primary CTA (3D navy press effect)
//   SubjectPill      — coloured chip, uses resolveSubjectColors()
//   EmptyState       — consistent zero-data placeholder
//   Spinner          — loading indicator
//   StatusBadge      — correct / wrong / warning / gold inline badge
//   ProgressBar      — coloured fill bar, works in light + dark
//   ScoreRing        — SVG animated ring for scores/mastery
//   PageHeading      — h1 with sub-label
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useEffect, useRef } from 'react'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

// ── Card ──────────────────────────────────────────────────────────────────────
// The base card. Use for all content blocks.
export function Card({ children, className = '', padding = true, onClick, style = {} }) {
  const base = `bg-card border border-default rounded-2xl shadow-card overflow-hidden
    ${padding ? 'p-4' : ''}
    ${onClick ? 'cursor-pointer hover:shadow-card-lg transition-shadow active:scale-[0.99]' : ''}
    ${className}`
  return (
    <div className={base} onClick={onClick} style={style}>
      {children}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
// Uppercase section label + optional right slot (link, button, count)
export function SectionHeader({ label, right, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <p className="text-[10px] font-black text-secondary uppercase tracking-wide"
        style={{ letterSpacing: '0.09em' }}>
        {label}
      </p>
      {right && <div className="text-xs font-bold text-active">{right}</div>}
    </div>
  )
}

// ── NavyButton ────────────────────────────────────────────────────────────────
// The primary CTA. EXL navy, 3D bottom shadow, press animation.
// Use for every primary action. Never deviate from this for primary CTAs.
export function NavyButton({
  onClick, disabled = false, loading = false,
  children, className = '', size = 'md', fullWidth = true, style = {},
}) {
  const [pressed, setPressed] = useState(false)
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-5 py-3.5 text-sm rounded-2xl',
    lg: 'px-6 py-4 text-base rounded-2xl',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={`${fullWidth ? 'w-full' : ''} ${sizes[size]} font-black text-white
        flex items-center justify-center gap-2 transition-all
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        background: '#0b1330',
        transform: pressed && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: pressed && !disabled
          ? '0 2px 0 #05070f'
          : '0 6px 0 #05070f, var(--shadow-cta)',
        transition: 'transform .1s, box-shadow .1s',
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : children
      }
    </button>
  )
}

// ── SubjectPill ───────────────────────────────────────────────────────────────
// Coloured chip for a subject name. Uses resolveSubjectColors() automatically.
export function SubjectPill({ name, size = 'sm', className = '' }) {
  const isDark  = useIsDark()
  const colors  = resolveSubjectColors(name, isDark)
  const sizes   = { xs: 'text-[10px] px-2 py-0.5', sm: 'text-xs px-2.5 py-1', md: 'text-sm px-3 py-1.5' }
  return (
    <span
      className={`inline-flex items-center font-bold rounded-full ${sizes[size]} ${className}`}
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {name}
    </span>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
// Consistent zero-data placeholder. Flat illustration emoji + message.
export function EmptyState({ emoji = '📭', title, subtitle, action }) {
  return (
    <div className="bg-card border border-default rounded-2xl p-8 text-center space-y-4">
      {/* Flat illustration container — slightly tinted bg */}
      <div className="w-16 h-16 rounded-2xl bg-subtle flex items-center justify-center mx-auto">
        <span className="text-3xl">{emoji}</span>
      </div>
      <div className="space-y-1">
        <p className="font-black text-primary text-base">{title}</p>
        {subtitle && <p className="text-secondary text-sm leading-relaxed max-w-xs mx-auto">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
// Consistent loading indicator. Uses active-text colour.
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' }
  return (
    <div className={`${sizes[size]} rounded-full border-subtle animate-spin`}
      style={{ borderTopColor: 'var(--active-text)', borderColor: 'var(--bg-subtle)' }} />
  )
}

// ── PageSpinner ───────────────────────────────────────────────────────────────
// Full-page loading state.
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size="md" />
    </div>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
// Inline coloured badge: correct | wrong | warning | gold | neutral
export function StatusBadge({ type = 'neutral', children, className = '' }) {
  const styles = {
    correct: 'bg-success border-success text-success',
    wrong:   'bg-danger border-danger text-danger',
    warning: 'bg-warning border-warning text-warning',
    gold:    'text-gold',
    neutral: 'bg-subtle border-default text-secondary',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
      text-xs font-bold border ${styles[type]} ${className}`}>
      {children}
    </span>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
// Coloured fill bar. trackColor defaults to CSS token (bg-subtle).
// fillColor should be an explicit hex from resolveSubjectColors() or a status colour.
export function ProgressBar({ pct = 0, fillColor, height = 5, className = '' }) {
  const isDark   = useIsDark()
  const trackBg  = isDark ? 'rgba(255,255,255,0.08)' : '#e4e7f4'
  const fill     = fillColor ?? 'var(--active-text)'
  return (
    <div className={`rounded-full overflow-hidden ${className}`}
      style={{ height, background: trackBg }}>
      <div
        style={{
          height: '100%', borderRadius: 999,
          width: `${Math.min(Math.max(pct, 0), 100)}%`,
          background: fill,
          transition: 'width 0.7s ease',
        }}
      />
    </div>
  )
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
// Animated SVG score ring. Consistent across diagnostic results, progress page, etc.
// r=52 → circ≈326.7  |  r=40 → circ≈251.3  |  r=30 → circ≈188.5
const CIRC = { 52: 326.73, 40: 251.33, 30: 188.50 }

export function ScoreRing({ pct = 0, color, r = 52, size = 130, label, sublabel }) {
  const [dash, setDash] = useState(0)
  const [disp, setDisp] = useState(0)
  const circ = CIRC[r] ?? CIRC[52]
  const isDark = useIsDark()
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const textColor  = isDark ? '#e8ecf8' : '#0a0d1a'
  const metaColor  = isDark ? '#7a85a8' : '#4a5070'

  useEffect(() => {
    const t = setTimeout(() => { setDash(circ * pct / 100); setDisp(pct) }, 80)
    return () => clearTimeout(t)
  }, [pct, circ])

  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}60)` }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ fontSize: r > 40 ? 24 : 18, fontWeight: 800, fill: textColor, fontFamily: 'inherit' }}>
        {disp}%
      </text>
      {label && (
        <text x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontSize: 11, fill: metaColor, fontFamily: 'inherit' }}>
          {label}
        </text>
      )}
      {sublabel && (
        <text x={cx} y={cy + 28} textAnchor="middle"
          style={{ fontSize: 9, fill: metaColor, fontFamily: 'inherit' }}>
          {sublabel}
        </text>
      )}
    </svg>
  )
}

// ── PageHeading ───────────────────────────────────────────────────────────────
// Consistent h1 with optional sub-label.
export function PageHeading({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-black text-primary leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}