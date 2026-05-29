'use client'
// src/contexts/PointsContext.jsx
//
// Global context for the points system.
// Any component calls: awardPoints(reason, referenceId?)
// The context handles the API call + fires the toast notification.
//
// Setup: wrap StudentLayout children with <PointsProvider>
// Usage: const { awardPoints, totalPoints } = usePoints()

import { createContext, useContext, useState, useCallback, useRef } from 'react'

const PointsContext = createContext({
  awardPoints: async () => {},
  totalPoints: 0,
  setTotalPoints: () => {},
  toast: null,
})

const REASON_LABELS = {
  lesson_complete:   { label: 'Lesson complete!',        emoji: '🎉', points: 10 },
  practice_complete: { label: 'Practice session done!',  emoji: '✅', points: 15 },
  weekly_goal:       { label: 'Weekly goal smashed!',    emoji: '🏆', points: 20 },
  badge_earned:      { label: 'New badge earned!',       emoji: '🥇', points: 5  },
}

export function PointsProvider({ children, initialTotal = 0 }) {
  const [totalPoints, setTotalPoints] = useState(initialTotal)
  const [toast, setToast] = useState(null)   // { reason, points, id }
  const toastTimer = useRef(null)

  const showToast = useCallback((reason, points) => {
    // Clear any existing timer
    if (toastTimer.current) clearTimeout(toastTimer.current)

    const id = Date.now()
    setToast({ reason, points, id })

    toastTimer.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }, [])

  const awardPoints = useCallback(async (reason, referenceId = null) => {
    try {
      const res = await fetch('/api/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reference_id: referenceId }),
      })
      const data = await res.json()
      if (data.awarded) {
        setTotalPoints(data.new_total)
        showToast(reason, REASON_LABELS[reason]?.points ?? data.points_awarded)
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

// ── Toast component ──────────────────────────────────────────────────────────
function PointsToast({ toast, onDismiss }) {
  if (!toast) return null

  const meta = REASON_LABELS[toast.reason] ?? { label: 'Points earned!', emoji: '⭐', points: toast.points }

  return (
    <div
      key={toast.id}
      onClick={onDismiss}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] cursor-pointer
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900
                      px-5 py-3 rounded-2xl shadow-2xl shadow-black/30 min-w-[220px]">
        <span className="text-2xl">{meta.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-black leading-tight">{meta.label}</p>
          <p className="text-xs text-indigo-300 dark:text-indigo-600 font-bold mt-0.5">
            +{toast.points} pts
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-white">+{toast.points}</span>
        </div>
      </div>
    </div>
  )
}