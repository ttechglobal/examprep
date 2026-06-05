'use client'
// src/app/student/learn/LearnPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES IN THIS VERSION:
//   1. StudyPlanPreview replaced — now fetches from /api/student/study-plan
//      (same API the study plan page uses) so it shows real weak topics with
//      status (weak / improving / untested), not just learning path order.
//   2. Subject label added to every study plan item — student sees:
//      subject badge + topic name + status badge on each row.
//   3. Items link to /student/study-plan/[topicId] — the full topic page
//      where they can Study or Practice, not just a lesson directly.
//   4. Subject cards unchanged — still show progress % per subject.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ─── Subject SVG icons ─────────────────────────────────────────────────────────
function SubjectIcon({ name, className = 'w-5 h-5' }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    'Mathematics':         <svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 4H6l6 8-6 8h12"/></svg>,
    'Further Mathematics': <svg className={className} viewBox="0 0 24 24" {...s}><line x1="6" y1="4" x2="18" y2="4"/><line x1="9" y1="4" x2="9" y2="20"/><path d="M15 4v10a2 2 0 002 2"/></svg>,
    'Physics':             <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(120 12 12)"/></svg>,
    'Chemistry':           <svg className={className} viewBox="0 0 24 24" {...s}><path d="M9 3h6"/><path d="M10 3v5.5L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-2.9L14 8.5V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>,
    'Biology':             <svg className={className} viewBox="0 0 24 24" {...s}><path d="M7 3s3.5 3 3.5 9S7 21 7 21"/><path d="M17 3s-3.5 3-3.5 9 3.5 9 3.5 9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
    'Economics':           <svg className={className} viewBox="0 0 24 24" {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    'Government':          <svg className={className} viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    'English Language':    <svg className={className} viewBox="0 0 24 24" {...s}><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  }
  const defaultIcon = (
    <svg className={className} viewBox="0 0 24 24" {...s}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  )
  return icons[name] ?? defaultIcon
}

// ─── Status config matching study plan page ────────────────────────────────────
const STATUS_CONFIG = {
  weak:      { label: 'Needs work', badge: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',     icon: '🎯' },
  improving: { label: 'Improving',  badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', icon: '📈' },
  strong:    { label: 'Strong',     badge: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400', icon: '✅' },
  untested:  { label: 'New',        badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400', icon: '📖' },
}

// ─── Study Plan Preview — fetches real plan data ───────────────────────────────
const StudyPlanPreview = memo(function StudyPlanPreview() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [hasAny,   setHasAny]   = useState(false)

  useEffect(() => {
    fetch('/api/student/study-plan')
      .then(r => r.json())
      .then(data => {
        const allItems = data.items ?? []
        setHasAny(data.hasAnyAttempts ?? allItems.length > 0)

        // Cross-subject interleave: pick top 2 weak/untested, one per subject
        const bySubject = {}
        allItems.forEach(item => {
          if (!bySubject[item.subjectId]) bySubject[item.subjectId] = []
          bySubject[item.subjectId].push(item)
        })

        // Sort each subject's items: weak first, then improving, then untested
        const order = { weak: 0, improving: 1, untested: 2, strong: 3 }
        Object.values(bySubject).forEach(arr =>
          arr.sort((a, b) => {
            const od = (order[a.status] ?? 2) - (order[b.status] ?? 2)
            return od !== 0 ? od : a.accuracyPct - b.accuracyPct
          })
        )

        // Round-robin across subjects, max 4 items
        const result = []
        const subjectIds = Object.keys(bySubject)
        let round = 0
        while (result.length < 4 && round < 10) {
          let added = false
          for (const sid of subjectIds) {
            if (result.length >= 4) break
            if (bySubject[sid][round]) {
              result.push(bySubject[sid][round])
              added = true
            }
          }
          if (!added) break
          round++
        }

        setItems(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-default">
          <div className="h-4 w-32 bg-subtle rounded animate-pulse" />
          <div className="h-3 w-48 bg-subtle rounded animate-pulse mt-1.5" />
        </div>
        <div className="divide-y divide-default">
          {[1, 2].map(i => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-subtle animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-16 bg-subtle rounded animate-pulse" />
                <div className="h-4 w-48 bg-subtle rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div>
          <p className="text-sm font-black text-primary">Study Plan</p>
          <p className="text-xs text-secondary mt-0.5">
            {items.length > 0
              ? `${items.length} topic${items.length !== 1 ? 's' : ''} to work on`
              : 'Take a diagnostic to build your plan'}
          </p>
        </div>
        <Link
          href="/student/study-plan"
          className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:underline"
        >
          See all →
        </Link>
      </div>

      {/* Empty state */}
      {!hasAny || items.length === 0 ? (
        <div className="px-5 py-6 text-center space-y-3">
          <div className="text-3xl">🎯</div>
          <div>
            <p className="text-sm font-bold text-primary">No study plan yet</p>
            <p className="text-xs text-secondary mt-1 leading-relaxed max-w-[200px] mx-auto">
              Take the diagnostic test so we can show you what to focus on.
            </p>
          </div>
          <Link
            href="/diagnostic"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            Take diagnostic →
          </Link>
        </div>
      ) : (
        /* Topic rows */
        <div className="divide-y divide-default">
          {items.map((item, idx) => {
            const color  = getSubjectColor(item.subjectName ?? '')
            const cfg    = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.untested
            const pct    = item.accuracyPct ?? 0

            return (
              <Link
                key={item.topicId ?? idx}
                href={`/student/study-plan/${item.topicId}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem('study_plan_topic', JSON.stringify({
                      topicId:        item.topicId,
                      topicName:      item.topicName,
                      subjectName:    item.subjectName,
                      subjectId:      item.subjectId,
                      examType:       item.examType ?? 'WAEC',
                      attempts:       item.attemptCount ?? 0,
                      correct:        Math.round((pct / 100) * (item.attemptCount ?? 0)),
                      insightMessage: item.insightMessage,
                    }))
                  } catch {}
                }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors group"
              >
                {/* Subject colour bubble with rank */}
                <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 flex-none`}>
                  <span className={`text-xs font-black ${color.text}`}>{idx + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Subject + status badges */}
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                      {item.subjectName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  {/* Topic name */}
                  <p className="text-sm font-bold text-primary truncate leading-snug">
                    {item.topicName}
                  </p>
                </div>

                {/* Accuracy + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.attemptCount > 0 && (
                    <span className={`text-xs font-black tabular-nums ${
                      pct >= 70 ? 'text-green-600 dark:text-green-400'
                      : pct >= 50 ? 'text-amber-500 dark:text-amber-400'
                      : 'text-red-500 dark:text-red-400'
                    }`}>
                      {pct}%
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-tertiary group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            )
          })}

          {/* Footer */}
          <Link
            href="/student/study-plan"
            className="flex items-center justify-center gap-1 px-5 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-subtle transition-colors"
          >
            View full study plan
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
})

// ─── Subject card ──────────────────────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completed, total }) {
  const color = getSubjectColor(subject.name)
  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] bg-card"
    >
      <div className={`${color.bg} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between mb-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
            <SubjectIcon name={subject.name} className={`w-5 h-5 ${color.text}`} />
          </div>
          <span className="text-sm">{mastery.emoji}</span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug`}>{subject.name}</p>
      </div>
      <div className="px-4 py-2.5 bg-card">
        <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
          <div
            className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-tertiary">{completed}/{total} topics</p>
          <p className={`text-xs font-black ${
            pct >= 70 ? 'text-green-600 dark:text-green-400' :
            pct >= 40 ? 'text-amber-500 dark:text-amber-400' :
            'text-tertiary'
          }`}>{pct}%</p>
        </div>
      </div>
    </Link>
  )
})

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile,        setProfile]       = useState(null)
  const [subjectList,    setSubjectList]   = useState([])
  const [completedIds,   setCompletedIds]  = useState(new Set())
  const [learningPaths,  setLearningPaths] = useState([])
  const [subtopicMap,    setSubtopicMap]   = useState({})
  const [loading,        setLoading]       = useState(true)
  const [showGoalModal,  setShowGoalModal] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, exam_type, subjects, goals_set, university_course, jamb_total_target, waec_target_grades, jamb_target_scores, target_university, desired_profession')
        .eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase
        .from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    const subjects = (paths ?? []).map(p => p.subjects).filter(Boolean)
    setSubjectList(subjects)

    // Fetch subtopic details for subject progress cards
    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []
      for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      let allSubs = []
      await Promise.all(batches.map(b =>
        supabase.from('subtopics').select('id, name, slug, lesson_status').in('id', b)
          .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
      ))
      const sMap = {}
      allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  // Subject progress % for subject cards
  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      const path      = learningPaths.find(p => p.subject_id === subject.id)
      const ids       = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, path, pct, completed, total, mastery: getMasteryLevel(pct) }
    })
  }, [subjectList, learningPaths, completedIds])

  if (loading) return <LearnHubSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 pb-28">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary leading-tight">
            {firstName ? `${firstName}'s Learning Hub` : 'Learning Hub'}
          </h1>
          <p className="text-xs text-secondary mt-0.5">Study · Practice · Progress</p>
        </div>
        <button
          onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle border border-default text-xs font-bold text-secondary rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Settings
        </button>
      </div>

      {/* ── 1. Study Plan — the focal point ──────────────────────────────────── */}
      <StudyPlanPreview />

      {/* ── 2. Your Subjects ─────────────────────────────────────────────────── */}
      {subjectProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-primary">Your Subjects</p>
            <span className="text-xs text-tertiary">{subjectProgress.length} subject{subjectProgress.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjectProgress.map(({ subject, pct, mastery, completed, total }) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                pct={pct}
                mastery={mastery}
                completed={completed}
                total={total}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 3. No subjects yet ────────────────────────────────────────────────── */}
      {subjectProgress.length === 0 && !loading && (
        <div className="bg-card rounded-2xl border border-default p-6 text-center space-y-3">
          <div className="text-3xl">📚</div>
          <div>
            <p className="text-sm font-bold text-primary">No subjects yet</p>
            <p className="text-xs text-secondary mt-1 leading-relaxed max-w-[220px] mx-auto">
              Set your exam goals and we'll build your personalised curriculum.
            </p>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors"
          >
            Set up my subjects →
          </button>
        </div>
      )}

      {/* ── Goal modal ─────────────────────────────────────────────────────────── */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={(updated) => { setProfile(updated); setShowGoalModal(false) }}
          />
        </Suspense>
      )}

      <PracticeHubFAB />
    </div>
  )
}