'use client'
// src/app/onboarding/page.js
// 4-step onboarding: Username → Exam → Survey → Account → Welcome
//
// CHANGES from previous version:
//  - ZaraOwl SVG replaced with /images/zara_studybuddy.png everywhere
//  - Google sign-in removed (not live yet)
//  - Subjects step removed (didn't reflect in app)
//  - New survey step: university course + study time — personal, fast, no wrong answer
//  - Answers stored in localStorage ep_guest for future personalisation use

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'

// ─── MASCOT ──────────────────────────────────────────────────────────────────
// Uses the real ExamPrep mascot image. Falls back gracefully if image missing.
function Zara({ size = 90, style: extraStyle = {} }) {
  const [err, setErr] = useState(false)
  if (err) {
    // Fallback: simple illustrated circle with initials
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#1264E5,#062A78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 900, color: '#FFB800',
        flexShrink: 0, ...extraStyle,
      }}>
        Z
      </div>
    )
  }
  return (
    <img
      src="/images/zara_studybuddy.png"
      alt="Zara, your ExamPrep study buddy"
      width={size}
      height={size}
      onError={() => setErr(true)}
      style={{ objectFit: 'contain', flexShrink: 0, ...extraStyle }}
    />
  )
}

// ─── QUOTES ──────────────────────────────────────────────────────────────────
const ZARA_QUOTES = [
  "Every question you answer today is a mark you won't leave on the table.",
  "Small wins every day. That's how champions are made.",
  "You're building something real. One question at a time.",
  "The student who shows up consistently always wins.",
]

// ─── STEP DOTS ───────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6,
          width: i === current ? 22 : 6,
          borderRadius: 3,
          background: i <= current ? '#1264E5' : 'var(--border-strong)',
          transition: 'all .25s ease',
        }}/>
      ))}
    </div>
  )
}

// ─── 3D CTA BUTTON ───────────────────────────────────────────────────────────
function Cta({ onClick, disabled, loading, children }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: '100%', padding: '16px 0', borderRadius: 16,
        background: disabled ? 'var(--border-strong)' : '#1264E5',
        color: '#fff', fontSize: 15, fontWeight: 800,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '-.01em',
        transform: pressed ? 'translateY(4px)' : 'translateY(0)',
        boxShadow: pressed || disabled
          ? '0 2px 0 #0a3fa0'
          : '0 6px 0 #0a3fa0, 0 10px 24px rgba(18,100,229,.25)',
        transition: 'transform .1s, box-shadow .1s, background .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {loading ? (
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,.3)',
          borderTopColor: '#fff',
          animation: 'ob-spin .7s linear infinite',
        }}/>
      ) : children}
    </button>
  )
}

// ─── BACK LINK ────────────────────────────────────────────────────────────────
function BackLink({ onClick }) {
  return (
    <button onClick={onClick} className="text-tertiary" style={{
      background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', padding: '10px 0', textAlign: 'center', width: '100%',
    }}>
      ← Back
    </button>
  )
}

// ─── DARK MODE TOGGLE ────────────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 16, flexShrink: 0,
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — USERNAME
// ─────────────────────────────────────────────────────────────────────────────
function StepUsername({ onNext }) {
  const [value,    setValue]    = useState('')
  const [error,    setError]    = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const valid = clean.length >= 3

  async function handleNext() {
    if (!valid) { setError('At least 3 characters — letters, numbers, underscores only.'); return }
    setChecking(true); setError('')
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles').select('username').eq('username', clean).maybeSingle()
      if (data) { setError('That username is taken — try another one.'); setChecking(false); return }
    } catch { /* offline — allow through */ }
    setChecking(false)
    onNext({ username: clean })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Mascot + greeting */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(18,100,229,.15), transparent 70%)',
            filter: 'blur(10px)',
          }}/>
          <Zara size={100}/>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 className="text-primary" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 6 }}>
            Hey! I'm Zara 👋
          </h1>
          <p className="text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
            I'll be your study buddy.<br/>What should I call you?
          </p>
        </div>
      </div>

      {/* Username input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <label className="text-tertiary" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Choose a username
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleNext()}
            maxLength={20}
            placeholder="e.g. chem_king"
            style={{
              width: '100%', padding: '14px 48px 14px 16px',
              borderRadius: 14, fontSize: 15, fontWeight: 600,
              border: `1.5px solid ${error ? 'var(--danger)' : valid && value ? '#22c55e' : 'var(--border-strong)'}`,
              background: 'var(--bg-card)', color: 'var(--text-prim)',
              outline: 'none', transition: 'border-color .15s',
            }}
          />
          {valid && !error && (
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: '50%', background: '#22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>
            </div>
          )}
        </div>
        {error
          ? <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          : <p className="text-tertiary" style={{ fontSize: 11 }}>Letters, numbers and underscores · Max 20 chars</p>
        }
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Cta onClick={handleNext} disabled={!valid} loading={checking}>
          Continue →
        </Cta>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — EXAM TYPE
// ─────────────────────────────────────────────────────────────────────────────
function StepExamType({ onNext, onBack }) {
  const [selected, setSelected] = useState([])

  const exams = [
    { id: 'WAEC', label: 'WAEC', sub: 'Senior School Certificate · May–June', icon: '📝' },
    { id: 'JAMB', label: 'JAMB (UTME)', sub: 'Joint Admissions · January', icon: '🎓' },
  ]

  function toggle(id) {
    setSelected(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 8 }}>
          Which exams are<br/>you sitting?
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Select one or both. Past questions and content are matched to each exam.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {exams.map(({ id, label, sub, icon }) => {
          const on = selected.includes(id)
          return (
            <button key={id} onClick={() => toggle(id)} style={{
              padding: '16px', borderRadius: 16,
              border: `1.5px solid ${on ? '#1264E5' : 'var(--border-strong)'}`,
              background: on ? 'rgba(18,100,229,.06)' : 'var(--bg-card)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all .15s', textAlign: 'left',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, fontSize: 22,
                background: on ? 'rgba(18,100,229,.1)' : 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div className="text-primary" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{label}</div>
                <div className="text-secondary" style={{ fontSize: 11 }}>{sub}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${on ? '#1264E5' : 'var(--border-strong)'}`,
                background: on ? '#1264E5' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Zara tip */}
      <div style={{
        padding: '12px 14px', borderRadius: 14,
        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <Zara size={32}/>
        <p className="text-secondary" style={{ fontSize: 12, lineHeight: 1.55, flex: 1 }}>
          Most SS3 students sit both. Shared topics appear once — exam-specific content is clearly labelled.
        </p>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Cta onClick={() => onNext({ exams: selected })} disabled={selected.length === 0}>
          Continue →
        </Cta>
        <BackLink onClick={onBack}/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — SURVEY (replaces subjects)
// Two warm questions: university course aspiration + preferred study time
// Answers saved in ep_guest.survey — ready for future personalisation
// ─────────────────────────────────────────────────────────────────────────────
const POPULAR_COURSES = [
  'Medicine & Surgery', 'Engineering', 'Law', 'Pharmacy',
  'Computer Science', 'Architecture', 'Accounting', 'Nursing',
  'Mass Communication', 'Economics', 'Business Admin', 'Education',
]

const STUDY_TIMES = [
  { id: 'morning',    label: 'Morning',    sub: '5am – 10am',  icon: '🌅' },
  { id: 'afternoon',  label: 'Afternoon',  sub: '12pm – 4pm',  icon: '☀️' },
  { id: 'evening',    label: 'Evening',    sub: '6pm – 9pm',   icon: '🌆' },
  { id: 'night',      label: 'Late night', sub: '9pm – 1am',   icon: '🌙' },
]

function StepSurvey({ onNext, onBack, data }) {
  const [course,      setCourse]      = useState('')
  const [customCourse,setCustomCourse]= useState('')
  const [studyTime,   setStudyTime]   = useState('')
  const [showCustom,  setShowCustom]  = useState(false)

  const username = data.username || 'you'

  function handleCourseSelect(c) {
    if (c === '__other__') { setShowCustom(true); setCourse(''); return }
    setShowCustom(false); setCustomCourse(''); setCourse(c)
  }

  const finalCourse = showCustom ? customCourse.trim() : course
  const canContinue = studyTime !== ''   // course is optional — no wrong answer

  function handleNext() {
    onNext({
      survey: {
        aspired_course: finalCourse || null,
        study_time:     studyTime,
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 8 }}>
          Let's personalise<br/>your experience
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Two quick questions. No wrong answers.
        </p>
      </div>

      {/* Q1 — Course aspiration */}
      <div style={{ marginBottom: 22 }}>
        <p className="text-primary" style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
          What course do you want to study in university? <span className="text-tertiary" style={{ fontWeight: 600 }}>(optional)</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {POPULAR_COURSES.map(c => {
            const on = course === c && !showCustom
            return (
              <button key={c} onClick={() => handleCourseSelect(c)} style={{
                padding: '8px 14px', borderRadius: 999,
                border: `1.5px solid ${on ? '#1264E5' : 'var(--border-strong)'}`,
                background: on ? 'rgba(18,100,229,.08)' : 'var(--bg-card)',
                color: on ? '#1264E5' : 'var(--text-sec)',
                fontSize: 12, fontWeight: on ? 800 : 600,
                cursor: 'pointer', transition: 'all .12s',
              }}>
                {on && '✓ '}{c}
              </button>
            )
          })}
          <button onClick={() => handleCourseSelect('__other__')} style={{
            padding: '8px 14px', borderRadius: 999,
            border: `1.5px solid ${showCustom ? '#1264E5' : 'var(--border-strong)'}`,
            background: showCustom ? 'rgba(18,100,229,.08)' : 'var(--bg-card)',
            color: showCustom ? '#1264E5' : 'var(--text-tert)',
            fontSize: 12, fontWeight: showCustom ? 800 : 600,
            cursor: 'pointer', transition: 'all .12s',
          }}>
            Other…
          </button>
        </div>
        {showCustom && (
          <input
            autoFocus
            value={customCourse}
            onChange={e => setCustomCourse(e.target.value)}
            placeholder="Type your course…"
            style={{
              marginTop: 10, width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1.5px solid #1264E5', background: 'var(--bg-card)',
              fontSize: 14, color: 'var(--text-prim)', outline: 'none',
            }}
          />
        )}
      </div>

      {/* Q2 — Study time */}
      <div style={{ marginBottom: 8 }}>
        <p className="text-primary" style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
          When do you usually study best?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {STUDY_TIMES.map(({ id, label, sub, icon }) => {
            const on = studyTime === id
            return (
              <button key={id} onClick={() => setStudyTime(id)} style={{
                padding: '13px 12px', borderRadius: 14, textAlign: 'left',
                border: `1.5px solid ${on ? '#1264E5' : 'var(--border-strong)'}`,
                background: on ? 'rgba(18,100,229,.06)' : 'var(--bg-card)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all .12s',
              }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div className="text-primary" style={{ fontSize: 13, fontWeight: on ? 800 : 700 }}>{label}</div>
                  <div className="text-secondary" style={{ fontSize: 10 }}>{sub}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Cta onClick={handleNext} disabled={!canContinue}>
          Continue →
        </Cta>
        <BackLink onClick={onBack}/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — ACCOUNT CREATION (Google removed)
// ─────────────────────────────────────────────────────────────────────────────
function StepAccount({ data, onNext, onBack }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function buildGuestPayload() {
    return {
      username:   data.username,
      full_name:  data.username,
      exams:      data.exams ?? [],
      exam_type:  data.exams?.[0] ?? 'WAEC',
      exam_types: data.exams ?? [],
      subjects:   [],
      subjects_waec: [],
      subjects_jamb: [],
      survey:     data.survey ?? {},
      onboarded:  true,
    }
  }

  async function handleEmailSignup() {
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password with at least 6 characters.')
      return
    }
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { username: data.username, full_name: data.username } },
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      localStorage.setItem('ep_guest', JSON.stringify(buildGuestPayload()))
      onNext({ accountCreated: true })
    } catch (e) { setError(e.message); setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 className="text-primary" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 8 }}>
          Save your progress
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.65 }}>
          Create a free account so your stats and progress are saved. You can also skip and do this later.
        </p>
      </div>

      {/* Benefit pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
        {[
          { icon: '🏆', text: 'Join the leaderboard' },
          { icon: '🏫', text: 'Connect your school'  },
          { icon: '📊', text: 'Track your progress'  },
          { icon: '🔄', text: 'Sync across devices'  },
        ].map(b => (
          <div key={b.text} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px',
            fontSize: 12, fontWeight: 600, color: 'var(--text-sec)',
          }}>
            <span style={{ fontSize: 15 }}>{b.icon}</span>{b.text}
          </div>
        ))}
      </div>

      {/* Email + password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12,
            border: '1.5px solid var(--border-strong)', background: 'var(--bg-card)',
            fontSize: 14, color: 'var(--text-prim)', outline: 'none',
          }}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 12,
            border: '1.5px solid var(--border-strong)', background: 'var(--bg-card)',
            fontSize: 14, color: 'var(--text-prim)', outline: 'none',
          }}
        />
      </div>

      {error && <p style={{ fontSize: 12, color: '#ef5d4e', marginBottom: 8, fontWeight: 600 }}>{error}</p>}

      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Cta onClick={handleEmailSignup} loading={loading}>
          Create account &amp; continue
        </Cta>

        <button
          onClick={() => {
            localStorage.setItem('ep_guest', JSON.stringify(buildGuestPayload()))
            onNext({ accountCreated: false })
          }}
          disabled={loading}
          style={{
            background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
            color: 'var(--text-tert)', cursor: 'pointer', padding: '14px 0 4px',
            textAlign: 'center', width: '100%',
          }}
        >
          Skip for now — I'll create an account later
        </button>

        <BackLink onClick={onBack}/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — WELCOME
// ─────────────────────────────────────────────────────────────────────────────
function StepWelcome({ data, onFinish }) {
  const [loading, setLoading] = useState(false)
  const { username, exams = [], survey = {} } = data

  const quoteIndex = Math.floor(Date.now() / 86400000) % ZARA_QUOTES.length
  const quote = ZARA_QUOTES[quoteIndex]

  const studyTimeLabel = STUDY_TIMES.find(t => t.id === survey.study_time)?.label ?? null

  const previewItems = [
    { icon: '📐', text: `Practice past questions`, xp: 20 },
    { icon: '🃏', text: 'Study with flashcards', xp: 10 },
    { icon: '⚡', text: 'Complete a Speed Round', xp: 15 },
  ]

  async function handleStart() {
    setLoading(true)
    // Ensure local ID exists
    if (!localStorage.getItem('ep_local_id')) {
      localStorage.setItem('ep_local_id', 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36))
    }
    // ep_guest should already be set in StepAccount — refresh to be safe
    const existing = (() => { try { return JSON.parse(localStorage.getItem('ep_guest') || '{}') } catch { return {} } })()
    localStorage.setItem('ep_guest', JSON.stringify({
      ...existing,
      username,
      full_name: username,
      exams,
      exam_type:  exams[0] ?? 'WAEC',
      exam_types: exams,
      survey,
      onboarded: true,
      createdAt: Date.now(),
    }))
    try { localStorage.setItem('ep_student_name', username) } catch {}

    // Try Supabase persist
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // survey_data stores aspired_course + study_time from onboarding survey.
        // Add column once in Supabase: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS survey_data jsonb;
        await supabase.from('profiles').upsert({
          id:          session.user.id,
          username,
          full_name:   username,
          exam_types:  exams,
          subjects:    [],
          onboarded:   true,
          survey_data: survey ?? {},
        })
      }
    } catch { /* offline — localStorage already saved */ }

    onFinish()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
      {/* Big mascot with glow */}
      <div style={{ position: 'relative', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18,100,229,.18), transparent 70%)',
          filter: 'blur(14px)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }}/>
        <Zara size={120}/>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 22, width: '100%' }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 8 }}>
          You're all set, {username}! 🎉
        </h2>
        {studyTimeLabel && (
          <p className="text-secondary" style={{ fontSize: 12, marginBottom: 4 }}>
            We'll remind you to study in the <strong>{studyTimeLabel.toLowerCase()}</strong> 📖
          </p>
        )}
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.65, fontStyle: 'italic' }}>
          "{quote}"
        </p>
      </div>

      {/* Quick-start preview */}
      <div style={{
        width: '100%', borderRadius: 16,
        border: '1px solid var(--border)', background: 'var(--bg-card)',
        padding: '14px', marginBottom: 16,
      }}>
        <p className="text-tertiary" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
          Start here
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {previewItems.map((q, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'var(--bg-inset)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>{q.icon}</div>
              <div className="text-primary" style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{q.text}</div>
              <div style={{
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.2)',
                fontSize: 10, fontWeight: 800, color: '#d97706',
              }}>
                ⚡ +{q.xp} XP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam pills */}
      {exams.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {exams.map(e => (
            <div key={e} style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(18,100,229,.08)', border: '1px solid rgba(18,100,229,.2)',
              fontSize: 11, fontWeight: 700, color: '#1264E5',
            }}>📋 {e}</div>
          ))}
        </div>
      )}

      <div style={{ width: '100%', marginTop: 'auto' }}>
        <Cta onClick={handleStart} loading={loading}>
          🚀 Start practising
        </Cta>
        <p className="text-tertiary" style={{ textAlign: 'center', fontSize: 11, marginTop: 12, cursor: 'pointer' }}
          onClick={handleStart}>
          I'll create an account later
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ONBOARDING PAGE
// Steps: 0=Username  1=Exam  2=Survey  3=Account  4=Welcome
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router             = useRouter()
  const { dark, toggle }   = useTheme()
  const [step, setStep]    = useState(0)
  const [formData, setFD]  = useState({})
  const [checking, setChk] = useState(true)

  // Skip if already onboarded
  useEffect(() => {
    try {
      const guest = JSON.parse(localStorage.getItem('ep_guest') || '{}')
      if (guest.onboarded) { router.replace('/student/home'); return }
    } catch {}
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        createClient().from('profiles').select('onboarded').eq('id', session.user.id).maybeSingle()
          .then(({ data }) => {
            if (data?.onboarded) { router.replace('/student/home'); return }
            setChk(false)
          })
      } else { setChk(false) }
    })
  }, [router])

  function advance(stepData) {
    const next = { ...formData, ...stepData }
    setFD(next)
    localStorage.setItem('ep_onboarding_progress', JSON.stringify({ step: step + 1, data: next }))
    setStep(s => s + 1)
  }

  if (checking) return (
    <div className="bg-base" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border-strong)', borderTopColor: '#1264E5', animation: 'ob-spin .7s linear infinite' }}/>
      <style>{`@keyframes ob-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const TOTAL_STEPS = 5

  return (
    <>
      <style>{`
        @keyframes ob-spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        input::placeholder { color: var(--text-tert); }
        input:focus { outline: none; border-color: #1264E5 !important; box-shadow: 0 0 0 3px rgba(18,100,229,.12); }
        button { font-family: inherit; }
      `}</style>

      <div className="bg-base" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>

          {/* TOP BAR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#062A78', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#FFB800' }}>E</div>
              <span className="text-secondary" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>ExamPrep</span>
            </div>
            <ThemeToggle/>
          </div>

          {/* STEP DOTS */}
          <div style={{ padding: '12px 0 20px' }}>
            <StepDots current={step} total={TOTAL_STEPS}/>
          </div>

          {/* STEP CONTENT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 32 }}>
            {step === 0 && <StepUsername  onNext={advance}/>}
            {step === 1 && <StepExamType  onNext={advance} onBack={() => setStep(0)}/>}
            {step === 2 && <StepSurvey    onNext={advance} onBack={() => setStep(1)} data={formData}/>}
            {step === 3 && <StepAccount   onNext={advance} onBack={() => setStep(2)} data={formData}/>}
            {step === 4 && <StepWelcome   onFinish={() => router.push('/student/home')} data={formData}/>}
          </div>

        </div>
      </div>
    </>
  )
}