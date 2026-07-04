'use client'
// src/app/student/games/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// DESIGN BRIEF:
//   The games app is a product we built. When a student enters, it should
//   feel like they stepped directly into the game — not into a framed window.
//   Zero chrome. Zero nav. The game takes the whole screen.
//
// IMPLEMENTATION:
//   1. On mount: hide the layout's bottom nav (BottomNavWrapper checks
//      document.body.dataset.hideNav) and position the container to cover
//      the full viewport including the sticky app header.
//   2. On unmount: restore both.
//   3. The iframe is 100dvh — not "remaining height after header" — so the
//      game truly fills edge to edge.
//   4. The back gesture is the device native back swipe (mobile) or the
//      browser back button. No floating overlay chrome polluting the game UI.
//   5. Loading state: full-screen game-themed animation (bouncing controller,
//      shimmer bar) — shown while opacity:0 iframe loads in background.
//   6. Error state: clean recovery screen, single "Try again" button.
//
// HOW THE LAYOUT ESCAPE WORKS:
//   The student layout renders a sticky header at top:0 z-index:40.
//   We counter this with position:fixed inset:0 z-index:50 on our container —
//   this puts the games view on top of everything including the header.
//   BottomNavWrapper's hideNav data attribute suppresses the bottom nav.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const GAMES_URL = 'https://exlgames.vercel.app/'

// ── Full-screen loading state ─────────────────────────────────────────────────
function GamesLoadingScreen() {
  // Cycle through loading messages — game voice, not generic spinner text
  const messages = [
    'Loading your games…',
    'Warming up the engines…',
    'Almost ready…',
    'Preparing your world…',
  ]
  const [msgIdx, setMsgIdx] = useState(0)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    // Cycle message every 2s
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2000)
    // Trigger bounce animation pulse
    const bounceTimer = setInterval(() => {
      setBounce(true)
      setTimeout(() => setBounce(false), 600)
    }, 1200)
    return () => { clearInterval(msgTimer); clearInterval(bounceTimer) }
  }, []) // eslint-disable-line

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28,
      background: '#0b1330', // deep navy — game atmosphere
    }}>
      {/* Starfield dots — ambient game atmosphere */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[
          { top: '12%', left: '18%', size: 2, opacity: 0.4 },
          { top: '22%', left: '72%', size: 3, opacity: 0.3 },
          { top: '35%', left: '8%',  size: 2, opacity: 0.5 },
          { top: '55%', left: '85%', size: 2, opacity: 0.35 },
          { top: '70%', left: '25%', size: 3, opacity: 0.25 },
          { top: '80%', left: '60%', size: 2, opacity: 0.4 },
          { top: '15%', left: '45%', size: 2, opacity: 0.3 },
          { top: '65%', left: '42%', size: 3, opacity: 0.2 },
          { top: '42%', left: '58%', size: 2, opacity: 0.45 },
          { top: '88%', left: '15%', size: 2, opacity: 0.3 },
        ].map((star, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: star.top, left: star.left,
            width: star.size, height: star.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: star.opacity,
          }} />
        ))}
      </div>

      {/* Animated game controller */}
      <div style={{
        width: 80, height: 80,
        borderRadius: 22,
        background: 'linear-gradient(135deg, #1a2060 0%, #0b1330 100%)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: bounce
          ? '0 4px 0 rgba(0,0,0,.6), 0 8px 32px rgba(99,102,241,.3)'
          : '0 10px 0 rgba(0,0,0,.6), 0 16px 48px rgba(99,102,241,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: bounce ? 'translateY(6px)' : 'translateY(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.85)" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="13" rx="3"/>
          <path d="M7 13h2M8 12v2"/>
          <circle cx="15" cy="11" r="1.2" fill="rgba(255,255,255,0.85)" stroke="none"/>
          <circle cx="17" cy="13" r="1.2" fill="rgba(255,255,255,0.85)" stroke="none"/>
          <circle cx="15" cy="15" r="1.2" fill="rgba(255,255,255,0.85)" stroke="none"/>
          <circle cx="13" cy="13" r="1.2" fill="rgba(255,255,255,0.85)" stroke="none"/>
          <path d="M6 7V6a1 1 0 011-1h3M18 7V6a1 1 0 00-1-1h-3"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <p style={{
          fontSize: 17, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.02em', marginBottom: 6,
          transition: 'opacity 0.3s',
        }}>
          {messages[msgIdx]}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          EXL Games · Learn through play
        </p>
      </div>

      {/* Shimmer progress bar */}
      <div style={{
        width: 140, height: 3, borderRadius: 999,
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-140px); width: 80px; }
          100% { transform: translateX(200px);  width: 80px; }
        }
      `}</style>
    </div>
  )
}

// ── Error recovery screen ─────────────────────────────────────────────────────
function GamesErrorScreen({ onRetry, onBack }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: 32, textAlign: 'center',
      background: '#0b1330',
    }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>🎮</div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Games couldn't load
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Check your internet connection<br />and try again.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBack}
          style={{
            padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}
        >← Back</button>
        <button
          onClick={onRetry}
          style={{
            padding: '11px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800,
            background: '#fff', color: '#0b1330',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 0 rgba(0,0,0,.4)',
          }}
        >Try again</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GamesPage() {
  const router    = useRouter()
  const iframeRef = useRef(null)
  const [loaded,  setLoaded]  = useState(false)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    // Hide bottom nav — BottomNavWrapper reads this attribute
    document.body.dataset.hideNav = 'true'

    return () => {
      // Restore when navigating away
      delete document.body.dataset.hideNav
    }
  }, [])

  function handleLoad() { setLoaded(true); setError(false) }
  function handleError() { setError(true); setLoaded(false) }

  function retryLoad() {
    setError(false)
    setLoaded(false)
    if (iframeRef.current) {
      iframeRef.current.src = ''
      // Small delay so the browser registers the src change
      setTimeout(() => { if (iframeRef.current) iframeRef.current.src = GAMES_URL }, 50)
    }
  }

  function goBack() { router.back() }

  return (
    // position:fixed inset:0 z-50 — completely overlays the layout including
    // the sticky header and any floating elements
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: '#0b1330',
    }}>
      {/* Loading overlay */}
      {!loaded && !error && <GamesLoadingScreen />}

      {/* Error overlay */}
      {error && <GamesErrorScreen onRetry={retryLoad} onBack={goBack} />}

      {/* The iframe — renders at full viewport, fades in on load */}
      <iframe
        ref={iframeRef}
        src={GAMES_URL}
        title="EXL Games"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          border: 'none', display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; storage-access; fullscreen"
        allowFullScreen
        loading="eager"
      />
    </div>
  )
}