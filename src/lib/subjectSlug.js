// src/lib/subjectSlug.js
// ─────────────────────────────────────────────────────────────────────────────
// The one rule for a subject row's slug: "<name>-<exam>", e.g.
//   "Use of English" + JAMB → "use-of-english-jamb"
//
// There is one subjects row per exam, and the admin curriculum pages find a
// row by slug, so the exam must be part of it. Without it, the WAEC and JAMB
// rows of a subject collide.
//
// Callers: app/api/admin/subjects/route.js (create),
//          app/api/admin/subjects/[id]/route.js (rename / change exam)
//
// v1 (29 Sep 2026): create added the exam suffix but rename dropped it
// ("use-of-english"), so a renamed row's slug no longer said which exam it was.
// ─────────────────────────────────────────────────────────────────────────────

export function subjectSlug(name, examType) {
  const base = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base}-${String(examType).toLowerCase()}`
}
