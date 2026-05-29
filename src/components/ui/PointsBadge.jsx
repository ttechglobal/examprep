'use client'
// src/components/ui/PointsBadge.jsx
// Shows the student's total points in the header.
// Pulses whenever a new toast fires (i.e. points were just earned).

import { usePoints } from '@/contexts/PointsContext'
import { useEffect, useState } from 'react'

export default function PointsBadge() {
  const { totalPoints, toast } = usePoints()
  const [pulse, setPulse] = useState(false)

  // Trigger pulse animation whenever a new toast appears
  useEffect(() => {
    if (!toast) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 700)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div
      className={`flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40
                  border border-indigo-100 dark:border-indigo-800
                  px-2.5 py-1 rounded-xl transition-all duration-300
                  ${pulse ? 'scale-110 bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300' : ''}`}
    >
      <span className="text-sm">⭐</span>
      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
        {totalPoints.toLocaleString()}
      </span>
    </div>
  )
}