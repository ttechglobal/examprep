'use client'
// src/components/ui/StreakBadge.jsx
// Compact streak indicator shown at the far right of the header.
// Fully theme-aware via CSS tokens — works in both light and dark mode.

export default function StreakBadge({ streak = 0 }) {
  if (streak === 0) return null

  const isHot = streak >= 7

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl
                     ${isHot
                       ? 'bg-orange-50 border border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/50'
                       : 'bg-amber-50  border border-amber-100  dark:bg-amber-950/30  dark:border-amber-900/50'
                     }`}>
      <span className="text-sm leading-none">{isHot ? '🔥' : '⚡'}</span>
      <span className={`text-xs font-black tabular-nums
                        ${isHot
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-amber-600  dark:text-amber-400'
                        }`}>
        {streak}
      </span>
    </div>
  )
}