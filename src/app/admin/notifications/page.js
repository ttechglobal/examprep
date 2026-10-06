'use client'
// src/app/admin/notifications/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Write and send a notification: pick a template (or start blank), edit the
// words, say who gets it and where a tap leads, check how many phones it will
// reach, send.
//
//   Audience   everyone · one student · by exam · by plan · not practised for a
//              while · plan ending within 7 days. The count shown is real: only
//              phones with notifications turned on.
//   Opens      a page in the app, the WhatsApp channel (paste its link once; it
//              is remembered on this browser) or any https link
//   {name}     becomes each student's first name ("there" if unknown)
//   Rules      no emojis; a short title and message (lib/notifications.js)
//
// Everything sent is recorded in the Activity Log. The daily reminders and the
// weekly-mission messages are automatic: their wording lives in
// supabase/functions/send-notifications/messages.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import {
  TITLE_MAX, BODY_MAX, LINKS, AUDIENCES, TEMPLATES,
  checkMessage, checkLink, checkAudience, audienceLabel,
} from '@/lib/notifications'
import s from './notifications.module.css'

const CHANNEL_KEY = 'ep_whatsapp_channel_url'
const DEFAULT_CHANNEL = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL ?? ''

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

function readChannel() {
  try { return localStorage.getItem(CHANNEL_KEY) || DEFAULT_CHANNEL } catch { return DEFAULT_CHANNEL }
}

export default function AdminNotificationsPage() {
  const [templateId, setTemplateId] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [linkId, setLinkId] = useState('practice')
  const [customUrl, setCustomUrl] = useState('')
  const [channelUrl, setChannelUrl] = useState(DEFAULT_CHANNEL)
  const [audience, setAudience] = useState({ kind: 'all', value: null })
  const [student, setStudent] = useState(null)           // { id, name } for "One student"
  const [studentQuery, setStudentQuery] = useState('')
  const [matches, setMatches] = useState({ key: '', rows: [] })
  const [reach, setReach] = useState({ key: '', data: null, error: null })
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)             // { ok, ... } | { error }

  // The remembered channel link lives in this browser only.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChannelUrl(readChannel()))
    return () => cancelAnimationFrame(frame)
  }, [])

  function pickTemplate(t) {
    setTemplateId(t.id)
    setTitle(t.title)
    setBody(t.body)
    setLinkId(t.link)
    setAudience({ kind: t.audience.kind, value: t.audience.value ?? null })
    setStudent(null); setStudentQuery('')
    setConfirming(false); setResult(null)
  }

  function chooseAudience(kind) {
    const spec = AUDIENCES.find(a => a.kind === kind)
    setAudience({ kind, value: spec?.values?.[0]?.[0] ?? null })
    setStudent(null); setStudentQuery('')
    setConfirming(false); setResult(null)
  }

  function saveChannel(value) {
    setChannelUrl(value)
    try { localStorage.setItem(CHANNEL_KEY, value.trim()) } catch {}
  }

  // ── What will be sent ─────────────────────────────────────────────────────
  const link = LINKS.find(l => l.id === linkId)
  const url = linkId === 'whatsapp' ? checkLink(channelUrl)
    : linkId === 'custom' ? checkLink(customUrl)
    : link?.url
  const message = checkMessage({ title, body })
  const typed = title.trim() || body.trim()
  const audienceSpec = AUDIENCES.find(a => a.kind === audience.kind)
  const target = audience.kind === 'user' ? (student ? { kind: 'user', value: student.id } : null) : checkAudience(audience)
  const targetKey = target ? `${target.kind}:${target.value ?? ''}` : ''

  // Who it reaches: only phones with notifications on.
  useEffect(() => {
    if (!targetKey) return
    let live = true
    const params = new URLSearchParams({ kind: target.kind })
    if (target.value) params.set('value', target.value)
    const timer = setTimeout(() => {
      fetch(`/api/admin/notifications/audience?${params}`)
        .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Could not count'); return d })
        .then(d => { if (live) setReach({ key: targetKey, data: d, error: null }) })
        .catch(e => { if (live) setReach({ key: targetKey, data: null, error: e.message }) })
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey])
  const reachNow = reach.key === targetKey ? reach : null

  // Finding the student for "One student".
  const query = useDebounced(studentQuery.trim(), 300)
  useEffect(() => {
    if (audience.kind !== 'user' || student || query.length < 2) return
    let live = true
    fetch(`/api/admin/notifications/students?q=${encodeURIComponent(query)}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => { if (live) setMatches({ key: query, rows: Array.isArray(rows) ? rows : [] }) })
      .catch(() => { if (live) setMatches({ key: query, rows: [] }) })
    return () => { live = false }
  }, [query, audience.kind, student])
  const studentRows = matches.key === query ? matches.rows : []

  // ── Sending ───────────────────────────────────────────────────────────────
  const devices = reachNow?.data?.devices ?? null
  const problem = !typed ? null
    : message.error ? message.error
    : !url ? (linkId === 'whatsapp' ? 'Paste the WhatsApp channel link under "When they tap it".' : 'Check the link: use a page in the app (starting with /) or a full https:// link.')
    : null
  const ready = !message.error && !!url && !!target && devices > 0 && !sending
  const toEveryone = audience.kind === 'all'
  const label = audienceLabel(audience, student?.name)

  async function send() {
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, audience: target, audienceName: student?.name }),
      })
      const data = await res.json().catch(() => ({}))
      setResult(res.ok ? data : { error: data.error || 'Could not send. Try again.' })
      if (res.ok) setConfirming(false)
    } catch {
      setResult({ error: 'Could not reach the server. Check your connection and try again.' })
    } finally { setSending(false) }
  }

  const previewTitle = (title.trim() || 'Notification title').replace(/\{name\}/gi, 'Ada')
  const previewBody = (body.trim() || 'Your message appears here.').replace(/\{name\}/gi, 'Ada')
  const opens = useMemo(() => {
    if (linkId === 'whatsapp') return url ? 'Opens the WhatsApp channel' : 'Opens the WhatsApp channel (link needed)'
    return `Opens: ${link?.label ?? 'a link'}`
  }, [linkId, link, url])

  return <div className={s.page}>
    <div className={s.head}>
      <h1 className={s.title}>Notifications</h1>
      <p className={s.sub}>Send a message to students’ phones: to everyone, to a group, or to one student. Daily reminders and
        weekly-mission messages go out on their own; this page is for the messages you write.</p>
    </div>

    <div className={s.layout}>
      <div>
        <section className={s.card}>
          <p className={s.step}>1. Start from a template</p>
          <div className={s.templates}>
            {TEMPLATES.map(t => <button key={t.id} type="button" className={`${s.chip} ${templateId === t.id ? s.chipOn : ''}`} onClick={() => pickTemplate(t)}>{t.label}</button>)}
          </div>
        </section>

        <section className={s.card}>
          <p className={s.step}>2. Write the message</p>
          <div className={s.field}>
            <label className={s.label} htmlFor="n-title"><span>Title</span><span className={`${s.count} ${title.length > TITLE_MAX ? s.over : ''}`}>{title.length}/{TITLE_MAX}</span></label>
            <input id="n-title" className={s.input} value={title} onChange={e => { setTitle(e.target.value); setResult(null) }} placeholder="e.g. A scholarship you should see" autoComplete="off"/>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="n-body"><span>Message</span><span className={`${s.count} ${body.length > BODY_MAX ? s.over : ''}`}>{body.length}/{BODY_MAX}</span></label>
            <textarea id="n-body" className={s.textarea} value={body} onChange={e => { setBody(e.target.value); setResult(null) }} placeholder="Say it in a sentence or two."/>
            <p className={s.hint}>No emojis. Write <b>{'{name}'}</b> to use each student’s first name, for example “{'{name}'}, a new scholarship is open.”</p>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="n-link"><span>When they tap it</span></label>
            <select id="n-link" className={s.select} value={linkId} onChange={e => { setLinkId(e.target.value); setResult(null) }}>
              {LINKS.map(l => <option key={l.id} value={l.id}>{l.id === 'custom' || l.id === 'whatsapp' ? l.label : `Open: ${l.label}`}</option>)}
            </select>
            {linkId === 'whatsapp' && <>
              <input className={s.input} style={{ marginTop: 8 }} value={channelUrl} onChange={e => saveChannel(e.target.value)} placeholder="https://whatsapp.com/channel/…" aria-label="WhatsApp channel link" inputMode="url"/>
              <p className={s.hint}>Paste your channel’s link once. This browser remembers it.</p>
            </>}
            {linkId === 'custom' && <>
              <input className={s.input} style={{ marginTop: 8 }} value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="/student/battle or https://…" aria-label="Link" inputMode="url"/>
              <p className={s.hint}>{LINKS.find(l => l.id === 'custom').hint}</p>
            </>}
          </div>
          {problem && <p className={s.problem} role="alert">{problem}</p>}
        </section>

        <section className={s.card}>
          <p className={s.step}>3. Who gets it</p>
          <div className={s.field}>
            <select className={s.select} value={audience.kind} onChange={e => chooseAudience(e.target.value)} aria-label="Audience">
              {AUDIENCES.map(a => <option key={a.kind} value={a.kind}>{a.label}</option>)}
            </select>
          </div>
          {audienceSpec?.values && <div className={s.field}>
            <select className={s.select} value={audience.value ?? ''} onChange={e => { setAudience({ kind: audience.kind, value: e.target.value }); setConfirming(false); setResult(null) }} aria-label={audienceSpec.label}>
              {audienceSpec.values.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select>
          </div>}
          {audience.kind === 'user' && <div className={s.field}>
            {student
              ? <div className={s.picked}><span>{student.name || 'Student'}</span><button type="button" className={s.link} onClick={() => { setStudent(null); setConfirming(false) }}>Change</button></div>
              : <>
                <input className={s.input} value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Search by name, username, phone or email" aria-label="Find a student" autoComplete="off"/>
                {studentRows.length > 0 && <div className={s.matches}>
                  {studentRows.map(r => <button key={r.id} type="button" className={s.match} onClick={() => { setStudent({ id: r.id, name: r.name || r.username || 'Student' }); setStudentQuery(''); setConfirming(false); setResult(null) }}>
                    <span><span className={s.matchName}>{r.name || r.username || 'No name'}</span><span className={s.matchSub}>{[r.username && `@${r.username}`, r.phone, r.school].filter(Boolean).join(' · ')}</span></span>
                  </button>)}
                </div>}
                {query.length >= 2 && matches.key === query && !studentRows.length && <p className={s.hint}>No student found for “{query}”.</p>}
              </>}
          </div>}
        </section>
      </div>

      <aside className={s.side}>
        <div className={s.phone}>
          <p className={s.phoneLabel}>Preview</p>
          <div className={s.notif}>
            <span className={s.notifIcon} aria-hidden="true">A1</span>
            <div className={s.notifBody}>
              <div className={s.notifApp}><span>ExamPrep A1</span><span>now</span></div>
              <p className={s.notifTitle}>{previewTitle}</p>
              <p className={s.notifText}>{previewBody}</p>
            </div>
          </div>
          <p className={s.opens}>{opens}</p>
        </div>

        <section className={s.card}>
          <p className={s.reach}>
            {!target ? 'Choose a student to see who it reaches.'
              : !reachNow ? 'Counting…'
              : reachNow.error ? <span className={s.reachNone}>{reachNow.error}</span>
              : devices > 0 ? <>Reaches <strong>{devices.toLocaleString()}</strong> {devices === 1 ? 'phone' : 'phones'}{reachNow.data.students ? <> ({reachNow.data.students.toLocaleString()} {reachNow.data.students === 1 ? 'student' : 'students'})</> : null}.</>
              : <span className={s.reachNone}>{audience.kind === 'user' ? 'This student has not turned on notifications, so nothing can be sent.' : 'No one in this group has notifications turned on.'}</span>}
          </p>

          {result?.error && <p className={s.error} role="alert">{result.error}</p>}
          {result?.ok && <p className={s.done} role="status">
            Sent to {label}: <b>{result.delivered.toLocaleString()}</b> delivered{result.failed ? `, ${result.failed} failed` : ''}{result.stale ? `, ${result.stale} phones no longer reachable` : ''}.
            {result.more_pages ? ' A large audience is sent in batches, so these are the first batch’s numbers.' : ''}
            {result.first_error ? ` First error: ${result.first_error}` : ''}
          </p>}

          {!confirming
            ? <button type="button" className={s.send} disabled={!ready} onClick={() => { setResult(null); toEveryone || devices > 1 ? setConfirming(true) : send() }}>
                {sending ? 'Sending…' : devices ? `Send to ${devices.toLocaleString()} ${devices === 1 ? 'phone' : 'phones'}` : 'Send'}
              </button>
            : <>
                <button type="button" className={`${s.send} ${s.sendWarn}`} disabled={sending} onClick={send}>
                  {sending ? 'Sending…' : `Yes, send to ${label.toLowerCase() === 'everyone' ? 'everyone' : label} (${devices.toLocaleString()})`}
                </button>
                <button type="button" className={s.cancel} disabled={sending} onClick={() => setConfirming(false)}>Cancel</button>
              </>}
        </section>
      </aside>
    </div>
  </div>
}
