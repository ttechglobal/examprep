'use client'
// src/app/student/dashboard/page.js
// Performance: single Promise.all, no waterfall, memo on all sub-components.
// Dark mode: explicit dark: classes only — no CSS variable conflicts.
// Sections: Greeting → Weekly Goals → Badges → Practice Hub → Subjects → Study Plan → Goal Banner

import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import WeeklyGoals from '@/components/dashboard/WeeklyGoals'
import BadgeShelf from '@/components/dashboard/BadgeShelf'
import Link from 'next/link'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const StreakBadge = memo(({ streak }) => {
  if (!streak) return null
  return (
    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-full">
      <span className="text-sm leading-none">🔥</span>
      <span className="text-sm font-black text-orange-600 dark:text-orange-400">{streak}</span>
      <span className="text-xs text-orange-400 dark:text-orange-500 hidden sm:inline">day streak</span>
    </div>
  )
})
StreakBadge.displayName = 'StreakBadge'

const PracticeCTA = memo(() => (
  <Link href="/student/practice"
    className="relative overflow-hidden flex items-center gap-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm px-5 py-4 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group active:scale-[0.98]">
    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-indigo-50 dark:from-indigo-950/20 to-transparent pointer-events-none" />
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30">
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </div>
    <div className="flex-1 relative">
      <p className="font-black text-gray-900 dark:text-gray-100 text-base">Practice Hub</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Mock tests · Topic practice · Exam simulation</p>
    </div>
    <div className="relative flex items-center gap-1 bg-indigo-600 text-white text-xs font-black px-3.5 py-2 rounded-xl group-hover:bg-indigo-500 transition-colors flex-shrink-0">
      Start <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
    </div>
  </Link>
))
PracticeCTA.displayName = 'PracticeCTA'

const GoalBanner = memo(({ profile, onClick }) => {
  const hasCourse = Boolean(profile?.university_course)
  const hasJamb   = Boolean(profile?.jamb_total_target)
  const hasWaec   = Object.keys(profile?.waec_target_grades ?? {}).length > 0
  if (!profile?.goals_set) {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-orange-100 dark:shadow-orange-900/20">
        <span className="text-2xl">🎯</span>
        <div className="flex-1"><p className="font-black text-white text-sm">Set your exam goals</p><p className="text-orange-100 text-xs mt-0.5">Target score, course, university</p></div>
        <span className="text-white/80 text-sm">→</span>
      </button>
    )
  }
  if (!hasCourse && !hasJamb && !hasWaec) return null
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm px-5 py-4 text-left hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all active:scale-[0.98]">
      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0"><span className="text-xl">🎯</span></div>
      <div className="flex-1 min-w-0">
        {hasCourse && <p className="font-black text-gray-900 dark:text-gray-100 text-sm truncate">{profile.university_course}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {hasJamb ? `JAMB target: ${profile.jamb_total_target}/400` : ''}
          {hasJamb && hasWaec ? ' · ' : ''}{hasWaec ? 'WAEC targets set' : ''}
        </p>
      </div>
      <span className="text-xs font-bold text-indigo-500 flex-shrink-0">Edit →</span>
    </button>
  )
})
GoalBanner.displayName = 'GoalBanner'

const SubjectSlider = memo(({ learningPaths, lessonProgress, subtopicMap }) => {
  const scrollRef  = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const completedIds = useMemo(() => new Set((lessonProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id)), [lessonProgress])
  if (!learningPaths.length) return null
  function onScroll() {
    if (!scrollRef.current) return
    setActiveIdx(Math.min(Math.round(scrollRef.current.scrollLeft / (scrollRef.current.clientWidth * 0.72)), learningPaths.length - 1))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Your Subjects</h3>
        <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">See all →</Link>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {learningPaths.map((path, i) => {
          const name  = path.subjects?.name ?? 'Subject'
          const color = getSubjectColor(name)
          const ids   = path.ordered_subtopic_ids ?? []
          const done  = ids.filter(id => completedIds.has(id)).length
          const pct   = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
          const nextId  = ids.find(id => !completedIds.has(id) && subtopicMap?.[id]?.lesson_status === 'published')
          const nextSub = nextId ? subtopicMap[nextId] : null
          return (
            <div key={path.subject_id} className="flex-shrink-0 snap-start w-[72vw] max-w-[280px]">
              <div className={`${color.bg} dark:bg-gray-800 rounded-3xl p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className={`text-base font-black ${color.text} dark:text-gray-100 leading-tight`}>{name}</h4>
                  <span className={`px-2.5 py-1 rounded-xl bg-white/60 dark:bg-black/20 text-sm font-black ${color.text} dark:text-gray-200`}>{pct}%</span>
                </div>
                <div className="h-2 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden mb-3">
                  <div className={`h-full ${color.accent} rounded-full transition-all duration-700`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
                </div>
                {nextSub && <p className={`text-xs ${color.text} dark:text-gray-300 opacity-80 mb-4 truncate`}><span className="font-bold">Next:</span> {nextSub.name}</p>}
                <div className="flex gap-2">
                  {nextId && <Link href={`/student/lesson/${nextId}`} className={`flex-1 text-center py-2.5 ${color.accent} text-white text-xs font-black rounded-2xl hover:opacity-90 active:scale-95 transition-all`}>Continue →</Link>}
                  <Link href={`/student/subjects/${path.subjects?.slug ?? ''}`} className={`flex-1 text-center py-2.5 bg-white/60 dark:bg-black/20 ${color.text} dark:text-gray-200 text-xs font-bold rounded-2xl hover:bg-white/80 dark:hover:bg-black/30 transition-all`}>Topics</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {learningPaths.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {learningPaths.map((_, i) => <div key={i} className={`rounded-full transition-all duration-300 ${i === activeIdx ? 'w-4 h-1.5 bg-indigo-600' : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'}`} />)}
        </div>
      )}
    </div>
  )
})
SubjectSlider.displayName = 'SubjectSlider'

const StudyPlanCard = memo(({ learningPaths, subtopicMap, completedIds }) => {
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  let next = null
  for (const path of learningPaths) {
    const id = (path.ordered_subtopic_ids ?? []).find(id => !completedSet.has(id) && subtopicMap[id]?.lesson_status === 'published')
    if (id) { next = { id, sub: subtopicMap[id], subjectName: path.subjects?.name }; break }
  }
  const allIds = [...new Set(learningPaths.flatMap(p => p.ordered_subtopic_ids ?? []))]
  const pct    = allIds.length > 0 ? Math.round((allIds.filter(id => completedSet.has(id)).length / allIds.length) * 100) : 0
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div><h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Study Plan</h3><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pct}% complete</p></div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">View all →</Link>
      </div>
      <div className="px-5 pb-3">
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {next && (
        <Link href={`/student/lesson/${next.id}`} className="flex items-center gap-3 px-5 py-3.5 bg-indigo-50 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400">Up next · {next.subjectName}</p>
            <p className="text-sm font-black text-indigo-900 dark:text-indigo-100 truncate">{next.sub.name}</p>
          </div>
          <svg className="w-4 h-4 text-indigo-300 dark:text-indigo-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </Link>
      )}
    </div>
  )
})
StudyPlanCard.displayName = 'StudyPlanCard'

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile]             = useState(null)
  const [learningPaths, setLearningPaths] = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [subtopicMap, setSubtopicMap]     = useState({})
  const [streak, setStreak]               = useState(0)
  const [stats, setStats]                 = useState({ lessons: 0, practice: 0 })
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [diagnosticSaving, setDiagnosticSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Pending diagnostic — fire and forget, non-blocking
    const pending = sessionStorage.getItem('pending_diagnostic')
    if (pending) {
      setDiagnosticSaving(true)
      fetch('/api/diagnostic/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pending })
        .then(() => { sessionStorage.removeItem('pending_diagnostic'); return loadPaths(user.id) })
        .then(() => setDiagnosticSaving(false))
        .catch(() => setDiagnosticSaving(false))
    }

    // Single Promise.all — no waterfall
    const [{ data: prof }, { data: streakRow }, { data: prog }, { count: practiceCount }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('question_attempts').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('context', 'practice'),
    ])

    setProfile(prof)
    setStreak(streakRow?.current_streak ?? 0)
    setLessonProgress(prog ?? [])
    setStats({ lessons: (prog ?? []).filter(p => p.completed).length, practice: practiceCount ?? 0 })
    await loadPaths(user.id, prog ?? [])
    setLoading(false)
  }

  async function loadPaths(userId, prog = []) {
    const { data: paths } = await supabase
      .from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(name, slug)').eq('student_id', userId)
    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)
    if (!active.length) return
    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]
    // Batched parallel subtopic fetch
    const batches = []
    for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
    const results = await Promise.all(batches.map(b => supabase.from('subtopics').select('id, name, slug, lesson_status').in('id', b).then(r => r.data ?? [])))
    const sMap = {}; results.flat().forEach(s => { sMap[s.id] = s }); setSubtopicMap(sMap)
    if (!prog.length) {
      const { data: fp } = await supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', userId).in('subtopic_id', allIds)
      setLessonProgress(fp ?? [])
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const hasPath      = learningPaths.length > 0
  const firstName    = profile?.full_name?.split(' ')[0] ?? 'there'
  const completedIds = lessonProgress.filter(p => p.completed).map(p => p.subtopic_id)

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">{streak > 2 ? 'On a roll,' : 'Hey,'}</p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">{firstName} 👋</h1>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {diagnosticSaving && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">Building your personalised study plan…</p>
        </div>
      )}

      {hasPath && (
        <>
          <WeeklyGoals />
          <BadgeShelf completedLessons={stats.lessons} practiceSessions={stats.practice} streak={streak} />
          <PracticeCTA />
          <SubjectSlider learningPaths={learningPaths} lessonProgress={lessonProgress} subtopicMap={subtopicMap} />
          <StudyPlanCard learningPaths={learningPaths} subtopicMap={subtopicMap} completedIds={completedIds} />
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
        </>
      )}

      {!hasPath && !diagnosticSaving && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-indigo-100 dark:border-indigo-900 shadow-sm p-6">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-black text-gray-900 dark:text-gray-100 text-base mb-1">Get your personalised study plan</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">Answer 10 questions and we'll build a plan around your weak areas.</p>
            <Link href="/diagnostic" className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center mb-3">Take the diagnostic →</Link>
            <Link href="/student/learn" className="block text-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 font-medium">Or browse lessons directly →</Link>
          </div>
          <WeeklyGoals />
          <PracticeCTA />
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
        </>
      )}

      {showGoalModal && <GoalModal profile={profile} onClose={() => setShowGoalModal(false)} onSave={updated => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }} />}
    </div>
  )
}