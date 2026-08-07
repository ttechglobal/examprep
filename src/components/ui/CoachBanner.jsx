'use client'
// src/components/ui/CoachBanner.jsx — v4
// REDESIGN: "Coach" → Zara, your study buddy.
// Zara is a fellow student, not an authority figure. Warm, relatable, on your side.
// Avatar: illustrated SVG character — a Nigerian teenage girl in school colours.
// Replaces with Emeka (boy character) if profile.buddy === 'emeka'.

function ZaraAvatar() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Background circle */}
      <circle cx="20" cy="20" r="20" fill="url(#zara-bg)"/>
      <defs>
        <radialGradient id="zara-bg" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1e2a6e"/>
          <stop offset="100%" stopColor="#0b1330"/>
        </radialGradient>
      </defs>
      {/* Neck */}
      <rect x="17" y="25" width="6" height="5" rx="2" fill="#C68642"/>
      {/* Shoulders / uniform top */}
      <path d="M9 36C9 31 13.5 28 20 28C26.5 28 31 31 31 36" fill="#1a3a8f"/>
      {/* Uniform collar */}
      <path d="M17 28L20 31L23 28" fill="white" opacity="0.8"/>
      {/* Head */}
      <circle cx="20" cy="20" r="8.5" fill="#C68642"/>
      {/* Hair — natural afro */}
      <path d="M11.5 19C11.5 13.2 15.3 10 20 10C24.7 10 28.5 13.2 28.5 19C28.5 17 27 14 24 13C22.5 12.5 20.5 12.2 19 12.5C15 13.2 12.5 16 11.5 19Z" fill="#1a0a00"/>
      <path d="M11.5 18C10.5 17 10 15.5 11 14C11.5 15 12 16 11.5 18Z" fill="#1a0a00"/>
      <path d="M28.5 18C29.5 17 30 15.5 29 14C28.5 15 28 16 28.5 18Z" fill="#1a0a00"/>
      {/* Eyes */}
      <ellipse cx="17" cy="20" rx="1.4" ry="1.5" fill="#1a0a00"/>
      <ellipse cx="23" cy="20" rx="1.4" ry="1.5" fill="#1a0a00"/>
      {/* Eye shine */}
      <circle cx="17.5" cy="19.4" r="0.5" fill="white"/>
      <circle cx="23.5" cy="19.4" r="0.5" fill="white"/>
      {/* Smile */}
      <path d="M17 23.5C17 23.5 18.5 25 20 25C21.5 25 23 23.5 23 23.5" stroke="#7a3f00" strokeWidth="1" strokeLinecap="round" fill="none"/>
      {/* Nose */}
      <path d="M19.2 21.5C19.2 21.5 19.8 22.2 20.8 21.5" stroke="#9a5a20" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
      {/* Small earrings */}
      <circle cx="11.8" cy="21" r="1" fill="#f59e0b"/>
      <circle cx="28.2" cy="21" r="1" fill="#f59e0b"/>
    </svg>
  )
}

function EmekaAvatar() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="url(#emeka-bg)"/>
      <defs>
        <radialGradient id="emeka-bg" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1e4a2e"/>
          <stop offset="100%" stopColor="#0b1f13"/>
        </radialGradient>
      </defs>
      {/* Neck */}
      <rect x="17" y="25" width="6" height="5" rx="2" fill="#8B5E3C"/>
      {/* Uniform */}
      <path d="M9 36C9 31 13.5 28 20 28C26.5 28 31 31 31 36" fill="#1a3a8f"/>
      <path d="M17 28L20 31L23 28" fill="white" opacity="0.8"/>
      {/* Head */}
      <circle cx="20" cy="20" r="8.5" fill="#8B5E3C"/>
      {/* Short hair */}
      <path d="M11.5 19.5C11.5 13.5 15.3 10.5 20 10.5C24.7 10.5 28.5 13.5 28.5 19.5C28.5 14 24.5 11.5 20 11.5C15.5 11.5 11.5 14 11.5 19.5Z" fill="#0f0800"/>
      {/* Eyes */}
      <ellipse cx="17" cy="20" rx="1.4" ry="1.5" fill="#0f0800"/>
      <ellipse cx="23" cy="20" rx="1.4" ry="1.5" fill="#0f0800"/>
      <circle cx="17.5" cy="19.4" r="0.5" fill="white"/>
      <circle cx="23.5" cy="19.4" r="0.5" fill="white"/>
      {/* Confident smile */}
      <path d="M16.5 23C16.5 23 18 25 20 25C22 25 23.5 23 23.5 23" stroke="#5a2800" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d="M19.2 21.5C19.2 21.5 19.8 22.2 20.8 21.5" stroke="#7a4020" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export default function CoachBanner({ emoji, message, buddy = 'zara', greeting = null }) {
  if (!message) return null
  const isZara = buddy !== 'emeka'

  return (
    <div style={{
      borderRadius: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 11,
    }}>
      <div style={{ flexShrink: 0, borderRadius: 12, overflow: 'hidden', width: 40, height: 40, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
        {isZara ? <ZaraAvatar /> : <EmekaAvatar />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: isZara ? '#9b7ae0' : '#6cce8e', marginBottom: 4, lineHeight: 1 }}>
          {isZara ? 'Zara' : 'Emeka'} · Study buddy
        </p>
        {/* Greeting + message flow as one natural sentence */}
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-prim)', lineHeight: 1.5 }}>
          {greeting ? <><strong style={{ fontWeight: 700 }}>{greeting}</strong> — {message}</> : message}
        </p>
      </div>
    </div>
  )
}