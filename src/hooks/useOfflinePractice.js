// src/hooks/useOfflinePractice.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook that makes practice fully offline-capable.
//
// When ONLINE:  fetches questions from /api/practice/questions normally.
// When OFFLINE: serves questions from IndexedDB (downloaded packs).
//
// Also handles queuing practice saves when offline — they flush automatically
// when the connection returns.
//
// Usage in practice page:
//   const { fetchQuestions, saveSession, isOffline } = useOfflinePractice()
//
//   const questions = await fetchQuestions({ exam, subjects, count, mode })
//   await saveSession({ results, config, xp })
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { getOfflineQuestions, openDB } from '@/lib/offlineSync'

const SAVE_QUEUE_KEY = 'ep-offline-save-queue'

// ── Offline save queue ────────────────────────────────────────────────────────
function getQueue() {
  try { return JSON.parse(localStorage.getItem(SAVE_QUEUE_KEY) ?? '[]') } catch { return [] }
}
function addToQueue(item) {
  const q = getQueue()
  q.push({ ...item, queuedAt: new Date().toISOString() })
  localStorage.setItem(SAVE_QUEUE_KEY, JSON.stringify(q))
}
function clearQueue() { localStorage.removeItem(SAVE_QUEUE_KEY) }

async function flushQueue() {
  const queue = getQueue()
  if (!queue.length) return
  const failed = []
  for (const item of queue) {
    try {
      const res = await fetch('/api/student/practice/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (!res.ok) failed.push(item)
    } catch {
      failed.push(item)
    }
  }
  if (failed.length) {
    localStorage.setItem(SAVE_QUEUE_KEY, JSON.stringify(failed))
  } else {
    clearQueue()
  }
  return queue.length - failed.length
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useOfflinePractice() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const goOnline  = async () => {
      setIsOffline(false)
      // Flush queued saves when connection returns
      const flushed = await flushQueue()
      if (flushed > 0) console.log(`[offline] Flushed ${flushed} queued practice saves`)
    }
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)

    // Also listen for SW flush messages
    navigator.serviceWorker?.addEventListener('message', e => {
      if (e.data?.type === 'FLUSH_SAVE_QUEUE') flushQueue()
    })

    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── Fetch questions (online → API, offline → IndexedDB) ──────────────────
  const fetchQuestions = useCallback(async ({
    exam       = 'WAEC',
    subjects   = [],          // array of subject names
    subjectIds = [],          // array of subject UUIDs
    count      = 20,
    mode       = 'practice',
    topicId    = null,
  }) => {
    // Online path — normal API fetch
    if (navigator.onLine) {
      const params = new URLSearchParams({
        exam,
        count: String(count),
        mode,
        ...(subjects.length  ? { subjects: subjects.join(',') }    : {}),
        ...(topicId          ? { topic_id: topicId }               : {}),
      })
      const res = await fetch(`/api/practice/questions?${params}`)
      if (res.ok) return res.json()
      // If server failed, fall through to offline
    }

    // Offline path — serve from IndexedDB
    console.log('[offline] Serving questions from IndexedDB cache')
    const offlineQuestions = await getOfflineQuestions({
      examType:   exam,
      subjectIds: subjectIds,
      limit:      count,
    })

    if (!offlineQuestions.length) {
      throw new Error('No questions downloaded for offline practice. Go online and download your subjects first.')
    }

    // Shuffle and return
    const shuffled = [...offlineQuestions].sort(() => Math.random() - 0.5).slice(0, count)
    return { questions: shuffled, total: shuffled.length, offline: true }
  }, [])

  // ── Save session (online → API, offline → queue) ─────────────────────────
  const saveSession = useCallback(async (payload) => {
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/student/practice/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        return res.ok ? res.json() : null
      } catch {
        // Network error while nominally online — queue it
      }
    }

    // Offline or network error — queue for later
    addToQueue({ payload })
    console.log('[offline] Practice save queued — will sync when online')
    return { success: true, queued: true, offline: true }
  }, [])

  return { fetchQuestions, saveSession, isOffline, flushQueue }
}

// ── Offline banner component (use in practice pages) ─────────────────────────
export function OfflineBanner({ show }) {
  if (!show) return null
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 12, marginBottom: 12,
      background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.25)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14 }}>📡</span>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#FFB800', lineHeight: 1.4 }}>
        You're offline. Practicing from your downloaded questions — your results will sync when you reconnect.
      </p>
    </div>
  )
}