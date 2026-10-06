// src/lib/plans.js
// ─────────────────────────────────────────────────────────────────────────────
// Free and Premium: the one place the rules live. Pure functions, used by the
// server (API routes enforce them) and the app (screens show locks and limits
// before a student hits them). Change a rule here and both follow.
//
//   Premium   everything. From a paid plan, a school slot or the 7-day trial
//             every new account starts with.
//   Free      Quick 5: open.
//             Topic Practice: the first 5 topics of each subject.
//             Custom Practice: 1 session a day, shared with Study Practice
//               and Speed Round (they're all "build your own session").
//             Mock Exam: Premium only.
//             Battle vs computer: 2 battles a day.
//             Battle vs friends: Premium only.
//             Everything else (flashcards, explanations, Learn, daily
//             challenge, leaderboards, progress) is open: it isn't listed in
//             FEATURES, and anything not listed is never locked.
//
// Days are Nigerian calendar days (lib/dates.js), the same as streaks.
// Guests (no account) are on Free; signing up starts their trial.
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 7

export const FREE_TOPICS_PER_SUBJECT = 5

/** Paid plans. months: how long one payment lasts. Prices in naira. */
export const PLANS = [
  { id: 'two_months', name: '2 Months', months: 2,  price: 1000 },
  { id: 'annual',     name: '1 Year',   months: 12, price: 5000, best: true },
]

/**
 * Schools buy slots: one slot = one student, 12 months of Premium, at a school
 * price (annual is ₦5,000 for a student on their own). Slots never expire;
 * a student removed within SLOT_REFUND_DAYS gives the slot back
 * (20261007_schools_and_admin_log.sql). Every new school gets 1 free slot.
 */
export const SCHOOL_SLOT_PRICE = 4000
export const SCHOOL_SLOT_MONTHS = 12
export const SLOT_REFUND_DAYS = 7
export const SCHOOL_FREE_SLOTS = 1

/**
 * Features Free limits. Each has either premiumOnly, freePerDay (uses per
 * day) or freeTopics (topics per subject). `pitch` is the paywall's line.
 */
export const FEATURES = {
  quick5: { name: 'Quick 5' },
  topic:  { name: 'Topic Practice', freeTopics: FREE_TOPICS_PER_SUBJECT,
            pitch: 'Practise every topic in every subject, not just the first five.' },
  custom: { name: 'Custom Practice', freePerDay: 1,
            pitch: 'Build as many custom, study and speed sessions as you like.' },
  mock:   { name: 'Mock Exam', premiumOnly: true,
            pitch: 'Sit full timed WAEC and JAMB mock exams, just like the real thing.' },
  battle: { name: 'Battle', freePerDay: 2,
            pitch: 'Battle the computer as many times as you want, every day.' },
  battle_friends: { name: 'Battle vs Friends', premiumOnly: true,
            pitch: 'Challenge your friends to live 1v1 battles.' },
}

/** Daily-limited features, for usage counts. */
export const DAILY_FEATURES = Object.keys(FEATURES).filter(key => FEATURES[key].freePerDay)

const DAY_MS = 86_400_000
const time = value => (value ? Date.parse(value) : NaN)

/**
 * Who has Premium, and why.
 *   account: { plan, plan_expires_at, trial_ends_at, isGuest }
 * → { premium, source: 'paid' | 'trial' | 'free' | 'guest', until, daysLeft, trialEnded, paidEnded }
 *   until      ISO date Premium ends (null: no end, or no Premium)
 *   daysLeft   whole days left, rounded up (trial or paid with an end)
 *   paidEnded  ISO date a paid plan ended, when the student is back on Free
 *              because it ran out (the admin page keeps the end date)
 */
export function planStatus(account, now = Date.now()) {
  const base = { until: null, daysLeft: null, trialEnded: false, paidEnded: null }
  if (!account || account.isGuest) return { ...base, premium: false, source: 'guest' }

  const trialEnd = time(account.trial_ends_at)
  const paidEnd = time(account.plan_expires_at)
  if (account.plan === 'premium') {
    if (!account.plan_expires_at) return { ...base, premium: true, source: 'paid' }
    if (paidEnd > now) return { ...base, premium: true, source: 'paid', until: account.plan_expires_at, daysLeft: Math.ceil((paidEnd - now) / DAY_MS) }
  }
  if (trialEnd > now) return { ...base, premium: true, source: 'trial', until: account.trial_ends_at, daysLeft: Math.ceil((trialEnd - now) / DAY_MS) }
  return {
    ...base, premium: false, source: 'free', trialEnded: Number.isFinite(trialEnd),
    paidEnded: account.plan === 'premium' && paidEnd <= now ? account.plan_expires_at : null,
  }
}

/** A paid plan this close to its end gets a renewal reminder (days). */
export const RENEW_REMINDER_DAYS = 7

/**
 * Can this student use a feature right now?
 *   status   from planStatus
 *   used     uses today (daily features)
 * → { allowed, reason: null | 'premium' | 'limit', limit, remaining }
 *   reason 'premium': Premium-only. 'limit': today's free uses are gone.
 *   limit/remaining are null when nothing is counted.
 */
export function featureAccess(status, feature, used = 0) {
  const rule = FEATURES[feature]
  if (!rule || status?.premium) return { allowed: true, reason: null, limit: null, remaining: null }
  if (rule.premiumOnly) return { allowed: false, reason: 'premium', limit: 0, remaining: 0 }
  if (rule.freePerDay) {
    const remaining = Math.max(0, rule.freePerDay - used)
    return { allowed: remaining > 0, reason: remaining > 0 ? null : 'limit', limit: rule.freePerDay, remaining }
  }
  return { allowed: true, reason: null, limit: null, remaining: null }
}

/** Is the topic at this position (0-based, in the subject's topic order) open on Free? */
export function isFreeTopic(position) {
  return position >= 0 && position < FREE_TOPICS_PER_SUBJECT
}

/**
 * Which feature a question request belongs to (the server classifies it;
 * the app never says). mode/topic come from /api/student/questions.
 *   mock → mock · battle → battle · quick5 → quick5
 *   one topic → topic · anything else (custom, study, speed) → custom
 */
export function practiceFeature({ mode, topicId }) {
  if (mode === 'mock') return 'mock'
  if (mode === 'battle') return 'battle'
  if (mode === 'quick5') return 'quick5'
  if (topicId) return 'topic'
  return 'custom'
}

export function priceLabel(naira) {
  return `₦${Number(naira).toLocaleString('en-NG')}`
}
