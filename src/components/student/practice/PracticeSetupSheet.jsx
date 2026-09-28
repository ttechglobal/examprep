'use client'
// src/components/student/practice/PracticeSetupSheet.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The "How do you want to practise?" sheet: pick a mode (Topic, Custom,
// Quick 5, Speed Round, Mock), exam and subject, then configure and start.
// Opened by the Practice page (app/student/practice/page.js).
//
// Writes the session config to sessionStorage('practice_config') and calls
// onStart(config); Mock calls onMockExam().
//
// v2 (moved out of the Practice page): initialSessionType, so "Study Practice"
//     opens Custom with Study (instant explanations) already chosen.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

const BLUE   = '#1264E5'
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


// ─── PRACTICE SETUP SHEET ─────────────────────────────────────────────────────
export default function PracticeSetupSheet({ subjects, loadingSubjects, initialMode = 'custom', initialSessionType = 'practice', onClose, onStart, onMockExam, exam, onExamChange }) {
  const [mode,        setMode]       = useState(initialMode)
  const [step,        setStep]       = useState(1)

  const [subject,     setSubject]    = useState(() => pickDefault(subjects, exam))
  const [count,       setCount]      = useState(20)
  const [useTimer,    setUseTimer]   = useState(false)
  const [timeMin,     setTimeMin]    = useState(30)
  const [sessionType, setSessionType]= useState(initialSessionType)

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
  // Require a resolved subject ID (not just a stub with id:null) before allowing
  // Start. Stubs appear for ~100ms while /api/student/subjects resolves IDs in
  // the background. Without this check a null subject_id is written to
  // practice_config, the session page drops it, and the questions API falls back
  // to name-based resolution which may hit the wrong subject row.
  const hasId = (s) => !!(s?.id)
  const canNext     = mode === 'mock' ? true
    : mode === 'quick5' ? hasId(q5Subject)
    : mode === 'timed'  ? hasId(spSubject)
    : mode === 'topic'  ? (step === 1 ? hasId(tpSubject) : !!tpTopic)
    : step === 1 ? hasId(subject) : true

  const modeAccent  = { topic: '#0891b2', custom: BLUE, quick5: GREEN, timed: ORANGE, mock: PURPLE }[mode] ?? BLUE
  const modeShadow  = { topic: '#065f7a', custom: '#0a3fa0', quick5: '#166534', timed: '#b84200', mock: '#3b0764' }[mode] ?? '#0a3fa0'

  // Show "Loading…" if subject IDs haven't resolved yet (stubs have id:null)
  const subjectLoading = loadingSubjects || (
    mode !== 'mock' && step === 1 && (
      (mode === 'quick5' && q5Subject && !q5Subject.id) ||
      (mode === 'timed'  && spSubject && !spSubject.id) ||
      (mode === 'topic'  && tpSubject && !tpSubject.id) ||
      (mode !== 'quick5' && mode !== 'timed' && mode !== 'topic' && subject && !subject.id)
    )
  )
  const btnLabel = subjectLoading && mode !== 'mock' && step === 1
    ? 'Loading subjects…'
    : mode === 'mock'   ? '📝 Start Mock Exam'
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
                      // Use name as key when IDs haven't resolved yet (stubs have id:null).
                      // Compare by name too when both are stubs, so only one shows as selected.
                      const on = sub.id
                        ? currentSubj?.id === sub.id
                        : currentSubj?.name === sub.name
                      return (
                        <button key={sub.id ?? sub.name} onClick={() => {
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
