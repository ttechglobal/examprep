'use client'
// src/app/student/exam/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Mock exam setup:
//   WAEC  — up to 9 subjects, 50 qs / subject, 90 min / subject
//   JAMB  — exactly 4 subjects, English is compulsory + 3 others
//           40 qs / subject, 30 min / subject (120 min total)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

const EXAM_CONFIG = {
  WAEC: {
    label:              'WAEC',
    questionsPerSubject: 50,
    minutesPerSubject:   90,
    maxSubjects:         9,
    minSubjects:         1,
    description:         '50 questions · 90 min per subject · up to 9 subjects',
    compulsory:          [],
  },
  JAMB: {
    label:              'JAMB',
    questionsPerSubject: 40,
    minutesPerSubject:   30,
    maxSubjects:         4,
    minSubjects:         4,
    description:         '4 subjects · 40 questions each · 120 min total · English compulsory',
    compulsory:          ['Use of English', 'English Language'],
  },
}

function PressBtn({ onClick, disabled, children }) {
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
        opacity: disabled ? 0.45 : 1, letterSpacing: '-0.01em',
        transform: p && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: p && !disabled ? '0 3px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.15)',
        transition: 'transform .1s, box-shadow .1s',
      }}>
      {children}
    </button>
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

  const cfg = EXAM_CONFIG[examType]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single()
      setExamType(prof?.exam_type === 'JAMB' ? 'JAMB' : 'WAEC')
      setSubjects(prof?.subjects ?? [])
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // When exam type switches, reset selection respecting rules
  useEffect(() => {
    const c = EXAM_CONFIG[examType]
    if (examType === 'JAMB') {
      // Auto-select compulsory English if available
      const english = subjects.find(s => c.compulsory.includes(s))
      const rest    = subjects.filter(s => !c.compulsory.includes(s))
      const initial = english ? [english, ...rest.slice(0, 3)] : rest.slice(0, 4)
      setSelected(initial)
    } else {
      // WAEC: pre-select first subject
      setSelected(subjects.slice(0, 1))
    }
  }, [examType, subjects]) // eslint-disable-line

  function toggleSubject(name) {
    const c = EXAM_CONFIG[examType]
    const isCompulsory = c.compulsory.includes(name)
    if (isCompulsory) return // can't deselect compulsory

    setSelected(prev => {
      if (prev.includes(name)) {
        return prev.filter(s => s !== name)
      }
      if (prev.length >= c.maxSubjects) return prev // already at max
      return [...prev, name]
    })
  }

  async function startExam() {
    if (!selected.length) return
    setStarting(true)
    const config = {
      examType,
      subjects:     selected,
      count:        cfg.questionsPerSubject * selected.length,
      durationSecs: cfg.minutesPerSubject * 60 * selected.length,
      mode:         'exam',
      isExamMode:   true,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/exam/session')
  }

  if (loading) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-7 h-7 rounded-full animate-spin" style={{ border: '3px solid var(--border)', borderTopColor: '#9b7ae0' }} />
    </div>
  )

  const totalQs   = cfg.questionsPerSubject * selected.length
  const totalMins = cfg.minutesPerSubject   * selected.length
  const isJAMB    = examType === 'JAMB'
  const needsMore = isJAMB && selected.length < 4
  const tooMany   = selected.length > cfg.maxSubjects

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Mock exam ⏱️
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 4, lineHeight: 1.5 }}>
            A timed simulation of the real exam — same format, same pressure.
          </p>
        </div>

        {/* Exam type toggle */}
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
            Exam type
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(EXAM_CONFIG).map(([key, val]) => (
              <button key={key} onClick={() => setExamType(key)}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                  background: examType === key ? 'var(--active-bg)' : 'var(--bg-subtle)',
                  border: `2px solid ${examType === key ? 'var(--active-border)' : 'var(--border)'}`,
                  color: examType === key ? 'var(--active-text)' : 'var(--text-sec)',
                }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{key === 'WAEC' ? '📋' : '📝'}</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{val.label}</div>
                <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: .7 }}>{val.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Subject selector */}
        <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>
              Subjects
            </p>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>
              {isJAMB ? `${selected.length}/4 selected` : `${selected.length} selected`}
            </span>
          </div>

          {isJAMB && (
            <div style={{ marginBottom: 10, padding: '8px 11px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.5 }}>
                <strong>JAMB requires exactly 4 subjects.</strong> Use of English is compulsory — select 3 more.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {subjects.map(name => {
              const colors      = resolveSubjectColors(name, isDark)
              const checked     = selected.includes(name)
              const isComp      = cfg.compulsory.includes(name)
              const atMax       = selected.length >= cfg.maxSubjects && !checked
              const dimmed      = (atMax && !isComp) && !checked

              return (
                <button key={name} onClick={() => toggleSubject(name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 13px', borderRadius: 12, cursor: isComp ? 'default' : 'pointer', textAlign: 'left',
                    background: checked ? colors.bg : 'var(--bg-subtle)',
                    border: `1.5px solid ${checked ? colors.border : 'var(--border)'}`,
                    opacity: dimmed ? 0.45 : 1,
                    transition: 'all .12s',
                  }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? colors.solid : 'var(--border)'}`, background: checked ? colors.solid : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {checked && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: checked ? colors.text : 'var(--text-prim)', flex: 1 }}>{name}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {isComp && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,195,107,.15)', color: '#ffc36b' }}>Required</span>}
                    <span style={{ fontSize: 10, color: checked ? colors.text : 'var(--text-tert)', fontWeight: 600 }}>{cfg.questionsPerSubject} qs</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Session summary */}
        {selected.length > 0 && (
          <div style={{ borderRadius: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 16 }}>
            {[
              { val: totalQs,          lbl: 'Questions' },
              { val: `${totalMins}m`,  lbl: 'Duration' },
              { val: selected.length,  lbl: 'Subjects' },
            ].map(({ val, lbl }, i) => (
              <div key={lbl} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)' }}>{val}</p>
                <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', fontWeight: 700 }}>{lbl}</p>
              </div>
            ))}
          </div>
        )}

        {/* JAMB needs exactly 4 warning */}
        {needsMore && (
          <div style={{ borderRadius: 14, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '10px 13px', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', lineHeight: 1.5 }}>
              JAMB requires exactly 4 subjects. Add {4 - selected.length} more to continue.
            </p>
          </div>
        )}

        {/* Exam rules reminder */}
        <div style={{ borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '10px 13px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sec)', lineHeight: 1.5 }}>
            ⏱ No explanations during exam mode. Answers shown only at the end.
          </p>
        </div>

        <PressBtn onClick={startExam} disabled={!selected.length || starting || needsMore}>
          {starting ? 'Starting…' : `Start ${examType} mock exam →`}
        </PressBtn>
      </div>
    </div>
  )
}