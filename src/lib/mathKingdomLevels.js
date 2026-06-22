// src/lib/mathKingdomLevels.js
// ─────────────────────────────────────────────────────────────────────────────
// Level title computation — pure function, same pattern as getMasteryLevel()
// in theme.js. No new DB column. Computed fresh from existing data:
//   - total Math Kingdom points (points_log, reason='math_kingdom_room', summed)
//   - count of MASTERED Math topics in student_topic_mastery
//
// This keeps the level title always honest — it can never drift out of sync
// with actual mastery data because it's derived, not stored.
// ─────────────────────────────────────────────────────────────────────────────

export const LEVEL_TIERS = [
  { minXp: 0,    minMastered: 0,  title: 'Number Novice',    emoji: '🌱' },
  { minXp: 200,  minMastered: 1,  title: 'Algebra Apprentice', emoji: '📐' },
  { minXp: 600,  minMastered: 3,  title: 'Algebra Explorer',  emoji: '🗝️' },
  { minXp: 1200, minMastered: 6,  title: 'Equation Solver',   emoji: '⚡' },
  { minXp: 2200, minMastered: 10, title: 'Math Strategist',   emoji: '🧭' },
  { minXp: 3500, minMastered: 15, title: 'Kingdom Scholar',   emoji: '🎓' },
  { minXp: 5000, minMastered: 20, title: 'Math Sovereign',    emoji: '👑' },
]

/**
 * Compute the student's Math Kingdom level title.
 * A tier is reached when BOTH thresholds are met (xp AND mastered count) —
 * prevents pure grinding from outpacing actual mastery, and prevents
 * lucky mastery from outpacing actual play.
 *
 * @param {number} totalXp        - sum of math_kingdom_room points_log rows
 * @param {number} masteredCount  - count of Math topics at status='mastered'
 * @returns {{ title, emoji, currentTier, nextTier, xpToNext, progressPct }}
 */
export function computeMathKingdomLevel(totalXp, masteredCount) {
  let currentTier = LEVEL_TIERS[0]
  let nextTier = LEVEL_TIERS[1] ?? null

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    const tier = LEVEL_TIERS[i]
    if (totalXp >= tier.minXp && masteredCount >= tier.minMastered) {
      currentTier = tier
      nextTier = LEVEL_TIERS[i + 1] ?? null
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

  return {
    title: currentTier.title,
    emoji: currentTier.emoji,
    currentTier,
    nextTier,
    xpToNext,
    progressPct,
  }
}