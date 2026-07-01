'use client'
// src/components/dashboard/GamesFAB.jsx
//
// Persistent floating action button for EXL Games. Sits above the bottom
// nav on all student pages. Amber/orange — visually distinct from the
// indigo/blue of the practice flow so students always know games are
// a tap away without it competing with the primary action.

import { useRouter } from 'next/navigation'

export default function GamesFAB() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/student/games')}
      aria-label="Play a game"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 88,   // clears the bottom nav bar
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(217,119,6,0.45)',
        zIndex: 40,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.55)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 14px rgba(217,119,6,0.45)' }}
      onMouseDown={e =>   { e.currentTarget.style.transform = 'scale(0.95)' }}
      onMouseUp={e =>     { e.currentTarget.style.transform = 'scale(1.08)' }}
    >
      {/* Gamepad SVG */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="6" width="20" height="13" rx="4" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
        {/* D-pad */}
        <path d="M7 12h2M8 11v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        {/* Buttons */}
        <circle cx="15" cy="10.5" r="1.2" fill="white"/>
        <circle cx="17.5" cy="12.5" r="1.2" fill="white"/>
        {/* Joystick nubs */}
        <circle cx="6" cy="15.5" r="1" fill="white" fillOpacity="0.6"/>
        <circle cx="13" cy="15.5" r="1" fill="white" fillOpacity="0.6"/>
      </svg>
    </button>
  )
}