'use client'
import { useCallback, useEffect, useState } from 'react'
import { getLocalSubjects } from '@/lib/localProfile'

// This week's battle missions (GET /api/student/battle/missions), shared by the
// hub's Missions button and the Missions page. Going from one to the other
// within 15 seconds reuses the answer instead of asking the server again;
// retry() always asks.
//
// The subjects on the phone go with the request: the app keeps a student's
// subjects on the device first, and the server uses them only when the account
// has none saved yet.
const FRESH_MS = 15_000
let shared = null   // { at, promise }

function missionsUrl() {
  const query = new URLSearchParams()
  for (const [key, exam] of [['waec', 'WAEC'], ['jamb', 'JAMB']]) {
    const names = (getLocalSubjects(exam) ?? []).filter(name => typeof name === 'string').slice(0, 15).join(',')
    if (names) query.set(key, names)
  }
  const text = query.toString()
  return `/api/student/battle/missions${text ? `?${text}` : ''}`
}

function load(force) {
  if (!force && shared && Date.now() - shared.at < FRESH_MS) return shared.promise
  const promise = fetch(missionsUrl()).then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
  shared = { at: Date.now(), promise }
  promise.catch(() => { if (shared?.promise === promise) shared = null })
  return promise
}

/** → { status: 'loading' | 'ready' | 'error', data, retry } */
export function useBattleMissions() {
  const [state, setState] = useState({ status: 'loading', data: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    load(nonce > 0).then(
      data => { if (active) setState({ status: 'ready', data }) },
      () => { if (active) setState(prev => ({ status: prev.data ? 'ready' : 'error', data: prev.data })) },
    )
    return () => { active = false }
  }, [nonce])

  const retry = useCallback(() => { setState(prev => ({ ...prev, status: prev.data ? 'ready' : 'loading' })); setNonce(n => n + 1) }, [])
  return { ...state, retry }
}
