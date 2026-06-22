// src/lib/subjectTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// THE canonical subject colour map. Single source of truth.
//
// WHY THIS FILE EXISTS:
// A near-identical SUBJECT_STYLES hex map was independently duplicated in:
//   - StudyPlanCard.jsx
//   - LearnPage.jsx
//   - profile/page.js
//   - study-plan/[topicId]/page.js
//   - mathKingdomTheme.js (re-invented for the 5 Math Kingdom games)
//   - gamesData.js / gameTheme.js (re-invented again for Sort/Match/Build)
//
// Every duplicate drifted slightly (different hex values, some missing
// subjects, different field names). This file is the fix: ONE map, every
// page and every game imports from here. Updating "Physics" blue updates
// it everywhere, forever, in one place.
//
// USAGE: always apply via inline style (background, color), never as a
// Tailwind class string — this is the proven fix for the Tailwind v4
// safelist bug already documented elsewhere in this codebase
// (see practice/page.js's own comment on the same issue).
// ─────────────────────────────────────────────────────────────────────────────

export const SUBJECT_THEME = {
  'Mathematics':                 { solid: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', darkSolid: '#60a5fa', darkBg: '#172554', darkText: '#93c5fd', darkBorder: '#1d4ed8' },
  'Further Mathematics':         { solid: '#0ea5e9', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', darkSolid: '#38bdf8', darkBg: '#0c4a6e', darkText: '#7dd3fc', darkBorder: '#0369a1' },
  'English Language':            { solid: '#a855f7', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', darkSolid: '#c084fc', darkBg: '#3b0764', darkText: '#d8b4fe', darkBorder: '#7e22ce' },
  'Use of English':              { solid: '#a855f7', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', darkSolid: '#c084fc', darkBg: '#3b0764', darkText: '#d8b4fe', darkBorder: '#7e22ce' },
  'Physics':                     { solid: '#06b6d4', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', darkSolid: '#22d3ee', darkBg: '#083344', darkText: '#67e8f9', darkBorder: '#0e7490' },
  'Chemistry':                   { solid: '#22c55e', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', darkSolid: '#4ade80', darkBg: '#052e16', darkText: '#86efac', darkBorder: '#15803d' },
  'Biology':                     { solid: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', darkSolid: '#34d399', darkBg: '#022c22', darkText: '#6ee7b7', darkBorder: '#047857' },
  'Economics':                   { solid: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a', darkSolid: '#fbbf24', darkBg: '#451a03', darkText: '#fcd34d', darkBorder: '#b45309' },
  'Government':                  { solid: '#ef4444', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', darkSolid: '#f87171', darkBg: '#450a0a', darkText: '#fca5a5', darkBorder: '#b91c1c' },
  'Literature in English':       { solid: '#ec4899', bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8', darkSolid: '#f472b6', darkBg: '#500724', darkText: '#f9a8d4', darkBorder: '#9d174d' },
  'Geography':                   { solid: '#14b8a6', bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', darkSolid: '#2dd4bf', darkBg: '#042f2e', darkText: '#5eead4', darkBorder: '#0f766e' },
  'Agricultural Science':        { solid: '#84cc16', bg: '#f7fee7', text: '#4d7c0f', border: '#d9f99d', darkSolid: '#a3e635', darkBg: '#1a2e05', darkText: '#bef264', darkBorder: '#4d7c0f' },
  'Commerce':                    { solid: '#6366f1', bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', darkSolid: '#818cf8', darkBg: '#1e1b4b', darkText: '#a5b4fc', darkBorder: '#4338ca' },
  'History':                     { solid: '#f97316', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', darkSolid: '#fb923c', darkBg: '#431407', darkText: '#fdba74', darkBorder: '#c2410c' },
  'Accounting':                  { solid: '#eab308', bg: '#fefce8', text: '#a16207', border: '#fef08a', darkSolid: '#facc15', darkBg: '#1e1700', darkText: '#fde047', darkBorder: '#a16207' },
  'Computer Science':            { solid: '#0ea5e9', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', darkSolid: '#38bdf8', darkBg: '#0c4a6e', darkText: '#7dd3fc', darkBorder: '#0369a1' },
  'Civic Education':             { solid: '#22c55e', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', darkSolid: '#4ade80', darkBg: '#052e16', darkText: '#86efac', darkBorder: '#166534' },
  'Christian Religious Studies': { solid: '#d946ef', bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe', darkSolid: '#e879f9', darkBg: '#4a044e', darkText: '#f0abfc', darkBorder: '#86198f' },
  'Islamic Religious Studies':   { solid: '#fb923c', bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', darkSolid: '#fdba74', darkBg: '#431407', darkText: '#fed7aa', darkBorder: '#9a3412' },
  'Yoruba':                      { solid: '#ca8a04', bg: '#fef9c3', text: '#713f12', border: '#fde047', darkSolid: '#eab308', darkBg: '#1e1700', darkText: '#fde68a', darkBorder: '#713f12' },
  'Igbo':                        { solid: '#ca8a04', bg: '#fef9c3', text: '#713f12', border: '#fde047', darkSolid: '#eab308', darkBg: '#1e1700', darkText: '#fde68a', darkBorder: '#713f12' },
  'Hausa':                       { solid: '#ca8a04', bg: '#fef9c3', text: '#713f12', border: '#fde047', darkSolid: '#eab308', darkBg: '#1e1700', darkText: '#fde68a', darkBorder: '#713f12' },
  'default':                     { solid: '#6366f1', bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', darkSolid: '#818cf8', darkBg: '#1e1b4b', darkText: '#a5b4fc', darkBorder: '#4338ca' },
}

export function getSubjectTheme(name) {
  return SUBJECT_THEME[name] ?? SUBJECT_THEME.default
}

/**
 * Resolve to the correct light/dark values for direct use in inline style.
 * Usage: const c = resolveSubjectColors('Physics', isDark)
 *        <div style={{ background: c.bg, color: c.text }}>
 */
export function resolveSubjectColors(name, isDark) {
  const t = getSubjectTheme(name)
  return {
    solid:  isDark ? t.darkSolid  : t.solid,
    bg:     isDark ? t.darkBg     : t.bg,
    text:   isDark ? t.darkText   : t.text,
    border: isDark ? t.darkBorder : t.border,
  }
}