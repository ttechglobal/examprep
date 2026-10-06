'use client'
// src/app/admin/users/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Students: who we have and what plan each is on, for managing subscriptions.
//
//   Student year   students who joined that year or had a paid plan in it
//                  (a student who renews next year shows in both years)
//   Cards          total · paid · free (trial and expired included) ·
//                  expiring within 7 days. A card is also its filter.
//   Filters        All, Free, On trial, Paid, 2 Months, Annual, Expiring Soon,
//                  Expired; plus school, search and sort
//   Manage         opens the student panel (StudentPanel): details, activate
//                  or renew a plan after payment, history, cancel, delete
//
// Filtering, counting and paging run in the database (admin_students /
// admin_student_counts, 20261006_subscriptions.sql) via /api/admin/students.
// v3: replaces v2's analytics list (XP, streak, accuracy) with plan management.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import StudentPanel from '@/components/admin/students/StudentPanel'
import {
  STATE_BADGE, FILTER_CHIPS, SORT_OPTIONS, expiryCell, displayPhone,
} from '@/components/admin/students/studentPlan'
import s from '@/components/admin/list/adminList.module.css'

const THIS_YEAR = new Date().getFullYear()

const CARDS = [
  { filter: 'all',      label: 'Total Students', icon: '👥', bg: '#eef2ff' },
  { filter: 'paid',     label: 'Paid Students',  icon: '👑', bg: '#dcfce7' },
  { filter: 'free',     label: 'Free Students',  icon: '👤', bg: '#f1f5f9' },
  { filter: 'expiring', label: 'Expiring Soon',  icon: '⏰', bg: '#ffedd5', note: 'Within 7 days' },
]

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

const initial = name => (name || '?').trim()[0]?.toUpperCase() ?? '?'

export default function AdminStudentsPage() {
  const [year, setYear]       = useState(String(THIS_YEAR))
  const [filter, setFilter]   = useState('all')
  const [school, setSchool]   = useState('')
  const [sort, setSort]       = useState('newest')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [reload, setReload]   = useState(0)
  const [state, setState]     = useState({ loading: true, error: null, data: null })
  const query = useDebounced(search.trim(), 300)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ year, filter, sort, page: String(page) })
    if (school) params.set('school', school)
    if (query) params.set('q', query)
    Promise.resolve().then(() => setState(prev => ({ ...prev, loading: true, error: null })))
    fetch(`/api/admin/students?${params}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load students')
        setState({ loading: false, error: null, data })
      })
      .catch(err => { if (err.name !== 'AbortError') setState(prev => ({ ...prev, loading: false, error: err.message })) })
    return () => controller.abort()
  }, [year, filter, school, sort, query, page, reload])

  // Any change of what's shown starts again at the first page.
  const choose = setter => value => { setter(value); setPage(0) }
  const refresh = useCallback(() => setReload(n => n + 1), [])
  const closePanel = useCallback(() => setSelected(null), [])

  const data = state.data
  const counts = data?.counts ?? {}
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1
  const years = data?.years ?? [THIS_YEAR + 1, THIS_YEAR]

  return <div className={s.page}>
    <div className={s.head}>
      <div>
        <h1 className={s.title}>Students</h1>
        <p className={s.sub}>Manage student accounts and subscriptions.</p>
      </div>
      <label className={s.year}>
        📅 Student Year
        <select value={year} onChange={e => choose(setYear)(e.target.value)} aria-label="Student year">
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          <option value="all">All years</option>
        </select>
      </label>
    </div>

    <div className={s.stats}>
      {CARDS.map(card => <button key={card.filter} type="button" className={`${s.stat} ${filter === card.filter ? s.statOn : ''}`}
        onClick={() => choose(setFilter)(card.filter)} aria-pressed={filter === card.filter}>
        <span className={s.statIcon} style={{ background: card.bg }} aria-hidden="true">{card.icon}</span>
        <span>
          <span className={s.statLabel} style={card.filter === 'expiring' ? { color: '#ea580c' } : undefined}>{card.label}</span>
          <span className={s.statValue}>{data ? (counts[card.filter] ?? 0).toLocaleString() : '—'}</span>
          {card.note && <span className={s.statNote}>{card.note}</span>}
        </span>
      </button>)}
    </div>

    <div className={s.search}>
      <span className={s.searchIcon} aria-hidden="true">🔍</span>
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} type="search"
        placeholder="Search by name, username, phone number, email or school…" aria-label="Search students"/>
    </div>

    <div className={s.chips} role="group" aria-label="Filter by plan">
      {FILTER_CHIPS.map(chip => <button key={chip.id} type="button" className={`${s.chip} ${filter === chip.id ? s.chipOn : ''}`}
        onClick={() => choose(setFilter)(chip.id)} aria-pressed={filter === chip.id}>
        {chip.label}{data ? ` (${(counts[chip.id] ?? 0).toLocaleString()})` : ''}
      </button>)}
    </div>

    <div className={s.toolbar}>
      <span className={s.count}>{data ? `${data.total.toLocaleString()} student${data.total === 1 ? '' : 's'}` : ' '}</span>
      <div className={s.selects}>
        <select className={s.select} value={school} onChange={e => choose(setSchool)(e.target.value)} aria-label="School">
          <option value="">All Schools</option>
          {(data?.schools ?? []).map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className={s.select} value={sort} onChange={e => choose(setSort)(e.target.value)} aria-label="Sort">
          {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>Sort: {o.label}</option>)}
        </select>
      </div>
    </div>

    <div className={s.tableWrap}>
      {state.error ? <p className={s.problem}>{state.error}</p>
        : !data ? <p className={s.loading}>Loading students…</p>
        : !data.students.length ? <p className={s.empty}>No students match this view.</p>
        : <table className={s.table} style={{ opacity: state.loading ? .6 : 1 }}>
          <thead><tr><th>Student</th><th>Phone</th><th>School</th><th>Plan</th><th>Expiry</th><th aria-label="Actions"/></tr></thead>
          <tbody>
            {data.students.map(student => {
              const badge = STATE_BADGE[student.state] ?? STATE_BADGE.free
              const expiry = expiryCell(student)
              return <tr key={student.id} className={`${s.row} ${selected === student.id ? s.rowOn : ''}`} onClick={() => setSelected(student.id)}>
                <td><div className={s.who}>
                  <span className={s.avatar} aria-hidden="true">{initial(student.name || student.username)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={s.name}>{student.name || <span className={s.muted}>No name</span>}</span>
                    {student.username && <span className={s.handle}>@{student.username}</span>}
                  </span>
                </div></td>
                <td>{displayPhone(student.phone) ?? <span className={s.muted}>—</span>}</td>
                <td>{student.school ?? <span className={s.muted}>—</span>}</td>
                <td><span className={`${s.badge} ${s[`tone-${badge.tone}`]}`}>{badge.label}</span></td>
                <td>{expiry ? <>
                  {expiry.date}
                  <span className={`${s.expiryNote} ${s[expiry.tone] ?? s.muted}`}>{expiry.note}</span>
                </> : <span className={s.muted}>—</span>}</td>
                <td><button type="button" className={s.manage} onClick={e => { e.stopPropagation(); setSelected(student.id) }}>Manage →</button></td>
              </tr>
            })}
          </tbody>
        </table>}
    </div>

    {data && data.total > data.perPage && <div className={s.pager}>
      <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Previous</button>
      <span>Page {page + 1} of {pages}</span>
      <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
    </div>}

    {selected && <StudentPanel id={selected} onClose={closePanel} onChanged={refresh}/>}
  </div>
}
