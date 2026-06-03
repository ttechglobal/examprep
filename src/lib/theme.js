// src/lib/theme.js
// FULL REWRITE — every color entry now has explicit dark: variants.
// Rule: light-only classes like bg-blue-50 or text-blue-700 are NEVER used alone.
// Every bg, text, border, and light entry carries its dark: counterpart.
// This file is the single source of truth for all subject/mastery colors.

export const SUBJECT_COLORS = {
  'Mathematics': {
    bg:     'bg-blue-50 dark:bg-blue-950/40',
    text:   'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'bg-blue-500 dark:bg-blue-400',
    light:  'bg-blue-100 dark:bg-blue-900/40',
  },
  'Further Mathematics': {
    bg:     'bg-sky-50 dark:bg-sky-950/40',
    text:   'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    accent: 'bg-sky-500 dark:bg-sky-400',
    light:  'bg-sky-100 dark:bg-sky-900/40',
  },
  'English Language': {
    bg:     'bg-purple-50 dark:bg-purple-950/40',
    text:   'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    accent: 'bg-purple-500 dark:bg-purple-400',
    light:  'bg-purple-100 dark:bg-purple-900/40',
  },
  'Physics': {
    bg:     'bg-cyan-50 dark:bg-cyan-950/40',
    text:   'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
    accent: 'bg-cyan-500 dark:bg-cyan-400',
    light:  'bg-cyan-100 dark:bg-cyan-900/40',
  },
  'Chemistry': {
    bg:     'bg-green-50 dark:bg-green-950/40',
    text:   'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    accent: 'bg-green-500 dark:bg-green-400',
    light:  'bg-green-100 dark:bg-green-900/40',
  },
  'Biology': {
    bg:     'bg-emerald-50 dark:bg-emerald-950/40',
    text:   'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    accent: 'bg-emerald-500 dark:bg-emerald-400',
    light:  'bg-emerald-100 dark:bg-emerald-900/40',
  },
  'Economics': {
    bg:     'bg-amber-50 dark:bg-amber-950/40',
    text:   'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    accent: 'bg-amber-500 dark:bg-amber-400',
    light:  'bg-amber-100 dark:bg-amber-900/40',
  },
  'Government': {
    bg:     'bg-red-50 dark:bg-red-950/40',
    text:   'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    accent: 'bg-red-500 dark:bg-red-400',
    light:  'bg-red-100 dark:bg-red-900/40',
  },
  'Literature in English': {
    bg:     'bg-pink-50 dark:bg-pink-950/40',
    text:   'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    accent: 'bg-pink-500 dark:bg-pink-400',
    light:  'bg-pink-100 dark:bg-pink-900/40',
  },
  'Geography': {
    bg:     'bg-teal-50 dark:bg-teal-950/40',
    text:   'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    accent: 'bg-teal-500 dark:bg-teal-400',
    light:  'bg-teal-100 dark:bg-teal-900/40',
  },
  'Agricultural Science': {
    bg:     'bg-lime-50 dark:bg-lime-950/40',
    text:   'text-lime-700 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-800',
    accent: 'bg-lime-500 dark:bg-lime-400',
    light:  'bg-lime-100 dark:bg-lime-900/40',
  },
  'default': {
    bg:     'bg-indigo-50 dark:bg-indigo-950/40',
    text:   'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    accent: 'bg-indigo-500 dark:bg-indigo-400',
    light:  'bg-indigo-100 dark:bg-indigo-900/40',
  },
}

export function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.default
}

// ─── Mastery levels — all bg/color values carry dark: variants ────────────────
export function getMasteryLevel(pct) {
  if (pct >= 80) return {
    label: 'Mastered',
    color: 'text-green-600 dark:text-green-400',
    bg:    'bg-green-100 dark:bg-green-900/40',
    emoji: '🏆',
  }
  if (pct >= 60) return {
    label: 'Getting there',
    color: 'text-blue-600 dark:text-blue-400',
    bg:    'bg-blue-100 dark:bg-blue-900/40',
    emoji: '📈',
  }
  if (pct >= 40) return {
    label: 'Building',
    color: 'text-yellow-600 dark:text-yellow-400',
    bg:    'bg-yellow-100 dark:bg-yellow-900/40',
    emoji: '🔨',
  }
  if (pct >= 20) return {
    label: 'Just started',
    color: 'text-orange-600 dark:text-orange-400',
    bg:    'bg-orange-100 dark:bg-orange-900/40',
    emoji: '🌱',
  }
  return {
    label: 'Not started',
    color: 'text-secondary',
    bg:    'bg-subtle',
    emoji: '💤',
  }
}

// ─── Nudge messages — keyed by context ───────────────────────────────────────
export const NUDGES = {
  streak: [
    n => `${n} day streak! You're building a real habit 🔥`,
    n => `${n} days in a row — consistency is everything 💪`,
  ],
  improvement: [
    (sub, pct) => `You improved ${pct}% in ${sub} this week 📈`,
    (sub, pct) => `${pct}% better in ${sub} — you're moving 🚀`,
  ],
  goal: [
    (sub, grade) => `You're getting closer to your ${grade} in ${sub} 🎯`,
    (sub) => `Don't forget — you're aiming high in ${sub} 💡`,
  ],
  general: [
    "Small steps every day add up to big results 🌟",
    "Every question you answer makes you sharper 🧠",
    "Your future self will thank you for studying today 📚",
    "You're doing better than you think. Keep going 💙",
    "Consistency beats talent. Show up today 🏃",
  ],
}

export function getRandomNudge(type, ...args) {
  const pool = NUDGES[type]
  if (!pool?.length) return NUDGES.general[Math.floor(Math.random() * NUDGES.general.length)]
  const fn = pool[Math.floor(Math.random() * pool.length)]
  return typeof fn === 'function' ? fn(...args) : fn
}

// ─── Exam type badge colors — used wherever WAEC/JAMB/BOTH badges appear ─────
// These are used inline (not subject cards), so we use border + bg + text combos.
export const EXAM_BADGE_COLORS = {
  WAEC: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  JAMB: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  BOTH: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
}

export function getExamBadgeColor(examType) {
  return EXAM_BADGE_COLORS[examType] ?? EXAM_BADGE_COLORS.BOTH
}

// ─── Difficulty badge colors ──────────────────────────────────────────────────
export const DIFFICULTY_COLORS = {
  easy:   'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  hard:   'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

export function getDifficultyColor(difficulty) {
  return DIFFICULTY_COLORS[difficulty?.toLowerCase()] ?? DIFFICULTY_COLORS.medium
}

// ─── Status colors (for admin content status badges) ─────────────────────────
export const STATUS_COLORS = {
  published: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  in_review: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  draft:     'bg-subtle text-secondary',
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.draft
}