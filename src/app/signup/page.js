'use client'
// src/app/signup/page.js — v4 (brand-aligned)
// ExamPrep design system: NAVY #062A78, BLUE #1264E5, CYAN #18B7F2, GOLD #FFB800
//
// FLOW:
//   Step 1 — First name + exam type (WAEC / JAMB / Both)
//   Step 2 — Subject selection
//   Step 3 — Create account  OR  skip → dashboard
//
// Topic selection removed (cleaner, less friction).
// Everything saved to sessionStorage as 'onboarding_setup'.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Design tokens (match the rest of the app) ─────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const BG     = '#08090f'
const CARD   = 'rgba(255,255,255,0.04)'
const BORDER = 'rgba(255,255,255,0.08)'
const BRON   = 'rgba(18,100,229,0.45)'
const TEXT   = '#fff'
const DIM    = 'rgba(255,255,255,0.5)'
const FAINT  = 'rgba(255,255,255,0.2)'
const ERR    = '#ef5d4e'

// ── Subject list ──────────────────────────────────────────────────────────────
const ALL_SUBJECTS = [
  { name: 'Mathematics',           exams: ['WAEC','JAMB'] },
  { name: 'English Language',      exams: ['WAEC']        },
  { name: 'Use of English',        exams: ['JAMB']        },
  { name: 'Biology',               exams: ['WAEC','JAMB'] },
  { name: 'Chemistry',             exams: ['WAEC','JAMB'] },
  { name: 'Physics',               exams: ['WAEC','JAMB'] },
  { name: 'Economics',             exams: ['WAEC','JAMB'] },
  { name: 'Government',            exams: ['WAEC','JAMB'] },
  { name: 'Geography',             exams: ['WAEC','JAMB'] },
  { name: 'Literature in English', exams: ['WAEC']        },
  { name: 'Agricultural Science',  exams: ['WAEC']        },
  { name: 'Further Mathematics',   exams: ['WAEC','JAMB'] },
  { name: 'Commerce',              exams: ['WAEC','JAMB'] },
]
const JAMB_COMPULSORY = ['Use of English', 'Mathematics']

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 4, borderRadius: 2,
          flex: i === step ? 2 : 1,
          background: i === step ? BLUE : i < step ? `${BLUE}55` : BORDER,
          transition: 'all .25s',
        }} />
      ))}
    </div>
  )
}

// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, children, loading }) {
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        width: '100%', padding: '15px 0', borderRadius: 14,
        background: disabled || loading ? 'rgba(255,255,255,.06)' : NAVY,
        color: disabled || loading ? DIM : '#fff',
        fontSize: 15, fontWeight: 800, border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        boxShadow: disabled || loading ? 'none' : '0 5px 0 #03153d',
        letterSpacing: '-.01em', transition: 'all .15s', fontFamily: 'inherit',
      }}
    >{loading ? 'Creating account…' : children}</button>
  )
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '13px 0', borderRadius: 14,
      background: 'transparent', border: `1.5px solid ${BORDER}`,
      color: DIM, fontSize: 14, fontWeight: 700,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

// ── STEP 1: Name + Exam type ──────────────────────────────────────────────────
function StepExam({ name, setName, examType, setExam, onNext }) {
  const [error, setError] = useState(null)
  function proceed() {
    if (!name.trim()) { setError('Enter your first name to continue'); return }
    setError(null); onNext()
  }
  return (
    <div>
      <StepDots step={0} />
      <h2 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '-.03em', marginBottom: 6 }}>
        Welcome to ExamPrep
      </h2>
      <p style={{ fontSize: 14, color: DIM, marginBottom: 28, lineHeight: 1.65 }}>
        Pick your exam and subjects. Start practising in 2 minutes.
      </p>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT, marginBottom: 8 }}>
        Your first name
      </label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && proceed()}
        placeholder="e.g. Amara"
        autoFocus
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 12,
          background: CARD, border: `1.5px solid ${name ? BRON : BORDER}`,
          color: TEXT, fontSize: 15, fontWeight: 600, outline: 'none',
          boxSizing: 'border-box', marginBottom: 24,
          transition: 'border-color .15s', fontFamily: 'inherit',
        }}
      />

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT, marginBottom: 10 }}>
        Which exam are you preparing for?
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[
          { id: 'WAEC', label: 'WAEC',  sub: 'SSCE / GCE' },
          { id: 'JAMB', label: 'JAMB',  sub: 'UTME entrance' },
          { id: 'BOTH', label: 'Both',  sub: 'WAEC + JAMB' },
        ].map(({ id, label, sub }) => {
          const on = examType === id
          return (
            <button key={id} onClick={() => setExam(id)} style={{
              flex: 1, padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
              background: on ? `${BLUE}18` : CARD,
              border: `2px solid ${on ? BLUE : BORDER}`,
              boxShadow: on ? `0 0 0 1px ${BLUE}30` : 'none',
              transition: 'all .15s',
            }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: on ? CYAN : TEXT }}>{label}</div>
              <div style={{ fontSize: 10, color: DIM, marginTop: 3 }}>{sub}</div>
            </button>
          )
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: ERR, marginBottom: 14, textAlign: 'center' }}>{error}</p>}
      <PrimaryBtn onClick={proceed}>Choose subjects →</PrimaryBtn>
    </div>
  )
}

// ── STEP 2: Subject selection ─────────────────────────────────────────────────
function StepSubjects({ examType, selected, setSelected, onNext, onBack }) {
  const visible = examType === 'JAMB'
    ? ALL_SUBJECTS.filter(s => s.exams.includes('JAMB'))
    : examType === 'WAEC'
    ? ALL_SUBJECTS.filter(s => s.exams.includes('WAEC'))
    : ALL_SUBJECTS

  const compulsory = examType === 'JAMB' ? JAMB_COMPULSORY : []

  function toggle(name) {
    if (compulsory.includes(name)) return
    setSelected(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  return (
    <div>
      <StepDots step={1} />
      <h2 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '-.03em', marginBottom: 6 }}>
        Pick your subjects
      </h2>
      <p style={{ fontSize: 14, color: DIM, marginBottom: 24, lineHeight: 1.65 }}>
        {examType === 'JAMB'
          ? 'Use of English and Maths are compulsory for JAMB. Add your other subjects.'
          : 'Select every subject you\'re sitting.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {visible.map(({ name }) => {
          const on   = selected.includes(name)
          const lock = compulsory.includes(name)
          return (
            <button key={name} onClick={() => toggle(name)} style={{
              padding: '12px', borderRadius: 12, cursor: lock ? 'default' : 'pointer',
              background: on ? `${BLUE}16` : CARD,
              border: `1.5px solid ${on ? BLUE : BORDER}`,
              textAlign: 'left', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 6,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              {lock && <span style={{ fontSize: 9, color: CYAN, fontWeight: 800, flexShrink: 0 }}>REQ</span>}
              {!lock && on && <span style={{ fontSize: 13, color: BLUE, flexShrink: 0 }}>✓</span>}
            </button>
          )
        })}
      </div>

      <PrimaryBtn onClick={onNext} disabled={selected.length === 0}>
        Continue ({selected.length} subject{selected.length !== 1 ? 's' : ''}) →
      </PrimaryBtn>
      <div style={{ marginTop: 10 }}>
        <GhostBtn onClick={onBack}>← Back</GhostBtn>
      </div>
    </div>
  )
}

// ── STEP 3: Create account or skip ────────────────────────────────────────────
function StepAccount({ name, examType, subjects, onSkip }) {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [done,     setDone]     = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSignup() {
    if (!email || !password) { setError('Enter your email and a password'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const params   = new URLSearchParams({ exam_type: examType, subjects: subjects.join(','), full_name: name, next: '/student/home' })

    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?${params}`,
      },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    sessionStorage.setItem('onboarding_setup', JSON.stringify({ name, examType, subjects }))
    setDone(true); setLoading(false)
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <StepDots step={2} />
      <div style={{ fontSize: 52, marginBottom: 18 }}>📬</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 8 }}>Check your email</h2>
      <p style={{ fontSize: 14, color: DIM, lineHeight: 1.7, marginBottom: 28 }}>
        We sent a confirmation link to <strong style={{ color: TEXT }}>{email}</strong>. Click it to activate your account.
      </p>
      <PrimaryBtn onClick={() => router.push('/student/home')}>Go to dashboard →</PrimaryBtn>
    </div>
  )

  return (
    <div>
      <StepDots step={2} />
      <h2 style={{ fontSize: 26, fontWeight: 900, color: TEXT, letterSpacing: '-.03em', marginBottom: 6 }}>
        Save your progress
      </h2>
      <p style={{ fontSize: 14, color: DIM, marginBottom: 22, lineHeight: 1.65 }}>
        Create a free account to sync your XP and streak across devices. Or skip and start now.
      </p>

      {/* Setup summary */}
      <div style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}25`, borderRadius: 14, padding: '12px 16px', marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: CYAN, marginBottom: 5 }}>Your setup</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{name} · {examType}</div>
        <div style={{ fontSize: 12, color: DIM, marginTop: 3 }}>{subjects.join(', ')}</div>
      </div>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT, marginBottom: 8 }}>
        Email address
      </label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
        style={{ width: '100%', padding: '13px 16px', borderRadius: 12, boxSizing: 'border-box', background: CARD, border: `1.5px solid ${email ? BRON : BORDER}`, color: TEXT, fontSize: 14, fontWeight: 600, outline: 'none', marginBottom: 12, fontFamily: 'inherit' }}
      />

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: FAINT, marginBottom: 8 }}>
        Password
      </label>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
          placeholder="6+ characters" onKeyDown={e => e.key === 'Enter' && handleSignup()}
          style={{ width: '100%', padding: '13px 46px 13px 16px', borderRadius: 12, boxSizing: 'border-box', background: CARD, border: `1.5px solid ${password ? BRON : BORDER}`, color: TEXT, fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}
        />
        <button type="button" onClick={() => setShowPass(p => !p)}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: DIM, lineHeight: 1, padding: 0 }}>
          {showPass ? '🙈' : '👁'}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: ERR, marginBottom: 14, textAlign: 'center' }}>{error}</p>}

      <PrimaryBtn onClick={handleSignup} loading={loading}>Create free account →</PrimaryBtn>

      <div style={{ position: 'relative', textAlign: 'center', margin: '18px 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: BORDER }} />
        <span style={{ position: 'relative', background: BG, padding: '0 14px', fontSize: 11, color: FAINT, fontWeight: 700 }}>OR</span>
      </div>

      <GhostBtn onClick={onSkip}>Skip for now — go to dashboard</GhostBtn>

      <p style={{ textAlign: 'center', fontSize: 12, color: DIM, marginTop: 20 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: CYAN, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter()
  const [step,     setStep]     = useState(0)
  const [name,     setName]     = useState('')
  const [examType, setExam]     = useState('WAEC')
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/student/home')
    })
  }, [])

  // Keep JAMB compulsory subjects seeded
  useEffect(() => {
    if (examType === 'JAMB') {
      setSubjects(prev => [...new Set([...JAMB_COMPULSORY, ...prev.filter(s =>
        ALL_SUBJECTS.find(x => x.name === s && x.exams.includes('JAMB'))
      )])])
    }
  }, [examType])

  function handleSkip() {
    sessionStorage.setItem('onboarding_setup', JSON.stringify({ name: name || 'Student', examType, subjects }))
    router.push('/student/home')
  }

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 48px', position: 'relative' }}>
      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -60, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,rgba(18,100,229,.1) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.06) 0%,transparent 70%)' }} />
      </div>

      {/* Nav */}
      <div style={{ width: '100%', maxWidth: 460, padding: '24px 24px 0', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', boxShadow: '0 4px 0 #03153d' }}>E</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: DIM, textTransform: 'uppercase', letterSpacing: '.1em' }}>ExamPrep</span>
        </Link>
        <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: DIM, textDecoration: 'none' }}>Sign in →</Link>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 460, padding: '36px 24px', position: 'relative', zIndex: 1 }}>
        {step === 0 && (
          <StepExam name={name} setName={setName} examType={examType} setExam={setExam} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <StepSubjects examType={examType} selected={subjects} setSelected={setSubjects}
            onNext={() => setStep(2)} onBack={() => setStep(0)} />
        )}
        {step === 2 && (
          <StepAccount name={name} examType={examType} subjects={subjects} onSkip={handleSkip} />
        )}
      </div>
    </div>
  )
}