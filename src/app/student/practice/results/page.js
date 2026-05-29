'use client'
// src/app/student/practice/results/page.js
// Shows practice session results: overall score, topic breakdown, and
// recommended next actions. Saves attempts in the background.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

function getScoreMessage(pct) {
  if (pct >= 90) return "Outstanding — you're exam-ready on these topics! 🏆"
  if (pct >= 75) return "Strong performance. Keep sharpening these areas. 💪"
  if (pct >= 60) return "Good effort! A few more sessions will close the gaps. 📈"
  if (pct >= 40) return "You're building. Your study plan has been updated. 🔧"
  return "Every session teaches you something. Your plan is updated. 📚"
}

function ScoreRing({ pct }) {
  const r        = 44
  const circ     = 2 * Math.PI * r
  const dash     = (pct / 100) * circ
  const color    = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="60" y="56" textAnchor="middle" className="font-black" style={{ fontSize: 22, fontWeight: 900, fill: '#0f172a' }}>
        {pct}%
      </text>
      <text x="60" y="72" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
        score
      </text>
    </svg>
  )
}

function TopicRow({ topic }) {
  const color = getSubjectColor(topic.subjectName)
  const pct   = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0
  const isWeak = pct < 60

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
            {topic.subjectName}
          </span>
          {isWeak && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              Needs work
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm font-black w-10 text-right ${
          pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
        }`}>
          {pct}%
        </span>
      </div>
    </div>
  )
}

export default function PracticeResultsPage() {
  const router  = useRouter()
  const [data, setData]       = useState(null)
  const [summary, setSummary] = useState(null)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('practice_results')
    if (!raw) { router.push('/student/practice'); return }
    const parsed = JSON.parse(raw)
    setData(parsed)
    setSummary(buildSummary(parsed))

    // Save attempts in the background
    saveAttempts(parsed)
  }, [])

  async function saveAttempts(parsed) {
    try {
      await fetch('/api/student/practice/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      setSaved(true)
    } catch {
      // non-critical — results still shown
    }
  }

  function buildSummary({ answers, questions }) {
    const byTopic = {}

    questions.forEach(q => {
      const key = q.topic_name || q.subtopic_name || 'General'
      if (!byTopic[key]) {
        byTopic[key] = {
          name:        q.topic_name || q.subtopic_name || 'General',
          subjectName: q.subject_name,
          subtopicId:  q.subtopic_id,
          topicId:     q.topic_id,
          total:       0,
          correct:     0,
        }
      }
      byTopic[key].total++
      const ans = answers.find(a => a.questionId === q.id)
      if (ans?.isCorrect) byTopic[key].correct++
    })

    const topics = Object.values(byTopic).sort((a, b) => {
      const pa = a.total > 0 ? a.correct / a.total : 0
      const pb = b.total > 0 ? b.correct / b.total : 0
      return pa - pb // weakest first
    })

    const totalCorrect  = answers.filter(a => a.isCorrect).length
    const totalAnswered = answers.length
    const overallPct    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

    const weakTopics = topics.filter(t => t.total > 0 && Math.round((t.correct / t.total) * 100) < 60)

    return { topics, totalCorrect, totalAnswered, overallPct, weakTopics }
  }

  if (!data || !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { topics, totalCorrect, totalAnswered, overallPct, weakTopics } = summary

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Practice Complete</h1>
        {saved && (
          <span className="text-xs text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-full">
            ✓ Plan updated
          </span>
        )}
      </div>

      {/* Score card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
        <ScoreRing pct={overallPct} />
        <div>
          <p className="text-sm font-bold text-gray-600">
            {totalCorrect} of {totalAnswered} correct
          </p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
            {getScoreMessage(overallPct)}
          </p>
        </div>
      </div>

      {/* Topic breakdown */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="font-black text-gray-900 text-sm">Topic Breakdown</h3>
          <p className="text-xs text-gray-400 mt-0.5">Sorted by weakest first</p>
        </div>
        <div className="px-5 pb-3">
          {topics.map(t => <TopicRow key={t.name + t.subjectName} topic={t} />)}
        </div>
      </div>

      {/* Weak topics — what to study next */}
      {weakTopics.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
          <div>
            <h3 className="font-black text-amber-900 text-sm">Study these next</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              These topics scored below 60% — your plan has been updated.
            </p>
          </div>
          <div className="space-y-2">
            {weakTopics.slice(0, 3).map(t => (
              <Link
                key={t.name}
                href="/student/learn"
                className="flex items-center justify-between bg-white rounded-2xl border border-amber-200 px-4 py-3 hover:border-amber-300 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.subjectName}</p>
                </div>
                <span className="text-xs font-black text-amber-600">
                  {Math.round((t.correct / t.total) * 100)}% →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            sessionStorage.removeItem('practice_results')
            router.push('/student/practice')
          }}
          className="py-3.5 bg-white border-2 border-indigo-200 text-indigo-700 text-sm font-black rounded-2xl hover:bg-indigo-50 transition-colors"
        >
          Practice again
        </button>
        <Link
          href="/student/learn"
          className="py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center"
        >
          Study plan →
        </Link>
      </div>

      <Link
        href="/student/dashboard"
        className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}