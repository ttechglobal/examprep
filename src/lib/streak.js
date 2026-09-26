// src/lib/streak.js
// Streaks are stored on the profile (streak_days + last_active_date) and
// updated when a session is saved. A stored streak only counts while the
// student practised today or yesterday; after a missed day it reads as 0.
import { appDay, addDays } from '@/lib/dates'

export function effectiveStreak(profile, today = appDay()) {
  const last = profile?.last_active_date
  if (!last) return 0
  return last >= addDays(today, -1) ? (profile.streak_days ?? 0) : 0
}
