'use client'
// src/contexts/PointsContext.js
// ─────────────────────────────────────────────────────────────────────────────
// UPDATED:
//   awardPoints(reason, referenceId, extraData)
//   extraData = { correct, total } for practice_complete
//   Passed through to /api/points/award so server can calculate proportional pts
//
//   Toast now shows actual awarded points (from API response), not the old flat value
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useRef } from 'react'

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
  const [totalPoints, setTotalPoints] = useState(initialTotal)
  const [toast,       setToast]       = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((reason, points) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ reason, points, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const awardPoints = useCallback(async (reason, referenceId = null, extraData = {}) => {
    try {
      const res = await fetch('/api/points/award', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          reference_id: referenceId,
          ...extraData, // spreads { correct, total } for practice_complete
        }),
      })
      const data = await res.json()
      if (data.awarded) {
        setTotalPoints(data.new_total)
        showToast(reason, data.points_awarded) // use actual awarded amount
      }
      return data
    } catch (err) {
      console.error('[PointsContext] awardPoints failed:', err)
      return null
    }
  }, [showToast])

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
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[999]
                 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl
                 bg-indigo-600 text-white text-sm font-black
                 animate-in slide-in-from-top-4 duration-300"
    >
      <span className="text-base">{meta.emoji}</span>
      <div className="text-left">
        <p className="font-black leading-tight">{meta.label}</p>
        <p className="text-indigo-200 text-xs font-medium">+{toast.points} points</p>
      </div>
    </button>
  )
}