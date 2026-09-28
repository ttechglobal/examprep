// src/components/student/home/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Home page artwork. Drop the files into /public and the page picks them up.
// Until a file exists (or while it downloads) each slot shows its fallback,
// so the page always looks finished. Set a value to null to use no image.
//
// Export as WebP, ~80% quality. Never overwrite a published file: caches keep
// the old one. Save a new version under a new name (…-v2.webp) and update it here.
//
// HERO
//   The student character next to the greeting. Transparent background,
//   feet / body cut off flat at the bottom. ~600×660 px (shown at ≤300 px).
//
// PRACTICE_CARD / BATTLE_CARD
//   Card background WITH the characters, as one picture. No text or buttons in
//   the picture: the page draws those on the left.
//     • ~1200×600 px (2:1). The card crops to fit (desktop ≈ 3:2, phone ≈ 2.3:1),
//       keeping the right-hand side, so keep the characters in the right 45%
//       and the left 55% plain background for the text.
//     • Match the fallback gradient below at the left edge, so the fade-in
//       is seamless.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO_IMAGE = '/images/home/hero-student.webp'

export const PRACTICE_CARD = {
  image:    '/images/home/practice-card.webp',
  fallback: 'linear-gradient(135deg, #E4430A 0%, #F2700F 50%, #FFA726 100%)',
}

export const BATTLE_CARD = {
  image:    '/images/home/battle-card.webp',
  fallback: 'linear-gradient(135deg, #24177E 0%, #3F24C4 50%, #6D35E8 100%)',
}
