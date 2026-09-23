'use client'
// src/components/ui/InstallPrompt.jsx
// Shows a bottom-sheet install banner after the user has been in the app for
// 60 seconds. Tapping "Install" fires the browser's native install flow.
// Dismissed state is persisted so it never shows again once the user
// dismisses or installs.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { usePWAInstall, promptInstall, DISMISS_KEY } from '@/lib/pwaInstall'

const DELAY_MS = 60_000   // 1 minute

// Marketing pages have their own Install buttons, so no timed banner there.
const SKIP_PATHS = ['/', '/schools', '/ambassador', '/demo']

export default function InstallPrompt() {
  // Shared with the landing page buttons (lib/pwaInstall.js), so the
  // browser's one-time install offer is never missed or used twice.
  const pwa      = usePWAInstall()
  const pathname = usePathname()
  const [visible,    setVisible]    = useState(false)
  const [installing, setInstalling] = useState(false)

  const eligible =
    pwa.canPrompt && !pwa.standalone && !pwa.installed && !SKIP_PATHS.includes(pathname)

  useEffect(() => {
    if (!eligible) { setVisible(false); return }
    try { if (localStorage.getItem(DISMISS_KEY)) return } catch {}
    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible])

  async function handleInstall() {
    setInstalling(true)
    await promptInstall()          // marks dismissed-for-good when accepted
    setVisible(false)
    setInstalling(false)
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'var(--card, #fff)',
        borderRadius: '24px 24px 0 0',
        padding: '20px 20px 32px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        animation: 'ep-slide-up .3s cubic-bezier(.22,1,.36,1) both',
      }}>
        <style>{`
          @keyframes ep-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(0,0,0,.14)' }} />

        {/* App icon */}
        <img
          src="/images/examprep_logo.png"
          alt="ExamPrep"
          style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'contain',
                   boxShadow: '0 4px 16px rgba(6,42,120,.18)' }}
        />

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>
            Install ExamPrep A1
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5, maxWidth: 300 }}>
            Add to your home screen for faster access, offline practice, and the full app experience.
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1, padding: '13px 0',
              borderRadius: 14, border: '1.5px solid rgba(0,0,0,.12)',
              background: 'transparent',
              fontSize: 15, fontWeight: 700,
              color: 'var(--text-secondary, #64748b)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              flex: 2, padding: '13px 0',
              borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #062A78, #1A4BAF)',
              fontSize: 15, fontWeight: 800,
              color: '#fff',
              cursor: installing ? 'default' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(6,42,120,.35)',
              opacity: installing ? 0.7 : 1,
              transition: 'opacity .15s',
            }}
          >
            {installing ? 'Installing…' : '⬇️  Install'}
          </button>
        </div>
      </div>
    </>
  )
}