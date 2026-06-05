'use client'
// src/components/ui/OfflineBadge.jsx
// Shows a subtle badge when the app is serving questions from offline cache.
// Also shows a network status dot in the nav when offline.
//
// Usage — in practice/diagnostic session:
//   import OfflineBadge from '@/components/ui/OfflineBadge'
//   {source === 'cache' && <OfflineBadge />}

import { useEffect, useState } from 'react'

export default function OfflineBadge({ className = '' }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Offline — cached questions
      </span>
    </div>
  )
}

/**
 * Hook — returns true when the browser is offline.
 * Listens to online/offline events.
 */
export function useIsOffline() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const online  = () => setIsOffline(false)
    const offline = () => setIsOffline(true)
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online',  online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  return isOffline
}