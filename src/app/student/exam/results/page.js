'use client'
// src/app/student/exam/results/page.js
//
// Exam Mode results — detailed score report:
//   1. Overall score + grade (A1–F9 for WAEC, /400 for JAMB)
//   2. Score breakdown by topic (sorted worst → best)
//   3. Difficulty breakdown (easy/medium/hard)
//   4. Each question reviewed: your answer vs correct answer
//   5. CTA: Practice weak topics | Try another exam

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

// WAEC grade thresholds
function waecGrade(pct) {
  if (pct >= 90) return { grade: 'A1', color: '#059669', label: 'Distinction' }
  if (pct >= 80) return { grade: 'B2', color: '#059669', label: 'Very Good' }
  if (pct >= 75) return { grade: 'B3', color: '#16a34a', label: 'Good' }
  if (pct >= 70) return { grade: 'C4', color: '#16a34a', label: 'Credit' }
  if (pct >= 65) return { grade: 'C5', color: '#d97706', label: 'Credit' }
  if (pct >= 60) return { grade: 'C6', color: '#d97706', label: 'Credit' }
  if (pct >= 55) return { grade: 'D7', color: '#ea580c', label: 'Pass' }
  if (pct >= 50) return { grade: 'E8', color: '#dc2626', label: 'Pass' }
  return { grade: 'F9', color: '#dc2626', label: 'Fail' }
}

function ScoreRing({ pct, color }) {
  const r = 44, circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => { const t = setTimeout(() => setDash((pct / 100) * circ), 100); return () => clearTimeout(t) }, [pct, circ])
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}60)` }} />
      <text x="60" y="55" textAnchor="middle" style={{ fontSize: 24, fontWeight: 900, fill: 'var(--text-prim)', fontFamily: 'inherit' }}>{pct}%</text>
      <text x="60" y="72" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-tert)', fontFamily: 'inherit' }}>score</text>
    </svg>
  )
}

export default function ExamResultsPage() {
  const router = useRouter()
  const isDark = useIsDark()
  const [data,    setData]    = useState(null)
  const [tab,     setTab]     = useState('summary')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('exam_results')
    if (!raw) { router.push('/student/exam'); return }
    try { setData(JSON.parse(raw)) } catch { router.push('/student/exam') }
  }, [router])

  // Save results to DB
  useEffect(() => {
    if (!data || saving) return
    setSaving(true)
    const resultsForSave = data.results.map(r => ({
      questionId: r.id,
      selected:   r.userAnswer,
      isCorrect:  r.isCorrect,
    }))
    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: resultsForSave, questions: data.results }),
    }).catch(() => {})
  }, [data]) // eslint-disable-line

  if (!data) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--active-border)', borderTopColor: 'var(--active-text)' }} />
    </div>
  )

  const results   = data.results ?? []
  const examType  = data.config?.examType ?? 'WAEC'
  const subjects  = data.config?.subjects ?? []
  const total     = results.length
  const correct   = results.filter(r => r.isCorrect).length
  const pct       = total > 0 ? Math.round((correct / total) * 100) : 0
  const grade     = waecGrade(pct)

  // By-topic breakdown
  const byTopic = {}
  for (const r of results) {
    const key = r.topic_name || r.subject_name || 'General'
    if (!byTopic[key]) byTopic[key] = { name: key, subject: r.subject_name, total: 0, correct: 0 }
    byTopic[key].total++
    if (r.isCorrect) byTopic[key].correct++
  }
  const topicBreakdown = Object.values(byTopic)
    .map(t => ({ ...t, pct: Math.round((t.correct / t.total) * 100) }))
    .sort((a, b) => a.pct - b.pct) // worst first

  // By-difficulty
  const byDiff = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } }
  for (const r of results) {
    const d = r.difficulty ?? 'medium'
    if (byDiff[d]) { byDiff[d].total++; if (r.isCorrect) byDiff[d].correct++ }
  }

  const weakTopics = topicBreakdown.filter(t => t.pct < 60)

  return (
    <div className="min-h-dvh bg-base pb-20">
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 14px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link href="/student/exam" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sec)', textDecoration: 'none' }}>← New exam</Link>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--warning)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '3px 9px', borderRadius: 999 }}>Exam Mode</span>
        </div>

        {/* Score card */}
        <div style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '24px 20px 20px', textAlign: 'center', background: pct >= 60 ? 'var(--success-bg)' : 'var(--danger-bg)', borderBottom: `1px solid ${pct >= 60 ? 'var(--success-border)' : 'var(--danger-border)'}` }}>
            <ScoreRing pct={pct} color={grade.color} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '6px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: grade.color }}>{grade.grade}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sec)' }}>{grade.label}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-sec)', marginTop: 8, lineHeight: 1.55 }}>
              {examType} · {subjects.join(', ')}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--border)' }}>
            {[
              { val: correct, lbl: 'Correct' },
              { val: total - correct, lbl: 'Missed' },
              { val: total, lbl: 'Total' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-prim)' }}>{val}</p>
                <p style={{ fontSize: 9, color: 'var(--text-tert)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-subtle)', borderRadius: 12, padding: 3, marginBottom: 12 }}>
          {['summary', 'by topic', 'review'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 11, fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all .15s', background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? 'var(--text-prim)' : 'var(--text-tert)', boxShadow: tab === t ? 'var(--shadow-xs)' : 'none', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Summary tab */}
        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Difficulty breakdown */}
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>By difficulty</p>
              </div>
              {Object.entries(byDiff).filter(([, v]) => v.total > 0).map(([d, v]) => {
                const p = Math.round((v.correct / v.total) * 100)
                const col = p >= 70 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)'
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', textTransform: 'capitalize', width: 56 }}>{d}</p>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: col, width: `${p}%`, transition: 'width .7s' }} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 900, color: col, width: 40, textAlign: 'right' }}>{v.correct}/{v.total}</p>
                  </div>
                )
              })}
            </div>

            {/* Weak topics */}
            {weakTopics.length > 0 && (
              <div style={{ borderRadius: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', overflow: 'hidden' }}>
                <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--danger-border)' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--danger)' }}>🎯 Focus here next</p>
                </div>
                {weakTopics.map((t, i) => {
                  const colors = resolveSubjectColors(t.subject || '', isDark)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderBottom: '1px solid var(--danger-border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📖</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
                        <p style={{ fontSize: 10, color: 'var(--danger)' }}>{t.correct}/{t.total} correct · {t.pct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* By topic tab */}
        {tab === 'by topic' && (
          <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {topicBreakdown.map((t, i) => {
              const col = t.pct >= 70 ? 'var(--success)' : t.pct >= 50 ? 'var(--warning)' : 'var(--danger)'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: i < topicBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
                    <div style={{ height: 3, borderRadius: 99, background: 'var(--bg-inset)', overflow: 'hidden', marginTop: 5 }}>
                      <div style={{ height: '100%', borderRadius: 99, background: col, width: `${t.pct}%`, transition: 'width .7s' }} />
                    </div>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 900, color: col, flexShrink: 0 }}>{t.pct}%</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Review tab — each question */}
        {tab === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => {
              const opts = typeof r.options === 'object' ? r.options : {}
              try { Object.assign(opts, JSON.parse(r.options ?? '{}')) } catch {}
              const correctText = opts[r.correct_answer] ?? ''
              const myText      = r.userAnswer ? (opts[r.userAnswer] ?? '') : 'Not answered'
              return (
                <div key={i} style={{ borderRadius: 14, background: 'var(--bg-card)', border: `1px solid ${r.isCorrect ? 'var(--success-border)' : 'var(--danger-border)'}`, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', background: r.isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)', borderBottom: `1px solid ${r.isCorrect ? 'var(--success-border)' : 'var(--danger-border)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: r.isCorrect ? 'var(--success)' : 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.isCorrect ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.isCorrect ? 'var(--success)' : 'var(--danger)' }}>Q{i + 1} · {r.topic_name || r.subject_name}</span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-prim)', lineHeight: 1.5, marginBottom: 8 }}>{r.question_text ?? r.question ?? ''}</p>
                    {!r.isCorrect && r.userAnswer && (
                      <p style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 3 }}>✗ Your answer: <strong>{r.userAnswer}</strong> — {String(myText).slice(0, 60)}</p>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--success)' }}>✓ Correct: <strong>{r.correct_answer}</strong> — {String(correctText).slice(0, 60)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {weakTopics.length > 0 && (
            <button onClick={() => {
              const t = weakTopics[0]
              sessionStorage.setItem('practice_config', JSON.stringify({ subjects: [t.subject || data.config?.subjects?.[0]], count: 20, topicName: t.name }))
              router.push('/student/practice/session')
            }} style={{ padding: 14, borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 5px 0 #05070f' }}>
              Practise {weakTopics[0]?.name} →
            </button>
          )}
          <Link href="/student/exam" style={{ display: 'block', padding: 13, borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-sec)', fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
            Try another exam
          </Link>
        </div>

      </div>
    </div>
  )
}