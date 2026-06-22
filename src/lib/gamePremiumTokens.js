// src/lib/gamePremiumTokens.js
// ─────────────────────────────────────────────────────────────────────────────
// The premium visual system. Four elevation levels, used consistently across
// EVERY game screen — worlds hub, world landing, game cards, play screens,
// result screens. A component never invents a one-off shadow value; it asks
// "what elevation am I" and applies the matching token.
//
// This is what makes 20+ games across many subjects feel like one coherent
// premium product instead of N independently-styled screens. The visual
// grammar is learned once by the eye and reused everywhere.
//
// All shadow values are LIGHT-MODE shadows by default (shadows read as
// "wrong" in dark mode — dark mode uses border emphasis instead, per the
// `darkTreatment` field on each level).
// ─────────────────────────────────────────────────────────────────────────────

export const ELEVATION = {
  // Level 0 — flat. Locked content, inactive backgrounds, disabled states.
  flat: {
    shadow:        'none',
    borderWidth:   1.5,
    scale:         1,
    darkTreatment: { borderOpacity: 0.4 },
  },

  // Level 1 — resting card. Default state for game cards, world cards.
  resting: {
    shadowColorOpacity: 0.10,  // multiply against the card's own accent colour
    shadowBlur:         14,
    shadowY:             3,
    borderWidth:        1.5,
    scale:               1,
    darkTreatment: { shadow: 'none', borderOpacity: 1 },
  },

  // Level 2 — raised/active. Pressed state, selected/focused card, hover.
  raised: {
    shadowColorOpacity: 0.18,
    shadowBlur:         22,
    shadowY:              6,
    borderWidth:         2,
    scale:             0.97,  // applied on :active, not at rest
    darkTreatment: { shadow: 'none', borderOpacity: 1, borderWidthDark: 2 },
  },

  // Level 3 — modal/celebration. Result screens, badge unlocks, level-ups.
  modal: {
    shadowColorOpacity: 0.28,
    shadowBlur:         40,
    shadowY:            16,
    borderWidth:          0,
    scale:                1,
    darkTreatment: { shadow: '0 16px 40px rgba(0,0,0,0.5)', borderOpacity: 0 },
  },
}

/**
 * Build a CSS box-shadow string for a given elevation + accent colour.
 * Pass the accent's solid hex (light) or darkSolid hex (dark mode) —
 * the shadow tints toward that colour rather than generic black, which
 * is what makes cards feel like premium, colour-coordinated objects
 * rather than generic boxes with a grey shadow slapped on.
 *
 * @param {'flat'|'resting'|'raised'|'modal'} level
 * @param {string} accentHex - the card's accent colour
 * @param {boolean} isDark
 */
export function getElevationShadow(level, accentHex, isDark) {
  const e = ELEVATION[level]
  if (isDark) return e.darkTreatment?.shadow ?? 'none'
  if (level === 'flat') return 'none'
  return `0 ${e.shadowY}px ${e.shadowBlur}px ${hexToRgba(accentHex, e.shadowColorOpacity)}`
}

/**
 * Build the border style for a given elevation.
 */
export function getElevationBorder(level, borderHex, isDark) {
  const e = ELEVATION[level]
  const width = isDark && e.darkTreatment?.borderWidthDark ? e.darkTreatment.borderWidthDark : e.borderWidth
  if (width === 0) return 'none'
  return `${width}px solid ${borderHex}`
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Motion timing — consistent across every game ─────────────────────────────
export const MOTION = {
  pressScale:        'scale(0.97)',
  pressTransition:   'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
  cardEnter:         'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
  countUpDuration:   700,   // ms — score ring / number count-ups, used everywhere
  resultRevealDelay: 150,   // ms — small pause before result screen content fades in
}

// ── Celebration tiers — intensity scales with the significance of the event ──
// A room-complete should feel different from a dungeon-complete, which
// should feel different from a brand-new badge unlock. Same visual language
// (pulse + count-up), different scale/duration so significance is FELT, not
// just stated in text.
export const CELEBRATION_TIERS = {
  small:  { scale: 1.0,  pulseCount: 1, confettiCount: 0,  duration: 280 },  // single room/question correct
  medium: { scale: 1.08, pulseCount: 2, confettiCount: 12, duration: 500 },  // full game/dungeon complete
  large:  { scale: 1.15, pulseCount: 3, confettiCount: 30, duration: 800 },  // new badge, level-up, world mastery
}

/**
 * Locked-state styling — used for any card/content the student hasn't
 * unlocked yet. Premium treatment: NOT just greyed-out and flat. A subtle
 * lock icon overlay, slightly reduced opacity (not heavily greyed), and a
 * faint accent-coloured glow hint at what's behind it — communicates
 * "something good is waiting" rather than "this is broken/unavailable."
 */
export function getLockedCardStyle(accentHex, isDark) {
  return {
    opacity: isDark ? 0.55 : 0.65,
    background: isDark ? '#0a0f1a' : '#fafafa',
    border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: `inset 0 0 24px ${hexToRgba(accentHex, isDark ? 0.06 : 0.04)}`,
  }
}