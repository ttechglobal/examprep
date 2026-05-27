'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getMasteryLevel, getRandomNudge } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import Link from 'next/link'

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
  const [savingDiagnostic, setSavingDiagnostic] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Save pending diagnostic
    const pending = sessionStorage.getItem('pending_diagnostic')
    if (pending) {
      setSavingDiagnostic(true)
      try {
        await fetch('/api/diagnostic/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(JSON.parse(pending)),
        })
        sessionStorage.removeItem('pending_diagnostic')
        sessionStorage.removeItem('diagnostic_results')
        sessionStorage.removeItem('diagnostic_setup')
      } catch (e) { console.error(e) }
      setSavingDiagnostic(false)
    }

    // Fetch profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    // Show goal modal on first load
    if (prof && !prof.goals_set) {
      setShowGoalModal(true)
    }

    // Fetch streak
    const { data: streakData } = await supabase
      .from('student_streaks')
      .select('current_streak')
      .eq('student_id', user.id)
      .single()

    setStreak(streakData?.current_streak ?? 0)

    // Fetch learning paths
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('id, subject_id, ordered_subtopic_ids, subjects(id, name, slug)')
      .eq('student_id', user.id)

    setLearningPaths(paths ?? [])

    // Fetch lesson progress
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('subtopic_id, completed')
      .eq('student_id', user.id)

    setLessonProgress(progress ?? [])

    // Fetch subtopic details for all paths
    const allSubtopicIds = (paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? [])
    if (allSubtopicIds.length) {
      const { data: subtopics } = await supabase
        .from('subtopics')
        .select('id, name, slug, lesson_status, topic_id, topics(name)')
        .in('id', allSubtopicIds)

      const map = {}
      subtopics?.forEach(s => { map[s.id] = s })
      setSubtopicMap(map)
    }

    // Pick nudge
    if (streakData?.current_streak > 1) {
      setNudge(getRandomNudge('streak', streakData.current_streak))
    } else {
      setNudge(getRandomNudge('general'))
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        {savingDiagnostic && (
          <p className="text-sm text-gray-500 animate-pulse">Building your study plan...</p>
        )}
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const completedIds = new Set(lessonProgress.filter(p => p.completed).map(p => p.subtopic_id))
  const startedIds = new Set(lessonProgress.map(p => p.subtopic_id))

  // Compute mastery per subject
  const subjectMastery = learningPaths.map(path => {
    const total = path.ordered_subtopic_ids?.length ?? 0
    const completed = path.ordered_subtopic_ids?.filter(id => completedIds.has(id)).length ?? 0
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const mastery = getMasteryLevel(pct)
    const color = getSubjectColor(path.subjects?.name)
    const nextSubtopic = path.ordered_subtopic_ids?.find(id => !completedIds.has(id))

    return {
      ...path,
      total,
      completed,
      pct,
      mastery,
      color,
      nextSubtopic: nextSubtopic ? subtopicMap[nextSubtopic] : null,
    }
  })

  const hasLearningPath = learningPaths.length > 0

  return (
    <div className="space-y-5">

      {/* Goal modal */}
      {showGoalModal && profile && (
        <GoalModal
          profile={profile}
          onClose={() => {
            setShowGoalModal(false)
            // Refresh profile
            supabase.from('profiles').select('*').eq('id', profile.id).single()
              .then(({ data }) => setProfile(data))
          }}
        />
      )}

      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Hey {firstName}! {streak > 1 ? '🔥' : '👋'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {streak > 1 ? `${streak} day streak — keep it up!` : "Ready to study today?"}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex flex-col items-center bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2">
            <span className="text-xl">🔥</span>
            <span className="text-xs font-black text-orange-600">{streak}</span>
          </div>
        )}
      </div>

      {/* Nudge banner */}
      {nudge && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <p className="text-white text-sm font-medium leading-snug">{nudge}</p>
        </div>
      )}

      {/* Goal nudge */}
      {profile?.university_course && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎓</span>
          <p className="text-amber-800 text-sm font-medium">
            You're working toward <span className="font-black">{profile.university_course}</span> — stay consistent!
          </p>
        </div>
      )}

      {/* No path yet */}
      {!hasLearningPath && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-5xl mb-3">📝</div>
          <h3 className="font-black text-gray-900 text-lg mb-1">No study plan yet</h3>
          <p className="text-gray-500 text-sm mb-5">
            Take a quick test and we'll build your personalised learning path in seconds.
          </p>
          <Link
            href="/diagnostic"
            className="inline-block px-8 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            Take a quick test →
          </Link>
        </div>
      )}

      {/* Subject mastery cards */}
      {hasLearningPath && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900 text-base">Your Learning Paths</h2>
            {profile?.exam_type && (
              <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {profile.exam_type}
              </span>
            )}
          </div>

          {subjectMastery.map(sub => (
            <div
              key={sub.id}
              className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${sub.color.border}`}
            >
              {/* Subject header */}
              <div className={`${sub.color.bg} px-5 pt-4 pb-3`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-black text-base ${sub.color.text}`}>
                    {sub.subjects?.name}
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sub.mastery.bg} ${sub.mastery.color}`}>
                    {sub.mastery.emoji} {sub.mastery.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sub.color.accent} rounded-full transition-all duration-700`}
                    style={{ width: `${sub.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-xs ${sub.color.text} opacity-80`}>
                    {sub.completed} of {sub.total} topics
                  </span>
                  <span className={`text-xs font-black ${sub.color.text}`}>
                    {sub.pct}%
                  </span>
                </div>
              </div>

              {/* Mastery message */}
              <div className="px-5 py-3 border-t border-gray-50">
                <p className="text-xs text-gray-500">
                  {sub.completed === sub.total && sub.total > 0
                    ? `🏆 You've completed all topics in ${sub.subjects?.name}! Amazing work.`
                    : sub.completed > 0
                    ? `You've mastered ${sub.completed} out of ${sub.total} topics — ${sub.pct >= 60 ? 'well done! Keep going 🔥' : 'keep pushing! 💪'}`
                    : `Start your first ${sub.subjects?.name} lesson to begin building mastery.`}
                </p>
              </div>

              {/* Topic list — first 4 */}
              <div className="px-5 pb-4">
                <div className="space-y-1.5 mb-3">
                  {(sub.ordered_subtopic_ids ?? []).slice(0, 4).map((id, i) => {
                    const topic = subtopicMap[id]
                    if (!topic) return null
                    const done = completedIds.has(id)
                    const started = startedIds.has(id)
                    const isNext = !done && sub.ordered_subtopic_ids?.find(tid => !completedIds.has(tid)) === id

                    return (
                      <Link
                        key={id}
                        href={topic.lesson_status === 'published' ? `/student/lesson/${id}` : '#'}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                          isNext
                            ? `${sub.color.light} border ${sub.color.border}`
                            : done
                            ? 'bg-gray-50'
                            : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                          done
                            ? 'bg-green-100 text-green-600'
                            : isNext
                            ? `${sub.color.light} ${sub.color.text}`
                            : 'bg-gray-200 text-gray-400'
                        }`}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm ${done ? 'text-gray-400 line-through' : isNext ? `font-semibold ${sub.color.text}` : 'text-gray-600'}`}>
                          {topic.name}
                        </span>
                        {isNext && (
                          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${sub.color.bg} ${sub.color.text}`}>
                            Up next
                          </span>
                        )}
                        {done && (
                          <span className="ml-auto text-xs text-gray-400">Done ✓</span>
                        )}
                      </Link>
                    )
                  })}
                </div>

                {/* View all */}
                {(sub.ordered_subtopic_ids?.length ?? 0) > 4 && (
                  <Link
                    href={`/student/subjects/${sub.subjects?.slug}`}
                    className={`block text-center text-xs font-bold ${sub.color.text} py-2 rounded-xl ${sub.color.bg} hover:opacity-80 transition-opacity`}
                  >
                    View all {sub.total} topics →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Practice Questions — just a button */}
      {hasLearningPath && (
        <Link
          href="/student/practice"
          className="flex items-center justify-between w-full bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✏️</span>
            <div>
              <p className="text-sm font-black text-gray-900">Take Practice Questions</p>
              <p className="text-xs text-gray-400">Test yourself and improve your score</p>
            </div>
          </div>
          <span className="text-indigo-400 group-hover:text-indigo-600 transition-colors">→</span>
        </Link>
      )}

      {/* Set goals prompt */}
      {profile && !profile.goals_set && !showGoalModal && (
        <button
          onClick={() => setShowGoalModal(true)}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-white text-left"
        >
          <p className="font-black text-base">🎯 Set your exam goals</p>
          <p className="text-amber-100 text-xs mt-0.5">Tell us what grades you're aiming for</p>
        </button>
      )}

    </div>
  )
}