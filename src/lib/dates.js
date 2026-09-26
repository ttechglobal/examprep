// src/lib/dates.js
// Calendar days in Nigeria. Nigeria is UTC+1 all year (no daylight saving), so
// a fixed offset is exact. The database uses the same rule (app_today()), so
// "today" means the same thing to the API, Postgres and the student's phone.

const APP_UTC_OFFSET_MS = 60 * 60 * 1000 // Africa/Lagos = UTC+01:00

/** 'YYYY-MM-DD' for the Nigerian calendar day containing `date`. */
export function appDay(date = new Date()) {
  return new Date(new Date(date).getTime() + APP_UTC_OFFSET_MS).toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' shifted by `n` days (negative = earlier). */
export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Monday ('YYYY-MM-DD') of the Nigerian week containing `day`. */
export function mondayOfDay(day) {
  const d = new Date(`${day}T00:00:00Z`)
  return addDays(day, -((d.getUTCDay() + 6) % 7))
}

/** First day of the month containing `day`. */
export function monthStartOfDay(day) {
  return `${day.slice(0, 7)}-01`
}

/** Midnight at the start of Nigerian day `day`, as a Date (UTC instant). */
export function startOfAppDay(day) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - APP_UTC_OFFSET_MS)
}
