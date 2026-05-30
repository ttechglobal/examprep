'use client'
// src/components/ui/PointsBadge.jsx
import { usePoints } from '@/contexts/PointsContext'
import { useEffect, useState } from 'react'

export default function PointsBadge() {
  const { totalPoints, toast } = usePoints()
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!toast) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 700)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className={`flex items-center gap-1.5
                     bg-indigo-50 dark:bg-indigo-950/50
                     border border-indigo-200 dark:border-indigo-800
                     px-2.5 py-1 rounded-xl transition-all duration-300
                     ${pulse ? 'scale-110' : ''}`}>
      <span className="text-sm leading-none">⭐</span>
      <span className="text-xs font-black tabular-nums text-indigo-700 dark:text-indigo-300">
        {totalPoints.toLocaleString()}
      </span>
    </div>
  )
}