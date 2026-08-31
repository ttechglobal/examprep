'use client'
// src/app/student/learn/world/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Embeds https://exlgames.vercel.app/worlds inside the app.
// Feels like a native page — back button returns to /student/learn.
// The iframe gets the full remaining viewport height so it scrolls internally.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import Link from 'next/link'

const WORLD_URL = 'https://exlgames.vercel.app/worlds'
const NAVY = '#062A78'
const BLUE = '#1264E5'

export default function LearningWorldPage() {
  const [loaded, setLoaded]   = useState(false)
  const [error, setError]     = useState(false)
  const iframeRef             = useRef(null)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0 }}>

      {/* ── Top bar ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'0 0 14px',
        flexShrink:0,
      }}>
        <Link href="/student/learn" style={{ textDecoration:'none' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'8px 14px', borderRadius:11,
            border:'1px solid var(--border)', background:'var(--bg-card)',
            cursor:'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M10.5 6.5h-8M6 3L2.5 6.5 6 10" stroke="var(--text-tert)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>Back to Learn</span>
          </div>
        </Link>

        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>
            🌍 EXL Learning World
          </div>
          <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:1 }}>
            Interactive learning — learn by doing
          </div>
        </div>

        {/* Open in new tab fallback */}
        <a href={WORLD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', flexShrink:0 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'7px 12px', borderRadius:10,
            border:'1px solid var(--border)', background:'var(--bg-card)',
            fontSize:11, fontWeight:700, color:'var(--text-tert)', cursor:'pointer',
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M6.5 1H10v3.5M10 1L5.5 5.5M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5" stroke="var(--text-tert)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Open tab
          </div>
        </a>
      </div>

      {/* ── Loading state ── */}
      {!loaded && !error && (
        <div style={{
          position:'absolute', inset:0, top:70, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:16,
          background:'var(--bg-base)', zIndex:1, pointerEvents:'none',
        }}>
          <div style={{
            width:48, height:48, borderRadius:16,
            background:`linear-gradient(135deg,${NAVY},${BLUE})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, boxShadow:'0 8px 24px rgba(18,100,229,.3)',
            animation:'worldPulse 1.4s ease-in-out infinite',
          }}>
            🌍
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-prim)' }}>Loading Learning World…</div>
          <div style={{ fontSize:12, color:'var(--text-tert)' }}>This may take a moment</div>
          <style>{`@keyframes worldPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.85} }`}</style>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{
          flex:1, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:16, padding:32,
          textAlign:'center',
        }}>
          <div style={{ fontSize:40 }}>🌐</div>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)' }}>
            Couldn't load Learning World
          </div>
          <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, maxWidth:280 }}>
            This might be a connection issue or the site may be temporarily unavailable.
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => { setError(false); setLoaded(false); if (iframeRef.current) iframeRef.current.src = WORLD_URL }}
              style={{ padding:'10px 20px', borderRadius:11, border:'none', background:BLUE, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
            >
              Try again
            </button>
            <a href={WORLD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>
              <div style={{ padding:'10px 20px', borderRadius:11, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Open in browser
              </div>
            </a>
          </div>
        </div>
      )}

      {/* ── The iframe ── */}
      {!error && (
        <iframe
          ref={iframeRef}
          src={WORLD_URL}
          title="EXL Learning World"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            flex:1,
            width:'100%',
            height:'calc(100dvh - 160px)',  // fallback for non-flex contexts (mobile)
            border:'none',
            borderRadius:16,
            background:'var(--bg-card)',
            opacity: loaded ? 1 : 0,
            transition:'opacity .3s ease',
            minHeight:400,
            display:'block',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  )
}