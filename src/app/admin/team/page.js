'use client'
// src/app/admin/team/page.js
// Admin Team: everyone who can sign in to the admin dashboard. The owner
// (ADMIN_PASSWORD) adds team members with their own email and password,
// removes their access, or resets a password; everyone else can see the list.
// Each person's actions are recorded under their name in the Activity Log.
// API: /api/admin/team, /api/admin/team/[id].

import { useCallback, useEffect, useState } from 'react'
import s from '@/components/admin/activity/activity.module.css'

const TZ = 'Africa/Lagos'
const when = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : 'never'

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

export default function AdminTeamPage() {
  const [data, setData] = useState(null)        // { team, you }
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    try { setData(await send('/api/admin/team', 'GET')); setError(null) }
    catch (e) { setError(e.message) }
  }, [])
  useEffect(() => {
    let active = true
    Promise.resolve().then(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  async function act(action) {
    setBusy(true); setFormError(null)
    try { await action(); await load(); return true }
    catch (e) { setFormError(e.message); return false }
    finally { setBusy(false) }
  }

  const owner = !!data?.you?.owner
  return <div className={s.page}>
    <h1 className={s.title}>Admin Team</h1>
    <p className={s.sub}>Everyone who can use this dashboard. Each person signs in with their own email and password, so the Activity Log shows who did what.</p>

    {error && <p className={s.problem}>{error}</p>}
    {!data && !error && <p className={s.loading}>Loading…</p>}

    {data && <div className={s.card}>
      {data.team.map(member => <div key={member.id} className={s.member}>
        <span className={s.avatar} aria-hidden="true">{member.name.trim()[0]?.toUpperCase()}</span>
        <span>
          <span className={s.memberName}>
            {member.name}{member.owner && <span className={s.badge}>Owner</span>}
            {!member.owner && <span className={`${s.badge} ${member.active ? '' : s.badgeOff}`}>{member.active ? 'Active' : 'No access'}</span>}
          </span>
          <span className={s.memberMeta}>
            {member.owner ? 'Signs in with the owner password' : `${member.email} · added ${when(member.created_at)}${member.created_by ? ` by ${member.created_by}` : ''} · last sign-in ${when(member.last_login_at)}`}
          </span>
        </span>
        {owner && !member.owner && <span className={s.actions}>
          <button type="button" className={s.small} disabled={busy} onClick={() => {
            const password = window.prompt(`New password for ${member.name} (at least 10 characters):`)
            if (password) act(() => send(`/api/admin/team/${member.id}`, 'PATCH', { password }))
          }}>Reset password</button>
          <button type="button" className={`${s.small} ${member.active ? s.smallDanger : ''}`} disabled={busy}
            onClick={() => {
              if (!member.active || window.confirm(`Remove ${member.name}'s access? They'll be signed out straight away.`)) {
                act(() => send(`/api/admin/team/${member.id}`, 'PATCH', { active: !member.active }))
              }
            }}>{member.active ? 'Remove access' : 'Restore access'}</button>
        </span>}
      </div>)}
    </div>}

    {owner && <div className={s.card}>
      <form className={s.form} onSubmit={async e => {
        e.preventDefault()
        if (await act(() => send('/api/admin/team', 'POST', form))) setForm({ name: '', email: '', password: '' })
      }}>
        <label><span className={s.label}>Name</span>
          <input className={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={80} autoComplete="off"/></label>
        <label><span className={s.label}>Email</span>
          <input className={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="off"/></label>
        <label><span className={s.label}>Password (10+ characters)</span>
          <input className={s.input} type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={10} autoComplete="new-password"/></label>
        <button type="submit" className={s.primary} disabled={busy}>{busy ? 'Saving…' : 'Add team member'}</button>
      </form>
      {formError && <p className={s.error}>{formError}</p>}
      <p className={s.note}>Give them the email and password yourself; they sign in at /admin-login.</p>
    </div>}
    {data && !owner && <p className={s.note} style={{ padding: 0 }}>Only the owner can add or remove team members.</p>}
  </div>
}
