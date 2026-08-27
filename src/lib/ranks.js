// src/lib/ranks.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the ExamPrep rank system.
// Import this in: profile page, leaderboard page, home dashboard, etc.
//
// 100 ranks across 10 tiers.
// Usage:
//   import { getRankProgress, getTierFromRank, RANK_NAMES, TIER_META } from '@/lib/ranks'
//   const { rank, name, tier, pct, xpToNext, nextName } = getRankProgress(xp)
// ─────────────────────────────────────────────────────────────────────────────

export const RANK_NAMES = [
  // 🟢 Rookie (1–10)
  'Newcomer', 'Beginner', 'Learner', 'Explorer', 'Starter',
  'Rookie', 'Apprentice', 'Trainee', 'Challenger', 'Initiate',
  // 🔵 Skilled (11–20)
  'Solver', 'Thinker', 'Problem Solver', 'Quick Mind', 'Sharp Mind',
  'Brainiac', 'Strategist', 'Tactician', 'Scholar', 'Achiever',
  // 🟣 Advanced (21–30)
  'Specialist', 'Expert', 'Ace', 'Mastermind', 'Genius',
  'Elite', 'Prodigy', 'Virtuoso', 'Grand Solver', 'Master Solver',
  // 🟠 Elite (31–40)
  'Elite Mind', 'Mastermind', 'Top Scholar', 'Brain Master', 'Logic Master',
  'Knowledge Master', 'Question Master', 'Challenge Master', 'Exam Master', 'Learning Master',
  // 🔴 Champion (41–50)
  'Rising Star', 'Star Scholar', 'Academic Star', 'Brain Champion', 'Knowledge Champion',
  'Quiz Champion', 'Challenge Champion', 'Exam Champion', 'Learning Champion', 'Grand Champion',
  // 🟡 Legendary (51–60)
  'Legend', 'Rising Legend', 'Scholar Legend', 'Brain Legend', 'Knowledge Legend',
  'Master Legend', 'Exam Legend', 'Learning Legend', 'Grand Legend', 'Legendary Mind',
  // ⚡ Mythic (61–70)
  'Mythic Learner', 'Mythic Solver', 'Mythic Scholar', 'Mythic Mind', 'Mythic Master',
  'Mythic Genius', 'Mythic Champion', 'Mythic Strategist', 'Mythic Legend', 'Mythic Grandmaster',
  // 👑 Royal (71–80)
  'Royal Scholar', 'Crowned Scholar', 'Scholar King', 'Scholar Elite', 'Knowledge Royalty',
  'Brain Royalty', 'Grand Scholar', 'Supreme Scholar', 'Royal Grandmaster', 'Crown Master',
  // 🌌 Endgame (81–90)
  'Cosmic Learner', 'Cosmic Solver', 'Cosmic Scholar', 'Cosmic Mind', 'Cosmic Master',
  'Infinity Scholar', 'Infinity Master', 'Eternal Scholar', 'Ultimate Mind', 'Ultimate Master',
  // 🏆 Prestige (91–100)
  'Grandmaster', 'Supreme Grandmaster', 'Legendary Grandmaster', 'Master of Masters', 'Immortal Scholar',
  'Transcendent Mind', 'Apex Scholar', 'Apex Master', 'Ultimate Scholar', 'The EXL Legend',
]

export const TIER_META = [
  { tier: 'Rookie',    icon: '🌱', color: '#22c55e', min: 1,  max: 10  },
  { tier: 'Skilled',   icon: '📘', color: '#1264E5', min: 11, max: 20  },
  { tier: 'Advanced',  icon: '⚡', color: '#7C3AED', min: 21, max: 30  },
  { tier: 'Elite',     icon: '🔶', color: '#F97316', min: 31, max: 40  },
  { tier: 'Champion',  icon: '🔴', color: '#EF4444', min: 41, max: 50  },
  { tier: 'Legendary', icon: '🟡', color: '#FFB800', min: 51, max: 60  },
  { tier: 'Mythic',    icon: '💠', color: '#18B7F2', min: 61, max: 70  },
  { tier: 'Royal',     icon: '👑', color: '#9333EA', min: 71, max: 80  },
  { tier: 'Endgame',   icon: '🌌', color: '#6366F1', min: 81, max: 90  },
  { tier: 'Prestige',  icon: '🏆', color: '#FF6A00', min: 91, max: 100 },
]

// XP thresholds — cumulative XP to REACH each rank number.
// RANK_XP[0] = XP to reach rank 1 (always 0)
// RANK_XP[99] = XP to reach rank 100
export const RANK_XP = (() => {
  const t = [0]
  for (let i = 1; i < 10;  i++) t.push(t[t.length-1] + 200  + i * 20)   // Rookie    +220–+380
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 500  + i * 50)   // Skilled   +500–+950
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 1200 + i * 100)  // Advanced  +1200–+2100
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 2500 + i * 100)  // Elite     +2500–+3400
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 3800 + i * 100)  // Champion  +3800–+4700
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 5500 + i * 100)  // Legendary +5500–+6400
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 7500 + i * 100)  // Mythic    +7500–+8400
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 9500 + i * 100)  // Royal     +9500–+10400
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 12000 + i * 100) // Endgame   +12000–+12900
  for (let i = 0; i < 10;  i++) t.push(t[t.length-1] + 15000 + i * 100) // Prestige  +15000–+15900
  return t // 101 entries — index i = threshold to reach rank (i+1)
})()

/** Returns the rank number (1–100) for a given XP total */
export function getRankFromXp(xp) {
  let rank = 1
  for (let i = RANK_XP.length - 1; i >= 0; i--) {
    if (xp >= RANK_XP[i]) { rank = i + 1; break }
  }
  return Math.min(rank, 100)
}

/** Returns tier metadata for a given rank number */
export function getTierFromRank(rank) {
  return TIER_META.find(t => rank >= t.min && rank <= t.max) ?? TIER_META[TIER_META.length - 1]
}

/**
 * Full rank progress for a given XP total.
 * Returns:
 *   rank      — current rank number (1–100)
 *   name      — rank name string
 *   tier      — tier metadata object { tier, icon, color, min, max }
 *   pct       — 0–100, progress within current rank
 *   xpToNext  — XP needed to reach next rank (0 at rank 100)
 *   nextName  — name of the next rank (null at rank 100)
 *   xpStart   — XP at start of current rank
 *   xpEnd     — XP at start of next rank
 */
export function getRankProgress(xp) {
  const rank    = getRankFromXp(xp)
  const xpStart = RANK_XP[rank - 1] ?? 0
  const xpEnd   = RANK_XP[rank]     ?? xpStart + 1
  const pct     = rank === 100 ? 100 : Math.min(100, Math.round(((xp - xpStart) / (xpEnd - xpStart)) * 100))
  const xpToNext = rank === 100 ? 0 : xpEnd - xp
  const name    = RANK_NAMES[rank - 1] ?? 'The EXL Legend'
  const tier    = getTierFromRank(rank)
  const nextName = rank < 100 ? RANK_NAMES[rank] : null
  return { rank, name, tier, pct, xpToNext, nextName, xpStart, xpEnd }
}