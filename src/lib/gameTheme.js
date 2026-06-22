// src/lib/gameTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for ALL game UI colours.
//
// WHY THIS FILE EXISTS:
// Tailwind v4 (this project) only generates utility classes it can statically
// scan at build time. The games components previously used template-built or
// inconsistent dark: variants (e.g. bg-purple-50 with no matching safelist
// entry in globals.css's @source inline(...) list) — these silently fail to
// generate, rendering transparent in light mode while the dark: counterpart
// (which WAS covered) rendered fine. That's the exact bug being fixed.
//
// THE FIX: every colour-coded value here is an explicit hex string, applied
// via inline `style` in components — never a Tailwind class. This mirrors
// the exact pattern already proven correct in StudyPlanCard.jsx's
// SUBJECT_STYLES map and practice/page.js's SUBJECT_STYLES comment.
//
// Structural concerns (card bg, default text, default border) still use
// the existing CSS token classes (bg-card, text-primary, border-default,
// bg-subtle, text-secondary, text-tertiary) — those ARE safelisted/global
// and work correctly already. Only colour-CODED data (game type, difficulty,
// status) goes through this file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Game type identity — fixed per engine, used everywhere a game type shows ──
export const GAME_TYPE_THEME = {
  sort_it: {
    label:     'Sort it',
    icon:      '🗂️',
    // Light mode
    solid:     '#0f6e56',   // strong teal — used for icon circles, active chips, accent bars
    bg:        '#e1f5ee',   // pale teal — card top-band, badge bg
    text:      '#085041',   // dark teal — text on pale bg
    border:    '#9fe1cb',
    // Dark mode
    darkSolid: '#1d9e75',
    darkBg:    '#04342c',
    darkText:  '#9fe1cb',
    darkBorder:'#0f6e56',
  },
  connector: {
    label:     'Match it',
    icon:      '🔗',
    solid:     '#534ab7',
    bg:        '#eeedfe',
    text:      '#3c3489',
    border:    '#cecbf6',
    darkSolid: '#7f77dd',
    darkBg:    '#26215c',
    darkText:  '#cecbf6',
    darkBorder:'#534ab7',
  },
  build_it: {
    label:     'Build it',
    icon:      '🔧',
    solid:     '#854f0b',
    bg:        '#faeeda',
    text:      '#633806',
    border:    '#fac775',
    darkSolid: '#ba7517',
    darkBg:    '#412402',
    darkText:  '#fac775',
    darkBorder:'#854f0b',
  },
}

// ── Difficulty — semantic, consistent across the whole app ───────────────────
export const DIFFICULTY_THEME = {
  easy: {
    solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97',
    darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11',
  },
  medium: {
    solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775',
    darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b',
  },
  hard: {
    solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1',
    darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d',
  },
}

// ── Result / score tiers — used for score rings, result banners ──────────────
export const RESULT_THEME = {
  great: {   // >= 80%
    solid: '#3b6d11', bg: '#eaf3de', text: '#27500a', border: '#c0dd97',
    darkSolid: '#639922', darkBg: '#173404', darkText: '#c0dd97', darkBorder: '#3b6d11',
  },
  okay: {    // 50-79%
    solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775',
    darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b',
  },
  needsWork: { // < 50%
    solid: '#a32d2d', bg: '#fcebeb', text: '#791f1f', border: '#f7c1c1',
    darkSolid: '#e24b4a', darkBg: '#501313', darkText: '#f7c1c1', darkBorder: '#a32d2d',
  },
}

// ── Bucket / pair colours for in-game elements (Sort It buckets, etc) ────────
// 6-colour rotation, each with full light/dark pairs. Used when a game config
// doesn't specify its own bucket colour — see gamesData.js buckets[].themeKey.
export const PALETTE_RING = [
  { solid: '#185fa5', bg: '#e6f1fb', text: '#0c447c', border: '#85b7eb', darkSolid: '#378add', darkBg: '#042c53', darkText: '#85b7eb', darkBorder: '#185fa5' }, // blue
  { solid: '#993c1d', bg: '#faece7', text: '#712b13', border: '#f0997b', darkSolid: '#d85a30', darkBg: '#4a1b0c', darkText: '#f0997b', darkBorder: '#993c1d' }, // coral
  { solid: '#0f6e56', bg: '#e1f5ee', text: '#085041', border: '#9fe1cb', darkSolid: '#1d9e75', darkBg: '#04342c', darkText: '#9fe1cb', darkBorder: '#0f6e56' }, // teal
  { solid: '#534ab7', bg: '#eeedfe', text: '#3c3489', border: '#cecbf6', darkSolid: '#7f77dd', darkBg: '#26215c', darkText: '#cecbf6', darkBorder: '#534ab7' }, // purple
  { solid: '#993556', bg: '#fbeaf0', text: '#72243e', border: '#ed93b1', darkSolid: '#d4537e', darkBg: '#4b1528', darkText: '#ed93b1', darkBorder: '#993556' }, // pink
  { solid: '#854f0b', bg: '#faeeda', text: '#633806', border: '#fac775', darkSolid: '#ba7517', darkBg: '#412402', darkText: '#fac775', darkBorder: '#854f0b' }, // amber
]

export function getGameTypeTheme(type) {
  return GAME_TYPE_THEME[type] ?? GAME_TYPE_THEME.sort_it
}

export function getDifficultyTheme(difficulty) {
  return DIFFICULTY_THEME[difficulty] ?? DIFFICULTY_THEME.medium
}

export function getResultTheme(pct) {
  if (pct >= 80) return RESULT_THEME.great
  if (pct >= 50) return RESULT_THEME.okay
  return RESULT_THEME.needsWork
}

export function getPaletteColor(index) {
  return PALETTE_RING[index % PALETTE_RING.length]
}

/**
 * Build a style object for a themed pill/badge — solid colour version
 * (used for active states, score badges — high visual weight)
 */
export function solidPillStyle(theme, isDark) {
  return {
    backgroundColor: isDark ? theme.darkSolid : theme.solid,
    color: '#ffffff',
  }
}

/**
 * Build a style object for a themed pill/badge — soft/tinted version
 * (used for default badges, subtle backgrounds — low visual weight)
 */
export function softPillStyle(theme, isDark) {
  return {
    backgroundColor: isDark ? theme.darkBg : theme.bg,
    color: isDark ? theme.darkText : theme.text,
    borderColor: isDark ? theme.darkBorder : theme.border,
  }
}

/**
 * Build a style object for a card's coloured top accent bar / left border.
 */
export function accentBarStyle(theme, isDark) {
  return {
    backgroundColor: isDark ? theme.darkSolid : theme.solid,
  }
}