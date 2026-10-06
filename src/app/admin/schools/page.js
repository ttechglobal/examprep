'use client'
// src/app/admin/schools/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Schools: partner schools and their Premium slots.
//   Academic year  slots bought / used that year (slots never expire, so the
//                  totals and "available" are all time)
//   Cards          partner schools · total slots · used (% usage) · available
//   Filters        All, Active, No usage, Fully used; search by school,
//                  contact, phone or email; sort
//   Manage         the school panel (SchoolPanel): contact, slot allocation,
//                  Add Slots after payment, students, slot history, activity
// Data: /api/admin/schools (one row per school, counted in SQL).
// v2: rebuilt on the slot ledger; v1's list was empty (it read a column that
// doesn't exist) and slots were edited by overwriting a number.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import SchoolPanel from '@/components/admin/schools/SchoolPanel'
import { formatPhoneForDisplay } from '@/lib/auth/phone'
import s from '@/components/admin/list/adminList.module.css'

const THIS_YEAR = new Date().getFullYear()
const FILTERS = [['all', 'All'], ['active', 'Active'], ['no_usage', 'No usage'], ['fully_used', 'Fully used']]
const SORTS = [['newest', 'Newest first'], ['name', 'Name A–Z'], ['used', 'Most slots used'], ['available', 'Most slots available']]
const STATUS = { active: ['Active', 'green'], no_usage: ['No usage', 'grey'], fully_used: ['Fully used', 'orange'] }

const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function AdminSchoolsPage() {
  const [year, setYear] = useState(String(THIS_YEAR))
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [reload, setReload] = useState(0)
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(() => setState(prev => ({ ...prev, loading: true, error: null })))
    fetch(`/api/admin/schools?year=${year}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load schools')
        setState({ loading: false, error: null, data })
      })
      .catch(err => { if (err.name !== 'AbortError') setState(prev => ({ ...prev, loading: false, error: err.message })) })
    return () => controller.abort()
  }, [year, reload])

  const refresh = useCallback(() => setReload(n => n + 1), [])
  const closePanel = useCallback(() => setSelected(null), [])
  const data = state.data
  const yearLabel = year === 'all' ? 'all time' : year

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '').replace(/^(234|0)/, '')
    return (data?.schools ?? [])
      .filter(r => filter === 'all' || r.status === filter)
      .filter(r => !q || [r.name, r.city, r.state, r.contact_name, r.contact_email].some(v => (v ?? '').toLowerCase().includes(q))
        || (digits.length >= 4 && (r.contact_phone ?? '').includes(digits)))
      .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'used' ? b.slots_used - a.slots_used
        : sort === 'available' ? b.slots_available - a.slots_available
        : Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [data, filter, search, sort])

  const totals = data?.totals
  const usage = totals?.slots_total ? Math.round(totals.slots_used / totals.slots_total * 100) : 0
  const cards = [
    { label: 'Partner Schools', value: totals?.schools, icon: '🏫', bg: '#eef2ff' },
    { label: 'Total Slots', value: totals?.slots_total, icon: '🎟', bg: '#dcfce7' },
    { label: 'Slots Used', value: totals?.slots_used, icon: '🎓', bg: '#ede9fe', note: `${usage}% usage` },
    { label: 'Available Slots', value: totals?.slots_available, icon: '◔', bg: '#ffedd5', note: `${100 - usage}% remaining`, warm: true },
  ]

  return <div className={s.page}>
    <div className={s.head}>
      <div>
        <h1 className={s.title}>Schools</h1>
        <p className={s.sub}>Manage partner schools and their Premium slots.</p>
      </div>
      <label className={s.year}>
        📅 Academic Year
        <select value={year} onChange={e => setYear(e.target.value)} aria-label="Academic year">
          {(data?.years ?? [THIS_YEAR + 1, THIS_YEAR]).map(y => <option key={y} value={String(y)}>{y}</option>)}
          <option value="all">All years</option>
        </select>
      </label>
    </div>

    <div className={s.stats}>
      {cards.map(card => <div key={card.label} className={s.stat} style={{ cursor: 'default' }}>
        <span className={s.statIcon} style={{ background: card.bg }} aria-hidden="true">{card.icon}</span>
        <span>
          <span className={s.statLabel} style={card.warm ? { color: '#ea580c' } : undefined}>{card.label}</span>
          <span className={s.statValue}>{card.value != null ? card.value.toLocaleString() : '—'}</span>
          {card.note && data && <span className={s.statNote}>{card.note}</span>}
        </span>
      </div>)}
    </div>

    <div className={s.search}>
      <span className={s.searchIcon} aria-hidden="true">🔍</span>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search schools"
        placeholder="Search by school name, contact, phone or email…"/>
    </div>

    <div className={s.toolbar}>
      <div className={s.chips} role="group" aria-label="Filter schools" style={{ marginBottom: 0 }}>
        {FILTERS.map(([id, label]) => <button key={id} type="button" className={`${s.chip} ${filter === id ? s.chipOn : ''}`}
          aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}{data ? ` (${data.counts[id] ?? 0})` : ''}</button>)}
      </div>
      <select className={s.select} value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
        {SORTS.map(([id, label]) => <option key={id} value={id}>Sort: {label}</option>)}
      </select>
    </div>

    <div className={s.tableWrap}>
      {state.error ? <p className={s.problem}>{state.error}</p>
        : !data ? <p className={s.loading}>Loading schools…</p>
        : !rows.length ? <p className={s.empty}>No schools match this view.</p>
        : <table className={s.table} style={{ opacity: state.loading ? .6 : 1 }}>
          <thead><tr><th>School</th><th>Contact</th><th>Slots</th><th>Usage</th><th>Status</th><th aria-label="Actions"/></tr></thead>
          <tbody>
            {rows.map(r => {
              const pct = r.slots_total ? Math.round(r.slots_used / r.slots_total * 100) : 0
              const [statusLabel, tone] = STATUS[r.status]
              return <tr key={r.id} className={`${s.row} ${selected === r.id ? s.rowOn : ''}`} onClick={() => setSelected(r.id)}>
                <td><div className={s.who}>
                  <span className={s.avatar} aria-hidden="true">{initials(r.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={s.name}>{r.name}</span>
                    <span className={s.handle}>{[r.city, r.state].filter(Boolean).join(', ') || r.contact_email || '—'}</span>
                  </span>
                </div></td>
                <td>
                  <span className={s.name} style={{ fontWeight: 700 }}>{r.contact_name ?? '—'}</span>
                  <span className={s.handle}>{r.contact_phone ? formatPhoneForDisplay(r.contact_phone) : r.contact_email ?? ''}</span>
                </td>
                <td>
                  <strong>{r.slots_total} slots</strong>
                  <span className={s.expiryNote + ' ' + s.muted}>{r.bought_in_year > 0 ? `+${r.bought_in_year} in ${yearLabel}` : `none bought in ${yearLabel}`}</span>
                </td>
                <td>
                  <span className={s.handle} style={{ color: 'inherit', fontWeight: 700 }}>{r.slots_used} / {r.slots_total}</span>
                  <span className={s.usage}>
                    <span className={s.usageTrack}><span className={`${s.usageFill} ${r.slots_available <= 0 ? s.usageFull : ''}`} style={{ width: `${pct}%` }}/></span>
                    <span className={s.usagePct}>{pct}%</span>
                  </span>
                </td>
                <td><span className={`${s.badge} ${s[`tone-${tone}`]}`}>{statusLabel}</span></td>
                <td><button type="button" className={s.manage} onClick={e => { e.stopPropagation(); setSelected(r.id) }}>Manage →</button></td>
              </tr>
            })}
          </tbody>
        </table>}
    </div>

    {selected && <SchoolPanel id={selected} year={year} onClose={closePanel} onChanged={refresh}/>}
  </div>
}
