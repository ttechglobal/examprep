// src/components/student/leaderboard/art.js
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in artwork. Leave a value null to keep the built-in SVG/CSS version.
//
// PODIUM_IMAGES
//   One image per place, e.g. '/images/leaderboard/podium-1.png' (put files in
//   /public). Export each pedestal on its own with a transparent background,
//   ideally ~2x size (1st ≈ 284×208, 2nd/3rd ≈ 232×168).
//   The avatar circle is placed on the pedestal's top rim; if your art's rim
//   sits lower or higher, adjust AVATAR_RIM_OFFSET (px, positive = lower).
//
// INVITE_IMAGE
//   The group illustration on the invite banner, e.g.
//   '/images/leaderboard/invite-friends.png'. Shown at 104×58 (supply 2x).
// ─────────────────────────────────────────────────────────────────────────────

export const PODIUM_IMAGES = {
  1: null,
  2: null,
  3: null,
}

export const AVATAR_RIM_OFFSET = { 1: 0, 2: 0, 3: 0 }

export const INVITE_IMAGE = null
