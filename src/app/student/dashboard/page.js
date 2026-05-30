'use client'
// src/app/student/dashboard/page.js
// Full light/dark audit: all hardcoded bg-white/text-gray-* replaced with CSS token utilities.
// Study plan now reads from lesson_progress (completedIds) and learning path order — works
// without question_attempts data. Up-next shown from learning path ordered list.

import { useEffect, useState, useMemo, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'

const WeeklyGoals = lazy(() => import('@/components/dashboard/WeeklyGoals'))
const GoalModal   = lazy(() => import('@/components/dashboard/GoalModal'))

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function SubjectSVGIcon({ name, className = 'w-5 h-5' }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    'Mathematics':        <svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 4H6l6 8-6 8h12"/></svg>,
    'Further Mathematics':<svg className={className} viewBox="0 0 24 24" {...s}><line x1="6" y1="4" x2="18" y2="4"/><line x1="9" y1="4" x2="9" y2="20"/><path d="M15 4v10a2 2 0 002 2"/></svg>,
    'Physics':            <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(120 12 12)"/></svg>,
    'Chemistry':          <svg className={className} viewBox="0 0 24 24" {...s}><path d="M9 3h6"/><path d="M10 3v5.5L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-2.9L14 8.5V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>,
    'Biology':            <svg className={className} viewBox="0 0 24 24" {...s}><path d="M7 3c0 0 3.5 3 3.5 9S7 21 7 21"/><path d="M17 3c0 0-3.5 3-3.5 9S17 21 17 21"/><line x1="7" y1="8.5" x2="17" y2="8.5"/><line x1="7" y1="15.5" x2="17" y2="15.5"/></svg>,
    'English Language':   <svg className={className} viewBox="0 0 24 24" {...s}><path d="M2 4v16a1 1 0 001 1h6a3 3 0 013 3 3 3 0 013-3h6a1 1 0 001-1V4"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M2 4h7a3 3 0 013 3M22 4h-7a3 3 0 00-3 3"/></svg>,
    'Literature in English':<svg className={className} viewBox="0 0 24 24" {...s}><path d="M18 4C11 4 6 10 4 20c2-4 5-6 8-6"/><path d="M4 20l3-3"/><path d="M13 14l-2 6"/></svg>,
    'Economics':          <svg className={className} viewBox="0 0 24 24" {...s}><polyline points="3 21 3 3"/><polyline points="3 21 21 21"/><rect x="6" y="14" width="3" height="7" rx="0.5"/><rect x="11" y="9" width="3" height="12" rx="0.5"/><rect x="16" y="5" width="3" height="16" rx="0.5"/></svg>,
    'Government':         <svg className={className} viewBox="0 0 24 24" {...s}><path d="M3 21h18M3 10h18M12 3L3 10M12 3l9 7"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>,
    'Geography':          <svg className={className} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><path d="M12 3a15 15 0 010 18"/><path d="M12 3a15 15 0 000 18"/></svg>,
    'History':            <svg className={className} viewBox="0 0 24 24" {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    'Commerce':           <svg className={className} viewBox="0 0 24 24" {...s}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    'Accounting':         <svg className={className} viewBox="0 0 24 24" {...s}><rect x="4" y="2" width="16" height="20" rx="2"/><rect x="7" y="5" width="10" height="4" rx="0.5"/><circle cx="8" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="0.8" fill="currentColor" stroke="none"/></svg>,
    'Agricultural Science':<svg className={className} viewBox="0 0 24 24" {...s}><line x1="12" y1="22" x2="12" y2="11"/><path d="M12 11C12 7 17 3 21 3c0 5-4 9-9 9z"/><path d="M12 11C12 7 7 3 3 3c0 5 4 9 9 9z"/></svg>,
    'Computer Science':   <svg className={className} viewBox="0 0 24 24" {...s}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M8 9l-2 2 2 2M16 9l2 2-2 2"/></svg>,
    'Civic Education':    <svg className={className} viewBox="0 0 24 24" {...s}><line x1="12" y1="3" x2="12" y2="20"/><path d="M5 21h14"/><path d="M5 7h14"/><path d="M12 7L6 10l-1 4h6M12 7l6 3 1 4h-6"/></svg>,
  }
  const langIcon = <svg className={className} viewBox="0 0 24 24" {...s}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  const defaultIcon = <svg className={className} viewBox="0 0 24 24" {...s}><path d="M12 20h9M12 4H3v16M12 4h9v16"/></svg>
  if (['Yoruba','Igbo','Hausa'].includes(name)) return langIcon
  return icons[name] ?? defaultIcon
}

function getMasteryLevel(pct) {
  if (pct >= 80) return { emoji: '🏆', color: 'text-green-600 dark:text-green-400' }
  if (pct >= 60) return { emoji: '📈', color: 'text-blue-600 dark:text-blue-400' }
  if (pct >= 40) return { emoji: '🔨', color: 'text-yellow-600 dark:text-yellow-400' }
  if (pct >= 20) return { emoji: '🌱', color: 'text-orange-500 dark:text-orange-400' }
  return           { emoji: '💤', color: 'text-tertiary' }
}

// ─── Subject card — fully themed ───────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub }) {
  const color   = getSubjectColor(sub.subjects?.name)
  const mastery = getMasteryLevel(sub.pct ?? 0)
  return (
    <Link href={`/student/subjects/${sub.subjects?.slug}`}
      className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] bg-card">
      <div className={`${color.bg} px-4 pt-4 pb-3 flex flex-col gap-2`}>
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-xl bg-white/40 flex items-center justify-center">
            <SubjectSVGIcon name={sub.subjects?.name} className={`w-5 h-5 ${color.text}`} />
          </div>
          <span className="text-sm">{mastery.emoji}</span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug`}>{sub.subjects?.name}</p>
      </div>
      <div className="px-4 py-2.5 bg-card">
        <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`} style={{ width: `${sub.pct ?? 0}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <p className="text-xs text-tertiary">{sub.completed ?? 0}/{sub.total ?? 0} done</p>
          <p className={`text-xs font-black ${(sub.pct ?? 0) >= 70 ? 'text-green-600 dark:text-green-400' : (sub.pct ?? 0) >= 40 ? 'text-amber-500' : 'text-tertiary'}`}>{sub.pct ?? 0}%</p>
        </div>
      </div>
    </Link>
  )
})

// ─── Practice Hub — mobile: 1 card + See All; desktop: 3 cards ────────────────
const PracticeHub = memo(function PracticeHub() {
  const modes = [
    { id: 'timed', label: 'Timed Practice', desc: 'Mixed questions with a countdown', href: '/student/practice?mode=timed', action: 'Start', gradient: 'from-indigo-500 to-indigo-600',
      icon: <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
    { id: 'topic',  label: 'Topic Quiz',     desc: 'Focus on one topic at a time',   href: '/student/practice?mode=topic',  action: 'Start', gradient: 'from-violet-500 to-violet-600',
      icon: <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
    { id: 'exam',   label: 'Exam Simulation',desc: 'Full exam format, timed',        href: '/student/practice?mode=exam',   action: 'Start', gradient: 'from-rose-500 to-rose-600',
      icon: <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-black text-primary">Practice Hub</p>
          <p className="text-xs text-secondary mt-0.5">Past questions · Mock tests · Exam simulation</p>
        </div>
        <Link href="/student/practice" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">See all →</Link>
      </div>
      {/* Mobile: first card only */}
      <div className="sm:hidden">
        <Link href={modes[0].href}
          className="flex items-center gap-4 bg-card rounded-2xl p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
          <div className="w-11 h-11 rounded-xl bg-subtle flex items-center justify-center flex-shrink-0">{modes[0].icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-primary">{modes[0].label}</p>
            <p className="text-xs text-secondary mt-0.5">{modes[0].desc}</p>
          </div>
          <span className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r ${modes[0].gradient}`}>Start →</span>
        </Link>
      </div>
      {/* Desktop: all three cards */}
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {modes.map(mode => (
          <Link key={mode.id} href={mode.href}
            className="flex flex-col gap-3 bg-card rounded-2xl p-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98] group">
            <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center">{mode.icon}</div>
            <div>
              <p className="text-sm font-black text-primary">{mode.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{mode.desc}</p>
            </div>
            <span className={`w-full text-center py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r ${mode.gradient} group-hover:opacity-90 transition-opacity`}>{mode.action} →</span>
          </Link>
        ))}
      </div>
    </div>
  )
})

// ─── Study Plan — uses learning path order + lesson_progress (no question_attempts needed) ──
const StudyPlanSection = memo(function StudyPlanSection({ learningPaths, subtopicMap, completedIds }) {
  // Up next: first 4 uncompleted published subtopics from learning paths (already ordered by weakness)
  const upNext = useMemo(() => {
    // Max 2 items, one per subject — round-robin across learning paths so multiple subjects show
    const items = []
    const usedSubjects = new Set()
    // Two passes: first pass picks one uncompleted item per subject (up to 2 subjects)
    for (const path of learningPaths) {
      if (items.length >= 2) break
      const subjectName = path.subjects?.name ?? ''
      if (usedSubjects.has(subjectName)) continue
      for (const id of (path.ordered_subtopic_ids ?? [])) {
        if (completedIds.has(id)) continue
        const sub = subtopicMap[id]
        const entry = sub
          ? { ...sub, subjectName, subjectSlug: path.subjects?.slug ?? '' }
          : { id, name: '…', slug: id, lesson_status: 'draft', subjectName, subjectSlug: path.subjects?.slug ?? '' }
        items.push(entry)
        usedSubjects.add(subjectName)
        break
      }
    }
    return items
  }, [learningPaths, subtopicMap, completedIds])

  // Completed count across all paths
  const totalCount     = useMemo(() => learningPaths.reduce((n, p) => n + (p.ordered_subtopic_ids?.length ?? 0), 0), [learningPaths])
  const completedCount = useMemo(() => learningPaths.reduce((n, p) => n + (p.ordered_subtopic_ids ?? []).filter(id => completedIds.has(id)).length, 0), [learningPaths, completedIds])

  const hasData = upNext.length > 0

  return (
    <div className="bg-card rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div>
          <p className="text-sm font-black text-primary">Your Study Plan</p>
          <p className="text-xs text-secondary mt-0.5">
            {hasData ? `${completedCount} of ${totalCount} topics done` : 'Take the diagnostic to build your plan'}
          </p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">View all →</Link>
      </div>

      {!hasData ? (
        <div className="px-5 py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-subtle flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-primary mb-1">No study plan yet</p>
          <p className="text-xs text-secondary leading-relaxed max-w-[200px] mx-auto mb-4">Take the diagnostic test to get your personalised study plan</p>
          <Link href="/diagnostic" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-default">
          <div className="px-5 py-2">
            <p className="text-xs font-black text-indigo-500 uppercase tracking-wide">Up next</p>
          </div>
          {upNext.map(item => {
            const color = getSubjectColor(item.subjectName)
            const href = item.lesson_status === 'published' ? `/student/learn/${item.slug}` : '/student/practice'
            return (
              <Link key={item.id} href={href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-subtle transition-colors">
                <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                  <SubjectSVGIcon name={item.subjectName} className={`w-4 h-4 ${color.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{item.name}</p>
                  <p className="text-xs text-secondary truncate">{item.subjectName}</p>
                </div>
                {item.lesson_status !== 'published' && (
                  <span className="text-xs text-tertiary flex-shrink-0">Soon</span>
                )}
                <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ─── Targets summary — read-only, fully themed ────────────────────────────────
const TargetsSummary = memo(function TargetsSummary({ profile, onEdit }) {
  const hasCourse  = Boolean(profile?.university_course)
  const hasUni     = Boolean(profile?.target_university)
  const hasJamb    = Boolean(profile?.jamb_total_target)
  const waecGrades = profile?.waec_target_grades ?? {}
  const hasWaec    = Object.keys(waecGrades).length > 0
  const hasAny     = hasCourse || hasUni || hasJamb || hasWaec
  const jambScores = profile?.jamb_target_scores ?? {}

  return (
    <div className="bg-card rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="text-base">🎯</span>
          </div>
          <p className="text-sm font-black text-primary">My Targets</p>
        </div>
        <button onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 bg-subtle text-xs font-bold text-secondary rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110.414 14H8v-2.414a2 2 0 01.586-1.414z"/>
          </svg>
          Edit
        </button>
      </div>

      {!hasAny ? (
        <div className="px-5 py-5 text-center">
          <p className="text-sm text-secondary mb-3">Set your target scores and university goals to personalise your experience.</p>
          <button onClick={onEdit} className="px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-400 transition-colors">Set my targets →</button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3.5">
          {hasCourse && (
            <div className="flex items-center gap-3">
              <span className="text-base">🎓</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium">Target course</p>
                <p className="text-sm font-bold text-primary truncate">{profile.university_course}</p>
              </div>
            </div>
          )}
          {hasUni && (
            <div className="flex items-center gap-3">
              <span className="text-base">🏛️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium">Target university</p>
                <p className="text-sm font-bold text-primary truncate">{profile.target_university}</p>
              </div>
            </div>
          )}
          {hasJamb && (
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium mb-1.5">JAMB target</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {profile.jamb_total_target}<span className="text-xs font-normal text-tertiary">/400</span>
                  </span>
                  {Object.entries(jambScores).map(([sub, score]) => (
                    <span key={sub} className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl font-bold border border-indigo-200 dark:border-indigo-800">
                      {sub.slice(0,4)} · {score}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {hasWaec && (
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">📝</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium mb-1.5">WAEC target grades</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(waecGrades).map(([sub, grade]) => (
                    <span key={sub} className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-xl font-bold border border-emerald-200 dark:border-emerald-800">
                      {sub.slice(0,5)} · {grade}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// ─── Goal banner — only shown when goals not set ──────────────────────────────
const GoalBanner = memo(function GoalBanner({ profile, onClick }) {
  if (profile?.goals_set) return null
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-sm">
      <span className="text-2xl">🎯</span>
      <div className="flex-1">
        <p className="font-black text-white text-sm">Set your exam goals</p>
        <p className="text-orange-100 text-xs mt-0.5">Target score, university course</p>
      </div>
      <span className="text-white/80">→</span>
    </button>
  )
})

// ─── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile,       setProfile]       = useState(null)
  const [streak,        setStreak]        = useState(0)
  const [subjects,      setSubjects]      = useState([])
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap,   setSubtopicMap]   = useState({})
  const [completedIds,  setCompletedIds]  = useState(new Set())
  const [loading,       setLoading]       = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: streakRow }, { data: paths }, { data: progress }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, exam_type, subjects, goals_set, university_course, target_university, desired_profession, jamb_total_target, jamb_target_scores, waec_target_grades')
        .eq('id', user.id).single(),
      supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
    ])

    setProfile(prof)
    setStreak(streakRow?.current_streak ?? 0)

    const activePaths = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(activePaths)

    const cIds = new Set((progress ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    setCompletedIds(cIds)

    const enriched = activePaths.map(path => {
      const ids       = path.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => cIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject_id: path.subject_id, subjects: path.subjects, total, completed, pct }
    })
    setSubjects(enriched)

    const allIds = [...new Set(activePaths.flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      let allSubs = []
      const chunks = []; for (let i = 0; i < allIds.length; i += 200) chunks.push(allIds.slice(i, i + 200))
      await Promise.all(chunks.map(chunk =>
        supabase.from('subtopics').select('id, name, slug, lesson_status, topics(name, subjects(name))').in('id', chunk)
          .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
      ))
      const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const hasPath   = learningPaths.length > 0

  return (
    <div className="space-y-5 pb-4">
      {showGoalModal && profile && (
        <Suspense fallback={null}>
          <GoalModal profile={profile} onClose={() => setShowGoalModal(false)}
            onSave={updated => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }} />
        </Suspense>
      )}

      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-tertiary">{streak > 2 ? 'On a roll,' : 'Welcome back,'}</p>
          <h1 className="text-2xl font-black text-primary leading-tight">{firstName} 👋</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
            <span className="text-base leading-none">🔥</span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">{streak}</span>
          </div>
        )}
      </div>

      {hasPath ? (
        <>
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />

          <Suspense fallback={<div className="h-32 w-full bg-card rounded-2xl shadow-sm animate-pulse" />}>
            <WeeklyGoals />
          </Suspense>

          <PracticeHub />

          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(sub => <SubjectCard key={sub.subject_id} sub={sub} />)}
              </div>
            </div>
          )}

          <StudyPlanSection learningPaths={learningPaths} subtopicMap={subtopicMap} completedIds={completedIds} />

          <TargetsSummary profile={profile} onEdit={() => setShowGoalModal(true)} />
        </>
      ) : (
        <div className="bg-card rounded-2xl shadow-md p-6 text-center space-y-4">
          <p className="text-4xl">📝</p>
          <div>
            <p className="font-black text-primary text-lg">Get your personalised study plan</p>
            <p className="text-secondary text-sm mt-1 leading-relaxed">Answer 10 questions and we'll build a plan around your weak areas.</p>
          </div>
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
          <Link href="/diagnostic" className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center">
            Take the diagnostic →
          </Link>
        </div>
      )}
    </div>
  )
}