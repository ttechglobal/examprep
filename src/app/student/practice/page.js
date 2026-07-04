'use client'
// src/app/student/practice/page.js — REDESIGN
// Practice-first approach: arrive → one tap → practising.
//
// FLOW:
//   1. Page loads → shows subject pills (auto-selects first subject)
//   2. Below subject: "Next core topic" surfaced automatically
//   3. ONE "Start Practising →" button — that's it for happy path
//   4. Optional expand: "More options" → question count + mode chips (no sheet/modal)
//   5. Progress section inline below the fold (no separate tab)
//
// NO bottom sheets. NO modals. NO multi-step setup.
// Everything is inline, one scroll.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ── Subject accent colours (inline styles only) ───────────────────────────────
const ACCENT = {
  'Chemistry':             '#9b7ae0',
  'Physics':               '#ff8fab',
  'Biology':               '#6cce8e',
  'Mathematics':           '#5cb8ea',
  'Further Mathematics':   '#5cb8ea',
  'English Language':      '#a78bfa',
  'Use of English':        '#a78bfa',
  'Economics':             '#fcd34d',
  'Government':            '#f87171',
  'Geography':             '#34d399',
  'Literature in English': '#f9a8d4',
  'Agricultural Science':  '#86efac',
  'Commerce':              '#818cf8',
  'Accounting':            '#fde68a',
  'default':               '#9b7ae0',
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

// ── 3D navy button ────────────────────────────────────────────────────────────
function StartBtn({ onClick, disabled, children }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '16px 0', borderRadius: 14,
        background: '#0b1330', color: '#fff',
        fontSize: 16, fontWeight: 800, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        letterSpacing: '-0.01em',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p
          ? '0 3px 0 #05070f'
          : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,0.15)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {children}
    </button>
  )
}

export default function PracticePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [subjects,      setSubjects]     = useState([])  // { id, name, pct }
  const [profile,       setProfile]      = useState(null)
  const [activeSubject, setActive]       = useState(null)
  const [nextTopic,     setNextTopic]    = useState(null) // { id, name, isCore }
  const [topicLoading,  setTopicLoading] = useState(false)
  const [count,         setCount]        = useState(10)
  const [showOptions,   setShowOptions]  = useState(false)
  const [loading,       setLoading]      = useState(true)
  const [starting,      setStarting]     = useState(false)

  // ── Load subjects ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: paths }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress')
          .select('subtopic_id, completed').eq('student_id', user.id),
      ])

      setProfile(prof)

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(path => {
        const ids  = path.ordered_subtopic_ids ?? []
        const done = ids.filter(id => completedIds.has(id)).length
        const pct  = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
        return { id: path.subject_id, name: path.subjects?.name ?? '', pct, subjectObj: path.subjects }
      })

      setSubjects(enriched)
      if (enriched.length > 0) setActive(enriched[0])
      setLoading(false)
    }
    load()
  }, [])

  // ── Load next core topic when subject changes ────────────────────────────
  useEffect(() => {
    if (!activeSubject) return
    setNextTopic(null)
    setTopicLoading(true)
    fetch('/api/student/study-plan')
      .then(r => r.json())
      .then(data => {
        const items = data.items ?? []
        const match = items.find(
          i => i.subjectId === activeSubject.id && i.status !== 'mastered'
        )
        setNextTopic(match ?? null)
        setTopicLoading(false)
      })
      .catch(() => setTopicLoading(false))
  }, [activeSubject?.id])

  // ── Start session ─────────────────────────────────────────────────────────
  function startSession(overrides = {}) {
    if (!activeSubject) return
    setStarting(true)
    const config = {
      subjects:  [activeSubject.name],
      subject_id: activeSubject.id,
      examType:  profile?.exam_type ?? 'WAEC',
      count,
      mode:      'topic',
      topicName: nextTopic?.topicName ?? null,
      topic_id:  nextTopic?.topicId   ?? null,
      isCore:    nextTopic?.isCore     ?? false,
      ...overrides,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (subjects.length === 0) return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-black text-primary">Practise</h1>
        <p className="text-sm text-secondary mt-1">Add subjects to start practising</p>
      </div>
      <div className="bg-card border border-default rounded-2xl p-6 text-center space-y-4">
        <p className="text-3xl">📚</p>
        <div>
          <p className="font-black text-primary">No subjects yet</p>
          <p className="text-sm text-secondary mt-1">Go to your profile and add the subjects you're studying.</p>
        </div>
        <Link href="/student/profile" className="block w-full py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black text-center">
          Set up my subjects →
        </Link>
      </div>
    </div>
  )

  const accent     = getAccent(activeSubject?.name)
  const icon       = getIcon(activeSubject?.name)
  const pct        = activeSubject?.pct ?? 0
  const pctColor   = pct >= 70 ? '#6cce8e' : pct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-5 pb-24">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-black text-primary">Practise</h1>
        <p className="text-sm text-secondary mt-0.5">Pick a subject and start immediately</p>
      </div>

      {/* ── Subject pills ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {subjects.map(sub => {
          const a  = getAccent(sub.name)
          const on = activeSubject?.id === sub.id
          return (
            <button
              key={sub.id}
              onClick={() => { setActive(sub); setShowOptions(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 30, flexShrink: 0,
                background: on ? `${a}18` : 'var(--color-card)',
                border: `2px solid ${on ? a : 'var(--color-border-default)'}`,
                cursor: 'pointer', transition: 'all .15s',
                boxShadow: on ? `0 0 0 3px ${a}22` : 'none',
              }}
            >
              <span style={{ fontSize: 14 }}>{getIcon(sub.name)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: on ? a : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                {sub.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Hero practice card ── */}
      {activeSubject && (
        <div style={{
          borderRadius: 22, overflow: 'hidden',
          border: `1px solid ${accent}30`,
          boxShadow: `0 8px 32px ${accent}15`,
        }}>
          <div style={{
            // Subtle dark gradient — NOT distracting, just enough depth
            background: 'linear-gradient(170deg, #141420 0%, #0d0e14 100%)',
            padding: '22px 20px 20px',
            position: 'relative',
          }}>
            {/* Very subtle accent glow in top-right corner only */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* Subject + mastery */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 13,
                  background: `${accent}18`, border: `1px solid ${accent}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent, marginBottom: 1 }}>
                    {profile?.exam_type ?? 'WAEC'}
                  </p>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    {activeSubject.name}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: pctColor }}>{pct}%</p>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,.35)' }}>
                  mastered
                </p>
              </div>
            </div>

            {/* Next topic to practise */}
            <div style={{
              background: 'rgba(255,255,255,.05)',
              border: `1px solid ${accent}22`,
              borderRadius: 12, padding: '11px 13px',
              marginBottom: 16, position: 'relative', zIndex: 1,
              minHeight: 54,
            }}>
              {topicLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${accent}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Finding your next topic…</span>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : nextTopic ? (
                <>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.35)', marginBottom: 3 }}>
                    {nextTopic.isCore ? '🔥 Core topic · High exam frequency' : 'Next topic'}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{nextTopic.topicName}</p>
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

            {/* THE CTA — one big button */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <StartBtn onClick={() => startSession()} disabled={starting}>
                {starting ? 'Loading…' : `Practise Now →`}
              </StartBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── More options (collapsed by default) ── */}
      <div>
        <button
          onClick={() => setShowOptions(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-card border border-default rounded-2xl text-sm font-bold text-secondary hover:text-primary transition-colors"
        >
          <span>More options</span>
          <span style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
        </button>

        {showOptions && (
          <div className="mt-2 bg-card border border-default rounded-2xl p-4 space-y-4">
            {/* Question count */}
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">Questions</p>
              <div className="flex gap-2">
                {[5, 10, 20, 30].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10,
                      fontSize: 13, fontWeight: 800,
                      background: count === n ? '#0b1330' : 'var(--color-subtle)',
                      color: count === n ? '#fff' : 'var(--color-text-secondary)',
                      border: count === n ? '2px solid #0b1330' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all .12s',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode buttons */}
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'topic',  label: 'Topic',      icon: '🎯', desc: 'Core topics first' },
                  { mode: 'timed',  label: 'Timed',      icon: '⏱️', desc: `${count * 1.5 | 0} mins` },
                  { mode: 'mock',   label: 'Mock Exam',  icon: '📝', desc: 'Full simulation'   },
                ].map(({ mode, label, icon, desc }) => (
                  <button
                    key={mode}
                    onClick={() => startSession({ mode, durationSecs: mode === 'timed' ? count * 90 : 0 })}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-subtle border border-default hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs font-black text-primary">{label}</span>
                    <span className="text-[10px] text-secondary">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Inline progress ── */}
      {subjects.length > 0 && (
        <div className="bg-card border border-default rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-default">
            <span className="text-xs font-black text-secondary uppercase tracking-wide">Subject Mastery</span>
            <Link href="/student/progress" className="text-xs font-bold text-indigo-500 hover:underline">
              Full progress →
            </Link>
          </div>
          <div className="px-4 py-4 space-y-4">
            {subjects.map(sub => {
              const a  = getAccent(sub.name)
              const pc = sub.pct ?? 0
              const pcColor = pc >= 70 ? '#6cce8e' : pc >= 40 ? '#f59e0b' : '#ef4444'
              return (
                <div key={sub.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13 }}>{getIcon(sub.name)}</span>
                      <span className="text-sm font-bold text-primary">{sub.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: pcColor }}>{pc}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--color-subtle)' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: a, width: `${Math.max(pc, 2)}%`, transition: 'width .7s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}