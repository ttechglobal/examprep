// src/lib/levels.js
// ─────────────────────────────────────────────────────────────────────────────
// The XP level ladder shown as "Level" (Bronze → Legend) on the profile hero
// and leaderboard rows. Separate from lib/ranks.js, which is the 100-step
// "Rank N" system in the sidebar.
// ─────────────────────────────────────────────────────────────────────────────

export const LEVELS = [
  { name: 'Bronze',    tier: 'bronze',   numeral: null, minXp: 0,     maxXp: 1000     },
  { name: 'Silver I',  tier: 'silver',   numeral: 1,    minXp: 1000,  maxXp: 3000     },
  { name: 'Silver II', tier: 'silver',   numeral: 2,    minXp: 3000,  maxXp: 5000     },
  { name: 'Gold I',    tier: 'gold',     numeral: 1,    minXp: 5000,  maxXp: 8000     },
  { name: 'Gold II',   tier: 'gold',     numeral: 2,    minXp: 8000,  maxXp: 12000    },
  { name: 'Platinum',  tier: 'platinum', numeral: null, minXp: 12000, maxXp: 20000    },
  { name: 'Diamond',   tier: 'diamond',  numeral: null, minXp: 20000, maxXp: 35000    },
  { name: 'Legend',    tier: 'legend',   numeral: null, minXp: 35000, maxXp: Infinity },
]

export function getLevel(xp = 0) {
  return LEVELS.find(l => xp >= l.minXp && xp < l.maxXp) ?? LEVELS[LEVELS.length - 1]
}

export function getLevelProgress(xp = 0) {
  const index = Math.max(0, LEVELS.findIndex(l => xp >= l.minXp && xp < l.maxXp))
  const level = LEVELS[index]
  const next  = LEVELS[index + 1] ?? null
  const pct   = next ? Math.min(100, Math.round(((xp - level.minXp) / (next.minXp - level.minXp)) * 100)) : 100
  return { level, next, index, pct, xpToNext: next ? next.minXp - xp : 0 }
}
