'use client'

// src/components/lesson/PrerequisiteGate.jsx
// Wraps lesson entry on the student side.
// Checks for unmet prerequisites, shows a soft quiz popup if found.
// NEVER blocks the student — always lets them proceed.
// Three tiers: mastered (silent), advisory (gentle), strong advisory (clear but non-blocking).

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

// ── Shuffle helper ────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Walk prerequisite graph up to maxDepth levels ────────────────────────────
async function getPrerequisiteIds(supabase, topicId, maxDepth) {
  const visited = new Set()
  const queue   = [{ id: topicId, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift()
    if (depth >= maxDepth) continue

    const { data: edges } = await supabase
      .from('topic_prerequisites')
      .select('requires_topic_id')
      .eq('topic_id', id)

    for (const edge of (edges ?? [])) {
      const pid = edge.requires_topic_id
      if (!visited.has(pid) && pid !== topicId) {
        visited.add(pid)
        queue.push({ id: pid, depth: depth + 1 })
      }
    }
  }
  return visited
}

// ── Score tier logic ──────────────────────────────────────────────────────────
function getScoreTier(score, threshold) {
  if (score >= threshold)       return 'mastered'   // ≥ threshold%  — silent pass
  if (score >= threshold - 20)  return 'advisory'   // 20pts below   — gentle nudge
  return 'strong_advisory'                           // well below    — clear message
}

// ── Mini quiz ─────────────────────────────────────────────────────────────────
function MiniQuiz({ prereqData, threshold, onComplete, onSkip }) {
  const { topic, questions } = prereqData
  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState([])
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const q         = questions[current]
  const total     = questions.length
  const isLast    = current + 1 >= total
  const correct   = q?.correct_answer
  const isRight   = selected === correct

  if (!q) return null

  const handleSelect = (key) => {
    if (revealed) return
    setSelected(key)
    setRevealed(true)
  }

  const handleNext = () => {
    const newAnswers = [...answers, { selected, correct, isRight: selected === correct }]
    if (isLast) {
      const score = Math.round((newAnswers.filter(a => a.isRight).length / total) * 100)
      onComplete(topic.id, score)
    } else {
      setAnswers(newAnswers)
      setSelected(null)
      setRevealed(false)
      setCurrent(c => c + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{topic.name}</span>
        <span>{current + 1} / {total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${((current) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-indigo-50 rounded-2xl px-4 py-3.5">
        <p className="text-sm font-bold text-indigo-900 leading-snug">{q.question_text}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(q.options ?? {}).map(([key, text]) => {
          let style = 'border-gray-200 bg-white text-gray-800'
          if (revealed) {
            if (key === correct)   style = 'border-green-400 bg-green-50 text-green-900'
            else if (key === selected) style = 'border-red-300 bg-red-50 text-red-800'
            else                   style = 'border-gray-100 bg-gray-50 text-gray-400'
          } else if (key === selected) {
            style = 'border-indigo-400 bg-indigo-50 text-indigo-900'
          }
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={revealed}
              className={`w-full text-left text-sm px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${style}`}
            >
              <span className="w-6 h-6 rounded-full border-2 border-current flex-shrink-0 flex items-center justify-center text-xs font-black">{key}</span>
              <span className="flex-1">{text}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className={`rounded-2xl px-4 py-3 text-sm ${isRight ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {isRight
              ? <><span className="font-bold">Correct! </span>{q.explanation?.correct}</>
              : <><span className="font-bold">The answer is {correct}. </span>{q.explanation?.correct}</>
            }
          </div>
          {!isRight && q.explanation?.wrong_options?.[selected] && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700">
              <span className="font-bold text-red-600">Why {selected} is wrong: </span>
              {q.explanation.wrong_options[selected]}
            </div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            {isLast ? 'See result →' : 'Next question →'}
          </button>
        </div>
      )}

      {/* Skip link — always available, subtle */}
      <button
        onClick={onSkip}
        className="w-full text-xs text-gray-300 hover:text-gray-400 transition-colors pt-1"
      >
        Skip and go straight to the lesson
      </button>
    </div>
  )
}

// ── Score result screen ───────────────────────────────────────────────────────
function ScoreResult({ score, threshold, topicName, onContinue, onReviewLesson, subjectName }) {
  const tier  = getScoreTier(score, threshold)
  const color = getSubjectColor(subjectName)

  const content = {
    mastered: {
      emoji:   '🎉',
      heading: 'You\'re ready!',
      message: `You scored ${score}% on ${topicName}. You clearly know this well — the lesson is unlocked.`,
      ctaLabel: 'Go to lesson →',
      showReview: false,
    },
    advisory: {
      emoji:   '💡',
      heading: 'Almost there',
      message: `You scored ${score}% on ${topicName}. You might find the next topic easier after a quick review, but you can go ahead if you feel ready.`,
      ctaLabel: 'Continue to lesson →',
      showReview: true,
    },
    strong_advisory: {
      emoji:   '📚',
      heading: 'Worth reviewing first',
      message: `You scored ${score}% on ${topicName}. This topic is a building block for what you\'re about to learn. We'd recommend reviewing it first — but the lesson is yours if you want to jump in.`,
      ctaLabel: 'Continue anyway →',
      showReview: true,
    },
  }

  const c = content[tier]

  return (
    <div className="text-center space-y-4 py-4">
      <p className="text-5xl">{c.emoji}</p>
      <div>
        <p className="text-xl font-black text-gray-900">{c.heading}</p>
        <div className="mx-auto mt-2 w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              tier === 'mastered' ? 'bg-green-500' :
              tier === 'advisory' ? 'bg-yellow-400' : 'bg-red-400'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-1">{score}%</p>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{c.message}</p>
      <div className="space-y-2 pt-2">
        <button
          onClick={onContinue}
          className={`w-full py-4 ${color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
        >
          {c.ctaLabel}
        </button>
        {c.showReview && (
          <button
            onClick={onReviewLesson}
            className="w-full py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Review {topicName} first
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main gate modal ───────────────────────────────────────────────────────────
export default function PrerequisiteGate({
  topicId,
  subjectName,
  onProceed,        // called when student proceeds to lesson
  onGoToPrereq,     // called when student chooses to review a prereq lesson
  children,         // the lesson component — rendered when gate is passed
}) {
  const [phase, setPhase]                 = useState('checking') // 'checking' | 'gate' | 'quiz' | 'result' | 'open'
  const [prereqs, setPrereqs]             = useState([])
  const [currentPrereqIndex, setCurrentPrereqIndex] = useState(0)
  const [quizResults, setQuizResults]     = useState([]) // { topicId, score }[]
  const [threshold, setThreshold]         = useState(60)
  const [currentResult, setCurrentResult] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient()

        // Get topic's subject settings
        const { data: topic } = await supabase
          .from('topics')
          .select('id, name, subject_id, subjects(prereq_map_status, prereq_depth, prereq_pass_threshold)')
          .eq('id', topicId)
          .single()

        const settings = topic?.subjects
        if (settings?.prereq_map_status !== 'approved') {
          setPhase('open'); return
        }

        const depth     = settings?.prereq_depth ?? 2
        const threshold = settings?.prereq_pass_threshold ?? 60
        setThreshold(threshold)

        // Walk the graph
        const prereqIds = await getPrerequisiteIds(supabase, topicId, depth)
        if (prereqIds.size === 0) { setPhase('open'); return }

        // Check student mastery
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setPhase('open'); return }

        const { data: mastery } = await supabase
          .from('student_topic_mastery')
          .select('topic_id, status, score')
          .eq('student_id', user.id)
          .in('topic_id', [...prereqIds])

        const masteryMap = {}
        mastery?.forEach(m => { masteryMap[m.topic_id] = m })

        const unmetIds = [...prereqIds].filter(id => masteryMap[id]?.status !== 'mastered')
        if (unmetIds.length === 0) { setPhase('open'); return }

        // Fetch topic names + questions for unmet prereqs
        const { data: prereqTopics } = await supabase
          .from('topics')
          .select('id, name')
          .in('id', unmetIds)

        const withQuestions = []
        for (const pt of (prereqTopics ?? [])) {
          const { data: qs } = await supabase
            .from('questions')
            .select('id, question_text, options, correct_answer, difficulty, explanation')
            .eq('topic_id', pt.id)
            .eq('is_active', true)
            .limit(30)

          const questions = shuffle(qs ?? []).slice(0, 10)
          if (questions.length > 0) {
            withQuestions.push({
              topic:         pt,
              currentStatus: masteryMap[pt.id]?.status ?? 'untested',
              lastScore:     masteryMap[pt.id]?.score ?? null,
              questions,
              hasQuestions:  true,
            })
          }
        }

        if (withQuestions.length === 0) { setPhase('open'); return }

        setPrereqs(withQuestions)
        setPhase('gate')
      } catch {
        // Always open on error — never block
        setPhase('open')
      }
    }
    check()
  }, [topicId])

  const handleQuizComplete = async (topicId, score) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const status = score >= threshold ? 'mastered' : 'weak'
        await supabase
          .from('student_topic_mastery')
          .upsert({
            student_id:    user.id,
            topic_id:      topicId,
            status,
            score,
            last_tested_at: new Date().toISOString(),
          }, { onConflict: 'student_id,topic_id' })
      }
    } catch { /* non-blocking */ }

    setQuizResults(prev => [...prev, { topicId, score }])
    setCurrentResult({ topicId, score, topicName: prereqs[currentPrereqIndex]?.topic?.name })
    setPhase('result')
  }

  const handleContinueAfterResult = () => {
    const nextIndex = currentPrereqIndex + 1
    if (nextIndex < prereqs.length) {
      setCurrentPrereqIndex(nextIndex)
      setCurrentResult(null)
      setPhase('quiz')
    } else {
      // All prereqs checked — open lesson
      setPhase('open')
      onProceed?.()
    }
  }

  const handleGoToPrereq = () => {
    const prereqTopicId = currentResult?.topicId
    setPhase('open') // don't leave them stuck
    onGoToPrereq?.(prereqTopicId)
  }

  const handleSkip = () => {
    setPhase('open')
    onProceed?.()
  }

  const currentPrereq = prereqs[currentPrereqIndex]

  // ── Lesson is open ───────────────────────────────────────────────────────────
  if (phase === 'open') return children

  // ── Checking ─────────────────────────────────────────────────────────────────
  if (phase === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Getting your lesson ready…</p>
        </div>
      </div>
    )
  }

  // ── Modal wrapper ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">

          {/* ── Gate intro ── */}
          {phase === 'gate' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <p className="text-2xl">🧠</p>
                <h2 className="text-lg font-black text-gray-900">Quick check before we start</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Before jumping in, let's check one quick thing — it'll only take 2 minutes and will make this topic much easier to understand.
                </p>
              </div>

              <div className="space-y-2">
                {prereqs.map((p, i) => (
                  <div key={p.topic.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{p.topic.name}</p>
                      <p className="text-xs text-gray-400">{p.questions.length} questions · ~2 min</p>
                    </div>
                    {p.currentStatus === 'weak' && (
                      <span className="ml-auto text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold flex-shrink-0">
                        Needs review
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('quiz')}
                className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
              >
                Let's check →
              </button>

              {/* Proceed anyway — subtle, not prominent */}
              <button
                onClick={handleSkip}
                className="w-full text-xs text-gray-300 hover:text-gray-400 transition-colors"
              >
                I'm ready — take me straight to the lesson
              </button>
            </div>
          )}

          {/* ── Quiz ── */}
          {phase === 'quiz' && currentPrereq && (
            <MiniQuiz
              prereqData={currentPrereq}
              threshold={threshold}
              onComplete={handleQuizComplete}
              onSkip={handleSkip}
            />
          )}

          {/* ── Result ── */}
          {phase === 'result' && currentResult && (
            <ScoreResult
              score={currentResult.score}
              threshold={threshold}
              topicName={currentResult.topicName}
              subjectName={subjectName}
              onContinue={handleContinueAfterResult}
              onReviewLesson={handleGoToPrereq}
            />
          )}
        </div>
      </div>
    </div>
  )
}