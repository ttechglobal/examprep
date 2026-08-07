'use client'
// src/contexts/PointsContext.js
// XP is stored in localStorage so it survives layout re-renders between pages.
// PointsProvider takes initialTotal from the server but always uses the higher
// of (localStorage, initialTotal) — so a just-earned XP update isn't wiped
// when the layout Server Component re-fetches a stale profile.total_points.

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const LS_KEY = 'ep_total_xp'

function readCachedXP() {
  if (typeof window === 'undefined') return 0
  try { return parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0 } catch { return 0 }
}

function writeCachedXP(val) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, String(val)) } catch {}
}

const PointsContext = createContext({
  awardPoints: async () => {},
  totalPoints: 0,
  setTotalPoints: () => {},
  toast: null,
})

const REASON_LABELS = {
  lesson_complete:   { label: 'Lesson complete!',       emoji: '🎉' },
  practice_complete: { label: 'Practice session done!', emoji: '✅' },
  weekly_goal:       { label: 'Weekly goal smashed!',   emoji: '🏆' },
  badge_earned:      { label: 'New badge earned!',      emoji: '🥇' },
}

export function PointsProvider({ children, initialTotal = 0 }) {
  // Start with the best known value: max(server, localStorage)
  const [totalPoints, setTotalPointsRaw] = useState(() => {
    const cached = readCachedXP()
    return Math.max(initialTotal, cached)
  })
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // Keep localStorage in sync whenever totalPoints changes
  useEffect(() => { writeCachedXP(totalPoints) }, [totalPoints])

  // On mount: reconcile with the DB directly so we never show a stale/zero value.
  // This is the authoritative sync — localStorage is a cache, DB is truth.
  useEffect(() => {
    async function reconcile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: prof } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single()
        const dbVal = prof?.total_points ?? 0
        if (dbVal > 0) {
          // DB value wins if it's higher than both localStorage and current state
          setTotalPointsRaw(prev => {
            const best = Math.max(prev, dbVal)
            writeCachedXP(best)
            return best
          })
        }
      } catch { /* non-fatal */ }
    }
    reconcile()
  }, []) // eslint-disable-line

  // Also sync when server layout re-renders with a fresher initialTotal prop
  useEffect(() => {
    if (initialTotal > 0) {
      setTotalPointsRaw(prev => {
        const best = Math.max(prev, initialTotal)
        writeCachedXP(best)
        return best
      })
    }
  }, [initialTotal]) // eslint-disable-line

  const setTotalPoints = useCallback((val) => {
    setTotalPointsRaw(val)
    writeCachedXP(val)
  }, [])

  const showToast = useCallback((reason, points) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ reason, points, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const awardPoints = useCallback(async (reason, referenceId = null, extraData = {}) => {
    try {
      const res = await fetch('/api/points/award', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reference_id: referenceId, ...extraData }),
      })
      const data = await res.json()
      if (data.awarded) {
        setTotalPoints(data.new_total)
        showToast(reason, data.points_awarded)
      }
      return data
    } catch (err) {
      console.error('[PointsContext] awardPoints failed:', err)
      return null
    }
  }, [showToast, setTotalPoints])

  return (
    <PointsContext.Provider value={{ awardPoints, totalPoints, setTotalPoints, toast }}>
      {children}
      <PointsToast toast={toast} onDismiss={() => setToast(null)} />
    </PointsContext.Provider>
  )
}

export function usePoints() {
  return useContext(PointsContext)
}

function PointsToast({ toast, onDismiss }) {
  if (!toast) return null
  const meta = REASON_LABELS[toast.reason] ?? { label: 'Points earned!', emoji: '⭐' }
  return (
    <button
      onClick={onDismiss}
      style={{
        position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 999, display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', borderRadius: 20,
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        border: '1px solid rgba(255,255,255,.2)',
        boxShadow: '0 8px 32px rgba(79,70,229,.4)',
        color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        whiteSpace: 'nowrap', letterSpacing: '-0.01em',
        animation: 'ep-toast-in .35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`@keyframes ep-toast-in{from{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.92)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}`}</style>
      <span style={{ fontSize: 16 }}>{meta.emoji}</span>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontWeight: 900, lineHeight: 1.2 }}>{meta.label}</p>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 600 }}>+{toast.points} XP earned</p>
      </div>
    </button>
  )
}