'use client'
// src/contexts/PointsContext.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the student's total XP across the whole app.
//
// How it works:
//   1. On mount, reads from localStorage (instant — no flash)
//   2. Then reconciles with the DB value the student layout already fetched
//   3. Always uses Math.max(localStorage, DB) — earned XP never goes backwards
//   4. After a practice session, the session page calls setTotalPoints(new_total)
//      which immediately updates every component that calls usePoints()
//   5. localStorage is kept in sync so the value survives page navigations
//
// Usage:
//   const { totalPoints, setTotalPoints } = usePoints()
//
// To update after a session save:
//   const { setTotalPoints } = usePoints()
//   const data = await saveSession()         // your fetch to /api/student/session/save
//   if (data.ok) setTotalPoints(data.new_total_xp)
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// ── localStorage key ──────────────────────────────────────────────────────────
const LS_KEY = 'ep_total_xp'

function readLS() {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(LS_KEY)
    const val = parseInt(raw ?? '0', 10)
    return isNaN(val) ? 0 : Math.max(0, val)
  } catch { return 0 }
}

function writeLS(val) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, String(Math.max(0, val))) } catch {}
}

// ── Context shape ─────────────────────────────────────────────────────────────
const PointsContext = createContext({
  totalPoints:    0,
  setTotalPoints: (_val) => {},  // call with the new absolute total after a session save
  reconcileServerPoints: (_serverTotal) => {}, // called by the student layout
})

// ── Provider ──────────────────────────────────────────────────────────────────
export function PointsProvider({ children }) {
  // Start at 0 (matches SSR) — load from localStorage after mount to avoid hydration mismatch
  const [totalPoints, _setTotal] = useState(0)

  // Seed from localStorage immediately after mount (client-only)
  useEffect(() => {
    const v = readLS()
    if (v > 0) _setTotal(v)
  }, [])

  // Wrapper: always keep localStorage in sync
  const setTotalPoints = useCallback((newTotal) => {
    const safe = Math.max(0, Number(newTotal) || 0)
    _setTotal(safe)
    writeLS(safe)
  }, [])

  // Reconcile with the server total. The student layout already fetches the
  // profile (including total_points) once per app open and passes the value
  // here, so this context makes no network calls of its own.
  const reconcileServerPoints = useCallback((serverTotal) => {
    const dbVal = Math.max(0, Number(serverTotal) || 0)
    if (dbVal > 0) {
      // Never go backwards: local XP may include sessions not yet synced.
      _setTotal(prev => {
        const best = Math.max(prev, dbVal)
        writeLS(best)
        return best
      })
    } else if (readLS() === 0) {
      // Truly zero everywhere (new account). If local has guest XP, keep it —
      // the sync queue will write it to the server shortly.
      writeLS(0)
      _setTotal(0)
    }
  }, [])


  return (
    <PointsContext.Provider value={{ totalPoints, setTotalPoints, reconcileServerPoints }}>
      {children}
    </PointsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePoints() {
  return useContext(PointsContext)
}

