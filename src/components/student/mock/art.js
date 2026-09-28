// src/components/student/mock/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Mock exam artwork. Drop the files into /public and the screens pick them up.
// Until a file exists (or while it downloads) each slot shows its gradient, so
// the screens always look finished. Set a value to null for none.
//
// Export as WebP, ~80% quality. Never overwrite a published file: caches keep
// the old one. Save a new version under a new name and update it here.
//
// WAEC_CARD / JAMB_CARD — the two cards on "Choose your exam"
//   Background + illustration (exam logo, paper, sparkles), no text.
//   ~1000×520 px. Keep the illustration in the right 55%; the left stays
//   light and plain for the dark text. Fallback: a light tint.
//
// WAEC_HEADER / JAMB_HEADER — the banner on each mock setup screen
//   Background + illustration, no text. ~1100×380 px. Keep the illustration
//   in the right 35%; the left stays dark and plain for the white text.
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_ART = {
  WAEC: {
    card:   { image: '/images/mock/waec-card.webp',   fallback: 'linear-gradient(135deg, #EAF2FF 0%, #D6E6FF 100%)' },
    header: { image: '/images/mock/waec-header.webp', fallback: 'linear-gradient(135deg, #0B2A8C 0%, #1747D6 60%, #2B63F0 100%)' },
  },
  JAMB: {
    card:   { image: '/images/mock/jamb-card.webp',   fallback: 'linear-gradient(135deg, #EAF8EE 0%, #D3F0DC 100%)' },
    header: { image: '/images/mock/jamb-header.webp', fallback: 'linear-gradient(135deg, #0B5A2E 0%, #13843F 60%, #1FA152 100%)' },
  },
}
