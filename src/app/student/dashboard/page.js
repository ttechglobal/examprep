'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getRandomNudge } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import Link from 'next/link'

// ── Weekly goals section ──────────────────────────────────────
function WeeklyGoals({ profile, completedThisWeek }) {
  const weeklyTarget = profile?.weekly_topic_goal ?? 5  // TODO: store in profiles table
  const completed = completedThisWeek ?? 0
  const pct = weeklyTarget > 0 ? Math.min(Math.round((completed / weeklyTarget) * 100), 100) : 0

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-gray-900 text-sm">This Week</h3>
        <span className="text-xs text-gray-400">{completed} / {weeklyTarget} topics</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {pct >= 100
          ? '🎉 Goal smashed! You\'re on fire this week!'
          : pct >= 60
          ? `💪 ${weeklyTarget - completed} more topic${weeklyTarget - completed !== 1 ? 's' : ''} to hit your goal`
          : completed === 0
          ? 'Start your first topic today — you\'ve got this! 🚀'
          : `Keep going! ${weeklyTarget - completed} more to reach your weekly goal`}
      </p>
    </div>
  )
}

// ── Practice launcher ─────────────────────────────────────────
function PracticeButton() {
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">✏️</span>
        <div>
          <p className="font-black text-gray-900 text-sm">Practice Questions</p>
          <p className="text-xs text-gray-400">Test yourself across your subjects</p>
        </div>
      </div>

      {!showOptions ? (
        <button
          onClick={() => setShowOptions(true)}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
        >
          Start Practice →
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500">How many questions?</p>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 30].map(count => (
              <Link
                key={count}
                href={`/student/practice?count=${count}`}
                className="py-3 bg-indigo-50 text-indigo-700 text-sm font-black rounded-xl text-center hover:bg-indigo-100 transition-colors"
              >
                {count}
              </Link>
            ))}
          </div>
          <button onClick={() => setShowOptions(false)} className="w-full text-xs text-gray-400 pt-1">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState(null)
  const [learningPaths, setLearningPaths] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [subtopicMap, setSubtopicMap] = useState({})
  const [streak, setStreak] = useState(0)
  const [nudge, setNudge] = useState('')
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [diagnosticSaving, setDiagnosticSaving] = useState(false)
  const [completedThisWeek, setCompletedThisWeek] = useState(0)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Save pending diagnostic — FIRE AND FORGET, never blocks the page
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
          // Reload learning paths after save completes in background
          return supabase
            .from('student_learning_paths')
            .select('id, subject_id, ordered_subtopic_ids, subjects(id, name, slug)')
            .eq('student_id', user.id)
        })
        .then(({ data: newPaths }) => {
          if (newPaths) setLearningPaths(newPaths)
        })
        .catch(console.error)
        .finally(() => setDiagnosticSaving(false))
      // Do NOT await — continue loading the rest of the page immediately
    }

    // Parallel data load — page renders with whatever is available
    const [{ data: prof }, { data: streakData }, { data: paths }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).single(),
      supabase.from('student_learning_paths').select('id, subject_id, ordered_subtopic_ids, subjects(id, name, slug)').eq('student_id', user.id),
      supabase.from('lesson_progress').select('subtopic_id, completed, started_at').eq('student_id', user.id),
    ])

    setProfile(prof)
    setStreak(streakData?.current_streak ?? 0)
    setLearningPaths(paths ?? [])
    setLessonProgress(prog ?? [])

    // TODO: use proper timezone-aware week boundary
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    setCompletedThisWeek(
      (prog ?? []).filter(p => p.completed && p.started_at >= weekAgo).length
    )

    // Fetch subtopic metadata for learning path
    const allIds = (paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? [])
    if (allIds.length) {
      const { data: subs } = await supabase
        .from('subtopics')
        .select('id, name, slug, lesson_status, topic_id')
        .in('id', allIds)
      const map = {}
      subs?.forEach(s => { map[s.id] = s })
      setSubtopicMap(map)
    }

    if (!prof?.goals_set) setShowGoalModal(true)

    setNudge(
      (streakData?.current_streak ?? 0) > 1
        ? getRandomNudge('streak', streakData.current_streak)
        : getRandomNudge('general')
    )

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const completedIds = new Set(lessonProgress.filter(p => p.completed).map(p => p.subtopic_id))
  const hasLearningPath = learningPaths.length > 0

  const subjectMastery = learningPaths.map(path => {
    const total = path.ordered_subtopic_ids?.length ?? 0
    const completed = path.ordered_subtopic_ids?.filter(id => completedIds.has(id)).length ?? 0
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const color = getSubjectColor(path.subjects?.name)
    const nextSubtopicId = path.ordered_subtopic_ids?.find(id => !completedIds.has(id))
    return {
      ...path,
      total,
      completed,
      pct,
      color,
      nextSubtopicId,
      nextSubtopic: nextSubtopicId ? subtopicMap[nextSubtopicId] : null,
    }
  })

  // Suggest the subject with lowest completion % (most needs attention)
  // TODO: also factor in question accuracy and exam date proximity
  const suggestedSubject = [...subjectMastery].sort((a, b) => a.pct - b.pct)[0]

  return (
    <div className="space-y-5">

      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => {
            setShowGoalModal(false)
            supabase.from('profiles').select('*').eq('id', profile.id).single()
              .then(({ data }) => setProfile(data))
          }}
        />
      )}

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Hey {firstName}! {streak > 1 ? '🔥' : '👋'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {streak > 1 ? `${streak}-day streak — keep it going!` : "Ready to study? Let's go!"}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
            <span className="text-base">🔥</span>
            <span className="text-sm font-black text-orange-600">{streak}</span>
          </div>
        )}
      </div>

      {/* ── Diagnostic saving banner — non-blocking ── */}
      {diagnosticSaving && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Building your personalised study plan…</p>
        </div>
      )}

      {/* ── Daily nudge ── */}
      {nudge && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-indigo-700 font-medium leading-snug">{nudge}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STATE A: HAS LEARNING PATH
      ══════════════════════════════════════════ */}
      {hasLearningPath && (
        <>
          {/* Continue Learning — personalised plan preview */}
          {suggestedSubject && (
            <div className={`${suggestedSubject.color.bg} rounded-3xl p-5`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${suggestedSubject.color.text} opacity-70 mb-2`}>
                Continue Learning
              </p>
              <h3 className={`text-base font-black ${suggestedSubject.color.text} mb-1`}>
                {suggestedSubject.subjects?.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {suggestedSubject.nextSubtopic
                  ? <>Next up: <span className="font-semibold">{suggestedSubject.nextSubtopic.name}</span></>
                  : '🎉 All caught up here!'}
              </p>
              <div className="flex gap-2">
                {suggestedSubject.nextSubtopic?.lesson_status === 'published' && (
                  <Link
                    href={`/student/lesson/${suggestedSubject.nextSubtopicId}`}
                    className={`flex-1 text-center py-3 ${suggestedSubject.color.accent} text-white text-sm font-black rounded-2xl hover:opacity-90 transition-opacity`}
                  >
                    Start lesson →
                  </Link>
                )}
                <Link
                  href={`/student/learn?subject=${suggestedSubject.subjects?.slug}`}
                  className={`flex-1 text-center py-3 bg-white/70 ${suggestedSubject.color.text} text-sm font-bold rounded-2xl hover:bg-white/90 transition-colors`}
                >
                  View all topics
                </Link>
              </div>
            </div>
          )}

          {/* Weekly goals */}
          <WeeklyGoals profile={profile} completedThisWeek={completedThisWeek} />

          {/* Exam goal */}
          {(Object.keys(profile?.waec_target_grades ?? {}).length > 0 || profile?.jamb_total_target) && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Exam Goal</p>
              <p className="text-base font-black leading-snug">
                {suggestedSubject?.pct >= 80
                  ? `You're on track for your target in ${suggestedSubject.subjects?.name}! 💪`
                  : suggestedSubject?.pct >= 50
                  ? `Keep going — you're making real progress 🔥`
                  : `Every lesson builds your foundation. Keep going! 💪`}
              </p>
              {profile?.jamb_total_target && (
                <p className="text-xs text-white/60 mt-2">JAMB target: {profile.jamb_total_target}/400</p>
              )}
            </div>
          )}

          {/* Practice button — always available */}
          <PracticeButton />

          {/* Goals prompt if not set */}
          {!profile?.goals_set && !showGoalModal && (
            <button
              onClick={() => setShowGoalModal(true)}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-white text-left"
            >
              <p className="font-black text-base">🎯 Set your exam goals</p>
              <p className="text-amber-100 text-xs mt-0.5">Tell us what grades you're aiming for</p>
            </button>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          STATE B: NO LEARNING PATH YET
          Never empty — always shows useful content
      ══════════════════════════════════════════ */}
      {!hasLearningPath && !diagnosticSaving && (
        <>
          {/* Diagnostic CTA — suggestion, never a blocker */}
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-black text-gray-900 text-base mb-1">Get your personalised study plan</h3>
            <p className="text-gray-500 text-sm mb-4">
              Take a quick 10-question test and we'll build a study plan tailored to your weak areas.
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

          {/* Goals section — shows if goals were set, otherwise a set-goals CTA */}
          {profile?.goals_set ? (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-5 text-white">
              <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Your Exam Goal</p>
              {profile.university_course && (
                <p className="text-base font-black">🎓 {profile.university_course}</p>
              )}
              {profile.jamb_total_target && (
                <p className="text-sm text-white/80 mt-1">JAMB target: {profile.jamb_total_target}/400</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowGoalModal(true)}
              className="w-full bg-amber-50 border border-amber-200 rounded-3xl px-5 py-4 text-left"
            >
              <p className="font-black text-amber-800">🎯 Set your exam goals</p>
              <p className="text-amber-600 text-xs mt-0.5">Target grades, university course, exam date</p>
            </button>
          )}

          {/* Practice — always accessible, no prerequisite */}
          <PracticeButton />
        </>
      )}

    </div>
  )
}