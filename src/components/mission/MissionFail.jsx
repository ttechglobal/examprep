'use client'
// src/components/mission/MissionFail.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Mission failed — all 3 lives lost.
//
// Shows:
//   • Dramatic fail visual (skull emoji + glow)
//   • Subject/topic name + "Mission failed" heading
//   • Stats: correct · wrong · XP earned
//   • Mastery meter for this topic (shows how low it is — motivates EXL)
//   • Primary CTA: Study in EXL Learning World → (goes to /student/learn)
//   • Secondary: Try Again
//   • Ghost: Back to home
//
// The mastery bar and EXL callout are the key design moment: the game failure
// creates the natural handoff to EXL Learning World. Not a warning — a consequence.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { useIsDark } from '@/lib/useIsDark'

export default function MissionFail({
  subjectName,
  topicName,
  subjectIcon,
  accent,
  correct,
  wrong,
  xp,
  masteryPct,    // current mastery on this topic
  onRetry,
  onHome,
}) {
  const isDark = useIsDark()

  const dangerText   = isDark ? '#f87171' : '#dc2626'
  const dangerBg     = isDark ? 'rgba(248,113,113,.1)' : '#fef2f2'
  const dangerBorder = isDark ? 'rgba(248,113,113,.22)' : '#fecaca'

  const goldText   = isDark ? '#ffc36b' : '#b45309'
  const goldBg     = isDark ? 'rgba(255,195,107,.1)' : 'rgba(251,191,36,.08)'
  const goldBorder = isDark ? 'rgba(255,195,107,.25)' : 'rgba(217,119,6,.22)'

  return (
    <div style={{
      minHeight: '100dvh',
      background: isDark
        ? 'radial-gradient(ellipse 120% 50% at 50% 0%, #1a0606 0%, #0d1117 60%)'
        : 'radial-gradient(ellipse 120% 50% at 50% 0%, #fff5f5 0%, #f7f8fc 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 20px 40px',
    }}>

      {/* Fail visual */}
      <div style={{
        width: 110, height: 110, borderRadius: '50%', marginBottom: 22,
        background: dangerBg,
        border: `2px solid ${dangerBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 50,
        boxShadow: `0 0 40px ${isDark ? 'rgba(248,113,113,.2)' : 'rgba(239,68,68,.12)'}`,
      }}>
        💀
      </div>

      <h1 style={{
        fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em',
        color: 'var(--text-prim)', marginBottom: 6, textAlign: 'center',
      }}>
        Mission failed.
      </h1>
      <p style={{
        fontSize: 13, color: 'var(--text-sec)', textAlign: 'center',
        maxWidth: 280, lineHeight: 1.6, marginBottom: 28,
      }}>
        You ran out of lives on <strong style={{ color: 'var(--text-prim)' }}>
          {topicName}
        </strong>. Study it in EXL World to build your mastery — then come back stronger.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 18 }}>
        <StatCard label="Correct" value={correct} color={isDark ? '#4ade80' : '#16a34a'} isDark={isDark} />
        <StatCard label="Wrong"   value={wrong}   color={dangerText}                      isDark={isDark} />
        <StatCard label="XP"      value={`+${xp}`} color={goldText}                       isDark={isDark} />
      </div>

      {/* Mastery bar — shows how low it is */}
      <div style={{
        width: '100%', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 18, padding: '14px',
        marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>
            {subjectIcon} {topicName} mastery
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: dangerText }}>
            {masteryPct ?? 0}%
          </span>
        </div>
        <div style={{
          height: 6, borderRadius: 3,
          background: isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${Math.max(masteryPct ?? 0, 2)}%`,
            background: dangerText,
            transition: 'width .8s ease',
          }} />
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 6 }}>
          You need 60%+ mastery to pass this mission consistently
        </p>
      </div>

      {/* EXL World callout */}
      <div style={{
        width: '100%',
        background: isDark ? 'rgba(255,255,255,.03)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#dde0f0'}`,
        borderRadius: 18, padding: '14px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 16,
        boxShadow: isDark ? 'none' : '0 2px 8px rgba(10,13,26,.06)',
      }}>
        <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>📚</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>
            Build your mastery first
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.55, marginBottom: 0 }}>
            Dr. Adaobi will walk you through {topicName} in EXL Learning World — interactive missions, not slides.
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Link
          href="/student/learn"
          style={{
            display: 'block', textAlign: 'center',
            padding: '15px 0', borderRadius: 14,
            background: accent, color: '#fff',
            fontSize: 15, fontWeight: 800, textDecoration: 'none',
            boxShadow: `0 6px 0 ${accent}60, 0 10px 24px ${accent}20`,
          }}
        >
          Study in EXL World →
        </Link>
        <RetryButton onClick={onRetry} />
        <button
          onClick={onHome}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 14,
            background: 'transparent', border: 'none',
            fontSize: 12, fontWeight: 600, color: 'var(--text-tert)', cursor: 'pointer',
          }}
        >
          Back to home
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, isDark }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '13px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-tert)',
      }}>
        {label}
      </div>
    </div>
  )
}

function RetryButton({ onClick }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14,
        background: 'var(--bg-card)', border: '1.5px solid var(--border)',
        fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', cursor: 'pointer',
        transform: p ? 'translateY(2px)' : 'none',
        transition: 'transform .1s',
      }}
    >
      Try again ↩
    </button>
  )
}
