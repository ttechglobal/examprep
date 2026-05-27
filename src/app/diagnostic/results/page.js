'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ENCOURAGING = [
  "Every expert was once a beginner. You're on your way.",
  "This is your starting line, not your finish line.",
  "You now know exactly what to work on. That's powerful.",
  "Progress starts with knowing where you are.",
  "The fact that you took this test puts you ahead of most.",
]

function getEncouragement(score) {
  if (score >= 80) return "Outstanding! You have a strong foundation — let's sharpen the edges."
  if (score >= 60) return "Good performance! A few focused sessions will push you much higher."
  if (score >= 40) return "You're building. Your personalised plan will close these gaps fast."
  if (score >= 20) return "Great start — this test just showed you exactly what to work on."
  return ENCOURAGING[Math.floor(Math.random() * ENCOURAGING.length)]
}

export default function DiagnosticResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState(null)
  const [summary, setSummary] = useState(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('diagnostic_results')
    if (!raw) { router.push('/diagnostic'); return }

    const data = JSON.parse(raw)
    setResults(data)
    setSummary(buildSummary(data))

    // Check auth
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsSignedIn(true)
        // Auto-save for signed-in users
        const setupRaw = sessionStorage.getItem('diagnostic_setup')
        if (setupRaw) {
          setSaving(true)
          const setup = JSON.parse(setupRaw)
          try {
            await fetch('/api/diagnostic/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                examType: setup.examType,
                subjects: setup.subjects,
                answers: data.answers,
                questions: data.questions,
              }),
            })
            sessionStorage.removeItem('diagnostic_results')
            sessionStorage.removeItem('diagnostic_setup')
            setSaved(true)
          } catch (e) {
            console.error('Save failed:', e)
          }
          setSaving(false)
        }
      }
    })
  }, [router])

  function buildSummary({ answers, questions }) {
    const byTopic = {}
    const bySubject = {}

    questions.forEach(q => {
      const attempt = answers[q.id]
      if (!attempt) return

      // By subject
      if (!bySubject[q.subject_name]) {
        bySubject[q.subject_name] = { total: 0, correct: 0 }
      }
      bySubject[q.subject_name].total++
      if (attempt.is_correct) bySubject[q.subject_name].correct++

      // By topic
      const topicKey = q.topic_name || q.subtopic_name || 'General'
      if (!byTopic[topicKey]) {
        byTopic[topicKey] = {
          name: topicKey,
          subject: q.subject_name,
          total: 0,
          correct: 0,
        }
      }
      byTopic[topicKey].total++
      if (attempt.is_correct) byTopic[topicKey].correct++
    })

    const topics = Object.values(byTopic).map(t => ({
      ...t,
      score: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      isWeak: Math.round((t.correct / t.total) * 100) < 60,
    })).sort((a, b) => a.score - b.score)

    const subjects = Object.entries(bySubject).map(([name, d]) => ({
      name,
      score: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    }))

    return { topics, subjects }
  }

  if (!results || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalCorrect = Object.values(results.answers).filter(a => a.is_correct).length
  const totalQuestions = Object.keys(results.answers).length
  const overallScore = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  const weakTopics = summary.topics.filter(t => t.isWeak)
  const strongTopics = summary.topics.filter(t => !t.isWeak)

  const scoreColor =
    overallScore >= 70 ? 'text-green-600' :
    overallScore >= 40 ? 'text-yellow-500' :
    'text-red-500'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Logo */}
        <div className="text-center pb-2">
          <h1 className="text-2xl font-black text-indigo-600">ExamPrep</h1>
          {saving && <p className="text-xs text-gray-400 mt-1">Saving your results...</p>}
          {saved && <p className="text-xs text-green-600 mt-1">✓ Results saved to your account</p>}
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-400 mb-1">Your score</p>
          <p className={`text-7xl font-black ${scoreColor}`}>{overallScore}%</p>
          <p className="text-gray-400 text-sm mt-1">
            {totalCorrect} of {totalQuestions} correct
          </p>
          <p className="text-gray-600 text-sm mt-4 leading-relaxed font-medium">
            {getEncouragement(overallScore)}
          </p>
        </div>

        {/* Topic breakdown — the most important section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Topic Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Here's how you did across each topic
            </p>
          </div>

          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-red-50">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                  Topics to work on
                </p>
              </div>
              {weakTopics.map(topic => (
                <div key={topic.name} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 bg-red-50/30">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{topic.name}</p>
                    <p className="text-xs text-gray-400">{topic.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-red-600 w-10 text-right">
                      {topic.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strong topics */}
          {strongTopics.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-green-50">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide">
                  Good
                </p>
              </div>
              {strongTopics.map(topic => (
                <div key={topic.name} className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{topic.name}</p>
                    <p className="text-xs text-gray-400">{topic.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${topic.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-green-600 w-10 text-right">
                      {topic.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personalised plan message */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-indigo-800">
            📋 We've created a personalised plan for you
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            {weakTopics.length > 0
              ? `Starting with your ${weakTopics.length} weak topic${weakTopics.length > 1 ? 's' : ''}, ordered by priority.`
              : "Your plan keeps you sharp on the topics you're doing well in."}
          </p>
        </div>

        {/* CTA */}
        {isSignedIn ? (
          <div className="bg-indigo-600 rounded-2xl p-5 text-center">
            <h2 className="text-base font-bold text-white mb-1">
              Your study plan is ready
            </h2>
            <p className="text-indigo-200 text-sm mb-4">
              Head to your dashboard to start working through your plan.
            </p>
            <Link
              href="/student/dashboard"
              className="block w-full py-3 bg-white text-indigo-600 text-sm font-bold rounded-xl text-center hover:bg-indigo-50 transition-colors"
            >
              Go to My Dashboard →
            </Link>
          </div>
        ) : (
          <div className="bg-indigo-600 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-1">
              Ready to start learning?
            </h2>
            <p className="text-indigo-200 text-sm mb-4">
              Create a free account to save your results and start working through your personalised plan.
            </p>
            <Link
              href="/signup?from=diagnostic"
              className="block w-full py-3 bg-white text-indigo-600 text-sm font-bold rounded-xl text-center hover:bg-indigo-50 transition-colors mb-2"
            >
              Create an Account to Start Learning →
            </Link>
            <Link
              href="/login?from=diagnostic"
              className="block w-full py-2 text-indigo-200 text-sm text-center hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-6">
          <Link href="/diagnostic" className="text-indigo-500 hover:underline">
            Retake the test
          </Link>
        </p>

      </div>
    </div>
  )
}