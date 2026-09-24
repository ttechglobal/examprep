// src/components/student/leaderboard/icons.jsx
// Decorative SVGs for the leaderboard. Always paired with visible text.

const A = { 'aria-hidden': true, focusable: 'false' }

export const ChevronLeft = ({ size = 18 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ChevronRight = ({ size = 18 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ChevronDown = ({ size = 14 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ArrowRight = ({ size = 16 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 8h10M9 4.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Trophy = ({ size = 40 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 40 40">
    <path d="M11 5h18v10a9 9 0 01-18 0z" fill="#FFB800" />
    <path d="M20 5h9v10a9 9 0 01-9 9z" fill="#F59E0B" />
    <path d="M11 8H5c0 6 2.5 9 6.5 9.5M29 8h6c0 6-2.5 9-6.5 9.5" stroke="#FFB800" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <rect x="17.5" y="23" width="5" height="6" fill="#F59E0B" />
    <path d="M12 33a2 2 0 012-2h12a2 2 0 012 2v2H12z" fill="#FFB800" />
    <path d="M15 9h3v7a3 3 0 01-3-3z" fill="#fff" opacity=".35" />
  </svg>
)

export const Crown = ({ size = 34 }) => (
  <svg {...A} width={size} height={size * 0.8} viewBox="0 0 40 32">
    <path d="M4 10l9 8 7-14 7 14 9-8-4 18H8z" fill="#FFC53D" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="8" y="26" width="24" height="4" rx="1.5" fill="#F59E0B" />
    <circle cx="4" cy="9" r="2.6" fill="#FFD66B" /><circle cx="20" cy="4" r="2.6" fill="#FFD66B" /><circle cx="36" cy="9" r="2.6" fill="#FFD66B" />
  </svg>
)

export const NigeriaFlag = () => (
  <svg {...A} width="22" height="16" viewBox="0 0 3 2">
    <rect width="3" height="2" rx=".25" fill="#fff" />
    <rect width="1" height="2" rx=".2" fill="#16A34A" />
    <rect x="2" width="1" height="2" rx=".2" fill="#16A34A" />
  </svg>
)

export const SchoolIcon = () => (
  <svg {...A} width="20" height="20" viewBox="0 0 24 24">
    <path d="M12 3l10 5-10 5L2 8z" fill="#1264E5" />
    <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5L12 13.5z" fill="#60A5FA" />
  </svg>
)

// ── Level badge: ribbon medal for Bronze/Silver, crown for Gold and above ────
const MEDAL = {
  bronze: { ribbon: ['#F97316', '#EA580C'], disc: '#FDBA74', ring: '#C2410C', text: '#7C2D12' },
  silver: { ribbon: ['#3B82F6', '#1D4ED8'], disc: '#F1F5F9', ring: '#94A3B8', text: '#475569' },
}
const CROWN = {
  gold:     { fill: '#FFC53D', edge: '#F59E0B' },
  platinum: { fill: '#A5F3FC', edge: '#06B6D4' },
  diamond:  { fill: '#93C5FD', edge: '#2563EB' },
  legend:   { fill: '#FDBA74', edge: '#EA580C' },
}

export function LevelBadge({ tier, numeral }) {
  const label = numeral ?? ''
  if (MEDAL[tier]) {
    const m = MEDAL[tier]
    return (
      <svg {...A} width="22" height="26" viewBox="0 0 22 26">
        <path d="M4 0h5l3 9H7z" fill={m.ribbon[0]} />
        <path d="M18 0h-5l-3 9h5z" fill={m.ribbon[1]} />
        <circle cx="11" cy="17" r="8" fill={m.disc} stroke={m.ring} strokeWidth="1.3" />
        {label !== '' && <text x="11" y="20.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={m.text} fontFamily="inherit">{label}</text>}
      </svg>
    )
  }
  const c = CROWN[tier] ?? CROWN.gold
  return (
    <svg {...A} width="24" height="24" viewBox="0 0 24 24">
      <path d="M2 7l5 5 5-9 5 9 5-5-2.5 13h-15z" fill={c.fill} stroke={c.edge} strokeWidth="1.2" strokeLinejoin="round" />
      {label !== '' && <text x="12" y="18" textAnchor="middle" fontSize="8" fontWeight="800" fill="#7C4A03" fontFamily="inherit">{label}</text>}
    </svg>
  )
}

// ── Rank coin for places 1–3 ─────────────────────────────────────────────────
const COIN = {
  1: ['#FFD54A', '#F5A300', '#8A5A00'],
  2: ['#E8EEF7', '#A8B6CC', '#4B5B75'],
  3: ['#FDBA74', '#E07A2E', '#7C2D12'],
}
export function RankCoin({ place, size = 32 }) {
  const [light, dark, ink] = COIN[place]
  return (
    <svg {...A} width={size} height={size} viewBox="0 0 32 32">
      <path d="M16 1.5l3.6 2.3 4.3-.4 1.7 3.9 3.9 1.7-.4 4.3 2.3 3.6-2.3 3.6.4 4.3-3.9 1.7-1.7 3.9-4.3-.4L16 30.5l-3.6-2.3-4.3.4-1.7-3.9-3.9-1.7.4-4.3L.6 16l2.3-3.6-.4-4.3 3.9-1.7 1.7-3.9 4.3.4z" fill={dark} />
      <circle cx="16" cy="16" r="10.5" fill={light} />
      <text x="16" y="20.5" textAnchor="middle" fontSize="13" fontWeight="800" fill={ink} fontFamily="inherit">{place}</text>
    </svg>
  )
}
