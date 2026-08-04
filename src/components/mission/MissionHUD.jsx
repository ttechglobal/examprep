'use client'
// src/components/mission/MissionHUD.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The game HUD shown above the question card during a mission.
//
// Contains:
//   ① Back arrow + subject name
//   ② Lives (❤️ × 3, grey when lost)
//   ③ Question progress dots (done-correct green / done-wrong red / current accent / upcoming grey)
//   ④ XP running total (gold pill)
//   ⑤ Difficulty chip (top-right of question area)
//
// Design:
//   • Dark bg regardless of app theme — the HUD sits on the game
//     gradient bg. But it adapts text/border to theme.
//   • Lives use emoji for instant readability and game feel.
//   • Progress dots animate width on current (pill → dot).
// ─────────────────────────────────────────────────────────────────────────────

import { useIsDark } from '@/lib/useIsDark'

const DIFF_COLORS = {
  easy:   { bg: 'rgba(34,197,94,.15)',   text: '#16a34a', border: 'rgba(34,197,94,.3)'   },
  medium: { bg: 'rgba(234,179,8,.15)',   text: '#ca8a04', border: 'rgba(234,179,8,.3)'   },
  hard:   { bg: 'rgba(239,68,68,.14)',   text: '#dc2626', border: 'rgba(239,68,68,.28)'  },
}
const DIFF_DARK = {
  easy:   { bg: 'rgba(74,222,128,.12)',  text: '#4ade80', border: 'rgba(74,222,128,.25)' },
  medium: { bg: 'rgba(251,191,36,.12)',  text: '#fbbf24', border: 'rgba(251,191,36,.25)' },
  hard:   { bg: 'rgba(248,113,113,.12)', text: '#f87171', border: 'rgba(248,113,113,.25)'},
}

export default function MissionHUD({
  subjectName,
  topicName,
  accent,         // hex — subject accent
  idx,            // 0-based current question index
  total,          // total questions
  lives,          // 0-3
  xp,             // running XP total
  results,        // [{ correct }] per answered question
  difficulty,     // 'easy' | 'medium' | 'hard'
  onBack,
}) {
  const isDark = useIsDark()

  const diff = (difficulty ?? 'easy').toLowerCase()
  const diffC = isDark ? (DIFF_DARK[diff] ?? DIFF_DARK.easy) : (DIFF_COLORS[diff] ?? DIFF_COLORS.easy)

  // Gold values
  const goldText   = isDark ? '#ffc36b' : '#b45309'
  const goldBg     = isDark ? 'rgba(255,195,107,.12)' : 'rgba(251,191,36,.1)'
  const goldBorder = isDark ? 'rgba(255,195,107,.3)'  : 'rgba(217,119,6,.28)'

  return (
    <div style={{
      flexShrink: 0,
      background: isDark ? 'rgba(13,17,23,.95)' : 'rgba(255,255,255,.95)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'}`,
      backdropFilter: 'blur(12px)',
      padding: '8px 14px',
      zIndex: 10,
    }}>

      {/* Row 1: back + subject + lives */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            width: 30, height: 30, borderRadius: 9,
            background: isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'}`,
            color: isDark ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)',
            fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: accent,
            marginBottom: 1,
          }}>
            {subjectName}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: isDark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)',
            maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {topicName}
          </div>
        </div>

        {/* Lives */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                fontSize: 16, lineHeight: 1,
                filter: i < lives ? 'none' : 'grayscale(1) opacity(0.3)',
                transition: 'filter .3s',
              }}
            >❤️</span>
          ))}
        </div>
      </div>

      {/* Row 2: progress dots + XP + difficulty */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 3, flex: 1, alignItems: 'center' }}>
          {Array.from({ length: total }).map((_, i) => {
            const isCurrent = i === idx
            const isDone    = i < idx
            const res       = results[i]
            let bg
            if (isDone && res?.correct) bg = '#22c55e'
            else if (isDone && !res?.correct) bg = '#ef4444'
            else if (isCurrent) bg = accent
            else bg = isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)'

            return (
              <div
                key={i}
                style={{
                  height: 5,
                  flex: isCurrent ? 2.5 : 1,
                  borderRadius: 3,
                  background: bg,
                  transition: 'all .25s ease',
                  boxShadow: isCurrent ? `0 0 6px ${accent}60` : 'none',
                }}
              />
            )
          })}
        </div>

        {/* XP pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: 999,
          background: goldBg, border: `1px solid ${goldBorder}`,
          fontSize: 11, fontWeight: 800, color: goldText,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 9 }}>✦</span>
          <span>{xp}</span>
        </div>

        {/* Difficulty chip */}
        <div style={{
          padding: '2px 8px', borderRadius: 6,
          background: diffC.bg, border: `1px solid ${diffC.border}`,
          fontSize: 9, fontWeight: 900, color: diffC.text,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {diff}
        </div>
      </div>
    </div>
  )
}
