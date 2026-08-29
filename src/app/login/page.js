'use client'
// src/app/login/page.js — v3
// Full dark mode support — CSS vars throughout. No hardcoded T colour object.

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from')
  const errorParam   = searchParams.get('error')

  const [accountType, setAccountType] = useState('student')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(errorParam === 'auth_failed' ? 'Authentication failed. Please try again.' : null)
  const [showPass, setShowPass] = useState(false)

  const supabase = createClient()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const role = profile?.role

    // Flush any queued guest sessions to Supabase now that user is logged in
    import('@/lib/localSessionSync').then(({ syncOnLogin }) => syncOnLogin()).catch(() => {})

    if (from) { router.push(from); return }
    if (role === 'school_admin') { router.push('/school/dashboard'); return }
    if (role === 'admin')        { router.push('/admin/dashboard');  return }
    if (role === 'reviewer')     { router.push('/reviewer');         return }
    router.push('/student/home')
  }

  const isSchool = accountType === 'school'
  const accent   = isSchool ? '#34d399' : '#9b7ae0'
  const accentDark = isSchool ? '#1a9962' : '#6d4ac0'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: '#0b1330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', boxShadow: '0 4px 0 #05070f' }}>E</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', letterSpacing: '-0.01em' }}>
            Exam<span style={{ color: 'var(--text-sec)', fontWeight: 500 }}> Prep</span>
          </span>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 24px', boxShadow: 'var(--shadow-card-lg)' }}>

          {/* Account type toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 14, padding: 4, gap: 3, marginBottom: 24 }}>
            {[['student', '🎓 Student'], ['school', '🏫 School']].map(([val, lbl]) => (
              <button key={val} onClick={() => setAccountType(val)}
                style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s',
                  background: accountType === val ? 'var(--bg-card)' : 'transparent',
                  color: accountType === val ? 'var(--text-prim)' : 'var(--text-tert)',
                  boxShadow: accountType === val ? 'var(--shadow-sm)' : 'none',
                }}>
                {lbl}
              </button>
            ))}
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 22, lineHeight: 1.5 }}>
            {isSchool ? 'Sign in to your school dashboard' : 'Continue your exam prep journey'}
          </p>

          {error && (
            <div style={{ marginBottom: 16, padding: '11px 14px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 11, fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tert)', marginBottom: 6 }}>
                Email address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text-prim)', background: 'var(--bg-subtle)', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tert)' }}>Password</label>
                <Link href="/reset-password" style={{ fontSize: 12, color: accent, textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required
                  style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text-prim)', background: 'var(--bg-subtle)', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor = accent}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-tert)', lineHeight: 1 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '14px', borderRadius: 13, border: 'none',
                background: loading ? 'var(--bg-inset)' : (isSchool ? '#34d399' : '#0b1330'),
                color: loading ? 'var(--text-tert)' : (isSchool ? '#0b1330' : '#fff'),
                fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : (isSchool ? `0 5px 0 ${accentDark}` : '0 5px 0 #05070f'),
                letterSpacing: '-0.01em', transition: 'all .15s', marginTop: 4,
              }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>
              {isSchool ? (
                <>Don't have a school account?{' '}
                  <Link href="/school/signup" style={{ color: '#34d399', fontWeight: 700, textDecoration: 'none' }}>Set up for free →</Link>
                </>
              ) : (
                <>New to ExamPrep?{' '}
                  <Link href="/signup" style={{ color: '#1264E5', fontWeight: 700, textDecoration: 'none' }}>Create a free account →</Link>
                </>
              )}
            </p>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: 12, color: 'var(--text-tert)', textDecoration: 'none' }}>← Back to homepage</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #9b7ae0', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}