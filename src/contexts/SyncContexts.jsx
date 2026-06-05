'use client'
// src/contexts/SyncContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps the student layout. On mount:
//   1. Reads the Supabase session
//   2. Fetches the student's profile (exam_type + subjects)
//   3. Triggers background sync if not done recently (max once per 24h)
//   4. Shows a subtle progress banner at the top while syncing
//
// Usage:
//   In src/app/student/layout.js:
//   import { SyncProvider } from '@/contexts/SyncContext'
//   <SyncProvider><StudentContent /></SyncProvider>
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { triggerSync, getCacheStatus } from '@/lib/offlineSync'

const SyncCtx = createContext({ syncing: false, syncPct: 0, syncMessage: null })

export function useSyncStatus() {
  return useContext(SyncCtx)
}

// How often to re-sync (ms) — 24 hours
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000
const LAST_SYNC_KEY    = 'ep_last_sync'

export function SyncProvider({ children }) {
  const [syncing,     setSyncing]     = useState(false)
  const [syncPct,     setSyncPct]     = useState(0)
  const [syncMessage, setSyncMessage] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Only run client-side
      if (typeof window === 'undefined') return

      // Throttle: don't sync more than once every 24h
      const lastSync = localStorage.getItem(LAST_SYNC_KEY)
      if (lastSync && (Date.now() - Number(lastSync)) < SYNC_INTERVAL_MS) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('exam_type, subjects')
        .eq('id', user.id)
        .single()

      if (!profile?.exam_type || !profile?.subjects?.length || cancelled) return

      setSyncing(true)

      await triggerSync(user.id, profile, (pct, message) => {
        if (cancelled) return
        if (pct === null) {
          setSyncing(false)
          setSyncPct(0)
          setSyncMessage(null)
        } else {
          setSyncPct(pct)
          setSyncMessage(message)
        }
      })

      if (!cancelled) {
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
      }
    }

    init().catch(console.warn)
    return () => { cancelled = true }
  }, [])

  return (
    <SyncCtx.Provider value={{ syncing, syncPct, syncMessage }}>
      {children}
      {syncing && <SyncBanner pct={syncPct} message={syncMessage} />}
    </SyncCtx.Provider>
  )
}

// ── Subtle progress banner ────────────────────────────────────────────────────

function SyncBanner({ pct, message }) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
                 bg-gray-900 dark:bg-gray-800 text-white text-xs font-medium
                 rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-3
                 pointer-events-none select-none
                 animate-in slide-in-from-bottom-2 duration-300"
      style={{ maxWidth: '90vw', minWidth: '220px' }}
    >
      {/* Spinner */}
      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />

      {/* Message */}
      <span className="flex-1 truncate">{message ?? 'Syncing…'}</span>

      {/* Progress bar */}
      <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
        <div
          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}