'use client'
// src/components/games/shared/WorldHeader.jsx
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE world header. Used by every world's landing page (Math Kingdom,
// Biology Lab, Chemistry Workshop, etc.) — same layout, same elevation
// treatment, theme colour swapped per world. This is the generalised
// replacement for Math Kingdom's bespoke KingdomHeader.
// ─────────────────────────────────────────────────────────────────────────────

export default function WorldHeader({ world, level, totalXp, streak, overallMasteryPct, isDark }) {
  const cardBg = isDark ? world.theme.darkBg : world.theme.bg
  const textColor = isDark ? world.theme.darkText : world.theme.text
  const accentColor = isDark ? world.theme.darkSolid : world.theme.solid

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: cardBg }}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: textColor, opacity: 0.7 }}>{world.title}</p>
            <p className="text-lg font-black flex items-center gap-1.5" style={{ color: textColor }}>
              <span>{level.emoji}</span>{level.title}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }}>
              <span className="text-sm">🔥</span>
              <span className="text-sm font-black tabular-nums" style={{ color: textColor }}>{streak}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: textColor, opacity: 0.85 }}>{totalXp.toLocaleString()} XP</span>
          {level.nextTier && (
            <span style={{ color: textColor, opacity: 0.6 }}>{level.xpToNext} XP to {level.nextTier.title}</span>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${level.progressPct}%`, background: accentColor }} />
        </div>
      </div>

      <div className="px-5 py-3 flex items-center justify-between" style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
        <span className="text-xs font-bold" style={{ color: textColor }}>Overall {world.subject} Mastery</span>
        <span className="text-sm font-black" style={{ color: textColor }}>{overallMasteryPct}%</span>
      </div>
    </div>
  )
}