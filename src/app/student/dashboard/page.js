'use client'
// src/app/student/dashboard/page.js  — REPLACE existing file

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getRandomNudge } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import WeeklyGoals from '@/components/dashboard/WeeklyGoals'
import TodaysFocus from '@/components/dashboard/TodaysFocus'
import CuratedLearningPlan from '@/components/dashboard/CuratedLearningPlan'
import Link from 'next/link'

// ── Subject overview card ─────────────────────────────────────────────────────
function SubjectCard({ path, lessonProgress, subtopicMap }) {
  const subjectName = path.subjects?.name ?? 'Unknown'
  const subjectSlug = path.subjects?.slug ?? ''
  const color       = getSubjectColor(subjectName)

  const completedIds = new Set(
    (lessonProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id)
  )
  const allIds   = path.ordered_subtopic_ids ?? []
  const total    = allIds.length
  const done     = allIds.filter(id => completedIds.has(id)).length
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0

  const nextId  = allIds.find(id => !completedIds.has(id) && subtopicMap?.[id]?.lesson_status === 'published')
  const nextSub = nextId ? subtopicMap?.[nextId] : null

  // First incomplete regardless of lesson status — surface as weak area
  const weakId  = allIds.find(id => !completedIds.has(id) && id !== nextId)
  const weakSub = weakId ? subtopicMap?.[weakId] : null

  return (
    <div className={`${color.bg} rounded-3xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-black text-base ${color.text}`}>{subjectName}</h3>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white/50 ${color.text}`}>
          {pct}% mastery
        </span>
      </div>

      <div className="h-2 bg-white/40 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${color.accent} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
        />
      </div>

      <div className="space-y-1 mb-4">
        {nextSub && (
          <p className={`text-xs ${color.text} opacity-80`}>
            <span className="font-bold">Next up:</span> {nextSub.name}
          </p>
        )}
        {weakSub && weakSub.id !== nextId && (
          <p className={`text-xs ${color.text} opacity-70`}>
            <span className="font-bold">Weak area:</span> {weakSub.name}
          </p>
        )}
        {!nextSub && done === total && total > 0 && (
          <p className={`text-xs ${color.text} font-bold`}>🏆 All topics complete!</p>
        )}
      </div>

      <div className="flex gap-2">
        {nextId && (
          <Link
            href={`/student/lesson/${nextId}`}
            className={`flex-1 text-center py-2.5 ${color.accent} text-white text-xs font-black rounded-2xl hover:opacity-90 transition-opacity`}
          >
            Continue →
          </Link>
        )}
        <Link
          href={`/student/learn?subject=${subjectSlug}`}
          className={`flex-1 text-center py-2.5 bg-white/60 ${color.text} text-xs font-bold rounded-2xl hover:bg-white/80 transition-colors`}
        >
          View topics
        </Link>
      </div>
    </div>
  )
}

// ── Practice CTA ──────────────────────────────────────────────────────────────
function PracticeButton() {
  return (
    <Link
      href="/student/practice"
      className="flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4 hover:border-indigo-200 hover:shadow-md transition-all group"
    >
      <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-black text-gray-900 text-sm">Practice Questions</p>
        <p className="text-xs text-gray-400 mt-0.5">Test yourself across your subjects</p>
      </div>
      <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Goal visibility banner ────────────────────────────────────────────────────
function GoalBanner({ profile }) {
  const hasCourse      = Boolean(profile?.university_course)
  const hasJambTarget  = Boolean(profile?.jamb_total_target)
  const hasWaecTargets = Object.keys(profile?.waec_target_grades ?? {}).length > 0
  if (!hasCourse && !hasJambTarget && !hasWaecTargets) return null

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white">
      <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-2">Your Goal</p>
      {hasCourse && <p className="text-base font-black leading-snug">🎓 {profile.university_course}</p>}
      <div className="flex flex-wrap gap-3 mt-2">
        {hasJambTarget && (
          <span className="text-sm text-white/80">
            JAMB target: <span className="font-black text-white">{profile.jamb_total_target}/400</span>
          </span>
        )}
        {hasWaecTargets && <span className="text-sm text-white/80">WAEC targets set ✓</span>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile, setProfile]             = useState(null)
  const [learningPaths, setLearningPaths] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [subtopicMap, setSubtopicMap]     = useState({})
  const [streak, setStreak]               = useState(0)
  const [nudge, setNudge]                 = useState('')
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [diagnosticSaving, setDiagnosticSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Handle pending diagnostic — fire and forget
    const pending = sessionStorage.getItem('pending_diagnostic')
    if (pending) {
      setDiagnosticSaving(true)
      fetch('/api/diagnostic/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.parse(pending)),
      })
        .then(() => {
          sessionStorage.removeItem('pending_diagnostic')
          loadLearningData(user.id).then(() => setDiagnosticSaving(false))
        })
        .catch(() => setDiagnosticSaving(false))
    }

    // Parallel data load
    const [{ data: prof }, { data: streakRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
    ])

    setProfile(prof)
    setStreak(streakRow?.current_streak ?? 0)
    setNudge(getRandomNudge('general'))

    await loadLearningData(user.id)
    setLoading(false)
  }

  async function loadLearningData(userId) {
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('subject_id, ordered_subtopic_ids, subjects(name, slug)')
      .eq('student_id', userId)

    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)
    if (!active.length) return

    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]

    // Fetch subtopics in batches of 200
    let allSubs = []
    for (let i = 0; i < allIds.length; i += 200) {
      const { data } = await supabase
        .from('subtopics')
        .select('id, name, slug, lesson_status, topics(name)')
        .in('id', allIds.slice(i, i + 200))
      allSubs = allSubs.concat(data ?? [])
    }
    const sMap = {}
    allSubs.forEach(s => { sMap[s.id] = s })
    setSubtopicMap(sMap)

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('subtopic_id, completed')
      .eq('student_id', userId)
      .in('subtopic_id', allIds)
    setLessonProgress(progress ?? [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasLearningPath = learningPaths.length > 0
  const firstName       = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-5">

      {/* ── 1. GREETING ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {streak > 1 ? `Welcome back, ${firstName} 🔥` : `Hey, ${firstName} 👋`}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 leading-snug">
            {streak > 1
              ? `${streak}-day streak — you're building something real.`
              : nudge || "Ready to study? Let's go."}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full flex-shrink-0 ml-3">
            <span className="text-base">🔥</span>
            <span className="text-sm font-black text-orange-600">{streak}</span>
          </div>
        )}
      </div>

      {/* Diagnostic saving banner */}
      {diagnosticSaving && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Building your personalised study plan…</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STATE A — HAS LEARNING PATH
      ═══════════════════════════════════════════ */}
      {hasLearningPath && (
        <>
          {/* ── 2. TODAY'S FOCUS ──────────────────── */}
          <TodaysFocus
            learningPaths={learningPaths}
            lessonProgress={lessonProgress}
            subtopicMap={subtopicMap}
          />

          {/* ── 3. WEEKLY GOALS ───────────────────── */}
          <WeeklyGoals />

          {/* ── 4. CURATED LEARNING PLAN ──────────── */}
          <CuratedLearningPlan
            learningPaths={learningPaths}
            lessonProgress={lessonProgress}
            subtopicMap={subtopicMap}
            maxItems={5}
          />

          {/* ── 5. SUBJECT CARDS ──────────────────── */}
          <div className="space-y-3">
            <h3 className="font-black text-gray-900 text-sm">Your Subjects</h3>
            {learningPaths.map(path => (
              <SubjectCard
                key={path.subject_id}
                path={path}
                lessonProgress={lessonProgress}
                subtopicMap={subtopicMap}
              />
            ))}
          </div>

          {/* ── 6. PRACTICE BUTTON ────────────────── */}
          <PracticeButton />

          {/* ── 7. GOAL VISIBILITY ────────────────── */}
          <GoalBanner profile={profile} />

          {!profile?.goals_set && !showGoalModal && (
            <button
              onClick={() => setShowGoalModal(true)}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-white text-left hover:opacity-90 transition-opacity"
            >
              <p className="font-black text-base">🎯 Set your exam goals</p>
              <p className="text-amber-100 text-xs mt-0.5">Target grades, university course, exam date</p>
            </button>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
          STATE B — NO LEARNING PATH YET
      ═══════════════════════════════════════════ */}
      {!hasLearningPath && !diagnosticSaving && (
        <>
          {/* Diagnostic CTA */}
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-black text-gray-900 text-base mb-1">Get your personalised study plan</h3>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              Take a 10-question test and we&apos;ll identify your weak areas and build a study plan tailored to you.
            </p>
            <Link
              href="/diagnostic"
              className="block w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center mb-3"
            >
              Take the diagnostic →
            </Link>
            <Link
              href="/student/learn"
              className="block w-full py-2.5 text-center text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Or browse lessons directly →
            </Link>
          </div>

          {/* Weekly goals — always accessible */}
          <WeeklyGoals />

          {/* Practice — always accessible */}
          <PracticeButton />

          {/* Goal visibility or prompt */}
          {profile?.goals_set ? (
            <GoalBanner profile={profile} />
          ) : (
            <button
              onClick={() => setShowGoalModal(true)}
              className="w-full bg-amber-50 border border-amber-200 rounded-3xl px-5 py-4 text-left hover:bg-amber-100 transition-colors"
            >
              <p className="font-black text-amber-800">🎯 Set your exam goals</p>
              <p className="text-amber-600 text-xs mt-0.5">Target grades, university course, exam date</p>
            </button>
          )}
        </>
      )}

      {/* Goal modal */}
      {showGoalModal && (
        <GoalModal
          profile={profile}
          onClose={() => setShowGoalModal(false)}
          onSave={updated => {
            setProfile(prev => ({ ...prev, ...updated, goals_set: true }))
            setShowGoalModal(false)
          }}
        />
      )}
    </div>
  )
}