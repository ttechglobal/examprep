'use client'
// src/components/ui/DarkSplash.jsx — v1
// ─────────────────────────────────────────────────────────────────────────────
// A dark-aware full-screen loading state shown while the student layout
// fetches data. Replaces the plain white spinner that caused a flash of
// white on dark-mode users.
//
// How it works:
//   • Reads the current theme from the <html> class (same as ThemeContext)
//   • Renders instantly in the correct background colour — no flash
//   • Animated logo pulse + subtle shimmer bar
//
// Usage: replace any `return <DashboardSkeleton />` calls with:
//   import DarkSplash from '@/components/ui/DarkSplash'
//   return <DarkSplash />
//
// Or use directly in StudentLayoutClient as the loading state.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

export default function DarkSplash({ message = '' }) {
  const [isDark, setIsDark] = useState(false)

  // Read theme synchronously from html class — no flicker
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const bg      = isDark ? '#0a0c14' : '#f0f4ff'
  const cardBg  = isDark ? 'rgba(255,255,255,.04)' : '#ffffff'
  const border  = isDark ? 'rgba(255,255,255,.07)' : '#dde4f5'
  const textPrim = isDark ? '#ffffff' : '#071B49'
  const textTert = isDark ? 'rgba(255,255,255,.35)' : '#7a8aaa'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.96); }
        }
        @keyframes splash-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes splash-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Logo */}
      <div style={{ animation: 'splash-pulse 1.8s ease-in-out infinite' }}>
        <img
          src="/images/examprep_logo.png"
          alt="ExamPrep"
          width={56}
          height={56}
          style={{ objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: textPrim, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Exam<span style={{ fontWeight: 400, color: textTert }}>Prep</span>
        </p>
        {message && (
          <p style={{ fontSize: 12, color: textTert, marginTop: 6, fontWeight: 500 }}>{message}</p>
        )}
      </div>

      {/* Spinner */}
      <div style={{
        width: 24, height: 24,
        borderRadius: '50%',
        border: `2.5px solid ${isDark ? 'rgba(255,255,255,.1)' : '#dde4f5'}`,
        borderTopColor: '#1264E5',
        animation: 'splash-spin .7s linear infinite',
      }} />

      {/* Shimmer bar */}
      <div style={{
        width: 120, height: 3, borderRadius: 99,
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(18,100,229,.4) 50%, rgba(255,255,255,.04) 100%)'
          : 'linear-gradient(90deg, #dde4f5 0%, #1264E5 50%, #dde4f5 100%)',
        backgroundSize: '200% 100%',
        animation: 'splash-shimmer 1.8s ease-in-out infinite',
      }} />
    </div>
  )
}