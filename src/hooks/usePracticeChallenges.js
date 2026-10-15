'use client'
// Independent Practice challenge snapshots: scoped to account + Lagos week.
// Cached progress is display-only; rewards always come from the server.
import { useEffect, useState, useCallback, useRef } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { appDay, mondayOfDay } from '@/lib/dates'

// The shell mounts both responsive layouts; share requests by account, never
// across accounts, while keeping each view's subscription independent.
const requests = new Map()
function loadChallenges(url, key, force) {
  const id = `${key}:${url}`
  const hit = requests.get(id)
  if (hit && (hit.pending || (!force && Date.now() - hit.at < 15000))) return hit.promise
  const entry = { pending: true, at: Date.now() }
  entry.promise = fetch(url, { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Could not refresh challenges')
    return response.json()
  }).finally(() => { entry.pending = false })
  requests.set(id, entry)
  entry.promise.catch(() => { if (requests.get(id) === entry) requests.delete(id) })
  if (requests.size > 20) requests.delete(requests.keys().next().value)
  return entry.promise
}

export function usePracticeChallenges(profile) {
  const userId = profile?.isGuest ? null : profile?.id
  const week = mondayOfDay(appDay())
  const key = userId ? `ep_practice_challenges_${userId}_${week}` : null
  const owner = useRef(key)
  useEffect(() => { owner.current = key; return () => { owner.current = null } }, [key])
  const [state, setState] = useState({ key: null, data: null, loading: true, stale: false, error: null })
  const [revision, setRevision] = useState(0)
  const [unlocking, setUnlocking] = useState(false)
  const { reconcileServerPoints } = usePoints()
  const refresh = useCallback(() => setRevision(n => n + 1), [])
  const query = new URLSearchParams()
  for (const [field, exam] of [['subjects_waec', 'waec'], ['subjects_jamb', 'jamb']]) {
    const names = (profile?.[field] ?? profile?.subjects ?? []).filter(x => typeof x === 'string')
    if (names.length) query.set(exam, names.slice(0, 15).join(','))
  }
  const url = `/api/student/practice/challenges?${query}`

  useEffect(() => {
    let active = true
    const accept = (data, stale = false) => {
      if (!active) return
      setState({ key, data, loading: false, stale, error: null })
    }
    async function load() {
      // Yield before reading the device snapshot, keeping SSR deterministic.
      await Promise.resolve()
      if (!key) { accept({ guest: true, set: null }); return }
      let cached = null
      try { cached = JSON.parse(localStorage.getItem(key) || 'null') } catch {}
      if (cached?.week_start === week && cached.student_id === userId) accept(cached, true)
      try {
        const data = await loadChallenges(url, key, revision > 0)
        if (!active) return
        if (!data.guest && data.student_id !== userId) {
          setState({ key, data: null, loading: false, stale: false, error: 'Your account changed. Refresh this page.' })
          requests.delete(`${key}:${url}`)
          return
        }
        accept(data)
        if (!data.guest) {
          try { localStorage.setItem(key, JSON.stringify({ ...data, xp_awarded: 0 })) } catch {}
          if (Number.isFinite(data.total_points)) reconcileServerPoints(data.total_points)
        } else { try { localStorage.removeItem(key) } catch {} }
      } catch {
        if (active) setState(prev => ({ ...(prev.key === key ? prev : { key, data: null }), loading: false, stale: true,
          error: navigator.onLine ? 'Could not refresh challenges. Try again.' : 'You’re offline. Progress updates after your sessions sync.' }))
      }
    }
    load()
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('online', refresh)
    window.addEventListener('examprep:sessions-synced', refresh)
    window.addEventListener('examprep:challenges-updated', refresh)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      window.removeEventListener('online', refresh)
      window.removeEventListener('examprep:sessions-synced', refresh)
      window.removeEventListener('examprep:challenges-updated', refresh)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [key, userId, url, week, revision, refresh, reconcileServerPoints])

  async function unlock() {
    if (!key || unlocking) return
    setUnlocking(true)
    try {
      const response = await fetch(url, { method: 'POST', cache: 'no-store' })
      const data = await response.json()
      if (owner.current !== key) return
      if (!response.ok) throw new Error(data.error || 'Could not unlock an extra set')
      if (data.student_id !== userId) {
        setState({ key, data: null, loading: false, stale: false, error: 'Your account changed. Refresh this page.' })
        return
      }
      setState({ key, data, loading: false, stale: false, error: null })
      try { localStorage.setItem(key, JSON.stringify({ ...data, xp_awarded: 0 })) } catch {}
      if (Number.isFinite(data.total_points)) reconcileServerPoints(data.total_points)
      requests.delete(`${key}:${url}`)
      window.dispatchEvent(new Event('examprep:challenges-updated'))
    } catch (error) { if (owner.current === key) setState(prev => ({ ...prev,
      stale: !navigator.onLine, error: navigator.onLine ? error.message : 'You’re offline. Connect to unlock extra challenges.' })) }
    finally { setUnlocking(false) }
  }
  return { ...(state.key === key ? state : { data: null, loading: true, error: null, stale: false }), refresh, unlock, unlocking,
    reportError: message => setState(prev => ({ ...prev, error: message, stale: !navigator.onLine })) }
}
