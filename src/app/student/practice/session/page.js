'use client'
// src/app/student/practice/session/page.js — v8
// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONTRACT (matches the prototype screenshot exactly):
//   • Outer shell: height:100dvh, flex-col, overflow:hidden
//   • HUD bar:     52px — [✕] [progress bar + Q4 of 10 · Subject + correct] [timer]
//   • Scroll zone: flex:1, overflow-y:auto — question card + options + inline feedback
//   • Bottom bar:  fixed height — single full-width "Next question →" CTA
//
// KEY DIFFERENCES FROM v7:
//   • No separate "quest bar" box — progress lives inside the HUD
//   • Feedback is INLINE below options (not in the bottom bar)
//   • Bottom bar is always a single CTA button — no verdict strip, no Prev
//   • Question card: always #ffffff background in both dark and light
//   • Options: low-opacity background before answering, clear state after
//   • "See worked solution →" gold link inside the inline feedback card
// ─────────────────────────────────────────────────────────────────────────────

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

// ── 3D navy press button ──────────────────────────────────────────────────────
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

// ── Explanation modal — full-screen bottom sheet ──────────────────────────────
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
  const [tab, setTab] = useState('explain')

  useEffect(() => {
    injectMathStyles()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const tabs = [
    { key: 'explain', label: 'Explain' },
    ...(workings.length > 0 ? [{ key: 'worked', label: 'Worked' }] : []),
    ...(otherWrong.length > 0 ? [{ key: 'wrong', label: 'Distractors' }] : []),
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto w-full max-w-lg mx-auto flex flex-col"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1px solid var(--border)',
          maxHeight: '88vh',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-strong)' }} />
        </div>

        {/* Modal header */}
        <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
              background: isCorrect ? 'var(--success)' : 'var(--danger)',
              boxShadow: '0 3px 0 rgba(0,0,0,.18)',
            }}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: isCorrect ? 'var(--success)' : 'var(--danger)', marginBottom: 2 }}>
                {isCorrect ? 'Correct answer!' : "Not quite — here's why"}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>
                Answer: <strong style={{ color: 'var(--text-prim)' }}>{question?.correct_answer}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-tert)', fontSize: 13, cursor: 'pointer',
              }}
            >✕</button>
          </div>

          {tabs.length > 1 && (
            <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 11, background: 'var(--bg-subtle)' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', border: 'none', transition: 'all .15s',
                    background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                    color: tab === t.key ? 'var(--active-text)' : 'var(--text-tert)',
                    boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none',
                    outline: tab === t.key ? '1px solid var(--border)' : 'none',
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'explain' && <>
            {concept && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 16, background: `${accent}12`, border: `1px solid ${accent}28` }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>
                <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: accent }}>{concept}</p>
              </div>
            )}
            {!isCorrect && (myWrongReason || misconception) && (
              <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning)', marginBottom: 5 }}>
                  Why {selectedKey} is wrong
                </p>
                <MathText text={myWrongReason || misconception} className="text-primary" style={{ fontSize: 13, lineHeight: 1.6 }} as="p" />
              </div>
            )}
            {whyCorrect && (
              <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCorrect ? 'var(--success)' : 'var(--text-sec)', marginBottom: 5 }}>
                  {isCorrect ? "Why you're right" : `Why ${question?.correct_answer} is correct`}
                </p>
                <MathText text={whyCorrect} className="text-primary" style={{ fontSize: 13, lineHeight: 1.6 }} as="p" />
              </div>
            )}
          </>}
          {tab === 'worked' && workings.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-sec)', marginBottom: 8 }}>Step-by-step</p>
              <WorkingsBlock workings={workings} />
            </div>
          )}
          {tab === 'wrong' && otherWrong.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-sec)' }}>Why the other options are wrong</p>
              {otherWrong.map(([key, reason]) => (
                <div key={key} style={{ display: 'flex', gap: 10, padding: '9px 13px', borderRadius: 14, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', marginTop: 1 }}>{key}</span>
                  <MathText text={reason} className="text-primary" style={{ fontSize: 13, lineHeight: 1.55, flex: 1 }} as="p" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '12px 20px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              color: 'var(--text-sec)', cursor: 'pointer',
            }}>
            Close
          </button>
          <PressBtn onClick={onNext} style={{ flex: 2, padding: '13px 0' }}>
            {isLast ? 'Finish ✓' : 'Next Question →'}
          </PressBtn>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PracticeSessionPage() {
  const router     = useRouter()
  const isDark     = useIsDark()
  const timerRef   = useRef(null)
  const answersRef = useRef({})
  const firedRef   = useRef(new Set())

  const [config,    setConfig]  = useState(null)
  const [questions, setQs]      = useState([])
  const [index,     setIndex]   = useState(0)
  const [answers,   setAnswers] = useState({})
  const [xp,        setXP]      = useState(0)
  const [secsLeft,  setSecs]    = useState(0)
  const [totalSecs, setTotal]   = useState(0)
  const [loading,   setLoading] = useState(true)
  const [error,     setError]   = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [toasts,    setToasts]  = useState([])

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message: msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), [])

  async function finishSession(ans, qs) {
    clearInterval(timerRef.current)
    const results = qs.map(q => ({
      ...q,
      userAnswer: ans[q.id]?.selected,
      isCorrect: ans[q.id]?.isCorrect ?? false,
    }))
    sessionStorage.setItem('practice_results', JSON.stringify({ results, config, xp }))
    router.push('/student/practice/results')
  }

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No session config.'); setLoading(false); return }
    let cfg; try { cfg = JSON.parse(raw) } catch { setError('Invalid config.'); setLoading(false); return }
    setConfig(cfg)
    const params = new URLSearchParams({
      subjects:    (cfg.subjects ?? []).join(','),
      exam:        cfg.examType ?? 'WAEC',
      count:       String(cfg.count ?? 10),
      mode:        cfg.mode ?? 'practice',
    })
    if (cfg.topic_id)   params.set('topic_id', cfg.topic_id)
    if (cfg.subject_id) params.set('subject_id', cfg.subject_id)
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
    if (!q || answersRef.current[q.id]) return
    const isCorrect = letter === q.correct_answer
    const entry = { selected: letter, isCorrect }
    answersRef.current = { ...answersRef.current, [q.id]: entry }
    setAnswers(prev => ({ ...prev, [q.id]: entry }))
  }

  function goNext() {
    setShowModal(false)
    const next = index + 1
    if (next >= questions.length) finishSession(answersRef.current, questions)
    else setIndex(next)
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#0b1330', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>Loading questions…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <span style={{ fontSize: 32 }}>😕</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-prim)' }}>{error}</p>
      <button onClick={() => router.push('/student/practice')}
        style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>
        ← Back
      </button>
    </div>
  )

  // ── Derived state ────────────────────────────────────────────────────────────
  const q            = questions[index]
  const ans          = q ? answers[q.id] : null
  const revealed     = !!ans
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
  const correctCount = Object.values(answers).filter(a => a.isCorrect).length

  // Page background — slightly different dark vs light, matching the screenshot
  const pageBg = isDark
    ? 'radial-gradient(ellipse 120% 60% at 60% 10%, #16102c 0%, #0c0d12 55%)'
    : 'var(--bg-base)'

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
      background: pageBg,
    }}>
    <div style={{
      width: '100%',
      maxWidth: 680,
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── HUD bar ─────────────────────────────────────────────────────────────
           [✕ close] [progress track + Q4 of 10 · Subject · N correct] [timer pill]
           Height: 52px. No bottom box — progress lives here.
      ── */}
      <div style={{
        flexShrink: 0,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--border)',
        background: isDark ? 'rgba(12,13,18,.96)' : 'rgba(245,244,240,.96)',
      }}>
        {/* Close button */}
        <button
          onClick={() => setShowExitModal(true)}
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--text-tert)', cursor: 'pointer',
          }}
        >✕</button>

        {/* Progress track + label — takes all middle space */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Track */}
          <div style={{ height: 4, borderRadius: 999, background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)', overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${progress}%`, background: accent, transition: 'width .4s ease' }} />
          </div>
          {/* Label row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-sec)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Q{index + 1} of {questions.length}
              {subjectName ? ` · ${subjectName}` : ''}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', flexShrink: 0, marginLeft: 8 }}>
              {correctCount} correct
            </span>
          </div>
        </div>

        {/* Timer pill */}
        <div style={{
          flexShrink: 0,
          padding: '5px 10px',
          borderRadius: 9,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          fontSize: 13,
          fontWeight: 800,
          color: timerCol ?? 'var(--text-prim)',
          letterSpacing: '0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {totalSecs > 0 ? formatTime(secsLeft) : `${index + 1}/${questions.length}`}
        </div>
      </div>

      {/* ── Scroll zone ─────────────────────────────────────────────────────────
           Question card + options + inline feedback all scroll together.
           This keeps the layout clean — no elements jump when feedback appears.
      ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
        padding: '14px 14px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>

        {/* ── Question card — always white ── */}
        {q && (
          <div style={{
            borderRadius: 18,
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,.07)',
            boxShadow: isDark
              ? '0 8px 0 rgba(0,0,0,.12), 0 16px 40px rgba(0,0,0,.3)'
              : '0 2px 8px rgba(10,13,26,.07), 0 1px 3px rgba(10,13,26,.05)',
            flexShrink: 0,
          }}>
            <div style={{ padding: '16px 16px 14px' }}>
              {/* Tag row: subject + topic + year + difficulty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: accent,
                }}>
                  {subjectName}
                </span>
                {topicName && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>
                    · {topicName}
                  </span>
                )}
              </div>

              {/* Stem — always #111318 because card is always white */}
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.45, color: '#111318', letterSpacing: '-0.01em' }}>
                <MathText
                  text={q.question_text ?? q.question ?? ''}
                  className="text-[#111318]"
                  as="p"
                />
              </div>

              {/* Year + difficulty meta */}
              {(q.year || q.difficulty) && (
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, fontWeight: 500 }}>
                  {q.year ? `WAEC ${q.year}` : ''}
                  {q.year && q.difficulty ? ' · ' : ''}
                  {q.difficulty ?? ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Answer options ── */}
        {q && optEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {optEntries.map(([letter, text]) => {
              const isCorrectOpt = letter === correct
              const isPickedOpt  = ans?.selected === letter

              // Determine visual state
              let bg          = isDark ? 'rgba(255,255,255,.04)' : '#ffffff'
              let border      = isDark ? '1.5px solid rgba(255,255,255,.08)' : '1.5px solid #e5e7eb'
              let textColor   = isDark ? 'rgba(255,255,255,.65)' : '#374151'
              let letterBg    = isDark ? 'rgba(255,255,255,.07)' : '#f3f4f6'
              let letterColor = isDark ? 'rgba(255,255,255,.4)' : '#6b7280'
              let letterContent = letter

              if (revealed && isCorrectOpt) {
                bg = isDark ? 'rgba(52,211,153,.1)' : '#f0fdf4'
                border = isDark ? '2px solid rgba(52,211,153,.35)' : '2px solid #86efac'
                textColor = isDark ? '#34d399' : '#15803d'
                letterBg = isDark ? '#34d399' : '#22c55e'
                letterColor = '#ffffff'
                letterContent = '✓'
              } else if (revealed && isPickedOpt && !isCorrectOpt) {
                bg = isDark ? 'rgba(248,113,113,.08)' : '#fef2f2'
                border = isDark ? '2px solid rgba(248,113,113,.3)' : '2px solid #fecaca'
                textColor = isDark ? '#f87171' : '#dc2626'
                letterBg = isDark ? '#f87171' : '#ef4444'
                letterColor = '#ffffff'
                letterContent = '✗'
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  disabled={revealed}
                  style={{
                    padding: '13px 14px', borderRadius: 14,
                    background: bg, border,
                    display: 'flex', alignItems: 'center', gap: 12,
                    textAlign: 'left', cursor: revealed ? 'default' : 'pointer',
                    transition: 'background .12s, border-color .12s',
                    width: '100%',
                  }}
                >
                  {/* Letter badge */}
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: letterBg, color: letterColor,
                    transition: 'background .12s, color .12s',
                  }}>
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

        {/* ── Inline feedback card — appears after answering, scrolls with content ── */}
        {revealed && q && (
          <div style={{
            borderRadius: 16,
            padding: '14px 16px 16px',
            flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,.04)' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid #e5e7eb',
          }}>
            {/* Header row: icon + verdict */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff',
                background: ans.isCorrect ? (isDark ? '#34d399' : '#22c55e') : (isDark ? '#f87171' : '#ef4444'),
              }}>
                {ans.isCorrect ? '✓' : '✗'}
              </div>
              <span style={{
                fontSize: 14, fontWeight: 800,
                color: isDark ? '#e8ecf8' : '#111318',
              }}>
                {ans.isCorrect ? 'Correct!' : `The correct answer is ${correct}`}
              </span>
            </div>

            {/* Explanation preview */}
            {(() => {
              const exp = safeJson(q?.explanation, {})
              const preview = exp.why_correct ?? exp.correct ?? exp.concept ?? ''
              if (!preview) return null
              return (
                <p style={{
                  fontSize: 13, lineHeight: 1.6,
                  color: isDark ? 'rgba(255,255,255,.5)' : '#6b7280',
                  marginBottom: 10,
                }}>
                  {preview}
                </p>
              )
            })()}

            {/* "See worked solution →" link */}
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                color: isDark ? '#fbbf24' : '#d97706',
                letterSpacing: '-0.01em',
              }}
            >
              See worked solution →
            </button>
          </div>
        )}

        {/* Scroll breathing room at the bottom */}
        <div style={{ height: 8, flexShrink: 0 }} />
      </div>

      {/* ── Bottom action bar ────────────────────────────────────────────────────
           Single full-width CTA.
           Before answering: disabled ("Select an answer").
           After answering: "Next question →" / "Finish ✓".
           Always the same height — no layout jump.
      ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 14px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        background: isDark ? 'rgba(12,13,18,.96)' : 'rgba(245,244,240,.96)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
      }}>
        <PressBtn
          onClick={goNext}
          disabled={!revealed}
          style={{ width: '100%', height: 52 }}
        >
          {!revealed
            ? 'Select an answer'
            : isLast
              ? 'Finish ✓'
              : 'Next question →'
          }
        </PressBtn>
      </div>

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowExitModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', borderRadius: 24, padding: '24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,.4)', border: '1px solid var(--border)' }}
          >
            <p style={{ fontSize: 20, marginBottom: 6, textAlign: 'center' }}>⚠️</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.01em' }}>Exit practice?</p>
            <p style={{ fontSize: 13, color: 'var(--text-sec)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
              Your progress on this session will be lost.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowExitModal(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 13, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}
              >
                Keep going
              </button>
              <button
                onClick={() => { clearInterval(timerRef.current); router.push('/student/practice') }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 13, fontSize: 13, fontWeight: 800, background: 'var(--danger)', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,.25)' }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explanation modal */}
      {showModal && q && (
        <ExplanationModal
          question={q}
          selectedKey={ans?.selected}
          onClose={() => setShowModal(false)}
          accent={accent}
          onNext={goNext}
          isLast={isLast}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
    </div>
  )
}