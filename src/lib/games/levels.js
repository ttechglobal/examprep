// src/lib/games/levels.js
// (moved from src/lib/gameLevels.js as part of the games/ folder
//  restructure — content unchanged, only the path and this header comment
//  changed. Update any import from '@/lib/gameLevels' to
//  '@/lib/games/levels'.)
// ─────────────────────────────────────────────────────────────────────────────
// Generalised version of the old mathKingdomLevels.js — works for ANY world,
// not just Math Kingdom. Level titles are per-world (so Biology Lab's titles
// differ from Math Kingdom's) but the COMPUTATION is one shared function.
//
// Same honesty principle as before: a tier requires BOTH enough XP AND
// enough mastered topics in that world's subject — prevents pure grinding
// or pure luck from inflating the title.
// ─────────────────────────────────────────────────────────────────────────────

// Level title sets per world. Falls back to a generic set for any world
// that doesn't have bespoke titles defined.
const WORLD_LEVEL_TITLES = {
  math_kingdom: [
    { minXp: 0,    minMastered: 0,  title: 'Number Novice',      emoji: '🌱' },
    { minXp: 200,  minMastered: 1,  title: 'Algebra Apprentice', emoji: '📐' },
    { minXp: 600,  minMastered: 3,  title: 'Algebra Explorer',   emoji: '🗝️' },
    { minXp: 1200, minMastered: 6,  title: 'Equation Solver',    emoji: '⚡' },
    { minXp: 2200, minMastered: 10, title: 'Math Strategist',    emoji: '🧭' },
    { minXp: 3500, minMastered: 15, title: 'Kingdom Scholar',    emoji: '🎓' },
    { minXp: 5000, minMastered: 20, title: 'Math Sovereign',     emoji: '👑' },
  ],
  biology_lab: [
    { minXp: 0,   minMastered: 0, title: 'Curious Observer',  emoji: '🌱' },
    { minXp: 150, minMastered: 1, title: 'Lab Assistant',     emoji: '🔬' },
    { minXp: 400, minMastered: 3, title: 'Cell Specialist',   emoji: '🧫' },
    { minXp: 800, minMastered: 6, title: 'Biology Scholar',   emoji: '🎓' },
  ],
  chemistry_workshop: [
    { minXp: 0,   minMastered: 0, title: 'Apprentice Chemist', emoji: '🌱' },
    { minXp: 150, minMastered: 1, title: 'Reaction Reader',    emoji: '⚗️' },
    { minXp: 400, minMastered: 3, title: 'Compound Expert',    emoji: '🧪' },
    { minXp: 800, minMastered: 6, title: 'Master Alchemist',   emoji: '👑' },
  ],
  physics_arena: [
    { minXp: 0,   minMastered: 0, title: 'Force Seeker',     emoji: '🌱' },
    { minXp: 150, minMastered: 1, title: 'Motion Tracker',   emoji: '⚡' },
    { minXp: 400, minMastered: 3, title: 'Circuit Solver',   emoji: '🔌' },
    { minXp: 800, minMastered: 6, title: 'Physics Champion', emoji: '🏆' },
  ],
  default: [
    { minXp: 0,   minMastered: 0, title: 'Getting Started', emoji: '🌱' },
    { minXp: 150, minMastered: 1, title: 'Building Skill',  emoji: '📈' },
    { minXp: 400, minMastered: 3, title: 'Confident',       emoji: '💪' },
    { minXp: 800, minMastered: 6, title: 'Expert',          emoji: '🏆' },
  ],
}

export function computeWorldLevel(worldId, totalXp, masteredCount) {
  const tiers = WORLD_LEVEL_TITLES[worldId] ?? WORLD_LEVEL_TITLES.default

  let currentTier = tiers[0]
  let nextTier = tiers[1] ?? null

  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i]
    if (totalXp >= tier.minXp && masteredCount >= tier.minMastered) {
      currentTier = tier
      nextTier = tiers[i + 1] ?? null
      break
    }
  }

  let progressPct = 100
  let xpToNext = 0
  if (nextTier) {
    const xpRange = nextTier.minXp - currentTier.minXp
    const xpProgress = totalXp - currentTier.minXp
    progressPct = xpRange > 0 ? Math.min(100, Math.round((xpProgress / xpRange) * 100)) : 100
    xpToNext = Math.max(0, nextTier.minXp - totalXp)
  }

  return { title: currentTier.title, emoji: currentTier.emoji, currentTier, nextTier, xpToNext, progressPct }
}