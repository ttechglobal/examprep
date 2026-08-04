'use client'
// src/components/mission/MissionBriefing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The pre-mission briefing screen.
//
// What it shows:
//   • Subject icon + topic name + exam type pill
//   • 3 mission objectives (cards)
//   • Rewards row: XP · difficulty · best score (stars)
//   • Question difficulty breakdown bar (Easy / Medium / Hard)
//   • Lives (❤️ × 3)
//   • Weak-topic nudge — if mastery < 50%, nudge to EXL World first
//   • Begin Mission CTA (3D navy button)
//   • Ghost back button
//
// Adapts fully to light/dark via CSS tokens + isDark checks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { useIsDark } from '@/lib/useIsDark'

const OBJECTIVES = [
  { icon: '⚔️', text: 'Defeat all questions to complete the mission' },
  { icon: '⭐', text: 'Earn 3 stars — fewer wrong answers = higher rating' },
  { icon: '🛡️', text: 'You have 3 lives — each wrong answer costs one' },
]

export default function MissionBriefing({
  subjectName,
  topicName,
  subjectIcon,
  accent,         // hex subject accent colour
  accentBg,       // hex subject accent bg
  examType,       // 'WAEC' | 'JAMB' | 'BOTH'
  questionCount,  // total questions
  easyCount,
  mediumCount,
  hardCount,
  bestStars,      // 0-3 previous best
  masteryPct,     // 0-100 current mastery on this topic
  onBegin,
  onBack,
}) {
  const isDark = useIsDark()

  const totalXP = (easyCount ?? 3) * 10 + (mediumCount ?? 5) * 15 + (hardCount ?? 2) * 25

  // Gold
  const goldText   = isDark ? '#ffc36b' : '#b45309'
  const goldBg     = isDark ? 'rgba(255,195,107,.12)' : 'rgba(251,191,36,.1)'
  const goldBorder = isDark ? 'rgba(255,195,107,.28)' : 'rgba(217,119,6,.25)'

  // Weak topic alert
  const isWeak = (masteryPct ?? 100) < 50
  const dangerText   = isDark ? '#f87171' : '#dc2626'
  const dangerBg     = isDark ? 'rgba(248,113,113,.1)' : 'rgba(254,242,242,1)'
  const dangerBorder = isDark ? 'rgba(248,113,113,.22)' : 'rgba(254,202,202,1)'

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        height: 52, flexShrink: 0,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <button onClick={onBack} style={{
          width: 30, height: 30, borderRadius: 9,
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          color: 'var(--text-tert)', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-prim)' }}>
          Mission Briefing
        </span>
        <div style={{ width: 30 }} />
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 32px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* Subject + topic hero */}
        <div style={{
          background: isDark
            ? 'linear-gradient(160deg,#150e28 0%,#0e0a1c 55%,#0d1117 100%)'
            : 'linear-gradient(160deg,#1a1040 0%,#0f0a2e 55%,#0d1330 100%)',
          borderRadius: 22, padding: '20px',
          border: `1px solid ${accent}30`,
          boxShadow: isDark
            ? `0 20px 40px rgba(0,0,0,.5)`
            : `0 12px 32px ${accent}20, 0 4px 12px rgba(0,0,0,.15)`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient orb */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 160, height: 160, borderRadius: '50%',
            background: `radial-gradient(${accent}22, transparent)`,
            pointerEvents: 'none', filter: 'blur(30px)',
          }} />

          {/* Exam type pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px 3px 7px', borderRadius: 999, marginBottom: 14,
            background: `${accent}18`, border: `1px solid ${accent}35`,
            fontSize: 9, fontWeight: 900, color: accent,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            position: 'relative', zIndex: 1,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'block' }} />
            {examType} · Quest Mode
          </div>

          {/* Icon + topic */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 17, flexShrink: 0,
              background: `${accent}1a`, border: `1px solid ${accent}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, boxShadow: '0 8px 20px rgba(0,0,0,.35)',
            }}>
              {subjectIcon}
            </div>
            <div style={{ paddingTop: 4 }}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 3,
              }}>
                {topicName}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
                {subjectName}
              </div>
            </div>
          </div>

          {/* Mission objectives */}
          <div style={{
            background: 'rgba(0,0,0,.25)', borderRadius: 14, padding: '13px',
            border: '1px solid rgba(255,255,255,.06)', marginBottom: 14,
            position: 'relative', zIndex: 1,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: 'rgba(255,255,255,.35)', marginBottom: 10,
            }}>⚔️ Mission Objectives</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {OBJECTIVES.map(({ icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  }}>{icon}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)', lineHeight: 1.4 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, position: 'relative', zIndex: 1 }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '9px 6px', borderRadius: 12,
              background: goldBg, border: `1px solid ${goldBorder}`,
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: goldText }}>+{totalXP}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,195,107,.55)' : 'rgba(180,83,9,.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>XP Reward</div>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '9px 6px', borderRadius: 12,
              background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{questionCount}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions</div>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '9px 6px', borderRadius: 12,
              background: `${accent}14`, border: `1px solid ${accent}25`,
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>
                {bestStars > 0 ? '⭐'.repeat(bestStars) : '—'}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: `${accent}99`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Best</div>
            </div>
          </div>

          {/* Difficulty breakdown */}
          {(easyCount || mediumCount || hardCount) && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: 'rgba(255,255,255,.3)', marginBottom: 7,
              }}>Question breakdown</div>
              <div style={{ display: 'flex', gap: 4, borderRadius: 4, overflow: 'hidden' }}>
                {easyCount   > 0 && <div style={{ flex: easyCount,   height: 6, background: '#22c55e', opacity: .85 }} />}
                {mediumCount > 0 && <div style={{ flex: mediumCount, height: 6, background: '#f59e0b', opacity: .85 }} />}
                {hardCount   > 0 && <div style={{ flex: hardCount,   height: 6, background: '#ef4444', opacity: .85 }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                {easyCount   > 0 && <span style={{ fontSize: 9, color: 'rgba(34,197,94,.75)' }}>{easyCount} Easy</span>}
                {mediumCount > 0 && <span style={{ fontSize: 9, color: 'rgba(245,158,11,.75)' }}>{mediumCount} Medium</span>}
                {hardCount   > 0 && <span style={{ fontSize: 9, color: 'rgba(239,68,68,.75)' }}>{hardCount} Hard</span>}
              </div>
            </div>
          )}
        </div>

        {/* Lives row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          padding: '8px 0',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your lives
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 28 }}>❤️</span>
            <span style={{ fontSize: 28 }}>❤️</span>
            <span style={{ fontSize: 28 }}>❤️</span>
          </div>
        </div>

        {/* Weak topic nudge */}
        {isWeak && (
          <div style={{
            background: dangerBg, border: `1px solid ${dangerBorder}`,
            borderRadius: 16, padding: '13px',
            display: 'flex', alignItems: 'flex-start', gap: 11,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: dangerText, marginBottom: 3 }}>
                You're low on {topicName} mastery ({masteryPct ?? 0}%)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 9 }}>
                Study it in EXL Learning World first to boost your chances of passing.
              </div>
              <Link
                href={`/student/learn`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 9, textDecoration: 'none',
                  background: dangerBg,
                  border: `1px solid ${dangerBorder}`,
                  fontSize: 11, fontWeight: 800, color: dangerText,
                }}
              >
                Study first in EXL World →
              </Link>
            </div>
          </div>
        )}

        {/* Mastery bar */}
        {masteryPct !== undefined && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '13px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>
                {subjectIcon} {topicName} mastery
              </span>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: masteryPct >= 60 ? (isDark ? '#4ade80' : '#16a34a')
                  : masteryPct >= 30 ? (isDark ? '#fbbf24' : '#ca8a04')
                  : (isDark ? '#f87171' : '#dc2626'),
              }}>{masteryPct}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.max(masteryPct ?? 0, 2)}%`,
                background: masteryPct >= 60 ? accent
                  : masteryPct >= 30 ? '#f59e0b' : '#ef4444',
                transition: 'width .7s ease',
              }} />
            </div>
          </div>
        )}

        {/* Begin CTA */}
        <BeginButton onClick={onBegin} />

        <button
          onClick={onBack}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 14,
            background: 'transparent', border: '1.5px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--text-tert)', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// 3D navy press button
function BeginButton({ onClick }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '16px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
        letterSpacing: '-0.01em', textAlign: 'center',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p
          ? '0 2px 0 #05070f'
          : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.18)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      Begin Mission ⚔️
    </button>
  )
}
