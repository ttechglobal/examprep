'use client'
// src/app/student/practice/setup/page.js

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ── Icons ──────────────────────────────────────────────────────────────────────
const SUBJECT_ICONS = {
  'Chemistry': '⚗️', 'Physics': '⚡', 'Biology': '🧬',
  'Mathematics': '📐', 'Further Mathematics': '📐',
  'English Language': '📖', 'Use of English': '📖',
  'Economics': '📊', 'Government': '🏛️', 'Geography': '🌍',
  'Literature in English': '📚', 'Agricultural Science': '🌱',
  'Commerce': '💼', 'Accounting': '🧮',
}

// ── Modes ──────────────────────────────────────────────────────────────────────
const MODES = [
  {
    key: 'topic', icon: '📌', label: 'By Topic',
    desc: 'Pick a specific topic and drill every question in it.',
    tags: ['Recommended'],
  },
  {
    key: 'year', icon: '📅', label: 'By Year',
    desc: 'Practice questions from a specific past paper year.',
    tags: ['Past questions'],
  },
  {
    key: 'weak', icon: '🎯', label: 'Weak Areas',
    desc: 'See your weakest topics and pick which ones to work on.',
    tags: ['Targeted'],
  },
  {
    key: 'mixed', icon: '🔀', label: 'Mixed',
    desc: 'Random questions across all topics — great for broad revision.',
    tags: ['Random'],
  },
  {
    key: 'mock', icon: '🏆', label: 'Mock Exam',
    desc: 'Full timed simulation — same format and time pressure as the real exam.',
    tags: ['Full paper'],
  },
]

const QUESTION_COUNTS = [10, 20, 30, 40, 60]

// Total session durations (minutes)
const DURATIONS = [
  { mins: 5,  label: '5 min'  },
  { mins: 10, label: '10 min' },
  { mins: 20, label: '20 min' },
  { mins: 30, label: '30 min' },
  { mins: 45, label: '45 min' },
  { mins: 60, label: '1 hour' },
]

const YEARS = Array.from({ length: 12 }, (_, i) => String(2024 - i))

// ── Small components ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function Tag({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
      background: 'var(--bg-subtle)', color: 'var(--text-tert)',
    }}>
      {label}
    </span>
  )
}

function CountPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {QUESTION_COUNTS.map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          padding: '6px 14px', borderRadius: 10,
          fontSize: 13, fontWeight: 700,
          border: `2px solid ${value === n ? '#6366f1' : 'var(--border)'}`,
          background: value === n ? 'rgba(99,102,241,.08)' : 'var(--bg-card)',
          color: value === n ? '#6366f1' : 'var(--text-sec)',
          cursor: 'pointer', transition: 'all .12s',
        }}>
          {n}
        </button>
      ))}
    </div>
  )
}

function DurationPicker({ value, onChange }) {
  // value = null (untimed) or number of minutes
  const timed = value !== null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Toggle row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>
          {timed ? `${value} min session` : 'Choose a time'}
        </span>
        <button
          onClick={() => onChange(timed ? null : 20)}
          style={{
            width: 40, height: 22, borderRadius: 999, flexShrink: 0, position: 'relative',
            background: timed ? '#6366f1' : 'var(--bg-subtle)',
            border: `1.5px solid ${timed ? '#6366f1' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <div style={{
            position: 'absolute', top: 1,
            left: timed ? 'calc(100% - 20px)' : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left .15s',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }} />
        </button>
      </div>
      {/* Dropdown — only shown when timed is on */}
      {timed && (
        <select
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-prim)', outline: 'none' }}
        >
          {DURATIONS.map(d => (
            <option key={d.mins} value={d.mins}>{d.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ mode, selected, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        border: `2px solid ${selected ? '#6366f1' : 'var(--border)'}`,
        background: selected ? 'rgba(99,102,241,.04)' : 'var(--bg-card)',
        overflow: 'hidden', cursor: 'pointer', transition: 'all .14s',
        // No top accent line
      }}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Radio */}
          <div style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
            border: `2px solid ${selected ? '#6366f1' : 'var(--text-tert)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .14s',
          }}>
            {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{mode.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)' }}>{mode.label}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.5, marginBottom: 8 }}>{mode.desc}</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {mode.tags.map(t => <Tag key={t} label={t} />)}
            </div>
          </div>
        </div>

        {/* Expanded controls */}
        {selected && children && (
          <div
            style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PracticeSetupPage() {
  const router   = useRouter()
  const supabase = createClient()

  // ── Profile + subjects state ───────────────────────────────────────────────
  const [profileExamType, setProfileExamType] = useState(null) // null while loading
  const [allPaths,        setAllPaths]        = useState([])
  const [loadingData,     setLoadingData]     = useState(true)

  // ── Selection state ────────────────────────────────────────────────────────
  const [exam,          setExam]          = useState(null)    // set after profile loads
  const [subjects,      setSubjects]      = useState([])
  const [selectedSubj,  setSelectedSubj]  = useState(null)
  const [mode,          setMode]          = useState('topic')

  // Mode-specific controls
  const [topics,        setTopics]        = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedYear,  setSelectedYear]  = useState('')
  const [weakTopics,    setWeakTopics]    = useState([])
  const [loadingWeak,   setLoadingWeak]   = useState(false)
  const [selectedWeak,  setSelectedWeak]  = useState([])
  const [qCount,        setQCount]        = useState(20)
  const [duration,      setDuration]      = useState(null)   // total minutes; null = untimed

  // ── 1. Load profile + enrolled subjects once ───────────────────────────────
  // Strategy: try student_learning_paths first (has subject IDs + exam_type).
  // If empty (student skipped diagnostic or paths not yet built), fall back to
  // profile.subjects (string array) cross-referenced against the subjects table.
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load profile (for exam_type) and subjects (via robust API) in parallel
      const [{ data: prof }, subjectsRes] = await Promise.all([
        supabase.from('profiles').select('exam_type, subjects').eq('id', user.id).single(),
        fetch('/api/student/subjects'),
      ])
      const allSubjectsFromAPI = subjectsRes.ok ? await subjectsRes.json() : []

      const examType = prof?.exam_type ?? 'WAEC'
      setProfileExamType(examType)
      setExam(examType === 'JAMB' ? 'JAMB' : 'WAEC')

      // Shape API response into allPaths format for compatibility
      const fakePaths = (allSubjectsFromAPI ?? []).map(s => ({
        subject_id: s.id,
        subjects: {
          id:        s.id,
          name:      s.name,
          slug:      s.slug,
          exam_type: s.exam_type,
          is_active: true,
        },
      }))
      setAllPaths(fakePaths)
      setLoadingData(false)
    }
    load()
  }, []) // eslint-disable-line

  // ── 2. Derive visible exam tabs from profile ───────────────────────────────
  const examTabs = (() => {
    if (!profileExamType) return []
    if (profileExamType === 'BOTH') return [
      { key: 'WAEC', label: 'WAEC', sub: 'West African' },
      { key: 'JAMB', label: 'JAMB', sub: 'Uni entrance' },
    ]
    if (profileExamType === 'WAEC') return [{ key: 'WAEC', label: 'WAEC', sub: 'West African' }]
    if (profileExamType === 'JAMB') return [{ key: 'JAMB', label: 'JAMB', sub: 'Uni entrance' }]
    return [{ key: profileExamType, label: profileExamType, sub: '' }]
  })()

  // ── 3. Filter subjects by selected exam ───────────────────────────────────
  useEffect(() => {
    if (!exam) return
    setSelectedSubj(null)
    setTopics([])
    setSelectedTopic('')
    setWeakTopics([])
    setSelectedWeak([])

    const filtered = allPaths
      .map(p => p.subjects)
      .filter(s => s && s.is_active !== false)
      .map(s => ({ id: s.id, name: s.name, exam_type: s.exam_type, emoji: SUBJECT_ICONS[s.name] ?? '📝' }))
      // Deduplicate by name (a subject may appear in multiple paths)
      .filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i)
      .sort((a, b) => a.name.localeCompare(b.name))

    setSubjects(filtered)
  }, [exam, allPaths]) // eslint-disable-line

  // ── 4. Load topics when subject + mode=topic ───────────────────────────────
  useEffect(() => {
    if (!selectedSubj || mode !== 'topic') return
    setLoadingTopics(true)
    setSelectedTopic('')
    supabase.from('topics')
      .select('id, name, order_index')
      .eq('subject_id', selectedSubj.id)
      .order('order_index', { ascending: true, nullsLast: true })
      .order('name', { ascending: true })
      .then(({ data }) => { setTopics(data ?? []); setLoadingTopics(false) })
  }, [selectedSubj, mode]) // eslint-disable-line

  // ── 5. Load weak topics when mode=weak ────────────────────────────────────
  useEffect(() => {
    if (!selectedSubj || mode !== 'weak') return
    setLoadingWeak(true)
    setSelectedWeak([])
    async function loadWeak() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Get mastery for this subject's topics, sorted lowest first
      const { data: topicRows } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject_id', selectedSubj.id)
        .order('name', { ascending: true })
      const topicIds = (topicRows ?? []).map(t => t.id)
      if (!topicIds.length) { setWeakTopics([]); setLoadingWeak(false); return }

      const { data: mastery } = await supabase
        .from('student_topic_mastery')
        .select('topic_id, score')
        .eq('student_id', user.id)
        .in('topic_id', topicIds)

      const scoreMap = {}
      ;(mastery ?? []).forEach(r => { scoreMap[r.topic_id] = r.score ?? 100 })

      const sorted = (topicRows ?? []).map(t => ({
        id: t.id, name: t.name,
        score: scoreMap[t.id] ?? null, // null = never attempted
      })).sort((a, b) => {
        // Never attempted first, then by score asc
        if (a.score === null && b.score === null) return a.name.localeCompare(b.name)
        if (a.score === null) return -1
        if (b.score === null) return 1
        return a.score - b.score
      })

      setWeakTopics(sorted)
      setLoadingWeak(false)
    }
    loadWeak()
  }, [selectedSubj, mode]) // eslint-disable-line

  function toggleWeakTopic(id) {
    setSelectedWeak(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Validity ───────────────────────────────────────────────────────────────
  const canStart = (() => {
    if (!selectedSubj) return false
    if (mode === 'topic' && !selectedTopic) return false
    if (mode === 'year'  && !selectedYear)  return false
    if (mode === 'weak'  && selectedWeak.length === 0) return false
    return true
  })()

  // ── Start session ──────────────────────────────────────────────────────────
  function handleStart() {
    if (!canStart) return
    const config = {
      subjects:    [selectedSubj.name],
      subject_id:  selectedSubj.id,
      examType:    exam,
      count:       mode === 'mock' ? 50 : qCount,
      mode:        mode === 'mixed' ? 'practice' : mode,
      durationSecs: duration ? duration * 60 : null,
      ...(mode === 'topic' ? { topic_id: selectedTopic, topicName: topics.find(t => t.id === selectedTopic)?.name ?? '' } : {}),
      ...(mode === 'year'  ? { year: selectedYear } : {}),
      ...(mode === 'weak'  ? { weak_topic_ids: selectedWeak } : {}),
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page title row — inside layout content, NO second header ── */}
      {/* Page header — centred */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 24px' }}>
        <Link
          href="/student/practice"
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-subtle)', border: '1.5px solid var(--border)',
            color: 'var(--text-sec)', textDecoration: 'none',
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Set up practice
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>
            Based on your profile ·{' '}
            <Link href="/student/profile" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>
              Change in profile →
            </Link>
          </p>
        </div>
        {/* Spacer to keep title centred */}
        <div style={{ width: 34, flexShrink: 0 }} />
      </div>

      {/* ── BODY — extra bottom padding clears the sticky start button ── */}
      <div style={{ paddingBottom: 96, maxWidth: 560 }}>

        {/* ── 1. EXAM — only show tabs the profile has ── */}
        {examTabs.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Exam</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${examTabs.length}, 1fr)`, gap: 10 }}>
              {examTabs.map(e => (
                <button key={e.key} onClick={() => setExam(e.key)} style={{
                  padding: '14px 12px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                  border: `2px solid ${exam === e.key ? '#6366f1' : 'var(--border)'}`,
                  background: exam === e.key ? 'rgba(99,102,241,.07)' : 'var(--bg-card)',
                  transition: 'all .14s',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: exam === e.key ? '#6366f1' : 'var(--text-prim)' }}>{e.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: exam === e.key ? '#6366f1' : 'var(--text-tert)', opacity: .8 }}>{e.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. SUBJECT — from enrolled subjects only ── */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Subject</SectionLabel>
          {subjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', border: '2px dashed var(--border)', borderRadius: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-tert)' }}>
                No {exam} subjects in your profile yet.
              </p>
              <Link href="/student/profile" style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
                Add subjects in profile →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {subjects.map(s => {
                const active = selectedSubj?.id === s.id
                return (
                  <button key={s.id} onClick={() => setSelectedSubj(active ? null : s)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    border: `2px solid ${active ? '#6366f1' : 'var(--border)'}`,
                    background: active ? 'rgba(99,102,241,.07)' : 'var(--bg-card)',
                    transition: 'all .14s',
                  }}>
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#6366f1' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                    {active && (
                      <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" fill="#6366f1" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 3. PRACTICE MODE ── */}
        {selectedSubj && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Practice mode</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODES.map(m => (
                <ModeCard key={m.key} mode={m} selected={mode === m.key} onClick={() => setMode(m.key)}>

                  {/* ── Topic controls ── */}
                  {m.key === 'topic' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Select topic</p>
                        {loadingTopics ? (
                          <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>Loading topics…</p>
                        ) : (
                          <select
                            value={selectedTopic}
                            onChange={e => setSelectedTopic(e.target.value)}
                            style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-prim)', outline: 'none' }}
                          >
                            <option value="">Choose a topic…</option>
                            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Questions</p>
                        <CountPicker value={qCount} onChange={setQCount} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>
                          Session time 
                        </p>
                        <DurationPicker value={duration} onChange={setDuration} />
                      </div>
                    </div>
                  )}

                  {/* ── Year controls ── */}
                  {m.key === 'year' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Select year</p>
                        <select
                          value={selectedYear}
                          onChange={e => setSelectedYear(e.target.value)}
                          style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-prim)', outline: 'none' }}
                        >
                          <option value="">Choose a year…</option>
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {!selectedYear && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Pick a year to continue</p>}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Questions</p>
                        <CountPicker value={qCount} onChange={setQCount} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>
                          Session time 
                        </p>
                        <DurationPicker value={duration} onChange={setDuration} />
                      </div>
                    </div>
                  )}

                  {/* ── Weak areas controls ── */}
                  {m.key === 'weak' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>
                          Select topics to work on
                          {selectedWeak.length > 0 && <span style={{ color: '#6366f1', marginLeft: 6 }}>({selectedWeak.length} selected)</span>}
                        </p>
                        {loadingWeak ? (
                          <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>Loading topics…</p>
                        ) : weakTopics.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>No topics found for this subject.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                            {weakTopics.map(t => {
                              const picked = selectedWeak.includes(t.id)
                              const scoreLabel = t.score === null ? 'Not tried yet' : `${t.score}% score`
                              const scoreBg    = t.score === null ? 'rgba(99,102,241,.08)' : t.score < 40 ? 'rgba(239,68,68,.08)' : t.score < 70 ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.08)'
                              const scoreColor = t.score === null ? '#6366f1' : t.score < 40 ? '#ef4444' : t.score < 70 ? '#f59e0b' : '#22c55e'
                              return (
                                <button key={t.id} onClick={() => toggleWeakTopic(t.id)} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '9px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                                  border: `1.5px solid ${picked ? '#6366f1' : 'var(--border)'}`,
                                  background: picked ? 'rgba(99,102,241,.06)' : 'var(--bg-base)',
                                  transition: 'all .1s',
                                }}>
                                  <div style={{
                                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                    border: `2px solid ${picked ? '#6366f1' : 'var(--border)'}`,
                                    background: picked ? '#6366f1' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {picked && <svg width="9" height="9" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
                                  </div>
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.name}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: scoreBg, color: scoreColor, flexShrink: 0 }}>
                                    {scoreLabel}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Questions</p>
                        <CountPicker value={qCount} onChange={setQCount} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>
                          Session time 
                        </p>
                        <DurationPicker value={duration} onChange={setDuration} />
                      </div>
                    </div>
                  )}

                  {/* ── Mixed controls ── */}
                  {m.key === 'mixed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>Questions</p>
                        <CountPicker value={qCount} onChange={setQCount} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 6 }}>
                          Session time 
                        </p>
                        <DurationPicker value={duration} onChange={setDuration} />
                      </div>
                    </div>
                  )}

                  {/* ── Mock exam info ── */}
                  {m.key === 'mock' && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.5 }}>
                        50 questions distributed across topics, exactly as in the real {exam} exam. Time is set automatically.
                      </p>
                    </div>
                  )}
                </ModeCard>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── STICKY START BUTTON — bottom nav is hidden on this page ── */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          padding: '12px 20px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16,
            fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em',
            background: canStart ? '#6366f1' : 'var(--bg-subtle)',
            color: canStart ? '#fff' : 'var(--text-tert)',
            border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 0 #4338ca, 0 6px 20px rgba(99,102,241,.3)' : 'none',
            transform: 'none', transition: 'all .12s',
          }}
          onMouseDown={e => { if (canStart) e.currentTarget.style.transform = 'translateY(3px)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
        >
          {canStart ? '▶ Start practice' : (!selectedSubj ? 'Choose a subject to continue' : 'Complete setup to continue')}
        </button>
      </div>

      {/* Desktop: inline button below content */}
      <div className="hidden lg:block" style={{ maxWidth: 560, paddingBottom: 40 }}>
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16,
            fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em',
            background: canStart ? '#6366f1' : 'var(--bg-subtle)',
            color: canStart ? '#fff' : 'var(--text-tert)',
            border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 0 #4338ca' : 'none',
            transition: 'all .12s',
          }}
        >
          {canStart ? '▶ Start practice' : (!selectedSubj ? 'Choose a subject to continue' : 'Complete setup to continue')}
        </button>
      </div>

    </div>
  )
}