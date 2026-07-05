'use client'
// src/app/student/exam/page.js
// Exam Mode setup page.
//
// Lets the student choose which exam to simulate (WAEC/JAMB), which
// subject(s), and then starts the timed full-paper session.
//
// WAEC:  50 questions per subject, 90 minutes
// JAMB:  40 questions for 4-subject paper (180 total), 120 minutes
//
// Questions are distributed across topics in the same proportion as the
// real exam by passing mode=exam to /api/practice/questions, which uses
// coreTopicMap weighting.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

const EXAM_CONFIG = {
  WAEC: { questionsPerSubject: 50, minutesPerSubject: 90, label: 'WAEC', description: '50 questions · 90 minutes per subject' },
  JAMB: { questionsPerSubject: 40, minutesPerSubject: 30, label: 'JAMB', description: '40 questions per subject · 30 min each' },
}

function PressBtn({ onClick, disabled, children, style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 15, borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        letterSpacing: '-0.01em',
        transform: p && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: p && !disabled ? '0 3px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.15)',
        transition: 'transform .1s, box-shadow .1s',
        ...style,
      }}>{children}</button>
  )
}

export default function ExamModePage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = createClient()

  const [subjects,  setSubjects]  = useState([])
  const [examType,  setExamType]  = useState('WAEC')
  const [selected,  setSelected]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [starting,  setStarting]  = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single()
      setExamType(prof?.exam_type ?? 'WAEC')
      setSubjects(prof?.subjects ?? [])
      setSelected((prof?.subjects ?? []).slice(0, 1)) // pre-select first subject
      setLoading(false)
    }
    load()
  }, [])

  function toggleSubject(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  async function startExam() {
    if (!selected.length) return
    setStarting(true)
    const cfg = EXAM_CONFIG[examType]
    const config = {
      examType,
      subjects:       selected,
      count:          cfg.questionsPerSubject * selected.length,
      durationSecs:   cfg.minutesPerSubject * 60 * selected.length,
      mode:           'exam',
      isExamMode:     true,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/exam/session')
  }

  if (loading) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-7 h-7 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--active-border)', borderTopColor: 'var(--active-text)' }} />
    </div>
  )

  const cfg = EXAM_CONFIG[examType]
  const totalQs   = cfg.questionsPerSubject * selected.length
  const totalMins = cfg.minutesPerSubject   * selected.length

  return (
    <div className="min-h-dvh bg-base pb-20">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Exam Mode ⏱️
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 4, lineHeight: 1.5 }}>
            A timed simulation of the real exam — same format, same pressure.
          </p>
        </div>

        {/* Exam type selector */}
        <div className="card mb-4" style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
            Select exam
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(EXAM_CONFIG).map(([key, val]) => (
              <button key={key} onClick={() => setExamType(key)}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', transition: 'all .15s',
                  background: examType === key ? 'var(--active-bg)' : 'var(--bg-subtle)',
                  border: `2px solid ${examType === key ? 'var(--active-border)' : 'var(--border)'}`,
                  color: examType === key ? 'var(--active-text)' : 'var(--text-sec)',
                }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{key === 'WAEC' ? '📋' : '📝'}</div>
                <div>{val.label}</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: .7 }}>{val.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Subject selector */}
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
            Select subjects
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {subjects.map(name => {
              const colors  = resolveSubjectColors(name, isDark)
              const checked = selected.includes(name)
              return (
                <button key={name} onClick={() => toggleSubject(name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 13px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    background: checked ? colors.bg : 'var(--bg-subtle)',
                    border: `1.5px solid ${checked ? colors.border : 'var(--border)'}`,
                    transition: 'all .12s',
                  }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? colors.solid : 'var(--border)'}`, background: checked ? colors.solid : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: checked ? colors.text : 'var(--text-prim)' }}>{name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: checked ? colors.text : 'var(--text-tert)', fontWeight: 600 }}>
                    {cfg.questionsPerSubject} qs
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Session summary */}
        {selected.length > 0 && (
          <div style={{ borderRadius: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)' }}>{totalQs}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', fontWeight: 700 }}>Questions</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)' }}>{totalMins}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', fontWeight: 700 }}>Minutes</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)' }}>{selected.length}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', fontWeight: 700 }}>Subjects</p>
            </div>
          </div>
        )}

        {/* Rules reminder */}
        <div style={{ borderRadius: 14, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '10px 13px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', lineHeight: 1.5 }}>
            ⏱ No explanations during exam mode — only your final score. Results shown at the end.
          </p>
        </div>

        <PressBtn onClick={startExam} disabled={!selected.length || starting}>
          {starting ? 'Starting…' : `Start ${examType} Exam →`}
        </PressBtn>
      </div>
    </div>
  )
}