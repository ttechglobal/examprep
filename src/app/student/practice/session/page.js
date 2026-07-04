'use client'
// src/app/student/practice/session/page.js — v4
// Full light + dark via CSS var tokens.
// Clean minimal background — not distracting.
// Inline explanations with concept, why-correct, misconception, workings.
// resolveSubjectColors() for subject accent in both modes.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ToastStack } from '@/components/ui/Toast'
import { getTotalSeconds, getWarningThresholds, formatTime, getTimerColor } from '@/lib/practiceTimer'
import { MathText, WorkingsBlock, injectMathStyles } from '@/lib/mathRenderer'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

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

// ── HUD stat card ─────────────────────────────────────────────────────────────
function StatCard({ val, lbl, highlight }) {
  return (
    <div className="bg-subtle rounded-lg px-2.5 py-1 text-center">
      <div className="text-sm font-black" style={{ color: highlight ?? 'var(--text-prim)' }}>{val}</div>
      <div className="text-tertiary font-bold uppercase" style={{ fontSize: 8, letterSpacing: '0.06em' }}>{lbl}</div>
    </div>
  )
}

// ── Inline explanation panel ──────────────────────────────────────────────────
function ExplanationPanel({ question, selectedKey, accent }) {
  const [showWrong, setShowWrong] = useState(false)
  const explanation  = safeJson(question?.explanation, {})
  const isCorrect    = selectedKey === question?.correct_answer
  const concept      = explanation.concept       ?? ''
  const whyCorrect   = explanation.why_correct   ?? explanation.correct ?? ''
  const misconception = explanation.misconception ?? ''
  const wrongOptions = explanation.wrong_options  ?? {}
  const workings     = explanation.workings       ?? []
  const myWrongReason = !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''
  const otherWrong   = Object.entries(wrongOptions).filter(([k]) => k !== question?.correct_answer && k !== selectedKey)

  if (!whyCorrect && !concept && workings.length === 0) return null

  return (
    <div className="bg-card border border-default rounded-2xl overflow-hidden shadow-card"
      style={{ borderTop: `3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>

      {/* Result banner */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-base">{isCorrect ? '✓' : '✗'}</span>
        <span className="text-sm font-black" style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
          {isCorrect ? 'Correct!' : `The correct answer is ${question?.correct_answer}`}
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Concept pill */}
        {concept && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start"
            style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}>
            🎯 {concept}
          </div>
        )}

        {/* Why my answer was wrong */}
        {!isCorrect && myWrongReason && (
          <div>
            <p className="text-xs font-black uppercase tracking-wide mb-1.5"
              style={{ letterSpacing: '0.08em', color: 'var(--danger)' }}>Why {selectedKey} is wrong</p>
            <p className="text-primary text-sm leading-relaxed">{myWrongReason}</p>
          </div>
        )}

        {/* Misconception */}
        {!isCorrect && misconception && (
          <div className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--warning)' }}>⚠️ Common mistake</p>
            <p className="text-primary text-xs leading-relaxed">{misconception}</p>
          </div>
        )}

        {/* Why correct */}
        {whyCorrect && (
          <div>
            <p className="text-xs font-black uppercase tracking-wide mb-1.5"
              style={{ letterSpacing: '0.08em', color: 'var(--success)' }}>
              {isCorrect ? "Why you're right" : `Why ${question?.correct_answer} is correct`}
            </p>
            <p className="text-primary text-sm leading-relaxed">{whyCorrect}</p>
          </div>
        )}

        {/* Workings */}
        {workings.length > 0 && (
          <div className="bg-subtle border border-default rounded-xl px-3 py-3">
            <p className="text-tertiary font-black uppercase tracking-wide mb-2" style={{ fontSize: 9, letterSpacing: '0.08em' }}>Workings</p>
            <WorkingsBlock workings={workings} />
          </div>
        )}

        {/* Other wrong options — collapsible */}
        {otherWrong.length > 0 && (
          <div>
            <button onClick={() => setShowWrong(v => !v)}
              className="flex items-center gap-1.5 text-tertiary text-xs font-bold">
              <span style={{ transform: showWrong ? 'rotate(180deg)' : 'none', transition: 'transform .18s', display: 'inline-block' }}>▾</span>
              Why other options are wrong
            </button>
            {showWrong && (
              <div className="mt-2 flex flex-col gap-2">
                {otherWrong.map(([key, reason]) => (
                  <div key={key} className="flex gap-2 bg-subtle border border-default rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-md bg-inset flex items-center justify-center text-tertiary font-black flex-shrink-0" style={{ fontSize: 9 }}>{key}</span>
                    <p className="text-secondary text-xs leading-relaxed">{reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Next / submit button ──────────────────────────────────────────────────────
function SubmitBtn({ onClick, isLast }) {
  const [p, setP] = useState(false)
  return (
    <button onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 13, borderRadius: 12,
        background: '#0b1330', color: '#fff',
        fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
        letterSpacing: '-0.01em',
        transform: p ? 'translateY(3px)' : 'none',
        boxShadow: p ? '0 2px 0 #05070f' : '0 5px 0 #05070f, 0 8px 20px rgba(10,13,26,0.2)',
        transition: 'transform .1s, box-shadow .1s',
      }}
    >{isLast ? 'See my results →' : 'Next question →'}</button>
  )
}

export default function PracticeSessionPage() {
  const router  = useRouter()
  const isDark  = useIsDark()

  const [config,     setConfig]  = useState(null)
  const [questions,  setQs]      = useState([])
  const [index,      setIndex]   = useState(0)
  const [answers,    setAnswers] = useState({})
  const [xp,         setXP]      = useState(0)
  const [loading,    setLoading] = useState(true)
  const [error,      setError]   = useState(null)
  const [secsLeft,   setSecs]    = useState(0)
  const [totalSecs,  setTotal]   = useState(0)
  const [toasts,     setToasts]  = useState([])
  const timerRef   = useRef(null)
  const answersRef = useRef({})
  const firedRef   = useRef(new Set())

  const addToast     = useCallback((msg, type = 'warning') => { const id = Date.now(); setToasts(p => [...p, { id, message: msg, type }]) }, [])
  const dismissToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])

  useEffect(() => {
    document.body.dataset.hideNav = 'true'
    injectMathStyles()
    return () => { delete document.body.dataset.hideNav }
  }, [])

  const finishSession = useCallback((finalAnswers, finalQs) => {
    clearInterval(timerRef.current)
    const qs = finalQs ?? questions
    sessionStorage.setItem('practice_results', JSON.stringify({
      answers: qs.map(q => ({ questionId: q.id, selected: finalAnswers[q.id]?.selected ?? null, isCorrect: finalAnswers[q.id]?.isCorrect ?? false })),
      questions: qs.map(q => ({ id: q.id, subject_name: q.subject_name, subject_id: q.subject_id, topic_name: q.topic_name, topic_id: q.topic_id, subtopic_name: q.subtopic_name, subtopic_id: q.subtopic_id, correct_answer: q.correct_answer })),
      config,
    }))
    router.push('/student/practice/results')
  }, [config, router, questions])

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_config')
    if (!raw) { setError('No session config.'); setLoading(false); return }
    let cfg; try { cfg = JSON.parse(raw) } catch { setError('Invalid config.'); setLoading(false); return }
    setConfig(cfg)
    const params = new URLSearchParams({ subjects: (cfg.subjects ?? []).join(','), exam: cfg.examType ?? 'WAEC', count: String(cfg.count ?? 10), mode: cfg.mode ?? 'practice' })
    if (cfg.topic_id)   params.set('topic_id', cfg.topic_id)
    if (cfg.subject_id) params.set('subject_id', cfg.subject_id)
    fetch(`/api/practice/questions?${params}`)
      .then(r => r.json())
      .then(data => {
        const qs = data.questions ?? []
        if (!qs.length) { setError(data.error ?? 'No questions available.'); setLoading(false); return }
        setQs(qs); const s = totalSecsFromCfg(cfg); setTotal(s); setSecs(s); setLoading(false)
      })
      .catch(() => { setError('Network error.'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (totalSecs <= 0 || loading || questions.length === 0) return
    const { minuteWarnings, secondWarnings } = getWarningThresholds(totalSecs / 60)
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); finishSession(answersRef.current, questions); return 0 }
        const ns = s - 1
        minuteWarnings.forEach(w => { const thr = w.minutes * 60; if (ns === thr && !firedRef.current.has(thr)) { firedRef.current.add(thr); addToast(w.label, w.minutes <= 1 ? 'urgent' : 'warning') } })
        secondWarnings.forEach(w => { const key = `s${w.seconds}`; if (ns === w.seconds && !firedRef.current.has(key)) { firedRef.current.add(key); addToast(w.label, 'urgent') } })
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
    if (isCorrect) setXP(x => x + 20)
  }

  function goNext() {
    const next = index + 1
    if (next >= questions.length) finishSession(answersRef.current, questions)
    else setIndex(next)
  }

  if (loading) return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#4338ca', borderTopColor: 'transparent' }} />
      <p className="text-secondary text-sm">Loading questions…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-dvh bg-base flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p style={{ fontSize: 32 }}>😕</p>
      <p className="text-primary font-bold text-sm">{error}</p>
      <button onClick={() => router.push('/student/practice')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: '#0b1330' }}>← Back</button>
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

  return (
    /* Full-height flex column — scroll only inside p-content */
    <div className="bg-base flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── HUD ── */}
      <div className="flex items-center justify-between px-4 border-b border-default flex-shrink-0"
        style={{ height: 52, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)' }}>
        <button
          onClick={() => { if (window.confirm('Exit? Progress will be lost.')) { clearInterval(timerRef.current); router.push('/student/practice') } }}
          className="w-8 h-8 rounded-lg bg-subtle flex items-center justify-center text-secondary text-sm font-bold border border-default"
        >←</button>

        <div className="text-center flex-1 mx-3">
          <span className="text-sm font-bold" style={{ color: accent }}>{subjectName}</span>
          {topicName && <span className="text-secondary text-sm"> · {topicName}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <StatCard val={`${index + 1}/${questions.length}`} lbl="Qns" />
          <StatCard val={`✦ ${xp}`} lbl="XP" highlight="var(--gold)" />
          {totalSecs > 0 && <StatCard val={formatTime(secsLeft)} lbl="Time" highlight={timerCol} />}
        </div>
      </div>

      {/* Progress strip — accent colour */}
      <div className="h-0.5 bg-subtle flex-shrink-0">
        <div style={{ height: '100%', background: accent, width: `${progress}%`, transition: 'width .4s' }} />
      </div>

      {/* Mission bar */}
      <div className="mx-4 my-2.5 px-4 py-2.5 rounded-xl border border-default bg-subtle flex-shrink-0">
        <p className="text-tertiary font-black uppercase mb-1" style={{ fontSize: 8, letterSpacing: '0.08em' }}>
          {topicName ? `${topicName} — ` : ''}Q{index + 1} of {questions.length}
        </p>
        <p className="text-secondary text-xs font-semibold">
          {index < questions.length - 1
            ? `${questions.length - index - 1} more question${questions.length - index - 1 !== 1 ? 's' : ''} to go`
            : 'Last question — give it your best!'}
        </p>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Question card */}
        {q && (
          <div className="bg-card border border-default rounded-2xl shadow-card p-4"
            style={{ borderTop: `3px solid ${accent}` }}>
            <p className="font-black uppercase tracking-wide mb-2"
              style={{ fontSize: 9, letterSpacing: '0.1em', color: accent }}>
              Q{index + 1}{q.year ? ` · WAEC ${q.year}` : ''}
              {q.difficulty ? ` · ${q.difficulty}` : ''}
            </p>
            <MathText
              text={q.question_text ?? q.question ?? ''}
              className="text-primary font-medium leading-relaxed text-sm"
              as="p"
            />
            {q.topic_name && <p className="text-tertiary text-xs mt-2">{q.topic_name}</p>}
          </div>
        )}

        {/* Answer buttons */}
        {q && optEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            {optEntries.map(([letter, text]) => {
              const isCorrectOpt = letter === correct
              const isPickedOpt  = ans?.selected === letter
              let bg     = 'var(--bg-card)'
              let border = '2px solid var(--border)'
              let color  = 'var(--text-secondary)'
              if (revealed && isCorrectOpt) {
                bg = 'var(--success-bg)'; border = '2px solid var(--success-border)'; color = 'var(--success)'
              } else if (revealed && isPickedOpt && !isCorrectOpt) {
                bg = 'var(--danger-bg)'; border = '2px solid var(--danger-border)'; color = 'var(--danger)'
              }
              return (
                <button key={letter} onClick={() => handleAnswer(letter)} disabled={revealed}
                  style={{
                    padding: '11px 12px', borderRadius: 12, background: bg, border, color,
                    fontSize: 13, fontWeight: 600, textAlign: 'left',
                    display: 'flex', alignItems: 'flex-start', gap: 9,
                    cursor: revealed ? 'default' : 'pointer', transition: 'all .12s',
                    boxShadow: !revealed ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    fontSize: 10, fontWeight: 800, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: revealed && isCorrectOpt ? 'var(--success)' :
                                revealed && isPickedOpt  ? 'var(--danger)'  :
                                'var(--bg-subtle)',
                    color: revealed && (isCorrectOpt || (isPickedOpt && !isCorrectOpt)) ? '#fff' : 'var(--text-tertiary)',
                  }}>
                    {revealed && isCorrectOpt ? '✓' : revealed && isPickedOpt && !isCorrectOpt ? '✗' : letter}
                  </span>
                  <MathText text={String(text ?? '')} className="flex-1 leading-snug" as="span" />
                </button>
              )
            })}
          </div>
        )}

        {/* ── Inline explanation ── */}
        {revealed && q && (
          <ExplanationPanel question={q} selectedKey={ans.selected} accent={accent} />
        )}
      </div>

      {/* ── Next button — outside scroll, always visible ── */}
      {revealed && (
        <div className="px-4 pb-4 flex-shrink-0">
          <SubmitBtn onClick={goNext} isLast={index >= questions.length - 1} />
        </div>
      )}
    </div>
  )
}