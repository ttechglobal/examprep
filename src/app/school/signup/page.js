'use client'
// src/app/school/signup/page.js — v2
// Full brand redesign. Left: value prop with feature list.
// Right: signup form in white card. Consistent with landing page tokens.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const T = {
  navy:    '#0b1330',
  navyD:   '#05070f',
  bg:      '#eceef8',
  surface: '#ffffff',
  emerald: '#34d399',
  purple:  '#9b7ae0',
  coral:   '#ff8fab',
  text:    '#0f1629',
  dim:     '#5a5f7a',
  faint:   '#9ca3c0',
  border:  '#e2e4f0',
  danger:  '#dc2626',
  dangerBg:'#fef2f2',
}

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
]

function InputField({ label, value, onChange, type = 'text', placeholder, required, as: As = 'input', children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 5 }}>
        {label}{required && <span style={{ color: T.coral }}>*</span>}
      </label>
      {As === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${T.border}`, fontSize: 14, color: value ? T.text : T.faint, background: T.surface, outline: 'none', cursor: 'pointer' }}>
          {children}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
          style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text, background: T.surface, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => e.target.style.borderColor = T.emerald}
          onBlur={e => e.target.style.borderColor = T.border}
        />
      )}
    </div>
  )
}

export default function SchoolSignupPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,       setStep]      = useState(1) // 1=account, 2=school details
  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [city,       setCity]       = useState('')
  const [state,      setState]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [showPass,   setShowPass]   = useState(false)

  async function handleStep1(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null); setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/school/onboarding` },
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').update({ role: 'school_admin' }).eq('id', data.user.id)
    }
    setLoading(false); setStep(2)
  }

  async function handleStep2(e) {
    e.preventDefault()
    if (!schoolName.trim()) { setError('School name is required'); return }
    setError(null); setLoading(true)

    try {
      const res  = await fetch('/api/school/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, city, state }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      await fetch('/api/school/setup/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: data.school.id }),
      })
      router.push('/school/dashboard')
    } catch {
      setError('Something went wrong — try again')
      setLoading(false)
    }
  }

  const BENEFITS = [
    { icon: '📊', text: 'Subject & topic mastery data for your whole class' },
    { icon: '🚨', text: 'At-risk student alerts — know who needs help today' },
    { icon: '📈', text: 'Weekly performance trends, PDF reports for management' },
    { icon: '🏫', text: 'Inter-school tournaments and national rankings' },
    { icon: '📧', text: 'Weekly progress emails automatically sent to parents' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', boxShadow: `0 3px 0 ${T.navyD}` }}>E</div>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Exam <span style={{ color: T.dim, fontWeight: 500 }}>Prep</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.faint }}>Already have an account?</span>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: T.navy, textDecoration: 'none', padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface }}>Sign in</Link>
        </div>
      </nav>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 1000, margin: '0 auto', width: '100%', padding: '40px 24px 60px', gap: 60, alignItems: 'flex-start' }}>

        {/* Left — value prop */}
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${T.emerald}14`, border: `1px solid ${T.emerald}30`, borderRadius: 999, padding: '5px 12px', marginBottom: 20 }}>
            <span style={{ fontSize: 11 }}>🏫</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>For Schools · Free to start</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: T.text, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 14 }}>
            Data that helps your<br/>teachers teach better
          </h1>
          <p style={{ fontSize: 15, color: T.dim, lineHeight: 1.65, marginBottom: 32 }}>
            As your students practise WAEC and JAMB questions, ExamPrep builds a live picture of their mastery — by subject, by topic, by student. You see it all in one dashboard.
          </p>

          {/* Benefits list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
            {BENEFITS.map(b => (
              <div key={b.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.emerald}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{b.icon}</div>
                <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55, paddingTop: 8 }}>{b.text}</p>
              </div>
            ))}
          </div>

          {/* Testimonial-style quote */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.emerald}`, borderRadius: '0 12px 12px 0', padding: '14px 16px' }}>
            <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>
              "Now I know exactly which topics to revise before we move on. The at-risk alerts are a game changer."
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Physics Teacher · Lagos</p>
          </div>
        </div>

        {/* Right — form */}
        <div>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: n === step ? T.navy : n < step ? T.emerald : T.border, color: n <= step ? '#fff' : T.faint }}>
                  {n < step ? '✓' : n}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: n === step ? T.text : T.faint }}>{n === 1 ? 'Create account' : 'School details'}</span>
                {n < 2 && <div style={{ width: 24, height: 2, background: step > 1 ? T.emerald : T.border, borderRadius: 1 }} />}
              </div>
            ))}
          </div>

          <div style={{ background: T.surface, borderRadius: 20, border: `1px solid ${T.border}`, padding: '28px 26px', boxShadow: '0 4px 24px rgba(11,19,48,.07)' }}>

            {error && (
              <div style={{ marginBottom: 16, padding: '11px 14px', background: T.dangerBg, border: `1px solid #fecaca`, borderRadius: 11, fontSize: 13, color: T.danger }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: T.text, marginBottom: 4 }}>Create your account</h2>
                  <p style={{ fontSize: 13, color: T.faint }}>Your personal account for managing your school</p>
                </div>
                <InputField label="Your full name" value={fullName} onChange={setFullName} placeholder="e.g. Adaeze Okonkwo" required />
                <InputField label="Email address" value={email} onChange={setEmail} type="email" placeholder="your@email.com" required />
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 5 }}>Password<span style={{ color: T.coral }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required
                      style={{ width: '100%', padding: '11px 44px 11px 13px', borderRadius: 11, border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text, background: T.surface, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = T.emerald}
                      onBlur={e => e.target.style.borderColor = T.border}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: T.faint }}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading || !fullName || !email || !password}
                  style={{ width: '100%', padding: '13px', borderRadius: 13, background: loading ? T.border : T.navy, color: loading ? T.faint : '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 5px 0 ${T.navyD}`, letterSpacing: '-0.01em', transition: 'all .15s', marginTop: 4 }}>
                  {loading ? 'Creating account…' : 'Continue →'}
                </button>
                <p style={{ fontSize: 12, color: T.faint, textAlign: 'center' }}>
                  Already have an account?{' '}
                  <Link href="/login" style={{ color: T.navy, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                </p>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: T.text, marginBottom: 4 }}>Your school details</h2>
                  <p style={{ fontSize: 13, color: T.faint }}>This is shown on your dashboard and reports</p>
                </div>
                <InputField label="School name" value={schoolName} onChange={setSchoolName} placeholder="e.g. Greenfield Secondary School" required />
                <InputField label="City" value={city} onChange={setCity} placeholder="e.g. Lagos" />
                <InputField label="State" value={state} onChange={setState} as="select">
                  <option value="">Select state…</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </InputField>
                <button type="submit" disabled={loading || !schoolName}
                  style={{ width: '100%', padding: '13px', borderRadius: 13, background: loading ? T.border : T.emerald, color: loading ? T.faint : T.navy, fontSize: 15, fontWeight: 800, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 5px 0 #1a9962', letterSpacing: '-0.01em', transition: 'all .15s', marginTop: 4 }}>
                  {loading ? 'Setting up your school…' : 'Create school dashboard →'}
                </button>
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.faint, textAlign: 'center' }}>
                  ← Back
                </button>
              </form>
            )}
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 18 }}>
            {['🔒 Secure & private', '✅ No setup costs', '⚡ Ready in 5 min'].map(t => (
              <span key={t} style={{ fontSize: 11, color: T.faint }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}