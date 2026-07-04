'use client'
// src/app/student/games/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// REDESIGN: Full iframe embed of https://exlgames.vercel.app/
//
// The games project is a separate deployment. This page loads it in a
// seamless full-height iframe so it feels like a native part of the app.
//
// DESIGN DECISIONS:
//   1. Thin native header (app chrome): back button, "Games" title, themed
//      — keeps the student inside the app shell visually
//   2. Iframe fills ALL remaining height — no outer scrollbar
//   3. Loading state: game-themed skeleton with animated dots
//   4. allow="*" gives the iframe full capability (audio, storage, etc.)
//   5. Header uses the same nav-bg + border-default tokens as the rest of the app
//   6. The games project receives no auth tokens — it's self-contained
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const GAMES_URL = 'https://exlgames.vercel.app/'

// ── Loading skeleton ──────────────────────────────────────────────────────────
function GamesLoadingSkeleton() {
  const [dot, setDot] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])

  const dots = '.'.repeat(dot)

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      background: 'var(--bg-base)',
      padding: 32,
    }}>
      {/* Animated game controller */}
      <div style={{
        width: 72, height: 72,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #0b1330 0%, #1a2060 100%)',
        boxShadow: '0 8px 0 #05070f, 0 12px 32px rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'gamebounce 1.2s ease-in-out infinite',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="13" rx="3"/>
          <path d="M7 13h2M8 12v2"/>
          <circle cx="15" cy="11" r="1" fill="white" stroke="none"/>
          <circle cx="17" cy="13" r="1" fill="white" stroke="none"/>
          <circle cx="15" cy="15" r="1" fill="white" stroke="none"/>
          <circle cx="13" cy="13" r="1" fill="white" stroke="none"/>
          <path d="M6 7V6a1 1 0 011-1h3M18 7V6a1 1 0 00-1-1h-3"/>
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-prim)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Loading EXL Games{dots}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.55 }}>
          Your study companion — learn through play
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: 160, height: 4, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, #0b1330, #4f46e5)',
          animation: 'gamesload 1.8s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes gamebounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes gamesload {
          0%   { width: 0%;    margin-left: 0; }
          50%  { width: 60%;   margin-left: 20%; }
          100% { width: 0%;    margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GamesPage() {
  const router   = useRouter()
  const iframeRef = useRef(null)
  const [loaded, setLoaded]  = useState(false)
  const [error,  setError]   = useState(false)

  // When iframe loads, fade it in
  function handleLoad() {
    setLoaded(true)
    setError(false)
  }

  function handleError() {
    setError(true)
    setLoaded(false)
  }

  return (
    <div style={{
      // Override the student layout padding — games should be edge-to-edge
      // We use negative margins to escape the layout's padding
      margin: '-20px -16px',
      height: 'calc(100dvh - 56px)', // full height minus the app header (56px)
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>

      {/* ── Games app bar ── */}
      <div style={{
        flexShrink: 0,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Back to app */}
        <button
          onClick={() => router.push('/student/dashboard')}
          style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: 'var(--text-sec)',
            cursor: 'pointer',
          }}
        >←</button>

        {/* Game controller icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: '#0b1330',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 0 #05070f',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="13" rx="3"/>
            <path d="M7 13h2M8 12v2"/>
            <circle cx="15" cy="11" r="1" fill="white" stroke="none"/>
            <circle cx="17" cy="13" r="1" fill="white" stroke="none"/>
            <circle cx="15" cy="15" r="1" fill="white" stroke="none"/>
            <circle cx="13" cy="13" r="1" fill="white" stroke="none"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            EXL Games
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-tert)', lineHeight: 1 }}>
            Learn through play
          </p>
        </div>

        {/* Live indicator */}
        {loaded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,.6)',
              animation: 'livepulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tert)' }}>Live</span>
          </div>
        )}

        {/* Reload button (shown on error) */}
        {error && (
          <button
            onClick={() => {
              setError(false)
              setLoaded(false)
              if (iframeRef.current) iframeRef.current.src = GAMES_URL
            }}
            style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              color: 'var(--text-sec)', cursor: 'pointer',
            }}
          >↺ Reload</button>
        )}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Loading skeleton — shown until iframe fires onLoad */}
        {!loaded && !error && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
            <GamesLoadingSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center',
            background: 'var(--bg-base)',
          }}>
            <span style={{ fontSize: 40 }}>🎮</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6 }}>
                Games couldn't load
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.55 }}>
                Check your internet connection and try again.
              </p>
            </div>
            <button
              onClick={() => {
                setError(false)
                setLoaded(false)
                if (iframeRef.current) { iframeRef.current.src = ''; iframeRef.current.src = GAMES_URL }
              }}
              style={{
                padding: '12px 28px', borderRadius: 14, fontSize: 14, fontWeight: 800,
                background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 5px 0 #05070f',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* The actual iframe — always rendered so it loads in the background */}
        <iframe
          ref={iframeRef}
          src={GAMES_URL}
          title="EXL Games"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            // Fade in once loaded
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; storage-access; fullscreen"
          allowFullScreen
          loading="eager"
        />
      </div>

      <style>{`
        @keyframes livepulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}