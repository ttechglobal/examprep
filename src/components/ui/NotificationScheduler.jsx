'use client'
// src/components/ui/NotificationScheduler.jsx — v3 (server-push)
//
// This component has ONE job: show the permission banner to users who
// haven't granted notification permission yet. That's it.
//
// Scheduling is now entirely server-side (pg_cron → Edge Function → Web Push).
// This component no longer does any setTimeout or SW postMessage scheduling.
//
// Banner behaviour:
//   - Shows 3 seconds after mount (gives page time to settle)
//   - Only if permission is not yet granted
//   - Only once per day (localStorage gate)
//   - Never shows if browser has permanently denied (nothing we can do)
//   - Tapping Enable → calls usePushSubscription().subscribe()
//   - Tapping × → closes for today, tries again tomorrow

import { useState, useEffect }    from 'react'
import { usePushSubscription }    from '@/hooks/usePushSubscription'

const K_BANNER_DAY = 'ep_notif_banner_day'
const K_DENIED     = 'ep_notif_perm_denied'

function ls(k)       { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k, v) { try { localStorage.setItem(k, String(v)) } catch {} }
function todayStr()  { return new Date().toISOString().slice(0, 10) }

export default function NotificationScheduler() {
  const [showBanner, setShowBanner]  = useState(false)
  const [enabling,   setEnabling]    = useState(false)
  const { permission, subscribe }    = usePushSubscription()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window))   return

    // Already granted — nothing to do, server handles the rest
    if (permission === 'granted') return

    // Permanently denied at browser level — can't do anything
    if (permission === 'denied') {
      lsSet(K_DENIED, '1')
      return
    }

    if (ls(K_DENIED))                      return  // previously detected as denied
    if (ls(K_BANNER_DAY) === todayStr())   return  // already showed today

    const t = setTimeout(() => setShowBanner(true), 3000)
    return () => clearTimeout(t)
  }, [permission])

  async function handleEnable() {
    setEnabling(true)
    lsSet(K_BANNER_DAY, todayStr())
    const granted = await subscribe()
    if (!granted && Notification.permission === 'denied') {
      lsSet(K_DENIED, '1')
    }
    setShowBanner(false)
    setEnabling(false)
  }

  function handleDismiss() {
    lsSet(K_BANNER_DAY, todayStr())
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
      <div style={{
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
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', marginTop: 1 }}>
            We'll remind you at 12pm, 4pm &amp; 8pm every day.
          </div>
        </div>

        <button
          onClick={handleEnable}
          disabled={enabling}
          style={{
            flexShrink: 0, padding: '7px 14px',
            borderRadius: 10, border: 'none',
            background: enabling ? '#CC8F00' : '#FFB800',
            color: '#062A78', fontSize: 12, fontWeight: 900,
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
            flexShrink: 0, width: 28, height: 28,
            borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,.15)',
            color: '#fff', fontSize: 18, lineHeight: 1,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </>
  )
}