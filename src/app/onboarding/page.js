'use client'
// src/app/onboarding/page.js
// 4-step onboarding: Username → Exam type → Subjects → Mascot intro
// Offline-first: all steps persist to localStorage as they complete.
// Supabase write happens only on final step, falls back to guest session.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'

// ─── SUBJECTS ────────────────────────────────────────────────────────────────
const ALL_SUBJECTS = [
  { name: 'Mathematics',           exams: ['WAEC','JAMB'] },
  { name: 'Biology',               exams: ['WAEC','JAMB'] },
  { name: 'Chemistry',             exams: ['WAEC','JAMB'] },
  { name: 'Physics',               exams: ['WAEC','JAMB'] },
  { name: 'Economics',             exams: ['WAEC','JAMB'] },
  { name: 'Government',            exams: ['WAEC','JAMB'] },
  { name: 'Geography',             exams: ['WAEC','JAMB'] },
  { name: 'Commerce',              exams: ['WAEC','JAMB'] },
  { name: 'Further Mathematics',   exams: ['WAEC','JAMB'] },
  { name: 'English Language',      exams: ['WAEC']        },
  { name: 'Literature in English', exams: ['WAEC']        },
  { name: 'Agricultural Science',  exams: ['WAEC']        },
  { name: 'Accounting',            exams: ['WAEC','JAMB'] },
  { name: 'Christian Religious Studies', exams: ['WAEC','JAMB'] },
]

const ZARA_QUOTES = [
  "Every question you answer today is a mark you won't leave on the table.",
  "Small wins every day. That's how champions are made.",
  "You're building something real. One question at a time.",
  "The student who shows up consistently always wins.",
]

// ─── ZARA SVG ────────────────────────────────────────────────────────────────
function ZaraOwl({ size = 80, expression = 'happy', className = '' }) {
  const eyeColor = expression === 'excited' ? '#FFB800' : '#18B7F2'
  return (
    <svg width={size} height={size} viewBox="0 0 80 90" aria-label="Zara your study buddy" className={className}>
      {/* Body */}
      <ellipse cx="40" cy="62" rx="26" ry="26" fill="#1a1f3c"/>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="24" ry="22" fill="#1a1f3c"/>
      {/* Tummy */}
      <ellipse cx="40" cy="66" rx="16" ry="18" fill="#f5c57a"/>
      {/* Wings */}
      <ellipse cx="15" cy="64" rx="10" ry="16" fill="#141830" transform="rotate(-10 15 64)"/>
      <ellipse cx="65" cy="64" rx="10" ry="16" fill="#141830" transform="rotate(10 65 64)"/>
      {/* Eye whites */}
      <ellipse cx="30" cy="34" rx="9" ry="10" fill="#fff"/>
      <ellipse cx="50" cy="34" rx="9" ry="10" fill="#fff"/>
      {/* Irises */}
      <circle cx="30" cy="34" r="6.5" fill={eyeColor}/>
      <circle cx="50" cy="34" r="6.5" fill={eyeColor}/>
      {/* Pupils */}
      <circle cx="30" cy="34" r="3.5" fill="#1a1f3c"/>
      <circle cx="50" cy="34" r="3.5" fill="#1a1f3c"/>
      {/* Shine */}
      <circle cx="31.5" cy="32.5" r="1.2" fill="#fff"/>
      <circle cx="51.5" cy="32.5" r="1.2" fill="#fff"/>
      {/* Beak */}
      <polygon points="40,38 36,44 44,44" fill="#FFB800"/>
      {/* Ear tufts */}
      <polygon points="20,18 14,6 26,12" fill="#1a1f3c"/>
      <polygon points="60,18 66,6 54,12" fill="#1a1f3c"/>
      {/* Grad cap */}
      <rect x="22" y="16" width="36" height="4" rx="1.5" fill="#FFB800"/>
      <polygon points="40,10 24,18 40,20 56,18" fill="#FFB800"/>
      <line x1="56" y1="17" x2="59" y2="25" stroke="#FFB800" strokeWidth="1.5"/>
      <circle cx="59" cy="26" r="2.5" fill="#FFB800"/>
      {/* Feet */}
      {[33,47].map(x => (
        <g key={x}>
          <line x1={x} y1="86" x2={x-4} y2="90" stroke="#FFB800" strokeWidth="2" strokeLinecap="round"/>
          <line x1={x} y1="86" x2={x} y2="90" stroke="#FFB800" strokeWidth="2" strokeLinecap="round"/>
          <line x1={x} y1="86" x2={x+4} y2="90" stroke="#FFB800" strokeWidth="2" strokeLinecap="round"/>
        </g>
      ))}
      {/* Stars */}
      <circle cx="6" cy="24" r="1.5" fill="#FFB800" opacity=".7"/>
      <circle cx="72" cy="18" r="1.2" fill="#FFB800" opacity=".5"/>
      <circle cx="74" cy="46" r="1" fill="#fff" opacity=".4"/>
    </svg>
  )
}

// ─── STEP DOTS ────────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6,
          width: i === current ? 20 : 6,
          borderRadius: 3,
          background: i === current ? '#1264E5' : 'var(--border-strong)',
          transition: 'all .25s ease',
        }}/>
      ))}
    </div>
  )
}

// ─── 3D CTA BUTTON ──────────────────────────────────────────────────────────
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
        boxShadow: pressed || disabled ? '0 2px 0 #0a3fa0' : '0 6px 0 #0a3fa0, 0 10px 24px rgba(18,100,229,.25)',
        transition: 'transform .1s, box-shadow .1s, background .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {loading ? (
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,.3)',
          borderTopColor: '#fff',
          animation: 'spin .7s linear infinite',
        }}/>
      ) : children}
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
        cursor: 'pointer', fontSize: 16,
        flexShrink: 0,
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

// ─── STEP 1: USERNAME ────────────────────────────────────────────────────────
function StepUsername({ onNext }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const valid = clean.length >= 3

  async function handleNext() {
    if (!valid) { setError('Username must be at least 3 characters — letters, numbers, underscores only.'); return }
    setChecking(true)
    setError('')
    // Check uniqueness in Supabase profiles
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', clean)
        .maybeSingle()
      if (data) { setError('That username is taken — try another.'); setChecking(false); return }
    } catch {
      // If offline or error, allow through — will validate on submit
    }
    setChecking(false)
    onNext({ username: clean })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
      {/* Zara + greeting */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <ZaraOwl size={90} expression="happy"/>
        <div style={{ textAlign: 'center' }}>
          <h1 className="text-primary" style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 8 }}>
            Hey! I'm Zara 👋
          </h1>
          <p className="text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>
            I'll be your study buddy. What should I call you?
          </p>
        </div>
      </div>

      {/* Input */}
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
              border: `1.5px solid ${error ? 'var(--danger)' : valid && value ? 'var(--success)' : 'var(--border-strong)'}`,
              background: 'var(--bg-card)',
              color: 'var(--text-prim)',
              outline: 'none',
              transition: 'border-color .15s',
            }}
          />
          {valid && (
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>
            </div>
          )}
        </div>
        {error ? (
          <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
        ) : (
          <p className="text-tertiary" style={{ fontSize: 11 }}>
            Letters, numbers and underscores. Max 20 chars.
          </p>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Cta onClick={handleNext} disabled={!valid} loading={checking}>
          Continue →
        </Cta>
      </div>
    </div>
  )
}

// ─── STEP 2: EXAM TYPE ───────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 8 }}>
          Which exams are<br/>you sitting?
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Select one or both. Content and questions are filtered to match each exam.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {exams.map(({ id, label, sub, icon }) => {
          const on = selected.includes(id)
          return (
            <button key={id} onClick={() => toggle(id)} style={{
              padding: '16px', borderRadius: 16,
              border: `1.5px solid ${on ? '#062A78' : 'var(--border-strong)'}`,
              background: on ? 'rgba(6,42,120,.06)' : 'var(--bg-card)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all .15s', textAlign: 'left',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, fontSize: 20,
                background: on ? 'rgba(6,42,120,.1)' : 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div className="text-primary" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{label}</div>
                <div className="text-secondary" style={{ fontSize: 11 }}>{sub}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${on ? '#062A78' : 'var(--border-strong)'}`,
                background: on ? '#062A78' : 'transparent',
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
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <ZaraOwl size={28} expression="happy"/>
        <p className="text-secondary" style={{ fontSize: 12, lineHeight: 1.55 }}>
          Most SS3 students sit both. Shared topics appear once — exam-specific content is clearly labelled.
        </p>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Cta onClick={() => onNext({ exams: selected })} disabled={selected.length === 0}>
          Continue →
        </Cta>
        <button onClick={onBack} className="text-tertiary" style={{
          background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', padding: '8px 0',
        }}>← Back</button>
      </div>
    </div>
  )
}

// ─── STEP 3: SUBJECTS ────────────────────────────────────────────────────────
function StepSubjects({ data, onNext, onBack }) {
  const { exams } = data
  const visible = ALL_SUBJECTS.filter(s => s.exams.some(e => exams.includes(e)))
  const [selected, setSelected] = useState(['Mathematics', 'Biology'])

  function toggle(name) {
    setSelected(p => p.includes(name) ? p.filter(s => s !== name) : [...p, name])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 8 }}>
          Pick your subjects
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Choose at least one. Add or change subjects from your profile anytime.
        </p>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {visible.map(({ name, exams: subExams }) => {
          const on = selected.includes(name)
          const bothExams = subExams.length > 1
          return (
            <button key={name} onClick={() => toggle(name)} style={{
              padding: '9px 14px', borderRadius: 999,
              border: `1.5px solid ${on ? '#062A78' : 'var(--border-strong)'}`,
              background: on ? 'rgba(6,42,120,.07)' : 'var(--bg-card)',
              color: on ? '#062A78' : 'var(--text-sec)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all .12s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {on && <span style={{ fontSize: 10, fontWeight: 900 }}>✓</span>}
              {name}
              {!bothExams && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                  background: on ? 'rgba(6,42,120,.12)' : 'var(--bg-subtle)',
                  color: 'var(--text-tert)',
                }}>WAEC</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0', borderTop: '1px solid var(--border)',
        marginBottom: 4,
      }}>
        <span className="text-secondary" style={{ fontSize: 12 }}>Selected</span>
        <span className="text-primary" style={{ fontSize: 12, fontWeight: 800 }}>
          {selected.length} subject{selected.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Cta onClick={() => onNext({ subjects: selected })} disabled={selected.length === 0}>
          Continue with {selected.length} subject{selected.length !== 1 ? 's' : ''} →
        </Cta>
        <button onClick={onBack} className="text-tertiary" style={{
          background: 'none', border: 'none', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', padding: '8px 0',
        }}>← Back</button>
      </div>
    </div>
  )
}

// ─── STEP 4: MASCOT INTRO ────────────────────────────────────────────────────
function StepMascot({ data, onFinish }) {
  const [loading, setLoading] = useState(false)
  const { username, exams, subjects } = data

  const quoteIndex = Math.floor(Date.now() / 86400000) % ZARA_QUOTES.length
  const quote = ZARA_QUOTES[quoteIndex]

  // Mock quests preview
  const previewQuests = [
    { icon: '📐', text: `Solve 5 ${subjects[0] || 'Maths'} questions`, xp: 20 },
    { icon: '⚡', text: 'Complete a Speed Round', xp: 15 },
  ]

  async function handleStart() {
    setLoading(true)
    // Save to localStorage immediately (offline-first)
    const setup = { username, exams, subjects, onboarded: true, createdAt: Date.now() }
    localStorage.setItem('ep_guest', JSON.stringify(setup))

    // Try to persist to Supabase (anonymous session)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          username,
          exam_types: exams,
          subjects,
          onboarded: true,
        })
      }
    } catch {
      // Offline — localStorage already saved, continue as guest
    }

    onFinish()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
      {/* Zara large + glow */}
      <div style={{ position: 'relative', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18,100,229,.2), transparent 70%)',
          filter: 'blur(12px)',
        }}/>
        <ZaraOwl size={110} expression="excited"/>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 className="text-primary" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 8 }}>
          Let's go, {username}! 🎉
        </h2>
        <p className="text-secondary" style={{ fontSize: 13, lineHeight: 1.65, fontStyle: 'italic' }}>
          "{quote}"
        </p>
      </div>

      {/* Quest preview */}
      <div style={{
        width: '100%', borderRadius: 16,
        border: '1px solid var(--border)', background: 'var(--bg-card)',
        padding: '14px', marginBottom: 8,
      }}>
        <p className="text-tertiary" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
          Today's quests (preview)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {previewQuests.map((q, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'var(--bg-inset)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
              }}>{q.icon}</div>
              <div className="text-primary" style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{q.text}</div>
              <div style={{
                padding: '3px 8px', borderRadius: 999,
                background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.2)',
                fontSize: 10, fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                ⚡ +{q.xp} XP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {exams.map(e => (
          <div key={e} style={{
            padding: '4px 12px', borderRadius: 999,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-sec)',
          }}>📋 {e}</div>
        ))}
        {subjects.slice(0, 3).map(s => (
          <div key={s} style={{
            padding: '4px 12px', borderRadius: 999,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-sec)',
          }}>{s}</div>
        ))}
        {subjects.length > 3 && (
          <div style={{
            padding: '4px 12px', borderRadius: 999,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-tert)',
          }}>+{subjects.length - 3} more</div>
        )}
      </div>

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

// ─── MAIN ONBOARDING PAGE ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { dark, toggle } = useTheme()
  const [step, setStep] = useState(0) // 0–3
  const [formData, setFormData] = useState({})
  const [checking, setChecking] = useState(true)

  // Check if already onboarded
  useEffect(() => {
    // Check localStorage first (offline-first)
    try {
      const guest = JSON.parse(localStorage.getItem('ep_guest') || '{}')
      if (guest.onboarded) { router.replace('/student/home'); return }
    } catch {}

    // Check Supabase session
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        createClient().from('profiles').select('onboarded').eq('id', session.user.id).maybeSingle()
          .then(({ data }) => {
            if (data?.onboarded) { router.replace('/student/home'); return }
            setChecking(false)
          })
      } else {
        setChecking(false)
      }
    })
  }, [router])

  function advance(stepData) {
    const next = { ...formData, ...stepData }
    setFormData(next)
    // Persist each step to localStorage as we go (offline-first)
    localStorage.setItem('ep_onboarding_progress', JSON.stringify({ step: step + 1, data: next }))
    setStep(s => s + 1)
  }

  function goBack() {
    setStep(s => Math.max(0, s - 1))
  }

  function finish() {
    router.push('/student/home')
  }

  if (checking) return (
    <div className="bg-base" style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid var(--border-strong)',
        borderTopColor: '#1264E5',
        animation: 'spin .7s linear infinite',
      }}/>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        input::placeholder { color: var(--text-tert); }
        input:focus { outline: none; border-color: #1264E5 !important; box-shadow: 0 0 0 3px rgba(18,100,229,.12); }
        button { font-family: inherit; }
      `}</style>

      <div className="bg-base" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 420, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>

          {/* TOP BAR */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 0 8px',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: '#1a1f3c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: '#FFB800',
              }}>E</div>
              <span className="text-secondary" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                ExamPrep
              </span>
            </div>
            <ThemeToggle/>
          </div>

          {/* STEP DOTS */}
          <div style={{ padding: '12px 0 20px' }}>
            <StepDots current={step} total={4}/>
          </div>

          {/* STEP CONTENT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 32 }}>
            {step === 0 && <StepUsername onNext={advance}/>}
            {step === 1 && <StepExamType onNext={advance} onBack={goBack}/>}
            {step === 2 && <StepSubjects data={formData} onNext={advance} onBack={goBack}/>}
            {step === 3 && <StepMascot data={formData} onFinish={finish}/>}
          </div>

        </div>
      </div>
    </>
  )
}