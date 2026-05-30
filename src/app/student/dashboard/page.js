'use client'
// src/app/student/dashboard/page.js
// Fixes: goal banner restored, skeleton loader, dark/light mode, subject icons, no borders

import { useEffect, useState, useMemo, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'

// Lazy load heavy components
const WeeklyGoals = lazy(() => import('@/components/dashboard/WeeklyGoals'))
const GoalModal   = lazy(() => import('@/components/dashboard/GoalModal'))

// Subject icons matching LearnHub/homepage
const SUBJECT_ICONS = {
  'Mathematics': '📐', 'English Language': '📝', 'Physics': '⚡',
  'Chemistry': '🧪', 'Biology': '🦋', 'Economics': '📊',
  'Government': '🏛️', 'Literature': '📖', 'Geography': '🌍',
  'History': '📜', 'Commerce': '🏪', 'Accounting': '🧾',
  'Agricultural Science': '🌱', 'Further Mathematics': '🔢',
  'Computer Science': '💻', 'Civic Education': '⚖️',
}
const subjectIcon = (name) => SUBJECT_ICONS[name] ?? '📚'

function getMasteryLevel(pct) {
  if (pct >= 80) return { label: 'Mastered',      color: 'text-green-600 dark:text-green-400',  emoji: '🏆' }
  if (pct >= 60) return { label: 'Getting there', color: 'text-blue-600 dark:text-blue-400',    emoji: '📈' }
  if (pct >= 40) return { label: 'Building',      color: 'text-yellow-600 dark:text-yellow-400', emoji: '🔨' }
  if (pct >= 20) return { label: 'Just started',  color: 'text-orange-600 dark:text-orange-400', emoji: '🌱' }
  return            { label: 'Not started',        color: 'text-tertiary', emoji: '💤' }
}

// ─── Practice CTA ─────────────────────────────────────────────────────────────
const PracticeCTA = memo(function PracticeCTA() {
  return (
    <Link href="/student/practice"
      className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 hover:opacity-95 transition-opacity active:scale-[0.98]">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-white font-black text-sm">Practice Hub</p>
        <p className="text-white/70 text-xs mt-0.5">Past questions · Mock tests · Exam simulation</p>
      </div>
      <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
})

// ─── Subject card with emoji icon ─────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub }) {
  const color = getSubjectColor(sub.subjects?.name)
  const icon  = subjectIcon(sub.subjects?.name)
  return (
    <Link href={`/student/subjects/${sub.subjects?.slug}`}
      className={`block rounded-2xl overflow-hidden hover:opacity-90 transition-all active:scale-[0.98]`}>
      <div className={`${color.bg} px-4 pt-3 pb-2`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <span className={`text-xs font-bold ${sub.mastery?.color ?? 'text-tertiary'}`}>
            {sub.pct}%
          </span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug truncate`}>{sub.subjects?.name}</p>
      </div>
      <div className="px-4 py-2 bg-card">
        <div className="h-1 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${sub.pct}%` }} />
        </div>
        <p className="text-xs text-tertiary mt-1">{sub.completed}/{sub.total} done</p>
      </div>
    </Link>
  )
})

// ─── Goal/target banner ────────────────────────────────────────────────────────
const GoalBanner = memo(function GoalBanner({ profile, onClick }) {
  const hasCourse = Boolean(profile?.university_course)
  const hasJamb   = Boolean(profile?.jamb_total_target)
  const hasWaec   = Object.keys(profile?.waec_target_grades ?? {}).length > 0

  if (!profile?.goals_set) {
    return (
      <button onClick={onClick}
        className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all">
        <span className="text-2xl">🎯</span>
        <div className="flex-1">
          <p className="font-black text-white text-sm">Set your exam goals</p>
          <p className="text-orange-100 text-xs mt-0.5">Target score, university course</p>
        </div>
        <span className="text-white/80 text-sm">→</span>
      </button>
    )
  }

  if (!hasCourse && !hasJamb && !hasWaec) return null

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 bg-card rounded-2xl px-5 py-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all active:scale-[0.98]">
      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">🎯</span>
      </div>
      <div className="flex-1 min-w-0">
        {hasCourse && <p className="font-black text-primary text-sm truncate">{profile.university_course}</p>}
        <p className="text-xs text-secondary mt-0.5 truncate">
          {hasJamb ? `JAMB target: ${profile.jamb_total_target}/400` : ''}
          {hasJamb && hasWaec ? ' · ' : ''}
          {hasWaec ? 'WAEC targets set ✓' : ''}
        </p>
      </div>
      <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
})

// ─── Study plan card ───────────────────────────────────────────────────────────
const StudyPlanCard = memo(function StudyPlanCard({ learningPaths, subtopicMap, completedIds }) {
  const upNext = []
  for (const path of learningPaths) {
    for (const id of (path.ordered_subtopic_ids ?? [])) {
      if (completedIds.includes(id)) continue
      const sub = subtopicMap[id]
      if (!sub || sub.lesson_status !== 'published') continue
      upNext.push({ ...sub, subjectName: path.subjects?.name, subjectSlug: path.subjects?.slug })
      if (upNext.length >= 4) break
    }
    if (upNext.length >= 4) break
  }
  if (!upNext.length) return null

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-primary">Your Study Plan</h2>
          <p className="text-xs text-secondary mt-0.5">Pick up where you left off</p>
        </div>
        <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">
          View all →
        </Link>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
        {upNext.map(sub => {
          const color = getSubjectColor(sub.subjectName)
          const icon  = subjectIcon(sub.subjectName)
          return (
            <Link key={sub.id} href={`/student/lesson/${sub.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-subtle transition-colors">
              <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 text-base`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{sub.name}</p>
                <p className="text-xs text-tertiary">{sub.subjectName}</p>
              </div>
              <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile]         = useState(null)
  const [streak, setStreak]           = useState(0)
  const [loading, setLoading]         = useState(true)
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap, setSubtopicMap] = useState({})
  const [lessonProgress, setLessonProgress] = useState([])
  const [subjects, setSubjects]       = useState([])
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: strk }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects, goals_set, university_course, jamb_total_target, waec_target_grades, jamb_target_scores').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
    ])

    setProfile(prof)
    setStreak(strk?.current_streak ?? 0)
    setLessonProgress(prog ?? [])
    await loadPaths(user.id, prog ?? [])
    setLoading(false)
  }

  async function loadPaths(userId, prog) {
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
      .eq('student_id', userId)

    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)

    const completedSet = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    const subjectCards = active.map(path => {
      const total     = path.ordered_subtopic_ids?.length ?? 0
      const completed = path.ordered_subtopic_ids?.filter(id => completedSet.has(id)).length ?? 0
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject_id: path.subject_id, subjects: path.subjects, total, completed, pct, mastery: getMasteryLevel(pct) }
    })
    setSubjects(subjectCards)

    if (!active.length) return
    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]
    const batches = []; for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
    let allSubs = []
    await Promise.all(batches.map(b =>
      supabase.from('subtopics').select('id, name, slug, lesson_status').in('id', b)
        .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
    ))
    const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s })
    setSubtopicMap(sMap)
  }

  if (loading) return <DashboardSkeleton />

  const hasPath      = learningPaths.length > 0
  const firstName    = profile?.full_name?.split(' ')[0] ?? 'there'
  const completedIds = lessonProgress.filter(p => p.completed).map(p => p.subtopic_id)

  return (
    <div className="space-y-4">
      {showGoalModal && profile && (
        <Suspense fallback={null}>
          <GoalModal profile={profile} onClose={() => setShowGoalModal(false)}
            onSave={updated => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }} />
        </Suspense>
      )}

      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">
            {streak > 2 ? 'On a roll,' : 'Hey,'}
          </p>
          <h1 className="text-2xl font-black text-primary leading-tight">
            {firstName} 👋
            {streak > 0 && <span className="ml-2 text-base font-bold text-orange-500">🔥 {streak}</span>}
          </h1>
        </div>
      </div>

      {hasPath ? (
        <>
          {/* Goal banner — restored */}
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />

          {/* Weekly Goals */}
          <Suspense fallback={<div className="skeleton h-32 w-full rounded-2xl" />}>
            <WeeklyGoals />
          </Suspense>

          {/* Practice Hub */}
          <PracticeCTA />

          {/* Subjects — ALL, with icons, no borders */}
          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/lessons" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {subjects.map(sub => <SubjectCard key={sub.subject_id} sub={sub} />)}
              </div>
            </div>
          )}

          {/* Study plan */}
          <StudyPlanCard learningPaths={learningPaths} subtopicMap={subtopicMap} completedIds={completedIds} />
        </>
      ) : (
        <div className="bg-card rounded-2xl p-6 text-center space-y-4">
          <p className="text-4xl">📝</p>
          <div>
            <p className="font-black text-primary text-lg">Get your personalised study plan</p>
            <p className="text-secondary text-sm mt-1 leading-relaxed">
              Answer 10 questions and we'll build a plan around your weak areas.
            </p>
          </div>
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
          <Link href="/diagnostic"
            className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center">
            Take the diagnostic →
          </Link>
        </div>
      )}
    </div>
  )
}