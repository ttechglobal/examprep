'use client'
// src/app/student/dashboard/page.js

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getRandomNudge } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import WeeklyGoals from '@/components/dashboard/WeeklyGoals'
import Link from 'next/link'

// ─── Streak badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (!streak) return null
  return (
    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
      <span className="text-base leading-none">🔥</span>
      <span className="text-sm font-black text-orange-600">{streak}</span>
      <span className="text-xs text-orange-400 font-medium hidden sm:inline">day streak</span>
    </div>
  )
}

// ─── XP bar ───────────────────────────────────────────────────────────────────
function XPBar({ completedLessons = 0, practiceCount = 0 }) {
  const xp        = completedLessons * 30 + practiceCount * 5
  const level     = Math.floor(xp / 300) + 1
  const xpInLevel = xp % 300
  const pct       = Math.round((xpInLevel / 300) * 100)

  return (
    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Level {level}</p>
          <p className="text-white font-black text-lg leading-tight">{xp} XP</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <span className="text-2xl">⚡️</span>
        </div>
      </div>
      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-white/60 text-xs mt-1.5">{xpInLevel}/300 XP to Level {level + 1}</p>
    </div>
  )
}

// ─── Practice CTA ─────────────────────────────────────────────────────────────
function PracticeCTA() {
  return (
    <Link href="/student/practice"
      className="relative overflow-hidden flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md hover:border-indigo-100 transition-all group active:scale-[0.98]">
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-indigo-50 to-transparent rounded-r-3xl" />
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1 relative">
        <p className="font-black text-gray-900 text-base">Practice HQ</p>
        <p className="text-xs text-gray-400 mt-0.5">Mock tests · Topic practice · Exam simulation</p>
      </div>
      <div className="relative flex items-center gap-1 bg-indigo-600 text-white text-xs font-black px-3.5 py-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
        Start <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </div>
    </Link>
  )
}

// ─── Study plan shortcut ──────────────────────────────────────────────────────
function StudyPlanCard({ learningPaths, subtopicMap, completedIds }) {
  // Find the single next recommended item
  const completedSet = new Set(completedIds)
  let next = null
  for (const path of learningPaths) {
    const id = (path.ordered_subtopic_ids ?? []).find(id =>
      !completedSet.has(id) && subtopicMap[id]?.lesson_status === 'published'
    )
    if (id) { next = { id, sub: subtopicMap[id], subjectName: path.subjects?.name }; break }
  }

  const totalItems = [...new Set(learningPaths.flatMap(p => p.ordered_subtopic_ids ?? []))].length
  const doneItems  = [...new Set(learningPaths.flatMap(p => p.ordered_subtopic_ids ?? []))].filter(id => completedSet.has(id)).length
  const pct        = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900">Study Plan</h3>
          <p className="text-xs text-gray-400 mt-0.5">{pct}% of plan complete</p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-600 hover:text-indigo-500">
          View all →
        </Link>
      </div>

      {/* Mini progress bar */}
      <div className="px-5 pb-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Next up */}
      {next && (
        <Link href={`/student/lesson/${next.id}`} className="flex items-center gap-3 px-5 py-3.5 bg-indigo-50/60 border-t border-indigo-100/60 hover:bg-indigo-50 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-indigo-500">Up next · {next.subjectName}</p>
            <p className="text-sm font-black text-indigo-900 truncate">{next.sub.name}</p>
          </div>
          <svg className="w-4 h-4 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}

// ─── Swipeable subject cards ──────────────────────────────────────────────────
function SubjectSlider({ learningPaths, lessonProgress, subtopicMap }) {
  const scrollRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  if (!learningPaths.length) return null

  const completedIds = new Set((lessonProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id))

  function onScroll() {
    if (!scrollRef.current) return
    const el = scrollRef.current
    setActiveIdx(Math.min(Math.round(el.scrollLeft / (el.clientWidth * 0.72)), learningPaths.length - 1))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-sm font-black text-gray-900">Your Subjects</h3>
        <Link href="/student/learn" className="text-xs font-bold text-indigo-600">See all →</Link>
      </div>

      <div ref={scrollRef} onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {learningPaths.map((path, i) => {
          const name   = path.subjects?.name ?? 'Subject'
          const slug   = path.subjects?.slug ?? ''
          const color  = getSubjectColor(name)
          const allIds = path.ordered_subtopic_ids ?? []
          const total  = allIds.length
          const done   = allIds.filter(id => completedIds.has(id)).length
          const pct    = total > 0 ? Math.round((done / total) * 100) : 0
          const nextId = allIds.find(id => !completedIds.has(id) && subtopicMap?.[id]?.lesson_status === 'published')
          const nextSub = nextId ? subtopicMap[nextId] : null

          return (
            <div key={path.subject_id} className="flex-shrink-0 snap-start w-[72vw] max-w-[280px]">
              <div className={`${color.bg} rounded-3xl p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className={`text-base font-black ${color.text} leading-tight`}>{name}</h4>
                  <span className={`px-2.5 py-1 rounded-xl bg-white/50 text-sm font-black ${color.text}`}>{pct}%</span>
                </div>
                <div className="h-2 bg-white/40 rounded-full overflow-hidden mb-3">
                  <div className={`h-full ${color.accent} rounded-full transition-all duration-700`} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
                </div>
                {nextSub && <p className={`text-xs ${color.text} opacity-80 mb-4`}><span className="font-bold">Next:</span> {nextSub.name}</p>}
                <div className="flex gap-2">
                  {nextId && (
                    <Link href={`/student/lesson/${nextId}`}
                      className={`flex-1 text-center py-2.5 ${color.accent} text-white text-xs font-black rounded-2xl hover:opacity-90 active:scale-95 transition-all`}>
                      Continue →
                    </Link>
                  )}
                  <Link href={`/student/subjects/${slug}`}
                    className={`flex-1 text-center py-2.5 bg-white/60 ${color.text} text-xs font-bold rounded-2xl hover:bg-white/80 transition-all`}>
                    Topics
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {learningPaths.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {learningPaths.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === activeIdx ? 'w-4 h-1.5 bg-indigo-600' : 'w-1.5 h-1.5 bg-gray-300'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Goal banner ──────────────────────────────────────────────────────────────
function GoalBanner({ profile }) {
  const hasCourse = Boolean(profile?.university_course)
  const hasJamb   = Boolean(profile?.jamb_total_target)
  const hasWaec   = Object.keys(profile?.waec_target_grades ?? {}).length > 0
  if (!hasCourse && !hasJamb && !hasWaec) return null

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xl">🎯</span>
      </div>
      <div className="flex-1 min-w-0">
        {hasCourse && <p className="font-black text-gray-900 text-sm truncate">{profile.university_course}</p>}
        <p className="text-xs text-gray-400 mt-0.5">
          {hasJamb ? `JAMB target: ${profile.jamb_total_target}/400` : ''}
          {hasJamb && hasWaec ? ' · ' : ''}{hasWaec ? 'WAEC targets set ✓' : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile, setProfile]               = useState(null)
  const [learningPaths, setLearningPaths]   = useState([])
  const [lessonProgress, setLessonProgress] = useState([])
  const [subtopicMap, setSubtopicMap]       = useState({})
  const [streak, setStreak]                 = useState(0)
  const [stats, setStats]                   = useState({ completedLessons: 0, practiceCount: 0 })
  const [showGoalModal, setShowGoalModal]   = useState(false)
  const [loading, setLoading]               = useState(true)
  const [diagnosticSaving, setDiagnosticSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const pending = sessionStorage.getItem('pending_diagnostic')
    if (pending) {
      setDiagnosticSaving(true)
      fetch('/api/diagnostic/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(JSON.parse(pending)) })
        .then(() => { sessionStorage.removeItem('pending_diagnostic'); loadLearningData(user.id).then(() => setDiagnosticSaving(false)) })
        .catch(() => setDiagnosticSaving(false))
    }

    const [{ data: prof }, { data: streakRow }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
    ])
    setProfile(prof)
    setStreak(streakRow?.current_streak ?? 0)
    const completedLessons = (prog ?? []).filter(p => p.completed).length
    const { count: pc } = await supabase.from('question_attempts').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('context', 'practice')
    setStats({ completedLessons, practiceCount: pc ?? 0 })
    await loadLearningData(user.id)
    setLoading(false)
  }

  async function loadLearningData(userId) {
    const { data: paths } = await supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(name, slug)').eq('student_id', userId)
    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)
    if (!active.length) return
    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]
    let allSubs = []
    for (let i = 0; i < allIds.length; i += 200) {
      const { data } = await supabase.from('subtopics').select('id, name, slug, lesson_status, topics(name)').in('id', allIds.slice(i, i + 200))
      allSubs = allSubs.concat(data ?? [])
    }
    const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s }); setSubtopicMap(sMap)
    const { data: prog } = await supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', userId).in('subtopic_id', allIds)
    setLessonProgress(prog ?? [])
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const hasPath   = learningPaths.length > 0
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-4">

      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {streak > 2 ? 'On a roll,' : 'Hey,'}
          </p>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{firstName} 👋</h1>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {diagnosticSaving && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-emerald-700 font-semibold">Building your personalised study plan…</p>
        </div>
      )}

      {/* ═════ STATE A: HAS LEARNING PATH ═════ */}
      {hasPath && (
        <>
          <XPBar completedLessons={stats.completedLessons} practiceCount={stats.practiceCount} />
          <PracticeCTA />
          <WeeklyGoals />
          <SubjectSlider learningPaths={learningPaths} lessonProgress={lessonProgress} subtopicMap={subtopicMap} />
          <StudyPlanCard learningPaths={learningPaths} subtopicMap={subtopicMap} completedIds={lessonProgress.filter(p => p.completed).map(p => p.subtopic_id)} />
          <GoalBanner profile={profile} />
          {!profile?.goals_set && (
            <button onClick={() => setShowGoalModal(true)}
              className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-orange-100">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <p className="font-black text-white text-sm">Set your exam goals</p>
                <p className="text-orange-100 text-xs mt-0.5">Target score, university, exam date</p>
              </div>
              <span className="text-white/80">→</span>
            </button>
          )}
        </>
      )}

      {/* ═════ STATE B: NO PATH YET ═════ */}
      {!hasPath && !diagnosticSaving && (
        <>
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-black text-gray-900 text-base mb-1">Get your personalised study plan</h3>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">Answer 10 questions and we'll build a plan around your weak areas.</p>
            <Link href="/diagnostic" className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center mb-3 shadow-lg shadow-indigo-100">
              Take the diagnostic →
            </Link>
            <Link href="/student/learn" className="block text-center text-sm text-gray-400 hover:text-gray-600 font-medium">
              Or browse lessons directly →
            </Link>
          </div>
          <PracticeCTA />
          <WeeklyGoals />
          {profile?.goals_set ? <GoalBanner profile={profile} /> : (
            <button onClick={() => setShowGoalModal(true)}
              className="w-full flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-3xl px-5 py-4 text-left hover:bg-amber-100 transition-colors">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <p className="font-black text-amber-800 text-sm">Set your exam goals</p>
                <p className="text-amber-600 text-xs mt-0.5">Target score, university, exam date</p>
              </div>
              <span className="text-amber-400">→</span>
            </button>
          )}
        </>
      )}

      {showGoalModal && (
        <GoalModal profile={profile} onClose={() => setShowGoalModal(false)}
          onSave={updated => { setProfile(prev => ({ ...prev, ...updated, goals_set: true })); setShowGoalModal(false) }} />
      )}
    </div>
  )
}