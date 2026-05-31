'use client'
// src/app/student/learn/LearnPage.jsx
// Central learning workspace — fully theme-aware, works in light and dark mode.
// Theming: uses CSS variable utilities only (bg-card, text-primary, bg-subtle,
// border-default, text-secondary, text-tertiary) — same pattern as Community/Profile/Videos.
//
// Sections:
// 1. Header with edit button → Profile page (exam/subject settings)
// 2. Study Plan preview — 2 items across subjects, link to full plan
// 3. Your Subjects — all subjects as elevated cards, no exam separation
// 4. Practice Hub quick-link

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
    'Biology':             <svg className={className} viewBox="0 0 24 24" {...s}><path d="M7 3s3.5 3 3.5 9S7 21 7 21"/><path d="M17 3s-3.5 3-3.5 9S17 21 17 21"/><line x1="7" y1="8.5" x2="17" y2="8.5"/><line x1="7" y1="15.5" x2="17" y2="15.5"/></svg>,
    'English Language':    <svg className={className} viewBox="0 0 24 24" {...s}><path d="M2 4v16a1 1 0 001 1h6a3 3 0 013 3 3 3 0 013-3h6a1 1 0 001-1V4"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M2 4h7a3 3 0 013 3M22 4h-7a3 3 0 00-3 3"/></svg>,
    'Literature in English':<svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 4C11 4 6 10 4 20c2-4 5-6 8-6"/><path d="M4 20l3-3"/><path d="M13 14l-2 6"/></svg>,
    'Economics':           <svg className={className} viewBox="0 0 24 24" {...s}><polyline points="3 21 3 3"/><polyline points="3 21 21 21"/><rect x="6" y="14" width="3" height="7" rx="0.5"/><rect x="11" y="9" width="3" height="12" rx="0.5"/><rect x="16" y="5" width="3" height="16" rx="0.5"/></svg>,
    'Government':          <svg className={className} viewBox="0 0 24 24" {...s}><path d="M3 21h18M3 10h18M12 3L3 10M12 3l9 7"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>,
    'Geography':           <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><path d="M12 3a15 15 0 010 18"/><path d="M12 3a15 15 0 000 18"/></svg>,
    'History':             <svg className={className} viewBox="0 0 24 24" {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    'Commerce':            <svg className={className} viewBox="0 0 24 24" {...s}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    'Accounting':          <svg className={className} viewBox="0 0 24 24" {...s}><rect x="4" y="2" width="16" height="20" rx="2"/><rect x="7" y="5" width="10" height="4" rx="0.5"/><circle cx="8" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="0.8" fill="currentColor" stroke="none"/></svg>,
    'Agricultural Science':<svg className={className} viewBox="0 0 24 24" {...s}><line x1="12" y1="22" x2="12" y2="11"/><path d="M12 11C12 7 17 3 21 3c0 5-4 9-9 9z"/><path d="M12 11C12 7 7 3 3 3c0 5 4 9 9 9z"/></svg>,
    'Computer Science':    <svg className={className} viewBox="0 0 24 24" {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M8 9l-2 2 2 2M16 9l2 2-2 2"/></svg>,
    'Civic Education':     <svg className={className} viewBox="0 0 24 24" {...s}><line x1="12" y1="3" x2="12" y2="20"/><path d="M5 21h14"/><path d="M5 7h14"/><path d="M12 7L6 10l-1 4h6M12 7l6 3 1 4h-6"/></svg>,
  }
  const langIcon    = <svg className={className} viewBox="0 0 24 24" {...s}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  const defaultIcon = <svg className={className} viewBox="0 0 24 24" {...s}><path d="M12 20h9M12 4H3v16M12 4h9v16"/></svg>
  if (['Yoruba','Igbo','Hausa'].includes(name)) return langIcon
  return icons[name] ?? defaultIcon
}

// ─── Subject card — elevated, no outline ──────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completed, total }) {
  const color = getSubjectColor(subject.name)
  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] bg-card"
    >
      {/* Coloured band — subject icon + name */}
      <div className={`${color.bg} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between mb-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
            <SubjectIcon name={subject.name} className={`w-5 h-5 ${color.text}`} />
          </div>
          <span className="text-sm">{mastery.emoji}</span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug`}>{subject.name}</p>
      </div>

      {/* Progress footer — uses bg-card so it flips between white/dark */}
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

// ─── Study plan preview — 2 items, cross-subject ──────────────────────────────
const StudyPlanPreview = memo(function StudyPlanPreview({ subjectProgress, subtopicMap, completedIds }) {
  const upNext = useMemo(() => {
    // One item per subject, max 2 total — round-robin for cross-subject coverage
    const items = []
    const usedSubjects = new Set()
    for (const { subject, path } of subjectProgress) {
      if (items.length >= 2) break
      if (usedSubjects.has(subject.id)) continue
      for (const id of (path?.ordered_subtopic_ids ?? [])) {
        if (completedIds.has(id)) continue
        const sub = subtopicMap[id]
        const entry = sub
          ? { ...sub, subjectName: subject.name, subjectSlug: subject.slug }
          : { id, name: '…', slug: id, lesson_status: 'draft', subjectName: subject.name, subjectSlug: subject.slug }
        items.push(entry)
        usedSubjects.add(subject.id)
        break
      }
    }
    return items
  }, [subjectProgress, subtopicMap, completedIds])

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div>
          <p className="text-sm font-black text-primary">Study Plan</p>
          <p className="text-xs text-secondary mt-0.5">Personalised to your weak areas</p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors">
          View all →
        </Link>
      </div>

      {upNext.length === 0 ? (
        <div className="px-5 py-5 text-center">
          <p className="text-xs text-secondary leading-relaxed">Take the diagnostic to get your personalised study plan</p>
          <Link href="/diagnostic"
            className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-default">
          {upNext.map(item => {
            const color = getSubjectColor(item.subjectName)
            const href = item.lesson_status === 'published'
              ? `/student/learn/${item.slug}`
              : '/student/study-plan'
            return (
              <Link key={item.id} href={href}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors">
                <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                  <SubjectIcon name={item.subjectName} className={`w-4 h-4 ${color.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{item.name}</p>
                  <p className="text-xs text-secondary truncate">{item.subjectName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.lesson_status !== 'published' && (
                    <span className="text-xs text-tertiary">Soon</span>
                  )}
                  <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function LearnHubPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile,       setProfile]       = useState(null)
  const [subjectList,   setSubjectList]   = useState([])
  const [completedIds,  setCompletedIds]  = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap,   setSubtopicMap]   = useState({})
  const [loading,       setLoading]       = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, exam_type, subjects, goals_set, university_course, jamb_total_target, waec_target_grades, jamb_target_scores, target_university, desired_profession')
        .eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    // Subjects: derive from learning paths (same approach as dashboard)
    // No exam filtering — Physics is Physics regardless of JAMB/WAEC
    const subjects = (paths ?? [])
      .map(p => p.subjects)
      .filter(Boolean)
    setSubjectList(subjects)

    // Fetch subtopic details for study plan preview
    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []; for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      let allSubs = []
      await Promise.all(batches.map(b =>
        supabase.from('subtopics').select('id, name, slug, lesson_status').in('id', b)
          .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
      ))
      const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  // Enrich subjects with progress %
  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      const path      = learningPaths.find(p => p.subject_id === subject.id)
      const ids       = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, total, completed, pct, mastery: getMasteryLevel(pct), path }
    })
  }, [subjectList, learningPaths, completedIds])

  if (loading) return <LearnHubSkeleton />

  return (
    <div className="space-y-6 pb-6">
      {showGoalModal && profile && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => {
              setProfile(prev => ({ ...prev, ...updated }))
              setShowGoalModal(false)
              // Reload if subjects changed
              if (JSON.stringify(updated.subjects) !== JSON.stringify(profile.subjects)) {
                setLoading(true); init()
              }
            }}
          />
        </Suspense>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary">Learn Hub</h1>
          <p className="text-sm text-secondary mt-0.5">Your central learning workspace</p>
        </div>
        {/* Edit: opens GoalModal to update subjects/exam settings */}
        <button
          onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle rounded-xl text-xs font-bold text-secondary hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          aria-label="Edit subjects and exam settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Settings
        </button>
      </div>

      {/* ── Exam badge ── */}
      {profile?.exam_type && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${
            profile.exam_type === 'BOTH'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              : profile.exam_type === 'JAMB'
              ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}>
            {profile.exam_type === 'BOTH' ? 'WAEC · JAMB' : profile.exam_type}
          </span>
          <span className="text-xs text-tertiary">{subjectProgress.length} subject{subjectProgress.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Study Plan preview ── */}
      <StudyPlanPreview
        subjectProgress={subjectProgress}
        subtopicMap={subtopicMap}
        completedIds={completedIds}
      />

      {/* ── Subjects ── */}
      {subjectProgress.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-primary">Your Subjects</p>
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
      ) : (
        /* Empty state */
        <div className="bg-card rounded-2xl shadow-sm p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-subtle flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
            </svg>
          </div>
          <p className="font-black text-primary">No subjects yet</p>
          <p className="text-sm text-secondary leading-relaxed">Add your subjects or take the diagnostic to get a personalised study plan.</p>
          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={() => setShowGoalModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
            >
              Add subjects
            </button>
            <Link
              href="/diagnostic"
              className="px-4 py-2 bg-subtle text-primary text-sm font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              Take diagnostic →
            </Link>
          </div>
        </div>
      )}

      {/* ── Practice Hub link ── */}
      <Link
        href="/student/practice"
        className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl px-5 py-4 shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-black text-sm">Practice Hub</p>
          <p className="text-white/70 text-xs mt-0.5">Past questions · Timed tests · Exam simulation</p>
        </div>
        <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </Link>
      <PracticeHubFAB />
    </div>
  )
}