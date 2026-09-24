// src/components/student/profile/icons.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Duotone icons + small illustrations for the profile page.
// SVG rather than emoji so they render identically on every device.
// All decorative: callers pair them with visible text, so aria-hidden.
// ─────────────────────────────────────────────────────────────────────────────

const A = { 'aria-hidden': true, focusable: 'false' }

// ── UI glyphs ────────────────────────────────────────────────────────────────
export const ChevronRight = ({ size = 16 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
export const Pencil = ({ size = 16 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10.6 2.6l2.8 2.8M2.5 13.5l.7-3.2 8-8a1.3 1.3 0 011.8 0l.7.7a1.3 1.3 0 010 1.8l-8 8-3.2.7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const Check = ({ size = 12 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const Close = ({ size = 12 }) => (
  <svg {...A} width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

// ── Hero ─────────────────────────────────────────────────────────────────────
export function RankMedal({ label, size = 28 }) {
  return (
    <svg {...A} width={size} height={size} viewBox="0 0 28 28">
      <path d="M7 1h5l3 9H10z" fill="#3B82F6" />
      <path d="M21 1h-5l-3 9h5z" fill="#1D4ED8" />
      <circle cx="14" cy="17.5" r="8.5" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1.2" />
      <circle cx="14" cy="17.5" r="6" fill="#F3F4F6" />
      <text x="14" y="21" textAnchor="middle" fontSize="9" fontWeight="800" fill="#4B5563" fontFamily="inherit">{label}</text>
    </svg>
  )
}

function Sparkle({ x, y, r, fill, opacity = 1 }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${r / 10})`}
      d="M0-10C1.2-3 3-1.2 10 0 3 1.2 1.2 3 0 10-1.2 3-3 1.2-10 0-3-1.2-1.2-3 0-10z"
      fill={fill} opacity={opacity}
    />
  )
}

/** Mortarboard, tassel and sparkles for the right side of the hero. */
export function HeroArt() {
  return (
    <svg {...A} viewBox="0 0 560 176" preserveAspectRatio="xMaxYMax meet" width="100%" height="100%">
      <defs>
        <linearGradient id="pf-cap-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#1638B8" />
        </linearGradient>
        <linearGradient id="pf-cap-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A3FA8" />
          <stop offset="1" stopColor="#0C2270" />
        </linearGradient>
        <linearGradient id="pf-tassel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD35A" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* faint background sparkles */}
      <Sparkle x={48}  y={30}  r={11} fill="#5B8CFF" opacity={0.35} />
      <Sparkle x={170} y={116} r={14} fill="#5B8CFF" opacity={0.3} />
      <Sparkle x={500} y={112} r={9}  fill="#5B8CFF" opacity={0.4} />
      <Sparkle x={482} y={30}  r={6}  fill="#7EA6FF" opacity={0.45} />
      {/* cap body (skull) */}
      <path d="M262 110c0 28 44 54 104 54s104-26 104-54V86H262z" fill="url(#pf-cap-side)" />
      {/* board */}
      <path d="M180 88L372 24l168 64-192 66z" fill="url(#pf-cap-top)" />
      <path d="M180 88l168 66 192-66-4 10-188 64L180 96z" fill="#0F2C8E" opacity=".75" />
      <path d="M200 86L372 32l24 9-172 55z" fill="#fff" opacity=".12" />
      {/* tassel cord + button */}
      <path d="M358 88c-30 6-66 20-78 40" stroke="url(#pf-tassel)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="360" cy="88" r="8" fill="#FFC53D" />
      <path d="M270 124l20 4-2 34c-1 6-17 6-19 0z" fill="url(#pf-tassel)" />
      <path d="M272 162c2 4 14 4 16 0" stroke="#D97706" strokeWidth="2" fill="none" />
      {/* gold star */}
      <Sparkle x={420} y={60} r={22} fill="#FFC53D" />
    </svg>
  )
}

// ── Feature cards ────────────────────────────────────────────────────────────
export const Crown = () => (
  <svg {...A} width="30" height="30" viewBox="0 0 32 32">
    <path d="M4 11l6 5 6-9 6 9 6-5-2.5 13h-19z" fill="#16A34A" />
    <path d="M6.5 24h19v3h-19z" fill="#15803D" />
    <circle cx="4" cy="10" r="2" fill="#22C55E" /><circle cx="16" cy="6" r="2" fill="#22C55E" /><circle cx="28" cy="10" r="2" fill="#22C55E" />
  </svg>
)

export const Compass = () => (
  <svg {...A} width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="#fff" stroke="#1264E5" strokeWidth="3" />
    <path d="M20.5 11.5L17.6 17.6 11.5 20.5l2.9-6.1z" fill="#EF4444" />
    <path d="M11.5 20.5l2.9-6.1 3.2 3.2z" fill="#1264E5" />
    <circle cx="16" cy="16" r="1.4" fill="#fff" />
  </svg>
)

export const Parents = () => (
  <svg {...A} width="32" height="32" viewBox="0 0 32 32">
    <circle cx="11" cy="10" r="5" fill="#1264E5" />
    <path d="M2 26c0-5.5 4-9 9-9s9 3.5 9 9z" fill="#1264E5" />
    <circle cx="22" cy="12" r="4" fill="#60A5FA" />
    <path d="M16 26c0-4.4 2.7-7.4 6-7.4s7 3 7 7.4z" fill="#60A5FA" />
  </svg>
)

/** Hills + signpost + trees, bottom-right of Career Quest. */
export const CareerArt = () => (
  <svg {...A} viewBox="0 0 120 64" width="112" height="60">
    <path d="M30 64L62 18l14 18 10-10 34 38z" fill="#5BA7E6" />
    <path d="M62 18l7 9-7 4-4-3z" fill="#fff" opacity=".85" />
    <path d="M86 26l8 8-5 2-4-4z" fill="#fff" opacity=".7" />
    <path d="M40 64c10-16 26-22 44-18s26 10 36 18z" fill="#4ADE80" />
    <path d="M0 64c12-10 28-14 46-8l-4 8z" fill="#86EFAC" />
    <rect x="22" y="34" width="3" height="30" rx="1" fill="#92400E" />
    <path d="M10 36h22l3 3-3 3H10z" fill="#B45309" />
    <path d="M36 45H16l-3 3 3 3h20z" fill="#D97706" />
    <circle cx="52" cy="46" r="6" fill="#16A34A" /><rect x="51" y="50" width="2" height="8" fill="#92400E" />
    <circle cx="100" cy="44" r="5" fill="#22C55E" /><rect x="99" y="47" width="2" height="7" fill="#92400E" />
  </svg>
)

/** Envelope + mini bar chart card, bottom-right of Parents Report. */
export const ReportArt = () => (
  <svg {...A} viewBox="0 0 90 64" width="84" height="60">
    <rect x="36" y="4" width="46" height="54" rx="4" fill="var(--pf-surface, #fff)" stroke="var(--pf-line, #E2E8F0)" />
    <rect x="46" y="34" width="6" height="14" rx="1.5" fill="#FCA5A5" />
    <rect x="55" y="26" width="6" height="22" rx="1.5" fill="#F87171" />
    <rect x="64" y="18" width="6" height="30" rx="1.5" fill="#EF4444" />
    <rect x="4" y="30" width="36" height="26" rx="3" fill="#60A5FA" />
    <path d="M4 32l18 13 18-13" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
  </svg>
)

// ── Subjects ─────────────────────────────────────────────────────────────────
// Sized in em so the container's font-size sets the icon size.
const S = (children) => (
  <svg {...A} width="1em" height="1em" viewBox="0 0 24 24">{children}</svg>
)

const SUBJECT_ICONS = {
  'English Language': () => S(<>
    <path d="M2 5.5C5 4.5 8.5 4.6 12 6.5v13c-3.5-1.9-7-2-10-1z" fill="#3B82F6" />
    <path d="M22 5.5c-3-1-6.5-.9-10 1v13c3.5-1.9 7-2 10-1z" fill="#60A5FA" />
    <path d="M12 6.5v13" stroke="#1D4ED8" strokeWidth="1" />
  </>),
  'Mathematics': () => S(<>
    <rect x="4" y="2" width="16" height="20" rx="3" fill="#6366F1" />
    <rect x="6.5" y="4.5" width="11" height="4.5" rx="1" fill="#E0E7FF" />
    {[0, 1, 2].map(r => [0, 1, 2].map(c => (
      <rect key={`${r}${c}`} x={6.5 + c * 4} y={11 + r * 3.6} width="3" height="2.4" rx=".6" fill="#fff" />
    )))}
  </>),
  'Physics': () => S(<path d="M13.5 1.5L4 13.5h7l-1.5 9L20 10h-7z" fill="#F97316" />),
  'Chemistry': () => S(<>
    <path d="M9 2h6v2h-1v5l6.2 10A2 2 0 0118.5 22h-13a2 2 0 01-1.7-3L10 9V4H9z" fill="#10B981" />
    <path d="M6.3 15h11.4l2.5 4A2 2 0 0118.5 22h-13a2 2 0 01-1.7-3z" fill="#047857" />
  </>),
  'Biology': () => S(<>
    <path d="M20 3C9 3 4 8.5 4 15c0 2.5.8 4.4 1.6 5.4C8 12 13 9 17 7.5 12 11 8.5 15 7 21c1 .5 2.5 1 4 1 7 0 10-8 9-19z" fill="#22C55E" />
  </>),
  'Further Mathematics': () => S(<>
    <path d="M3 21V3l18 18z" fill="#FB923C" />
    <path d="M7 17V12l5 5z" fill="#FFF7ED" />
    <path d="M3 21V3l18 18z" fill="none" stroke="#EA580C" strokeWidth="1" />
  </>),
  'Accounting': () => S(<>
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#EF4444" />
    <rect x="5.5" y="5.5" width="13" height="3.5" rx="1" fill="#FEE2E2" />
    {[0, 1].map(r => [0, 1, 2].map(c => (
      <rect key={`${r}${c}`} x={5.5 + c * 4.5} y={11 + r * 4} width="3.5" height="2.8" rx=".6" fill={c === 2 ? '#FDE68A' : '#fff'} />
    )))}
  </>),
  'Economics': () => S(<>
    <rect x="3"  y="12" width="4.5" height="10" rx="1" fill="#F59E0B" />
    <rect x="9.75" y="6" width="4.5" height="16" rx="1" fill="#3B82F6" />
    <rect x="16.5" y="9" width="4.5" height="13" rx="1" fill="#22C55E" />
  </>),
  'Government': () => S(<>
    <path d="M12 2l10 5H2z" fill="#8B5CF6" />
    <rect x="2" y="19" width="20" height="3" rx="1" fill="#8B5CF6" />
    {[4, 9, 14, 18.5].map(x => <rect key={x} x={x} y="8.5" width="2.2" height="9.5" fill="#A78BFA" />)}
  </>),
}
SUBJECT_ICONS['Use of English'] = SUBJECT_ICONS['English Language']

const FallbackSubject = () => S(<>
  <rect x="4" y="2" width="16" height="20" rx="2.5" fill="#64748B" />
  <rect x="7" y="6" width="10" height="2" rx="1" fill="#E2E8F0" />
  <rect x="7" y="10" width="7" height="2" rx="1" fill="#E2E8F0" />
</>)

export function SubjectGlyph({ name }) {
  const Icon = SUBJECT_ICONS[name] ?? FallbackSubject
  return <Icon />
}

// ── Activity stats ───────────────────────────────────────────────────────────
export const StatBook = () => S(<>
  <path d="M2 5c3-1.2 6.5-1 10 1v14c-3.5-2-7-2.2-10-1z" fill="#22C55E" />
  <path d="M22 5c-3-1.2-6.5-1-10 1v14c3.5-2 7-2.2 10-1z" fill="#16A34A" />
</>)
export const StatTarget = () => S(<>
  <circle cx="11" cy="13" r="9" fill="none" stroke="#F43F5E" strokeWidth="2.6" />
  <circle cx="11" cy="13" r="4.2" fill="none" stroke="#F43F5E" strokeWidth="2.6" />
  <path d="M11 13l9-9M16.5 3.5L20 4l.5 3.5" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
</>)
export const StatBolt = () => S(<path d="M13.5 1.5L4 13.5h7l-1.5 9L20 10h-7z" fill="#F59E0B" />)
export const StatBars = () => S(<>
  <rect x="3" y="12" width="4.5" height="10" rx="1.2" fill="#3B82F6" />
  <rect x="9.75" y="4" width="4.5" height="18" rx="1.2" fill="#1264E5" />
  <rect x="16.5" y="9" width="4.5" height="13" rx="1.2" fill="#3B82F6" />
</>)
export const SmallBars = () => (
  <svg {...A} width="18" height="18" viewBox="0 0 24 24">
    <rect x="3" y="12" width="4" height="10" rx="1" fill="currentColor" />
    <rect x="10" y="4" width="4" height="18" rx="1" fill="currentColor" />
    <rect x="17" y="9" width="4" height="13" rx="1" fill="currentColor" />
  </svg>
)

// ── Goals ────────────────────────────────────────────────────────────────────
export const GoalCap = () => S(<>
  <path d="M1 9l11-5 11 5-11 5z" fill="#7C3AED" />
  <path d="M5.5 11.5v4.5c0 1.8 3 3.5 6.5 3.5s6.5-1.7 6.5-3.5v-4.5L12 14.5z" fill="#6D28D9" />
  <path d="M21 9.5v6" stroke="#6D28D9" strokeWidth="1.6" strokeLinecap="round" />
</>)
export const GoalBook = () => S(<>
  <path d="M2 5c3-1.2 6.5-1 10 1v14c-3.5-2-7-2.2-10-1z" fill="#22C55E" />
  <path d="M22 5c-3-1.2-6.5-1-10 1v14c3.5-2 7-2.2 10-1z" fill="#16A34A" />
</>)
export const GoalTarget = () => S(<>
  <circle cx="12" cy="12" r="9.5" fill="none" stroke="#7C3AED" strokeWidth="2.6" />
  <circle cx="12" cy="12" r="4.5" fill="#A855F7" />
</>)

// ── Settings ─────────────────────────────────────────────────────────────────
export const SetPalette = () => S(<>
  <path d="M12 2.5a9.5 9.5 0 000 19c1.4 0 2-1 2-2 0-1.2-1-1.6-1-2.7 0-1.1.9-1.8 2-1.8h2.2a4.3 4.3 0 004.3-4.3C21.5 6 17.2 2.5 12 2.5z" fill="#F9A8D4" />
  <circle cx="7.5" cy="11" r="1.6" fill="#EF4444" /><circle cx="10" cy="7" r="1.6" fill="#F59E0B" />
  <circle cx="14.5" cy="7" r="1.6" fill="#22C55E" /><circle cx="17" cy="10.5" r="1.6" fill="#3B82F6" />
</>)
export const SetBell = () => S(<>
  <path d="M12 2.5a6.5 6.5 0 00-6.5 6.5v4.5L3.5 17h17l-2-3.5V9A6.5 6.5 0 0012 2.5z" fill="#F59E0B" />
  <path d="M9.5 19a2.5 2.5 0 005 0z" fill="#D97706" />
</>)
export const SetGlobe = () => S(<>
  <circle cx="12" cy="12" r="9.5" fill="none" stroke="#3B82F6" strokeWidth="2" />
  <path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" stroke="#3B82F6" strokeWidth="1.6" fill="none" />
</>)
export const SetShield = () => S(<>
  <path d="M12 2L4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5z" fill="#1264E5" />
  <path d="M12 2v20c4.6-1.7 8-6 8-11V5z" fill="#0B4FC4" />
</>)
