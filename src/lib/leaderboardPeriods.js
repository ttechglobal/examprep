// src/lib/leaderboardPeriods.js
// Shared utilities for bi-weekly period calculations.
// Periods are calendar-aligned: day 1–14 and day 15–end of month.

/**
 * Returns the start and end Date objects for the current bi-weekly period.
 */
export function getCurrentPeriod(now = new Date()) {
  const year  = now.getFullYear()
  const month = now.getMonth()
  const day   = now.getDate()

  let start, end
  if (day <= 14) {
    start = new Date(year, month, 1, 0, 0, 0, 0)
    end   = new Date(year, month, 14, 23, 59, 59, 999)
  } else {
    start = new Date(year, month, 15, 0, 0, 0, 0)
    end   = new Date(year, month + 1, 0, 23, 59, 59, 999) // last day of month
  }
  return { start, end }
}

/**
 * Returns the start and end Date objects for the current calendar month.
 */
export function getCurrentMonth(now = new Date()) {
  const year  = now.getFullYear()
  const month = now.getMonth()
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end:   new Date(year, month + 1, 0, 23, 59, 59, 999),
  }
}

/**
 * Returns a human-readable label for a bi-weekly period.
 * e.g. "May 1–14, 2026"
 */
export function periodLabel(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  const s    = start.toLocaleDateString('en-GB', opts)
  const e    = end.toLocaleDateString('en-GB', { day: 'numeric' })
  return `${s}–${e}, ${start.getFullYear()}`
}

/**
 * Returns a list of past bi-weekly periods going back `months` months.
 * Each entry: { start: ISO string, end: ISO string, label: string }
 */
export function getPastPeriods(months = 6, now = new Date()) {
  const periods = []
  const current = getCurrentPeriod(now)

  // Walk back through periods
  let cursor = new Date(now)

  for (let i = 0; i < months * 2; i++) {
    const p = getCurrentPeriod(cursor)

    // Skip the current active period
    if (p.start.getTime() === current.start.getTime()) {
      // Move cursor back one day to land in the previous period
      cursor = new Date(p.start.getTime() - 86400000)
      continue
    }

    periods.push({
      start: p.start.toISOString(),
      end:   p.end.toISOString(),
      label: periodLabel(p.start, p.end),
    })

    // Move cursor to the day before this period started
    cursor = new Date(p.start.getTime() - 86400000)
  }

  return periods
}