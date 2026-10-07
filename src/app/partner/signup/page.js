'use client'
// src/app/partner/signup/page.js
// Route: /partner/signup?key=…
// Invite-only. We send selected teachers this link (the key is checked on the
// server, see lib/server/partner.js). Creates the ambassador account, signs the
// teacher in and opens their dashboard, where they generate their referral code.

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import s from '../partner.module.css'

function Signup() {
  const router = useRouter()
  const key = useSearchParams().get('key') ?? ''
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', school: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [badField, setBadField] = useState(null)

  const set = field => e => { setForm(f => ({ ...f, [field]: e.target.value })); if (badField === field) { setBadField(null); setError(null) } }
  const ready = form.fullName.trim() && form.email.trim() && form.phone.trim() && form.password.length >= 8

  async function submit(e) {
    e.preventDefault()
    if (loading || !ready) return
    setLoading(true); setError(null); setBadField(null)

    let data
    try {
      const res = await fetch('/api/partner/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, key }),
      })
      data = await res.json()
    } catch {
      setError('You’re offline. Connect to the internet and try again.'); setLoading(false); return
    }
    if (!data?.ok) { setError(data?.error ?? 'Something went wrong. Please try again.'); setBadField(data?.field ?? null); setLoading(false); return }

    const { error: signInError } = await createClient().auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password })
    if (signInError) { router.push('/partner/login'); return }
    router.push('/partner/dashboard')
  }

  const input = (field, props) => (
    <input className={`${s.input} ${badField === field ? s.inputBad : ''}`} value={form[field]} onChange={set(field)} {...props} />
  )

  return (
    <div className={s.page}>
      <div className={s.center}>
        <Link href="/ambassador" className={s.brand}>
          <span className={s.brandMark}>E</span>ExamPrep A1
        </Link>

        <div className={s.card}>
          <span className={s.badge}>★ Teacher Ambassador</span>
          <h1 className={s.title}>Create your account</h1>

          {!key ? (
            <>
              <p className={s.sub}>Sign-up is by invitation.</p>
              <div className={s.notice}>
                Open the private link we sent you. If you haven’t been selected yet,{' '}
                <Link href="/ambassador" style={{ color: 'inherit', fontWeight: 700 }}>apply here</Link>.
              </div>
            </>
          ) : (
            <>
              <p className={s.sub}>You’ve been selected. Set up your account to get your referral link.</p>
              {error && <div className={s.error} role="alert">{error}</div>}
              <form className={s.form} onSubmit={submit} noValidate>
                <div><label className={s.label} htmlFor="ps-name">Full name</label>
                  {input('fullName', { id: 'ps-name', autoComplete: 'name', autoFocus: true, placeholder: 'e.g. Adeola Johnson' })}</div>
                <div><label className={s.label} htmlFor="ps-email">Email address</label>
                  {input('email', { id: 'ps-email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' })}</div>
                <div><label className={s.label} htmlFor="ps-phone">WhatsApp phone number</label>
                  {input('phone', { id: 'ps-phone', type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0801 234 5678' })}</div>
                <div><label className={s.label} htmlFor="ps-school">School (optional)</label>
                  {input('school', { id: 'ps-school', autoComplete: 'organization', placeholder: 'Where you teach' })}</div>
                <div><label className={s.label} htmlFor="ps-pass">Password</label>
                  {input('password', { id: 'ps-pass', type: 'password', autoComplete: 'new-password', placeholder: 'At least 8 characters' })}</div>
                <button type="submit" className={s.primary} disabled={loading || !ready}>
                  {loading ? 'Creating your account…' : 'Create account'}
                </button>
              </form>
              <p className={s.switch}>Already have an account? <Link href="/partner/login">Sign in</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PartnerSignupPage() {
  return <Suspense fallback={null}><Signup /></Suspense>
}
