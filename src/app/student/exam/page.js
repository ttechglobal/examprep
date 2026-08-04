'use client'
// src/app/student/exam/page.js — v3
// Two-step modal-style flow:
//   Step 1: Exam type + subject selection
//   Step 2: Review & confirm (see full summary before starting)

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
    description:         '50 questions · 90 min per subject',
    compulsory:          [],
    icon:                '📋',
    color:               '#5cb8ea',
  },
  JAMB: {
    label:              'JAMB',
    questionsPerSubject: 40,
    minutesPerSubject:   30,
    maxSubjects:         4,
    minSubjects:         4,
    description:         '4 subjects · 40 questions each · 120 min total',
    compulsory:          ['Use of English', 'English Language'],
    icon:                '📝',
    color:               '#9b7ae0',
  },
}

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getIcon = n => SUBJECT_ICONS[n] ?? SUBJECT_ICONS.default

function PressBtn({ onClick, disabled, children, bg = '#0b1330', shadow = '0 6px 0 #05070f' }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 15, borderRadius: 14,
        background: bg, color: '#fff',
        fontSize: 15, fontWeight: 800, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, letterSpacing: '-0.01em',
        transform: p && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: p && !disabled ? shadow.replace('6px','2px') : shadow,
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
  const [step,      setStep]      = useState(1) // 1 = setup, 2 = confirm

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

  useEffect(() => {
    const c = EXAM_CONFIG[examType]
    if (examType === 'JAMB') {
      const english = subjects.find(s => c.compulsory.includes(s))
      const rest    = subjects.filter(s => !c.compulsory.includes(s))
      const initial = english ? [english, ...rest.slice(0, 3)] : rest.slice(0, 4)
      setSelected(initial)
    } else {
      setSelected(subjects.slice(0, 1))
    }
    setStep(1) // reset to step 1 when exam type changes
  }, [examType, subjects]) // eslint-disable-line

  function toggleSubject(name) {
    const c = EXAM_CONFIG[examType]
    if (c.compulsory.includes(name)) return
    setSelected(prev => {
      if (prev.includes(name)) return prev.filter(s => s !== name)
      if (prev.length >= c.maxSubjects) return prev
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
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', animation: 'spin .7s linear infinite', border: '3px solid var(--border)', borderTopColor: '#9b7ae0' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const totalQs   = cfg.questionsPerSubject * selected.length
  const totalMins = cfg.minutesPerSubject   * selected.length
  const isJAMB    = examType === 'JAMB'
  const needsMore = isJAMB && selected.length < 4

  const hours = Math.floor(totalMins / 60)
  const mins  = totalMins % 60
  const durationLabel = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => step === 2 ? setStep(1) : router.back()} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← {step === 2 ? 'Back' : 'Back'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                Mock exam ⏱️
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 4, lineHeight: 1.5 }}>
                {step === 1 ? 'Choose your exam and subjects.' : 'Review your session before starting.'}
              </p>
            </div>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {[1,2].map(s => (
                <div key={s} style={{ width: s === step ? 18 : 7, height: 7, borderRadius: 4, background: s === step ? cfg.color : 'var(--border)', transition: 'all .2s' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── STEP 1: Exam type + Subjects ── */}
        {step === 1 && (
          <>
            {/* Exam type toggle */}
            <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
                Exam type
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(EXAM_CONFIG).map(([key, val]) => (
                  <button key={key} onClick={() => setExamType(key)}
                    style={{
                      flex: 1, padding: '14px 8px', borderRadius: 14, cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
                      background: examType === key ? `${val.color}15` : 'var(--bg-subtle)',
                      border: `2px solid ${examType === key ? val.color : 'var(--border)'}`,
                    }}>
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{val.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: examType === key ? val.color : 'var(--text-prim)' }}>{val.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: 'var(--text-tert)', lineHeight: 1.4 }}>{val.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject selector */}
            <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>
                  Select subjects
                </p>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>
                  {isJAMB ? `${selected.length}/4` : `${selected.length} selected`}
                </span>
              </div>

              {isJAMB && (
                <div style={{ marginBottom: 10, padding: '8px 11px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.5 }}>
                    <strong>JAMB requires exactly 4 subjects.</strong> Use of English is compulsory.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {subjects.map(name => {
                  const colors  = resolveSubjectColors(name, isDark)
                  const checked = selected.includes(name)
                  const isComp  = cfg.compulsory.includes(name)
                  const atMax   = selected.length >= cfg.maxSubjects && !checked
                  const dimmed  = atMax && !isComp && !checked

                  return (
                    <button key={name} onClick={() => toggleSubject(name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 13px', borderRadius: 12, cursor: isComp ? 'default' : 'pointer', textAlign: 'left',
                        background: checked ? colors.bg : 'var(--bg-subtle)',
                        border: `1.5px solid ${checked ? colors.border : 'var(--border)'}`,
                        opacity: dimmed ? 0.4 : 1, transition: 'all .12s',
                      }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? colors.solid : 'var(--border)'}`, background: checked ? colors.solid : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {checked && <span style={{ fontSize: 10, color: '#fff', fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: checked ? colors.text : 'var(--text-prim)', flex: 1 }}>
                        {getIcon(name)} {name}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        {isComp && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,195,107,.15)', color: '#ffc36b' }}>Required</span>}
                        <span style={{ fontSize: 10, color: checked ? colors.text : 'var(--text-tert)', fontWeight: 600 }}>{cfg.questionsPerSubject} qs</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {needsMore && (
              <div style={{ borderRadius: 14, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '10px 13px', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', lineHeight: 1.5 }}>
                  JAMB requires exactly 4 subjects. Add {4 - selected.length} more to continue.
                </p>
              </div>
            )}

            <PressBtn onClick={() => setStep(2)} disabled={!selected.length || needsMore} bg={cfg.color} shadow={`0 6px 0 ${cfg.color}88`}>
              Review & confirm →
            </PressBtn>
          </>
        )}

        {/* ── STEP 2: Review + confirm ── */}
        {step === 2 && (
          <>
            {/* Session summary hero */}
            <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--border)' }}>
              <div style={{ background: `linear-gradient(160deg,#0b1330 0%,#1a1060 60%,#0b0d20 100%)`, padding: '20px 18px', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .03, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, borderRadius: 999, padding: '4px 10px', marginBottom: 12 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: cfg.color }}>{cfg.icon} {examType} Mock Exam</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 4 }}>
                    {[
                      { val: totalQs,          lbl: 'Questions', icon: '❓' },
                      { val: durationLabel,     lbl: 'Duration',  icon: '⏱️' },
                      { val: selected.length,   lbl: 'Subjects',  icon: '📚' },
                    ].map(({ val, lbl, icon }) => (
                      <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 3 }}>{val}</p>
                        <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.45)', fontWeight: 700 }}>{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 8 }}>Subjects in this exam</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.map(name => {
                    const colors = resolveSubjectColors(name, isDark)
                    const isComp = cfg.compulsory.includes(name)
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}` }}>
                        <span style={{ fontSize: 14 }}>{getIcon(name)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, flex: 1 }}>{name}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {isComp && <span style={{ fontSize: 9, fontWeight: 700, color: '#ffc36b' }}>Required</span>}
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>{cfg.questionsPerSubject} qs · {cfg.minutesPerSubject}m</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Exam rules */}
            <div style={{ borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 6 }}>Before you start</p>
              {[
                '⏱️ Timer starts immediately and cannot be paused',
                '🚫 No explanations shown during the exam',
                '✅ Answers revealed only after submitting the paper',
                '📶 Keep your connection stable throughout',
              ].map(rule => (
                <p key={rule} style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.6 }}>{rule}</p>
              ))}
            </div>

            <PressBtn onClick={startExam} disabled={starting} bg={cfg.color} shadow={`0 6px 0 ${cfg.color}88`}>
              {starting ? 'Starting exam…' : `Start ${examType} mock exam →`}
            </PressBtn>
          </>
        )}
      </div>
    </div>
  )
}