// src/components/student/learn/art.jsx
// Icons and small illustrations for the Learn page. Decorative only.

const A = { 'aria-hidden': true, focusable: 'false' }

export const ArrowRight = ({ size = 16 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2.5 8h10M9 4.5L12.5 8 9 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const ArrowLeft = ({ size = 16 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M13.5 8h-10M7 4.5L3.5 8 7 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const OpenBook = ({ size = 20 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 24 24">
    <path d="M2 5c3-1.2 6.5-1 10 1v14c-3.5-2-7-2.2-10-1z" fill="#3B82F6" />
    <path d="M22 5c-3-1.2-6.5-1-10 1v14c3.5-2 7-2.2 10-1z" fill="#93C5FD" />
  </svg>
)

// ── Tool tiles ───────────────────────────────────────────────────────────────
export const FlashTile = () => (
  <svg {...A} width="100" height="96" viewBox="0 0 100 96">
    <defs>
      <linearGradient id="ln-ft-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#7C3AED" /></linearGradient>
      <linearGradient id="ln-ft-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9F67FF" /><stop offset="1" stopColor="#6D28D9" /></linearGradient>
    </defs>
    <rect x="6" y="10" width="72" height="72" rx="14" transform="rotate(-9 42 46)" fill="url(#ln-ft-a)" opacity=".75" />
    <rect x="20" y="8" width="74" height="76" rx="16" fill="url(#ln-ft-b)" />
    <rect x="20" y="8" width="74" height="76" rx="16" fill="#fff" opacity=".08" />
    <path d="M62 22L42 50h14l-5 22 21-30H58z" fill="#fff" />
  </svg>
)

export const BookTile = () => (
  <svg {...A} width="78" height="78" viewBox="0 0 78 78">
    <defs>
      <linearGradient id="ln-bt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7DB5FF" /><stop offset="1" stopColor="#2F74E8" /></linearGradient>
    </defs>
    <rect width="78" height="78" rx="18" fill="url(#ln-bt)" />
    <path d="M16 26c7-3 15-2.5 23 2v26c-8-4.5-16-5-23-2z" fill="#fff" />
    <path d="M62 26c-7-3-15-2.5-23 2v26c8-4.5 16-5 23-2z" fill="#E0ECFF" />
    <path d="M39 28v26" stroke="#2F74E8" strokeWidth="2" />
  </svg>
)

// ── Card faces (used on tool cards and hero cards) ───────────────────────────
export const Cell = () => (
  <svg {...A} width="76" height="76" viewBox="0 0 76 76">
    <circle cx="38" cy="38" r="34" fill="#F0ABFC" />
    <circle cx="38" cy="38" r="34" fill="none" stroke="#D946EF" strokeWidth="3" />
    <circle cx="38" cy="38" r="15" fill="#C026D3" opacity=".85" />
    {[[20, 22], [56, 24], [18, 52], [58, 54], [38, 12], [38, 64]].map(([x, y]) => (
      <ellipse key={`${x}${y}`} cx={x} cy={y} rx="4.5" ry="3" fill="#A21CAF" opacity=".7" />
    ))}
    <path d="M30 34c4 4 12 4 16 0M30 42c4-4 12-4 16 0" stroke="#FAE8FF" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
)

export const TriangleFormula = () => (
  <svg {...A} width="92" height="92" viewBox="0 0 92 92">
    <path d="M46 8L84 70H8z" fill="#2563EB" />
    <path d="M46 26L68 62H24z" fill="#fff" />
    <text x="46" y="88" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0B1A3F" fontFamily="inherit">a² + b² = c²</text>
  </svg>
)

export const Atom = () => (
  <svg {...A} width="44" height="44" viewBox="0 0 44 44">
    {[0, 60, 120].map(r => <ellipse key={r} cx="22" cy="22" rx="19" ry="7.5" fill="none" stroke="#3B6BD6" strokeWidth="2.2" transform={`rotate(${r} 22 22)`} />)}
    <circle cx="22" cy="22" r="4" fill="#3B6BD6" />
  </svg>
)
export const Sprout = () => (
  <svg {...A} width="40" height="40" viewBox="0 0 40 40">
    <rect x="2" y="2" width="36" height="36" rx="10" fill="#DCFCE7" />
    <path d="M20 32V18" stroke="#15803D" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M20 20c0-6 4-9 10-9 0 6-4 9-10 9zM20 22c0-5-3.5-8-9-8 0 5 3.5 8 9 8z" fill="#22C55E" />
    <path d="M13 32h14" stroke="#15803D" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
)
export const Flask = () => (
  <svg {...A} width="44" height="44" viewBox="0 0 44 44">
    <path d="M17 4h10v3h-1.5v10l9 15A3.5 3.5 0 0131.5 38h-19a3.5 3.5 0 01-3-5.9l9-15V7H17z" fill="#8B5CF6" />
    <path d="M12.5 27h19l3.4 5.1A3.5 3.5 0 0131.5 38h-19a3.5 3.5 0 01-3-5.9z" fill="#6D28D9" />
  </svg>
)
export const Bolt = () => (
  <svg {...A} width="40" height="40" viewBox="0 0 24 24"><path d="M13.5 1.5L4 13.5h7l-1.5 9L20 10h-7z" fill="#F59E0B" /></svg>
)
export const Paper = () => (
  <svg {...A} width="40" height="40" viewBox="0 0 40 40">
    <rect x="7" y="3" width="26" height="34" rx="4" fill="#E0E7FF" />
    <path d="M12 12h16M12 18h16M12 24h10" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="29" cy="30" r="7" fill="#22C55E" /><path d="M26 30l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
)

export const Bulb = () => (
  <svg {...A} width="30" height="30" viewBox="0 0 30 30">
    <path d="M15 3a9 9 0 00-5.4 16.2c.9.7 1.4 1.7 1.4 2.8h8c0-1.1.5-2.1 1.4-2.8A9 9 0 0015 3z" fill="#FCD34D" />
    <path d="M15 3a9 9 0 015.4 16.2c-.9.7-1.4 1.7-1.4 2.8h-4z" fill="#FBBF24" />
    <rect x="11" y="23" width="8" height="2.6" rx="1.3" fill="#94A3B8" />
    <rect x="12" y="26.5" width="6" height="2.4" rx="1.2" fill="#64748B" />
  </svg>
)

export const Sparkle = ({ size = 22, color = '#FFC53D' }) => (
  <svg {...A} width={size} height={size} viewBox="-10 -10 20 20">
    <path d="M0-10C1.2-3 3-1.2 10 0 3 1.2 1.2 3 0 10-1.2 3-3 1.2-10 0-3-1.2-1.2-3 0-10z" fill={color} />
  </svg>
)

/** Little "attention" rays above a card corner, as in the design. */
export const Rays = () => (
  <svg {...A} width="26" height="22" viewBox="0 0 26 22">
    <path d="M4 18L2 10M11 14l1-11M18 16l6-8" stroke="#FBBF24" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
)
