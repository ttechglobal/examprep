'use client'
// src/app/practice/_client.js
// Public free practice page — no auth required.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EXAM_OPTIONS = [
  { key: 'WAEC', label: 'WAEC', sub: 'West African Senior School Certificate', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'JAMB', label: 'JAMB', sub: 'Joint Admissions & Matriculation Board', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'IGCSE', label: 'IGCSE', sub: 'Cambridge International Certificate',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
]

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getIcon = n => SUBJECT_ICONS[n] ?? SUBJECT_ICONS.default

const COUNTS = [
  { n: 10, label: '10 questions', sub: '~8 mins' },
  { n: 20, label: '20 questions', sub: '~15 mins' },
  { n: 30, label: '30 questions', sub: '~25 mins' },
  { n: 40, label: '40 questions', sub: '~35 mins' },
]

export default function FreePracticePage() {
  const router = useRouter()

  const [step,        setStep]       = useState(1) // 1=exam, 2=subject, 3=count
  const [exam,        setExam]       = useState(null)
  const [subjects,    setSubjects]   = useState([])
  const [subject,     setSubject]    = useState(null)
  const [count,       setCount]      = useState(20)
  const [loading,     setLoading]    = useState(false)
  const [starting,    setStarting]   = useState(false)

  // Load subjects when exam is chosen
  useEffect(() => {
    if (!exam) return
    setLoading(true)
    setSubject(null)
    setSubjects([])
    fetch(`/api/admin/subjects`)
      .then(r => r.json())
      .then(data => {
        const filtered = Array.isArray(data)
          ? data.filter(s => s.is_active && s.exam_type === exam)
          : []
        setSubjects(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [exam])

  const examStyle = EXAM_OPTIONS.find(e => e.key === exam)

  function handleStart() {
    if (!exam || !subject) return
    setStarting(true)
    const config = {
      subjects:   [subject.name],
      subject_id: subject.id,
      examType:   exam,
      count,
      mode:       'mixed',
      answerMode: 'practice',
      isGuest:    true,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  const accentColor = examStyle?.color ?? '#4f46e5'

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-base, #f9fafb)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border, #e5e7eb)',
        background: 'var(--bg-card, #fff)', flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#0b1330', letterSpacing: '-0.02em' }}>
            ExamPrep
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sec, #6b7280)', textDecoration: 'none' }}>
            Log in
          </Link>
          <Link href="/signup" style={{
            fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none',
            padding: '7px 16px', borderRadius: 10,
            background: '#0b1330', boxShadow: '0 3px 0 #05070f',
          }}>
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 16px 40px', maxWidth: 520, margin: '0 auto', width: '100%',
      }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '36px 0 28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fef9c3', border: '1px solid #fde047',
            borderRadius: 99, padding: '4px 12px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#a16207', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Free · No signup needed
            </span>
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#0b1330',
            letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 10,
          }}>
            Start practising now
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-sec, #6b7280)', lineHeight: 1.55 }}>
            WAEC and JAMB past questions. Real exam format.
            Instant explanations on every answer.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, width: '100%' }}>
          {['Exam', 'Subject', 'Questions'].map((label, i) => {
            const stepNum = i + 1
            const done    = step > stepNum
            const active  = step === stepNum
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800,
                    background: done ? '#16a34a' : active ? accentColor : '#f3f4f6',
                    color: done || active ? '#fff' : '#9ca3af',
                    transition: 'all .2s',
                  }}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: active ? accentColor : '#9ca3af' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{ height: 2, flex: 0.5, background: done ? '#16a34a' : '#f3f4f6', margin: '0 4px', marginBottom: 16, transition: 'background .2s' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: Exam ── */}
        {step === 1 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec, #374151)', marginBottom: 4 }}>
              Which exam are you preparing for?
            </p>
            {EXAM_OPTIONS.map(e => (
              <button key={e.key} onClick={() => { setExam(e.key); setStep(2) }} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                background: '#fff', border: `2px solid ${e.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                transition: 'all .12s',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: e.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: e.color,
                }}>
                  {e.key}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0b1330', marginBottom: 2 }}>{e.label}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{e.sub}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 18, color: '#d1d5db' }}>›</span>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Subject ── */}
        {step === 2 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button onClick={() => setStep(1)} style={{
                width: 30, height: 30, borderRadius: 9, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                Choose a subject for <span style={{ color: accentColor }}>{exam}</span>
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 10px',
                  border: `3px solid ${accentColor}`, borderTopColor: 'transparent',
                  animation: 'spin .7s linear infinite',
                }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading subjects…</p>
              </div>
            ) : subjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No subjects available yet</p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Questions for {exam} subjects are being added. Check back soon.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {subjects.map(s => {
                  const on = subject?.id === s.id
                  return (
                    <button key={s.id} onClick={() => setSubject(s)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: 6, padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
                      background: on ? examStyle?.bg : '#fff',
                      border: `2px solid ${on ? accentColor : '#e5e7eb'}`,
                      transition: 'all .12s',
                    }}>
                      <span style={{ fontSize: 22 }}>{getIcon(s.name)}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: on ? accentColor : '#0b1330', textAlign: 'left', lineHeight: 1.3 }}>
                        {s.name}
                      </span>
                      {on && <span style={{ fontSize: 10, fontWeight: 700, color: accentColor }}>✓ Selected</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {subject && (
              <button onClick={() => setStep(3)} style={{
                marginTop: 6, width: '100%', padding: '15px 0', borderRadius: 14,
                background: accentColor, color: '#fff', fontSize: 15, fontWeight: 800,
                border: 'none', cursor: 'pointer', boxShadow: `0 4px 0 ${accentColor}88`,
                letterSpacing: '-0.01em',
              }}>
                Continue with {subject.name} →
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: Question count ── */}
        {step === 3 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button onClick={() => setStep(2)} style={{
                width: 30, height: 30, borderRadius: 9, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>←</button>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                How many questions?
              </p>
            </div>

            {/* Summary pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: examStyle?.bg, border: `1px solid ${examStyle?.border}`,
            }}>
              <span style={{ fontSize: 18 }}>{getIcon(subject?.name ?? '')}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: accentColor }}>{subject?.name}</p>
                <p style={{ fontSize: 11, color: accentColor, opacity: 0.7 }}>{exam}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {COUNTS.map(c => {
                const on = count === c.n
                return (
                  <button key={c.n} onClick={() => setCount(c.n)} style={{
                    padding: '16px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    background: on ? '#0b1330' : '#fff',
                    border: `2px solid ${on ? '#0b1330' : '#e5e7eb'}`,
                    transition: 'all .12s',
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: on ? '#fff' : '#0b1330', marginBottom: 2 }}>{c.n}</p>
                    <p style={{ fontSize: 10, color: on ? 'rgba(255,255,255,.6)' : '#9ca3af' }}>{c.sub}</p>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleStart}
              disabled={starting}
              style={{
                marginTop: 4, width: '100%', padding: '16px 0', borderRadius: 14,
                background: starting ? '#9ca3af' : accentColor,
                color: '#fff', fontSize: 16, fontWeight: 900,
                border: 'none', cursor: starting ? 'default' : 'pointer',
                boxShadow: starting ? 'none' : `0 5px 0 ${accentColor}88`,
                letterSpacing: '-0.01em', transition: 'all .1s',
              }}>
              {starting ? 'Starting…' : `Start ${count} questions →`}
            </button>

            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
              No account needed. After you finish, you'll see a full breakdown of your score and what to improve.
            </p>
          </div>
        )}

        {/* Trust line */}
        {step === 1 && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
              Real WAEC and JAMB past questions · Instant answer explanations<br />
              Topic mastery tracking · Used by students across Nigeria
            </p>
          </div>
        )}
      </div>
    </div>
  )
}