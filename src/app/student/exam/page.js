'use client'
// src/app/student/exam/page.js — v4

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

const EXAM_CONFIG = {
  WAEC: {
    label: 'WAEC', questionsPerSubject: 50, minutesPerSubject: 90,
    maxSubjects: 9, minSubjects: 1, compulsory: [],
    icon: '📋', accent: '#0b1330', accentShadow: '#05070f',
    tagline: 'West African Examinations Council',
    bg: 'linear-gradient(145deg,#0b1330 0%,#1a2560 55%,#0b0d20 100%)',
  },
  JAMB: {
    label: 'JAMB', questionsPerSubject: 40, minutesPerSubject: 30,
    maxSubjects: 4, minSubjects: 4, compulsory: ['Use of English','English Language'],
    icon: '🎓', accent: '#6d28d9', accentShadow: '#4c1d95',
    tagline: 'Joint Admissions & Matriculation Board',
    bg: 'linear-gradient(145deg,#1e1060 0%,#2e1065 55%,#0b0d20 100%)',
  },
}

const SUBJECT_ICONS = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮',
}
const getIcon = n => SUBJECT_ICONS[n] ?? '📝'

export default function ExamModePage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = createClient()

  const [allSubjects, setAllSubjects] = useState([])
  const [profileExamType, setProfileExamType] = useState('WAEC')
  const [examType, setExamType]  = useState('WAEC')
  const [selected, setSelected]  = useState([])
  const [loading,  setLoading]   = useState(true)
  const [starting, setStarting]  = useState(false)
  const [step,     setStep]      = useState(1)

  const cfg = EXAM_CONFIG[examType]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, subjectsRes] = await Promise.all([
        supabase.from('profiles').select('exam_type, subjects').eq('id', user.id).single(),
        fetch('/api/student/subjects'),
      ])
      const subjectList = subjectsRes.ok ? await subjectsRes.json() : []

      const examT = prof?.exam_type ?? 'WAEC'
      setProfileExamType(examT)
      setExamType(examT === 'JAMB' ? 'JAMB' : 'WAEC')
      setAllSubjects(subjectList)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // Subjects visible for the selected exam
  // Show ALL enrolled subjects - the student chose these subjects for their exam
  // Don't filter by exam_type here; the questions API handles exam-specific question fetching
  const subjects = allSubjects

  // Auto-select when exam type or subjects change
  useEffect(() => {
    if (!subjects.length) { setSelected([]); return }
    if (examType === 'JAMB') {
      const compulsory = EXAM_CONFIG.JAMB.compulsory
      const english    = subjects.find(s => compulsory.includes(s.name))
      const rest       = subjects.filter(s => !compulsory.includes(s.name))
      // Auto-select: English (required) + up to 3 others = 4 total
      const initial    = english
        ? [english.name, ...rest.slice(0, 3).map(s => s.name)]
        : rest.slice(0, 4).map(s => s.name)
      setSelected(initial)
    } else {
      setSelected(subjects.slice(0, 1).map(s => s.name))
    }
    setStep(1)
  }, [examType, allSubjects]) // eslint-disable-line

  function toggleSubject(name) {
    if (cfg.compulsory.includes(name)) return
    setSelected(prev => {
      if (prev.includes(name)) return prev.filter(s => s !== name)
      if (prev.length >= cfg.maxSubjects) return prev
      return [...prev, name]
    })
  }

  async function startExam() {
    if (!selected.length) return
    setStarting(true)
    const totalSecs = cfg.minutesPerSubject * 60 * selected.length
    sessionStorage.setItem('practice_config', JSON.stringify({
      examType, subjects: selected,
      count: cfg.questionsPerSubject * selected.length,
      durationSecs: totalSecs, mode: 'exam', isExamMode: true,
    }))
    router.push('/student/exam/session')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#6d28d9', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const totalQs   = cfg.questionsPerSubject * selected.length
  const totalMins = cfg.minutesPerSubject * selected.length
  const h = Math.floor(totalMins / 60), m = totalMins % 60
  const duration  = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
  const isJAMB    = examType === 'JAMB'
  const needsMore = isJAMB && selected.length < 4
  const canStart  = selected.length >= cfg.minSubjects && !needsMore
  const hasBothExams = allSubjects.some(s => s.exam_type === 'WAEC') && allSubjects.some(s => s.exam_type === 'JAMB')

  return (
    <div style={{ paddingBottom: 100, maxWidth: 560, margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 4 }}>
        <button onClick={() => step === 2 ? setStep(1) : router.back()} style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-subtle)', border: '1.5px solid var(--border)',
          color: 'var(--text-sec)', cursor: 'pointer',
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', lineHeight: 1 }}>Mock Exam</h1>
          <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 3 }}>
            {step === 1 ? 'Full timed simulation — same format as the real exam' : 'Review before you start'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2].map(s => (
            <div key={s} style={{ width: s === step ? 20 : 7, height: 7, borderRadius: 4, background: s === step ? cfg.accent : 'var(--border)', transition: 'all .2s' }} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <>
          {/* Exam type selector */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>Exam</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(EXAM_CONFIG).map(([key, val]) => {
                const active = examType === key
                return (
                  <button key={key} onClick={() => setExamType(key)} style={{
                    padding: '16px 14px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                    border: `2px solid ${active ? val.accent : 'var(--border)'}`,
                    background: active ? (isDark ? `${val.accent}22` : `${val.accent}0d`) : 'var(--bg-card)',
                    transition: 'all .14s',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{val.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: active ? val.accent : 'var(--text-prim)', letterSpacing: '-0.02em' }}>{val.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 3, lineHeight: 1.4 }}>{val.tagline}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { icon: '❓', val: `${cfg.questionsPerSubject}`, sub: 'qs / subject' },
              { icon: '⏱', val: `${cfg.minutesPerSubject}m`, sub: 'per subject' },
              { icon: '📚', val: isJAMB ? '4' : '1–9', sub: 'subjects' },
            ].map(({ icon, val, sub }) => (
              <div key={sub} style={{ padding: '10px 8px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>{val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* JAMB note */}
          {isJAMB && (
            <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 10, background: isDark ? 'rgba(109,40,217,.12)' : '#f5f3ff', border: `1px solid ${isDark ? 'rgba(109,40,217,.3)' : '#ede9fe'}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#c4b5fd' : '#6d28d9', lineHeight: 1.5 }}>
                🎓 JAMB requires exactly 4 subjects. Use of English is automatically included.
              </p>
            </div>
          )}

          {/* Subject list */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Subjects</p>
              <span style={{ fontSize: 11, fontWeight: 700, color: canStart ? '#16a34a' : 'var(--text-tert)' }}>
                {isJAMB ? `${selected.length} / 4` : `${selected.length} selected`}
              </span>
            </div>

            {subjects.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tert)', marginBottom: 8 }}>No {examType} subjects in your profile.</p>
                <button onClick={() => router.push('/student/profile')} style={{ fontSize: 12, fontWeight: 700, color: cfg.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Add subjects in profile →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subjects.map(({ name }) => {
                  const colors  = resolveSubjectColors(name, isDark)
                  const checked = selected.includes(name)
                  const isComp  = cfg.compulsory.includes(name)
                  const dimmed  = !checked && selected.length >= cfg.maxSubjects && !isComp
                  return (
                    <button key={name} onClick={() => toggleSubject(name)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 14,
                      cursor: isComp ? 'default' : dimmed ? 'not-allowed' : 'pointer', textAlign: 'left',
                      background: checked ? (isDark ? `${colors.solid}18` : colors.bg) : 'var(--bg-card)',
                      border: `2px solid ${checked ? colors.solid : 'var(--border)'}`,
                      opacity: dimmed ? 0.35 : 1, transition: 'all .12s',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${checked ? colors.solid : 'var(--border)'}`,
                        background: checked ? colors.solid : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                      }}>
                        {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{getIcon(name)}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: checked ? (isDark ? (colors.darkText ?? colors.text) : colors.text) : 'var(--text-prim)' }}>
                        {name}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        {isComp && <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#d97706' }}>Required</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>{cfg.questionsPerSubject} qs</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {needsMore && (
            <div style={{ padding: '10px 13px', borderRadius: 12, background: isDark ? 'rgba(245,158,11,.1)' : '#fffbeb', border: '1px solid #fde68a', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>
                Add {4 - selected.length} more subject{4 - selected.length > 1 ? 's' : ''} to start your JAMB mock.
              </p>
            </div>
          )}

          <button onClick={() => canStart && setStep(2)} disabled={!canStart} style={{
            width: '100%', padding: '16px 0', borderRadius: 16,
            fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em',
            background: canStart ? cfg.accent : 'var(--bg-subtle)',
            color: canStart ? '#fff' : 'var(--text-tert)',
            border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? `0 4px 0 ${cfg.accentShadow}` : 'none',
            transition: 'all .12s',
          }}>
            {canStart ? `Review ${selected.length} subject${selected.length > 1 ? 's' : ''} →` : isJAMB ? 'Select 4 subjects to continue' : 'Select a subject to continue'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          {/* Summary hero */}
          <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ background: cfg.bg, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: .04, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '3px 10px', borderRadius: 999, background: `${cfg.accent}30`, border: `1px solid ${cfg.accent}50`, marginBottom: 16 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: examType === 'JAMB' ? '#c4b5fd' : '#93c5fd' }}>{cfg.icon} {examType} Mock Exam</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {[{v: totalQs, l:'Questions'},{v: duration, l:'Duration'},{v: selected.length, l:'Subjects'}].map(({v,l},i) => (
                    <div key={l} style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.1)' : 'none', paddingTop: 4 }}>
                      <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>{v}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.4)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '14px 16px' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>Subjects in this paper</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {selected.map(name => {
                  const colors = resolveSubjectColors(name, isDark)
                  const isComp = cfg.compulsory.includes(name)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: isDark ? `${colors.solid}10` : colors.bg, border: `1.5px solid ${isDark ? `${colors.solid}30` : colors.border}` }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{getIcon(name)}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isDark ? (colors.darkText ?? colors.text) : colors.text }}>{name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        {isComp && <span style={{ fontSize: 8, fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Required</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)' }}>{cfg.questionsPerSubject} qs · {cfg.minutesPerSubject}m</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div style={{ borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 8 }}>Before you begin</p>
            {[['⏱️','Timer starts immediately and cannot be paused'],['🚫','No explanations shown during the exam'],['✅','Full review available once you submit'],['📶','Keep your connection stable']].map(([icon,text]) => (
              <div key={text} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={startExam} disabled={starting} style={{
            width: '100%', padding: '17px 0', borderRadius: 16,
            fontSize: 16, fontWeight: 900, letterSpacing: '-0.01em',
            background: starting ? 'var(--bg-subtle)' : cfg.accent,
            color: starting ? 'var(--text-tert)' : '#fff',
            border: 'none', cursor: starting ? 'not-allowed' : 'pointer',
            boxShadow: starting ? 'none' : `0 5px 0 ${cfg.accentShadow}`,
            transition: 'all .12s',
          }}>
            {starting ? 'Starting…' : `🚀 Start ${examType} mock exam`}
          </button>
        </>
      )}
    </div>
  )
}