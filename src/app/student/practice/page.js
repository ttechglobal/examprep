'use client'
// src/app/student/practice/page.js — v11
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs v10:
//  • PracticeSetupModal: when subjects list changes, default-select English /
//    Use of English for JAMB (was always picking subjects[0] which could be
//    anything). Falls back to subjects[0] if no English subject found.
//  • fetchSubjectsForExam: no loading spinner when result is already cached —
//    swaps instantly from cache, spinner only on genuine network fetch.
//  • PracticeSetupModal: saves last-selected subject to sessionStorage on
//    every "go()" call, and restores it on mount so students don't lose
//    their pick when navigating away and back.
//  • loadingSubjects prop now accepted cleanly — was missing from dashboard
//    usage which caused console warning.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CoachBanner from '@/components/ui/CoachBanner'
import { practiceCoach } from '@/lib/coach'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { lazy, Suspense } from 'react'
const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => ICON[n]   ?? ICON.default

const isRealId = id => id && id !== '00000000-0000-0000-0000-000000000001' && /^[0-9a-f-]{36}$/.test(id)

const MODES = [
  { key: 'quick5', icon: '⚡', label: 'Quick 5',     color: '#1264E5', desc: '5 random questions · ~4 min' },
  { key: 'weak',   icon: '🎯', label: 'Weak areas',  color: '#f87171', desc: 'Focus on your lowest scores' },
  { key: 'mixed',  icon: '🌀', label: 'Mixed',        color: '#18B7F2', desc: 'All topics shuffled' },
  { key: 'timed',  icon: '⏱️', label: 'Speed round', color: '#4ade80', desc: 'Race against the clock' },
  { key: 'mock',   icon: '📝', label: 'Mock exam',    color: '#FFB800', desc: 'Full timed simulation' },
]

// ── Session storage helpers ───────────────────────────────────────────────────
const LAST_SUBJECT_KEY = 'exl_last_practice_subject'

function saveLastSubject(subject) {
  try {
    if (subject?.id) sessionStorage.setItem(LAST_SUBJECT_KEY, JSON.stringify({ id: subject.id, name: subject.name }))
  } catch {}
}

function loadLastSubject() {
  try {
    const raw = sessionStorage.getItem(LAST_SUBJECT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── Pick the best default subject for a given exam + subjects list ─────────────
// JAMB: prefer "Use of English" (always required), then "English Language"
// WAEC: prefer "English Language", then first subject
// Falls back to subjects[0] for any other case
function pickDefaultSubject(subjects, exam) {
  if (!subjects.length) return null

  // First try to restore from sessionStorage
  const saved = loadLastSubject()
  if (saved) {
    const match = subjects.find(s => s.id === saved.id)
    if (match) return match
  }

  // For JAMB, default to Use of English (always required)
  if (exam === 'JAMB') {
    const useOfEnglish = subjects.find(s => s.name === 'Use of English')
    if (useOfEnglish) return useOfEnglish
    const englishLang = subjects.find(s => /english/i.test(s.name))
    if (englishLang) return englishLang
  }

  // For WAEC, prefer English Language
  if (exam === 'WAEC') {
    const englishLang = subjects.find(s => s.name === 'English Language')
    if (englishLang) return englishLang
  }

  return subjects[0]
}

// ── Press button ──────────────────────────────────────────────────────────────
function PressBtn({ onClick, children, color = '#1264E5', shadowColor = '#0a3fa0', style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)} onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
        cursor: 'pointer', background: color, color: '#fff',
        fontSize: 14, fontWeight: 900, letterSpacing: '-.015em',
        transform: p ? 'translateY(2px)' : '',
        boxShadow: p ? `0 2px 0 ${shadowColor}` : `0 5px 0 ${shadowColor}, 0 8px 20px ${color}30`,
        transition: 'transform .1s, box-shadow .1s',
        position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
        ...style,
      }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />
      {children}
    </button>
  )
}

// ── Subject grid ──────────────────────────────────────────────────────────────
function SubjectGrid({ subjects, selected, onSelect }) {
  if (!subjects.length) return (
    <div style={{ padding: '16px 12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>No subjects found for this exam.</p>
      <Link href="/student/profile" style={{ fontSize: 11, color: '#18B7F2', fontWeight: 700, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
        Add subjects in your profile →
      </Link>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {subjects.map(sub => {
        const a = getAccent(sub.name)
        const on = selected?.id === sub.id
        return (
          <button key={sub.id} onClick={() => onSelect(sub)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 11px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', background: on ? `${a}14` : 'var(--bg-subtle)', border: `2px solid ${on ? a : 'var(--border)'}`, transition: 'all .12s', textAlign: 'left' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${a}18`, border: `1px solid ${a}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{getIcon(sub.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: on ? a : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</p>
            </div>
            {on && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={a}/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          </button>
        )
      })}
    </div>
  )
}

// ── Practice Setup Modal ──────────────────────────────────────────────────────
export function PracticeSetupModal({ subjects, loadingSubjects, profile, initialMode = 'quick5', onClose, onStart, onMockExam, exam, onExamChange }) {
  const [mode,      setMode]      = useState(initialMode)
  const [subject,   setSubject]   = useState(null)
  const [count,     setCount]     = useState(5)
  const [topicId,   setTopicId]   = useState(null)
  const [topicName, setTopicName] = useState(null)
  const [allTopics, setAllTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [timeMin,   setTimeMin]   = useState(10)

  // When subjects or exam changes, pick the best default subject:
  // - Restore from sessionStorage first (user's last pick)
  // - Then prefer English / Use of English depending on exam
  // - Fall back to subjects[0]
  // Only resets if the current subject is no longer in the list
  useEffect(() => {
    if (subjects.length === 0) {
      setSubject(null)
      return
    }
    // Keep current selection if it's still valid for the new list
    if (subject && subjects.find(s => s.id === subject.id)) return
    // Otherwise pick the best default
    setSubject(pickDefaultSubject(subjects, exam))
  }, [subjects, exam]) // eslint-disable-line

  const accent   = getAccent(subject?.name ?? '')
  const modeMeta = MODES.find(m => m.key === mode)

  useEffect(() => {
    if (mode !== 'weak' || !subject?.id || !isRealId(subject.id)) return
    setLoadingTopics(true)
    setTopicId(null); setTopicName(null)
    createClient().from('topics')
      .select('id, name, is_core, order_index')
      .eq('subject_id', subject.id)
      .order('order_index', { nullsLast: true })
      .order('name')
      .then(({ data }) => { setAllTopics(data ?? []); setLoadingTopics(false) })
  }, [mode, subject?.id]) // eslint-disable-line

  function go() {
    if (!subject) return
    // Save selection for next time
    saveLastSubject(subject)

    if (mode === 'mock') { onMockExam?.(); return }
    if (mode === 'quick5') {
      onStart({ subject, type: 'mixed', count: 5, answerMode: 'practice', topic: null, duration: null })
      return
    }
    if (mode === 'weak') {
      onStart({ subject, type: 'weak', count: 5, answerMode: 'practice', topic: topicId ? { topicId, topicName } : null, duration: null })
      return
    }
    if (mode === 'mixed') {
      onStart({ subject, type: 'mixed', count, answerMode: 'practice', topic: null, duration: null })
      return
    }
    if (mode === 'timed') {
      onStart({ subject, type: 'mixed', count, answerMode: 'practice', topic: null, duration: timeMin * 60 })
      return
    }
  }

  const ctaLabel = mode === 'mock'   ? 'Set up mock exam →'
    : mode === 'quick5' ? '▶ Start Quick 5 now'
    : mode === 'weak'   ? '▶ Start practice'
    : mode === 'timed'  ? `▶ Start ${timeMin}-minute sprint`
    : `▶ Start ${count} questions`

  const ctaColor  = mode === 'mock' ? '#FFB800' : mode === 'timed' ? '#4ade80' : mode === 'weak' ? '#f87171' : accent || '#1264E5'
  const ctaShadow = mode === 'mock' ? '#b85000' : mode === 'timed' ? '#16a34a' : mode === 'weak' ? '#b91c1c' : '#0a3fa0'

  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Handle (mobile only) */}
      <div className="modal-handle" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '10px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{modeMeta?.icon}</span>
              <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.02em' }}>{modeMeta?.label}</p>
              <span style={{ fontSize: 11, color: 'var(--text-tert)' }}>{modeMeta?.desc}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* WAEC/JAMB switcher */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 9, padding: 3, border: '1px solid var(--border)' }}>
              {['WAEC', 'JAMB'].map(e => (
                <button key={e} onClick={() => onExamChange?.(e)}
                  style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? '#1264E5' : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', transition: 'all .12s' }}>
                  {e}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, fontSize: 13, cursor: 'pointer', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tert)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Subject grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>
              {exam} subjects
            </span>
            <button onClick={() => { onClose(); setTimeout(() => document.dispatchEvent(new CustomEvent('open-goal-modal')), 50) }}
              style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Change subjects →
            </button>
          </div>
          {loadingSubjects ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #1264E5', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize: 12, color: 'var(--text-tert)' }}>Loading {exam} subjects…</span>
            </div>
          ) : (
            <SubjectGrid subjects={subjects} selected={subject} onSelect={setSubject} />
          )}
        </div>

        {/* Mode-specific options */}
        {mode === 'quick5' && (
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(18,100,229,.08)', border: '1px solid rgba(18,100,229,.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 3 }}>⚡ 5 random questions · Mixed topics</p>
            <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>Fast, focused, ~4 minutes. Perfect for daily practice.</p>
          </div>
        )}

        {mode === 'weak' && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 10 }}>
              Topic <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>— leave blank to auto-pick weakest</span>
            </span>
            {!subject || !isRealId(subject.id) ? (
              <p style={{ fontSize: 12, color: 'var(--text-tert)', padding: '8px 0' }}>Pick a subject above to see topics.</p>
            ) : loadingTopics ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${accent}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--text-tert)' }}>Loading topics…</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                <button onClick={() => { setTopicId(null); setTopicName(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: !topicId ? `${accent}14` : 'var(--bg-subtle)', border: `1.5px solid ${!topicId ? accent : 'var(--border)'}`, transition: 'all .12s', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 12, fontWeight: !topicId ? 800 : 500, color: !topicId ? accent : 'var(--text-tert)' }}>Auto — weakest topic for me</span>
                </button>
                {allTopics.map(t => (
                  <button key={t.id} onClick={() => { setTopicId(t.id); setTopicName(t.name) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: topicId === t.id ? `${accent}14` : 'var(--bg-subtle)', border: `1.5px solid ${topicId === t.id ? accent : 'var(--border)'}`, transition: 'all .12s', fontFamily: 'inherit' }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: topicId === t.id ? 800 : 500, color: topicId === t.id ? 'var(--text-prim)' : 'var(--text-sec)' }}>{t.name}</span>
                    {t.is_core && <span style={{ fontSize: 9, fontWeight: 700, color: '#ffc36b', flexShrink: 0 }}>Core</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(mode === 'mixed' || mode === 'timed') && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 10 }}>Questions</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
              {[5, 10, 20, 30, 50].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  style={{ padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: count === n ? '#1264E5' : 'var(--bg-subtle)', color: count === n ? '#fff' : 'var(--text-sec)', border: `2px solid ${count === n ? '#1264E5' : 'var(--border)'}`, transition: 'all .12s' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'timed' && (
          <div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 10 }}>Time limit</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
              {[5, 10, 15, 20, 30].map(m => (
                <button key={m} onClick={() => setTimeMin(m)}
                  style={{ padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: timeMin === m ? '#4ade80' : 'var(--bg-subtle)', color: timeMin === m ? '#fff' : 'var(--text-sec)', border: `2px solid ${timeMin === m ? '#4ade80' : 'var(--border)'}`, transition: 'all .12s' }}>
                  {m}m
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 6 }}>
              {count} questions in {timeMin} min = ~{Math.round(timeMin * 60 / count)}s per question
            </p>
          </div>
        )}

        {mode === 'mock' && (
          <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,184,0,.07)', border: '1px solid rgba(255,184,0,.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 4 }}>📝 Full exam simulation</p>
            <p style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.5 }}>Timed {exam} format. Configure on the next screen.</p>
          </div>
        )}

        <div style={{ height: 4 }} />
      </div>

      {/* Footer CTA */}
      <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <PressBtn onClick={go} color={ctaColor} shadowColor={ctaShadow} style={{ opacity: !subject ? 0.5 : 1 }}>
          {ctaLabel}
        </PressBtn>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes exl-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes modal-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes modal-fade-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        .practice-modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
        .practice-modal-sheet{background:var(--bg-card);border-radius:26px 26px 0 0;border-top:1px solid var(--border);max-height:94vh;display:flex;flex-direction:column;box-shadow:0 -12px 48px rgba(0,0,0,.3);width:100%;max-width:520px;animation:modal-slide-up .28s cubic-bezier(.32,0,.67,0)}
        .modal-handle{display:flex}
        @media(min-width:768px){
          .practice-modal-backdrop{justify-content:center}
          .practice-modal-sheet{border-radius:22px;border:1px solid var(--border);max-height:88vh;max-width:540px;animation:modal-fade-in .22s ease;box-shadow:0 24px 60px rgba(0,0,0,.5)}
          .modal-handle{display:none}
        }
      `}</style>
      <div className="practice-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="practice-modal-sheet">
          {inner}
        </div>
      </div>
    </>
  )
}

// ── Practice history card ─────────────────────────────────────────────────────
function PracticeHistoryCard({ history }) {
  if (!history.length) return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
      <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 4 }}>No sessions yet</p>
      <p style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.5 }}>Your practice history will show here after your first session.</p>
    </div>
  )
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {history.map((h, i) => {
        const col = h.pct >= 70 ? '#4ade80' : h.pct >= 40 ? '#FFB800' : '#f87171'
        const a = getAccent(h.subject ?? '')
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a}14`, border: `1px solid ${a}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{getIcon(h.subject)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.subject} · {h.mode}</p>
              <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{h.date} · {h.count} questions</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: col }}>{h.pct}%</p>
              <p style={{ fontSize: 9, color: 'var(--text-tert)' }}>{h.correct}/{h.count}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Session grouping ──────────────────────────────────────────────────────────
function buildHistory(attempts) {
  if (!attempts?.length) return []
  const sessions = []
  let sess = null
  for (const a of attempts) {
    const ts      = new Date(a.created_at).getTime()
    const subName = a.subjects?.name ?? 'Unknown'
    const newSession = !sess || subName !== sess.subject || (sess.lastTs - ts) > 30 * 60 * 1000
    if (newSession) {
      if (sess) sessions.push(sess)
      sess = { subject: subName, lastTs: ts, date: new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count: 0, correct: 0, mode: 'Mixed' }
    }
    sess.lastTs = ts
    sess.count++
    if (a.is_correct) sess.correct++
  }
  if (sess) sessions.push(sess)
  return sessions.slice(0, 5).map(s => ({ ...s, pct: s.count ? Math.round((s.correct / s.count) * 100) : 0 }))
}

// ── Main practice page ────────────────────────────────────────────────────────
export default function PracticePage() {
  const router     = useRouter()
  const supabase   = createClient()
  const { userId } = useUser()

  // Per-exam subject cache — fetched once per exam, re-used on tab switch (no spinner)
  const subjectCache = useRef({})

  const [profile,         setProfile]         = useState(null)
  const [nextTopics,      setNextTopics]       = useState({})
  const [exam,            setExam]             = useState('WAEC')
  const [subjects,        setSubjects]         = useState([])
  const [loadingSubjects, setLoadingSubjects]  = useState(false)
  const [loading,         setLoading]          = useState(true)
  const [showModal,       setShowModal]        = useState(false)
  const [modalMode,       setModalMode]        = useState('quick5')
  const [history,         setHistory]          = useState([])
  const [showGoalModal,   setShowGoalModal]    = useState(false)

  function openModal(mode = 'quick5') { setModalMode(mode); setShowModal(true) }

  // ── Fetch subjects for a given exam tab ───────────────────────────────────
  async function fetchSubjectsForExam(examTab) {
    // If already cached, swap instantly — no loading flash
    if (subjectCache.current[examTab]) {
      setSubjects(subjectCache.current[examTab])
      return
    }
    // Only show spinner for genuine network fetch
    setLoadingSubjects(true)
    try {
      const res = await fetch(`/api/student/subjects?exam=${examTab}`)
      const data = res.ok ? await res.json() : []
      const subs = (data ?? []).map(s => ({ id: s.id, name: s.name }))
      subjectCache.current[examTab] = subs
      setSubjects(subs)
    } catch {
      setSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  // ── Handle exam tab switch ────────────────────────────────────────────────
  function handleExamChange(newExam) {
    setExam(newExam)
    fetchSubjectsForExam(newExam)
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => { if (userId) load(userId) }, [userId]) // eslint-disable-line

  // Auto-open modal when ?modal=1 (e.g. coming from results page "Try another")
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams?.get('modal') === '1' && !loading) {
      setShowModal(true)
    }
  }, [searchParams, loading]) // eslint-disable-line

  // Listen for 'open-goal-modal' dispatched from the modal's 'Change subjects' button
  useEffect(() => {
    const handler = () => setShowGoalModal(true)
    document.addEventListener('open-goal-modal', handler)
    return () => document.removeEventListener('open-goal-modal', handler)
  }, [])

  async function loadHistory(uid) {
    const { data: attempts } = await supabase
      .from('question_attempts')
      .select('created_at, is_correct, subject_id, subjects(name)')
      .eq('student_id', uid)
      .order('created_at', { ascending: false })
      .limit(200)
    setHistory(buildHistory(attempts))
  }

  async function load(uid) {
    const [{ data: prof }] = await Promise.all([
      supabase.from('profiles').select('id, exam_type, full_name').eq('id', uid).single(),
    ])

    setProfile(prof)
    const examTab = prof?.exam_type === 'JAMB' ? 'JAMB' : 'WAEC'
    setExam(examTab)

    await fetchSubjectsForExam(examTab)
    await loadHistory(uid)

    try {
      const res = await fetch('/api/student/next-topic')
      if (res.ok) { const d = await res.json(); setNextTopics(d.topics ?? {}) }
    } catch {}

    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #1264E5', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const heroSubject = subjects.find(s => nextTopics[s.id]) ?? subjects[0]
  const heroTopic   = nextTopics[heroSubject?.id] ?? null
  const heroAccent  = getAccent(heroSubject?.name ?? '')
  const topicHint   = heroTopic?.topicName ?? 'Mixed practice'

  const coach = practiceCoach({
    firstName:    profile?.full_name?.split(' ')[0] ?? '',
    weakSubject:  subjects[0]?.name,
    weakTopic:    heroTopic?.topicName,
    sessionCount: history.length,
  })

  function handleStart({ subject, type, count, answerMode, topic, duration }) {
    const config = {
      subjects:     [subject.name],
      subject_id:   subject.id,
      examType:     exam,
      count,
      mode:         type,
      answerMode,
      topicName:    topic?.topicName ?? null,
      topic_id:     topic?.topicId  ?? null,
      isCore:       topic?.isCore   ?? false,
      durationSecs: duration        ?? null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setShowModal(false)
    router.push('/student/practice/session')
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <style>{`@keyframes exl-glow-pulse{0%,100%{box-shadow:0 0 0 0 rgba(24,183,242,0)}50%{box-shadow:0 0 20px 4px rgba(24,183,242,.12)}}`}</style>

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>Let's go</p>
        <h1 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Choose your quest</h1>
      </div>

      {/* WAEC / JAMB switcher */}
      <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 13, padding: 4, marginBottom: 14, border: '1px solid var(--border)' }}>
        {['WAEC', 'JAMB'].map(e => (
          <button key={e} onClick={() => handleExamChange(e)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? '#1264E5' : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', boxShadow: exam === e ? '0 2px 8px rgba(18,100,229,.4)' : 'none', transition: 'all .15s' }}>
            {e}
          </button>
        ))}
      </div>

      {/* Coach banner */}
      <div style={{ marginBottom: 14 }}>
        <CoachBanner emoji={coach.emoji} message={coach.message} />
      </div>

      {/* Recommended quest hero */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Recommended quest</span>
        <div style={{
          borderRadius: 18, cursor: 'pointer',
          background: 'linear-gradient(145deg,#071B49 0%,#0c2460 50%,#062A78 100%)',
          border: '1.5px solid rgba(24,183,242,.28)', padding: 15, position: 'relative',
          animation: 'exl-glow-pulse 3s ease-in-out infinite',
        }} onClick={() => openModal('quick5')}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${heroAccent}22`, border: `1px solid ${heroAccent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
              {getIcon(heroSubject?.name ?? '')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Quick 5</p>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: '#FFB800' }}>+50 XP</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(24,183,242,.15)', border: '1px solid rgba(24,183,242,.25)', color: '#18B7F2' }}>~4 min</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>~4 min · pick any subject below</p>
            </div>
          </div>
          <PressBtn onClick={e => { e.stopPropagation(); openModal('quick5') }} color="#1264E5" shadowColor="#0a3fa0">
            ▶ Start Quick 5
          </PressBtn>
        </div>
      </div>

      {/* Mode cards */}
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Or choose differently</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { icon: '🎯', label: 'Weak areas',  color: '#f87171', xp: '+40 XP', mode: 'weak' },
          { icon: '⏱️', label: 'Speed round',  color: '#4ade80', xp: '+60 XP', mode: 'timed' },
          { icon: '🌀', label: 'Mixed',        color: '#18B7F2', xp: '+35 XP', mode: 'mixed' },
          { icon: '📝', label: 'Mock exam',    color: '#FFB800', xp: '+200 XP', href: '/student/exam' },
        ].map(m => (
          <button key={m.label} onClick={() => m.href ? router.push(m.href) : openModal(m.mode)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '13px 12px', borderRadius: 14, border: `2px solid ${m.color}50`, background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .12s', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${m.color}18`, border: `1px solid ${m.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{m.icon}</div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)', flex: 1 }}>{m.label}</p>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.1)', color: '#FFB800', border: '1px solid rgba(255,184,0,.2)' }}>{m.xp}</span>
          </button>
        ))}
      </div>

      {/* Practice history */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>Practice history</span>
        {history.length > 0 && (
          <button onClick={() => userId && loadHistory(userId)}
            style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            Refresh
          </button>
        )}
      </div>
      <PracticeHistoryCard history={history} onViewAll={() => {}} />

      {/* Modal */}
      {showModal && (
        <PracticeSetupModal
          subjects={subjects}
          loadingSubjects={loadingSubjects}
          profile={profile}
          initialMode={modalMode}
          exam={exam}
          onExamChange={handleExamChange}
          onClose={() => setShowModal(false)}
          onStart={handleStart}
          onMockExam={() => { setShowModal(false); router.push('/student/exam') }}
        />
      )}

      {/* Change subjects modal */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => {
              setProfile(prev => ({ ...prev, ...updated }))
              setShowGoalModal(false)
              // Clear cache so fresh subjects load after goal save
              subjectCache.current = {}
              fetchSubjectsForExam(exam)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}