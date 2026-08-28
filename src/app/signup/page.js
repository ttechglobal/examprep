'use client'
// src/app/signup/page.js — v3
// NEW FLOW:
//   Step 1 — Name + exam type (WAEC / JAMB / BOTH)
//   Step 2 — Subject selection (filtered by exam)
//   Step 3 — Topic selection per subject (pick which topics you'll study)
//   Step 4 — Create account OR skip → go straight to dashboard
//
// No diagnostic. No redirect to /diagnostic/test.
// Everything saved to sessionStorage as 'onboarding_setup', picked up
// by the dashboard and register page after account creation.

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0e14',
  surface:   '#13141f',
  surface2:  '#1a1b28',
  border:    'rgba(255,255,255,0.07)',
  borderOn:  'rgba(155,122,224,0.45)',
  text:      '#eef0fa',
  dim:       '#7b7f9e',
  faint:     '#44475e',
  accent:    '#9b7ae0',
  accentBg:  'rgba(155,122,224,0.12)',
  navy:      '#0b1330',
  navyDeep:  '#05070f',
  blue:      '#1264E5',
  err:       '#ef5d4e',
}

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

// JAMB always requires these 4 — pre-select them
const JAMB_COMPULSORY = ['Use of English', 'Mathematics']

// ── Primitives ────────────────────────────────────────────────────────────────
function Btn3D({ onClick, disabled, children, variant = 'navy', style = {} }) {
  const [p, setP] = useState(false)
  const bg   = variant === 'ghost' ? 'transparent' : variant === 'blue' ? C.blue : C.navy
  const shad = variant === 'ghost' ? 'none'
    : variant === 'blue' ? (p ? '0 2px 0 #0a3fa0' : '0 5px 0 #0a3fa0')
    : (p ? `0 2px 0 ${C.navyDeep}` : `0 5px 0 ${C.navyDeep}`)
  const border = variant === 'ghost' ? `1px solid ${C.border}` : 'none'
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        padding: '13px 0', borderRadius: 13, width: '100%', border,
        background: bg, color: variant === 'ghost' ? C.dim : '#fff',
        fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: p ? 'translateY(2px)' : '',
        boxShadow: shad,
        transition: 'transform .1s, box-shadow .1s',
        fontFamily: 'inherit',
        ...style,
      }}
    >{children}</button>
  )
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: C.dim, marginBottom: 10 }}>
      {children}
    </p>
  )
}

function StepDots({ step, total = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 20 : 6, height: 6, borderRadius: 3,
          background: i === step ? C.accent : i < step ? 'rgba(155,122,224,0.4)' : C.border,
          transition: 'all .25s',
        }} />
      ))}
    </div>
  )
}

// ── Step 1: Name + Exam ───────────────────────────────────────────────────────
function StepExam({ name, setName, examType, setExam, onNext }) {
  const [error, setError] = useState(null)
  function proceed() {
    if (!name.trim()) { setError('Enter your first name to continue'); return }
    setError(null); onNext()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <StepDots step={0} />
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-.025em', marginBottom: 6 }}>
        Welcome to ExamPrep
      </h2>
      <p style={{ fontSize: 13, color: C.dim, marginBottom: 24, lineHeight: 1.6 }}>
        Let's get you set up in 2 minutes. No tests, no waiting — just pick your subjects and start practising.
      </p>

      <Label>What's your first name?</Label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && proceed()}
        placeholder="e.g. Amara"
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 12,
          background: C.surface, border: `1.5px solid ${name ? C.borderOn : C.border}`,
          color: C.text, fontSize: 14, fontWeight: 600, outline: 'none',
          boxSizing: 'border-box', marginBottom: 20,
          transition: 'border-color .15s', fontFamily: 'inherit',
        }}
        autoFocus
      />

      <Label>Which exam are you preparing for?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { id: 'WAEC', label: 'WAEC', sub: 'SSCE / GCE' },
          { id: 'JAMB', label: 'JAMB', sub: 'UTME entrance' },
          { id: 'BOTH', label: 'Both',  sub: 'WAEC + JAMB' },
        ].map(({ id, label, sub }) => (
          <button
            key={id}
            onClick={() => setExam(id)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 13, cursor: 'pointer',
              background: examType === id ? C.accentBg : C.surface,
              border: `2px solid ${examType === id ? C.borderOn : C.border}`,
              textAlign: 'center', transition: 'all .15s',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{label}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}</div>
          </button>
        ))}
      </div>

      {error && <p style={{ fontSize: 12, color: C.err, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
      <Btn3D onClick={proceed}>Choose subjects →</Btn3D>
    </div>
  )
}

// ── Step 2: Subject selection ─────────────────────────────────────────────────
function StepSubjects({ examType, selected, setSelected, onNext, onBack }) {
  const visible = examType === 'JAMB'
    ? ALL_SUBJECTS.filter(s => s.exams.includes('JAMB'))
    : examType === 'WAEC'
    ? ALL_SUBJECTS.filter(s => s.exams.includes('WAEC'))
    : ALL_SUBJECTS

  const compulsory = examType === 'JAMB' ? JAMB_COMPULSORY : []

  function toggle(name) {
    if (compulsory.includes(name)) return
    setSelected(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  const canProceed = selected.length > 0

  return (
    <div>
      <StepDots step={1} />
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-.025em', marginBottom: 6 }}>
        Pick your subjects
      </h2>
      <p style={{ fontSize: 13, color: C.dim, marginBottom: 20, lineHeight: 1.6 }}>
        {examType === 'JAMB'
          ? 'Use of English and Mathematics are required for JAMB. Add your other subjects.'
          : 'Select every subject you\'re sitting. You can change this later.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {visible.map(({ name }) => {
          const on   = selected.includes(name)
          const lock = compulsory.includes(name)
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              style={{
                padding: '11px 12px', borderRadius: 12, cursor: lock ? 'default' : 'pointer',
                background: on ? C.accentBg : C.surface,
                border: `2px solid ${on ? C.borderOn : C.border}`,
                textAlign: 'left', transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{name}</span>
              {lock && <span style={{ fontSize: 9, color: C.accent, fontWeight: 800 }}>REQ</span>}
              {!lock && on && <span style={{ fontSize: 14, color: C.accent }}>✓</span>}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn3D onClick={onBack} variant="ghost" style={{ flex: '0 0 80px' }}>← Back</Btn3D>
        <div style={{ flex: 1 }}>
          <Btn3D onClick={onNext} disabled={!canProceed}>
            Choose topics ({selected.length} subject{selected.length !== 1 ? 's' : ''}) →
          </Btn3D>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Topic selection per subject ───────────────────────────────────────
// Topics are fetched from the public subjects API (no auth required here,
// we use a lightweight public endpoint or fall back to a generic list).
// If topics can't be fetched, we skip gracefully and go straight to step 4.

const FALLBACK_TOPICS = {
  'Mathematics':        ['Number & Numeration','Algebra','Geometry','Statistics','Trigonometry'],
  'Use of English':     ['Comprehension','Lexis & Structure','Oral English','Summary'],
  'English Language':   ['Comprehension','Summary','Letter Writing','Essay Writing','Lexis'],
  'Biology':            ['Cell Biology','Genetics','Ecology','Plant Biology','Human Biology'],
  'Chemistry':          ['Atomic Structure','Bonding','Reactions','Organic Chemistry','Electrolysis'],
  'Physics':            ['Mechanics','Waves','Electricity','Magnetism','Modern Physics'],
  'Economics':          ['Demand & Supply','National Income','Money & Banking','Int\'l Trade'],
  'Government':         ['Constitutional Law','Political Parties','Legislature','Executive'],
  'Geography':          ['Map Reading','Climate','Population','Resources','Geomorphology'],
  'Commerce':           ['Trade','Transport','Insurance','Banking','Warehousing'],
  'Literature in English': ['Poetry','Prose','Drama','Oral Literature'],
  'Agricultural Science':  ['Crop Production','Animal Science','Soil Science','Farm Management'],
  'Further Mathematics':   ['Algebra','Calculus','Mechanics','Statistics','Complex Numbers'],
}

function StepTopics({ selected, topicSelections, setTopicSelections, onNext, onBack }) {
  const [activeSubject, setActiveSubject] = useState(selected[0] ?? null)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [topicsMap, setTopicsMap]         = useState({})
  const fetchedRef = useRef(new Set())

  useEffect(() => {
    if (!activeSubject) return
    if (fetchedRef.current.has(activeSubject)) return
    fetchedRef.current.add(activeSubject)

    // Try to fetch topics from the DB via a public-ish API.
    // Falls back to FALLBACK_TOPICS silently.
    setLoadingTopics(true)
    fetch(`/api/topics/public?subject=${encodeURIComponent(activeSubject)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.length) {
          setTopicsMap(prev => ({ ...prev, [activeSubject]: data.map(t => t.name) }))
        } else {
          setTopicsMap(prev => ({ ...prev, [activeSubject]: FALLBACK_TOPICS[activeSubject] ?? [] }))
        }
      })
      .catch(() => {
        setTopicsMap(prev => ({ ...prev, [activeSubject]: FALLBACK_TOPICS[activeSubject] ?? [] }))
      })
      .finally(() => setLoadingTopics(false))
  }, [activeSubject])

  // Seed fallback topics immediately for initial subject
  useEffect(() => {
    selected.forEach(sub => {
      if (!topicsMap[sub]) {
        setTopicsMap(prev => ({ ...prev, [sub]: FALLBACK_TOPICS[sub] ?? [] }))
      }
    })
  }, [selected])

  function toggleTopic(subject, topic) {
    setTopicSelections(prev => {
      const current = prev[subject] ?? []
      const next = current.includes(topic)
        ? current.filter(t => t !== topic)
        : [...current, topic]
      return { ...prev, [subject]: next }
    })
  }

  function selectAll(subject) {
    const topics = topicsMap[subject] ?? []
    setTopicSelections(prev => ({ ...prev, [subject]: [...topics] }))
  }

  function clearAll(subject) {
    setTopicSelections(prev => ({ ...prev, [subject]: [] }))
  }

  const currentTopics        = topicsMap[activeSubject] ?? FALLBACK_TOPICS[activeSubject] ?? []
  const currentSelected      = topicSelections[activeSubject] ?? []
  const allSelected          = currentTopics.length > 0 && currentSelected.length === currentTopics.length
  const totalTopicsSelected  = Object.values(topicSelections).flat().length

  return (
    <div>
      <StepDots step={2} />
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-.025em', marginBottom: 6 }}>
        Pick your topics
      </h2>
      <p style={{ fontSize: 13, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>
        Choose which topics you want to cover. Not sure? Select all — you can always change later.
      </p>

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16,
        scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {selected.map(sub => {
          const count = (topicSelections[sub] ?? []).length
          const active = sub === activeSubject
          return (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              style={{
                flexShrink: 0, padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                background: active ? C.accentBg : C.surface,
                border: `1.5px solid ${active ? C.borderOn : C.border}`,
                color: active ? C.accent : C.dim,
                fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >
              {sub.length > 10 ? sub.split(' ')[0] : sub}
              {count > 0 && (
                <span style={{ marginLeft: 5, fontSize: 9, background: C.accentBg,
                  color: C.accent, borderRadius: 999, padding: '1px 5px', fontWeight: 800 }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Select all / clear row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>
          {currentSelected.length}/{currentTopics.length} selected
        </span>
        <button
          onClick={() => allSelected ? clearAll(activeSubject) : selectAll(activeSubject)}
          style={{ fontSize: 11, color: C.accent, fontWeight: 700, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {/* Topic chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20,
        maxHeight: 260, overflowY: 'auto' }}>
        {loadingTopics ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 38, borderRadius: 10, background: C.surface,
              animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.5 }} />
          ))
        ) : currentTopics.map(topic => {
          const on = currentSelected.includes(topic)
          return (
            <button
              key={topic}
              onClick={() => toggleTopic(activeSubject, topic)}
              style={{
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: on ? C.accentBg : C.surface,
                border: `1.5px solid ${on ? C.borderOn : C.border}`,
                color: C.text, fontSize: 13, fontWeight: 600,
                textAlign: 'left', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', transition: 'all .15s',
              }}
            >
              <span>{topic}</span>
              {on && <span style={{ color: C.accent, fontSize: 14 }}>✓</span>}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn3D onClick={onBack} variant="ghost" style={{ flex: '0 0 80px' }}>← Back</Btn3D>
        <div style={{ flex: 1 }}>
          <Btn3D onClick={onNext}>
            {totalTopicsSelected > 0
              ? `Continue (${totalTopicsSelected} topic${totalTopicsSelected !== 1 ? 's' : ''}) →`
              : 'Continue anyway →'}
          </Btn3D>
        </div>
      </div>
    </div>
  )
}

// ── Step 4: Create account or skip ────────────────────────────────────────────
function StepAccount({ name, examType, subjects, topicSelections, onSkip }) {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [done,     setDone]     = useState(false)

  async function handleSignup() {
    if (!email || !password) { setError('Enter your email and a password'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const setup = { name, examType, subjects, topicSelections }

    // Encode setup in redirect URL for the auth callback to pick up
    const params = new URLSearchParams({
      exam_type: examType,
      subjects:  subjects.join(','),
      full_name: name,
      next:      '/student/home',
    })

    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?${params}`,
      },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Save setup so dashboard can use it before email is confirmed
    sessionStorage.setItem('onboarding_setup', JSON.stringify(setup))
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <StepDots step={3} />
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>Check your email</h2>
        <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 24 }}>
          We sent a confirmation link to <strong style={{ color: C.text }}>{email}</strong>.
          Click it to activate your account. Your subjects and topics are already saved.
        </p>
        <Btn3D onClick={() => { router.push('/student/home') }}>
          Go to dashboard anyway →
        </Btn3D>
      </div>
    )
  }

  return (
    <div>
      <StepDots step={3} />
      <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-.025em', marginBottom: 6 }}>
        Save your progress
      </h2>
      <p style={{ fontSize: 13, color: C.dim, marginBottom: 22, lineHeight: 1.6 }}>
        Create a free account to save your scores and streak across sessions. Or skip and start practising now — you can always sign up later.
      </p>

      {/* Summary of what's set up */}
      <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 20,
        border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, fontWeight: 700 }}>Your setup</div>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{name} · {examType}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
          {subjects.join(', ')}
        </div>
        <div style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>
          {Object.values(topicSelections).flat().length} topics selected
        </div>
      </div>

      <Label>Email address</Label>
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
          background: C.surface, border: `1.5px solid ${email ? C.borderOn : C.border}`,
          color: C.text, fontSize: 14, fontWeight: 600, outline: 'none',
          marginBottom: 10, fontFamily: 'inherit',
        }}
      />

      <Label>Password</Label>
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="6+ characters"
        onKeyDown={e => e.key === 'Enter' && handleSignup()}
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
          background: C.surface, border: `1.5px solid ${password ? C.borderOn : C.border}`,
          color: C.text, fontSize: 14, fontWeight: 600, outline: 'none',
          marginBottom: 16, fontFamily: 'inherit',
        }}
      />

      {error && <p style={{ fontSize: 12, color: C.err, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

      <Btn3D onClick={handleSignup} disabled={loading}>
        {loading ? 'Creating account…' : 'Create free account →'}
      </Btn3D>

      <div style={{ position: 'relative', textAlign: 'center', margin: '16px 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: C.border }} />
        <span style={{ position: 'relative', background: C.bg, padding: '0 12px',
          fontSize: 11, color: C.faint, fontWeight: 700 }}>OR</span>
      </div>

      <Btn3D onClick={onSkip} variant="ghost">
        Skip for now — go to dashboard
      </Btn3D>

      <p style={{ textAlign: 'center', fontSize: 11, color: C.dim, marginTop: 16 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: C.accent, fontWeight: 700 }}>Sign in</Link>
      </p>
    </div>
  )
}

// ── Ambient background SVG ────────────────────────────────────────────────────
function Ambient() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -120, right: -80, width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,122,224,0.07) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -60, width: 300, height: 300,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(18,100,229,0.06) 0%, transparent 70%)',
      }} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter()

  const [step,             setStep]             = useState(0)
  const [name,             setName]             = useState('')
  const [examType,         setExam]             = useState('WAEC')
  const [subjects,         setSubjects]         = useState([])
  const [topicSelections,  setTopicSelections]  = useState({})

  // Redirect logged-in users immediately
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/student/home')
    })

    // Pre-set JAMB compulsory subjects
    if (examType === 'JAMB') {
      setSubjects(prev => {
        const merged = [...new Set([...JAMB_COMPULSORY, ...prev])]
        return merged
      })
    }
  }, [])

  // When exam type changes, ensure compulsory subjects stay in
  useEffect(() => {
    if (examType === 'JAMB') {
      setSubjects(prev => [...new Set([...JAMB_COMPULSORY, ...prev.filter(s =>
        ALL_SUBJECTS.find(x => x.name === s && x.exams.includes('JAMB'))
      )])])
    }
  }, [examType])

  function handleSkip() {
    const setup = { name: name || 'Student', examType, subjects, topicSelections }
    sessionStorage.setItem('onboarding_setup', JSON.stringify(setup))
    router.push('/student/home')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 0 40px',
      position: 'relative',
    }}>
      <Ambient />

      {/* Logo bar */}
      <div style={{ width: '100%', maxWidth: 440, padding: '24px 24px 0', position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: C.navy,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#fff',
          boxShadow: `0 4px 0 ${C.navyDeep}` }}>E</div>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.dim,
          textTransform: 'uppercase', letterSpacing: '0.12em' }}>ExamPrep</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440, padding: '32px 24px',
        position: 'relative', zIndex: 1,
      }}>
        {step === 0 && (
          <StepExam
            name={name} setName={setName}
            examType={examType} setExam={setExam}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepSubjects
            examType={examType}
            selected={subjects} setSelected={setSubjects}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepTopics
            selected={subjects}
            topicSelections={topicSelections} setTopicSelections={setTopicSelections}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepAccount
            name={name} examType={examType}
            subjects={subjects} topicSelections={topicSelections}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  )
}