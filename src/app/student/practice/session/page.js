'use client'
// src/app/student/practice/session/page.js — v10
// FIXES:
//   1. Options now always clickable (alignItems stretch, no overflow clip)
//   2. Question + option cards max-width reduced on desktop for readability
//   3. After session: review mode available on results page (passed via sessionStorage)
//   4. XP update happens in results page (unchanged)

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { ToastStack } from '@/components/ui/Toast'
import { getWarningThresholds, formatTime, getTimerColor } from '@/lib/practiceTimer'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

function safeJson(val, fb) {
  if (!val) return fb
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fb }
}

function totalSecsFromCfg(cfg) {
  if (cfg.durationSecs) return cfg.durationSecs
  const c = cfg.count ?? 10
  return c <= 10 ? 600 : c <= 20 ? 1200 : c <= 30 ? 1800 : 2400
}

// ── Press button ──────────────────────────────────────────────────────────────
function PressBtn({ onClick, children, disabled = false, style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        background: '#0b1330', color: '#fff',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 800, fontSize: 15, borderRadius: 16,
        transform: p && !disabled ? 'translateY(3px)' : '',
        boxShadow: p && !disabled
          ? '0 2px 0 #05070f'
          : '0 5px 0 #05070f, 0 8px 20px rgba(0,0,0,.18)',
        transition: 'transform .1s, box-shadow .1s',
        opacity: disabled ? 0.35 : 1,
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Explanation modal ─────────────────────────────────────────────────────────
function ExplanationModal({ question, selectedKey, onClose, accent, onNext, isLast }) {
  const isCorrect     = selectedKey === question?.correct_answer
  const explanation   = safeJson(question?.explanation, {})
  const concept       = explanation.concept       ?? ''
  const whyCorrect    = explanation.why_correct   ?? explanation.correct ?? ''
  const misconception = explanation.misconception ?? ''
  const wrongOptions  = explanation.wrong_options ?? {}
  const workings      = explanation.workings      ?? []
  const myWrongReason = !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''
  const otherWrong    = Object.entries(wrongOptions).filter(([k]) => k !== question?.correct_answer)

  const tabs = [
    ...(workings.length > 0 ? [{ key: 'worked', label: 'Worked solution' }] : []),
    { key: 'explain', label: 'Explanation' },
    ...(otherWrong.length > 0 ? [{ key: 'wrong', label: 'Distractors' }] : []),
  ]
  const [tab, setTab] = useState(tabs[0]?.key ?? 'explain')

  useEffect(() => {
    injectMathStyles()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}
      onClick={onClose}
    >
      <div
        style={{
          marginTop: 'auto', width: '100%', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1px solid var(--border)',
          maxHeight: '88vh',
          boxShadow: '0 -20px 60px rgba(0,0,0,.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
              background: isCorrect ? '#22c55e' : '#ef4444',
              boxShadow: '0 3px 0 rgba(0,0,0,.18)',
            }}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: isCorrect ? '#22c55e' : '#ef4444', marginBottom: 2 }}>
                {isCorrect ? 'Correct answer!' : "Not quite — here's why"}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>
                Correct answer: <strong style={{ color: 'var(--text-prim)' }}>{question?.correct_answer}</strong>
              </p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tert)', fontSize: 13, cursor: 'pointer' }}>✕</button>
          </div>

          {tabs.length > 1 && (
            <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 11, background: 'var(--bg-subtle)' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: 'none', transition: 'all .15s',
                  background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                  color: tab === t.key ? 'var(--active-text)' : 'var(--text-tert)',
                  boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'worked' && workings.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-sec)', marginBottom: 10 }}>Step-by-step solution</p>
              <WorkingsBlock workings={workings} />
            </div>
          )}
          {tab === 'explain' && <>
            {concept && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 16, background: `${accent}12`, border: `1px solid ${accent}28` }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: accent }}>{concept}</p>
              </div>
            )}
            {!isCorrect && (myWrongReason || misconception) && (
              <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning)', marginBottom: 5 }}>Why {selectedKey} is wrong</p>
                <MathText text={myWrongReason || misconception} style={{ fontSize: 13, lineHeight: 1.6 }} as="p" />
              </div>
            )}
            {whyCorrect && (
              <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCorrect ? '#22c55e' : 'var(--text-sec)', marginBottom: 5 }}>
                  {isCorrect ? "Why you're right" : `Why ${question?.correct_answer} is correct`}
                </p>
                <MathText text={whyCorrect} style={{ fontSize: 13, lineHeight: 1.6 }} as="p" />
              </div>
            )}
          </>}
          {tab === 'wrong' && otherWrong.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-sec)' }}>Why the other options are wrong</p>
              {otherWrong.map(([key, reason]) => (
                <div key={key} style={{ display: 'flex', gap: 10, padding: '9px 13px', borderRadius: 14, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', marginTop: 1 }}>{key}</span>
                  <MathText text={reason} style={{ fontSize: 13, lineHeight: 1.55, flex: 1 }} as="p" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}>Close</button>
          <PressBtn onClick={onNext} style={{ flex: 2, padding: '13px 0' }}>
            {isLast ? 'Finish session →' : 'Next question →'}
          </PressBtn>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function DesktopSidebar({ config, questions, answers, revealed = {}, index, secsLeft, totalSecs, accent, onJump, timerCol, isDark }) {
  const subjectName = config?.subjects?.[0] ?? ''
  const topicName   = config?.topicName ?? ''
  return (
    <div className="ps-panel" style={{ display: 'none', width: 220, flexShrink: 0, height: '100dvh', flexDirection: 'column', borderRight: '1px solid var(--border)', background: isDark ? 'rgba(12,13,18,.98)' : 'rgba(255,255,255,.98)', overflow: 'hidden' }}>
      {/* Timer */}
      {totalSecs > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '12px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tert)', marginBottom: 4 }}>Time left</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: timerCol ?? 'var(--text-prim)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{formatTime(secsLeft)}</p>
          </div>
        </div>
      )}
      {/* Subject info */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
        {subjectName && <p style={{ fontSize: 11, fontWeight: 800, color: accent, marginBottom: 2 }}>{subjectName}</p>}
        {topicName && <p style={{ fontSize: 10, color: 'var(--text-tert)', lineHeight: 1.4 }}>{topicName}</p>}
        <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 4 }}>{questions.length} questions</p>
      </div>
      {/* Question grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tert)', marginBottom: 8 }}>Questions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
          {questions.map((q, i) => {
            const a = answers[q.id]
            const isRev = revealed[q.id]
            const curr = i === index
            let bg = 'var(--bg-subtle)', bdr = '1px solid var(--border)', col = 'var(--text-tert)'
            if (curr) { bg = accent; bdr = `1px solid ${accent}`; col = '#fff' }
            else if (isRev && a?.isCorrect) { bg = '#dcfce7'; bdr = '1px solid #86efac'; col = '#15803d' }
            else if (isRev && a && !a.isCorrect) { bg = '#fee2e2'; bdr = '1px solid #fca5a5'; col = '#dc2626' }
            else if (a && !isRev) { bg = 'var(--bg-card)'; bdr = `1px solid ${accent}60`; col = accent }
            return (
              <button key={q.id} onClick={() => onJump(i)} title={`Q${i + 1}`} style={{
                aspectRatio: '1', borderRadius: 8,
                fontSize: 11, cursor: 'pointer',
                background: bg, border: bdr, color: col, fontWeight: 800,
                transition: 'all .1s',
              }}>
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PracticeSession() {
  const router   = useRouter()
  const isDark   = useIsDark()

  const [questions, setQs]       = useState([])
  const [config,    setConfig]   = useState(null)
  const [index,     setIndex]    = useState(0)
  const [answers,   setAnswers]  = useState({})
  const [revealed,  setRevealed] = useState({}) // qId → true once user confirms
  const [secsLeft,  setSecs]     = useState(0)
  const [totalSecs, setTotal]    = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [toasts,    setToasts]   = useState([])
  const [loading,   setLoading]  = useState(true)
  const [error,     setError]    = useState(null)

  const answersRef = useRef({})
  const timerRef   = useRef(null)
  const firedRef   = useRef(new Set())

  const addToast = useCallback((msg, type) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message: msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  async function finishSession(ans, qs) {
    clearInterval(timerRef.current)
    const results = qs.map(q => ({ ...q, userAnswer: ans[q.id]?.selected, isCorrect: ans[q.id]?.isCorrect ?? false }))
    sessionStorage.setItem('practice_results', JSON.stringify({ results, config, xp: null }))
    router.push('/student/practice/results')
  }

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No session config.'); setLoading(false); return }
    let cfg; try { cfg = JSON.parse(raw) } catch { setError('Invalid config.'); setLoading(false); return }
    setConfig(cfg)
    const params = new URLSearchParams({
      subjects: (cfg.subjects ?? []).join(','),
      exam:     cfg.examType ?? 'WAEC',
      count:    String(cfg.count ?? 10),
      mode:     cfg.mode ?? 'practice',
      source:   'all',
    })
    if (cfg.topic_id)   params.set('topic_id', cfg.topic_id)
    if (cfg.subject_id) params.set('subject_id', cfg.subject_id)
    if (cfg.year)       params.set('year', cfg.year)
    if (cfg.weak_topic_ids?.length) params.set('weak_topic_ids', cfg.weak_topic_ids.join(','))
    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions available.'); setLoading(false); return }
        setQs(qs)
        const s = totalSecsFromCfg(cfg); setTotal(s); setSecs(s)
        setLoading(false)
      })
      .catch(() => { setError('Network error.'); setLoading(false) })
  }, []) // eslint-disable-line

  useEffect(() => {
    if (totalSecs <= 0 || loading || questions.length === 0) return
    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSecs / 60)
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); finishSession(answersRef.current, questions); return 0 }
        const ns = s - 1
        minuteWarnings.forEach(w => {
          const thr = w.minutes * 60
          if (ns === thr && !firedRef.current.has(thr)) { firedRef.current.add(thr); addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning') }
        })
        secondWarnings.forEach(w => {
          const key = `s${w.seconds}`
          if (ns === w.seconds && !firedRef.current.has(key)) { firedRef.current.add(key); addToast(w.label, 'urgent') }
        })
        return ns
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [totalSecs, loading, questions.length]) // eslint-disable-line

  function handleAnswer(letter) {
    const q = questions[index]
    if (!q) return
    // If already confirmed (revealed), lock it — no more changes
    if (revealed[q.id]) return
    const isCorrect = letter === q.correct_answer
    const entry = { selected: letter, isCorrect }
    // Update selection (but don't lock yet — user can still change)
    answersRef.current = { ...answersRef.current, [q.id]: entry }
    setAnswers(prev => ({ ...prev, [q.id]: entry }))
  }

  function confirmAnswer() {
    const q = questions[index]
    if (!q || !answers[q.id]) return
    setRevealed(prev => ({ ...prev, [q.id]: true }))
  }

  function goNext() {
    setShowModal(false)
    const next = index + 1
    if (next >= questions.length) finishSession(answersRef.current, questions)
    else setIndex(next)
  }

  function goPrev() {
    if (index > 0) setIndex(i => i - 1)
  }

  // Loading
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#0b1330', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>Loading questions…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Error
  if (error) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <span style={{ fontSize: 32 }}>😕</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-prim)' }}>{error}</p>
      <button onClick={() => router.push('/student/practice')} style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>← Back</button>
    </div>
  )

  // Derived state
  const q            = questions[index]
  const ans          = q ? answers[q.id] : null
  const isStudyMode  = config?.answerMode === 'study'
  const isRevealed   = q ? !!revealed[q.id] : false
  const correct      = q?.correct_answer
  const subjectName  = q?.subject_name ?? config?.subjects?.[0] ?? ''
  const topicName    = q?.topic_name   ?? config?.topicName     ?? ''
  const subColors    = resolveSubjectColors(subjectName, isDark)
  const accent       = subColors.solid
  const opts         = q?.options ? safeJson(q.options, {}) : {}
  const optEntries   = Object.entries(opts)
  const progress     = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0
  const timerCol     = totalSecs > 0 ? getTimerColor(secsLeft, totalSecs) : undefined
  const isLast       = index >= questions.length - 1
  const correctCount = Object.entries(answers).filter(([qId, a]) => revealed[qId] && a.isCorrect).length
  const pageBg       = isDark ? 'radial-gradient(ellipse 120% 60% at 60% 10%, #16102c 0%, #0c0d12 55%)' : 'var(--bg-base)'

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (min-width: 900px) {
          .ps-panel        { display: flex !important; }
          .ps-mobile-strip { display: none !important; }
          .ps-hud-timer    { display: none !important; }
          .ps-q-text       { font-size: 17px !important; line-height: 1.6 !important; }
          /* On desktop: content gets comfortable padding but no hard max-width cap */
          .ps-scroll-inner { max-width: 720px; margin-left: auto; margin-right: auto; }
          .ps-bottom-inner { max-width: 720px; margin-left: auto; margin-right: auto; width: 100%; }
        }
        @media (max-width: 899px) {
          .ps-panel { display: none !important; }
        }
      `}</style>

      {/* alignItems stretch — prevents option buttons being clipped */}
      <div className="ps-shell" style={{ height: '100dvh', display: 'flex', flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', background: pageBg }}>

        {/* ── Desktop sidebar ── */}
        <DesktopSidebar
          config={config} questions={questions} answers={answers} revealed={revealed}
          index={index} secsLeft={secsLeft} totalSecs={totalSecs}
          accent={accent} onJump={setIndex} timerCol={timerCol} isDark={isDark}
        />

        {/* ── Main content — full width, content inside capped comfortably ── */}
        <div className="ps-main" style={{ flex: 1, minWidth: 0, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <ToastStack toasts={toasts} onDismiss={dismissToast} />

          {/* HUD */}
          <div style={{ flexShrink: 0, height: 54, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid var(--border)', background: isDark ? 'rgba(12,13,18,.96)' : 'rgba(255,255,255,.96)', backdropFilter: 'blur(14px)' }}>
            <button onClick={() => setShowExitModal(true)} style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-tert)', cursor: 'pointer' }}>✕</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 5, borderRadius: 999, background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', borderRadius: 999, width: `${progress}%`, background: accent, transition: 'width .4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sec)' }}>Question {index + 1} of {questions.length}{subjectName ? ` · ${subjectName}` : ''}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: isStudyMode ? 'rgba(92,184,234,.12)' : 'rgba(155,122,224,.12)', color: isStudyMode ? '#5cb8ea' : '#9b7ae0', border: `1px solid ${isStudyMode ? 'rgba(92,184,234,.25)' : 'rgba(155,122,224,.25)'}` }}>
                    {isStudyMode ? '📖 Study' : '⚡ Practice'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>{correctCount} ✓</span>
                </div>
              </div>
            </div>
            <div className="ps-hud-timer" style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 9, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 800, color: timerCol ?? 'var(--text-prim)', fontVariantNumeric: 'tabular-nums' }}>
              {totalSecs > 0 ? formatTime(secsLeft) : `${index + 1}/${questions.length}`}
            </div>
          </div>

          {/* Mobile question strip */}
          <div className="ps-mobile-strip" style={{ display: 'flex', gap: 5, padding: '8px 14px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {questions.map((qq, i) => {
              const a = answers[qq.id]
              const isRev = revealed[qq.id]
              const curr = i === index
              let bg = 'var(--bg-subtle)', bdr = '1px solid var(--border)', col = 'var(--text-tert)'
              if (curr) { bg = accent; bdr = `1px solid ${accent}`; col = '#fff' }
              else if (isRev && a?.isCorrect) { bg = '#dcfce7'; bdr = '1px solid #86efac'; col = '#15803d' }
              else if (isRev && a && !a.isCorrect) { bg = '#fee2e2'; bdr = '1px solid #fca5a5'; col = '#dc2626' }
              else if (a && !isRev) { bg = 'var(--bg-card)'; bdr = `1px solid ${accent}60`; col = accent }
              return (
                <button key={qq.id} onClick={() => setIndex(i)} style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, background: bg, border: bdr, color: col, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .1s' }}>
                  {i + 1}
                </button>
              )
            })}
          </div>

          {/* Scroll zone — full width container, inner content capped for readability */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, padding: '20px 24px 8px' }}>
          <div className="ps-scroll-inner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Question card */}
            {q && (
              <div style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: isDark ? '0 8px 24px rgba(0,0,0,.3)' : '0 2px 12px rgba(10,13,26,.07)', flexShrink: 0 }}>
                <div style={{ padding: '20px 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent }}>{subjectName}</span>
                    {topicName && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tert)' }}>· {topicName}</span>}
                    {q.year && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${accent}12`, color: accent, border: `1px solid ${accent}22` }}>{q.year}</span>}
                  </div>
                  {/* ── Passage text (English comprehension, diagrams, shared context) ── */}
                  {q.passage_text && (
                    <div style={{ marginBottom: 14, borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden', background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(248,250,252,1)' }}>
                      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 11 }}>📄</span>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: accent }}>Read the passage</span>
                      </div>
                      {q.passage_image_url && (
                        <div style={{ borderBottom: '1px solid var(--border)' }}>
                          <img src={q.passage_image_url} alt="Passage" style={{ width: '100%', objectFit: 'contain', maxHeight: 240, display: 'block' }} />
                        </div>
                      )}
                      <div style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-sec)', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{q.passage_text}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Instruction text (e.g. "In the following sentence, choose…") ── */}
                  {q.instruction_text && (
                    <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-tert)', lineHeight: 1.55, marginBottom: 10, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                      {q.instruction_text}
                    </p>
                  )}

                  {/* ── Inline question image (diagram) ── */}
                  {q.has_image && q.image_url && (
                    <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: isDark ? 'rgba(255,255,255,.03)' : '#fff' }}>
                      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)' }}>Diagram</span>
                      </div>
                      <img src={q.image_url} alt={q.image_description ?? 'Question diagram'} style={{ width: '100%', objectFit: 'contain', maxHeight: 220, display: 'block', padding: 8 }} />
                    </div>
                  )}

                  <div className="ps-q-text" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.55, color: 'var(--text-prim)', letterSpacing: '-0.005em' }}>
                    <MathText text={q.question_text ?? q.question ?? ''} as="p" />
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            {q && optEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {optEntries.map(([letter, text]) => {
                  const isCorrectOpt = letter === correct
                  const isPickedOpt  = ans?.selected === letter
                  let bg = isDark ? 'rgba(255,255,255,.04)' : '#ffffff'
                  let border = isDark ? '1.5px solid rgba(255,255,255,.08)' : '1.5px solid #e5e7eb'
                  let textColor = isDark ? 'rgba(255,255,255,.7)' : '#374151'
                  let letterBg = isDark ? 'rgba(255,255,255,.07)' : '#f3f4f6'
                  let letterColor = isDark ? 'rgba(255,255,255,.4)' : '#6b7280'
                  let letterContent = letter
                  if (isRevealed && isCorrectOpt) {
                    bg = isDark ? 'rgba(52,211,153,.1)' : '#f0fdf4'; border = '2px solid #86efac'
                    textColor = isDark ? '#34d399' : '#15803d'; letterBg = '#22c55e'; letterColor = '#fff'; letterContent = '✓'
                  } else if (isRevealed && isPickedOpt && !isCorrectOpt) {
                    bg = isDark ? 'rgba(248,113,113,.08)' : '#fef2f2'; border = '2px solid #fca5a5'
                    textColor = isDark ? '#f87171' : '#dc2626'; letterBg = '#ef4444'; letterColor = '#fff'; letterContent = '✗'
                  } else if (!isRevealed && isPickedOpt) {
                    // Show selected state in practice mode
                    bg = isDark ? `${accent}18` : `${accent}10`; border = `2px solid ${accent}60`
                    textColor = isDark ? accent : accent; letterBg = accent; letterColor = '#fff'
                  }
                  return (
                    <button key={letter} onClick={() => handleAnswer(letter)} disabled={isRevealed}
                      style={{ padding: '13px 16px', borderRadius: 14, background: bg, border, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: isRevealed ? 'default' : 'pointer', transition: 'background .12s, border-color .12s', width: '100%' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: letterBg, color: letterColor, transition: 'all .12s' }}>
                        {letterContent}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: textColor, flex: 1 }}>
                        <MathText text={String(text ?? '')} as="span" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Inline feedback — only shown after answer is confirmed */}
            {isRevealed && q && (
              <div style={{ borderRadius: 16, padding: '14px 18px 16px', flexShrink: 0, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: ans.isCorrect ? '#22c55e' : '#ef4444' }}>
                    {ans.isCorrect ? '✓' : '✗'}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)' }}>
                    {ans.isCorrect ? 'Correct!' : `The correct answer is ${correct}`}
                  </span>
                </div>
                {(() => {
                  const expl = safeJson(q.explanation, {})
                  const concept = expl.concept ?? ''
                  const why = expl.why_correct ?? expl.correct ?? ''
                  return concept || why ? (
                    <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6 }}>
                      {concept || why}
                    </p>
                  ) : null
                })()}
                {q.explanation && (
                  <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 16px', borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}28`, fontSize: 13, fontWeight: 800, color: accent, cursor: 'pointer' }}>
                    💡 Why?
                  </button>
                )}
              </div>
            )}

            {/* Spacer */}
            <div style={{ height: 16, flexShrink: 0 }} />
          </div>{/* end ps-scroll-inner */}
          </div>{/* end scroll zone */}

          {/* Bottom bar — full width, inner content capped */}
          <div style={{ flexShrink: 0, padding: '12px 24px', borderTop: '1px solid var(--border)', background: isDark ? 'rgba(12,13,18,.96)' : 'rgba(255,255,255,.96)', backdropFilter: 'blur(14px)' }}>
            <div className="ps-bottom-inner" style={{ display: 'flex', gap: 10 }}>
              <button onClick={goPrev} disabled={index === 0} style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 18, fontWeight: 700, color: 'var(--text-sec)', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1, flexShrink: 0, transition: 'opacity .15s' }}>←</button>
              {/* Study mode: confirm selection first, then next. Practice mode: go straight to next. */}
              {isStudyMode && ans && !isRevealed
                ? <PressBtn onClick={confirmAnswer} style={{ flex: 1, height: 52 }}>Check answer →</PressBtn>
                : <PressBtn
                    onClick={goNext}
                    disabled={!ans}
                    style={{ flex: 1, height: 52 }}
                  >
                    {!ans ? 'Select an answer' : isLast ? 'Finish →' : 'Next →'}
                  </PressBtn>
              }
            </div>
          </div>
        </div>

        {/* ── Exit modal ── */}
        {showExitModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowExitModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', borderRadius: 24, padding: '24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,.4)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-prim)', marginBottom: 6 }}>Leave session?</p>
              <p style={{ fontSize: 14, color: 'var(--text-sec)', marginBottom: 20, lineHeight: 1.5 }}>Your progress will be saved and you'll see your results.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowExitModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 13, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}>Keep going</button>
                <button onClick={() => { clearInterval(timerRef.current); finishSession(answersRef.current, questions) }} style={{ flex: 1, padding: '12px 0', borderRadius: 13, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>Submit →</button>
              </div>
            </div>
          </div>
        )}

        {/* Explanation modal */}
        {showModal && q && (
          <ExplanationModal
            question={q} selectedKey={ans?.selected}
            onClose={() => setShowModal(false)}
            accent={accent}
            onNext={goNext}
            isLast={isLast}
          />
        )}
      </div>
    </>
  )
}