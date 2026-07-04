// src/lib/subjectAccents.js
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all subject colours.
// Used by: practice page, session page, dashboard, progress, diagnostic results.
//
// RULE: all hex values go in inline style="" — NEVER as dynamic Tailwind classes.
// RULE: always check isDark and use the correct variant.
//
// Light mode accents are rich/saturated — they read well on white (#fff) cards.
// Dark mode accents are lifted — they read well on navy-dark (#0f1629) surfaces.
// ─────────────────────────────────────────────────────────────────────────────

export const SUBJECT_ACCENTS = {
  // ── Sciences ──────────────────────────────────────────────────────────────
  'Chemistry': {
    light:   '#7c3aed',   // violet-700
    dark:    '#a78bfa',   // violet-400
    bgLight: 'rgba(124,58,237,0.08)',
    bgDark:  'rgba(167,139,250,0.12)',
    icon:    '⚗️',
  },
  'Physics': {
    light:   '#db2777',   // pink-600
    dark:    '#f9a8d4',   // pink-300
    bgLight: 'rgba(219,39,119,0.08)',
    bgDark:  'rgba(249,168,212,0.12)',
    icon:    '⚡',
  },
  'Biology': {
    light:   '#059669',   // emerald-600
    dark:    '#6ee7b7',   // emerald-300
    bgLight: 'rgba(5,150,105,0.08)',
    bgDark:  'rgba(110,231,183,0.12)',
    icon:    '🧬',
  },
  // ── Mathematics ───────────────────────────────────────────────────────────
  'Mathematics': {
    light:   '#0369a1',   // sky-700
    dark:    '#7dd3fc',   // sky-300
    bgLight: 'rgba(3,105,161,0.08)',
    bgDark:  'rgba(125,211,252,0.12)',
    icon:    '📐',
  },
  'Further Mathematics': {
    light:   '#0369a1',
    dark:    '#7dd3fc',
    bgLight: 'rgba(3,105,161,0.08)',
    bgDark:  'rgba(125,211,252,0.12)',
    icon:    '📐',
  },
  // ── Languages ─────────────────────────────────────────────────────────────
  'English Language': {
    light:   '#7c3aed',
    dark:    '#a78bfa',
    bgLight: 'rgba(124,58,237,0.08)',
    bgDark:  'rgba(167,139,250,0.12)',
    icon:    '📖',
  },
  'Use of English': {
    light:   '#7c3aed',
    dark:    '#a78bfa',
    bgLight: 'rgba(124,58,237,0.08)',
    bgDark:  'rgba(167,139,250,0.12)',
    icon:    '📖',
  },
  'Literature in English': {
    light:   '#9333ea',   // purple-600
    dark:    '#d8b4fe',   // purple-300
    bgLight: 'rgba(147,51,234,0.08)',
    bgDark:  'rgba(216,180,254,0.12)',
    icon:    '📚',
  },
  // ── Social sciences ───────────────────────────────────────────────────────
  'Economics': {
    light:   '#b45309',   // amber-700
    dark:    '#fcd34d',   // amber-300
    bgLight: 'rgba(180,83,9,0.08)',
    bgDark:  'rgba(252,211,77,0.12)',
    icon:    '📊',
  },
  'Government': {
    light:   '#b91c1c',   // red-700
    dark:    '#fca5a5',   // red-300
    bgLight: 'rgba(185,28,28,0.08)',
    bgDark:  'rgba(252,165,165,0.12)',
    icon:    '🏛️',
  },
  'Commerce': {
    light:   '#4338ca',   // indigo-700
    dark:    '#a5b4fc',   // indigo-300
    bgLight: 'rgba(67,56,202,0.08)',
    bgDark:  'rgba(165,180,252,0.12)',
    icon:    '💼',
  },
  'Accounting': {
    light:   '#92400e',   // amber-800
    dark:    '#fde68a',   // amber-200
    bgLight: 'rgba(146,64,14,0.08)',
    bgDark:  'rgba(253,230,138,0.12)',
    icon:    '🧮',
  },
  // ── Natural/Applied sciences ──────────────────────────────────────────────
  'Geography': {
    light:   '#0f766e',   // teal-700
    dark:    '#5eead4',   // teal-300
    bgLight: 'rgba(15,118,110,0.08)',
    bgDark:  'rgba(94,234,212,0.12)',
    icon:    '🌍',
  },
  'Agricultural Science': {
    light:   '#15803d',   // green-700
    dark:    '#86efac',   // green-300
    bgLight: 'rgba(21,128,61,0.08)',
    bgDark:  'rgba(134,239,172,0.12)',
    icon:    '🌱',
  },
  'Computer Science': {
    light:   '#0e7490',   // cyan-700
    dark:    '#67e8f9',   // cyan-300
    bgLight: 'rgba(14,116,144,0.08)',
    bgDark:  'rgba(103,232,249,0.12)',
    icon:    '💻',
  },
  // ── Default fallback ──────────────────────────────────────────────────────
  'default': {
    light:   '#4338ca',   // indigo-700
    dark:    '#a5b4fc',   // indigo-300
    bgLight: 'rgba(67,56,202,0.08)',
    bgDark:  'rgba(165,180,252,0.12)',
    icon:    '📝',
  },
}

/**
 * getSubjectAccent(name, isDark)
 * Returns { accent, accentBg, icon } — the correct values for the current theme.
 *
 * @param {string} name   — subject name exactly as stored in DB
 * @param {boolean} isDark — from the useIsDark() hook
 * @returns {{ accent: string, accentBg: string, icon: string }}
 */
export function getSubjectAccent(name, isDark = false) {
  const cfg = SUBJECT_ACCENTS[name] ?? SUBJECT_ACCENTS.default
  return {
    accent:    isDark ? cfg.dark    : cfg.light,
    accentBg:  isDark ? cfg.bgDark  : cfg.bgLight,
    icon:      cfg.icon,
  }
}

/**
 * useIsDark — lightweight dark-mode hook.
 * Safe to use in any client component.
 * Returns true if the <html> element has class="dark".
 */
// Usage: import { useIsDark } from '@/lib/subjectAccents'
export function useIsDark() {
  const { useState, useEffect } = require('react')
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}