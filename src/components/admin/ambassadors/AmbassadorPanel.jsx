'use client'
// src/components/admin/ambassadors/AmbassadorPanel.jsx
// The right-hand panel of the admin Ambassadors page for one ambassador:
//   Overview   contact (call, WhatsApp, copy), referral code and link, what they
//              have earned / been paid / are owed, Record payout, commission rate,
//              Pause / Resume
//   Students   everyone they referred, with plan state and commission
//   Payouts    every payment recorded to them, with who recorded it
// Data: GET /api/admin/ambassadors/[id]; PATCH the same URL (rate, status);
// payouts: POST /api/admin/ambassadors/[id]/payouts. Paying does not move money:
// make the transfer first, then record it here.
// onChanged() refreshes the list behind the panel.

import { useCallback, useEffect, useRef, useState } from 'react'
import { priceLabel } from '@/lib/plans'
import { whatsappTo } from '@/lib/contact'
import { formatPhoneForDisplay, toNationalNumber } from '@/lib/auth/phone'
import s from '@/components/admin/list/adminList.module.css'

const TABS = [['overview', 'Overview'], ['students', 'Students'], ['payouts', 'Payouts']]
const TZ = 'Africa/Lagos'
const date = iso => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }) : '—')
const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const percent = rate => `${Math.round(rate * 10000) / 100}%`

const STATE = {
  two_months: ['2 Months', 'green'], annual: ['Annual', 'green'], legacy: ['Premium', 'green'], school: ['School', 'blue'],
  trial: ['Free trial', 'sky'], free: ['Free', 'grey'], expired: ['Expired', 'red'],
}

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

function CopyButton({ text, label = '⧉ Copy' }) {
  const [done, setDone] = useState(false)
  return <button type="button" className={s.small} onClick={() => {
    navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {})
  }}>{done ? '✓ Copied' : label}</button>
}

// preview: the ambassador's row from the list, so the panel opens with their name and
// numbers at once while the students and payouts load.
export default function AmbassadorPanel({ id, preview, onClose, onChanged }) {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const panel = useRef(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData(await send(`/api/admin/ambassadors/${id}`, 'GET')) }
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

  // After a payout, rate or status change: reload this panel and the list behind it.
  const changed = useCallback(async () => { await load(); onChanged?.() }, [load, onChanged])

  const shown = data ?? (preview?.id === id ? {
    ambassador: { ...preview },
    stats: { students: preview.students, paying_students: preview.subscribed, earned: preview.earned_all, paid_out: preview.paid_out, balance: preview.balance },
    payouts: null, students: null,
  } : null)
  const amb = shown?.ambassador

  return <>
    <div className={s.scrim} onClick={onClose} aria-hidden="true"/>
    <aside ref={panel} tabIndex={-1} className={s.panel} role="dialog" aria-modal="true" aria-labelledby="amb-panel-title">
      <div className={s.panelHead}>
        <h2 id="amb-panel-title" className={s.panelTitle}>{amb?.full_name ?? 'Ambassador'}</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={s.tabs} role="tablist">
        {TABS.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key}
          className={`${s.tab} ${tab === key ? s.tabOn : ''}`} onClick={() => setTab(key)}>{label}</button>)}
      </div>

      {error ? <p className={s.problem}>{error} <button type="button" className={s.link} onClick={load}>Try again</button></p>
        : !shown ? <p className={s.loading}>Loading…</p>
        : tab === 'overview' ? <Overview data={shown} ready={!!data} id={id} onChanged={changed}/>
        : tab === 'students' ? (data ? <Students students={data.students}/> : <p className={s.loading}>Loading…</p>)
        : (data ? <Payouts payouts={data.payouts}/> : <p className={s.loading}>Loading…</p>)}
    </aside>
  </>
}

function Overview({ id, data, ready, onChanged }) {
  const { ambassador: amb, stats } = data
  const phone = amb.phone
  const wa = toNationalNumber(phone ?? '') ? `234${toNationalNumber(phone)}` : null
  const base = (process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
  const link = amb.code ? `${base}/r/${amb.code}` : null

  return <>
    <div className={s.identity}>
      <span className={s.bigAvatar} aria-hidden="true">{initials(amb.full_name)}</span>
      <div>
        <h3>{amb.full_name}</h3>
        <span className={s.handle}>{amb.school_name || 'School not given'} · joined {date(amb.created_at)}</span>
        <span className={`${s.badge} ${s[amb.status === 'active' ? 'tone-green' : 'tone-orange']}`} style={{ marginTop: 6 }}>
          {amb.status === 'active' ? 'Active' : 'Paused'}
        </span>
      </div>
    </div>

    <section className={s.section}>
      <div className={s.sectionHead}><h3 className={s.sectionTitle}>Contact</h3></div>
      <div className={s.card}>
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
          <span className={s.infoBody}><span className={s.infoLabel}>Email</span><span className={s.infoValue}>{amb.email ?? '—'}</span></span>
          {amb.email && <span className={s.infoActions}><CopyButton text={amb.email}/></span>}
        </div>
        <div className={s.info}>
          <span className={s.infoIcon} aria-hidden="true">🔗</span>
          <span className={s.infoBody}>
            <span className={s.infoLabel}>Referral code</span>
            <span className={s.infoValue}>{amb.code ?? 'Not generated yet'}</span>
          </span>
          {link && <span className={s.infoActions}><CopyButton text={link} label="⧉ Link"/></span>}
        </div>
      </div>
    </section>

    <section className={s.section}>
      <div className={s.allocation}>
        <div className={s.allocationTitle}><span>{priceLabel(stats.balance)} owed</span><span className={s.muted} style={{ fontSize: 13 }}>all time</span></div>
        <div className={s.miniStats}>
          <div className={s.miniStat}><span>Earned</span><strong>{priceLabel(stats.earned)}</strong></div>
          <div className={s.miniStat}><span>Paid out</span><strong>{priceLabel(stats.paid_out)}</strong></div>
          <div className={s.miniStat}><span>Students</span><strong>{stats.paying_students} / {stats.students}</strong></div>
        </div>
        <span className={s.muted} style={{ fontSize: 12.5 }}>Students column: subscribed / signed up. Commission is earned on a student’s first payment only.</span>
      </div>
      {ready && <RecordPayout id={id} balance={stats.balance} onSaved={onChanged}/>}
    </section>

    {ready && <Settings id={id} amb={amb} onSaved={onChanged}/>}
  </>
}

function RecordPayout({ id, balance, onSaved }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const value = Number.parseInt(amount, 10) || 0

  if (!open) return <button type="button" className={s.primary} onClick={() => { setAmount(balance > 0 ? String(balance) : ''); setOpen(true) }} disabled={balance <= 0}>
    {balance > 0 ? 'Record a payout' : 'Nothing owed right now'}
  </button>

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await send(`/api/admin/ambassadors/${id}/payouts`, 'POST', { amount: value, note })
      setOpen(false); setAmount(''); setNote('')
      await onSaved()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <form className={s.form} onSubmit={save}>
    <label className={s.label} htmlFor="payout-amount">Amount you paid (₦)</label>
    <input id="payout-amount" className={s.input} type="number" min={1} max={balance} value={amount} onChange={e => setAmount(e.target.value)} required/>
    <label className={s.label} htmlFor="payout-note">Transfer reference (optional)</label>
    <input id="payout-note" className={s.input} value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. Bank transfer, Zenith ref 88213"/>
    {value > 0 && <p className={s.preview}>Records <strong>{priceLabel(value)}</strong> as paid. They will be owed <strong>{priceLabel(Math.max(0, balance - value))}</strong>. Recorded under your name. Make the transfer first: this does not send money.</p>}
    {error && <p className={s.error}>{error}</p>}
    <button type="submit" className={s.primary} disabled={busy || value < 1 || value > balance}>{busy ? 'Saving…' : `Record ${value ? priceLabel(value) : 'payout'}`}</button>
    <button type="button" className={s.secondary} onClick={() => setOpen(false)}>Cancel</button>
  </form>
}

function Settings({ id, amb, onSaved }) {
  const [rate, setRate] = useState(String(Math.round(amb.rate * 10000) / 100))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const changed = Number(rate) !== Math.round(amb.rate * 10000) / 100

  async function patch(body) {
    setBusy(true); setError(null)
    try { await send(`/api/admin/ambassadors/${id}`, 'PATCH', body); await onSaved() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <section className={s.section}>
    <div className={s.sectionHead}><h3 className={s.sectionTitle}>Settings</h3></div>
    <label className={s.label} htmlFor="amb-rate">Commission rate (%)</label>
    <input id="amb-rate" className={s.input} type="number" min={0} max={50} step="0.5" value={rate} onChange={e => setRate(e.target.value)}/>
    <p className={s.muted} style={{ fontSize: 12.5, margin: '-4px 0 12px' }}>
      Applies to payments from now on. Commissions already earned keep the rate they were earned at.
    </p>
    {error && <p className={s.error}>{error}</p>}
    {changed && <button type="button" className={s.primary} disabled={busy || rate === ''} onClick={() => patch({ ratePercent: Number(rate) })}>
      {busy ? 'Saving…' : `Set rate to ${rate}%`}
    </button>}
    <button type="button" className={s.secondary} disabled={busy} onClick={() => patch({ status: amb.status === 'active' ? 'paused' : 'active' })}>
      {amb.status === 'active' ? 'Pause this ambassador' : 'Resume this ambassador'}
    </button>
    {amb.status === 'active' && <p className={s.muted} style={{ fontSize: 12.5, marginTop: 8 }}>
      Pausing stops new students joining with their code. Their existing students still earn, and you decide whether to pay.
    </p>}
  </section>
}

function Students({ students }) {
  if (!students.length) return <p className={s.muted} style={{ fontSize: 13 }}>No students yet.</p>
  return <div className={s.card}>
    {students.map(st => {
      const [label, tone] = STATE[st.state] ?? STATE.free
      return <div key={st.id} className={s.info}>
        <span className={s.avatar} aria-hidden="true">{initials(st.full_name)}</span>
        <span className={s.infoBody}>
          <span className={s.infoValue}>{st.full_name || 'No name yet'}</span>
          <span className={s.infoLabel}>
            {(st.phone_number ? formatPhoneForDisplay(st.phone_number) : st.email) ?? '—'} · joined {date(st.created_at)}
            {st.commission ? ` · earned them ${priceLabel(st.commission)}` : ''}
          </span>
        </span>
        <span className={`${s.badge} ${s[`tone-${tone}`]}`}>{label}</span>
      </div>
    })}
  </div>
}

function Payouts({ payouts }) {
  if (!payouts.length) return <p className={s.muted} style={{ fontSize: 13 }}>Nothing paid out yet.</p>
  return <ol className={s.timeline}>
    {payouts.map(p => <li key={p.id} className={s.event}>
      <span className={`${s.dot} ${s['dot-activated']}`} aria-hidden="true"/>
      <div>
        <span className={s.eventDate}>{date(p.created_at)}</span>
        <span className={s.eventTitle}>{priceLabel(p.amount)} paid</span>
        <span className={s.eventDetail}>{p.created_by ? `recorded by ${p.created_by}` : ''}</span>
        {p.note && <span className={s.eventNote}>“{p.note}”</span>}
      </div>
    </li>)}
  </ol>
}
