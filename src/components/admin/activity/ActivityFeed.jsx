'use client'
// src/components/admin/activity/ActivityFeed.jsx
// The activity log as a list: when, who (admin or school), what, and the
// details that matter (amount, note, dates). From GET /api/admin/activity.
//   <ActivityFeed/>                       everything, with type filter + search
//   <ActivityFeed school={id} compact/>   one school's entries (school panel)
//   <ActivityFeed student={id} compact/>  one student's entries

import { useCallback, useEffect, useState } from 'react'
import { priceLabel } from '@/lib/plans'
import s from './activity.module.css'

const TYPES = [
  { id: 'all', label: 'Everything' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'schools', label: 'Schools' },
  { id: 'students', label: 'Students' },
  { id: 'team', label: 'Admin team' },
]
const TZ = 'Africa/Lagos'
const dayLabel = iso => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
const timeLabel = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

/** The extra line under an entry: money, slots, dates, notes, reasons. */
function detailLine(entry) {
  const d = entry.details ?? {}
  const parts = []
  if (d.amount != null) parts.push(priceLabel(d.amount))
  if (d.ends_at) parts.push(`until ${new Date(d.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })}`)
  if (d.note) parts.push(`“${d.note}”`)
  if (d.reason) parts.push(`Reason: ${d.reason}`)
  if (entry.action === 'student.delete' && (d.phone || d.email)) parts.push(d.phone || d.email)
  return parts.join(' · ')
}

export default function ActivityFeed({ school = null, student = null, compact = false }) {
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ entries: [], more: false, loading: true, error: null })

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async (before = null) => {
    const params = new URLSearchParams({ type })
    if (school) params.set('school', school)
    if (student) params.set('student', student)
    if (query) params.set('q', query)
    if (before) params.set('before', String(before))
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(`/api/admin/activity?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load the activity log')
      setState(prev => ({ entries: before ? [...prev.entries, ...data.entries] : data.entries, more: data.more, loading: false, error: null }))
    } catch (e) {
      setState(prev => ({ ...prev, loading: false, error: e.message }))
    }
  }, [type, school, student, query])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  let lastDay = null
  return <div className={compact ? s.compact : undefined}>
    {!compact && <div className={s.controls}>
      <div className={s.types} role="group" aria-label="Show">
        {TYPES.map(t => <button key={t.id} type="button" className={`${s.type} ${type === t.id ? s.typeOn : ''}`}
          aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
      </div>
      <input className={s.search} type="search" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, school or who did it…" aria-label="Search the activity log"/>
    </div>}

    {state.error ? <p className={s.problem}>{state.error} <button type="button" className={s.link} onClick={() => load()}>Try again</button></p>
      : !state.entries.length && !state.loading ? <p className={s.empty}>Nothing recorded yet.</p>
      : <ol className={s.list}>
        {state.entries.map(entry => {
          const day = dayLabel(entry.at)
          const header = day !== lastDay ? <li key={`d-${day}`} className={s.day}>{day}</li> : null
          lastDay = day
          const detail = detailLine(entry)
          return [header, <li key={entry.id} className={s.entry}>
            <span className={s.time}>{timeLabel(entry.at)}</span>
            <span className={s.body}>
              <span className={s.summary}>{entry.summary}</span>
              {detail && <span className={s.detail}>{detail}</span>}
            </span>
            <span className={`${s.actor} ${entry.actor_type === 'school' ? s.actorSchool : ''}`} title={entry.actor_type === 'school' ? 'School admin' : 'ExamPrep admin'}>
              {entry.actor_type === 'school' ? '🏫 ' : '👤 '}{entry.actor_name || 'System'}
            </span>
          </li>]
        })}
      </ol>}

    {state.loading && <p className={s.loading}>Loading…</p>}
    {state.more && !state.loading && <button type="button" className={s.more} onClick={() => load(state.entries.at(-1)?.id)}>Load more</button>}
  </div>
}
