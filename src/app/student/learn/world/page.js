'use client'
// src/app/student/learn/world/page.js
// Full-screen immersive view — no app header, no bottom nav (suppressed via
// SHELL_EXCLUDED in student/layout.js). The iframe fills the entire viewport.
// A single close button in the top-right corner returns to /student/learn.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const WORLD_URL = 'https://exlgames.vercel.app/worlds'
const NAVY = '#062A78'
const BLUE = '#1264E5'

export default function LearningWorldPage() {
  const router              = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [error,  setError]  = useState(false)
  const iframeRef           = useRef(null)

  function reload() {
    setError(false)
    setLoaded(false)
    if (iframeRef.current) iframeRef.current.src = WORLD_URL
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Close button — top-right, always above iframe ── */}
      <button
        onClick={() => router.push('/student/learn')}
        title="Close"
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 10,
          width: 38, height: 38, borderRadius: 11,
          background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.65)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,.45)'}
      >
        {/* × icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── Loading overlay ── */}
      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18,
          background: 'var(--bg-base)', pointerEvents: 'none',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: `linear-gradient(135deg,${NAVY},${BLUE})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: `0 10px 30px ${BLUE}40`,
            animation: 'worldPulse 1.4s ease-in-out infinite',
          }}>🌍</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)' }}>
            Loading Learning World…
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tert)' }}>
            This may take a moment
          </div>
          <style>{`
            @keyframes worldPulse {
              0%,100% { transform: scale(1); opacity: 1; }
              50%      { transform: scale(1.07); opacity: .85; }
            }
          `}</style>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 44 }}>🌐</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)' }}>
            Couldn't load Learning World
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tert)', lineHeight: 1.6, maxWidth: 300 }}>
            This might be a connection issue or the site may be temporarily unavailable.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={reload}
              style={{
                padding: '11px 22px', borderRadius: 12, border: 'none',
                background: BLUE, color: '#fff', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Try again
            </button>
            <a
              href={WORLD_URL} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                padding: '11px 22px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-prim)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
                Open in browser
              </div>
            </a>
          </div>
        </div>
      )}

      {/* ── Iframe — fills everything ── */}
      {!error && (
        <iframe
          ref={iframeRef}
          src={WORLD_URL}
          title="EXL Learning World"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity .35s ease',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  )
}