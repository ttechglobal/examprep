'use client'
// src/app/school-login/page.js
// Route: /school-login
// School admin sign-in page. Signs in with email + password,
// verifies the user has role='school_admin', then redirects to /school/dashboard.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NAVY   = '#062A78'
const BG     = '#f0f4ff'
const WHITE  = '#ffffff'
const BORDER = '#dde4f5'
const TEXT   = '#071B49'
const DIM    = '#7a8aaa'
const FAINT  = '#b0bada'
const ERR    = '#dc2626'
const GREEN  = '#059669'

// ── Primitives ─────────────────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, background: WHITE, borderRadius: 24, border: `1px solid ${BORDER}`, padding: '32px 28px', boxShadow: '0 4px 24px rgba(6,42,120,.07)' }}>
      {children}
    </div>
  )
}

function Badge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.2)', borderRadius: 999, padding: '4px 12px', marginBottom: 16 }}>
      <span>🏫</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '.08em' }}>School Dashboard</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: FAINT, marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  )
}

export default function SchoolLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    })

    if (signInError) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    // Confirm the user has school_admin role before sending them to the dashboard.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .single()

    if (profile?.role !== 'school_admin') {
      await supabase.auth.signOut()
      setError('This account is not a school admin account. Are you a student? Sign in at the student login.')
      setLoading(false)
      return
    }

    router.push('/school/dashboard')
  }

  const canSubmit = email.trim() && password

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 20 }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', boxShadow: '0 4px 0 #03153d' }}>E</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>ExamPrep</span>
      </Link>

      <Card>
        <Badge />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '-.03em', marginBottom: 6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: DIM, marginBottom: 24, lineHeight: 1.6 }}>
          Sign in to your school dashboard.
        </p>

        {error && (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 13, color: ERR, marginBottom: 18, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email address">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@school.edu.ng"
              autoComplete="email"
              autoFocus
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box', border: `1.5px solid ${email ? NAVY : BORDER}`, background: '#f7f8fc', fontSize: 14, color: TEXT, outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' }}
            />
          </Field>

          <Field label="Password">
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, boxSizing: 'border-box', border: `1.5px solid ${password ? NAVY : BORDER}`, background: '#f7f8fc', fontSize: 14, color: TEXT, outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: DIM, lineHeight: 1, padding: 0 }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            style={{ width: '100%', padding: '14px', borderRadius: 13, border: 'none', background: (loading || !canSubmit) ? '#e2e8f0' : NAVY, color: (loading || !canSubmit) ? DIM : '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : !canSubmit ? 'not-allowed' : 'pointer', boxShadow: (loading || !canSubmit) ? 'none' : '0 5px 0 #03153d', letterSpacing: '-.01em', fontFamily: 'inherit', transition: 'all .15s', marginTop: 6 }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: DIM, marginTop: 18 }}>
          Don't have an account?{' '}
          <Link href="/school-signup" style={{ color: NAVY, fontWeight: 700, textDecoration: 'none' }}>Create school account →</Link>
        </p>
      </Card>

      <p style={{ fontSize: 12, color: FAINT }}>
        Are you a student?{' '}
        <Link href="/login" style={{ color: NAVY, fontWeight: 600, textDecoration: 'none' }}>Student sign in →</Link>
      </p>
    </div>
  )
}