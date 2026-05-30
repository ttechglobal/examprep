'use client'
// src/app/student/dashboard/page.js
// Fixes: dark/light mode throughout, badge removed, all hardcoded colors → CSS tokens

import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import WeeklyGoals from '@/components/dashboard/WeeklyGoals'
import Link from 'next/link'

// ─── Practice Hub CTA ──────────────────────────────────────────────────────────
const PracticeCTA = memo(function PracticeCTA() {
  return (
    <Link href="/student/practice"
      className="relative overflow-hidden flex items-center gap-4 bg-card rounded-3xl border border-default
                 px-5 py-4 hover:border-indigo-300 dark:hover:border-indigo-700
                 hover:shadow-sm transition-all group active:scale-[0.98]">
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-indigo-50/60 dark:from-indigo-950/10 to-transparent rounded-r-3xl pointer-events-none" />
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          Practice Hub
        </p>
        <p className="text-xs text-secondary mt-0.5">Past questions · Mock tests · Exam simulation</p>
      </div>
      <svg className="w-5 h-5 text-tertiary group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
})

// ─── Subject progress mini card ────────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub }) {
  const color = getSubjectColor(sub.subjects?.name)
  return (
    <Link
      href={`/student/subjects/${sub.subjects?.slug}`}
      className="block bg-card rounded-2xl border border-default overflow-hidden
                 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all active:scale-[0.98]"
    >
      <div className={`${color.bg} px-4 py-3`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-black ${color.text} truncate mr-2`}>{sub.subjects?.name}</p>
          <span className={`text-xs font-bold flex-shrink-0 ${sub.mastery?.color ?? 'text-tertiary'}`}>
            {sub.mastery?.emoji} {sub.pct}%
          </span>
        </div>
        <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${sub.pct}%` }} />
        </div>
      </div>
    </Link>
  )
})

// ─── Curated study plan card ───────────────────────────────────────────────────
const StudyPlanCard = memo(function StudyPlanCard({ learningPaths, subtopicMap, completedIds }) {
  if (!learningPaths.length) return null

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
    <div className="bg-card rounded-3xl border border-default overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-default flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-primary">Your Study Plan</h2>
          <p className="text-xs text-secondary mt-0.5">Pick up where you left off</p>
        </div>
        <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">
          View all →
        </Link>
      </div>
      <div className="divide-y divide-default">
        {upNext.map((sub) => {
          const color = getSubjectColor(sub.subjectName)
          return (
            <Link key={sub.id} href={`/student/lesson/${sub.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-subtle transition-colors">
              <div className={`w-8 h-8 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                <div className={`w-2.5 h-2.5 rounded-full ${color.accent}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{sub.name}</p>
                <p className="text-xs text-tertiary truncate">{sub.subjectName}</p>
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
  const [diagnosticSaving, setDiagnosticSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: strk }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects, goals_set').eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
    ])

    setProfile(prof)
    setStreak(strk?.current_streak ?? 0)
    setLessonProgress(prog ?? [])
    await loadLearningData(user.id, prog ?? [], prof)
    setLoading(false)
  }

  async function loadLearningData(userId, prog = [], prof) {
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
      .eq('student_id', userId)

    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)

    // Build subject progress cards from learning paths
    const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    const subjectCards = active.map(path => {
      const total     = path.ordered_subtopic_ids?.length ?? 0
      const completed = path.ordered_subtopic_ids?.filter(id => completedIds.has(id)).length ?? 0
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return {
        subject_id: path.subject_id,
        subjects:   path.subjects,
        total, completed, pct,
        mastery: getMasteryLevel(pct),
      }
    })
    setSubjects(subjectCards)

    if (!active.length) return

    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]
    const batches = []
    for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
    let allSubs = []
    await Promise.all(batches.map(b =>
      supabase.from('subtopics').select('id, name, slug, lesson_status').in('id', b)
        .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
    ))
    const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s })
    setSubtopicMap(sMap)
  }

  function getMasteryLevel(pct) {
    if (pct >= 80) return { label: 'Mastered',      color: 'text-green-600',  emoji: '🏆' }
    if (pct >= 60) return { label: 'Getting there', color: 'text-blue-600',   emoji: '📈' }
    if (pct >= 40) return { label: 'Building',      color: 'text-yellow-600', emoji: '🔨' }
    if (pct >= 20) return { label: 'Just started',  color: 'text-orange-600', emoji: '🌱' }
    return           { label: 'Not started',        color: 'text-tertiary',   emoji: '💤' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasPath   = learningPaths.length > 0
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const completedIds = lessonProgress.filter(p => p.completed).map(p => p.subtopic_id)

  return (
    <div className="space-y-4">

      {/* Greeting — badge removed */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wide">
            {streak > 2 ? 'On a roll,' : 'Hey,'}
          </p>
          <h1 className="text-2xl font-black text-primary leading-tight">
            {firstName} 👋
            {streak > 0 && (
              <span className="ml-2 text-base font-bold text-orange-500">🔥 {streak}</span>
            )}
          </h1>
        </div>
      </div>

      {diagnosticSaving && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">Building your personalised study plan…</p>
        </div>
      )}

      {hasPath ? (
        <>
          {/* Weekly goals */}
          <WeeklyGoals />

          {/* Practice Hub */}
          <PracticeCTA />

          {/* Subject progress — show all */}
          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/lessons" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">
                  See all →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {subjects.map(sub => (
                  <SubjectCard key={sub.subject_id} sub={sub} />
                ))}
              </div>
            </div>
          )}

          {/* Study plan */}
          <StudyPlanCard
            learningPaths={learningPaths}
            subtopicMap={subtopicMap}
            completedIds={completedIds}
          />
        </>
      ) : (
        // No learning path yet
        <div className="bg-card rounded-3xl border border-default p-6 text-center space-y-4">
          <p className="text-4xl">📚</p>
          <div>
            <p className="font-black text-primary text-lg">Let's build your study plan</p>
            <p className="text-sm text-secondary mt-1 leading-relaxed">
              Take a short diagnostic test and we'll create a personalised path just for you.
            </p>
          </div>
          <Link href="/diagnostic"
            className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Take the diagnostic →
          </Link>
        </div>
      )}

    </div>
  )
}