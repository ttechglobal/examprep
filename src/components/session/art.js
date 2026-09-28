// src/components/session/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Session artwork. Drop the files into /public; set a value to null for none.
// Each slot sits on a CSS fallback, so a missing or offline image never
// leaves a hole. Never overwrite a published file: use a new name.
//
// CORRECT_ANSWER_ART
//   Decoration in the top-right of the "Correct Answer" card of every
//   explanation (sparkles, a gold medal…), so keep it general, not tied to a
//   subject. Transparent background, ~480×300 px; the text keeps the left 70%.
//
// SUMMARY_TROPHY
//   The trophy on the "Practice session done!" card. Transparent background,
//   ~400×400 px. Fallback: a trophy emoji.
// ─────────────────────────────────────────────────────────────────────────────

export const CORRECT_ANSWER_ART = '/images/session/correct-answer.webp'
export const SUMMARY_TROPHY     = '/images/session/summary-trophy.webp'
