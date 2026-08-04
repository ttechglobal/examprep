'use client'
// src/components/mission/MissionComplete.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Mission complete screen.
//
// Shows:
//   • Star rating (⭐⭐⭐ animated, based on wrong answers)
//   • XP earned (large gold number, same visual language as prototype)
//   • Hearts remaining + bonus XP chip
//   • Stats: correct · wrong · accuracy%
//   • Mastery updated (old% → new%) with progress bar
//   • Next mission unlocked card (if available)
//   • Confetti burst
//   • CTAs: Play Again | Back to home
//
// Confetti uses the same colour palette as the subject accent.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useIsDark } from '@/lib/useIsDark'

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ accent }) {
  const [particles, setParticles] = useState([])
  const colors = [accent, '#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#a78bfa']

  useEffect(() => {
    const ps = Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      dur: 1.2 + Math.random() * 0.9,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: 5 + Math.random() * 7,
      h: 5 + Math.random() * 7,
      round: Math.random() > 0.5,
    }))
    setParticles(ps)
  }, []) // eslint-disable-line

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `-${8 + Math.random() * 20}px`,
            width: p.w, height: p.h,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
            animation: `confetti-fall ${p.dur}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(220px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Star animation ─────────────────────────────────────────────────────────────
function AnimatedStar({ active, delay }) {
  return (
    <span style={{
      fontSize: 40,
      filter: active
        ? 'drop-shadow(0 0 8px rgba(255,178,60,.65))'
        : 'grayscale(1) opacity(.25)',
      animation: active ? `star-pop .4s cubic-bezier(.3,1.6,.5,1) ${delay}s both` : 'none',
    }}>
      ⭐
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '13px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-tert)',
      }}>{label}</div>
    </div>
  )
}

export default function MissionComplete({
  subjectName,
  topicName,
  subjectIcon,
  accent,
  stars,          // 1-3
  correct,
  wrong,
  xp,             // total including bonus
  bonus,          // bonus XP from lives
  lives,          // lives remaining
  masteryBefore,  // 0-100
  masteryAfter,   // 0-100
  nextTopicName,  // name of next unlocked topic (or null)
  onRetry,
  onHome,
  onNextMission,
}) {
  const isDark = useIsDark()
  const total  = correct + wrong
  const pct    = total > 0 ? Math.round((correct / total) * 100) : 0

  const goldText  = isDark ? '#ffc36b' : '#b45309'
  const successC  = isDark ? '#4ade80' : '#16a34a'
  const dangerC   = isDark ? '#f87171' : '#dc2626'

  return (
    <div style={{
      minHeight: '100dvh',
      background: isDark
        ? 'radial-gradient(ellipse 130% 60% at 50% 0%, #1a0a30 0%, #0d1117 55%)'
        : 'radial-gradient(ellipse 130% 60% at 50% 0%, #f0ecff 0%, #f7f8fc 55%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto',
    }}>

      {/* Hero zone with confetti */}
      <div style={{
        width: '100%', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 22px 22px',
      }}>
        <Confetti accent={accent} />

        {/* Stars */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 14,
          position: 'relative', zIndex: 1,
        }}>
          <AnimatedStar active={stars >= 1} delay={0.1} />
          <AnimatedStar active={stars >= 2} delay={0.25} />
          <AnimatedStar active={stars >= 3} delay={0.4} />
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.15em', color: 'var(--text-tert)',
          marginBottom: 6, position: 'relative', zIndex: 1,
        }}>
          Mission Complete!
        </div>

        {/* XP number */}
        <div style={{
          fontSize: 72, fontWeight: 800, lineHeight: 1,
          background: 'linear-gradient(135deg, #ffb23c, #f59e0b, #d97706)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 4, position: 'relative', zIndex: 1,
          animation: 'xp-appear .5s cubic-bezier(.3,1.6,.5,1) .3s both',
        }}>
          +{xp}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: goldText,
          marginBottom: 16, position: 'relative', zIndex: 1,
        }}>
          XP EARNED
        </div>

        {/* Hearts remaining */}
        {lives > 0 && bonus > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', borderRadius: 14,
            background: 'rgba(239,68,68,.1)',
            border: '1px solid rgba(239,68,68,.2)',
            position: 'relative', zIndex: 1,
          }}>
            <span>{[...Array(lives)].map((_, i) => <span key={i}>❤️</span>)}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: dangerC }}>
              {lives} {lives === 1 ? 'life' : 'lives'} remaining · +{bonus} bonus XP
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 9, width: '100%', padding: '0 18px', marginBottom: 12 }}>
        <StatCard label="Correct"  value={correct}   color={successC} />
        <StatCard label="Wrong"    value={wrong}      color={dangerC} />
        <StatCard label="Accuracy" value={`${pct}%`} color={accent} />
      </div>

      {/* Content area */}
      <div style={{ width: '100%', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Mastery updated */}
        {masteryAfter !== undefined && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: '14px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: successC, marginBottom: 8,
            }}>
              📈 Mastery updated
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>
                {subjectIcon} {topicName}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: successC }}>
                {masteryBefore ?? 0}% → {masteryAfter}%
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.max(masteryAfter, 2)}%`,
                background: masteryAfter >= 70 ? accent : masteryAfter >= 50 ? '#f59e0b' : '#ef4444',
                transition: 'width .9s ease .5s',
              }} />
            </div>
            {masteryAfter >= 60 && (
              <div style={{ fontSize: 11, color: successC, marginTop: 6, fontWeight: 600 }}>
                🔓 Challenge mode unlocked!
              </div>
            )}
          </div>
        )}

        {/* Next mission unlocked */}
        {nextTopicName && (
          <div style={{
            background: isDark ? `${accent}12` : `${accent}09`,
            border: `1px solid ${accent}28`,
            borderRadius: 18, padding: '14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, color: '#fff',
              boxShadow: `0 4px 0 ${accent}60`,
            }}>🔓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>
                {nextTopicName}
              </div>
              <div style={{ fontSize: 11, color: accent, marginTop: 1 }}>
                Next mission unlocked
              </div>
            </div>
            <button
              onClick={onNextMission}
              style={{
                padding: '7px 12px', borderRadius: 10,
                background: accent, color: '#fff',
                fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer',
                boxShadow: `0 3px 0 ${accent}60`, flexShrink: 0,
              }}
            >
              Play →
            </button>
          </div>
        )}

        {/* CTAs */}
        <PlayAgainButton onClick={onRetry} />
        <button
          onClick={onHome}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 14,
            background: 'var(--bg-card)', border: '1.5px solid var(--border)',
            fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer',
          }}
        >
          Back to home
        </button>

        <div style={{ height: 24 }} />
      </div>

      <style>{`
        @keyframes xp-appear {
          from { transform: scale(.6); opacity: 0; }
          to   { transform: scale(1);  opacity: 1; }
        }
        @keyframes star-pop {
          from { transform: scale(.5) rotate(-10deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function PlayAgainButton({ onClick }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '15px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p
          ? '0 2px 0 #05070f'
          : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.18)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      Play Again ⚔️
    </button>
  )
}
