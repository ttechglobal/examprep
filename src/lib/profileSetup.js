// src/lib/profileSetup.js
// ─────────────────────────────────────────────────────────────────────────────
// One definition of "this student has set up their profile".
//
// Sign-up no longer asks for a name, exam or subjects, so a new profile is
// empty on purpose. The student layout shows a setup prompt until this returns
// true, and the profile page walks the student through the missing steps.
//
// Deliberately does NOT fall back to 'WAEC' the way older code does: an empty
// profile must read as "not set up", not as "a WAEC student with no subjects".
// ─────────────────────────────────────────────────────────────────────────────

export function hasName(profile) {
  return typeof profile?.full_name === 'string' && profile.full_name.trim().length > 0
}

export function hasSubjects(profile) {
  const waec = Array.isArray(profile?.subjects_waec) ? profile.subjects_waec.length : 0
  const jamb = Array.isArray(profile?.subjects_jamb) ? profile.subjects_jamb.length : 0
  return waec + jamb > 0
}

export function isProfileComplete(profile) {
  return hasName(profile) && hasSubjects(profile)
}

/** 'info' | 'subjects' | null: the next profile sheet a new student should fill in. */
export function nextSetupStep(profile) {
  if (!hasName(profile)) return 'info'
  if (!hasSubjects(profile)) return 'subjects'
  return null
}
