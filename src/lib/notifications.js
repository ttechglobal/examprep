// src/lib/notifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Custom notifications an admin writes and sends (admin → Notifications): the
// templates, where a tap can lead, who can receive it, and the checks. Shared
// by the admin page and its API so both always agree. Pure functions.
//
// House rules: no emojis in a notification, short title, short body. "{name}"
// in the title or body becomes the student's first name ("there" if unknown).
// ─────────────────────────────────────────────────────────────────────────────

export const TITLE_MAX = 45
export const BODY_MAX  = 140

/** Where a tap can lead. `url` is a path in the app, or null when it is typed in. */
export const LINKS = [
  { id: 'practice',    label: 'Practice',             url: '/student/practice' },
  { id: 'battle',      label: 'Battle and missions',  url: '/student/battle' },
  { id: 'leaderboard', label: 'Battle leaderboard',   url: '/student/battle/leaderboard' },
  { id: 'home',        label: 'Home',                 url: '/student/home' },
  { id: 'progress',    label: 'Progress',             url: '/student/progress' },
  { id: 'profile',     label: 'Profile and plan',     url: '/student/profile' },
  { id: 'whatsapp',    label: 'WhatsApp channel',     url: null, hint: 'Paste your channel link (https://whatsapp.com/channel/…)' },
  { id: 'custom',      label: 'Another link',         url: null, hint: 'A page in the app (/student/…) or a full https:// link' },
]

/** Who can receive a message. `values` are the choices for kinds that need one. */
export const AUDIENCES = [
  { kind: 'all',      label: 'Everyone' },
  { kind: 'user',     label: 'One student' },
  { kind: 'exam',     label: 'By exam',                       values: [['WAEC', 'WAEC'], ['JAMB', 'JAMB']] },
  { kind: 'plan',     label: 'By plan',                       values: [['free', 'Free'], ['trial', 'On trial'], ['paid', 'Paid']] },
  { kind: 'inactive', label: 'Not practised for a while',     values: [['3', '3 days'], ['7', '7 days'], ['14', '14 days'], ['30', '30 days']] },
  { kind: 'expiring', label: 'Plan ending within 7 days' },
]

/** Ready-made messages. Pick one, change the words, send. */
export const TEMPLATES = [
  { id: 'trial', label: '14-day trial', link: 'home', audience: { kind: 'all' },
    title: 'You have 14 days of Premium',
    body: '{name}, every feature is unlocked for 14 days. Open ExamPrep and make the most of it.' },
  { id: 'channel', label: 'WhatsApp channel update', link: 'whatsapp', audience: { kind: 'all' },
    title: 'New update on our WhatsApp channel',
    body: '{name}, we just posted something worth your time. Tap to read it.' },
  { id: 'scholarship', label: 'Scholarship opportunity', link: 'whatsapp', audience: { kind: 'all' },
    title: 'A scholarship you should see',
    body: '{name}, a new opportunity is open. The details are on our WhatsApp channel.' },
  { id: 'admission', label: 'Admission update', link: 'whatsapp', audience: { kind: 'all' },
    title: 'Admission update for students',
    body: 'New admission information is out. Read the details on our WhatsApp channel.' },
  { id: 'feature', label: 'New feature', link: 'home', audience: { kind: 'all' },
    title: 'New in ExamPrep',
    body: 'Something new just landed. Open the app and try it.' },
  { id: 'weekend', label: 'Weekend push', link: 'battle', audience: { kind: 'all' },
    title: 'Climb the board this weekend',
    body: 'Battle the computer, clear your missions and earn XP before Sunday night.' },
  { id: 'exam', label: 'Exam season', link: 'practice', audience: { kind: 'all' },
    title: 'Exam day is closer than it feels',
    body: 'A few focused sessions every day make the difference. Start one now.' },
  { id: 'renew', label: 'Plan ending soon', link: 'profile', audience: { kind: 'expiring' },
    title: 'Your Premium ends soon',
    body: '{name}, renew to keep unlimited battles, mock exams and every topic.' },
  { id: 'comeback', label: 'Come back', link: 'practice', audience: { kind: 'inactive', value: '7' },
    title: '{name}, your streak is ready to restart',
    body: 'Your XP and rank are waiting. One short session gets you going.' },
  { id: 'personal', label: 'Personal note', link: 'home', audience: { kind: 'user' },
    title: 'A note from the ExamPrep team',
    body: '{name}, ' },
]

const EMOJI = /\p{Extended_Pictographic}|️|‍/u
export const hasEmoji = text => EMOJI.test(text ?? '')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The message text, or the problem with it. → { title, body } | { error } */
export function checkMessage({ title, body }) {
  const t = typeof title === 'string' ? title.trim() : ''
  const b = typeof body === 'string' ? body.trim() : ''
  if (!t) return { error: 'Write a title.' }
  if (!b) return { error: 'Write the message.' }
  if (t.length > TITLE_MAX) return { error: `The title is ${t.length} characters. Keep it to ${TITLE_MAX} so it isn't cut off.` }
  if (b.length > BODY_MAX) return { error: `The message is ${b.length} characters. Keep it to ${BODY_MAX} so it isn't cut off.` }
  if (hasEmoji(t) || hasEmoji(b)) return { error: 'Notifications have no emojis. Remove them and try again.' }
  return { title: t, body: b }
}

/** A path in the app ("/student/…") or an https link; anything else is refused. → string | null */
export function checkLink(url) {
  const u = typeof url === 'string' ? url.trim() : ''
  if (!u) return null
  if (u.startsWith('/') && !u.startsWith('//') && u.length <= 300) return u
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'https:' && u.length <= 500 ? parsed.toString() : null
  } catch { return null }
}

/** { kind, value? } from the page, or null when it isn't a real audience. */
export function checkAudience(audience) {
  const kind = audience?.kind ?? 'all'
  const spec = AUDIENCES.find(a => a.kind === kind)
  if (!spec) return null
  const value = audience?.value == null ? null : String(audience.value)
  if (kind === 'user') return value && UUID.test(value) ? { kind, value } : null
  if (spec.values) return value && spec.values.some(([v]) => v === value) ? { kind, value } : null
  return { kind, value: null }
}

/** How an audience reads in the log and on the Send button. */
export function audienceLabel(audience, studentName) {
  const spec = AUDIENCES.find(a => a.kind === audience?.kind)
  if (!spec) return 'Everyone'
  if (audience.kind === 'user') return studentName || 'One student'
  const choice = spec.values?.find(([v]) => v === audience.value)?.[1]
  if (audience.kind === 'inactive') return `Students not practising for ${choice ?? audience.value}`
  return choice ? `${spec.label}: ${choice}` : spec.label
}
