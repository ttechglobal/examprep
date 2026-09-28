// src/lib/leaderboard/avatar.js
// Leaderboard avatars. No profile photos yet, so each student gets a stable
// tint from their id and their initial; the viewer's own row is navy + gold.
// Used by the leaderboard page and the home page's leaderboard card.

const TINTS = [
  ['#E0EAFF', '#1D4ED8'], ['#FDE7D6', '#C2410C'], ['#DCFCE7', '#15803D'],
  ['#F3E8FF', '#7E22CE'], ['#FFE4E6', '#BE123C'], ['#E0F2FE', '#0369A1'],
]

function tintFor(id = '') {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

/** { background, color, text } for a leaderboard row. */
export function avatarLook(entry) {
  if (entry.is_me) {
    return {
      background: 'linear-gradient(145deg,#0a2470,#1264e5)',
      color: '#FFB800',
      text: (entry.name || 'ME').slice(0, 2).toUpperCase(),
    }
  }
  const [background, color] = tintFor(entry.student_id)
  return { background, color, text: (entry.name || 'S').charAt(0).toUpperCase() }
}
