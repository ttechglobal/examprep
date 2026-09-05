'use client'
// src/app/student/practice/page.js — v15
// ─────────────────────────────────────────────────────────────────────────────
// Local-first: works for both guest and authenticated users.
// Profile is read from StudentUserContext (set by layout — already handles
// both Supabase auth AND ep_guest localStorage).
// No direct Supabase calls. No hard redirects for guests.
// ─────────────────────────────────────────────────────────────────────────────
// Modes: Topic Practice | Custom Practice | Quick 5 | Speed Round | Mock Exam

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useStudentUser } from '@/app/student/layout'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { getLocalExamType, getLocalSubjects } from '@/lib/localProfile'
import DailyChallenge from '@/components/student/DailyChallenge'
import SessionHistory from '@/components/student/SessionHistory'
import Link from 'next/link'

// ── Subject ID cache — persists resolved UUIDs across sessions
// Avoids a network round-trip every time the practice page loads.
const SUBJ_ID_CACHE_KEY = 'ep_subject_ids'
const SUBJ_ID_CACHE_TTL = 24 * 60 * 60 * 1000  // 24 hours (subjects rarely change)
function readSubjectIdCache(exam) {
  try {
    const c = JSON.parse(localStorage.getItem(SUBJ_ID_CACHE_KEY) || 'null')
    if (!c || Date.now() - (c.ts || 0) > SUBJ_ID_CACHE_TTL) return null
    return c[exam] ?? null
  } catch { return null }
}
function writeSubjectIdCache(exam, subjects) {
  try {
    const c = JSON.parse(localStorage.getItem(SUBJ_ID_CACHE_KEY) || '{}')
    localStorage.setItem(SUBJ_ID_CACHE_KEY, JSON.stringify({ ...c, [exam]: subjects, ts: Date.now() }))
  } catch {}
}

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'

const ACCENT = {
  'Chemistry':'#9b7ae0','Physics':'#18B7F2','Biology':'#4ade80',
  'Mathematics':'#FFB800','Further Mathematics':'#FFB800',
  'English Language':'#a78bfa','Use of English':'#a78bfa',
  'Economics':'#fcd34d','Government':'#f87171','Geography':'#34d399',
  'Literature in English':'#f9a8d4','Agricultural Science':'#86efac',
  'Commerce':'#818cf8','Accounting':'#fde68a','default':'#9b7ae0',
}
const SUBJ_ICON = {
  'Chemistry':'⚗️','Physics':'⚡','Biology':'🧬','Mathematics':'📐',
  'Further Mathematics':'📐','English Language':'📖','Use of English':'📖',
  'Economics':'📊','Government':'🏛️','Geography':'🌍',
  'Literature in English':'📚','Agricultural Science':'🌱',
  'Commerce':'💼','Accounting':'🧮','default':'📝',
}
const getAccent = n => ACCENT[n] ?? ACCENT.default
const getIcon   = n => SUBJ_ICON[n] ?? SUBJ_ICON.default

const LAST_SUBJECT_KEY = 'exl_last_practice_subject'
function saveLastSubject(s) {
  try { if (s?.id) sessionStorage.setItem(LAST_SUBJECT_KEY, JSON.stringify({ id: s.id, name: s.name })) } catch {}
}
function loadLastSubject() {
  try { const r = sessionStorage.getItem(LAST_SUBJECT_KEY); return r ? JSON.parse(r) : null } catch { return null }
}
function pickDefault(subjects, exam) {
  if (!subjects.length) return null
  const saved = loadLastSubject()
  if (saved) { const m = subjects.find(s => s.id === saved.id); if (m) return m }
  if (exam === 'JAMB') { const u = subjects.find(s => /english/i.test(s.name)); if (u) return u }
  if (exam === 'WAEC') { const e = subjects.find(s => s.name === 'English Language'); if (e) return e }
  return subjects[0]
}


// ─── UI ATOMS ─────────────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SecLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.025em' }}>{children}</span>
      {right}
    </div>
  )
}


// ─── HERO BANNER ──────────────────────────────────────────────────────────────
function HeroBanner({ dark }) {
  return (
    <div style={{ borderRadius: 22, overflow: 'hidden', position: 'relative', background: dark ? `linear-gradient(135deg,#062A78,#0a1f5e,#0e2875)` : `linear-gradient(135deg,#062A78,#0c2360,#1040a0)`, padding: '22px 24px', display: 'flex', alignItems: 'center', minHeight: 110 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 14, right: '38%', fontSize: 14, color: GOLD, opacity: .5 }}>✦</div>
      <div style={{ position: 'absolute', top: 28, right: '34%', fontSize: 8, color: CYAN, opacity: .6 }}>✦</div>
      <div style={{ position: 'absolute', bottom: 18, right: '40%', fontSize: 10, color: GOLD, opacity: .4 }}>✦</div>
      <div style={{ flex: 1, zIndex: 1 }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 6 }}>Practice makes progress!</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>Stay consistent and you'll crush your goals.</div>
      </div>
      <div style={{ width: 100, height: 100, flexShrink: 0, zIndex: 1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.35))' }} onError={e => { e.currentTarget.style.display = 'none' }} />
      </div>
    </div>
  )
}


// ─── PRACTICE MODE CARDS ──────────────────────────────────────────────────────
const MODES = [
  {
    key: 'topic',
    iconBg: `linear-gradient(135deg,#0891b2,#0e7490)`,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h10M4 14h12M4 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>,
    label: 'Topic Practice',
    desc: 'Drill a specific topic',
    body: 'Choose a subject and topic, then practise only questions from that topic. Great for targeted revision.',
    xp: '+XP', color: '#0891b2',
  },
  {
    key: 'custom',
    iconBg: `linear-gradient(135deg,${BLUE},#0a4fc8)`,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>,
    label: 'Custom Practice',
    desc: 'Pick subject, count & mode',
    body: 'Customise exactly how you want to practise — subject, questions, time, and style.',
    xp: '+XP', color: BLUE,
  },
  {
    key: 'quick5',
    iconBg: `linear-gradient(135deg,${GREEN},#16a34a)`,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    label: 'Quick 5',
    desc: '5 random questions',
    body: 'Fast, no fuss. Five random questions from your subjects to keep you sharp.',
    xp: '+50 XP', color: GREEN,
  },
  {
    key: 'timed',
    iconBg: `linear-gradient(135deg,${ORANGE},#d94e00)`,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="#fff" strokeWidth="2" /><path d="M12 9v4l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><path d="M9 2h6M12 2v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>,
    label: 'Speed Round',
    desc: 'Race the clock',
    body: 'Answer questions under time pressure. Trains your exam speed and focus.',
    xp: '+60 XP', color: ORANGE,
  },
  {
    key: 'mock',
    iconBg: `linear-gradient(135deg,${PURPLE},#4c1d95)`,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#fff" strokeWidth="2" /><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>,
    label: 'Mock Exam',
    desc: 'Full exam simulation',
    body: 'Simulate a real WAEC or JAMB exam. Full length, timed, no peeking at answers.',
    xp: '+200 XP', color: PURPLE,
  },
]

function PracticeModeCards({ onStart, dark }) {
  const [hov, setHov] = useState(null)
  return (
    <div>
      <SecLabel>Practice Modes</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, gridAutoRows: 'auto' }}>
        {MODES.map(m => (
          <div key={m.key} onClick={() => onStart(m.key)}
            onMouseEnter={() => setHov(m.key)} onMouseLeave={() => setHov(null)}
            style={{ borderRadius: 20, border: `1px solid ${hov === m.key ? m.color + '55' : 'var(--border)'}`, background: 'var(--bg-card)', cursor: 'pointer', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, transition: 'all .18s', boxShadow: hov === m.key ? `0 8px 28px ${m.color}22` : '0 2px 12px rgba(6,42,120,.05)', transform: hov === m.key ? 'translateY(-2px)' : 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${m.color}45`, flexShrink: 0 }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.desc}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.5 }}>{m.body}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button style={{ fontSize: 13, fontWeight: 800, color: m.color, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Start ›</button>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: `${m.color}14`, color: m.color, border: `1px solid ${m.color}25` }}>{m.xp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── NO SUBJECTS PROMPT ───────────────────────────────────────────────────────
function NoSubjectsPrompt({ isGuest }) {
  return (
    <Card style={{ padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>📚</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 8 }}>
        Set up your subjects first
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tert)', lineHeight: 1.6, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>
        {isGuest
          ? 'Go to your profile to pick the subjects you want to practise. Your choices are saved on this device.'
          : 'Head to your profile to choose your exam subjects so we can show you the right practice questions.'}
      </div>
      <Link href="/student/profile" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 14, background: BLUE, color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: `0 4px 0 #0a3fa0,0 6px 20px ${BLUE}40` }}>
          Go to Profile →
        </div>
      </Link>
    </Card>
  )
}


// ─── PRACTICE SETUP SHEET ─────────────────────────────────────────────────────
export function PracticeSetupSheet({ subjects, loadingSubjects, initialMode = 'custom', onClose, onStart, onMockExam, exam, onExamChange }) {
  const [mode,        setMode]       = useState(initialMode)
  const [step,        setStep]       = useState(1)

  const [subject,     setSubject]    = useState(() => pickDefault(subjects, exam))
  const [count,       setCount]      = useState(20)
  const [useTimer,    setUseTimer]   = useState(false)
  const [timeMin,     setTimeMin]    = useState(30)
  const [sessionType, setSessionType]= useState('practice')

  const [q5Subject,   setQ5Subject]  = useState(() => pickDefault(subjects, exam))
  const [spSubject,   setSpSubject]  = useState(() => pickDefault(subjects, exam))
  const [spCount,     setSpCount]    = useState(20)
  const [spTime,      setSpTime]     = useState(30)

  const [tpSubject,   setTpSubject]  = useState(() => pickDefault(subjects, exam))
  const [tpTopics,    setTpTopics]   = useState([])
  const [tpTopic,     setTpTopic]    = useState(null)
  const [loadingTopics, setLoadingTopics] = useState(false)

  useEffect(() => {
    const def = pickDefault(subjects, exam)
    setSubject(def); setQ5Subject(def); setSpSubject(def); setTpSubject(def)
  }, [subjects, exam])

  useEffect(() => {
    if (mode !== 'topic' || !tpSubject?.id) return
    setTpTopics([]); setTpTopic(null); setLoadingTopics(true)
    fetch(`/api/student/topics?subject_id=${tpSubject.id}&exam=${exam}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setTpTopics(Array.isArray(d) ? d : []); setLoadingTopics(false) })
      .catch(() => setLoadingTopics(false))
  }, [tpSubject?.id, mode, exam])

  function go() {
    if (mode === 'mock') { onMockExam?.(); return }
    if (mode === 'topic') {
      const s = tpSubject || subjects[0]
      if (!s || !tpTopic) return
      saveLastSubject(s)
      const cfg = { subjects: [s.name], subject_id: s.id, examType: exam, count: 20, mode: 'practice', sessionType: 'practice', topic_id: tpTopic.id, topicName: tpTopic.name }
      sessionStorage.setItem('practice_config', JSON.stringify(cfg))
      onStart?.(cfg); return
    }
    if (mode === 'quick5') {
      const s = q5Subject || subjects[0]
      if (!s) return
      saveLastSubject(s)
      const cfg = { subjects: [s.name], subject_id: s.id, examType: exam, count: 5, mode: 'quick5', sessionType: 'practice', answerMode: 'instant' }
      sessionStorage.setItem('practice_config', JSON.stringify(cfg))
      onStart?.(cfg); return
    }
    if (mode === 'timed') {
      const s = spSubject || subjects[0]
      if (!s) return
      saveLastSubject(s)
      const cfg = { subjects: [s.name], subject_id: s.id, examType: exam, count: spCount, mode: 'timed', sessionType: 'practice', speedSecs: spTime }
      sessionStorage.setItem('practice_config', JSON.stringify(cfg))
      onStart?.(cfg); return
    }
    if (!subject) return
    saveLastSubject(subject)
    const cfg = {
      subjects: [subject.name], subject_id: subject.id, examType: exam,
      count, mode: 'practice', sessionType,
      durationSecs: useTimer ? timeMin * 60 : null,
    }
    sessionStorage.setItem('practice_config', JSON.stringify(cfg))
    onStart?.(cfg)
  }

  function nextStep() {
    if (mode === 'mock') { onMockExam?.(); return }
    if (mode === 'quick5' || mode === 'timed') { go(); return }
    if (mode === 'topic') {
      if (step === 1) { setStep(2); return }
      go(); return
    }
    if (step === 1) { setStep(2); return }
    go()
  }

  function prevStep() { if (step > 1) setStep(s => s - 1) }

  const isCustom    = mode === 'custom'
  const isTopic     = mode === 'topic'
  const totalSteps  = (isCustom || isTopic) ? 2 : 1
  const canNext     = mode === 'mock' ? true
    : mode === 'quick5' ? !!q5Subject
    : mode === 'timed'  ? !!spSubject
    : mode === 'topic'  ? (step === 1 ? !!tpSubject : !!tpTopic)
    : step === 1 ? !!subject : true

  const modeAccent  = { topic: '#0891b2', custom: BLUE, quick5: GREEN, timed: ORANGE, mock: PURPLE }[mode] ?? BLUE
  const modeShadow  = { topic: '#065f7a', custom: '#0a3fa0', quick5: '#166534', timed: '#b84200', mock: '#3b0764' }[mode] ?? '#0a3fa0'

  const btnLabel = mode === 'mock'   ? '📝 Start Mock Exam'
    : mode === 'quick5' ? '⚡ Start Quick 5'
    : mode === 'timed'  ? '⏱ Start Speed Round'
    : mode === 'topic'  ? (step === 1 ? 'Choose Topic →' : '📚 Start Topic Practice')
    : step === 1 ? 'Continue →' : `🚀 Start ${sessionType === 'study' ? 'Study' : 'Practice'} Session`

  return (
    <>
      <style>{`
        @keyframes sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes sheet-in { from { opacity: 0; transform: scale(.97) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        .ps-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,.7); backdrop-filter: blur(8px); display: flex; flex-direction: column; align-items: center; justify-content: flex-end }
        .ps-sheet { width: 100%; max-width: 560px; background: var(--bg-card); border-radius: 28px 28px 0 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; max-height: 88vh; box-shadow: 0 -20px 60px rgba(0,0,0,.4); animation: sheet-up .3s cubic-bezier(.22,.61,.36,1) }
        .ps-cta { padding: 14px 22px; padding-bottom: max(96px,calc(env(safe-area-inset-bottom, 0px) + 80px)); border-top: 1px solid var(--border); background: var(--bg-card) }
        @media (min-width: 768px) {
          .ps-backdrop { justify-content: center; align-items: center }
          .ps-sheet { border-radius: 24px; border: 1px solid var(--border); max-height: 86vh; animation: sheet-in .25s ease }
          .ps-cta { padding: 14px 22px !important; padding-bottom: 18px !important }
        }
      `}</style>
      <div className="ps-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="ps-sheet">
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '16px 22px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            {step > 1 && (
              <button onClick={prevStep} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em' }}>
                {step === 1 ? 'How do you want to practise?' : 'Configure your session'}
              </div>
              {isCustom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div key={i} style={{ height: 4, borderRadius: 999, transition: 'all .25s', background: i < step ? modeAccent : 'var(--border)', width: i === step - 1 ? 24 : i < step ? 16 : 10 }} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-tert)', fontFamily: 'inherit', flexShrink: 0 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

            {/* ── STEP 1 ── */}
            {step === 1 && (<>
              {/* Mode selector — compact horizontal chip row so subject/exam is immediately visible */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Mode</div>
                <style>{`.ms-chip-row::-webkit-scrollbar{display:none}`}</style>
                <div className="ms-chip-row" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none', paddingBottom: 4 }}>
                  {[
                    { key: 'topic',  emoji: '📋', label: 'Topic Practice',  color: '#0891b2' },
                    { key: 'custom', emoji: '🎛️', label: 'Custom Practice', color: BLUE     },
                    { key: 'quick5', emoji: '⚡', label: 'Quick 5',          color: GREEN    },
                    { key: 'timed',  emoji: '⏱️', label: 'Speed Round',     color: ORANGE   },
                    { key: 'mock',   emoji: '📝', label: 'Mock Exam',        color: PURPLE   },
                  ].map(m => {
                    const on = mode === m.key
                    return (
                      <button key={m.key} onClick={() => setMode(m.key)}
                        style={{ flexShrink: 0, scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999, border: `2px solid ${on ? m.color : 'var(--border)'}`, background: on ? `${m.color}12` : 'var(--bg-subtle)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 16 }}>{m.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: on ? m.color : 'var(--text-sec)' }}>{m.label}</span>
                        {on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={m.color} /><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subject + Exam (all non-mock modes) */}
              {mode !== 'mock' && (<>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Exam · Subject</div>

                {/* Exam toggle */}
                <div style={{ display: 'inline-flex', background: 'var(--bg-subtle)', borderRadius: 11, padding: 3, border: '1px solid var(--border)', marginBottom: 12 }}>
                  {['WAEC', 'JAMB'].map(e => (
                    <button key={e} onClick={() => onExamChange(e)}
                      style={{ padding: '7px 22px', borderRadius: 8, fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: exam === e ? BLUE : 'transparent', color: exam === e ? '#fff' : 'var(--text-tert)', boxShadow: exam === e ? `0 2px 8px ${BLUE}50` : 'none', transition: 'all .15s' }}>{e}</button>
                  ))}
                </div>

                {/* Subject grid */}
                {loadingSubjects ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${BLUE}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-tert)' }}>Loading subjects…</span>
                  </div>
                ) : !subjects.length ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-tert)' }}>
                    No {exam} subjects set up yet. Go to Profile to add subjects.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
                    {subjects.map(sub => {
                      const a = getAccent(sub.name)
                      const currentSubj = mode === 'quick5' ? q5Subject : mode === 'timed' ? spSubject : mode === 'topic' ? tpSubject : subject
                      const on = currentSubj?.id === sub.id
                      return (
                        <button key={sub.id} onClick={() => {
                          if (mode === 'quick5') setQ5Subject(sub)
                          else if (mode === 'timed') setSpSubject(sub)
                          else if (mode === 'topic') setTpSubject(sub)
                          else setSubject(sub)
                        }}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', background: on ? `${a}12` : 'var(--bg-subtle)', border: `2px solid ${on ? a : 'var(--border)'}`, transition: 'all .12s', textAlign: 'left' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${a}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{getIcon(sub.name)}</div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: on ? a : 'var(--text-prim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                          {on && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={a} /><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Speed round config */}
                {mode === 'timed' && (<>
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Questions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {[10, 20, 30, 40].map(n => (
                        <button key={n} onClick={() => setSpCount(n)}
                          style={{ padding: '12px 0', borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', background: spCount === n ? ORANGE : 'var(--bg-subtle)', color: spCount === n ? '#fff' : 'var(--text-sec)', border: `2px solid ${spCount === n ? ORANGE : 'var(--border)'}`, transition: 'all .12s' }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Time per question</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
                      {[10, 20, 30, 60, 90, 120].map(s => (
                        <button key={s} onClick={() => setSpTime(s)}
                          style={{ padding: '11px 0', borderRadius: 11, fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', background: spTime === s ? ORANGE : 'var(--bg-subtle)', color: spTime === s ? '#fff' : 'var(--text-sec)', border: `2px solid ${spTime === s ? ORANGE : 'var(--border)'}`, transition: 'all .12s' }}>{s}s</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 8 }}>
                      {spTime}s per question · {spCount} questions = ~{Math.round(spTime * spCount / 60)} min total
                    </div>
                  </div>
                </>)}
              </>)}
            </>)}

            {/* ── STEP 2: Custom config ── */}
            {step === 2 && isCustom && (<>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>Number of questions</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                  {[10, 20, 30, 40, 50].map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      style={{ padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', background: count === n ? BLUE : 'var(--bg-subtle)', color: count === n ? '#fff' : 'var(--text-sec)', border: `2px solid ${count === n ? BLUE : 'var(--border)'}`, transition: 'all .12s', boxShadow: count === n ? `0 4px 12px ${BLUE}40` : 'none' }}>{n}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>Session type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'study',    emoji: '📖', label: 'Study Mode',    desc: 'See the answer & explanation right away. Great for learning.' },
                    { key: 'practice', emoji: '📝', label: 'Practice Mode', desc: 'Submit first, review all answers at the end. Builds exam focus.' },
                  ].map(t => {
                    const on = sessionType === t.key
                    return (
                      <button key={t.key} onClick={() => setSessionType(t.key)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px', borderRadius: 16, border: `2px solid ${on ? BLUE : 'var(--border)'}`, background: on ? `${BLUE}08` : 'var(--bg-subtle)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .14s' }}>
                        <span style={{ fontSize: 22 }}>{t.emoji}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: on ? BLUE : 'var(--text-prim)', marginBottom: 3 }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.4 }}>{t.desc}</div>
                        </div>
                        {on && <div style={{ marginTop: 'auto', width: 18, height: 18, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useTimer ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>Add a time limit</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>Optional — applies to the whole session</div>
                  </div>
                  <button onClick={() => setUseTimer(t => !t)}
                    style={{ width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: useTimer ? BLUE : 'var(--border)', transition: 'background .2s', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: useTimer ? 20 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                  </button>
                </div>
                {useTimer && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                    {[10, 15, 20, 30, 45].map(m => (
                      <button key={m} onClick={() => setTimeMin(m)}
                        style={{ padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', background: timeMin === m ? BLUE : 'var(--bg-subtle)', color: timeMin === m ? '#fff' : 'var(--text-sec)', border: `2px solid ${timeMin === m ? BLUE : 'var(--border)'}`, transition: 'all .12s' }}>{m}m</button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                {[
                  ['Subject', subject?.name ?? '—'],
                  ['Exam', exam],
                  ['Questions', String(count)],
                  ['Session', sessionType === 'study' ? 'Study (instant feedback)' : 'Practice (review at end)'],
                  ...(useTimer ? [['Time limit', `${timeMin} minutes`]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-tert)', fontWeight: 600 }}>{k}</span>
                    <span style={{ color: 'var(--text-prim)', fontWeight: 800 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>)}

            {/* ── STEP 2: Topic picker ── */}
            {step === 2 && isTopic && (<>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {tpSubject?.name} — Pick a topic
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tert)', marginBottom: 14 }}>
                  Choose the topic you want to drill. Questions will be drawn only from that topic.
                </div>
                {loadingTopics ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid #0891b2`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-tert)' }}>Loading topics…</span>
                  </div>
                ) : tpTopics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-tert)' }}>
                    No topics found for this subject yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tpTopics.map(topic => {
                      const on = tpTopic?.id === topic.id
                      return (
                        <button key={topic.id} onClick={() => setTpTopic(topic)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, border: `2px solid ${on ? '#0891b2' : 'var(--border)'}`, background: on ? '#0891b210' : 'var(--bg-subtle)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .14s' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: on ? '#0891b220' : 'var(--bg-card)', border: `1.5px solid ${on ? '#0891b240' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: on ? '#0891b2' : 'var(--text-tert)' }}>{topic.order_index ?? '·'}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: on ? '#0891b2' : 'var(--text-prim)', lineHeight: 1.3 }}>{topic.name}</div>
                            {topic.question_count > 0 && <div style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 2 }}>{topic.question_count} questions</div>}
                          </div>
                          {on && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>)}
          </div>

          {/* CTA */}
          <div className="ps-cta">
            <button onClick={nextStep} disabled={!canNext}
              style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: canNext ? 'pointer' : 'not-allowed', background: canNext ? modeAccent : 'var(--border)', color: '#fff', fontSize: 15, fontWeight: 900, fontFamily: 'inherit', letterSpacing: '-.01em', boxShadow: canNext ? `0 5px 0 ${modeShadow},0 8px 24px ${modeAccent}40` : 'none', transition: 'all .12s', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s infinite', pointerEvents: 'none' }} />
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router       = useRouter()
  const { dark }     = useTheme()
  const searchParams = useSearchParams()
  const subjectCache = useRef({})

  // ── Profile: read from layout context (already handles guest + auth) ─────────
  const profile  = useStudentUser()
  const isGuest  = !!profile?.isGuest
  const isReady  = profile !== null  // layout has finished its auth check

  // Derive exam type from profile
  const [exam,            setExam]            = useState('WAEC')
  const [subjects,        setSubjects]        = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [showSheet,       setShowSheet]       = useState(false)
  const [sheetMode,       setSheetMode]       = useState('custom')

  // Initialise exam + subjects from profile — local-first.
  // Profile already carries subject names from layout (no extra network call).
  // We show stubs instantly, then resolve IDs in background.
  // Fire when profile becomes available OR when subjects change (e.g. after profile save)
  // Use a fingerprint that captures: who the user is + what subjects they have
  const profileSubjectKey = profile
    ? `${profile.id ?? 'guest'}_${profile.exam_type ?? ''}_${(profile.subjects_waec ?? profile.subjects ?? []).join(',')}`
    : null

  useEffect(() => {
    if (!profile) return
    const examType = profile.exam_type ?? profile.exam_types?.[0] ?? 'WAEC'
    setExam(examType)
    // Clear cache so we re-resolve with new subject names
    subjectCache.current = {}
    loadSubjects(examType, profile)
  }, [profileSubjectKey]) // eslint-disable-line

  async function loadSubjects(examTab, currentProfile) {
    // 1. In-memory cache (same session, tab not closed)
    if (subjectCache.current[examTab]) {
      setSubjects(subjectCache.current[examTab])
      return
    }

    // Extract names from local profile — zero latency
    const names = examTab === 'WAEC'
      ? (currentProfile?.subjects_waec ?? currentProfile?.subjects ?? [])
      : (currentProfile?.subjects_jamb ?? currentProfile?.subjects ?? [])

    if (!names.length) {
      setSubjects([])
      return
    }

    // 2. localStorage cache — skip the network on repeat visits
    const lsCached = readSubjectIdCache(examTab)
    if (lsCached?.length) {
      // Validate names still match the profile (subjects may have changed)
      const cachedNames = new Set(lsCached.map(s => s.name))
      if (names.every(n => cachedNames.has(n))) {
        subjectCache.current[examTab] = lsCached
        setSubjects(lsCached)
        return
      }
    }

    // 3. Show name-only stubs immediately — UI is never blank
    const stubs = names.map(n => ({ id: null, name: n }))
    setSubjects(stubs)

    // 4. Background fetch to resolve real IDs, then cache for next visit
    setLoadingSubjects(true)
    try {
      const res  = await fetch(`/api/student/subjects?exam=${examTab}&names=${encodeURIComponent(names.join(','))}`)
      const data = res.ok ? await res.json() : []
      const rows = Array.isArray(data) && data.length
        ? data.map(s => ({ id: s.id, name: s.name }))
        : stubs
      subjectCache.current[examTab] = rows
      writeSubjectIdCache(examTab, rows)  // persist for next visit
      setSubjects(rows)
    } catch {
      // Keep stubs — subjects still visible, IDs resolve on retry
    } finally {
      setLoadingSubjects(false)
    }
  }

  function handleExamChange(e) {
    setExam(e)
    loadSubjects(e, profile)
  }

  function openSheet(mode = 'custom') {
    setSheetMode(mode)
    setShowSheet(true)
  }

  function handleStart(config) {
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    setShowSheet(false)
    router.push('/student/practice/session')
  }

  // Handle URL params (e.g. ?modal=1 or ?mode=quick5)
  useEffect(() => {
    if (!isReady) return
    if (searchParams?.get('modal') === '1') setShowSheet(true)
  }, [searchParams, isReady])

  useEffect(() => {
    if (!isReady) return
    const m = searchParams?.get('mode')
    if (m) {
      const map = { speed: 'timed', mock: 'mock', custom: 'custom', quick5: 'quick5' }
      if (map[m]) { setSheetMode(map[m]); setShowSheet(true) }
    }
  }, [searchParams, isReady])

  // Loading — wait for layout to resolve profile
  if (!isReady) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid var(--border)`, borderTopColor: BLUE, animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const hasSubjects = subjects.length > 0

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        * { box-sizing: border-box }
      `}</style>

      {/* Quick links */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <Link href="/student/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-tert)' }}>
            📚 Edit subjects
          </div>
        </Link>
        <Link href="/student/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: `1px solid ${GOLD}35`, background: `${GOLD}10`, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: GOLD }}>
            🎯 Goals
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <HeroBanner dark={dark} />

        {/* If no subjects yet, show a clear prompt instead of broken empty states */}
        {!hasSubjects && !loadingSubjects
          ? <NoSubjectsPrompt isGuest={isGuest} />
          : <>
              <PracticeModeCards onStart={openSheet} dark={dark} />
              <DailyChallenge profile={profile} />
              <SessionHistory />
            </>
        }
      </div>

      {showSheet && (
        <PracticeSetupSheet
          subjects={subjects}
          loadingSubjects={loadingSubjects}
          initialMode={sheetMode}
          exam={exam}
          onExamChange={handleExamChange}
          onClose={() => setShowSheet(false)}
          onStart={handleStart}
          onMockExam={() => { setShowSheet(false); sessionStorage.setItem('mock_config', JSON.stringify({ subjects })); router.push('/student/practice/mock') }}
        />
      )}
    </>
  )
}