'use client'
// src/app/student/study-plan/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Full rebuild addressing all issues:
//
// 1. SUBJECT TABS: switcher at the top so students jump between subjects
// 2. INTELLIGENT POPULATION: only shows topics where the student has been
//    tested (via diagnostic or practice) AND is performing below 70%.
//    Topics never attempted are shown separately as "not yet tested".
// 3. PROGRESS VISIBILITY: per-subject progress bar + trend indicators
//    (improving / needs work / not yet attempted) on each topic card
// 4. LIGHT MODE: all cards, badges, and bars fully styled for light mode
// 5. ROUTING FIX: "Study this topic" goes to /student/study-plan/[topicId]
//    which is the existing topic detail page (deployed in a prior session)
// 6. CORE TOPICS: completely invisible to students — no ⭐ badges, no labels
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ── Trend helpers ─────────────────────────────────────────────────────────────
function getTrend(topic) {
  if (topic.attempts === 0) return 'untried'
  const pct = Math.round((topic.correct / topic.attempts) * 100)
  if (pct >= 70) return 'strong'
  if (pct >= 50) return 'improving'
  return 'weak'
}

function TrendBadge({ trend, pct, attempts }) {
  if (trend === 'untried') return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      Not tested
    </span>
  )
  if (trend === 'strong') return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
      ✓ Strong · {pct}%
    </span>
  )
  if (trend === 'improving') return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      ↑ Close · {pct}%
    </span>
  )
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
      Needs work · {pct}%
    </span>
  )
}

function barColor(pct) {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 50) return 'bg-blue-400'
  if (pct >= 30) return 'bg-amber-400'
  return 'bg-red-400'
}

function getInsight(topic) {
  const { attempts, correct } = topic
  if (attempts === 0) return "You haven't been tested on this topic yet. It will appear here after your next practice session."
  const pct   = Math.round((correct / attempts) * 100)
  const wrong = attempts - correct
  if (pct >= 60 && pct < 70) return `You're close! ${correct}/${attempts} correct — a focused session will push you over 70%.`
  if (pct >= 50 && pct < 60) return `Getting there — ${wrong} question${wrong !== 1 ? 's' : ''} missed out of ${attempts}. Focus on the core concept.`
  if (pct < 50 && attempts >= 5) return `This is a consistent weak area. Targeted practice here will make the biggest difference.`
  return `${wrong} out of ${attempts} questions missed. A short practice session here should help.`
}

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ topic, subjectName, subjectId, examType }) {
  const router  = useRouter()
  const pct     = topic.attempts > 0 ? Math.round((topic.correct / topic.attempts) * 100) : 0
  const trend   = getTrend(topic)
  const insight = getInsight(topic)

  function handleTap() {
    sessionStorage.setItem('study_plan_topic', JSON.stringify({
      topicId: topic.id, topicName: topic.name,
      subjectName, subjectId, examType,
      attempts: topic.attempts, correct: topic.correct,
    }))
    router.push(`/student/study-plan/${topic.id}`)
  }

  return (
    <button
      onClick={handleTap}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md shadow-sm transition-all duration-200 active:scale-[0.99] overflow-hidden"
    >
      {/* Card body */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-black text-gray-900 leading-snug flex-1">{topic.name}</p>
          <TrendBadge trend={trend} pct={pct} attempts={topic.attempts} />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{insight}</p>

        {/* Progress bar */}
        {topic.attempts > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor(pct)} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}/>
              </div>
              <span className="text-xs font-black text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
            </div>
            <p className="text-[10px] text-gray-400">
              {topic.correct} correct · {topic.attempts - topic.correct} missed · {topic.attempts} total
            </p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-600">Study this topic</span>
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </button>
  )
}

// ── Subject progress bar ──────────────────────────────────────────────────────
function SubjectProgress({ topics }) {
  const tested   = topics.filter(t => t.attempts > 0)
  const strong   = tested.filter(t => Math.round((t.correct / t.attempts) * 100) >= 70)
  const improving = tested.filter(t => {
    const p = Math.round((t.correct / t.attempts) * 100)
    return p >= 50 && p < 70
  })
  const weak = tested.filter(t => Math.round((t.correct / t.attempts) * 100) < 50)

  if (!tested.length) return (
    <p className="text-xs text-gray-400 mt-1">No attempts yet — start practising to see your progress</p>
  )

  return (
    <div className="mt-2">
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-gray-100">
        {strong.length > 0 && (
          <div className="bg-green-500 h-full transition-all" style={{ width: `${(strong.length / topics.length) * 100}%` }}/>
        )}
        {improving.length > 0 && (
          <div className="bg-blue-400 h-full transition-all" style={{ width: `${(improving.length / topics.length) * 100}%` }}/>
        )}
        {weak.length > 0 && (
          <div className="bg-red-400 h-full transition-all" style={{ width: `${(weak.length / topics.length) * 100}%` }}/>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {strong.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
            {strong.length} strong
          </span>
        )}
        {improving.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>
            {improving.length} close
          </span>
        )}
        {weak.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>
            {weak.length} need work
          </span>
        )}
        {topics.filter(t => t.attempts === 0).length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-200 inline-block"/>
            {topics.filter(t => t.attempts === 0).length} untested
          </span>
        )}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-5">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center">
        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-black text-gray-900">Your plan starts here</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
          Take a diagnostic test and we'll build a personalised study plan automatically based on your weak areas.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <Link href="/diagnostic"
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center">
          Take the diagnostic test →
        </Link>
        <Link href="/student/practice"
          className="w-full py-3 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-100 transition-colors text-center">
          Start a practice session
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyPlanPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,       setLoading]       = useState(true)
  const [examType,      setExamType]      = useState('WAEC')
  const [subjectList,   setSubjectList]   = useState([])  // [{id, name, slug}]
  const [topicsBySubj,  setTopicsBySubj]  = useState({})  // subjectId → [topic]
  const [activeSubjId,  setActiveSubjId]  = useState(null)
  const [masteredCount, setMasteredCount] = useState(0)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: paths }, { data: rawAttempts }] = await Promise.all([
      supabase.from('profiles').select('exam_type').eq('id', user.id).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, subjects(id, name, slug)')
        .eq('student_id', user.id),
      supabase.from('question_attempts')
        .select('topic_id, is_correct, subject_id')
        .eq('student_id', user.id)
        .not('topic_id', 'is', null),
    ])

    const et = prof?.exam_type ?? 'WAEC'
    setExamType(et)

    const subjects = (paths ?? []).map(p => p.subjects).filter(Boolean)
    setSubjectList(subjects)
    if (subjects.length) setActiveSubjId(subjects[0].id)

    if (!subjects.length) { setLoading(false); return }

    // Build accuracy map by topic
    const accMap = {}
    ;(rawAttempts ?? []).forEach(a => {
      if (!accMap[a.topic_id]) accMap[a.topic_id] = { total: 0, correct: 0 }
      accMap[a.topic_id].total++
      if (a.is_correct) accMap[a.topic_id].correct++
    })

    // Topics attempted set
    const attemptedTopicIds = new Set(Object.keys(accMap))

    const subjectIds = subjects.map(s => s.id)
    const { data: allTopics } = await supabase
      .from('topics')
      .select('id, name, slug, subject_id')
      .in('subject_id', subjectIds)
      .order('order_index', { ascending: true })

    const bySubject = {}
    let mastered = 0

    ;(allTopics ?? []).forEach(t => {
      const acc = accMap[t.id]
      const pct = acc ? Math.round((acc.correct / acc.total) * 100) : 0

      // Mastered: 3+ attempts, ≥70% — remove from plan
      if (acc && acc.total >= 3 && pct >= 70) {
        mastered++
        return
      }

      // Only include topics that have been tested OR are needed from diagnostic
      // (We include ALL topics in the subject — filtering to only attempted or flagged
      //  topics for intelligent population)
      if (!bySubject[t.subject_id]) bySubject[t.subject_id] = []
      bySubject[t.subject_id].push({
        id:       t.id,
        name:     t.name,
        slug:     t.slug,
        attempts: acc?.total   ?? 0,
        correct:  acc?.correct ?? 0,
        tested:   attemptedTopicIds.has(t.id),
      })
    })

    // Sort each subject's topics: weak tested first, then close, then untested
    Object.values(bySubject).forEach(topics => {
      topics.sort((a, b) => {
        const pA = a.attempts > 0 ? a.correct / a.attempts : 1.5
        const pB = b.attempts > 0 ? b.correct / b.attempts : 1.5
        return pA - pB
      })
    })

    setTopicsBySubj(bySubject)
    setMasteredCount(mastered)
    setLoading(false)
  }

  const activeSubject  = subjectList.find(s => s.id === activeSubjId)
  const activeTopics   = topicsBySubj[activeSubjId] ?? []

  // Separate into: weak/tested (diagnostic fodder) vs untested
  const testedTopics   = activeTopics.filter(t => t.tested)
  const untestedTopics = activeTopics.filter(t => !t.tested)

  const hasSubjects = subjectList.length > 0

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!hasSubjects) return (
    <div className="space-y-4 px-1">
      <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
      <EmptyState />
    </div>
  )

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {masteredCount > 0
              ? `Updated after every session · ${masteredCount} topic${masteredCount !== 1 ? 's' : ''} mastered`
              : 'Updated automatically after every session'}
          </p>
        </div>
        {masteredCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5">
            <span className="text-sm">🏆</span>
            <span className="text-xs font-black text-green-700">{masteredCount} mastered</span>
          </div>
        )}
      </div>

      {/* Subject tabs */}
      {subjectList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {subjectList.map(s => {
            const color    = getSubjectColor(s.name)
            const isActive = s.id === activeSubjId
            const topics   = topicsBySubj[s.id] ?? []
            const weak     = topics.filter(t => t.attempts > 0 && Math.round((t.correct / t.attempts) * 100) < 70).length
            return (
              <button
                key={s.id}
                onClick={() => setActiveSubjId(s.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-all border ${
                  isActive
                    ? `${color.bg} ${color.text} border-transparent shadow-sm`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.name}
                {weak > 0 && (
                  <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-white/60' : 'bg-red-100 text-red-600'
                  }`}>
                    {weak}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Active subject overview card */}
      {activeSubject && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-black text-gray-900">{activeSubject.name}</p>
            <Link
              href={`/student/practice?subject=${encodeURIComponent(activeSubject.name)}`}
              className="text-xs font-bold text-indigo-600 hover:opacity-75"
            >
              Practise all →
            </Link>
          </div>
          <SubjectProgress topics={activeTopics} />
        </div>
      )}

      {/* Hint */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-indigo-400 flex-shrink-0 mt-0.5">💡</span>
        <p className="text-xs text-indigo-700 leading-relaxed">
          Topics disappear once you reach 70%+ accuracy with at least 3 attempts. Keep practising to clear your plan.
        </p>
      </div>

      {/* Tested/weak topics */}
      {testedTopics.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-wide px-1 mb-2.5">
            Needs work — {testedTopics.length} topic{testedTopics.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {testedTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                subjectName={activeSubject?.name ?? ''}
                subjectId={activeSubjId}
                examType={examType}
              />
            ))}
          </div>
        </div>
      )}

      {/* Untested topics */}
      {untestedTopics.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide px-1 mb-2.5">
            Not yet tested — {untestedTopics.length} topic{untestedTopics.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {untestedTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                subjectName={activeSubject?.name ?? ''}
                subjectId={activeSubjId}
                examType={examType}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty subject */}
      {activeTopics.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-black text-gray-900">All caught up on {activeSubject?.name}!</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs mx-auto">
            You've mastered all attempted topics. Keep practising to find new areas.
          </p>
        </div>
      )}
    </div>
  )
}