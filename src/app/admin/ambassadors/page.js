'use client'
// src/app/admin/ambassadors/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Teacher Ambassadors: who is referring students, what they have earned and what
// you owe them.
//   Year           students / subscribed / earned for that year (exams are yearly).
//                  The balance owed is always all-time: it doesn't reset in January.
//   Cards          ambassadors · students referred · subscribed · owed
//   Filters        All, Active, Paused, Owed, No code yet; search by name, school,
//                  phone, email or code; sort
//   Manage         the ambassador panel: contact, referral link, Record payout,
//                  commission rate, Pause / Resume, their students, payout history
// Data: /api/admin/ambassadors (one row per ambassador, counted in SQL).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import AmbassadorPanel from '@/components/admin/ambassadors/AmbassadorPanel'
import { formatPhoneForDisplay } from '@/lib/auth/phone'
import { priceLabel } from '@/lib/plans'
import s from '@/components/admin/list/adminList.module.css'

const THIS_YEAR = new Date().getFullYear()
const FILTERS = [['all', 'All'], ['active', 'Active'], ['paused', 'Paused'], ['owed', 'Owed money'], ['no_code', 'No code yet']]
const SORTS = [['newest', 'Newest first'], ['name', 'Name A–Z'], ['students', 'Most students'], ['earned', 'Most earned'], ['balance', 'Highest balance']]

const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function AdminAmbassadorsPage() {
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
    fetch(`/api/admin/ambassadors?year=${year}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not load ambassadors')
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
    return (data?.ambassadors ?? [])
      .filter(r => filter === 'all' || (filter === 'owed' ? r.balance > 0 : filter === 'no_code' ? !r.code : r.status === filter))
      .filter(r => !q || [r.full_name, r.school_name, r.email, r.code].some(v => (v ?? '').toLowerCase().includes(q))
        || (digits.length >= 4 && (r.phone ?? '').includes(digits)))
      .sort((a, b) => sort === 'name' ? a.full_name.localeCompare(b.full_name)
        : sort === 'students' ? b.students - a.students
        : sort === 'earned' ? b.earned - a.earned
        : sort === 'balance' ? b.balance - a.balance
        : Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [data, filter, search, sort])

  const totals = data?.totals
  const cards = [
    { label: 'Ambassadors', value: totals?.ambassadors, icon: '⭐', bg: '#fef9c3' },
    { label: 'Students Referred', value: totals?.students, icon: '🎓', bg: '#eef2ff', note: yearLabel },
    { label: 'Subscribed', value: totals?.subscribed, icon: '✅', bg: '#dcfce7', note: yearLabel },
    { label: 'Owed to Ambassadors', value: totals ? priceLabel(totals.owed) : null, icon: '₦', bg: '#ffedd5', note: 'all time', warm: true },
  ]

  return <div className={s.page}>
    <div className={s.head}>
      <div>
        <h1 className={s.title}>Ambassadors</h1>
        <p className={s.sub}>Teachers who refer students. Record what you pay them here.</p>
      </div>
      <label className={s.year}>
        📅 Year
        <select value={year} onChange={e => setYear(e.target.value)} aria-label="Year">
          {(data?.years ?? [THIS_YEAR]).map(y => <option key={y} value={String(y)}>{y}</option>)}
          <option value="all">All years</option>
        </select>
      </label>
    </div>

    <div className={s.stats}>
      {cards.map(card => <div key={card.label} className={s.stat} style={{ cursor: 'default' }}>
        <span className={s.statIcon} style={{ background: card.bg }} aria-hidden="true">{card.icon}</span>
        <span>
          <span className={s.statLabel} style={card.warm ? { color: '#ea580c' } : undefined}>{card.label}</span>
          <span className={s.statValue}>{card.value != null ? (typeof card.value === 'number' ? card.value.toLocaleString() : card.value) : '—'}</span>
          {card.note && data && <span className={s.statNote}>{card.note}</span>}
        </span>
      </div>)}
    </div>

    <div className={s.search}>
      <span className={s.searchIcon} aria-hidden="true">🔍</span>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search ambassadors"
        placeholder="Search by name, school, phone, email or referral code…"/>
    </div>

    <div className={s.toolbar}>
      <div className={s.chips} role="group" aria-label="Filter ambassadors" style={{ marginBottom: 0 }}>
        {FILTERS.map(([id, label]) => <button key={id} type="button" className={`${s.chip} ${filter === id ? s.chipOn : ''}`}
          aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}{data ? ` (${data.counts[id] ?? 0})` : ''}</button>)}
      </div>
      <select className={s.select} value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
        {SORTS.map(([id, label]) => <option key={id} value={id}>Sort: {label}</option>)}
      </select>
    </div>

    <div className={s.tableWrap}>
      {state.error ? <p className={s.problem}>{state.error}</p>
        : !data ? <p className={s.loading}>Loading ambassadors…</p>
        : !rows.length ? <p className={s.empty}>{data.ambassadors.length ? 'No ambassadors match this view.' : 'No ambassadors yet. They appear here when teachers sign up at /partner/signup.'}</p>
        : <table className={s.table} style={{ opacity: state.loading ? .6 : 1 }}>
          <thead><tr><th>Ambassador</th><th>Code</th><th>Students ({yearLabel})</th><th>Earned ({yearLabel})</th><th>Owed</th><th>Status</th><th aria-label="Actions"/></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.id} className={`${s.row} ${selected === r.id ? s.rowOn : ''}`} onClick={() => setSelected(r.id)}>
              <td><div className={s.who}>
                <span className={s.avatar} aria-hidden="true">{initials(r.full_name)}</span>
                <span style={{ minWidth: 0 }}>
                  <span className={s.name}>{r.full_name}</span>
                  <span className={s.handle}>{r.school_name || (r.phone ? formatPhoneForDisplay(r.phone) : r.email) || '—'}</span>
                </span>
              </div></td>
              <td>{r.code ? <strong style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '.06em' }}>{r.code}</strong> : <span className={s.muted}>Not yet</span>}</td>
              <td>
                <strong>{r.students}</strong> joined
                <span className={`${s.expiryNote} ${s.muted}`}>{r.subscribed} subscribed</span>
              </td>
              <td><strong>{priceLabel(r.earned)}</strong></td>
              <td>
                <strong className={r.balance > 0 ? s.warn : undefined}>{priceLabel(r.balance)}</strong>
                {r.paid_out > 0 && <span className={`${s.expiryNote} ${s.muted}`}>{priceLabel(r.paid_out)} paid</span>}
              </td>
              <td><span className={`${s.badge} ${s[r.status === 'active' ? 'tone-green' : 'tone-orange']}`}>{r.status === 'active' ? 'Active' : 'Paused'}</span></td>
              <td><button type="button" className={s.manage} onClick={e => { e.stopPropagation(); setSelected(r.id) }}>Manage →</button></td>
            </tr>)}
          </tbody>
        </table>}
    </div>

    {selected && <AmbassadorPanel id={selected} preview={data?.ambassadors.find(r => r.id === selected)} onClose={closePanel} onChanged={refresh}/>}
  </div>
}
