// src/components/student/leaderboard/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard artwork. Drop the files into /public; set a value to null for
// none. Every slot has a CSS fallback underneath, so a missing, slow or
// offline image never leaves a hole.
//
// Export as WebP/PNG. Never overwrite a published file: caches keep the old
// one. Save a new version under a new name and update it here.
//
// HERO_BG
//   Weekly Champions background: glow, confetti, laurels, no text or people.
//   ~2400×500 px. Keep the left 45% calm for the title (desktop); phones crop
//   to the centre. Fallback: the navy gradient in leaderboard.module.css.
//
// Podium bars use podium-atlas-v2.png (blue / gold / bronze cells). The layout
// assigns stepped heights and overlays live names and XP. CSS remains a fallback.
//
// INVITE_IMAGE
//   The group illustration on the invite banner. Shown at 104×58 (supply 2x).
//   Fallback: a small built-in drawing.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO_BG = '/images/leaderboard/champions-bg.webp'

export const INVITE_IMAGE = '/images/leaderboard/invite-friends.png'
