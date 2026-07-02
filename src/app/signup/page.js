'use client'
// src/app/signup/page.js — v2
// REDESIGN: matches prototype screen 1 exactly.
// KEY CHANGES FROM v1:
//   • Single scroll — NO multi-step wizard. Everything visible at once:
//     exam chips → subject 2-col grid → CTA → sign-in link.
//     (Matches prototype: user scrolls down and taps "Take free diagnostic →")
//   • Onboard background: linear-gradient(170deg, #0e0a1c 0%, #0d0e14 60%)
//   • Logo: 60×60 navy mark with big 3D shadow (0 8px 0 #05070f)
//   • Exam chips: 3-across flex row, 14px border-radius, 2px border
//   • Subject grid: 2-col, 12px border-radius, 2px border, left-aligned text
//   • Single CTA: "Take free diagnostic →" navy 3D button
//   • Account creation happens AFTER the diagnostic flow (not before)
//     — if user has no account, they get prompted on the results page.

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0d0e14',
  surface:  '#13141f',
  surface2: '#1a1b28',
  border:   'rgba(255,255,255,0.07)',
  text:     '#eef0fa',
  dim:      '#7b7f9e',
  faint:    '#44475e',
  chem:     '#9b7ae0',
  navy:     '#0b1330',
  navyDeep: '#05070f',
}

const SUBJECTS = [
  { name: 'Chemistry',         tag: 'WAEC · JAMB' },
  { name: 'Physics',           tag: 'WAEC · JAMB' },
  { name: 'Mathematics',       tag: 'WAEC · JAMB' },
  { name: 'Biology',           tag: 'WAEC · JAMB' },
  { name: 'English Language',  tag: 'WAEC'        },
  { name: 'Economics',         tag: 'WAEC · JAMB' },
  { name: 'Government',        tag: 'WAEC · JAMB' },
  { name: 'Geography',         tag: 'WAEC · JAMB' },
  { name: 'Literature in English', tag: 'WAEC'   },
  { name: 'Agricultural Science',  tag: 'WAEC'   },
  { name: 'Further Mathematics',   tag: 'WAEC · JAMB' },
  { name: 'Commerce',          tag: 'WAEC · JAMB' },
]

// ── Ambient molecular SVG (top of screen, 7% opacity) ────────────────────────
function Ambient() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260, pointerEvents: 'none', opacity: 0.07, zIndex: 0 }}>
      <svg width="100%" height="260" viewBox="0 0 375 260" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <circle cx="40"  cy="60"  r="3" fill="#9b7ae0"/>
        <circle cx="110" cy="35"  r="2" fill="#9b7ae0"/>
        <circle cx="185" cy="70"  r="3" fill="#9b7ae0"/>
        <circle cx="260" cy="45"  r="2" fill="#ff8fab"/>
        <circle cx="320" cy="65"  r="3" fill="#9b7ae0"/>
        <line x1="40"  y1="60"  x2="110" y2="35"  stroke="#9b7ae0" strokeWidth="1"/>
        <line x1="110" y1="35"  x2="185" y2="70"  stroke="#9b7ae0" strokeWidth="1"/>
        <line x1="185" y1="70"  x2="260" y2="45"  stroke="#9b7ae0" strokeWidth="1"/>
        <line x1="260" y1="45"  x2="320" y2="65"  stroke="#9b7ae0" strokeWidth="1"/>
        <circle cx="20"  cy="140" r="2" fill="#9b7ae0"/>
        <circle cx="90"  cy="115" r="3" fill="#ff8fab"/>
        <circle cx="170" cy="145" r="2" fill="#9b7ae0"/>
        <circle cx="250" cy="125" r="3" fill="#9b7ae0"/>
        <line x1="20"  y1="140" x2="90"  y2="115" stroke="#9b7ae0" strokeWidth="1"/>
        <line x1="90"  y1="115" x2="170" y2="145" stroke="#9b7ae0" strokeWidth="1"/>
        <line x1="170" y1="145" x2="250" y2="125" stroke="#9b7ae0" strokeWidth="1"/>
      </svg>
    </div>
  )
}

// ── 3D navy press button ──────────────────────────────────────────────────────
function Cta3D({ onClick, disabled, children }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 15, borderRadius: 14,
        background: C.navy, color: '#fff',
        fontSize: 15, fontWeight: 700, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center', letterSpacing: '-0.01em',
        opacity: disabled ? 0.5 : 1,
        transform: p ? 'translateY(3px)' : '',
        boxShadow: p
          ? `0 3px 0 ${C.navyDeep}`
          : `0 6px 0 ${C.navyDeep}, 0 10px 24px rgba(0,0,0,0.4)`,
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Label ─────────────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.09em', color: C.dim, marginBottom: 8,
    }}>
      {children}
    </p>
  )
}

// ── Main onboarding form ──────────────────────────────────────────────────────
function OnboardForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [examType,  setExam]    = useState('WAEC')
  const [selected,  setSelected] = useState(['Chemistry', 'Physics'])
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState(null)

  // Restore from previous diagnostic session if returning
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('diagnostic_setup')
      if (raw) {
        const s = JSON.parse(raw)
        if (s.examType) setExam(s.examType)
        if (s.subjects?.length) setSelected(s.subjects)
      }
    } catch {}
  }, [])

  function toggleSubject(name) {
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(s => s !== name)
        : prev.length < 9 ? [...prev, name] : prev
    )
  }

  function handleStart() {
    if (!selected.length) { setError('Pick at least one subject to continue'); return }
    setError(null)
    // Save setup for diagnostic
    sessionStorage.setItem('diagnostic_setup', JSON.stringify({
      examType,
      subjects: selected,
      questionCount: 5,
    }))
    router.push('/diagnostic/test')
  }

  // The visible subjects to show depend on exam type
  const filteredSubjects = examType === 'JAMB'
    ? SUBJECTS.filter(s => s.tag.includes('JAMB'))
    : SUBJECTS  // WAEC and BOTH show all

  return (
    /* Single scroll wrapper — no steps */
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingBottom: 32 }}>

      <Ambient />

      {/* Logo + hero copy */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, padding: '48px 24px 24px', position: 'relative', zIndex: 1,
      }}>
        {/* 60px logo mark */}
        <div style={{
          width: 60, height: 60, borderRadius: 18, background: C.navy,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#fff',
          boxShadow: `0 8px 0 ${C.navyDeep}, 0 12px 24px rgba(0,0,0,.5)`,
        }}>E</div>

        <span style={{
          fontSize: 11, fontWeight: 700, color: C.dim,
          textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>Exam Prep</span>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: C.text,
          letterSpacing: '-0.025em', lineHeight: 1.1,
          textAlign: 'center', marginTop: 8,
        }}>
          Just practise.<br />
          Ace your{' '}
          <span style={{ color: C.chem }}>exams</span>.
        </h1>

        <p style={{
          fontSize: 13, color: C.dim, textAlign: 'center',
          maxWidth: 280, marginTop: 4, lineHeight: 1.6,
        }}>
          WAEC &amp; JAMB practice built around your weaknesses.
          Start in 2 minutes.
        </p>
      </div>

      {/* ── Exam + subjects + CTA ── */}
      <div style={{
        padding: '0 24px 32px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        {/* Exam type chips */}
        <Label>Which exam are you sitting?</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          {[
            { id: 'WAEC', sub: 'West African exams'  },
            { id: 'JAMB', sub: 'University entrance' },
            { id: 'BOTH', sub: 'WAEC + JAMB'        },
          ].map(({ id, sub }) => (
            <button
              key={id}
              onClick={() => setExam(id)}
              style={{
                flex: 1, padding: 12, borderRadius: 14, cursor: 'pointer',
                background: examType === id ? 'rgba(155,122,224,.15)' : C.surface,
                border: `2px solid ${examType === id ? 'rgba(155,122,224,.4)' : C.border}`,
                textAlign: 'center', transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{id}</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* Subject grid */}
        <Label style={{ marginTop: 2 }}>
          Pick your subjects{' '}
          <span style={{ color: C.faint }}>({selected.length} selected)</span>
        </Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filteredSubjects.map(({ name, tag }) => {
            const on = selected.includes(name)
            const maxed = !on && selected.length >= 9
            return (
              <button
                key={name}
                onClick={() => !maxed && toggleSubject(name)}
                style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: on ? 'rgba(155,122,224,.1)' : C.surface,
                  border: `2px solid ${on ? 'rgba(155,122,224,.4)' : C.border}`,
                  cursor: maxed ? 'not-allowed' : 'pointer',
                  textAlign: 'left', transition: 'all .15s',
                  opacity: maxed ? 0.4 : 1,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{name}</div>
                <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{tag}</div>
              </button>
            )
          })}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#ef5d4e', textAlign: 'center' }}>{error}</p>
        )}

        {/* CTA */}
        <Cta3D onClick={handleStart} disabled={loading}>
          {loading ? 'Loading…' : 'Take free diagnostic →'}
        </Cta3D>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.dim }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: C.chem, fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(170deg, #0e0a1c 0%, #0d0e14 60%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Suspense fallback={null}>
        <OnboardForm />
      </Suspense>
    </div>
  )
}