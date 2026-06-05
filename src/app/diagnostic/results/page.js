'use client'
// src/app/diagnostic/results/page.js
// ─────────────────────────────────────────────────────────────────────────────
// PERF FIX: Page renders IMMEDIATELY from sessionStorage data.
//           Save to DB fires in background — never blocks the UI.
//
// VISUAL REDESIGN:
//   - Score ring with animated fill
//   - Clear "Topics to work on" section highlighted in red
//   - Encouraging tone throughout
//   - Clean, native card language consistent with app
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ── Score helpers ─────────────────────────────────────────────────────────────
function getScoreTier(pct) {
  if (pct >= 80) return { label: 'Excellent',    emoji: '🏆', color: 'text-green-600',  bg: 'bg-green-50',  ring: '#16a34a' }
  if (pct >= 60) return { label: 'Good',         emoji: '💪', color: 'text-blue-600',   bg: 'bg-blue-50',   ring: '#2563eb' }
  if (pct >= 40) return { label: 'Building',     emoji: '📈', color: 'text-amber-600',  bg: 'bg-amber-50',  ring: '#d97706' }
  return              { label: 'Getting started',emoji: '🌱', color: 'text-red-500',    bg: 'bg-red-50',    ring: '#ef4444' }
}

function getEncouragement(pct) {
  if (pct >= 80) return "Outstanding! You have a strong foundation — let's sharpen the edges."
  if (pct >= 60) return "Good performance! A few focused sessions will push you much higher."
  if (pct >= 40) return "You're building. Your personalised plan will close these gaps fast."
  return "Great start — every expert was once a beginner. Your plan is ready."
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color }) {
  const r    = 46
  const circ = 2 * Math.PI * r
  const [dash, setDash] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * circ), 100)
    return () => clearTimeout(t)
  }, [pct, circ])

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="mx-auto">
      <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="64" y="59" textAnchor="middle" style={{ fontSize: 26, fontWeight: 900, fill: '#0f172a' }}>
        {pct}%
      </text>
      <text x="64" y="76" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
        score
      </text>
    </svg>
  )
}

// ── Topic row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic }) {
  const color  = getSubjectColor(topic.subjectName)
  const pct    = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0
  const isWeak = pct < 60

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
            {topic.subjectName}
          </span>
          {isWeak && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              Needs work
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 h-2 bg-subtle rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm font-black w-10 text-right tabular-nums ${
          pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
        }`}>
          {pct}%
        </span>
      </div>
    </div>
  )
}

// ── Summary builder (pure, sync — no async) ───────────────────────────────────
function buildSummary({ answers, questions }) {
  if (!answers || !questions) return null
  const byTopic = {}
  let totalCorrect  = 0
  let totalAnswered = 0

  questions.forEach(q => {
    const attempt = answers?.[q.id] ?? answers?.find?.(a => a.questionId === q.id)
    const isCorrect = attempt?.is_correct ?? attempt?.isCorrect ?? false
    const key = q.topic_name || q.subtopic_name || 'General'

    if (!byTopic[key]) {
      byTopic[key] = {
        name:        key,
        subjectName: q.subject_name ?? '',
        subtopicId:  q.subtopic_id,
        topicId:     q.topic_id,
        total: 0, correct: 0,
      }
    }
    byTopic[key].total++
    totalAnswered++
    if (isCorrect) { byTopic[key].correct++; totalCorrect++ }
  })

  const topics      = Object.values(byTopic).sort((a, b) => {
    const pa = a.total > 0 ? a.correct / a.total : 0
    const pb = b.total > 0 ? b.correct / b.total : 0
    return pa - pb
  })
  const overallScore = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const weakTopics   = topics.filter(t => t.total > 0 && Math.round((t.correct / t.total) * 100) < 60)

  return { topics, overallScore, totalCorrect, totalAnswered, weakTopics }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DiagnosticResultsPage() {
  const router = useRouter()

  // Render immediately — no waiting
  const [summary,    setSummary]    = useState(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | done | error
  const savedRef = useRef(false)

  useEffect(() => {
    // 1. Parse from sessionStorage synchronously — instant render
    const raw = sessionStorage.getItem('diagnostic_results')
    if (!raw) { router.push('/diagnostic'); return }

    const data = JSON.parse(raw)
    const built = buildSummary(data)
    setSummary(built)

    // 2. Fire background save — don't await, don't block
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsSignedIn(true)

      const setupRaw = sessionStorage.getItem('diagnostic_setup')
      if (!setupRaw || savedRef.current) return
      savedRef.current = true

      const setup = JSON.parse(setupRaw)
      setSaveStatus('saving')

      try {
        const res = await fetch('/api/diagnostic/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examType:  setup.examType,
            subjects:  setup.subjects,
            answers:   data.answers,
            questions: data.questions,
          }),
        })
        if (res.ok) {
          sessionStorage.removeItem('diagnostic_results')
          sessionStorage.removeItem('diagnostic_setup')
          setSaveStatus('done')
        } else {
          setSaveStatus('error')
        }
      } catch {
        setSaveStatus('error')
      }
    })
  }, [router])

  if (!summary) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tier = getScoreTier(summary.overallScore)

  return (
    <div className="min-h-screen bg-base pb-16">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        {/* ── Hero score card ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className={`${tier.bg} px-6 pt-8 pb-6 text-center`}>
            <ScoreRing pct={summary.overallScore} color={tier.ring} />
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{tier.emoji}</span>
                <span className={`text-lg font-black ${tier.color}`}>{tier.label}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                {getEncouragement(summary.overallScore)}
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalCorrect}</p>
              <p className="text-[10px] text-gray-400 font-medium">Correct</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalAnswered - summary.totalCorrect}</p>
              <p className="text-[10px] text-gray-400 font-medium">Missed</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900">{summary.totalAnswered}</p>
              <p className="text-[10px] text-gray-400 font-medium">Total</p>
            </div>
          </div>
        </div>

        {/* ── Focus areas — weak topics called out visually ───────────────── */}
        {summary.weakTopics.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <p className="text-sm font-black text-red-700">Focus here first</p>
                <p className="text-xs text-red-500">
                  {summary.weakTopics.length === 1
                    ? '1 topic needs your attention'
                    : `${summary.weakTopics.length} topics need your attention`}
                </p>
              </div>
            </div>
            <div className="px-4">
              {summary.weakTopics.map((topic, i) => (
                <TopicRow key={i} topic={topic} />
              ))}
            </div>
            {isSignedIn && (
              <div className="px-4 py-3 border-t border-red-50">
                <p className="text-xs text-red-500">
                  ✓ These have been added to your study plan
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Full topic breakdown ─────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">All topics</p>
          </div>
          <div className="px-4">
            {summary.topics.map((topic, i) => (
              <TopicRow key={i} topic={topic} />
            ))}
          </div>
        </div>

        {/* ── Save status indicator ────────────────────────────────────────── */}
        {saveStatus === 'saving' && (
          <p className="text-center text-xs text-gray-400">Saving your results…</p>
        )}
        {saveStatus === 'error' && (
          <p className="text-center text-xs text-red-400">Results couldn't be saved — try again later</p>
        )}

        {/* ── CTAs ─────────────────────────────────────────────────────────── */}
        <div className="space-y-3 pb-8">
          {isSignedIn ? (
            <>
              <Link
                href="/student/study-plan"
                className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-sm"
              >
                View my study plan →
              </Link>
              <Link
                href="/student/practice"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-card border border-gray-200 text-gray-700 font-bold text-sm rounded-2xl hover:bg-base active:scale-[0.98] transition-all"
              >
                Practice now
              </Link>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-500">
                Create a free account to save your results and get a personalised study plan.
              </p>
              <Link
                href="/signup"
                className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-sm"
              >
                Create free account →
              </Link>
              <Link
                href="/diagnostic"
                className="flex items-center justify-center gap-2 w-full py-3 text-gray-500 text-sm font-medium"
              >
                Take another diagnostic
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  )
}