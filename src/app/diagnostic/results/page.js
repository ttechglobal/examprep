'use client'
// src/app/diagnostic/results/page.js
// VERSION: 2025-STUDY-PLAN-FIX
// Key change: after saving, redirects to /student/study-plan

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const ENCOURAGING = [
  "Every expert was once a beginner.",
  "You now know exactly what to work on. That's powerful.",
  "Progress starts with knowing where you are.",
]

function getEncouragement(score) {
  if (score >= 80) return "Outstanding! You have a strong foundation — let's sharpen the edges."
  if (score >= 60) return "Good performance! A few focused sessions will push you much higher."
  if (score >= 40) return "You're building. Your personalised plan will close these gaps fast."
  if (score >= 20) return "Great start — these results show you exactly what to work on."
  return ENCOURAGING[Math.floor(Math.random() * ENCOURAGING.length)]
}

export default function DiagnosticResultsPage() {
  const router = useRouter()
  const [summary,    setSummary]    = useState(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [score,      setScore]      = useState(0)

  useEffect(() => {
    const raw = sessionStorage.getItem('diagnostic_results')
    if (!raw) { router.push('/diagnostic'); return }

    const data = JSON.parse(raw)
    const built = buildSummary(data)
    setSummary(built)
    setScore(built.overallScore)

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsSignedIn(true)

      const setupRaw = sessionStorage.getItem('diagnostic_setup')
      if (!setupRaw) return

      const setup = JSON.parse(setupRaw)
      setSaving(true)
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
        const result = await res.json()
        console.log('[diagnostic/results] save result:', result)
        sessionStorage.removeItem('diagnostic_results')
        sessionStorage.removeItem('diagnostic_setup')
        setSaved(true)
      } catch (e) {
        console.error('[diagnostic/results] save error:', e)
      }
      setSaving(false)
    })
  }, [router])

  function buildSummary({ answers, questions }) {
    const byTopic = {}
    let totalCorrect = 0
    let totalAnswered = 0

    questions.forEach(q => {
      const attempt = answers?.[q.id]
      if (!attempt) return
      totalAnswered++
      if (attempt.is_correct) totalCorrect++

      const key = q.topic_name || q.subtopic_name || 'General'
      if (!byTopic[key]) byTopic[key] = { name: key, subject: q.subject_name, total: 0, correct: 0 }
      byTopic[key].total++
      if (attempt.is_correct) byTopic[key].correct++
    })

    const topics = Object.values(byTopic).map(t => ({
      ...t, score: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    }))
    const weakTopics   = topics.filter(t => t.score < 60).sort((a, b) => a.score - b.score)
    const strongTopics = topics.filter(t => t.score >= 60).sort((a, b) => b.score - a.score)
    const overallScore = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

    return { weakTopics, strongTopics, overallScore, totalAnswered, totalCorrect }
  }

  if (!summary) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Score */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black text-indigo-600">{score}%</span>
          </div>
          <p className="text-base font-black text-gray-900 mb-1">
            {summary.totalCorrect} of {summary.totalAnswered} correct
          </p>
          <p className="text-sm text-gray-500">{getEncouragement(score)}</p>
        </div>

        {/* Topic breakdown */}
        {summary.weakTopics.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <p className="text-xs font-black text-red-600 uppercase tracking-wide">Topics to work on</p>
            </div>
            {summary.weakTopics.map(t => (
              <div key={t.name} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.subject}</p>
                </div>
                <span className="text-sm font-black text-red-600">{t.score}%</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-center">
          {saving ? (
            <p className="text-indigo-200 text-sm mb-3">Saving your results...</p>
          ) : saved ? (
            <>
              <h2 className="text-base font-black text-white mb-1">Your study plan is ready</h2>
              <p className="text-indigo-200 text-sm mb-4">
                We've identified your weak topics and added them to your study plan.
              </p>
              <Link href="/student/study-plan"
                className="block w-full py-3 bg-white text-indigo-600 text-sm font-black rounded-xl hover:bg-indigo-50 transition-colors">
                View my study plan →
              </Link>
            </>
          ) : !isSignedIn ? (
            <>
              <h2 className="text-base font-black text-white mb-1">Save your results</h2>
              <p className="text-indigo-200 text-sm mb-4">Create an account to save your plan and track your progress.</p>
              <Link href="/signup?from=diagnostic"
                className="block w-full py-3 bg-white text-indigo-600 text-sm font-black rounded-xl text-center mb-2">
                Create a free account →
              </Link>
              <Link href="/login?from=diagnostic"
                className="block w-full py-2 text-indigo-200 text-sm text-center hover:text-white">
                Sign in
              </Link>
            </>
          ) : (
            <p className="text-indigo-200 text-sm">Saving...</p>
          )}
        </div>

      </div>
    </div>
  )
}