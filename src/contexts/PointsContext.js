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

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

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
  showXPToast:    (_xpEarned, _label) => {},  // show the earned-XP toast
  reconcileServerPoints: (_serverTotal) => {}, // called by the student layout
})

// ── Provider ──────────────────────────────────────────────────────────────────
export function PointsProvider({ children }) {
  // Start at 0 (matches SSR) — load from localStorage after mount to avoid hydration mismatch
  const [totalPoints, _setTotal] = useState(0)
  const [toast, setToast] = useState(null)   // { earned, label } | null
  const toastTimer = useRef(null)

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

  // XP toast
  const showXPToast = useCallback((earned, label = 'Practice session done!') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ earned, label, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <PointsContext.Provider value={{ totalPoints, setTotalPoints, showXPToast, reconcileServerPoints }}>
      {children}
      {toast && <XPToast key={toast.id} earned={toast.earned} label={toast.label} onDismiss={() => setToast(null)} />}
    </PointsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePoints() {
  return useContext(PointsContext)
}

// ── XP Toast ──────────────────────────────────────────────────────────────────
// Shown after a session is saved. Appears at the top centre, auto-dismisses.
function XPToast({ earned, label, onDismiss }) {
  return (
    <button
      onClick={onDismiss}
      aria-label="Dismiss XP notification"
      style={{
        position: 'fixed', top: 76, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', borderRadius: 20,
        background: 'linear-gradient(135deg,#062A78,#1264E5)',
        border: '1px solid rgba(255,255,255,.18)',
        boxShadow: '0 8px 32px rgba(6,42,120,.45)',
        color: '#fff', fontSize: 13, fontWeight: 800,
        cursor: 'pointer', whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        animation: 'ep-xp-toast-in .35s cubic-bezier(0.34,1.56,0.64,1) both',
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes ep-xp-toast-in {
          from { opacity:0; transform:translateX(-50%) translateY(-14px) scale(.9) }
          to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1)  }
        }
      `}</style>
      <span style={{ fontSize: 18 }}>⚡</span>
      <div style={{ textAlign: 'left' }}>
        <p style={{ margin: 0, fontWeight: 900, lineHeight: 1.2, fontSize: 13 }}>{label}</p>
        <p style={{ margin: 0, color: '#FFB800', fontSize: 12, fontWeight: 800, marginTop: 2 }}>
          +{earned} XP earned
        </p>
      </div>
    </button>
  )
}