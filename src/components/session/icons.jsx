// src/components/session/icons.jsx
// Line icons for the session screens. Decorative: always next to visible text
// or inside a labelled button.

const A = { 'aria-hidden': true, focusable: 'false', fill: 'none' }
const S = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const ArrowLeft  = ({ size = 20 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" {...S} /></svg>
export const ArrowRight = ({ size = 20 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" {...S} /></svg>
export const ChevronLeft  = ({ size = 20 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" {...S} strokeWidth={2.2} /></svg>
export const ChevronRight = ({ size = 20 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" {...S} strokeWidth={2.2} /></svg>
export const ChevronUp    = ({ size = 18 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" {...S} /></svg>
export const ChevronDown  = ({ size = 16 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" {...S} /></svg>
export const Close = ({ size = 20 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" {...S} /></svg>
export const Check = ({ size = 16, width = 2.6 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" {...S} strokeWidth={width} /></svg>
export const Cross = ({ size = 16, width = 2.6 }) => <svg {...A} width={size} height={size} viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" {...S} strokeWidth={width} /></svg>

export const Calculator = ({ size = 20 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <rect x="5" y="3" width="14" height="18" rx="2.5" {...S} />
    <path d="M8.5 7h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" {...S} strokeWidth={2.4} />
  </svg>
)

export const Clock = ({ size = 18 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="13" r="8" {...S} /><path d="M12 9v4l2.5 2M10 2.5h4" {...S} />
  </svg>
)

export const Flag = ({ size = 18 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 21V4" {...S} /><path d="M5 4.5h11.5l-2.5 4 2.5 4H5z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

export const Book = ({ size = 22 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M11 5.5C9.3 4.5 7 4 4.5 4 3.7 4 3 4.7 3 5.5V17c0 .8.7 1.5 1.5 1.5 2.3 0 4.5.5 6.5 1.5z" fill="currentColor" />
    <path d="M13 5.5c1.7-1 4-1.5 6.5-1.5.8 0 1.5.7 1.5 1.5V17c0 .8-.7 1.5-1.5 1.5-2.3 0-4.5.5-6.5 1.5z" fill="currentColor" opacity=".7" />
  </svg>
)

export const Grid = ({ size = 22 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" {...S} /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" {...S} />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" {...S} /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" {...S} />
  </svg>
)

export const Bulb = ({ size = 18 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

export const Retry = ({ size = 20 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" {...S} />
  </svg>
)

export const Home = ({ size = 20 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" {...S} />
  </svg>
)
