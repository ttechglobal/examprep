'use client'
// src/app/student/practice/results/page.js — v5
// CHANGES:
//   + Review mode: after results, student can review each question with correct answers
//   + Narrower content width consistent with session page

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import { usePoints } from '@/contexts/PointsContext'
import { MathText } from '@/lib/mathRenderer'

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreMsg(pct) {
  if (pct >= 90) return { text: "Outstanding — you're exam-ready on these topics.", icon: '🏆', color: 'var(--success)' }
  if (pct >= 75) return { text: 'Strong performance. A couple more sessions and this will stick.', icon: '💪', color: 'var(--success)' }
  if (pct >= 60) return { text: "Good effort. Your mastery on these topics is building.", icon: '📈', color: 'var(--warning)' }
  if (pct >= 40) return { text: "You're building. Your weak topics have been flagged for review.", icon: '🔧', color: 'var(--warning)' }
  return { text: 'Every session teaches you something. Your mastery tracker has been updated.', icon: '📚', color: 'var(--danger)' }
}

function masteryLabel(pct) {
  if (pct >= 80) return { label: 'Got it ✓',     color: '#16a34a' }
  if (pct >= 60) return { label: 'Nearly there', color: '#ca8a04' }
  if (pct >= 40) return { label: 'Needs work',   color: '#ea580c' }
  return               { label: 'Review this',   color: '#dc2626' }
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
  } else if (parsed.questions && Array.isArray(parsed.questions)) {
    questions = parsed.questions
    for (const a of (parsed.answers ?? [])) answerMap[a.questionId] = { isCorrect: a.isCorrect ?? false }
  }
  if (!questions.length) return { topics: [], subjects: {}, totalCorrect: 0, totalAnswered: 0, overallPct: 0 }
  const byTopic = {}, bySubject = {}
  questions.forEach(q => {
    const tKey = q.topic_name || q.subtopic_name || 'General'
    const sKey = q.subject_name || 'General'
    const correct = answerMap[q.id]?.isCorrect ? 1 : 0
    if (!byTopic[tKey]) byTopic[tKey] = { name: tKey, subjectName: sKey, topicId: q.topic_id, total: 0, correct: 0 }
    byTopic[tKey].total++
    byTopic[tKey].correct += correct
    if (!bySubject[sKey]) bySubject[sKey] = { name: sKey, total: 0, correct: 0 }
    bySubject[sKey].total++
    bySubject[sKey].correct += correct
  })
  const totalCorrect  = questions.filter(q => answerMap[q.id]?.isCorrect).length
  const totalAnswered = questions.length
  const overallPct    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const topics        = Object.values(byTopic).sort((a, b) => (a.correct/a.total) - (b.correct/b.total))
  return { topics, subjects: bySubject, totalCorrect, totalAnswered, overallPct }
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, size = 120 }) {
  const r = size * 0.38; const circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => { const t = setTimeout(() => setDash((pct / 100) * circ), 100); return () => clearTimeout(t) }, [pct, circ])
  const col = pct >= 75 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="9" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${col}55)` }} />
      <text x={size/2} y={size/2 - 5} textAnchor="middle" style={{ fontSize: size*0.22, fontWeight: 900, fill: 'var(--text-prim)', fontFamily: 'inherit' }}>{pct}%</text>
      <text x={size/2} y={size/2 + 12} textAnchor="middle" style={{ fontSize: size*0.095, fill: 'var(--text-tert)', fontFamily: 'inherit' }}>score</text>
    </svg>
  )
}

// ── Mastery bar ───────────────────────────────────────────────────────────────
function MasteryBar({ label, pct, subjectName, isNew }) {
  const isDark   = useIsDark()
  const colors   = resolveSubjectColors(subjectName || 'default', isDark)
  const { label: tier, color } = masteryLabel(pct)
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 120); return () => clearTimeout(t) }, [pct])
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
          {subjectName && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, flexShrink: 0 }}>{subjectName}</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {isNew && <span style={{ fontSize: 9, fontWeight: 700, color: '#9b7ae0', background: 'rgba(155,122,224,.12)', border: '1px solid rgba(155,122,224,.25)', borderRadius: 999, padding: '1px 6px', flexShrink: 0 }}>New</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, marginLeft: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color, padding: '2px 7px', borderRadius: 999, background: `${color}14`, border: `1px solid ${color}28` }}>{tier}</span>
          <span style={{ fontSize: 13, fontWeight: 900, color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--bg-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 999, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  )
}

// ── Review mode ───────────────────────────────────────────────────────────────
function ReviewMode({ questions, answerMap, onClose }) {
  const isDark = useIsDark()
  const [idx, setIdx] = useState(0)
  const [showWhyModal, setShowWhyModal] = useState(false)
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
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>Review answers</p>
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
          else { bg = 'var(--bg-inset)' }
          return (
            <button key={qq.id} onClick={() => setIdx(i)} style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, background: bg, border: bdr, color: col, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 620, width: '100%', margin: '0 auto' }}>
        {q && (
          <>
            {/* Result badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', background: ans?.isCorrect ? '#22c55e' : ans ? '#ef4444' : 'var(--text-tert)' }}>
                {ans?.isCorrect ? '✓' : ans ? '✗' : '—'}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: ans?.isCorrect ? '#22c55e' : ans ? '#ef4444' : 'var(--text-tert)' }}>
                  {ans?.isCorrect ? 'You got this right' : ans ? 'You got this wrong' : 'Not answered'}
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

            {/* Options with correct/wrong highlighted */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
                  <div key={letter} style={{ padding: '12px 14px', borderRadius: 12, background: bg, border, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: letterBg, color: letterColor, marginTop: 1 }}>
                      {letterContent}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isCorrectOpt ? 600 : 400, lineHeight: 1.5, color: textColor, flex: 1, paddingTop: 3 }}>
                      <MathText text={String(text ?? '')} as="span" />
                    </span>
                    {isCorrectOpt && <span style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', background: '#dcfce7', borderRadius: 6, padding: '2px 6px', flexShrink: 0, marginTop: 5 }}>CORRECT</span>}
                    {isWrongPick && <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '2px 6px', flexShrink: 0, marginTop: 5 }}>YOUR ANSWER</span>}
                  </div>
                )
              })}
            </div>

            {/* ── Inline feedback — matching study mode exactly ── */}
            {q && (() => {
              const expl          = safeJson(q.explanation ?? q.explanation_json, {})
              const concept       = expl.concept ?? ''
              const whyCorrect    = expl.why_correct ?? expl.correct ?? ''
              const hasExpl       = concept || whyCorrect || (expl.workings?.length > 0) || expl.misconception || Object.keys(expl.wrong_options ?? {}).length > 0
              const snippet       = concept || whyCorrect
              return (
                <div style={{ borderRadius: 16, padding: '14px 16px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: snippet ? 10 : 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', background: ans?.isCorrect ? '#22c55e' : ans?.selected ? '#ef4444' : '#94a3b8' }}>
                      {ans?.isCorrect ? '✓' : ans?.selected ? '✗' : '—'}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-prim)' }}>
                      {ans?.isCorrect ? 'Correct!' : ans?.selected ? `The correct answer is ${correct}` : 'Not answered'}
                    </span>
                  </div>
                  {snippet && (
                    <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: hasExpl ? 10 : 0 }}>
                      {snippet}
                    </p>
                  )}
                  {hasExpl && (
                    <button onClick={() => setShowWhyModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}28`, fontSize: 13, fontWeight: 800, color: accent, cursor: 'pointer' }}>
                      💡 Why?
                    </button>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Footer nav */}
      <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 8, maxWidth: 620, width: '100%', margin: '0 auto' }}>
        <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setShowWhyModal(false) }} disabled={idx === 0} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>← Previous</button>
        {idx < questions.length - 1
          ? <button onClick={() => { setIdx(i => i + 1); setShowWhyModal(false) }} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>Next →</button>
          : <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>Done ✓</button>
        }
      </div>

      {showWhyModal && q && (
        <ReviewExplModal question={q} selectedKey={ans?.selected} accent={accent}
          onClose={() => setShowWhyModal(false)}
          onNext={() => { setShowWhyModal(false); if (idx < questions.length - 1) setIdx(i => i + 1) }}
          isLast={idx >= questions.length - 1} />
      )}
    </div>
  )
}

function ReviewExplModal({ question, selectedKey, accent, onClose, onNext, isLast }) {
  const isCorrect  = selectedKey === question?.correct_answer
  const expl       = safeJson(question?.explanation ?? question?.explanation_json, {})
  const concept    = expl.concept ?? ''
  const whyCorrect = expl.why_correct ?? expl.correct ?? ''
  const misconception = expl.misconception ?? ''
  const wrongOptions  = expl.wrong_options ?? {}
  const workings      = expl.workings ?? []
  const myWrongReason = !isCorrect && selectedKey ? (wrongOptions[selectedKey] ?? '') : ''
  const otherWrong    = Object.entries(wrongOptions).filter(([k]) => k !== question?.correct_answer)
  const subjectName   = question?.subject_name ?? ''
  const isLangSubject = /english|literature|yoruba|igbo|hausa/i.test(subjectName)
  const tabs = [
    ...(workings.length > 0 ? [{ key: 'worked', label: isLangSubject ? 'Explanation' : 'Worked solution' }] : []),
    ...(workings.length === 0 ? [{ key: 'explain', label: 'Explanation' }] : [{ key: 'explain', label: 'Why this answer' }]),
    ...(otherWrong.length > 0 ? [{ key: 'wrong', label: 'Distractors' }] : []),
  ]
  const [tab, setTab] = useState(tabs[0]?.key ?? 'explain')
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ marginTop: 'auto', width: '100%', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto', background: 'var(--bg-card)', borderRadius: '28px 28px 0 0', borderTop: '1px solid var(--border)', maxHeight: '88vh', boxShadow: '0 -20px 60px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border)' }} /></div>
        <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', background: isCorrect ? '#22c55e' : '#ef4444', boxShadow: '0 3px 0 rgba(0,0,0,.18)' }}>
              {isCorrect ? '✓' : '✗'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: isCorrect ? '#22c55e' : '#ef4444', marginBottom: 2 }}>{isCorrect ? 'Correct answer!' : "Not quite — here's why"}</p>
              <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>Correct answer: <strong style={{ color: 'var(--text-prim)' }}>{question?.correct_answer}</strong></p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tert)', fontSize: 13, cursor: 'pointer' }}>✕</button>
          </div>
          {tabs.length > 1 && (
            <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 11, background: 'var(--bg-subtle)' }}>
              {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--active-text)' : 'var(--text-tert)', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>{t.label}</button>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'worked' && workings.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              {!isLangSubject && <span style={{ width: 20, height: 20, borderRadius: 6, background: `${accent}18`, color: accent, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i+1}</span>}
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)', flex: 1 }}><MathText text={typeof step==='string'?step:step.text??step.step??''} as="span" /></p>
            </div>
          ))}
          {tab === 'explain' && <>
            {concept && <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 16, background: `${accent}12`, border: `1px solid ${accent}28` }}><span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span><p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: accent }}>{concept}</p></div>}
            {!isCorrect && (myWrongReason||misconception) && <div style={{ padding: '10px 14px', borderRadius: 16, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}><p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', marginBottom: 5 }}>Why {selectedKey} is wrong</p><p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)' }}><MathText text={myWrongReason||misconception} as="p" /></p></div>}
            {whyCorrect && <div style={{ padding: '10px 14px', borderRadius: 16, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)' }}><p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isCorrect?'#22c55e':'var(--text-tert)', marginBottom: 5 }}>{isCorrect ? "Why you're right" : `Why ${question?.correct_answer} is correct`}</p><p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-sec)' }}><MathText text={whyCorrect} as="p" /></p></div>}
          </>}
          {tab === 'wrong' && otherWrong.map(([key, reason]) => (
            <div key={key} style={{ display: 'flex', gap: 10, padding: '9px 13px', borderRadius: 14, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', marginTop: 1 }}>{key}</span>
              <p style={{ fontSize: 13, lineHeight: 1.55, flex: 1, color: 'var(--text-sec)' }}><MathText text={reason} as="span" /></p>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', cursor: 'pointer' }}>Close</button>
          <button onClick={onNext} style={{ flex: 2, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 800, background: '#0b1330', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #05070f' }}>{isLast ? 'Done ✓' : 'Next question →'}</button>
        </div>
      </div>
    </div>
  )
}


// ── Main ──────────────────────────────────────────────────────────────────────
export default function PracticeResultsPage() {
  const router  = useRouter()
  const isDark  = useIsDark()
  const savedRef = useRef(false)
  const { setTotalPoints } = usePoints()

  const [summary,    setSummary]    = useState(null)
  const [saveResult, setSaveResult] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [isStudy,    setIsStudy]    = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [allQuestions, setAllQuestions] = useState([])
  const [answerMap,    setAnswerMap]    = useState({})
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_results')
    if (!raw) { router.push('/student/practice'); return }
    let parsed
    try { parsed = JSON.parse(raw) } catch { router.push('/student/practice'); return }

    // Build answer map for review
    if (parsed.results && Array.isArray(parsed.results)) {
      setAllQuestions(parsed.results)
      const aMap = {}
      for (const r of parsed.results) aMap[r.id] = { isCorrect: r.isCorrect ?? false, selected: r.userAnswer }
      setAnswerMap(aMap)
    }

    setSummary(buildSummary(parsed))
    setIsStudy(parsed.config?.answerMode === 'study')

    const isGuestSession = !!parsed.config?.isGuest
    setIsGuest(isGuestSession)

    if (savedRef.current) return
    savedRef.current = true
    if (isGuestSession) { setSaving(false); return }

    setSaving(true)
    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then(r => r.json())
      .then(data => {
        setSaveResult(data)
        setSaving(false)
        if (data.new_total_points != null) setTotalPoints(data.new_total_points)
      })
      .catch(() => setSaving(false))
  }, [router, setTotalPoints])

  if (!summary) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#0b1330', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const msg         = scoreMsg(summary.overallPct)
  const xp          = saveResult?.points_awarded ?? Math.min(50, 5 + summary.totalCorrect * 2)
  const subjectList = Object.values(summary.subjects)
  const sessionType = isStudy ? 'Study' : 'Practice'

  return (
    <>
      <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', paddingBottom: 48 }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 16px' }}>

          {/* ── Header ── */}
          <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>{sessionType} complete</p>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.025em' }}>Your results</h1>
            </div>
            {saving && <span style={{ fontSize: 11, color: 'var(--text-tert)', fontWeight: 600 }}>Saving…</span>}
          </div>

          {/* ── Score hero ── */}
          <div style={{ borderRadius: 24, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ padding: '24px 20px', display: 'flex', gap: 20, alignItems: 'center', background: isDark ? 'rgba(255,255,255,.02)' : '#fff' }}>
              <div style={{ flexShrink: 0 }}>
                <ScoreRing pct={summary.overallPct} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>{msg.icon}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.5, marginBottom: 12 }}>{msg.text}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(245,185,66,.12)', border: '1px solid rgba(245,185,66,.3)' }}>
                  <span style={{ fontSize: 14 }}>✦</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>+{xp} XP earned</span>
                </div>
              </div>
            </div>
            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid var(--border)' }}>
              {[
                { val: summary.totalCorrect,                         lbl: 'Correct',  col: '#16a34a' },
                { val: summary.totalAnswered - summary.totalCorrect, lbl: 'Incorrect', col: '#dc2626' },
                { val: summary.totalAnswered,                        lbl: 'Total',     col: 'var(--text-prim)' },
              ].map(({ val, lbl, col }, i) => (
                <div key={lbl} style={{ padding: '12px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1, marginBottom: 3 }}>{val}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-tert)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Review banner ── */}
          {allQuestions.length > 0 && (
            <button
              onClick={() => setShowReview(true)}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 16, background: 'var(--bg-card)', border: '1.5px solid var(--border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(155,122,224,.12)', border: '1px solid rgba(155,122,224,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Review questions & answers</p>
                <p style={{ fontSize: 12, color: 'var(--text-tert)' }}>See what you got right, wrong, and why</p>
              </div>
              <span style={{ fontSize: 16, color: 'var(--text-tert)', flexShrink: 0 }}>→</span>
            </button>
          )}

          {/* ── Topic mastery ── */}
          {summary.topics.length > 0 && (
            <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>This session — topic breakdown</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>What you know and what still needs work</p>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(155,122,224,.12)', border: '1px solid rgba(155,122,224,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📊</div>
              </div>
              <div style={{ padding: '4px 18px 6px' }}>
                {summary.topics.map((t, i) => (
                  <MasteryBar
                    key={i}
                    label={t.name}
                    pct={Math.round((t.correct / t.total) * 100)}
                    subjectName={t.subjectName}
                    isNew={t.correct === t.total && t.total <= 2}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Subject mastery ── */}
          {subjectList.length > 0 && (
            <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)' }}>Subject mastery this session</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tert)', marginTop: 2 }}>How you performed per subject</p>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(92,184,234,.12)', border: '1px solid rgba(92,184,234,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</div>
              </div>
              <div style={{ padding: '4px 18px 6px' }}>
                {subjectList.map((s, i) => (
                  <MasteryBar key={i} label={s.name} pct={Math.round((s.correct / s.total) * 100)} subjectName={null} />
                ))}
              </div>
            </div>
          )}

          {/* ── CTAs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
            <Link href="/student/progress"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px 0', background: '#0b1330', color: '#fff', borderRadius: 16, fontSize: 15, fontWeight: 800, textDecoration: 'none', boxShadow: '0 5px 0 #05070f', letterSpacing: '-0.01em' }}>
              View full progress →
            </Link>
            {isGuest && (
              <div style={{ background: '#0b1330', borderRadius: 20, padding: '24px 20px', marginBottom: 8 }}>
                <p style={{ fontSize: 22, textAlign: 'center', marginBottom: 10 }}>🔓</p>
                <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.02em' }}>Save your progress</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.5, textAlign: 'center', marginBottom: 16 }}>
                  Create a free account to track your topic mastery, see what to work on, and get a personalised study plan.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href="/signup" style={{ display: 'block', padding: '14px 0', borderRadius: 13, background: '#fbbf24', color: '#0b1330', fontSize: 15, fontWeight: 900, textAlign: 'center', textDecoration: 'none', boxShadow: '0 4px 0 #d97706' }}>
                    Create free account →
                  </a>
                  <a href="/login" style={{ display: 'block', padding: '12px 0', borderRadius: 13, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)', fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,.12)' }}>
                    Log in to existing account
                  </a>
                </div>
              </div>
            )}
            <Link href={isGuest ? '/practice' : '/student/practice/setup'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: 'var(--bg-card)', color: 'var(--text-sec)', borderRadius: 16, fontSize: 14, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--border)' }}>
              {isGuest ? 'Practice again (free)' : 'Practice again'}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Review overlay ── */}
      {showReview && (
        <ReviewMode
          questions={allQuestions}
          answerMap={answerMap}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  )
}