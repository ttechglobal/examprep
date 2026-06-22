'use client'
// src/components/games/shared/GameCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX for: "Cannot read properties of undefined (reading 'solid')"
//
// ROOT CAUSE: GameCard assumed every game object passed in has a fully-formed
// `accent` field. If gameRegistry.js has any entry where `accent` is missing,
// misspelled (e.g. `accents`), or the game object itself doesn't match the
// expected shape (stale/partially-migrated registry data), this component
// crashed instead of degrading gracefully.
//
// FIX: a DEFAULT_ACCENT fallback is used whenever game.accent is missing,
// and a console.warn fires identifying exactly which game id is malformed —
// so the crash becomes a visible warning instead of a broken page, and you
// can find the exact registry entry that needs fixing.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { MECHANIC_META } from '@/lib/gameRegistry'
import { getElevationShadow, getElevationBorder, getLockedCardStyle } from '@/lib/gamePremiumTokens'

// Neutral indigo fallback — used only if a game is missing its accent field,
// so the card still renders (just generically-coloured) instead of crashing.
const DEFAULT_ACCENT = {
  solid: '#6366f1', bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe',
  darkSolid: '#818cf8', darkBg: '#1e1b4b', darkText: '#a5b4fc', darkBorder: '#4338ca',
}

export default function GameCard({ game, progressPct = 0, isDark }) {
  // ── Defensive guard: game itself missing or malformed ─────────────────────
  if (!game || !game.id) {
    console.warn('[GameCard] received an invalid game object:', game)
    return null
  }

  // ── Defensive guard: accent missing — warn loudly so the real registry ────
  //    entry can be found and fixed, but never crash the page.
  if (!game.accent) {
    console.warn(
      `[GameCard] game "${game.id}" (worldId: ${game.worldId ?? 'unknown'}) is missing its "accent" field in gameRegistry.js. Using a fallback colour. Fix the registry entry to restore proper theming for this game.`
    )
  }

  const accent = game.accent ?? DEFAULT_ACCENT
  const solid = isDark ? accent.darkSolid : accent.solid
  const softBg = isDark ? accent.darkBg : accent.bg
  const softText = isDark ? accent.darkText : accent.text
  const borderHex = isDark ? accent.darkBorder : accent.border
  const mechanicMeta = MECHANIC_META[game.mechanic] ?? {}

  const cardBg = isDark ? '#111827' : '#ffffff'
  const cardBorderNeutral = isDark ? '#1f2937' : '#ede9e3'

  if (game.comingSoon) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ ...getLockedCardStyle(solid, isDark) }}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}
            >
              <span style={{ filter: 'grayscale(0.4)' }}>{game.icon ?? '🎮'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-secondary leading-snug">{game.title ?? 'Untitled game'}</p>
              <p className="text-[11px] text-tertiary mt-0.5 leading-snug">{game.tagline ?? ''}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
            style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#6b7280' : '#9ca3af' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z"/>
            </svg>
            Coming soon
          </div>
        </div>
      </div>
    )
  }

  const restingShadow = getElevationShadow('resting', solid, isDark)
  const restingBorder = getElevationBorder('resting', cardBorderNeutral, isDark)

  return (
    <Link
      href={`/student/games/${game.worldId}/${game.id}`}
      className="group block rounded-2xl overflow-hidden transition-transform duration-150"
      style={{
        background: cardBg,
        border: restingBorder,
        boxShadow: restingShadow,
      }}
    >
      <style>{`
        .gc-${game.id}:active { transform: scale(0.97); }
      `}</style>
      <div className={`gc-${game.id}`}>
        <div style={{ height: 5, background: solid }} />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: solid }}>
              <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))' }}>{game.icon ?? '🎮'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-primary leading-snug">{game.title ?? 'Untitled game'}</p>
              <p className="text-[11px] text-secondary mt-0.5 leading-snug line-clamp-2">{game.tagline ?? ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: softBg, color: softText }}>
              {mechanicMeta.icon ?? '🎮'} {mechanicMeta.label ?? game.mechanic ?? 'Game'}
            </span>
            {game.concept && (
              <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }}>
                {game.concept}
              </span>
            )}
          </div>

          {progressPct > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-tertiary">Progress</span>
                <span className="text-[10px] font-black" style={{ color: solid }}>{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#1f2937' : '#f1f5f9' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: solid }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white transition-opacity group-hover:opacity-90" style={{ background: solid }}>
            {progressPct > 0 ? 'Continue' : 'Play'}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}