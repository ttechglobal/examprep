'use client'
// src/app/student/practice/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs v1:
//   1. Topic loads from /api/student/next-topic (mastery-based, fast)
//      instead of /api/student/study-plan (slow, deprecated for this use)
//   2. "Practise Now" opens a bottom-sheet modal — user confirms/adjusts before
//      going to session. Subject + topic are pre-filled, all editable.
//   3. Mock Exam button correctly routes to /student/exam/session (not practice/session)
//   4. Other mode buttons (Timed, Weak Topics) route to practice/session correctly
//   5. Study plan references removed — everything reads from topic mastery
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ── Subject config ─────────────────────────────────────────────────────────────
const ACCENT = {
  'Chemistry': '#9b7ae0', 'Physics': '#ff8fab', 'Biology': '#6cce8e',
  'Mathematics': '#5cb8ea', 'Further Mathematics': '#5cb8ea',
  'English Language': '#a78bfa', 'Use of English': '#a78bfa',
  'Economics': '#fcd34d', 'Government': '#f87171', 'Geography': '#34d399',
  'Literature in English': '#f9a8d4', 'Agricultural Science': '#86efac',
  'Commerce': '#818cf8', 'Accounting': '#fde68a', 'default': '#9b7ae0',
}
const ICON = {
  'Chemistry': '⚗️', 'Physics': '⚡', 'Biology': '🧬',
  'Mathematics': '📐', 'Further Mathematics': '📐',
  'English Language': '📖', 'Use of English': '📖',
  'Economics': '📊', 'Government': '🏛️', 'Geography': '🌍',
  'Literature in English': '📚', 'Agricultural Science': '🌱',
  'Commerce': '💼', 'Accounting': '🧮', 'default': '📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => ICON[n]   ?? ICON.default

// ── 3D press button ───────────────────────────────────────────────────────────
function PressBtn({ onClick, disabled, children, style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '15px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff', fontSize: 15, fontWeight: 800,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, letterSpacing: '-0.01em',
        transform: p && !disabled ? 'translateY(3px)' : 'none',
        boxShadow: p && !disabled ? '0 3px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.15)',
        transition: 'transform .1s, box-shadow .1s',
        ...style,
      }}>
      {children}
    </button>
  )
}

// ── Practice config modal (bottom sheet) ──────────────────────────────────────
function PracticeModal({ subject, topic, profile, subjects, onClose, onStart }) {
  const [selSubject, setSelSubject] = useState(subject)
  const [count,      setCount]      = useState(10)
  const [mode,       setMode]       = useState('topic')
  const accent = getAccent(selSubject?.name ?? '')

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleStart() {
    onStart({
      subject:  selSubject,
      count,
      mode,
      topic: selSubject?.id === subject?.id ? topic : null,
    })
  }

  const modes = [
    { key: 'topic',  label: 'Topic drill',   icon: '🎯', desc: 'Focus on one topic' },
    { key: 'mixed',  label: 'Mixed',          icon: '🔀', desc: 'Across all topics' },
    { key: 'weak',   label: 'Weak topics',    icon: '📈', desc: 'Your lowest scores' },
    { key: 'timed',  label: 'Timed',          icon: '⏱️', desc: `${Math.round(count * 1.5)} min` },
  ]

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1px solid var(--border)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,.2)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong, var(--border))' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>
                Start Practising
              </p>
              {topic && selSubject?.id === subject?.id && (
                <p style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 2 }}>
                  <span style={{ color: accent, fontWeight: 700 }}>{topic.topicName}</span>
                  {topic.isCore && <span style={{ marginLeft: 6, fontSize: 10, color: '#ffc36b' }}>🔥 Core topic</span>}
                </p>
              )}
            </div>
            <button onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-tert)', fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Subject selector */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>
              Subject
            </p>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
              {subjects.map(sub => {
                const a  = getAccent(sub.name)
                const on = selSubject?.id === sub.id
                return (
                  <button key={sub.id} onClick={() => setSelSubject(sub)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 13px', borderRadius: 999, flexShrink: 0,
                      background: on ? `${a}18` : 'var(--bg-subtle)',
                      border: `2px solid ${on ? a : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all .13s',
                    }}>
                    <span style={{ fontSize: 13 }}>{getIcon(sub.name)}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: on ? a : 'var(--text-sec)', whiteSpace: 'nowrap' }}>
                      {sub.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>
              Mode
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {modes.map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  style={{
                    padding: '12px 10px', borderRadius: 14, cursor: 'pointer',
                    textAlign: 'left', transition: 'all .13s',
                    background: mode === m.key ? 'var(--active-bg, rgba(75,86,210,.1))' : 'var(--bg-subtle)',
                    border: `2px solid ${mode === m.key ? 'var(--active-border, #4b56d2)' : 'var(--border)'}`,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                  <span style={{ fontSize: 18 }}>{m.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: mode === m.key ? 'var(--active-text, #4b56d2)' : 'var(--text-prim)' }}>
                    {m.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tert)' }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>
              Questions
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[5, 10, 20, 30].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 11,
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    transition: 'all .12s',
                    background: count === n ? '#0b1330' : 'var(--bg-subtle)',
                    color: count === n ? '#fff' : 'var(--text-sec)',
                    border: `2px solid ${count === n ? '#0b1330' : 'var(--border)'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pinned start button */}
        <div style={{
          flexShrink: 0, padding: '12px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          <PressBtn onClick={handleStart}>
            Start {count} Questions →
          </PressBtn>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [subjects,     setSubjects]    = useState([])
  const [profile,      setProfile]     = useState(null)
  const [activeSubject,setActive]      = useState(null)
  const [nextTopics,   setNextTopics]  = useState({})  // subjectId → topic info
  const [topicLoading, setTopicLoading]= useState(false)
  const [loading,      setLoading]     = useState(true)
  const [showModal,    setShowModal]   = useState(false)

  // ── Load subjects + mastery-based topic ────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: paths }, masteryRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, subjects(id, name)')
          .eq('student_id', user.id),
        fetch('/api/student/next-topic'),
      ])

      setProfile(prof)

      const enriched = (paths ?? []).map(p => ({
        id:   p.subject_id,
        name: p.subjects?.name ?? '',
        subjectObj: p.subjects,
      }))

      setSubjects(enriched)
      if (enriched.length > 0) setActive(enriched[0])

      if (masteryRes.ok) {
        const data = await masteryRes.json()
        setNextTopics(data.topics ?? {})
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // ── Start session (practice) ───────────────────────────────────────────────
  function startSession({ subject, count, mode, topic }) {
    const sub = subject ?? activeSubject
    if (!sub) return
    const nextTopic = topic ?? nextTopics[sub.id] ?? null
    const config = {
      subjects:   [sub.name],
      subject_id: sub.id,
      examType:   profile?.exam_type ?? 'WAEC',
      count,
      mode,
      topicName:  nextTopic?.topicName ?? null,
      topic_id:   nextTopic?.topicId   ?? null,
      isCore:     nextTopic?.isCore    ?? false,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setShowModal(false)
    router.push('/student/practice/session')
  }

  // ── Start mock exam ────────────────────────────────────────────────────────
  // Mock exam goes to /student/exam (setup page) not practice/session
  function goToMockExam() {
    router.push('/student/exam')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--active-border, #4b56d2)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (subjects.length === 0) return (
    <div style={{ padding: '0 0 32px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em', marginBottom: 4 }}>
        Practise
      </h1>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', marginTop: 16 }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
        <p style={{ fontWeight: 900, color: 'var(--text-prim)', marginBottom: 6 }}>No subjects yet</p>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: 20 }}>
          Add subjects in your profile to start practising.
        </p>
        <Link href="/student/profile" style={{ display: 'block', padding: '13px 0', background: '#0b1330', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none', textAlign: 'center' }}>
          Set up my subjects →
        </Link>
      </div>
    </div>
  )

  const accent    = getAccent(activeSubject?.name ?? '')
  const topic     = nextTopics[activeSubject?.id] ?? null

  return (
    <div style={{ paddingBottom: 96 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>
          Practise
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-sec)', marginTop: 3 }}>
          Pick a subject and start immediately
        </p>
      </div>

      {/* Subject pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {subjects.map(sub => {
          const a  = getAccent(sub.name)
          const on = activeSubject?.id === sub.id
          return (
            <button key={sub.id} onClick={() => setActive(sub)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 30, flexShrink: 0,
                background: on ? `${a}18` : 'var(--bg-card)',
                border: `2px solid ${on ? a : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all .15s',
                boxShadow: on ? `0 0 0 3px ${a}22` : 'none',
              }}>
              <span style={{ fontSize: 14 }}>{getIcon(sub.name)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: on ? a : 'var(--text-sec)', whiteSpace: 'nowrap' }}>
                {sub.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Hero practice card */}
      {activeSubject && (
        <div style={{
          borderRadius: 22, overflow: 'hidden',
          border: `1px solid ${accent}30`,
          boxShadow: `0 8px 32px ${accent}15`,
          marginBottom: 14,
        }}>
          <div style={{
            background: 'linear-gradient(170deg, #141420 0%, #0d0e14 100%)',
            padding: '22px 20px 20px', position: 'relative',
          }}>
            {/* Accent glow */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* Subject + mastery header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: `${accent}18`, border: `1px solid ${accent}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                {getIcon(activeSubject.name)}
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent, marginBottom: 1 }}>
                  {profile?.exam_type ?? 'WAEC'}
                </p>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {activeSubject.name}
                </p>
              </div>
            </div>

            {/* Next topic card */}
            <div style={{
              background: 'rgba(255,255,255,.05)', border: `1px solid ${accent}22`,
              borderRadius: 12, padding: '11px 13px', marginBottom: 16,
              position: 'relative', zIndex: 1, minHeight: 52,
            }}>
              {topic ? (
                <>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.35)', marginBottom: 3 }}>
                    {topic.isCore ? '🔥 Core topic · High exam frequency' : '📖 Next topic'}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{topic.topicName}</p>
                  {topic.score > 0 && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>
                      Current mastery: {topic.score}%
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.35)', marginBottom: 3 }}>
                    Mixed practice
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Questions across all topics</p>
                </>
              )}
            </div>

            {/* Practise Now → opens modal */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <PressBtn onClick={() => setShowModal(true)}>
                Practise Now →
              </PressBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Other practice modes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>

        {/* Timed practice */}
        <button
          onClick={() => {
            if (!activeSubject) return
            const nextTopic = nextTopics[activeSubject?.id] ?? null
            sessionStorage.setItem('practice_config', JSON.stringify({
              subjects:   [activeSubject.name],
              subject_id: activeSubject.id,
              examType:   profile?.exam_type ?? 'WAEC',
              count:      20,
              mode:       'timed',
              durationSecs: 1200, // 20 min
              topicName:  nextTopic?.topicName ?? null,
              topic_id:   nextTopic?.topicId   ?? null,
            }))
            router.push('/student/practice/session')
          }}
          style={{
            padding: '16px 14px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            transition: 'border-color .15s',
          }}
        >
          <p style={{ fontSize: 22, marginBottom: 6 }}>⏱️</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>Timed</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>20 questions · 20 min</p>
        </button>

        {/* Mock Exam — correctly goes to /student/exam setup */}
        <button
          onClick={goToMockExam}
          style={{
            padding: '16px 14px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            transition: 'border-color .15s',
          }}
        >
          <p style={{ fontSize: 22, marginBottom: 6 }}>📝</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>Mock Exam</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Full simulation · WAEC/JAMB</p>
        </button>

        {/* Weak topics */}
        <button
          onClick={() => {
            if (!activeSubject) return
            sessionStorage.setItem('practice_config', JSON.stringify({
              subjects:   [activeSubject.name],
              subject_id: activeSubject.id,
              examType:   profile?.exam_type ?? 'WAEC',
              count:      15,
              mode:       'weak',
            }))
            router.push('/student/practice/session')
          }}
          style={{
            padding: '16px 14px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            transition: 'border-color .15s',
          }}
        >
          <p style={{ fontSize: 22, marginBottom: 6 }}>📈</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>Weak Topics</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Your lowest mastery areas</p>
        </button>

        {/* Random / mixed */}
        <button
          onClick={() => {
            if (!activeSubject) return
            sessionStorage.setItem('practice_config', JSON.stringify({
              subjects:   [activeSubject.name],
              subject_id: activeSubject.id,
              examType:   profile?.exam_type ?? 'WAEC',
              count:      10,
              mode:       'mixed',
            }))
            router.push('/student/practice/session')
          }}
          style={{
            padding: '16px 14px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            transition: 'border-color .15s',
          }}
        >
          <p style={{ fontSize: 22, marginBottom: 6 }}>🔀</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>Mixed</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Random across all topics</p>
        </button>
      </div>

      {/* Subject mastery inline */}
      <Link href="/student/progress" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>View full progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-tert)' }}>›</span>
        </div>
      </Link>

      {/* Practice config modal */}
      {showModal && activeSubject && (
        <PracticeModal
          subject={activeSubject}
          topic={topic}
          profile={profile}
          subjects={subjects}
          onClose={() => setShowModal(false)}
          onStart={startSession}
        />
      )}
    </div>
  )
}