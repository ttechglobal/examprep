// src/components/student/practice/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Practice page artwork. Drop the files into /public and the page picks them
// up. Until a file exists (or while it downloads) each slot shows its
// fallback, so the page always looks finished. Set a value to null for none.
//
// Export as WebP, ~80% quality. Never overwrite a published file: caches keep
// the old one. Save a new version under a new name and update it here.
//
// HERO
//   The student at the desk (books, laptop, lightbulb bubble). Transparent
//   background, cut off flat at the bottom. ~1100×520 px. Desktop shows it on
//   the right (≤ 560 px wide); phones stretch it across the width under the
//   "Let's practice!" text, so keep its top-left 45% empty.
//
// TOPIC_CARD / MOCK_CARD
//   Card background WITH the illustration (target + books / stopwatch + exam
//   paper), no text or buttons. ~1200×600 px (2:1); keep the illustration in
//   the right 45% and the left 55% plain for the text. Match the fallback
//   gradient at the left edge so the fade-in is seamless.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO_IMAGE = '/images/practice/hero-student.webp'

export const TOPIC_CARD = {
  image:    '/images/practice/topic-card.webp',
  fallback: 'linear-gradient(135deg, #1238C9 0%, #1D5BF0 55%, #2F7BFF 100%)',
}

export const MOCK_CARD = {
  image:    '/images/practice/mock-card.webp',
  fallback: 'linear-gradient(135deg, #4A1FC4 0%, #6331E6 55%, #7F4BF5 100%)',
}

// SETUP_MASCOT
//   The student with the lightbulb beside "How do you want to practice?" in
//   the setup sheet. Transparent background, ~400×400 px (shown ≤ 150 px).
export const SETUP_MASCOT = '/images/practice/setup-mascot.webp'
