// src/lib/badges.js
// Badge definitions — awarded for specific student actions.
// No XP, no levels. Badges are the reward layer.

export const BADGE_DEFS = [
  // ── Lessons ──────────────────────────────────────────────────────
  { id: 'first_lesson',    emoji: '📖', label: 'First Lesson',    desc: 'Completed your first lesson',          tier: 'bronze', category: 'lessons',  threshold: 1  },
  { id: 'lessons_5',       emoji: '📚', label: 'Bookworm',        desc: 'Completed 5 lessons',                  tier: 'bronze', category: 'lessons',  threshold: 5  },
  { id: 'lessons_20',      emoji: '🎓', label: 'Scholar',         desc: 'Completed 20 lessons',                 tier: 'silver', category: 'lessons',  threshold: 20 },
  { id: 'lessons_50',      emoji: '🏛',  label: 'Academic',        desc: 'Completed 50 lessons',                 tier: 'gold',   category: 'lessons',  threshold: 50 },
  // ── Practice ─────────────────────────────────────────────────────
  { id: 'first_practice',  emoji: '✏️', label: 'First Rep',       desc: 'Completed your first practice session', tier: 'bronze', category: 'practice', threshold: 1  },
  { id: 'practice_10',     emoji: '🧠', label: 'Sharp Mind',      desc: '10 practice sessions completed',        tier: 'bronze', category: 'practice', threshold: 10 },
  { id: 'practice_25',     emoji: '⚡️', label: 'Power User',      desc: '25 practice sessions completed',        tier: 'silver', category: 'practice', threshold: 25 },
  { id: 'practice_50',     emoji: '🏆', label: 'Practice Master', desc: '50 practice sessions completed',        tier: 'gold',   category: 'practice', threshold: 50 },
  // ── Weekly Goals ─────────────────────────────────────────────────
  { id: 'goals_first_week',emoji: '🎯', label: 'Goal Getter',     desc: 'Completed all weekly goals once',       tier: 'bronze', category: 'goals',    threshold: 1  },
  { id: 'goals_3_weeks',   emoji: '🔥', label: 'Consistent',      desc: 'Completed all goals 3 weeks in a row',  tier: 'silver', category: 'goals',    threshold: 3  },
  { id: 'goals_8_weeks',   emoji: '💎', label: 'Unstoppable',     desc: 'Completed all goals 8 weeks running',   tier: 'gold',   category: 'goals',    threshold: 8  },
  // ── Streak ───────────────────────────────────────────────────────
  { id: 'streak_3',        emoji: '🌱', label: 'Sprouting',       desc: '3-day study streak',                    tier: 'bronze', category: 'streak',   threshold: 3  },
  { id: 'streak_7',        emoji: '🌟', label: 'Star Student',    desc: '7-day study streak',                    tier: 'silver', category: 'streak',   threshold: 7  },
  { id: 'streak_30',       emoji: '🦁', label: 'Lion',            desc: '30-day study streak',                   tier: 'gold',   category: 'streak',   threshold: 30 },
]

const TIER_COLORS = {
  bronze: { bg: 'bg-amber-50 dark:bg-amber-950/30',   text: 'text-amber-700 dark:text-amber-400',   ring: 'ring-amber-200 dark:ring-amber-800' },
  silver: { bg: 'bg-slate-50 dark:bg-slate-800/40',   text: 'text-slate-600 dark:text-slate-300',   ring: 'ring-slate-200 dark:ring-slate-700' },
  gold:   { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', ring: 'ring-yellow-200 dark:ring-yellow-800' },
}

export function getBadgeColors(tier) {
  return TIER_COLORS[tier] ?? TIER_COLORS.bronze
}

// Compute which badges a student has earned from their stats
export function computeEarnedBadges({ completedLessons = 0, practiceSessions = 0, streak = 0, goalsCompletedWeeks = 0 }) {
  const earned = []
  for (const b of BADGE_DEFS) {
    let val = 0
    if (b.category === 'lessons')  val = completedLessons
    if (b.category === 'practice') val = practiceSessions
    if (b.category === 'streak')   val = streak
    if (b.category === 'goals')    val = goalsCompletedWeeks
    if (val >= b.threshold) earned.push(b.id)
  }
  return earned
}