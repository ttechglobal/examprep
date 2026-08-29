'use client'
// src/app/school-signup/page.js
// Route: /school-signup
//
// Flow:
//   1. Credentials screen — name, school name, email, password
//      → signUp + signInWithPassword
//   2. /api/school/setup (service role) → creates school record,
//      sets role='school_admin' on profiles (bypasses RLS)
//   3. Survey screen — 4 optional questions saved to school_survey
//   4. Redirect to /school/dashboard
//
// WHY service role in step 2:
//   Supabase's handle_new_user trigger defaults every new user to
//   role='student'. We must override it with a service-role API call
//   that bypasses RLS. Without this, school admins land as students.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const NAVY   = '#062A78'
const GREEN  = '#059669'
const BG     = '#f0f4ff'
const WHITE  = '#ffffff'
const BORDER = '#dde4f5'
const TEXT   = '#071B49'
const DIM    = '#7a8aaa'
const FAINT  = '#b0bada'
const ERR    = '#dc2626'
const SEL_BG = 'rgba(6,42,120,0.07)'

const ROLES   = ['Teacher', 'School Administrator', 'Principal / Head Teacher', 'Ministry / Government']
const EXAMS   = ['WAEC', 'JAMB', 'NECO', 'IGCSE']
const SIZES   = ['Under 50', '50 – 200', '200 – 500', '500+']
const SOURCES = ['Word of mouth', 'Social media', 'A student told me', 'ExamPrep reached out', 'Other']

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, wide }) {
  return (
    <div style={{ width:'100%', maxWidth: wide ? 500 : 460, background:WHITE, borderRadius:24, border:`1px solid ${BORDER}`, padding:'32px 28px', boxShadow:'0 4px 24px rgba(6,42,120,.07)' }}>
      {children}
    </div>
  )
}

function Badge() {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(5,150,105,.08)', border:'1px solid rgba(5,150,105,.2)', borderRadius:999, padding:'4px 12px', marginBottom:16 }}>
      <span>🏫</span>
      <span style={{ fontSize:10, fontWeight:800, color:GREEN, textTransform:'uppercase', letterSpacing:'.08em' }}>School Partner</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:FAINT, marginBottom:7 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ type='text', value, onChange, placeholder, autoComplete, autoFocus, suffix }) {
  const input = (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoComplete={autoComplete} autoFocus={autoFocus}
      style={{ width:'100%', padding: suffix ? '12px 44px 12px 14px' : '12px 14px', borderRadius:12, boxSizing:'border-box', border:`1.5px solid ${value ? NAVY : BORDER}`, background:'#f7f8fc', fontSize:14, color:TEXT, outline:'none', fontFamily:'inherit', transition:'border-color .15s' }}
    />
  )
  if (!suffix) return input
  return (
    <div style={{ position:'relative' }}>
      {input}
      <div style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)' }}>
        {suffix}
      </div>
    </div>
  )
}

function Btn({ loading, disabled, type='button', onClick, children }) {
  const off = loading || disabled
  return (
    <button type={type} onClick={onClick} disabled={off}
      style={{ width:'100%', padding:'14px', borderRadius:13, border:'none', background:off?'#e2e8f0':NAVY, color:off?DIM:'#fff', fontSize:15, fontWeight:800, cursor:loading?'wait':off?'not-allowed':'pointer', boxShadow:off?'none':'0 5px 0 #03153d', letterSpacing:'-.01em', fontFamily:'inherit', transition:'all .15s', marginTop:6 }}>
      {children}
    </button>
  )
}

function OptionGrid({ options, selected, multi, onToggle }) {
  const isOn = o => multi ? selected.includes(o) : selected === o
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      {options.map(o => {
        const on = isOn(o)
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            style={{ padding:'11px 14px', borderRadius:12, border:`1.5px solid ${on?NAVY:BORDER}`, background:on?SEL_BG:WHITE, color:on?NAVY:DIM, fontSize:13, fontWeight:on?800:600, cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .12s', display:'flex', alignItems:'center', gap:8 }}>
            {multi && (
              <span style={{ width:15, height:15, borderRadius:4, border:`2px solid ${on?NAVY:BORDER}`, background:on?NAVY:'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {on && <span style={{ color:'#fff', fontSize:9 }}>✓</span>}
              </span>
            )}
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ── Screen 1: Credentials ─────────────────────────────────────────────────────
function CredentialsScreen({ onSuccess }) {
  const [fullName,   setFullName]   = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim())    { setError('Enter your full name'); return }
    if (!schoolName.trim())  { setError('Enter your school name'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Step 1: Create the Supabase auth user.
    // Supabase trigger will fire and create a profiles row with role='student' by default.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Step 2: Sign in immediately to establish a session the API can verify.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Account created but could not sign in automatically. Please go to sign in.')
      setLoading(false)
      return
    }

    // Step 3: Call /api/school/setup with the real school name.
    // This uses the service role to bypass RLS and:
    //   a) insert a row into the schools table with the school name
    //   b) update profiles.role to 'school_admin'
    //   c) link profiles.school_id to the new school
    // Without this step, the user stays as role='student' and cannot
    // access the school dashboard.
    const setupRes = await fetch('/api/school/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName: schoolName.trim() }),
    })

    if (!setupRes.ok) {
      const body = await setupRes.json().catch(() => ({}))
      // Sign the user out — their account exists but setup failed.
      // They'd be stuck as a student account otherwise.
      await supabase.auth.signOut()
      setError(
        body.error
          ? `Setup failed: ${body.error}. Please try again or contact support.`
          : 'Account created but school setup failed. Please contact support.'
      )
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess({ userId: signUpData?.user?.id, email, fullName, schoolName })
  }

  const canSubmit = fullName && schoolName && email && password

  return (
    <Card>
      <Badge/>
      <h1 style={{ fontSize:22, fontWeight:900, color:TEXT, letterSpacing:'-.03em', marginBottom:6 }}>
        Create your school account
      </h1>
      <p style={{ fontSize:13, color:DIM, marginBottom:24, lineHeight:1.6 }}>
        Free to start. Set up your school dashboard in minutes.
      </p>

      {error && (
        <div style={{ padding:'12px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, fontSize:13, color:ERR, marginBottom:18 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Field label="Your full name">
          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Mrs Adaeze Okafor" autoComplete="name" autoFocus/>
        </Field>
        <Field label="School name">
          <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Kings College Lagos" autoComplete="organization"/>
        </Field>
        <Field label="Email address">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu.ng" autoComplete="email"/>
        </Field>
        <Field label={<>Password <span style={{ fontWeight:500, textTransform:'none' }}>(min. 8 characters)</span></>}>
          <Input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            suffix={
              <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, color:DIM, lineHeight:1, padding:0 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            }
          />
        </Field>
        <Btn type="submit" loading={loading} disabled={!canSubmit}>
          {loading ? 'Setting up your account…' : 'Create account →'}
        </Btn>
      </form>

      <p style={{ textAlign:'center', fontSize:13, color:DIM, marginTop:18 }}>
        Already have an account?{' '}
        <Link href="/school-login" style={{ color:NAVY, fontWeight:700, textDecoration:'none' }}>Sign in →</Link>
      </p>
      <p style={{ textAlign:'center', fontSize:11, color:FAINT, marginTop:10, lineHeight:1.6 }}>
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ color:FAINT, textDecoration:'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color:FAINT, textDecoration:'underline' }}>Privacy Policy</Link>
      </p>
    </Card>
  )
}

// ── Screen 2: Survey ──────────────────────────────────────────────────────────
function SurveyScreen({ userId, firstName, onDone }) {
  const [role,   setRole]   = useState(null)
  const [exams,  setExams]  = useState([])
  const [size,   setSize]   = useState(null)
  const [source, setSource] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('school_survey').insert({ user_id:userId, role, exams, size, source })
    } catch {}
    setSaving(false)
    onDone()
  }

  return (
    <Card wide>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
        <div>
          <Badge/>
          <h2 style={{ fontSize:20, fontWeight:900, color:TEXT, letterSpacing:'-.03em', marginBottom:6 }}>
            Quick intro{firstName ? `, ${firstName}` : ''}
          </h2>
          <p style={{ fontSize:13, color:DIM, lineHeight:1.6 }}>4 questions, 30 seconds. Helps us understand your school.</p>
        </div>
        <button type="button" onClick={onDone}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:FAINT, padding:'4px 0', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, marginLeft:16 }}>
          Skip →
        </button>
      </div>

      <div style={{ height:1, background:BORDER, margin:'20px 0' }}/>

      <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
        {[
          { label:'Your role at the school', opts:ROLES, val:role, multi:false, set: v => setRole(p => p===v?null:v) },
          { label:'Exams your students write (select all)', opts:EXAMS, val:exams, multi:true, set: v => setExams(p => p.includes(v)?p.filter(x=>x!==v):[...p,v]) },
          { label:'How many students are you working with?', opts:SIZES, val:size, multi:false, set: v => setSize(p => p===v?null:v) },
          { label:'How did you hear about ExamPrep?', opts:SOURCES, val:source, multi:false, set: v => setSource(p => p===v?null:v) },
        ].map(({ label, opts, val, multi, set }) => (
          <div key={label}>
            <div style={{ fontSize:13, fontWeight:800, color:TEXT, marginBottom:10 }}>{label}</div>
            <OptionGrid options={opts} selected={val} multi={multi} onToggle={set}/>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSubmit} disabled={saving}
        style={{ width:'100%', marginTop:24, padding:'14px', borderRadius:13, border:'none', background:saving?'#e2e8f0':NAVY, color:saving?DIM:'#fff', fontSize:15, fontWeight:800, cursor:saving?'wait':'pointer', boxShadow:saving?'none':'0 5px 0 #03153d', letterSpacing:'-.01em', fontFamily:'inherit', transition:'all .15s' }}>
        {saving ? 'Saving…' : 'Go to my dashboard →'}
      </button>
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SchoolSignupPage() {
  const [screen,   setScreen]   = useState('credentials')
  const [userId,   setUserId]   = useState(null)
  const [fullName, setFullName] = useState('')

  return (
    <div style={{ minHeight:'100dvh', background:BG, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 16px', gap:20 }}>
      <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', boxShadow:'0 4px 0 #03153d' }}>E</div>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>ExamPrep</span>
      </Link>

      {screen === 'credentials' && (
        <CredentialsScreen onSuccess={({ userId, fullName }) => {
          setUserId(userId)
          setFullName(fullName)
          setScreen('survey')
        }}/>
      )}

      {screen === 'survey' && (
        <SurveyScreen
          userId={userId}
          firstName={fullName.split(' ')[0]}
          onDone={() => { window.location.href = '/school/dashboard' }}
        />
      )}

      <p style={{ fontSize:12, color:FAINT }}>
        Are you a student?{' '}
        <Link href="/signup" style={{ color:NAVY, fontWeight:600, textDecoration:'none' }}>Student sign up →</Link>
      </p>
    </div>
  )
}