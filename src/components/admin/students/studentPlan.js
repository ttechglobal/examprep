// src/components/admin/students/studentPlan.js
// How the admin Students page describes a student's plan: labels, dates, days
// left, the subscription history timeline and WhatsApp messages. Pure helpers;
// the states come from admin_student_rows (20261006_subscriptions.sql).

import { PLANS, TRIAL_DAYS, priceLabel } from '@/lib/plans'
import { toNationalNumber, formatPhoneForDisplay } from '@/lib/auth/phone'

const DAY_MS = 86_400_000
const TZ = 'Africa/Lagos'

/** state → badge label and tone (admin/list/adminList.module.css .tone-*) */
export const STATE_BADGE = {
  free:       { label: 'Free',     tone: 'grey'   },
  trial:      { label: 'Trial',    tone: 'sky'    },
  two_months: { label: '2 Months', tone: 'blue'   },
  annual:     { label: 'Annual',   tone: 'purple' },
  legacy:     { label: 'Premium',  tone: 'purple' },
  school:     { label: 'School',   tone: 'green'  },
  expired:    { label: 'Expired',  tone: 'red'    },
}

export const PLAN_NAME = { two_months: '2-Month Plan', annual: 'Annual Plan', legacy: 'Premium', school: 'School Premium' }

export const FILTER_CHIPS = [
  { id: 'all',        label: 'All' },
  { id: 'free',       label: 'Free' },
  { id: 'trial',      label: 'On trial' },
  { id: 'paid',       label: 'Paid' },
  { id: 'two_months', label: '2 Months' },
  { id: 'annual',     label: 'Annual' },
  { id: 'expiring',   label: 'Expiring Soon' },
  { id: 'expired',    label: 'Expired' },
]

export const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name',   label: 'Name A–Z' },
  { id: 'expiry', label: 'Expiry date' },
]

export function formatDate(iso, { year = true } = {}) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...(year && { year: 'numeric' }), timeZone: TZ })
}

/** Whole days until `iso` (rounded up); negative once it has passed. */
export function daysUntil(iso, now = Date.now()) {
  return Math.ceil((Date.parse(iso) - now) / DAY_MS)
}

export function daysLeftLabel(iso, now = Date.now()) {
  const days = daysUntil(iso, now)
  if (days < 0) return 'Expired'
  if (days === 0) return 'Ends today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

/** The expiry column: { date, note, tone } or null. */
export function expiryCell(student, now = Date.now()) {
  if (['two_months', 'annual', 'legacy', 'school'].includes(student.state) && student.expires_at) {
    const days = daysUntil(student.expires_at, now)
    return { date: formatDate(student.expires_at), note: daysLeftLabel(student.expires_at, now), tone: days <= 7 ? 'warn' : 'ok' }
  }
  if (student.state === 'expired') return { date: formatDate(student.last_paid_end), note: 'Expired', tone: 'bad' }
  if (student.state === 'trial') return { date: formatDate(student.trial_ends_at), note: `Trial · ${daysLeftLabel(student.trial_ends_at, now)}`, tone: 'muted' }
  return null
}

/** When a plan activated now would start: after the current paid plan ends. */
export function nextStart(subscriptions, now = Date.now()) {
  const ends = subscriptions.filter(s => s.status === 'active').map(s => Date.parse(s.ends_at))
  return new Date(Math.max(now, ...ends))
}

/** date + months, clamped to the month's last day like Postgres (31 Jan + 1 → 28 Feb). */
export function addMonths(date, months) {
  const next = new Date(date)
  const day = next.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + months)
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(day, last))
  return next
}

/**
 * The subscription history, newest first. Each plan gives an "activated"
 * entry, then "cancelled" or "expired" when that happened.
 *   { key, at, kind: 'activated' | 'expired' | 'cancelled' | 'queued' | 'joined', title, detail, sub? }
 */
export function historyEvents(student, subscriptions, now = Date.now()) {
  const events = []
  for (const sub of subscriptions) {
    const name = PLAN_NAME[sub.plan_id] ?? 'Plan'
    const range = `${formatDate(sub.starts_at, { year: false })} – ${formatDate(sub.ends_at)}`
    const price = sub.amount != null ? `${priceLabel(sub.amount)} · ` : ''
    const queued = sub.status === 'active' && Date.parse(sub.starts_at) > now
    events.push({
      key: `${sub.id}-on`, at: sub.created_at, kind: queued ? 'queued' : 'activated', sub,
      title: queued ? `${name} queued` : `${name} activated`,
      detail: `${price}${range} · ${byWhom(sub)}`,
      note: sub.note,
    })
    if (sub.status === 'cancelled') {
      events.push({ key: `${sub.id}-x`, at: sub.cancelled_at, kind: 'cancelled', title: `${name} cancelled`, detail: sub.cancel_reason || 'Cancelled by Admin' })
    } else if (Date.parse(sub.ends_at) <= now) {
      events.push({ key: `${sub.id}-end`, at: sub.ends_at, kind: 'expired', title: 'Subscription expired', detail: `${name} ended` })
    }
  }
  if (student?.joined) {
    events.push({ key: 'joined', at: student.joined, kind: 'joined', title: 'Joined ExamPrep', detail: `${TRIAL_DAYS}-day Premium trial started` })
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

function byWhom(sub) {
  if (sub.source === 'legacy') return 'set before subscriptions were recorded'
  if (sub.source === 'school') return `from ${sub.schools?.name ?? 'their school'}${sub.created_by ? ` (${sub.created_by})` : ''}`
  return `by ${sub.created_by ?? 'Admin'}`
}

/** The current plan for the panel: { title, detail, tone, premium }. */
export function currentPlan(student, subscriptions, now = Date.now()) {
  const running = subscriptions.find(s => s.status === 'active' && Date.parse(s.starts_at) <= now && Date.parse(s.ends_at) > now)
  const queued = subscriptions.filter(s => s.status === 'active' && Date.parse(s.starts_at) > now)
  const extra = queued.length ? ` · then ${queued.map(s => PLAN_NAME[s.plan_id]).join(', ')} until ${formatDate(student.expires_at)}` : ''
  switch (student.state) {
    case 'two_months': case 'annual': case 'legacy': case 'school':
      return {
        title: PLAN_NAME[running?.plan_id ?? student.state],
        detail: `Active until ${formatDate(running?.ends_at ?? student.expires_at)} · ${daysLeftLabel(running?.ends_at ?? student.expires_at, now)}${extra}`,
        tone: daysUntil(student.expires_at, now) <= 7 ? 'orange' : student.state === 'school' ? 'green' : 'blue', premium: true,
      }
    case 'trial':
      return { title: 'Free trial', detail: `Premium until ${formatDate(student.trial_ends_at)} · ${daysLeftLabel(student.trial_ends_at, now)}`, tone: 'sky', premium: true }
    case 'expired':
      return { title: 'Expired', detail: `Paid plan ended ${formatDate(student.last_paid_end)}. Now on Free.`, tone: 'red', premium: false }
    default:
      return { title: 'Free', detail: 'No active subscription. On the Free plan.', tone: 'grey', premium: false }
  }
}

export const PLAN_OPTIONS = PLANS

/** wa.me number for a saved phone, or null. */
export function whatsappNumber(phone) {
  const national = toNationalNumber(phone ?? '')
  return national ? `234${national}` : null
}

export const displayPhone = phone => (phone ? formatPhoneForDisplay(phone) : null)

/** The message an admin sends from the panel, by the student's situation. */
export function reminderText(student, now = Date.now()) {
  const first = (student.name || '').split(/\s+/)[0] || 'there'
  if (['two_months', 'annual', 'legacy'].includes(student.state) && daysUntil(student.expires_at, now) <= 7) {
    return `Hi ${first}, your ExamPrep A1 Premium ends on ${formatDate(student.expires_at)}. Renew now to keep every topic, mock exams and unlimited battles: ${PLANS.map(p => `${p.name} ${priceLabel(p.price)}`).join(' or ')}.`
  }
  if (student.state === 'expired') {
    return `Hi ${first}, your ExamPrep A1 Premium ended on ${formatDate(student.last_paid_end)}. Renew to get every topic, mock exams and unlimited battles back: ${PLANS.map(p => `${p.name} ${priceLabel(p.price)}`).join(' or ')}.`
  }
  return `Hi ${first}, this is ExamPrep A1.`
}
