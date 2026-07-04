'use client'
// src/app/onboarding/page.js — v3
// Full light + dark mode. Uses CSS var tokens throughout.
// No hardcoded dark backgrounds — everything reads from the design system.

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const ALL_SUBJECTS = [
  { name: 'Chemistry',             tag: 'WAEC · JAMB' },
  { name: 'Physics',               tag: 'WAEC · JAMB' },
  { name: 'Mathematics',           tag: 'WAEC · JAMB' },
  { name: 'Biology',               tag: 'WAEC · JAMB' },
  { name: 'English Language',      tag: 'WAEC'         },
  { name: 'Economics',             tag: 'WAEC · JAMB' },
  { name: 'Government',            tag: 'WAEC · JAMB' },
  { name: 'Geography',             tag: 'WAEC · JAMB' },
  { name: 'Literature in English', tag: 'WAEC'         },
  { name: 'Agricultural Science',  tag: 'WAEC'         },
  { name: 'Further Mathematics',   tag: 'WAEC · JAMB' },
  { name: 'Commerce',              tag: 'WAEC · JAMB' },
]

// ── 3D Navy CTA — same in both modes ─────────────────────────────────────────
function Cta3D({ onClick, disabled, children }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '15px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 700, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center', letterSpacing: '-0.01em',
        opacity: disabled ? 0.5 : 1,
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p ? '0 2px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(10,13,26,0.2)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >{children}</button>
  )
}

function OnboardForm() {
  const router = useRouter()
  const [examType, setExamType] = useState('WAEC')
  const [selected, setSelected] = useState(['Chemistry', 'Physics'])
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) { router.replace('/student/dashboard'); return }
      setChecking(false)
    })
    try {
      const s = JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}')
      if (s.examType) setExamType(s.examType)
      if (s.subjects?.length) setSelected(s.subjects)
    } catch {}
  }, [router])

  function toggle(name) {
    setSelected(p => p.includes(name) ? p.filter(s => s !== name) : p.length < 9 ? [...p, name] : p)
  }

  function handleStart() {
    if (!selected.length) { setError('Select at least one subject.'); return }
    setLoading(true)
    sessionStorage.setItem('diagnostic_setup', JSON.stringify({ examType, subjects: selected, questionCount: 5 }))
    router.push('/diagnostic/test')
  }

  if (checking) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#0b1330', borderTopColor: 'transparent' }} />
    </div>
  )

  const visible = examType === 'JAMB' ? ALL_SUBJECTS.filter(s => s.tag.includes('JAMB')) : ALL_SUBJECTS

  return (
    <div className="min-h-dvh bg-base">
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 20px 48px' }}>

        {/* ── Logo + hero ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '52px 0 28px', textAlign: 'center' }}>
          {/* Logo mark — navy, always */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#0b1330',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
            boxShadow: '0 6px 0 #05070f, 0 10px 20px rgba(10,13,26,0.2)',
          }}>E</div>

          <p className="text-secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Exam Prep
          </p>

          <h1 className="text-primary" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, marginTop: 4 }}>
            Just practise.<br />
            Ace your{' '}
            <span style={{ color: '#4338ca' }}>exams</span>.
          </h1>

          <p className="text-secondary" style={{ fontSize: 13, maxWidth: 270, lineHeight: 1.65, marginTop: 4 }}>
            WAEC &amp; JAMB practice built around your weak areas. Start in 2 minutes.
          </p>
        </div>

        {/* ── Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Section label */}
          <p className="text-tertiary" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Which exam are you sitting?
          </p>

          {/* Exam chips */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'WAEC', sub: 'West African exams'  },
              { id: 'JAMB', sub: 'University entrance' },
              { id: 'BOTH', sub: 'WAEC + JAMB'        },
            ].map(({ id, sub }) => {
              const on = examType === id
              return (
                <button key={id} onClick={() => setExamType(id)} style={{
                  flex: 1, padding: '11px 6px', borderRadius: 12,
                  cursor: 'pointer', textAlign: 'center',
                  background: on ? 'var(--active-bg)'   : 'var(--bg-card)',
                  border: `2px solid ${on ? 'var(--active-border)' : 'var(--border)'}`,
                  transition: 'all .15s',
                }}>
                  <div className="text-primary" style={{ fontSize: 14, fontWeight: 800 }}>{id}</div>
                  <div className="text-secondary" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>
                </button>
              )
            })}
          </div>

          {/* Subject label */}
          <p className="text-tertiary" style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: 4 }}>
            Pick your subjects ({selected.length} selected)
          </p>

          {/* Subject grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {visible.map(({ name, tag }) => {
              const on    = selected.includes(name)
              const maxed = !on && selected.length >= 9
              return (
                <button key={name} onClick={() => !maxed && toggle(name)} style={{
                  padding: '10px 12px', borderRadius: 11,
                  textAlign: 'left', cursor: maxed ? 'not-allowed' : 'pointer',
                  background: on ? 'var(--active-bg)'   : 'var(--bg-card)',
                  border: `2px solid ${on ? 'var(--active-border)' : 'var(--border)'}`,
                  opacity: maxed ? 0.4 : 1, transition: 'all .15s',
                }}>
                  <div className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
                  <div className="text-tertiary" style={{ fontSize: 9, marginTop: 1 }}>{tag}</div>
                </button>
              )
            })}
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

          <div style={{ marginTop: 4 }}>
            <Cta3D onClick={handleStart} disabled={loading}>
              {loading ? 'Loading…' : 'Take free diagnostic →'}
            </Cta3D>
          </div>

          <p className="text-tertiary" style={{ textAlign: 'center', fontSize: 11, marginTop: 4 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#4338ca', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <Suspense fallback={null}><OnboardForm /></Suspense>
}