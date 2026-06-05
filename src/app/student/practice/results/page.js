'use client'
// src/app/student/practice/results/page.js
// ─────────────────────────────────────────────────────────────────────────────
// CHANGE: awardPoints now passes { correct, total } so the server calculates
// proportional points (base 5 + 2 per correct, capped at 50).
// Everything else unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import { usePoints } from '@/contexts/PointsContext'
import Link from 'next/link'

function getScoreMessage(pct) {
  if (pct >= 90) return "Outstanding — you're exam-ready on these topics! 🏆"
  if (pct >= 75) return "Strong performance. Keep sharpening these areas. 💪"
  if (pct >= 60) return "Good effort! A few more sessions will close the gaps. 📈"
  if (pct >= 40) return "You're building. Your study plan has been updated. 🔧"
  return "Every session teaches you something. Keep going. 📚"
}

function getScoreColor(pct) {
  if (pct >= 75) return { ring: '#16a34a', text: 'text-green-600', bg: 'bg-green-50' }
  if (pct >= 50) return { ring: '#d97706', text: 'text-amber-600', bg: 'bg-amber-50' }
  return              { ring: '#dc2626', text: 'text-red-500',    bg: 'bg-red-50'   }
}

function ScoreRing({ pct }) {
  const { ring } = getScoreColor(pct)
  const r = 46, circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 80)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="mx-auto">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={ring} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x="64" y="59" textAnchor="middle" style={{ fontSize: 26, fontWeight: 900, fill: '#0f172a' }}>{pct}%</text>
      <text x="64" y="76" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>score</text>
    </svg>
  )
}

function TopicRow({ topic }) {
  const color = getSubjectColor(topic.subjectName)
  const pct   = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{topic.subjectName}</span>
          {pct < 60 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Needs work</span>}
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-2 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
          }`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-sm font-black w-10 text-right tabular-nums ${
          pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
        }`}>{pct}%</span>
      </div>
    </div>
  )
}

function buildSummary({ answers, questions }) {
  const byTopic = {}
  questions.forEach(q => {
    const key = q.topic_name || q.subtopic_name || 'General'
    if (!byTopic[key]) byTopic[key] = { name: key, subjectName: q.subject_name ?? '', subtopicId: q.subtopic_id, topicId: q.topic_id, total: 0, correct: 0 }
    byTopic[key].total++
    const ans = answers.find(a => a.questionId === q.id)
    if (ans?.isCorrect) byTopic[key].correct++
  })
  const topics       = Object.values(byTopic).sort((a, b) => (a.correct / a.total || 0) - (b.correct / b.total || 0))
  const totalCorrect = answers.filter(a => a.isCorrect).length
  const totalAnswered = answers.length
  const overallPct   = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const weakTopics   = topics.filter(t => t.total > 0 && Math.round((t.correct / t.total) * 100) < 60)
  return { topics, totalCorrect, totalAnswered, overallPct, weakTopics }
}

export default function PracticeResultsPage() {
  const router = useRouter()
  const { awardPoints } = usePoints()

  const [summary,    setSummary]    = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const savedRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_results')
    if (!raw) { router.push('/student/practice'); return }
    const parsed = JSON.parse(raw)
    const built  = buildSummary(parsed)
    setSummary(built)

    if (savedRef.current) return
    savedRef.current = true
    setSaveStatus('saving')

    // Background save
    fetch('/api/student/practice/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
      .then(r => {
        setSaveStatus(r.ok ? 'done' : 'error')
        // Award proportional points AFTER save succeeds
        if (r.ok) {
          awardPoints('practice_complete', null, {
            correct: built.totalCorrect,
            total:   built.totalAnswered,
          })
        }
      })
      .catch(() => setSaveStatus('error'))
  }, [router, awardPoints])

  if (!summary) return (
    <div className="flex items-center justify-center min-h-screen bg-base">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const colors = getScoreColor(summary.overallPct)

  return (
    <div className="min-h-screen bg-base pb-16">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        {/* Score card */}
        <div className="bg-card rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className={`${colors.bg} px-6 pt-8 pb-6 text-center`}>
            <ScoreRing pct={summary.overallPct} />
            <p className="mt-4 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto font-medium">
              {getScoreMessage(summary.overallPct)}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalCorrect}</p>
              <p className="text-[10px] text-gray-400">Correct</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalAnswered - summary.totalCorrect}</p>
              <p className="text-[10px] text-gray-400">Missed</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalAnswered}</p>
              <p className="text-[10px] text-gray-400">Total</p>
            </div>
          </div>
        </div>

        {/* Weak topics */}
        {summary.weakTopics.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <p className="text-sm font-black text-red-700">Focus here next</p>
                <p className="text-xs text-red-500">Added to your study plan</p>
              </div>
            </div>
            <div className="px-4">
              {summary.weakTopics.map((t, i) => <TopicRow key={i} topic={t} />)}
            </div>
          </div>
        )}

        {/* All topics */}
        {summary.topics.length > summary.weakTopics.length && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100">
              <p className="text-sm font-black text-gray-900">All topics</p>
            </div>
            <div className="px-4">
              {summary.topics.map((t, i) => <TopicRow key={i} topic={t} />)}
            </div>
          </div>
        )}

        {saveStatus === 'saving' && (
          <p className="text-center text-xs text-gray-400">Saving results…</p>
        )}

        <div className="space-y-3 pb-8">
          <Link href="/student/study-plan"
            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-sm">
            View study plan →
          </Link>
          <Link href="/student/practice"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-card border border-gray-200 text-gray-700 font-bold text-sm rounded-2xl hover:bg-base active:scale-[0.98] transition-all">
            Practice again
          </Link>
        </div>
      </div>
    </div>
  )
}