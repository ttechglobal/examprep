'use client'
// src/components/ui/NotificationScheduler.jsx — v4
//
// Mounted once in the student layout. Two jobs:
//   1. Mounting usePushSubscription: when the app opens with notifications
//      already allowed, the hook re-saves this device on the server.
//   2. The in-app banner that explains the reminders before the browser asks.
//      Tapping Enable opens the browser's own permission prompt.
//
// Banner behaviour:
//   - Shows 3 seconds after mount, only while the browser hasn't been asked (status 'off')
//   - Once per day (Lagos calendar day), × hides it until tomorrow
//   - Never when blocked, unsupported or already on
//
// Scheduling is server-side (pg_cron → Edge Function → Web Push).
//
// v4: status comes from the shared hook (on = saved on the server, not just
//     allowed). The "once per day" check uses the Lagos day (lib/dates), not UTC.
//     Text 13 px and tap targets 44 px (standards §6). The times shown must
//     match the jobs in 20261001_notifications.sql.

import { useState, useEffect }   from 'react'
import { usePushSubscription }   from '@/hooks/usePushSubscription'
import { appDay }                from '@/lib/dates'

const K_BANNER_DAY = 'ep_notif_banner_day'
const SHOW_AFTER_MS = 3000

function ls(k)       { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k, v) { try { localStorage.setItem(k, String(v)) } catch {} }

export default function NotificationScheduler() {
  const [showBanner, setShowBanner] = useState(false)
  const [enabling,   setEnabling]   = useState(false)
  const { status, enable }          = usePushSubscription()

  useEffect(() => {
    if (status !== 'off' || ls(K_BANNER_DAY) === appDay()) { setShowBanner(false); return }
    const t = setTimeout(() => setShowBanner(true), SHOW_AFTER_MS)
    return () => clearTimeout(t)
  }, [status])

  async function handleEnable() {
    setEnabling(true)
    lsSet(K_BANNER_DAY, appDay())
    await enable()              // shows the browser's prompt, then saves this device
    setShowBanner(false)
    setEnabling(false)
  }

  function handleDismiss() {
    lsSet(K_BANNER_DAY, appDay())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      <style>{`
        @keyframes ep-banner-in {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
      <div role="dialog" aria-label="Enable practice reminders" style={{
        position:   'fixed', top: 0, left: 0, right: 0, zIndex: 8888,
        background: 'linear-gradient(135deg, #062A78, #1264E5)',
        padding:    '10px 16px',
        paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
        display:    'flex', alignItems: 'center', gap: 10,
        boxShadow:  '0 4px 20px rgba(6,42,120,.35)',
        animation:  'ep-banner-in .3s cubic-bezier(.22,1,.36,1) both',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🔔</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            Enable practice reminders
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 1 }}>
            We'll remind you at 12pm, 4pm &amp; 8pm every day.
          </div>
        </div>

        <button
          onClick={handleEnable}
          disabled={enabling}
          style={{
            flexShrink: 0, padding: '7px 14px', minHeight: 44,
            borderRadius: 10, border: 'none',
            background: enabling ? '#CC8F00' : '#FFB800',
            color: '#062A78', fontSize: 13, fontWeight: 900,
            cursor: enabling ? 'default' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 0 #CC8F00', opacity: enabling ? 0.8 : 1,
            transition: 'opacity .15s',
          }}
        >
          {enabling ? 'Enabling…' : 'Enable'}
        </button>

        <button
          onClick={handleDismiss}
          style={{
            flexShrink: 0, width: 44, height: 44,
            borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,.15)',
            color: '#fff', fontSize: 18, lineHeight: 1,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Not now"
        >
          ×
        </button>
      </div>
    </>
  )
}