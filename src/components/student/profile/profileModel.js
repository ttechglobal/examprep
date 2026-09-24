// src/components/student/profile/profileModel.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure data + helpers for the profile page. No React, no DOM — safe to unit test.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand colours used by the edit sheets (unchanged from profile v4) ────────
export const NAVY   = '#062A78'
export const BLUE   = '#1264E5'
export const GOLD   = '#FFB800'
export const ORANGE = '#FF6A00'
export const GREEN  = '#22c55e'
export const RED    = '#f43f5e'

// ── Profile rank ladder (Bronze → Legend) ────────────────────────────────────
export const RANKS = [
  { name: 'Bronze',    minXp: 0,     maxXp: 1000     },
  { name: 'Silver I',  minXp: 1000,  maxXp: 3000     },
  { name: 'Silver II', minXp: 3000,  maxXp: 5000     },
  { name: 'Gold I',    minXp: 5000,  maxXp: 8000     },
  { name: 'Gold II',   minXp: 8000,  maxXp: 12000    },
  { name: 'Platinum',  minXp: 12000, maxXp: 20000    },
  { name: 'Diamond',   minXp: 20000, maxXp: 35000    },
  { name: 'Legend',    minXp: 35000, maxXp: Infinity },
]

export function getRankProgress(xp = 0) {
  const i    = Math.max(0, RANKS.findIndex(r => xp >= r.minXp && xp < r.maxXp))
  const rank = RANKS[i]
  const next = RANKS[i + 1] ?? null
  const pct  = next ? Math.min(100, Math.round(((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100)) : 100
  return { rank, next, index: i, pct, xpToNext: next ? next.minXp - xp : 0 }
}

// ── Subjects ─────────────────────────────────────────────────────────────────
export const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9']
export const SUBJECT_LIMIT = { WAEC: 9, JAMB: 4 }

// Offline / guest subject pickers — no API needed.
export const ALL_SUBJECTS = {
  WAEC: [
    'English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
    'Economics', 'Government', 'Geography', 'Commerce', 'Further Mathematics',
    'Literature in English', 'Agricultural Science', 'Accounting',
    'Christian Religious Studies',
  ],
  JAMB: [
    'Use of English', 'Mathematics', 'Biology', 'Chemistry', 'Physics',
    'Economics', 'Government', 'Geography', 'Commerce', 'Further Mathematics',
    'Accounting', 'Christian Religious Studies',
  ],
}

// WAEC says "English Language"; JAMB says "Use of English". Onboarding and
// legacy rows sometimes store the wrong one, so normalise before display/save.
const NAME_MAP = {
  JAMB: { 'English Language': 'Use of English' },
  WAEC: { 'Use of English': 'English Language' },
}
export const normalizeForExam = (name, exam) => NAME_MAP[exam]?.[name] ?? name
export const normalizeSubjectsForExam = (names = [], exam) => names.map(n => normalizeForExam(n, exam))

export function subjectsFor(profile, exam) {
  if (exam === 'WAEC') return normalizeSubjectsForExam(profile?.subjects_waec ?? [], 'WAEC')
  if (exam === 'JAMB') return normalizeSubjectsForExam(profile?.subjects_jamb ?? [], 'JAMB')
  // "All": union, with JAMB's English folded into WAEC's name so it shows once.
  const seen = new Set()
  return [...subjectsFor(profile, 'WAEC'), ...subjectsFor(profile, 'JAMB')]
    .map(n => normalizeForExam(n, 'WAEC'))
    .filter(n => (seen.has(n) ? false : seen.add(n)))
}

export function activeExamsOf(profile) {
  const exams = []
  if (profile?.subjects_waec?.length || profile?.exam_types?.includes?.('WAEC')) exams.push('WAEC')
  if (profile?.subjects_jamb?.length || profile?.exam_types?.includes?.('JAMB')) exams.push('JAMB')
  return exams
}

// ── Goals (profile row first, then the local ep_goals mirror) ────────────────
export function readLocalGoals() {
  try { return JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch { return {} }
}

export function goalsOf(profile) {
  const local = readLocalGoals()
  return {
    university: profile?.target_university || local.university || null,
    course:     profile?.target_course     || local.course     || null,
    jamb:       profile?.target_jamb       ?? local.target_jamb ?? null,
  }
}

// ── Plan status ──────────────────────────────────────────────────────────────
// Everyone gets full access through September 2026. After that, a paid plan
// is read from profiles.plan / plan_expires_at.
export const TRIAL_START = new Date('2026-09-01T00:00:00')
export const TRIAL_END   = new Date('2026-10-01T00:00:00')
const DAY_MS = 86_400_000

export function getPlanStatus(profile, now = new Date()) {
  const expires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const paid    = profile?.plan && profile.plan !== 'free' && (!expires || expires > now)

  if (paid) {
    return {
      kind: 'paid',
      title: 'EXL Premium',
      detail: expires
        ? `Active until ${expires.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
        : 'Active',
      pct: null,
    }
  }

  if (now < TRIAL_END) {
    const daysLeft = Math.max(1, Math.ceil((TRIAL_END - now) / DAY_MS))
    const elapsed  = (now - TRIAL_START) / (TRIAL_END - TRIAL_START)
    return {
      kind: 'trial',
      title: 'EXL Premium (Trial)',
      detail: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`,
      pct: Math.round(Math.min(1, Math.max(0, elapsed)) * 100),
    }
  }

  return { kind: 'free', title: 'Free plan', detail: 'Your free trial has ended', pct: null }
}

// ── Formatting ───────────────────────────────────────────────────────────────
export function formatDuration(secs = 0) {
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Matches the topbar: first two letters of the display name ("Golden" → "GO").
export const initialsOf = name => (name || 'Student').trim().slice(0, 2).toUpperCase()
