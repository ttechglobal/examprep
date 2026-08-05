'use client'
// src/app/school/signup/page.js — v2 restyled to match app design system

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SchoolSignupPage() {
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [done,     setDone]     = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)

    const redirectTo =
      `${window.location.origin}/api/auth/callback?role=school_admin&next=/school/onboarding`

    const { error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: redirectTo },
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  // ── Confirm screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100dvh', background: '#eceef8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>📬</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f1629', letterSpacing: '-0.02em', marginBottom: 10 }}>Check your email</h2>
          <p style={{ fontSize: 14, color: '#4a5070', lineHeight: 1.65, marginBottom: 24 }}>
            We sent a confirmation link to <strong style={{ color: '#0f1629' }}>{email}</strong>.<br/>
            Click it to activate your account and continue setting up your school.
          </p>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: '#34d399', textDecoration: 'none' }}>← Back to sign in</Link>
        </div>
      </div>
    )
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#eceef8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 28 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#0b1330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', boxShadow: '0 3px 0 #05070f' }}>E</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f1629', letterSpacing: '-0.01em' }}>
          Exam<span style={{ color: '#8890aa', fontWeight: 500 }}>Prep</span>
        </span>
      </Link>

      {/* Card */}
      <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 24, border: '1px solid #e2e4f0', padding: '28px 28px 24px', boxShadow: '0 4px 20px rgba(11,19,48,.08)' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.25)', borderRadius: 999, padding: '4px 10px', marginBottom: 14 }}>
            <span style={{ fontSize: 12 }}>🏫</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '.08em' }}>School Partner</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f1629', letterSpacing: '-0.025em', marginBottom: 6 }}>Create your school account</h1>
          <p style={{ fontSize: 13, color: '#8890aa', lineHeight: 1.5 }}>Connect your class and see real-time mastery data as students practise.</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Your name', value: fullName, set: setFullName, type: 'text',     placeholder: 'e.g. Mrs Adaeze Okafor' },
            { label: 'Email address', value: email, set: setEmail,   type: 'email',    placeholder: 'you@school.edu.ng' },
            { label: 'Password',   value: password, set: setPassword, type: 'password', placeholder: 'At least 8 characters' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4a5070', marginBottom: 6, letterSpacing: '-0.005em' }}>{label}</label>
              <input
                type={type} value={value} required
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 12,
                  border: '1.5px solid #e2e4f0', background: '#f7f8fc',
                  fontSize: 14, color: '#0f1629', outline: 'none',
                  boxSizing: 'border-box', transition: 'border .15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#0b1330'}
                onBlur={e => e.target.style.borderColor = '#e2e4f0'}
              />
            </div>
          ))}

          {/* Submit */}
          <button
            onClick={handleSignup} disabled={loading}
            style={{
              marginTop: 4, width: '100%', padding: '13px 0', borderRadius: 14,
              background: loading ? '#94a3b8' : '#0b1330', color: '#fff',
              fontSize: 15, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 0 #05070f',
              letterSpacing: '-0.01em', transition: 'all .1s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Creating account…' : 'Create school account →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8890aa', marginTop: 18 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#0b1330', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>

      {/* Trust line */}
      <p style={{ marginTop: 20, fontSize: 12, color: '#9ca3c0', textAlign: 'center' }}>
        Free to start · No setup fees · 5-minute onboarding
      </p>
    </div>
  )
}