'use client'
// src/app/login/page.js — v2
// Redesigned login page with student/school toggle.
// Left panel: dark navy with product illustration.
// Right panel: white form card.

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const T = {
  navy:    '#0b1330',
  navyD:   '#05070f',
  bg:      '#eceef8',
  surface: '#ffffff',
  emerald: '#34d399',
  purple:  '#9b7ae0',
  coral:   '#ff8fab',
  gold:    '#f59e0b',
  text:    '#0f1629',
  dim:     '#5a5f7a',
  faint:   '#9ca3c0',
  border:  '#e2e4f0',
  danger:  '#dc2626',
  dangerBg:'#fef2f2',
}

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

    // Migrate pending diagnostic data
    const resultsRaw = sessionStorage.getItem('diagnostic_results')
    const setupRaw   = sessionStorage.getItem('diagnostic_setup')
    if (resultsRaw && setupRaw && user) {
      try {
        const results = JSON.parse(resultsRaw)
        const setup   = JSON.parse(setupRaw)
        sessionStorage.setItem('pending_diagnostic', JSON.stringify({ userId: user.id, examType: setup.examType, subjects: setup.subjects, answers: results.answers, questions: results.questions }))
        sessionStorage.removeItem('diagnostic_results')
        sessionStorage.removeItem('diagnostic_setup')
      } catch {}
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    const role = profile?.role

    if (from) { router.push(from); return }
    if (role === 'school_admin') { router.push('/school/dashboard'); return }
    if (role === 'admin')        { router.push('/admin/dashboard');  return }
    if (role === 'reviewer')     { router.push('/reviewer');         return }
    router.push('/student/dashboard')
  }

  const isSchool = accountType === 'school'

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

      {/* ── Left panel — dark, illustrative ── */}
      <div style={{ background: `linear-gradient(160deg, ${T.navy} 0%, #0f1e3e 50%, #0a0c18 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background circles */}
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `${T.purple}08`, top: '-10%', right: '-10%' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: `${T.coral}06`, bottom: '10%', left: '-5%' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}>E</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Exam<span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 400 }}> Prep</span></span>
        </div>

        {/* Center illustration content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Mini subject mastery card */}
          <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', padding: '18px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>Your subject mastery</p>
            {[
              { s: 'Chemistry', pct: 62, c: T.purple },
              { s: 'Physics',   pct: 44, c: T.coral },
              { s: 'Mathematics', pct: 78, c: T.emerald },
            ].map(sub => (
              <div key={sub.s} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>{sub.s}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: sub.c }}>{sub.pct}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${sub.pct}%`, background: sub.c, borderRadius: 99 }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '8px 10px', background: 'rgba(52,211,153,.12)', borderRadius: 10, border: '1px solid rgba(52,211,153,.2)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>↑ +15% improvement this week</p>
            </div>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: 10 }}>
            Pick up exactly where<br/>
            <span style={{ color: T.coral }}>you left off.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
            Your practice history, mastery scores, and learning plan are all waiting for you.
          </p>
        </div>

        {/* Bottom social proof */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 20 }}>
          {[{ n: '50K+', l: 'Students' }, { n: '2M+', l: 'Questions' }, { n: '15+', l: 'Subjects' }].map(({ n, l }) => (
            <div key={l}>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{n}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 56px' }}>

        {/* Account type toggle */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.faint, marginBottom: 10 }}>Signing in as</p>
          <div style={{ display: 'flex', background: T.bg, borderRadius: 14, padding: 4, gap: 3 }}>
            {[['student', '🎓 Student'], ['school', '🏫 School']].map(([val, lbl]) => (
              <button key={val} onClick={() => setAccountType(val)}
                style={{ flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', background: accountType === val ? T.surface : 'transparent', color: accountType === val ? T.text : T.faint, boxShadow: accountType === val ? '0 1px 6px rgba(0,0,0,.08)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', marginBottom: 6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: T.faint, marginBottom: 28 }}>
          {isSchool ? 'Sign in to your school dashboard' : 'Continue your exam prep journey'}
        </p>

        {error && (
          <div style={{ marginBottom: 18, padding: '11px 14px', background: T.dangerBg, border: `1px solid #fecaca`, borderRadius: 11, fontSize: 13, color: T.danger }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 5 }}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text, background: T.surface, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = isSchool ? T.emerald : T.purple}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.dim }}>Password</label>
              <Link href="/reset-password" style={{ fontSize: 12, color: isSchool ? T.emerald : T.purple, textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required
                style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text, background: T.surface, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = isSchool ? T.emerald : T.purple}
                onBlur={e => e.target.style.borderColor = T.border}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: T.faint, lineHeight: 1 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '14px', borderRadius: 13, border: 'none',
              background: loading ? T.border : (isSchool ? T.emerald : T.navy),
              color: loading ? T.faint : (isSchool ? T.navy : '#fff'),
              fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : (isSchool ? '0 5px 0 #1a9962' : `0 5px 0 ${T.navyD}`),
              letterSpacing: '-0.01em', transition: 'all .15s', marginTop: 4,
            }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: T.faint }}>
            {isSchool ? (
              <>Don't have a school account?{' '}
                <Link href="/school/signup" style={{ color: T.emerald, fontWeight: 700, textDecoration: 'none' }}>Set up for free →</Link>
              </>
            ) : (
              <>New to ExamPrep?{' '}
                <Link href="/onboarding" style={{ color: T.purple, fontWeight: 700, textDecoration: 'none' }}>Take the free diagnostic →</Link>
              </>
            )}
          </p>
        </div>

        {/* Back to landing */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: 12, color: T.faint, textDecoration: 'none' }}>← Back to homepage</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eceef8' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #9b7ae0', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /></div>}>
      <LoginForm />
    </Suspense>
  )
}