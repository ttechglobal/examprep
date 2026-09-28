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
// PODIUM_IMAGES
//   One pedestal per place, transparent background, ~2x size
//   (1st ≈ 284×208, 2nd/3rd ≈ 232×168). The avatar sits on the pedestal's top
//   rim; if your art's rim is higher or lower, adjust AVATAR_RIM_OFFSET
//   (px, positive = lower). Fallback: gold / blue / bronze gradients.
//
// INVITE_IMAGE
//   The group illustration on the invite banner. Shown at 104×58 (supply 2x).
//   Fallback: a small built-in drawing.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO_BG = '/images/leaderboard/champions-bg.webp'

export const PODIUM_IMAGES = {
  1: '/images/leaderboard/podium-1.png',
  2: '/images/leaderboard/podium-2.png',
  3: '/images/leaderboard/podium-3.png',
}

export const AVATAR_RIM_OFFSET = { 1: 0, 2: 0, 3: 0 }

export const INVITE_IMAGE = '/images/leaderboard/invite-friends.png'
