'use client'
// src/components/admin/schools/SchoolPanel.jsx
// The right-hand panel of the admin Schools page for one school:
//   Overview      contact (call, WhatsApp, copy), slot allocation, Add Slots
//                 (after the school has paid), recent students
//   Students      everyone on the school's list and their Premium
//   Slot History  the free slot, purchases and corrections, with who recorded them
//   Activity      the activity log for this school (ActivityFeed)
// Data: GET /api/admin/schools/[id]; slots: POST /api/admin/schools/[id]/slots.
// onChanged() refreshes the list behind the panel after slots are added.

import { useCallback, useEffect, useRef, useState } from 'react'
import { SCHOOL_SLOT_PRICE, priceLabel } from '@/lib/plans'
import { whatsappTo } from '@/lib/contact'
import { formatPhoneForDisplay, toNationalNumber } from '@/lib/auth/phone'
import { appDay } from '@/lib/dates'
import ActivityFeed from '@/components/admin/activity/ActivityFeed'
import s from '@/components/admin/list/adminList.module.css'

const TABS = [['overview', 'Overview'], ['students', 'Students'], ['history', 'Slot History'], ['activity', 'Activity']]
const TZ = 'Africa/Lagos'
const date = iso => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }) : '—')
const KIND = { free: 'Free slot for joining', purchase: 'Slots bought', correction: 'Correction', opening: 'Slots before the history was recorded' }

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return <button type="button" className={s.small} onClick={() => {
    navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {})
  }}>{done ? '✓ Copied' : '⧉ Copy'}</button>
}

export default function SchoolPanel({ id, year, onClose, onChanged }) {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const panel = useRef(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await send(`/api/admin/schools/${id}`, 'GET')) }
    catch (e) { setError(e.message) }
  }, [id])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => { if (active) { setData(null); setTab('overview'); load() } })
    return () => { active = false }
  }, [load])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const school = data?.school
  return <>
    <div className={s.scrim} onClick={onClose} aria-hidden="true"/>
    <aside ref={panel} tabIndex={-1} className={s.panel} role="dialog" aria-modal="true" aria-labelledby="school-panel-title">
      <div className={s.panelHead}>
        <h2 id="school-panel-title" className={s.panelTitle}>{school?.name ?? 'School'}</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={s.tabs} role="tablist">
        {TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key}
          className={`${s.tab} ${tab === key ? s.tabOn : ''}`} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {error ? <p className={s.problem}>{error} <button type="button" className={s.link} onClick={load}>Try again</button></p>
        : !data ? <p className={s.loading}>Loading…</p>
        : tab === 'overview' ? <Overview data={data} year={year} onSeeStudents={() => setTab('students')}
            onSlots={next => { setData(d => ({ ...d, ...next })); onChanged?.() }} id={id}/>
        : tab === 'students' ? <Students students={data.students}/>
        : tab === 'history' ? <History history={data.history}/>
        : <ActivityFeed school={id} compact/>}
    </aside>
  </>
}

function Overview({ id, data, year, onSeeStudents, onSlots }) {
  const { school, slots, students, history } = data
  const phone = school.contact_phone
  const wa = toNationalNumber(phone ?? '') ? `234${toNationalNumber(phone)}` : null
  const usedPct = slots.total ? Math.round(slots.used / slots.total * 100) : 0
  const thisYear = year === 'all' ? null : Number(year)
  const boughtThisYear = thisYear ? history.filter(h => h.slots > 0 && Number(appDay(h.created_at).slice(0, 4)) === thisYear).reduce((n, h) => n + h.slots, 0) : null

  return <>
    <div className={s.identity}>
      <span className={s.bigAvatar} aria-hidden="true">{initials(school.name)}</span>
      <div>
        <h3>{school.name}</h3>
        <span className={s.handle}>{[school.city, school.state].filter(Boolean).join(', ') || 'Location not set'} · joined {date(school.created_at)}</span>
      </div>
    </div>

    <section className={s.section}>
      <div className={s.sectionHead}><h3 className={s.sectionTitle}>Contact</h3></div>
      <div className={s.card}>
        <div className={s.info}>
          <span className={s.infoIcon} aria-hidden="true">👤</span>
          <span className={s.infoBody}><span className={s.infoLabel}>Contact person</span><span className={s.infoValue}>{school.contact_name ?? '—'}</span></span>
        </div>
        <div className={s.info}>
          <span className={s.infoIcon} aria-hidden="true">☎</span>
          <span className={s.infoBody}><span className={s.infoLabel}>Phone</span><span className={s.infoValue}>{phone ? formatPhoneForDisplay(phone) : '—'}</span></span>
          {phone && <span className={s.infoActions}>
            <a className={`${s.small} ${s.smallBlue}`} href={`tel:${phone}`}>Call</a>
            {wa && <a className={`${s.small} ${s.smallGreen}`} href={whatsappTo(wa)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </span>}
        </div>
        <div className={s.info}>
          <span className={s.infoIcon} aria-hidden="true">✉</span>
          <span className={s.infoBody}><span className={s.infoLabel}>Email</span><span className={s.infoValue}>{school.contact_email ?? '—'}</span></span>
          {school.contact_email && <span className={s.infoActions}><CopyButton text={school.contact_email}/></span>}
        </div>
      </div>
    </section>

    <section className={s.section}>
      <div className={s.allocation}>
        <div className={s.allocationTitle}><span>{slots.used} / {slots.total} slots used</span><span className={s.muted} style={{ fontSize: 13 }}>{usedPct}%</span></div>
        <div className={s.usageTrack}><span className={`${s.usageFill} ${slots.available <= 0 ? s.usageFull : ''}`} style={{ width: `${usedPct}%` }}/></div>
        <div className={s.miniStats}>
          <div className={s.miniStat}><span>Total slots</span><strong>{slots.total}</strong></div>
          <div className={s.miniStat}><span>Used</span><strong>{slots.used}</strong></div>
          <div className={s.miniStat}><span>Available</span><strong>{slots.available}</strong></div>
        </div>
        <span className={s.muted} style={{ fontSize: 12.5 }}>
          Slots never expire.{boughtThisYear != null ? ` Bought in ${thisYear}: ${boughtThisYear}.` : ''}
        </span>
      </div>
      <AddSlots id={id} onSaved={onSlots}/>
    </section>

    <section className={s.section}>
      <div className={s.sectionHead}>
        <h3 className={s.sectionTitle}>Recent students</h3>
        {students.length > 5 && <button type="button" className={s.link} onClick={onSeeStudents}>View all ({students.length}) →</button>}
      </div>
      <Students students={students.slice(0, 5)}/>
    </section>
  </>
}

function AddSlots({ id, onSaved }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('purchase')
  const [count, setCount] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const slots = Number.parseInt(count, 10) || 0
  const listPrice = Math.max(0, slots) * SCHOOL_SLOT_PRICE

  if (!open) return <>
    <button type="button" className={s.primary} onClick={() => { setKind('purchase'); setOpen(true) }}>+ Add Slots</button>
    <button type="button" className={s.link} style={{ display: 'block', margin: '10px auto 0' }} onClick={() => { setKind('correction'); setOpen(true) }}>Correct slots</button>
  </>

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const body = { kind, slots, note }
      if (kind === 'purchase' && amount !== '') body.amount = Number.parseInt(amount, 10)
      onSaved(await send(`/api/admin/schools/${id}/slots`, 'POST', body))
      setOpen(false); setCount(''); setAmount(''); setNote('')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <form className={s.form} onSubmit={save}>
    <label className={s.label} htmlFor="slot-count">{kind === 'purchase' ? 'Slots they paid for' : 'Slots to add (+) or remove (−)'}</label>
    <input id="slot-count" className={s.input} type="number" value={count} onChange={e => setCount(e.target.value)} required
      min={kind === 'purchase' ? 1 : -10000} max={10000} placeholder={kind === 'purchase' ? 'e.g. 50' : 'e.g. -2'}/>
    {kind === 'purchase' && <>
      <label className={s.label} htmlFor="slot-amount">Amount received (₦)</label>
      <input id="slot-amount" className={s.input} type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)}
        placeholder={`${listPrice.toLocaleString('en-NG')} (${slots || 0} × ${priceLabel(SCHOOL_SLOT_PRICE)})`}/>
    </>}
    <label className={s.label} htmlFor="slot-note">{kind === 'purchase' ? 'Payment reference or note (optional)' : 'Why? (required)'}</label>
    <input id="slot-note" className={s.input} value={note} onChange={e => setNote(e.target.value)} maxLength={300} required={kind === 'correction'}
      placeholder={kind === 'purchase' ? 'e.g. Bank transfer, Zenith ref 88213' : 'e.g. Added 50 instead of 5'}/>
    {slots > 0 && kind === 'purchase' && <p className={s.preview}>Adds <strong>{slots}</strong> slot{slots === 1 ? '' : 's'} · {priceLabel(amount === '' ? listPrice : Number(amount) || 0)} received. Recorded under your name.</p>}
    {error && <p className={s.error}>{error}</p>}
    <button type="submit" className={s.primary} disabled={busy || !slots}>{busy ? 'Saving…' : kind === 'purchase' ? `Add ${slots || ''} slots` : 'Save correction'}</button>
    <button type="button" className={s.secondary} onClick={() => setOpen(false)}>Cancel</button>
  </form>
}

function Students({ students }) {
  if (!students.length) return <p className={s.muted} style={{ fontSize: 13 }}>No students yet.</p>
  return <div className={s.card}>
    {students.map(st => <div key={st.id} className={s.info}>
      <span className={s.avatar} aria-hidden="true">{initials(st.name || st.username)}</span>
      <span className={s.infoBody}>
        <span className={s.infoValue}>{st.name || st.username || 'No name yet'}</span>
        <span className={s.infoLabel}>{st.contact ?? '—'}{st.added_at ? ` · added ${date(st.added_at)}` : ' · joined with invite code'}</span>
      </span>
      <span className={`${s.badge} ${s[st.premium === 'school' ? 'tone-green' : st.premium === 'own' ? 'tone-blue' : 'tone-grey']}`}
        title={st.until ? `Premium until ${date(st.until)}` : undefined}>
        {st.premium === 'school' ? 'School Premium' : st.premium === 'own' ? 'Own Premium' : 'Free'}
      </span>
    </div>)}
  </div>
}

function History({ history }) {
  if (!history.length) return <p className={s.muted} style={{ fontSize: 13 }}>No slots yet.</p>
  return <ol className={s.timeline}>
    {history.map(h => <li key={h.id} className={s.event}>
      <span className={`${s.dot} ${s[h.slots > 0 ? 'dot-activated' : 'dot-cancelled']}`} aria-hidden="true"/>
      <div>
        <span className={s.eventDate}>{date(h.created_at)}</span>
        <span className={s.eventTitle}>{h.slots > 0 ? `+${h.slots}` : h.slots} slot{Math.abs(h.slots) === 1 ? '' : 's'} · {KIND[h.kind] ?? h.kind}</span>
        <span className={s.eventDetail}>{[h.amount != null && priceLabel(h.amount), h.created_by ? `by ${h.created_by}` : h.kind === 'free' ? 'automatic' : null].filter(Boolean).join(' · ')}</span>
        {h.note && <span className={s.eventNote}>“{h.note}”</span>}
      </div>
    </li>)}
  </ol>
}
