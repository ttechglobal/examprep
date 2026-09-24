// src/lib/leaderboard/periods.js
// Leaderboard time windows. Pure — imported by the API routes and the page,
// so the dates the UI labels are the dates the server ranks.

export const PERIODS = ['week', 'lastWeek', 'month', 'all']
const WEEK_MS = 7 * 86_400_000

function mondayOf(now) {
  const d = new Date(now)
  d.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * week + weeksAgo=0 → Monday this week → now
 * week + weeksAgo=n → the full Mon–Sun week n weeks back
 * lastWeek          → same as week + weeksAgo=1
 * month             → 1st of this month → now
 * all               → null
 */
export function periodWindow(period, { weeksAgo = 0, now = new Date() } = {}) {
  if (period === 'all') return null
  if (period === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  const back = period === 'lastWeek' ? 1 : weeksAgo
  const from = new Date(mondayOf(now).getTime() - back * WEEK_MS)
  const to   = back === 0 ? now : new Date(from.getTime() + WEEK_MS - 1)
  return { from, to }
}

/** "Sep 14 – Sep 20, 2026" */
export function formatWindow({ from, to }) {
  const md = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${md(from)} – ${md(to)}, ${to.getFullYear()}`
}
