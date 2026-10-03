'use client'
import { useEffect, useState } from 'react'
const TTL = 24 * 60 * 60 * 1000
function readCache(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value && Date.now() - value.ts < TTL && Array.isArray(value.rows) ? value.rows : null
  } catch { return null }
}
function writeCache(key, rows) {
  try { localStorage.setItem(key, JSON.stringify({ rows, ts: Date.now() })) } catch {}
}
function useCatalog(url, key, retry) {
  const [state, setState] = useState({ key: '', rows: [], loading: true, error: null })
  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    let active = true
    let cached = null
    Promise.resolve().then(() => {
      if (!active) return
      cached = readCache(key)
      setState({ key, rows: cached ?? [], loading: !cached, error: null })
      return fetch(url, { signal: controller.signal }).then(async r => {
        if (!r.ok) throw new Error('Unable to load this selection. Check your connection and try again.')
        const rows = await r.json()
        if (!Array.isArray(rows)) throw new Error('This selection is unavailable. Please try again.')
        if (!active) return
        writeCache(key, rows)
        setState({ key, rows, loading: false, error: null })
      }).catch(error => {
        if (!active || error.name === 'AbortError') return
        setState({ key, rows: cached ?? [], loading: false, error: cached ? null : error.message })
      })
    })
    return () => { active = false; controller.abort() }
  }, [url, key, retry])
  if (!url) return { rows: [], loading: false, error: null }
  return state.key === key ? state : { rows: [], loading: true, error: null }
}
const ORDER = ['Mathematics','Chemistry','Physics','Biology','English Language','Use of English','Government','Economics','Literature in English']
export function useBattleSubjects(exam, retry) {
  const resource = useCatalog(`/api/student/subjects?catalog=1&exam=${exam}`, `ep_battle_catalog_${exam}`, retry)
  return { ...resource, rows: [...resource.rows].sort((a,b) => (ORDER.indexOf(a.name) < 0 ? 99 : ORDER.indexOf(a.name)) - (ORDER.indexOf(b.name) < 0 ? 99 : ORDER.indexOf(b.name))) }
}
export function useBattleTopics(exam, subjectId, retry) {
  return useCatalog(subjectId ? `/api/student/topics?subject_id=${subjectId}&exam=${exam}` : null, `ep_battle_topic_catalog_${exam}_${subjectId}`, retry)
}
