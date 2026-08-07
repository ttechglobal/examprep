'use client'
// src/app/student/exam/results/page.js — v2
// CHANGES:
//   + Review mode: full question-by-question review with correct/wrong highlighting
//   + Fixed XP update condition (null check instead of > 0)

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { usePoints } from '@/contexts/PointsContext'
import { MathText } from '@/lib/mathRenderer'

function gradeLabel(pct) {
  if (pct >= 75) return { grade: 'A',  label: 'Distinction',   color: '#16a34a', ready: true  }
  if (pct >= 65) return { grade: 'B2', label: 'Credit',        color: '#16a34a', ready: true  }
  if (pct >= 60) return { grade: 'B3', label: 'Credit',        color: '#ca8a04', ready: true  }
  if (pct >= 55) return { grade: 'C4', label: 'Credit',        color: '#ca8a04', ready: false }
  if (pct >= 50) return { grade: 'C5', label: 'Credit',        color: '#ca8a04', ready: false }
  if (pct >= 45) return { grade: 'C6', label: 'Credit',        color: '#ea580c', ready: false }
  if (pct >= 40) return { grade: 'D7', label: 'Pass',          color: '#dc2626', ready: false }
  if (pct >= 35) return { grade: 'E8', label: 'Pass',          color: '#dc2626', ready: false }
  return              { grade: 'F9', label: 'Fail',            color: '#991b1b', ready: false }
}

function safeJson(val, fb) {
  if (!val) return fb
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fb }
}

function buildSummary(parsed) {
  let questions = [], answerMap = {}
  if (parsed.results && Array.isArray(parsed.results)) {
    questions = parsed.results
    for (const r of parsed.results) answerMap[r.id] = { isCorrect: r.isCorrect ?? false, selected: r.userAnswer }
  }
  if (!questions.length) return { bySubject: {}, totalCorrect: 0, totalAnswered: 0, overallPct: 0, examType: 'WAEC' }

  const bySubject = {}
  questions.forEach(q => {
    const sKey = q.subject_name || 'General'
    const tKey = q.topic_name || 'General'
    const correct = answerMap[q.id]?.isCorrect ? 1 : 0
    if (!bySubject[sKey]) bySubject[sKey] = { name: sKey, total: 0, correct: 0, topics: {} }
    bySubject[sKey].total++
    bySubject[sKey].correct += correct
    if (!bySubject[sKey].topics[tKey]) bySubject[sKey].topics[tKey] = { name: tKey, total: 0, correct: 0 }
    bySubject[sKey].topics[tKey].total++
    bySubject[sKey].topics[tKey].correct += correct
  })

  const totalCorrect  = questions.filter(q => answerMap[q.id]?.isCorrect).length
  const totalAnswered = questions.length
  const overallPct    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  return { bySubject, totalCorrect, totalAnswered, overallPct, examType: parsed.config?.examType ?? 'WAEC' }
}

function ScoreRing({ pct, size = 130 }) {
  const r = size * 0.38, circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => { const t = setTimeout(() => setDash((pct / 100) * circ), 120); return () => clearTimeout(t) }, [pct, circ])
  const g = gradeLabel(pct)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={g.color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 8px ${g.color}50)` }} />
      <text x={size/2} y={size/2 - 8} textAnchor="middle" style={{ fontSize: size*0.21, fontWeight: 900, fill: '#fff', fontFamily: 'inherit' }}>{pct}%</text>
      <text x={size/2} y={size/2 + 9} textAnchor="middle" style={{ fontSize: size*0.12, fontWeight: 900, fill: g.color, fontFamily: 'inherit' }}>{g.grade}</text>
      <text x={size/2} y={size/2 + 22} textAnchor="middle" style={{ fontSize: size*0.085, fill: 'rgba(255,255,255,.4)', fontFamily: 'inherit' }}>{g.label}</text>
    </svg>
  )
}

function SubjectCard({ subject }) {
  const isDark   = useIsDark()
  const colors   = resolveSubjectColors(subject.name, isDark)
  const [open, setOpen] = useState(false)
  const pct    = Math.round((subject.correct / subject.total) * 100)
  const g      = gradeLabel(pct)
  const topics = Object.values(subject.topics)

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg, border: `1px solid ${colors.border}`, fontSize: 16 }}>
          {colors.icon ?? '📖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>{subject.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>{subject.correct}/{subject.total} correct · {topics.length} topics</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: g.color, lineHeight: 1 }}>{pct}%</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: g.color }}>{g.grade} · {g.label}</p>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-tert)', marginLeft: 6, transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      <div style={{ height: 3, background: 'var(--bg-inset)', margin: '0 16px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: g.color, borderRadius: 99 }} />
      </div>
      {open && topics.length > 0 && (
        <div style={{ padding: '8px 16px 12px' }}>
          {topics.map((t, i) => {
            const tPct = Math.round((t.correct / t.total) * 100)
            const tCol = gradeLabel(tPct).color
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < topics.length-1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <div style={{ width: 60, height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${tPct}%`, background: tCol, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: tCol, minWidth: 30, textAlign: 'right', flexShrink: 0 }}>{tPct}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Review mode — identical pattern to practice review ────────────────────────
function ReviewMode({ questions, answerMap, onClose }) {
  const isDark = useIsDark()
  const [idx, setIdx] = useState(0)
  const q   = questions[idx]
  const ans = q ? answerMap[q.id] : null
  const opts = q?.options ? safeJson(q.options, {}) : {}
  const optEntries = Object.entries(opts)
  const correct = q?.correct_answer
  const subColors = resolveSubjectColors(q?.subject_name || 'default', isDark)
  const accent = subColors.solid

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Review exam answers</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)' }}>Question {idx + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 14, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <button onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={idx >= questions.length - 1} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 14, cursor: idx >= questions.length - 1 ? 'not-allowed' : 'pointer', opacity: idx >= questions.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
        </div>
      </div>

      {/* Question dots strip */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {questions.map((qq, i) => {
          const a = answerMap[qq.id]
          const isCurr = i === idx
          let bg = 'var(--bg-subtle)', bdr = '1px solid var(--border)', col = 'var(--text-tert)'
          if (isCurr) { bg = accent; bdr = `1px solid ${accent}`; col = '#fff' }
          else if (a?.isCorrect) { bg = '#dcfce7'; bdr = '1px solid #86efac'; col = '#15803d' }
          else if (a && !a.isCorrect) { bg = '#fee2e2'; bdr = '1px solid #fca5a5'; col = '#dc2626' }
          return (
            <button key={qq.id ?? i} onClick={() => setIdx(i)} style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, background: bg, border: bdr, color: col, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {q && (
          <>
            {/* Result badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', background: ans?.isCorrect ? '#22c55e' : ans?.selected ? '#ef4444' : '#94a3b8' }}>
                {ans?.isCorrect ? '✓' : ans?.selected ? '✗' : '—'}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: ans?.isCorrect ? '#22c55e' : ans?.selected ? '#ef4444' : 'var(--text-tert)' }}>
                  {ans?.isCorrect ? 'You got this right' : ans?.selected ? 'You got this wrong' : 'Not answered'}
                </p>
                {q.subject_name && <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>{q.subject_name}{q.topic_name ? ` · ${q.topic_name}` : ''}{q.year ? ` · ${q.year}` : ''}</p>}
              </div>
            </div>

            {/* Question */}
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 18px' }}>
              <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, color: 'var(--text-prim)' }}>
                <MathText text={q.question_text ?? q.question ?? ''} as="span" />
              </p>
            </div>

            {/* Options with correct/wrong highlighting — same style as practice session */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {optEntries.map(([letter, text]) => {
                const isCorrectOpt = letter === correct
                const isPickedOpt  = ans?.selected === letter
                const isWrongPick  = isPickedOpt && !isCorrectOpt

                let bg = isDark ? 'rgba(255,255,255,.04)' : '#fafafa'
                let border = isDark ? '1.5px solid rgba(255,255,255,.08)' : '1.5px solid #e5e7eb'
                let textColor = isDark ? 'rgba(255,255,255,.6)' : '#6b7280'
                let letterBg = isDark ? 'rgba(255,255,255,.07)' : '#f3f4f6'
                let letterColor = isDark ? 'rgba(255,255,255,.4)' : '#9ca3af'
                let letterContent = letter

                if (isCorrectOpt) {
                  bg = isDark ? 'rgba(52,211,153,.1)' : '#f0fdf4'; border = '2px solid #86efac'
                  textColor = isDark ? '#34d399' : '#15803d'; letterBg = '#22c55e'; letterColor = '#fff'; letterContent = '✓'
                } else if (isWrongPick) {
                  bg = isDark ? 'rgba(248,113,113,.08)' : '#fef2f2'; border = '2px solid #fca5a5'
                  textColor = isDark ? '#f87171' : '#dc2626'; letterBg = '#ef4444'; letterColor = '#fff'; letterContent = '✗'
                }

                return (
                  <div key={letter} style={{ padding: '12px 14px', borderRadius: 14, background: bg, border, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: letterBg, color: letterColor, marginTop: 1 }}>
                      {letterContent}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isCorrectOpt ? 600 : 400, lineHeight: 1.5, color: textColor, flex: 1, paddingTop: 4 }}>
                      <MathText text={String(text ?? '')} as="span" />
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0, marginTop: 4 }}>
                      {isCorrectOpt && <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: 5, padding: '2px 6px' }}>CORRECT</span>}
                      {isWrongPick && <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', background: '#fee2e2', borderRadius: 5, padding: '2px 6px' }}>YOUR ANSWER</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rich explanation — same depth as study mode */}
            {q && (() => {
              const expl = safeJson(q.explanation ?? q.explanation_json, {})
              const concept       = expl.concept ?? ''
              const whyCorrect    = expl.why_correct ?? expl.correct ?? ''
              const misconception = expl.misconception ?? ''
              const wrongOptions  = expl.wrong_options ?? {}
              const workings      = expl.workings ?? []
              const myWrongReason = ans?.selected && ans.selected !== correct ? (wrongOptions[ans.selected] ?? '') : ''
              const hasContent    = concept || whyCorrect || misconception || myWrongReason || workings.length > 0
              if (!hasContent) return null
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {concept && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 14, background: `${accent}10`, border: `1px solid ${accent}25` }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
                      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: accent }}>{concept}</p>
                    </div>
                  )}
                  {(myWrongReason || misconception) && ans && !ans.isCorrect && (
                    <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', marginBottom: 5 }}>Why {ans.selected} is wrong</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)' }}><MathText text={myWrongReason || misconception} as="span" /></p>
                    </div>
                  )}
                  {whyCorrect && (
                    <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: ans?.isCorrect ? '#22c55e' : 'var(--text-tert)', marginBottom: 5 }}>
                        {ans?.isCorrect ? "Why you're right" : `Why ${correct} is correct`}
                      </p>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)' }}><MathText text={whyCorrect} as="span" /></p>
                    </div>
                  )}
                  {workings.length > 0 && (
                    <div style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tert)', marginBottom: 8 }}>Step-by-step</p>
                      {workings.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < workings.length - 1 ? 8 : 0 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 6, background: `${accent}18`, color: accent, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)', flex: 1 }}><MathText text={typeof step === 'string' ? step : step.text ?? step.step ?? ''} as="span" /></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Footer nav */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8, maxWidth: 680, width: '100%', margin: '0 auto' }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>← Previous</button>
        {idx < questions.length - 1
          ? <button onClick={() => setIdx(i => i + 1)} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>Next →</button>
          : <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>Done ✓</button>
        }
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ExamResultsPage() {
  const router   = useRouter()
  const savedRef = useRef(false)
  const { setTotalPoints } = usePoints()

  const [summary,      setSummary]      = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [xp,           setXp]           = useState(null)
  const [showReview,   setShowReview]   = useState(false)
  const [allQuestions, setAllQuestions] = useState([])
  const [answerMap,    setAnswerMap]    = useState({})

  useEffect(() => {
    const raw = sessionStorage.getItem('exam_results')
    if (!raw) { router.push('/student/exam'); return }
    let parsed
    try { parsed = JSON.parse(raw) } catch { router.push('/student/exam'); return }

    setSummary(buildSummary(parsed))

    if (parsed.results && Array.isArray(parsed.results)) {
      setAllQuestions(parsed.results)
      const aMap = {}
      for (const r of parsed.results) aMap[r.id] = { isCorrect: r.isCorrect ?? false, selected: r.userAnswer }
      setAnswerMap(aMap)
    }

    if (savedRef.current) return
    savedRef.current = true
    setSaving(true)
    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then(r => r.json())
      .then(data => {
        setXp(data.points_awarded ?? null)
        setSaving(false)
        if (data.new_total_points != null) setTotalPoints(data.new_total_points)
      })
      .catch(() => setSaving(false))
  }, [router, setTotalPoints])

  if (!summary) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#9b7ae0', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const subjectList = Object.values(summary.bySubject)
  const readyCount  = subjectList.filter(s => gradeLabel(Math.round((s.correct/s.total)*100)).ready).length
  const examType    = summary.examType

  return (
    <>
      <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', paddingBottom: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>{examType} Mock Exam · Complete</p>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Your exam results</h1>
            </div>
            {saving && <span style={{ fontSize: 11, color: 'var(--text-tert)', fontWeight: 600 }}>Saving…</span>}
          </div>

          {/* Score hero */}
          <div style={{ borderRadius: 24, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ background: 'linear-gradient(135deg,#0b1330 0%,#1a2c6e 100%)', padding: '28px 24px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRing pct={summary.overallPct} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{examType} Performance</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
                  {readyCount}/{subjectList.length} subjects on track
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.5, marginBottom: xp !== null ? 14 : 0 }}>
                  {readyCount === subjectList.length
                    ? "You're on track across all subjects. Keep practising to maintain this."
                    : `${subjectList.length - readyCount} subject${subjectList.length - readyCount > 1 ? 's' : ''} still need focused practice before exam day.`
                  }
                </p>
                {xp !== null && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(245,185,66,.15)', border: '1px solid rgba(245,185,66,.3)' }}>
                    <span>✦</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24' }}>+{xp} XP earned</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--border)' }}>
              {[
                { val: summary.totalCorrect,                         lbl: 'Correct',  col: '#16a34a' },
                { val: summary.totalAnswered - summary.totalCorrect, lbl: 'Missed',   col: '#dc2626' },
                { val: summary.totalAnswered,                        lbl: 'Total',    col: 'var(--text-prim)' },
              ].map(({ val, lbl, col }, i) => (
                <div key={lbl} style={{ padding: '12px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 3 }}>{val}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Review banner */}
          {allQuestions.length > 0 && (
            <button
              onClick={() => setShowReview(true)}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 16, background: 'var(--bg-card)', border: '1.5px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(155,122,224,.12)', border: '1px solid rgba(155,122,224,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Review questions & answers</p>
                <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>See every question with corrections — {allQuestions.length} questions</p>
              </div>
              <span style={{ fontSize: 16, color: 'var(--text-tert)', flexShrink: 0 }}>→</span>
            </button>
          )}

          {/* Subject breakdown */}
          {subjectList.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Subject breakdown — tap to expand topics</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {subjectList.map((s, i) => <SubjectCard key={i} subject={s} />)}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
            <Link href="/student/progress"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px 0', background: '#0b1330', color: '#fff', borderRadius: 16, fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: '0 5px 0 #05070f', letterSpacing: '-0.01em' }}>
              View full progress →
            </Link>
            <Link href="/student/practice"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0', background: 'var(--bg-card)', color: 'var(--text-sec)', borderRadius: 16, fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--border)' }}>
              Practice weak topics
            </Link>
            <Link href="/student/exam"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0', background: 'var(--bg-card)', color: 'var(--text-sec)', borderRadius: 16, fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--border)' }}>
              Try another mock exam
            </Link>
          </div>
        </div>
      </div>

      {showReview && (
        <ReviewMode questions={allQuestions} answerMap={answerMap} onClose={() => setShowReview(false)} />
      )}
    </>
  )
}
