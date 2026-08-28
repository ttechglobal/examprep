// src/lib/localProfile.js
// ─────────────────────────────────────────────────────────────────────────────
// Local-first user profile — works for both guest and authenticated users.
//
// Guest users: all data lives in localStorage under 'ep_guest'.
//   Written by onboarding, read by every student page.
//
// Authenticated users: Supabase is the source of truth, but we cache
//   a lightweight copy here so pages can render instantly on load.
//
// Shape mirrors the Supabase `profiles` row so all pages can use the
// same field names regardless of whether a user is signed in:
//   { id, full_name, username, exam_type, exam_types, subjects,
//     subjects_waec, subjects_jamb, total_points, onboarded, isGuest }
//
// Usage:
//   import { getLocalProfile, setLocalProfile, mergeLocalProfile } from '@/lib/localProfile'
//
//   const profile = getLocalProfile()          // → profile object | null
//   setLocalProfile({ username: 'Amaka' })     // → merged + saved, returns new profile
//   mergeLocalProfile({ total_points: 450 })   // alias for setLocalProfile
// ─────────────────────────────────────────────────────────────────────────────

const GUEST_KEY   = 'ep_guest'
const CACHE_KEY   = 'ep_profile_cache'  // lightweight cache for authenticated users

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns the local profile for whoever is on this device.
 * For guests: reads ep_guest.
 * For authenticated users: reads ep_profile_cache (set by layout after Supabase load).
 * Returns null if nothing has been saved yet.
 */
export function getLocalProfile() {
  if (typeof window === 'undefined') return null
  try {
    // Prefer authenticated cache if present
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const p = JSON.parse(cached)
      if (p && !p.isGuest) return p
    }
    // Fall back to guest — normalise fields to match Supabase profile shape
    const guest = localStorage.getItem(GUEST_KEY)
    if (guest) {
      const g = JSON.parse(guest)
      if (g) {
        const examType     = g.exam_type ?? g.exams?.[0] ?? 'WAEC'
        const examTypes    = g.exam_types ?? g.exams ?? [examType]
        const legacySubs   = g.subjects ?? []
        const subjects_waec = g.subjects_waec?.length ? g.subjects_waec
          : (examTypes.includes('WAEC') ? legacySubs : [])
        const subjects_jamb = g.subjects_jamb?.length ? g.subjects_jamb
          : (examTypes.includes('JAMB') ? legacySubs : [])
        return {
          ...g,
          exam_type:  examType,
          exam_types: examTypes,
          subjects:   legacySubs,
          subjects_waec,
          subjects_jamb,
          isGuest: true,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Returns ONLY the guest profile (ep_guest), regardless of auth state.
 * Used when you explicitly need to check guest data.
 */
export function getGuestProfile() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    return raw ? { ...JSON.parse(raw), isGuest: true } : null
  } catch { return null }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Patch the local profile. Merges with existing data.
 * Works for both guest (writes ep_guest) and authenticated (writes ep_profile_cache).
 * Returns the updated profile.
 */
export function setLocalProfile(patch) {
  if (typeof window === 'undefined') return null
  try {
    const current = getLocalProfile() || {}
    const updated = { ...current, ...patch }

    if (current.isGuest || !current.id || updated.isGuest) {
      // Guest — write to ep_guest (strip isGuest flag before saving)
      const { isGuest: _, ...toSave } = updated
      localStorage.setItem(GUEST_KEY, JSON.stringify(toSave))
      return { ...toSave, isGuest: true }
    } else {
      // Authenticated — write to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
      return updated
    }
  } catch { return null }
}

/** Alias — same as setLocalProfile */
export const mergeLocalProfile = setLocalProfile

/**
 * Called by the student layout after a successful Supabase profile fetch.
 * Stores a clean authenticated-user cache and clears any stale guest data
 * only if the user has a real Supabase ID (i.e. they completed signup).
 */
export function cacheAuthProfile(supabaseProfile) {
  if (typeof window === 'undefined' || !supabaseProfile?.id) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...supabaseProfile, isGuest: false }))
  } catch {}
}

/**
 * Clear the local profile cache (call on sign-out, not on sign-in).
 */
export function clearLocalProfile() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY)
    // Do NOT remove ep_guest on sign-out — the user may have offline data to preserve
  } catch {}
}

// ── Subject helpers ───────────────────────────────────────────────────────────

/**
 * Returns the student's subjects for a given exam type from local profile.
 * Falls back to a combined subjects array if per-exam arrays aren't set.
 */
export function getLocalSubjects(examType = 'WAEC') {
  const profile = getLocalProfile()
  if (!profile) return []

  if (examType === 'WAEC') {
    return profile.subjects_waec ?? profile.subjects ?? []
  }
  if (examType === 'JAMB') {
    return profile.subjects_jamb ?? profile.subjects ?? []
  }
  return profile.subjects ?? []
}

/**
 * Returns the student's primary exam type from local profile.
 * Defaults to 'WAEC'.
 */
export function getLocalExamType() {
  const profile = getLocalProfile()
  if (!profile) return 'WAEC'
  // exam_type is the primary single value; exam_types[] is the full list
  return profile.exam_type ?? profile.exam_types?.[0] ?? 'WAEC'
}

/**
 * Returns the student's display name from local profile.
 */
export function getLocalDisplayName() {
  const profile = getLocalProfile()
  if (!profile) return ''
  return profile.full_name || profile.username || ''
}