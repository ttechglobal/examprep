'use client'
// src/app/school/dashboard/tabs/SubscriptionsTab.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Slots & Premium: where a school gives its students Premium.
//   Slots        total · used · available. One slot = one student, 12 months
//                of Premium. Unused slots never expire.
//   Add student  by the phone number or email they signed up with; uses a slot
//   Buy slots    choose how many; the price is worked out (lib/plans.js
//                SCHOOL_SLOT_PRICE) and the request goes to us on WhatsApp with
//                the school's name, email and number. We add the slots once
//                payment is confirmed.
//   Students     the school's students and their Premium; Remove (the slot
//                comes back if they were added in the last 7 days)
//   History      the free slot and every purchase
// Data: /api/school/subscriptions.
//
// v2: rebuilt on the slot ledger. v1's WhatsApp button went to a placeholder
// number, students could only be added by email, and the list showed only
// slot holders.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { SCHOOL_SLOT_PRICE, SCHOOL_SLOT_MONTHS, priceLabel } from '@/lib/plans'
import { whatsappLink } from '@/lib/contact'
import s from './slots.module.css'

const QUANTITIES = [10, 20, 50, 100]
const TZ = 'Africa/Lagos'
const date = iso => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—')
const KIND = { free: 'Free slot for joining', purchase: 'Slots bought', correction: 'Correction', opening: 'Slots before the history was recorded' }

async function send(method, body) {
  const res = await fetch('/api/school/subscriptions', {
    method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

function buyMessage(count, school, adminName) {
  const contact = [adminName && `Name: ${adminName}`, school?.contact_email && `Email: ${school.contact_email}`, school?.contact_phone && `Phone: ${school.contact_phone}`]
    .filter(Boolean).join('\n')
  return `Hi, I'd like to buy ${count} Premium slot${count === 1 ? '' : 's'} for ${school?.name ?? 'our school'}.\n` +
    `${count} × ${priceLabel(SCHOOL_SLOT_PRICE)} = ${priceLabel(count * SCHOOL_SLOT_PRICE)}\n${contact}`
}

export default function SubscriptionsTab({ adminName }) {
  const [data, setData] = useState(null)        // { slots, students, history, school }
  const [error, setError] = useState(null)
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)    // { tone: 'ok' | 'bad', text }
  const [count, setCount] = useState(20)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    try { setData(await send('GET')); setError(null) }
    catch (e) { setError(e.message) }
  }, [])
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  async function add(e) {
    e.preventDefault()
    setBusy(true); setNotice(null)
    try {
      const result = await send('POST', { contact })
      setData(d => ({ ...d, slots: result.slots, students: result.students }))
      setContact('')
      setNotice({ tone: 'ok', text: result.message })
    } catch (err) { setNotice({ tone: 'bad', text: err.message }) }
    finally { setBusy(false) }
  }

  async function remove(student) {
    setBusy(true); setNotice(null)
    try {
      const result = await send('DELETE', { student_id: student.id })
      setData(d => ({ ...d, slots: result.slots, students: result.students }))
      setNotice({ tone: 'ok', text: `${student.name || 'The student'} was removed.${result.slotReturned ? ' The slot is back in your balance.' : ''}` })
      setRemoving(null)
    } catch (err) { setNotice({ tone: 'bad', text: err.message }) }
    finally { setBusy(false) }
  }

  if (error) return <div className="sd-content"><p className={s.problem}>{error} <button className={s.link} onClick={load}>Try again</button></p></div>
  if (!data) return <div className="sd-content"><p className={s.loading}>Loading your slots…</p></div>

  const { slots, students, history, school } = data
  const usedPct = slots.total > 0 ? Math.min(100, Math.round((slots.used / slots.total) * 100)) : 0

  return <div className="sd-content">
    <div className="sd-page-header">
      <div>
        <div className="sd-page-title">Slots &amp; Premium</div>
        <div className="sd-page-sub">Each slot gives one student {SCHOOL_SLOT_MONTHS} months of Premium. Unused slots never expire.</div>
      </div>
    </div>

    <div className={s.stats}>
      <div className={s.stat}><span>Total slots</span><strong>{slots.total}</strong></div>
      <div className={s.stat}><span>Used</span><strong>{slots.used}</strong></div>
      <div className={s.stat}><span>Available</span><strong className={slots.available ? s.good : s.bad}>{slots.available}</strong></div>
    </div>
    <div className={s.bar} role="progressbar" aria-label="Slots used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPct}><span style={{ width: `${usedPct}%` }}/></div>

    <div className={s.cols}>
      <section className={s.card}>
        <h2 className={s.cardTitle}>Give a student Premium</h2>
        <p className={s.cardText}>Enter the phone number or email the student signed up with. They need an ExamPrep account first.</p>
        <form className={s.addRow} onSubmit={add}>
          <input className={s.input} value={contact} onChange={e => setContact(e.target.value)}
            placeholder="0801 234 5678 or student@email.com" aria-label="Student's phone number or email" disabled={!slots.available}/>
          <button className={s.primary} type="submit" disabled={busy || !contact.trim() || !slots.available}>{busy ? 'Adding…' : 'Add student'}</button>
        </form>
        {!slots.available && <p className={s.warn}>You have no slots left. Buy more to add students.</p>}
        {notice && <p className={notice.tone === 'ok' ? s.ok : s.error} role="status">{notice.text}</p>}
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>Buy more slots</h2>
        <p className={s.cardText}>{priceLabel(SCHOOL_SLOT_PRICE)} per slot. Send us your request on WhatsApp; we&apos;ll reply with payment details and add the slots once payment is confirmed.</p>
        <div className={s.quantities} role="group" aria-label="Number of slots">
          {QUANTITIES.map(n => <button key={n} type="button" className={`${s.qty} ${count === n ? s.qtyOn : ''}`} onClick={() => setCount(n)} aria-pressed={count === n}>{n}</button>)}
          <input className={s.qtyInput} type="number" min={1} max={2000} value={count} aria-label="Other number of slots"
            onChange={e => setCount(Math.max(1, Math.min(2000, Number.parseInt(e.target.value, 10) || 1)))}/>
        </div>
        <p className={s.total}>{count} × {priceLabel(SCHOOL_SLOT_PRICE)} = <strong>{priceLabel(count * SCHOOL_SLOT_PRICE)}</strong></p>
        <a className={s.whatsapp} href={whatsappLink(buyMessage(count, school, adminName))} target="_blank" rel="noopener noreferrer">Request {count} slots on WhatsApp</a>
      </section>
    </div>

    <section className={s.card}>
      <h2 className={s.cardTitle}>Your students ({students.length})</h2>
      {!students.length ? <p className={s.cardText}>No students yet. Add a student above, or share your invite code from the Cohort page.</p>
        : <ul className={s.list}>
          {students.map(st => <li key={st.id} className={s.row}>
            <span className={s.who}>
              <strong>{st.name || st.username || 'No name yet'}</strong>
              <span>{st.contact ?? '—'}</span>
            </span>
            <span className={s.plan}>
              {st.premium === 'school' ? <span className={`${s.badge} ${s.badgeSchool}`}>Premium · until {date(st.until)}</span>
                : st.premium === 'own' ? <span className={`${s.badge} ${s.badgeOwn}`}>Own Premium · until {date(st.until)}</span>
                : <span className={s.badge}>Free</span>}
            </span>
            {removing === st.id ? <span className={s.confirm}>
              <span>{st.refundable ? 'Their Premium ends and the slot comes back.' : st.premium === 'school' ? 'Their Premium ends. The slot stays used.' : 'They leave your school list.'}</span>
              <button type="button" className={s.danger} disabled={busy} onClick={() => remove(st)}>Remove</button>
              <button type="button" className={s.small} onClick={() => setRemoving(null)}>Keep</button>
            </span> : <button type="button" className={s.small} onClick={() => setRemoving(st.id)}>Remove</button>}
          </li>)}
        </ul>}
    </section>

    <section className={s.card}>
      <h2 className={s.cardTitle}>Slot history</h2>
      <ul className={s.list}>
        {history.map(h => <li key={h.id} className={s.row}>
          <span className={s.who}><strong>{h.slots > 0 ? `+${h.slots}` : h.slots} slot{Math.abs(h.slots) === 1 ? '' : 's'}</strong><span>{KIND[h.kind] ?? h.kind}{h.amount != null ? ` · ${priceLabel(h.amount)}` : ''}</span></span>
          <span className={s.plan}>{date(h.created_at)}</span>
        </li>)}
        {!history.length && <li className={s.cardText}>No slots yet.</li>}
      </ul>
    </section>
  </div>
}
