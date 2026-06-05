// src/hooks/useOfflineQuestions.js
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for the fetch inside practice/diagnostic pages.
// Tries the network first. If offline (or network fails), falls back to
// IndexedDB cache via offlineSync.getOfflineQuestions().
//
// Usage:
//   const { questions, loading, error, source } = useOfflineQuestions({
//     examType: 'WAEC',
//     subjects: ['Mathematics', 'Physics'],
//     count: 20,
//     mode: 'practice',    // 'practice' | 'exam' | 'diagnostic'
//     topicId: null,       // optional
//   })
//
//   `source` is 'network' | 'cache' | null — show a badge when 'cache'
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { getOfflineQuestions } from '@/lib/offlineSync'

export function useOfflineQuestions({ examType, subjects = [], count = 20, mode = 'practice', topicId = null }) {
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [source,    setSource]    = useState(null)  // 'network' | 'cache'

  const abortRef = useRef(null)

  useEffect(() => {
    if (!examType || !subjects.length) return

    let cancelled = false
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setQuestions([])
    setSource(null)

    async function load() {
      // ── Try network first ────────────────────────────────────────────────
      try {
        const params = new URLSearchParams({
          subjects: subjects.join(','),
          exam:     examType,
          count:    String(count),
          mode,
        })
        if (topicId) params.set('topic_id', topicId)

        const res  = await fetch(`/api/practice/questions?${params}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        if (cancelled) return

        if (res.ok && data.questions?.length) {
          setQuestions(data.questions)
          setSource('network')
          setLoading(false)
          return
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        // Network failed — fall through to cache
      }

      if (cancelled) return

      // ── Fall back to IndexedDB cache ─────────────────────────────────────
      try {
        const cached = await getOfflineQuestions({
          examType,
          subjectIds: [],   // we filter by name below since IDs aren't in the hook
          limit: count * 3,
        })

        if (cancelled) return

        // Filter by subject name (cached rows have subject_name)
        const filtered = cached
          .filter(q => subjects.includes(q.subject_name))
          .sort(() => Math.random() - 0.5)
          .slice(0, count)

        if (filtered.length) {
          setQuestions(filtered)
          setSource('cache')
          setLoading(false)
          return
        }

        setError('No questions available. Connect to the internet to download questions.')
        setSource(null)
      } catch {
        setError('Could not load questions.')
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [examType, subjects.join(','), count, mode, topicId])

  return { questions, loading, error, source }
}