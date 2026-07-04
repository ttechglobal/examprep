'use client'
// src/components/ui/GamesFAB.jsx
// Floating Action Button — launches EXL Games
// Positioned above the bottom nav, right side
// Shows on all student pages except the games page itself
// Navy background with game controller icon + "Games" label
// Same 3D shadow language as the CTA buttons

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

export default function GamesFAB() {
  const router   = useRouter()
  const pathname = usePathname()
  const [pressed, setPressed] = useState(false)

  // Don't show on games page, practice session, or practice results
  // (session is immersive — FAB overlaps nav buttons and breaks focus)
  if (
    pathname.startsWith('/student/games') ||
    pathname.startsWith('/games') ||
    pathname === '/student/practice/session' ||
    pathname === '/student/practice/results'
  ) return null

  return (
    <button
      onClick={() => router.push('/student/games')}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      aria-label="Open EXL Games"
      style={{
        position: 'fixed',
        bottom: 88,   // sits above the 72px bottom nav
        right: 16,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 16px',
        borderRadius: 20,
        background: '#0b1330',
        border: 'none',
        cursor: 'pointer',
        transform: pressed ? 'translateY(3px)' : 'none',
        boxShadow: pressed
          ? '0 2px 0 #05070f, 0 4px 10px rgba(0,0,0,.35)'
          : '0 5px 0 #05070f, 0 8px 20px rgba(0,0,0,.35)',
        transition: 'transform .1s, box-shadow .1s',
      }}
      className="lg:hidden"
    >
      {/* Game controller icon */}
      <svg
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="#fff" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="13" rx="3"/>
        {/* D-pad */}
        <path d="M7 13h2M8 12v2"/>
        {/* Face buttons */}
        <circle cx="15" cy="11" r="1" fill="#fff" stroke="none"/>
        <circle cx="17" cy="13" r="1" fill="#fff" stroke="none"/>
        <circle cx="15" cy="15" r="1" fill="#fff" stroke="none"/>
        <circle cx="13" cy="13" r="1" fill="#fff" stroke="none"/>
        {/* Shoulder bumpers */}
        <path d="M6 7V6a1 1 0 011-1h3M18 7V6a1 1 0 00-1-1h-3"/>
      </svg>
      <span style={{
        fontSize: 13,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        Games
      </span>
    </button>
  )
}