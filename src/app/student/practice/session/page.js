'use client'
// src/app/student/practice/session/page.js — v7
// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONTRACT:
//   • Outer shell: height:100dvh, flex-col, overflow:hidden — never scrolls
//   • HUD bar:          flex-shrink:0, fixed 52px
//   • Quest bar:        flex-shrink:0, fixed ~48px
//   • Scroll zone:      flex:1, overflow-y:auto, minHeight:0
//   • Bottom action bar: flex-shrink:0, RESERVED height always (no layout jump)
//
// BOTTOM BAR DESIGN:
//   • Always the same height regardless of answered state
//   • Before answering: "Select an answer" hint row + disabled nav skeleton
//   • After answering:  verdict row (correct/wrong + Why? button) + live Prev/Next
//   • This means no content jump when the user taps an answer
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

// ── HUD stat pill ─────────────────────────────────────────────────────────────
function StatPill({ val, lbl, highlight }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3px 10px', borderRadius: 8,
      background: 'var(--bg-subtle)', border: '1px solid var(--border)',
      minWidth: 40,
    }}>
      <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, color: highlight ?? 'var(--text-prim)' }}>{val}</span>
      <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tert)' }}>{lbl}</span>
    </div>
  )
}

// ── XP float ─────────────────────────────────────────────────────────────────
function XPFloat({ trigger }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 900)
    return () => clearTimeout(t)
  }, [trigger])
  if (!visible) return null
  return (
    <span style={{
      position: 'absolute', top: -22, right: 0, fontSize: 11, fontWeight: 800,
      color: 'var(--gold)', animation: 'xpfloat 0.9s ease-out forwards',
      pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
    }}>+20 ✦</span>
  )
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
        fontWeight: 800, fontSize: 14, borderRadius: 14,
        transform: p && !disabled ? 'translateY(3px)' : '',
        boxShadow: p && !disabled
          ? '0 2px 0 #05070f'
          : '0 5px 0 #05070f, 0 8px 20px rgba(0,0,0,.15)',
        transition: 'transform .1s, box-shadow .1s',
        opacity: disabled ? 0.35 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Explanation modal — full-screen bottom sheet ──────────────────────────────
function ExplanationModal({ question, selectedKey, onClose, accent, onNext, isLast }) {
  const isCorrect    = selectedKey === question?.correct_answer
  const explanation  = safeJson(question?.explanation, {})
  const concept      = explanation.concept       ?? ''
  const whyCorrect   = explanation.why_correct   ?? explanation.correct ?? ''
  const misconception= explanation.misconception ?? ''
  const wrongOptions = explanation.wrong_options ?? {}
  const workings     = explanation.workings      ?? []
  const myWrongReason= !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''
  const otherWrong   = Object.entries(wrongOptions).filter(([k]) => k !== question?.correct_answer)
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
            {/* Result icon */}
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

          {/* Tab strip */}
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

  const [config,    setConfig]    = useState(null)
  const [questions, setQs]        = useState([])
  const [index,     setIndex]     = useState(0)
  const [answers,   setAnswers]   = useState({})
  const [xp,        setXP]        = useState(0)
  const [xpTrigger, setXPTrig]   = useState(0)
  const [secsLeft,  setSecs]      = useState(0)
  const [totalSecs, setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [toasts,    setToasts]    = useState([])

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
    if (isCorrect) { setXP(x => x + 20); setXPTrig(t => t + 1) }
  }

  function goNext() {
    setShowModal(false)
    const next = index + 1
    if (next >= questions.length) finishSession(answersRef.current, questions)
    else setIndex(next)
  }

  function goPrev() {
    setShowModal(false)
    if (index > 0) setIndex(i => i - 1)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--active-border)', borderTopColor: 'var(--active-text)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>Loading questions…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

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

  const q           = questions[index]
  const ans         = q ? answers[q.id] : null
  const revealed    = !!ans
  const correct     = q?.correct_answer
  const subjectName = q?.subject_name ?? config?.subjects?.[0] ?? ''
  const topicName   = q?.topic_name   ?? config?.topicName     ?? ''
  const subColors   = resolveSubjectColors(subjectName, isDark)
  const accent      = subColors.solid
  const opts        = q?.options ? safeJson(q.options, {}) : {}
  const optEntries  = Object.entries(opts)
  const progress    = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0
  const timerCol    = totalSecs > 0 ? getTimerColor(secsLeft, totalSecs) : undefined
  const isLast      = index >= questions.length - 1

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── HUD — 52px fixed ── */}
      <div style={{
        flexShrink: 0,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => {
            if (window.confirm('Exit? Progress will be lost.')) {
              clearInterval(timerRef.current)
              router.push('/student/practice')
            }
          }}
          style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: 'var(--text-sec)', cursor: 'pointer',
          }}
        >←</button>

        <div style={{ textAlign: 'center', flex: 1, margin: '0 10px', overflow: 'hidden' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{subjectName}</span>
          {topicName && (
            <span style={{ fontSize: 12, color: 'var(--text-sec)' }}> · {topicName}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, position: 'relative', flexShrink: 0 }}>
          <XPFloat trigger={xpTrigger} />
          <StatPill val={`${index + 1}/${questions.length}`} lbl="Qns" />
          <StatPill val={`✦ ${xp}`} lbl="XP" highlight="var(--gold)" />
          {totalSecs > 0 && (
            <StatPill val={formatTime(secsLeft)} lbl="Time" highlight={timerCol} />
          )}
        </div>
      </div>

      {/* ── Quest bar — ~46px fixed ── */}
      <div style={{
        flexShrink: 0,
        margin: '8px 12px 0',
        padding: '7px 12px',
        borderRadius: 12,
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent }}>
            ⚡ {topicName ? `${topicName} · ` : ''}Q{index + 1} of {questions.length}
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-tert)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, width: `${progress}%`, background: accent, transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* ── Scroll zone — takes all remaining space ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
        padding: '10px 12px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Question card */}
        {q && (
          <div style={{
            borderRadius: 16,
            background: 'var(--bg-card)',
            border: `1px solid var(--border)`,
            borderLeft: `4px solid ${accent}`,
            boxShadow: 'var(--shadow-card)',
            flexShrink: 0,
          }}>
            <div style={{ padding: '13px 15px 11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent }}>
                  Q{index + 1}
                </span>
                {q.year && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: `${accent}18`, color: accent }}>
                    WAEC {q.year}
                  </span>
                )}
                {q.difficulty && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 7px', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-sec)' }}>
                    {q.difficulty}
                  </span>
                )}
              </div>
              <MathText
                text={q.question_text ?? q.question ?? ''}
                className="text-primary"
                style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}
                as="p"
              />
              {q.topic_name && (
                <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 5 }}>{q.topic_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Answer options */}
        {q && optEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
            {optEntries.map(([letter, text]) => {
              const isCorrectOpt = letter === correct
              const isPickedOpt  = ans?.selected === letter
              let bg        = 'var(--bg-card)'
              let border    = '1.5px solid var(--border)'
              let textColor = 'var(--text-prim)'
              let dotBg     = 'var(--bg-subtle)'
              let dotColor  = 'var(--text-tert)'
              let dotContent = letter

              if (revealed && isCorrectOpt) {
                bg = 'var(--success-bg)'; border = '2px solid var(--success-border)'; textColor = 'var(--success)'
                dotBg = 'var(--success)'; dotColor = '#fff'; dotContent = '✓'
              } else if (revealed && isPickedOpt && !isCorrectOpt) {
                bg = 'var(--danger-bg)'; border = '2px solid var(--danger-border)'; textColor = 'var(--danger)'
                dotBg = 'var(--danger)'; dotColor = '#fff'; dotContent = '✗'
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  disabled={revealed}
                  style={{
                    padding: '11px 13px', borderRadius: 14,
                    background: bg, border, color: textColor,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    textAlign: 'left', fontSize: 13, fontWeight: 600,
                    cursor: revealed ? 'default' : 'pointer',
                    transition: 'background .12s, border-color .12s',
                    width: '100%',
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    fontSize: 10, fontWeight: 800, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: dotBg, color: dotColor,
                    transition: 'background .12s',
                  }}>
                    {dotContent}
                  </span>
                  <MathText text={String(text ?? '')} className="flex-1" style={{ lineHeight: 1.5 }} as="span" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bottom action bar ─────────────────────────────────────────────────
           ALWAYS rendered. ALWAYS same outer height (~120px).
           Content switches between pre/post answer states.
           This prevents any layout jump when the student taps an answer.
      ── */}
      <div style={{
        flexShrink: 0,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
        padding: '10px 12px',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>

        {/* Row 1 — verdict strip OR placeholder hint (same height, always present) */}
        <div style={{
          height: 44,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          // Style switches between states:
          background: revealed
            ? (ans.isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)')
            : 'var(--bg-subtle)',
          border: `1.5px solid ${revealed
            ? (ans.isCorrect ? 'var(--success-border)' : 'var(--danger-border)')
            : 'var(--border)'}`,
          transition: 'background .2s, border-color .2s',
        }}>
          {revealed ? (
            <>
              {/* Verdict icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ans.isCorrect ? 'var(--success)' : 'var(--danger)',
                color: '#fff', fontSize: 13, fontWeight: 800,
              }}>
                {ans.isCorrect ? '✓' : '✗'}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: ans.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                {ans.isCorrect ? 'Correct!' : `Answer: ${correct}`}
              </span>
              {/* Why button */}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  flexShrink: 0,
                  padding: '6px 13px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  background: 'var(--active-bg)',
                  border: '1.5px solid var(--active-border)',
                  color: 'var(--active-text)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Why? 💡
              </button>
            </>
          ) : (
            // Placeholder — same height, neutral styling
            <p style={{ fontSize: 12, color: 'var(--text-tert)', width: '100%', textAlign: 'center' }}>
              Select an answer above to continue
            </p>
          )}
        </div>

        {/* Row 2 — Prev / Next buttons (always present, disabled before answering) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={goPrev}
            disabled={!revealed || index === 0}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              background: 'var(--bg-subtle)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-sec)',
              cursor: (!revealed || index === 0) ? 'not-allowed' : 'pointer',
              opacity: (!revealed || index === 0) ? 0.35 : 1,
              transition: 'opacity .15s',
            }}
          >← Prev</button>

          <PressBtn
            onClick={goNext}
            disabled={!revealed}
            style={{ flex: 2, height: 46 }}
          >
            {isLast ? 'Finish ✓' : 'Next →'}
          </PressBtn>
        </div>
      </div>

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
        @keyframes xpfloat {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-18px); }
        }
      `}</style>
    </div>
  )
}