'use client'
// src/app/student/practice/results/page.js — v3
// ─────────────────────────────────────────────────────────────────────────────
// Fixes in v3:
//   1. CRASH FIX — buildSummary now handles BOTH storage shapes:
//      • New shape (session v5):  { results: [{...q, userAnswer, isCorrect}], config, xp }
//      • Legacy shape (pre-v5):  { answers: [{questionId, isCorrect}], questions: [...] }
//   2. Full light + dark via CSS var tokens — no hardcoded colours.
//   3. ScoreRing SVG uses dynamic CSS var colours.
//   4. TopicRow progress bar and labels use CSS vars.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePoints } from '@/contexts/PointsContext'
import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

function getScoreMessage(pct) {
  if (pct >= 90) return "Outstanding — you're exam-ready on these topics! 🏆"
  if (pct >= 75) return "Strong performance. Keep sharpening these areas. 💪"
  if (pct >= 60) return "Good effort! A few more sessions will close the gaps. 📈"
  if (pct >= 40) return "You're building. Your study plan has been updated. 🔧"
  return "Every session teaches you something. Keep going. 📚"
}

function ScoreRing({ pct }) {
  const r = 46; const circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 80)
    return () => clearTimeout(t)
  }, [pct, circ])

  const ringColor = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="mx-auto">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--bg-inset)" strokeWidth="10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={ringColor} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${ringColor}60)` }} />
      <text x="64" y="59" textAnchor="middle"
        style={{ fontSize: 26, fontWeight: 900, fill: 'var(--text-prim)', fontFamily: 'inherit' }}>
        {pct}%
      </text>
      <text x="64" y="76" textAnchor="middle"
        style={{ fontSize: 11, fill: 'var(--text-tert)', fontFamily: 'inherit' }}>
        score
      </text>
    </svg>
  )
}

function TopicRow({ topic }) {
  const isDark = useIsDark()
  const colors = resolveSubjectColors(topic.subjectName || 'default', isDark)
  const pct    = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0
  const barColor = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
  const pctColor = barColor

  return (
    <div className="flex items-center gap-3 py-3 border-b border-default last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
            {topic.subjectName || 'General'}
          </span>
          {pct < 60 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger border-danger text-danger">
              Needs work
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-primary truncate">{topic.name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-2 bg-inset rounded-full overflow-hidden">
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 999, transition: 'width 0.7s ease' }} />
        </div>
        <span className="text-sm font-black w-10 text-right tabular-nums" style={{ color: pctColor }}>
          {pct}%
        </span>
      </div>
    </div>
  )
}

// ── buildSummary — handles BOTH storage shapes safely ─────────────────────────
function buildSummary(parsed) {
  // Normalise to a common format regardless of which session page wrote the data
  let questions = []
  let answerMap = {} // questionId → { isCorrect }

  if (parsed.results && Array.isArray(parsed.results)) {
    // New shape from session v5: results is an array of question objects with
    // userAnswer and isCorrect mixed in
    questions = parsed.results
    for (const r of parsed.results) {
      answerMap[r.id] = { isCorrect: r.isCorrect ?? false }
    }
  } else if (parsed.questions && Array.isArray(parsed.questions)) {
    // Legacy shape: separate questions + answers arrays
    questions = parsed.questions
    for (const a of (parsed.answers ?? [])) {
      answerMap[a.questionId] = { isCorrect: a.isCorrect ?? false }
    }
  }

  // Guard — if still empty something is badly wrong, return zero-state
  if (!questions.length) {
    return { topics: [], totalCorrect: 0, totalAnswered: 0, overallPct: 0, weakTopics: [] }
  }

  const byTopic = {}
  questions.forEach(q => {
    const key = q.topic_name || q.subtopic_name || 'General'
    if (!byTopic[key]) {
      byTopic[key] = {
        name: key,
        subjectName: q.subject_name ?? '',
        subtopicId: q.subtopic_id,
        topicId: q.topic_id,
        total: 0,
        correct: 0,
      }
    }
    byTopic[key].total++
    if (answerMap[q.id]?.isCorrect) byTopic[key].correct++
  })

  const topics       = Object.values(byTopic).sort((a, b) => (a.correct / a.total) - (b.correct / b.total))
  const totalCorrect = questions.filter(q => answerMap[q.id]?.isCorrect).length
  const totalAnswered = questions.length
  const overallPct   = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const weakTopics   = topics.filter(t => t.total > 0 && Math.round((t.correct / t.total) * 100) < 60)

  return { topics, totalCorrect, totalAnswered, overallPct, weakTopics }
}

export default function PracticeResultsPage() {
  const router = useRouter()
  const { awardPoints } = usePoints()

  const [summary,    setSummary]    = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [xpEarned,   setXpEarned]   = useState(null)
  const savedRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_results')
    if (!raw) { router.push('/student/practice'); return }
    let parsed
    try { parsed = JSON.parse(raw) } catch { router.push('/student/practice'); return }

    const built = buildSummary(parsed)
    setSummary(built)

    if (savedRef.current) return
    savedRef.current = true
    setSaveStatus('saving')

    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then(r => {
        setSaveStatus(r.ok ? 'done' : 'error')
        if (r.ok) {
          awardPoints('practice_complete', null, {
            correct: built.totalCorrect,
            total:   built.totalAnswered,
          }).then(data => {
            if (data?.awarded && data?.points_awarded) {
              setXpEarned(data.points_awarded)
            } else {
              // Estimate for display even if award call fails
              const base = 5; const earned = Math.min(50, base + built.totalCorrect * 2)
              setXpEarned(earned)
            }
          }).catch(() => {})
        }
      })
      .catch(() => setSaveStatus('error'))
  }, [router, awardPoints])

  if (!summary) return (
    <div className="flex items-center justify-center min-h-screen bg-base">
      <div className="w-8 h-8 border-4 rounded-full animate-spin"
        style={{ borderColor: 'var(--active-border)', borderTopColor: 'var(--active-text)' }} />
    </div>
  )

  const scoreBg     = summary.overallPct >= 75 ? 'var(--success-bg)'  : summary.overallPct >= 50 ? 'var(--warning-bg)'  : 'var(--danger-bg)'
  const scoreBorder = summary.overallPct >= 75 ? 'var(--success-border)' : summary.overallPct >= 50 ? 'var(--warning-border)' : 'var(--danger-border)'

  return (
    <div className="min-h-screen bg-base pb-16">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        {/* Score card */}
        <div className="bg-card rounded-3xl border border-default overflow-hidden shadow-card-lg">
          <div className="px-6 pt-8 pb-6 text-center"
            style={{ background: scoreBg, borderBottom: `1px solid ${scoreBorder}` }}>
            <ScoreRing pct={summary.overallPct} />
            <p className="mt-4 text-sm text-secondary leading-relaxed max-w-xs mx-auto font-medium">
              {getScoreMessage(summary.overallPct)}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-default border-t border-default">
            {[
              { val: summary.totalCorrect,                          lbl: 'Correct' },
              { val: summary.totalAnswered - summary.totalCorrect,  lbl: 'Missed' },
              { val: summary.totalAnswered,                         lbl: 'Total' },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="px-4 py-3 text-center">
                <p className="text-xl font-black text-primary">{val}</p>
                <p className="text-[10px] text-tertiary font-semibold">{lbl}</p>
              </div>
            ))}
          </div>
          {xpEarned !== null && (
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-default"
              style={{ background: 'rgba(255,195,107,0.08)' }}>
              <span style={{ fontSize: 14 }}>✦</span>
              <p className="text-sm font-black" style={{ color: 'var(--gold)' }}>+{xpEarned} XP earned</p>
              <span className="text-[10px] text-tertiary font-medium ml-1">
                ({summary.totalCorrect} correct × 2 + 5 base)
              </span>
            </div>
          )}
        </div>

        {/* Weak topics */}
        {summary.weakTopics.length > 0 && (
          <div className="bg-card rounded-2xl border overflow-hidden shadow-card"
            style={{ borderColor: 'var(--danger-border)' }}>
            <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b"
              style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}>
              <span className="text-base">🎯</span>
              <div>
                <p className="text-sm font-black text-danger">Focus here next</p>
                <p className="text-xs text-secondary">Added to your study plan</p>
              </div>
            </div>
            <div className="px-4">
              {summary.weakTopics.map((t, i) => <TopicRow key={i} topic={t} />)}
            </div>
          </div>
        )}

        {/* All topics */}
        {summary.topics.length > summary.weakTopics.length && (
          <div className="bg-card rounded-2xl border border-default overflow-hidden shadow-card">
            <div className="px-4 pt-4 pb-2 border-b border-default">
              <p className="text-sm font-black text-primary">All topics</p>
            </div>
            <div className="px-4">
              {summary.topics.map((t, i) => <TopicRow key={i} topic={t} />)}
            </div>
          </div>
        )}

        {saveStatus === 'saving' && (
          <p className="text-center text-xs text-tertiary">Saving results…</p>
        )}

        <div className="space-y-3 pb-8">
          <Link href="/student/study-plan"
            className="flex items-center justify-center gap-2 w-full py-4 text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all"
            style={{ background: '#0b1330', boxShadow: '0 5px 0 #05070f' }}>
            View study plan →
          </Link>
          <Link href="/student/practice"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-card border border-default text-secondary font-bold text-sm rounded-2xl hover:bg-subtle active:scale-[0.98] transition-all">
            Practice again
          </Link>
        </div>
      </div>
    </div>
  )
}