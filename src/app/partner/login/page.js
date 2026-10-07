'use client'
// src/app/partner/login/page.js
// Route: /partner/login
// Teacher Ambassador sign-in: email + password, then checks the account really is
// an ambassador before opening the dashboard.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import s from '../partner.module.css'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (loading || !email.trim() || !password) return
    setLoading(true); setError(null)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (signInError || !data?.user) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (profile?.role !== 'ambassador') {
      await supabase.auth.signOut()
      setError('This is not a Teacher Ambassador account. Students sign in from the ExamPrep A1 app.')
      setLoading(false)
      return
    }
    router.push('/partner/dashboard')
  }

  return (
    <div className={s.page}>
      <div className={s.center}>
        <Link href="/ambassador" className={s.brand}>
          <span className={s.brandMark}>E</span>ExamPrep A1
        </Link>

        <div className={s.card}>
          <span className={s.badge}>★ Teacher Ambassador</span>
          <h1 className={s.title}>Welcome back</h1>
          <p className={s.sub}>Sign in to see your referral code and your students.</p>

          {error && <div className={s.error} role="alert">{error}</div>}

          <form className={s.form} onSubmit={submit}>
            <div>
              <label className={s.label} htmlFor="pl-email">Email address</label>
              <input id="pl-email" className={s.input} type="email" autoComplete="email" autoFocus
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className={s.label} htmlFor="pl-pass">Password</label>
              <input id="pl-pass" className={s.input} type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
            </div>
            <button type="submit" className={s.primary} disabled={loading || !email.trim() || !password}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className={s.foot}>Not an ambassador yet? <Link href="/ambassador">Learn about the program</Link></p>
      </div>
    </div>
  )
}
