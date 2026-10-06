'use client'
// src/components/admin/students/StudentPanel.jsx
// The right-hand panel of the admin Students page for one student:
//   details      phone (call, WhatsApp, copy), email, school, joined; Edit
//                changes the name and school (phone/email are their sign-in)
//   subscription what they have now; Activate (after they've paid) or
//                Renew, which queues after the current plan
//   history      every plan activated, cancelled or expired, and the trial
//   delete       removes the account for good (after a confirm)
// Every change returns the refreshed student and history from the server;
// onChanged() then refreshes the list behind the panel.

import { useCallback, useEffect, useRef, useState } from 'react'
import { priceLabel } from '@/lib/plans'
import { whatsappTo } from '@/lib/contact'
import {
  STATE_BADGE, PLAN_OPTIONS, formatDate, currentPlan, historyEvents, nextStart, addMonths,
  whatsappNumber, displayPhone, reminderText,
} from './studentPlan'
import s from '@/components/admin/list/adminList.module.css'

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

function initials(student) {
  const name = (student.name || student.username || '?').trim()
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return <button type="button" className={s.small} onClick={() => {
    navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {})
  }}>{done ? '✓ Copied' : '⧉ Copy'}</button>
}

// preview: the student's row from the list. The panel shows it at once; the plan and
// history (which need their own request) fill in a moment later.
export default function StudentPanel({ id, preview, onClose, onChanged }) {
  const [data, setData] = useState(null)        // { student, subscriptions, at } — at: when loaded
  const [error, setError] = useState(null)
  const [mode, setMode] = useState(null)        // null | 'activate' | 'edit' | 'delete' | { cancel: subId }
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const panel = useRef(null)

  const load = useCallback(async () => {
    setError(null)
    try { setData({ ...await send(`/api/admin/students/${id}`, 'GET'), at: Date.now() }) }
    catch (e) { setError(e.message) }
  }, [id])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => { if (active) { setData(null); setMode(null); load() } })
    return () => { active = false }
  }, [load])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Runs a change; the server answers with the refreshed panel.
  async function change(action) {
    setBusy(true); setFormError(null)
    try {
      const next = await action()
      if (next?.student) setData({ ...next, at: Date.now() })
      setMode(null)
      onChanged?.()
      return true
    } catch (e) { setFormError(e.message); return false }
    finally { setBusy(false) }
  }

  const student = data?.student ?? (preview?.id === id ? preview : null)
  const subscriptions = data?.subscriptions ?? []
  const now = data?.at

  return <>
    <div className={s.scrim} onClick={onClose} aria-hidden="true"/>
    <aside ref={panel} tabIndex={-1} className={s.panel} role="dialog" aria-modal="true" aria-labelledby="student-panel-title">
      <div className={s.panelHead}>
        <h2 id="student-panel-title" className={s.panelTitle}>Student Details</h2>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      {error ? <p className={s.problem}>{error} <button type="button" className={s.link} onClick={load}>Try again</button></p>
        : !student ? <p className={s.loading}>Loading…</p>
        : <>
          <div className={s.identity}>
            <span className={s.bigAvatar} aria-hidden="true">{initials(student)}</span>
            <div>
              <h3>{student.name || 'No name yet'}</h3>
              {student.username && <span className={s.handle}>@{student.username}</span>}
              <span className={`${s.badge} ${s[`tone-${STATE_BADGE[student.state]?.tone ?? 'grey'}`]}`} style={{ marginTop: 6 }}>{STATE_BADGE[student.state]?.label ?? 'Free'}</span>
            </div>
          </div>

          <Details student={student} editing={mode === 'edit'} busy={busy} error={mode === 'edit' ? formError : null}
            onEdit={() => { setFormError(null); setMode('edit') }} onCancel={() => setMode(null)}
            onSave={patch => change(() => send(`/api/admin/students/${id}`, 'PATCH', patch))}/>

          {!data ? <p className={s.loading} style={{ padding: '24px 0' }}>Loading subscription…</p> : <>
          <section className={s.section}>
            <div className={s.sectionHead}><h3 className={s.sectionTitle}>Subscription</h3></div>
            <Subscription student={student} subscriptions={subscriptions} now={now} activating={mode === 'activate'} busy={busy}
              error={mode === 'activate' ? formError : null}
              onStart={() => { setFormError(null); setMode('activate') }} onCancel={() => setMode(null)}
              onActivate={(planId, note) => change(() => send(`/api/admin/students/${id}/subscriptions`, 'POST', { plan_id: planId, note }))}/>
          </section>

          <section className={s.section}>
            <div className={s.sectionHead}><h3 className={s.sectionTitle}>Subscription History</h3></div>
            <History student={student} subscriptions={subscriptions} now={now} cancelling={mode?.cancel ?? null} busy={busy}
              error={mode?.cancel ? formError : null}
              onAsk={subId => { setFormError(null); setMode({ cancel: subId }) }} onKeep={() => setMode(null)}
              onConfirm={(subId, reason) => change(() => send(`/api/admin/subscriptions/${subId}`, 'PATCH', { action: 'cancel', reason }))}/>
          </section>
          </>}

          <div className={s.danger}>
            {mode === 'delete' ? <div className={s.cancelBox}>
              <p style={{ margin: '0 0 10px', fontSize: 13 }}>Delete <strong>{student.name || student.username || 'this student'}</strong> and all their progress? This can&apos;t be undone.</p>
              {formError && <p className={s.error}>{formError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={s.dangerBtn} disabled={busy} onClick={async () => {
                  setBusy(true); setFormError(null)
                  try { await send(`/api/admin/users/${id}`, 'DELETE'); onChanged?.(); onClose() }
                  catch (e) { setFormError(e.message); setBusy(false) }
                }}>{busy ? 'Deleting…' : 'Delete for good'}</button>
                <button type="button" className={s.small} onClick={() => setMode(null)}>Keep</button>
              </div>
            </div> : <button type="button" className={s.dangerBtn} onClick={() => { setFormError(null); setMode('delete') }}>Delete student</button>}
          </div>
        </>}
    </aside>
  </>
}

function Details({ student, editing, busy, error, onEdit, onCancel, onSave }) {
  const [name, setName] = useState(student.name ?? '')
  const [school, setSchool] = useState(student.school ?? '')
  const phone = displayPhone(student.phone)
  const wa = whatsappNumber(student.phone)
  return <section className={s.section}>
    <div className={s.sectionHead}>
      <h3 className={s.sectionTitle}>Student Information</h3>
      {!editing && <button type="button" className={s.small} onClick={() => { setName(student.name ?? ''); setSchool(student.school ?? ''); onEdit() }}>✎ Edit</button>}
    </div>
    {editing ? <form className={s.form} onSubmit={e => { e.preventDefault(); onSave({ name, school }) }}>
      <label className={s.label} htmlFor="edit-name">Full name</label>
      <input id="edit-name" className={s.input} value={name} onChange={e => setName(e.target.value)} maxLength={80} required/>
      <label className={s.label} htmlFor="edit-school">School</label>
      <input id="edit-school" className={s.input} value={school} onChange={e => setSchool(e.target.value)} maxLength={120}/>
      <p className={s.muted} style={{ fontSize: 12, margin: '-4px 0 12px' }}>Phone and email are how the student signs in, so they can only change them from their account.</p>
      {error && <p className={s.error}>{error}</p>}
      <button type="submit" className={s.primary} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      <button type="button" className={s.secondary} onClick={onCancel}>Cancel</button>
    </form> : <div className={s.card}>
      <div className={s.info}>
        <span className={s.infoIcon} aria-hidden="true">☎</span>
        <span className={s.infoBody}><span className={s.infoLabel}>Phone</span><span className={s.infoValue}>{phone ?? '—'}</span></span>
        {phone && <span className={s.infoActions}>
          <a className={`${s.small} ${s.smallBlue}`} href={`tel:${student.phone}`}>Call</a>
          {wa && <a className={`${s.small} ${s.smallGreen}`} href={whatsappTo(wa)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          <CopyButton text={phone}/>
        </span>}
      </div>
      <div className={s.info}>
        <span className={s.infoIcon} aria-hidden="true">✉</span>
        <span className={s.infoBody}><span className={s.infoLabel}>Email</span><span className={s.infoValue}>{student.email ?? '—'}</span></span>
        {student.email && <span className={s.infoActions}><CopyButton text={student.email}/></span>}
      </div>
      <div className={s.info}>
        <span className={s.infoIcon} aria-hidden="true">🏫</span>
        <span className={s.infoBody}><span className={s.infoLabel}>School</span><span className={s.infoValue}>{student.school ?? '—'}</span></span>
      </div>
      <div className={s.info}>
        <span className={s.infoIcon} aria-hidden="true">📅</span>
        <span className={s.infoBody}><span className={s.infoLabel}>Joined</span><span className={s.infoValue}>{formatDate(student.joined)}</span></span>
      </div>
    </div>}
  </section>
}

function Subscription({ student, subscriptions, now, activating, busy, error, onStart, onCancel, onActivate }) {
  const [planId, setPlanId] = useState(PLAN_OPTIONS.find(p => p.best)?.id ?? PLAN_OPTIONS[0].id)
  const [note, setNote] = useState('')
  const plan = currentPlan(student, subscriptions, now)
  const option = PLAN_OPTIONS.find(p => p.id === planId)
  const start = nextStart(subscriptions, now)
  const queued = start.getTime() > now + 60_000
  const wa = whatsappNumber(student.phone)
  // Expired, or a paid plan ending within 7 days.
  const remind = !!wa && (student.state === 'expired' || plan.tone === 'orange')

  return <>
    <div className={s.planBox}>
      <span className={`${s.badge} ${s[`tone-${plan.tone}`]}`}>{plan.premium ? '👑' : 'Free'}</span>
      <div><strong>{plan.title}</strong><span>{plan.detail}</span></div>
    </div>

    {activating ? <form className={s.form} onSubmit={async e => { e.preventDefault(); if (await onActivate(planId, note)) setNote('') }}>
      <span className={s.label}>Plan they paid for</span>
      <div className={s.planOptions} role="radiogroup" aria-label="Plan">
        {PLAN_OPTIONS.map(p => <button key={p.id} type="button" role="radio" aria-checked={p.id === planId}
          className={`${s.planOption} ${p.id === planId ? s.planOptionOn : ''}`} onClick={() => setPlanId(p.id)}>
          <strong>{p.name}</strong><span>{priceLabel(p.price)}</span>
        </button>)}
      </div>
      <label className={s.label} htmlFor="payment-note">Payment reference or note (optional)</label>
      <input id="payment-note" className={s.input} value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. Transfer from Ada, GTB receipt 4521"/>
      <p className={s.preview}>
        Premium from <strong>{formatDate(start.toISOString())}</strong> to <strong>{formatDate(addMonths(start, option.months).toISOString())}</strong>
        {queued && <><br/>Starts when their current plan ends, so they keep every paid day.</>}
      </p>
      {error && <p className={s.error}>{error}</p>}
      <button type="submit" className={s.primary} disabled={busy}>{busy ? 'Activating…' : `Activate ${option.name} · ${priceLabel(option.price)}`}</button>
      <button type="button" className={s.secondary} onClick={onCancel}>Cancel</button>
    </form> : null}

    {!activating && <button type="button" className={s.primary} onClick={onStart}>
      👑 {['two_months', 'annual', 'legacy', 'school'].includes(student.state) ? 'Renew / Extend Subscription' : 'Activate Subscription'}
    </button>}
    {!activating && remind && <a className={s.whatsapp} href={whatsappTo(wa, reminderText(student, now))} target="_blank" rel="noopener noreferrer">
      Send renewal reminder on WhatsApp
    </a>}
  </>
}

function History({ student, subscriptions, now, cancelling, busy, error, onAsk, onKeep, onConfirm }) {
  const [reason, setReason] = useState('')
  const events = historyEvents(student, subscriptions, now)
  return <ol className={s.timeline}>
    {events.map(event => {
      const cancellable = event.sub && event.sub.status === 'active' && Date.parse(event.sub.ends_at) > now
      return <li key={event.key} className={s.event}>
        <span className={`${s.dot} ${s[`dot-${event.kind}`]}`} aria-hidden="true"/>
        <div>
          <span className={s.eventDate}>{formatDate(event.at)}</span>
          <span className={s.eventTitle}>{event.title}</span>
          <span className={s.eventDetail}>{event.detail}</span>
          {event.note && <span className={s.eventNote}>“{event.note}”</span>}
          {cancellable && (cancelling === event.sub.id ? <div className={s.cancelBox}>
            <label className={s.label} htmlFor={`reason-${event.sub.id}`}>Why cancel? (optional)</label>
            <input id={`reason-${event.sub.id}`} className={s.input} value={reason} onChange={e => setReason(e.target.value)} maxLength={300} placeholder="e.g. Activated by mistake, refunded"/>
            {error && <p className={s.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={s.dangerBtn} disabled={busy} onClick={async () => { if (await onConfirm(event.sub.id, reason)) setReason('') }}>{busy ? 'Cancelling…' : 'Cancel this plan'}</button>
              <button type="button" className={s.small} onClick={onKeep}>Keep it</button>
            </div>
          </div> : <button type="button" className={`${s.link} ${s.linkDanger}`} style={{ marginTop: 4 }} onClick={() => { setReason(''); onAsk(event.sub.id) }}>Cancel plan</button>)}
        </div>
      </li>
    })}
    {!events.length && <li className={s.muted} style={{ fontSize: 13 }}>No subscriptions yet.</li>}
  </ol>
}
