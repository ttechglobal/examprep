'use client'
// src/app/student/dashboard/page.js
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES:
//   - WeeklyGoals removed entirely
//   - Section order: Greeting → GoalBanner → Study Plan → Practice Hub
//                   → Your Subjects → My Targets
//   - Greeting: motivational message that rotates based on time of day + streak
//   - Study Plan: fetches /api/student/study-plan directly (same as plan page)
//     shows real weak topics with subject label
//   - Practice Hub renamed from "Practice Hall"
//   - Your Subjects: added back after Practice Hub
//   - Points system: practice now awards points proportional to correct answers
//     (10 pts base + 1 pt per correct answer, capped at 50)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ── Greeting message ──────────────────────────────────────────────────────────
function getGreeting(firstName, streak) {
  const hour = new Date().getHours()
  const name = firstName ? `, ${firstName}` : ''

  if (streak >= 7)  return { pre: `${streak}-day streak 🔥`, main: `Keep it going${name}!` }
  if (streak >= 3)  return { pre: 'Building momentum', main: `Great work${name} 💪` }

  if (hour < 12) return { pre: 'Good morning', main: `Ready to learn${name}? ☀️` }
  if (hour < 17) return { pre: 'Good afternoon', main: `Let's make progress${name} 📚` }
  return { pre: 'Good evening', main: `Keep pushing${name} 🌙` }
}

// ── Subject SVG icons ──────────────────────────────────────────────────────────
function SubjectSVGIcon({ name, className = 'w-5 h-5' }) {
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
  const def = <svg className={className} viewBox="0 0 24 24" {...s}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
  return icons[name] ?? def
}

// ── Goal banner ────────────────────────────────────────────────────────────────
const GoalBanner = memo(function GoalBanner({ profile, onClick }) {
  if (profile?.goals_set) return null
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-sm">
      <span className="text-2xl">🎯</span>
      <div className="flex-1">
        <p className="font-black text-white text-sm">Set your exam goals</p>
        <p className="text-white/80 text-xs mt-0.5">Tell us your target — we'll personalise your plan</p>
      </div>
      <svg className="w-5 h-5 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  )
})

// ── Study Plan section ─────────────────────────────────────────────────────────
const StudyPlanSection = memo(function StudyPlanSection() {
  const STATUS_CONFIG = {
    weak:      { badge: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',     icon: '🎯', label: 'Needs work' },
    improving: { badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', icon: '📈', label: 'Improving' },
    untested:  { badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400', icon: '📖', label: 'New' },
    strong:    { badge: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',   icon: '✅', label: 'Strong' },
  }

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [hasAny,  setHasAny]  = useState(false)

  useEffect(() => {
    fetch('/api/student/study-plan')
      .then(r => r.json())
      .then(data => {
        setHasAny(data.hasAnyAttempts ?? false)
        const allItems = (data.items ?? []).filter(i => (i.accuracyPct ?? 0) < 90)

        // Interleave across subjects, max 4
        const bySubject = {}
        allItems.forEach(i => {
          if (!bySubject[i.subjectId]) bySubject[i.subjectId] = []
          bySubject[i.subjectId].push(i)
        })
        const order = { weak: 0, improving: 1, untested: 2, strong: 3 }
        Object.values(bySubject).forEach(arr =>
          arr.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2) || a.accuracyPct - b.accuracyPct)
        )
        const result = []
        const sids = Object.keys(bySubject)
        let round = 0
        while (result.length < 4 && round < 10) {
          let added = false
          for (const sid of sids) {
            if (result.length >= 4) break
            if (bySubject[sid][round]) { result.push(bySubject[sid][round]); added = true }
          }
          if (!added) break
          round++
        }
        setItems(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div>
          <p className="text-sm font-black text-primary">Study Plan</p>
          <p className="text-xs text-secondary mt-0.5">
            {loading ? '…' : items.length > 0
              ? `${items.length} topic${items.length !== 1 ? 's' : ''} to focus on`
              : 'Take a diagnostic to build your plan'}
          </p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:underline">
          See all →
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-default">
          {[1, 2].map(i => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-subtle animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-16 bg-subtle rounded animate-pulse" />
                <div className="h-4 w-44 bg-subtle rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasAny || items.length === 0 ? (
        <div className="px-5 py-6 text-center space-y-3">
          <p className="text-2xl">🎯</p>
          <div>
            <p className="text-sm font-bold text-primary">No plan yet</p>
            <p className="text-xs text-secondary mt-1 max-w-[200px] mx-auto leading-relaxed">
              Take the diagnostic so we can show you what to focus on.
            </p>
          </div>
          <Link href="/diagnostic"
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-default">
          {items.map((item, idx) => {
            const color = getSubjectColor(item.subjectName ?? '')
            const cfg   = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.untested
            const pct   = item.accuracyPct ?? 0
            return (
              <Link
                key={item.topicId ?? idx}
                href={`/student/study-plan/${item.topicId}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem('study_plan_topic', JSON.stringify({
                      topicId: item.topicId, topicName: item.topicName,
                      subjectName: item.subjectName, subjectId: item.subjectId,
                      examType: item.examType ?? 'WAEC',
                      attempts: item.attemptCount ?? 0,
                      correct: Math.round((pct / 100) * (item.attemptCount ?? 0)),
                      insightMessage: item.insightMessage,
                    }))
                  } catch {}
                }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors group"
              >
                <div className={`w-8 h-8 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-xs font-black ${color.text}`}>{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                      {item.subjectName}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-primary truncate">{item.topicName}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.attemptCount > 0 && (
                    <span className={`text-xs font-black tabular-nums ${
                      pct >= 70 ? 'text-green-600 dark:text-green-400'
                      : pct >= 50 ? 'text-amber-500' : 'text-red-500 dark:text-red-400'
                    }`}>{pct}%</span>
                  )}
                  <svg className="w-4 h-4 text-tertiary group-hover:text-indigo-400 transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            )
          })}
          <Link href="/student/study-plan"
            className="flex items-center justify-center gap-1 px-5 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-subtle transition-colors">
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

// ── Practice Hub ───────────────────────────────────────────────────────────────
const PracticeHub = memo(function PracticeHub() {
  const modes = [
    { id: 'timed', label: 'Timed Practice',  desc: 'Countdown timer, mixed questions', href: '/student/practice?mode=timed', gradient: 'from-indigo-500 to-indigo-600',
      icon: <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
    { id: 'topic', label: 'Topic Quiz',       desc: 'Focus on one topic', href: '/student/practice?mode=topic',  gradient: 'from-violet-500 to-violet-600',
      icon: <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
    { id: 'exam',  label: 'Exam Simulation',  desc: 'Full exam format, timed', href: '/student/practice?mode=exam',   gradient: 'from-rose-500 to-rose-600',
      icon: <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-primary">Practice Hub</p>
        <Link href="/student/practice" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="sm:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollSnapType: 'x mandatory' }}>
          {modes.map(mode => (
            <Link key={mode.id} href={mode.href}
              className="flex-shrink-0 w-[62vw] max-w-[220px] bg-card rounded-2xl shadow-sm p-4 hover:shadow-md active:scale-[0.97] transition-all"
              style={{ scrollSnapAlign: 'start' }}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                {mode.icon}
              </div>
              <p className="text-sm font-black text-primary">{mode.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{mode.desc}</p>
              <span className="inline-block mt-3 text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
            </Link>
          ))}
        </div>
      </div>
      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {modes.map(mode => (
          <Link key={mode.id} href={mode.href}
            className="flex flex-col gap-3 bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-sm`}>
              {mode.icon}
            </div>
            <div>
              <p className="text-sm font-black text-primary">{mode.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{mode.desc}</p>
            </div>
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
          </Link>
        ))}
      </div>
    </div>
  )
})

// ── Subject card ───────────────────────────────────────────────────────────────
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
          <p className={`text-xs font-black ${(sub.pct ?? 0) >= 70 ? 'text-green-600 dark:text-green-400' : (sub.pct ?? 0) >= 40 ? 'text-amber-500' : 'text-tertiary'}`}>
            {sub.pct ?? 0}%
          </p>
        </div>
      </div>
    </Link>
  )
})

// ── Targets summary ────────────────────────────────────────────────────────────
const TargetsSummary = memo(function TargetsSummary({ profile, onEdit }) {
  const waecGrades = profile?.waec_target_grades ?? {}
  const jambScores = profile?.jamb_target_scores ?? {}
  const hasWaec    = Object.keys(waecGrades).length > 0
  const hasJamb    = Boolean(profile?.jamb_total_target)
  const hasAny     = hasWaec || hasJamb || profile?.university_course || profile?.target_university

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="text-base">🎯</span>
          </div>
          <p className="text-sm font-black text-primary">My Targets</p>
        </div>
        <button onClick={onEdit}
          className="text-xs font-bold text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1">
          Edit
        </button>
      </div>
      {!hasAny ? (
        <div className="px-5 py-4 text-center space-y-2">
          <p className="text-xs text-secondary">No targets set yet</p>
          <button onClick={onEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-400 transition-colors">
            Set targets →
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          {(profile?.university_course || profile?.target_university) && (
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5">🎓</span>
              <div>
                {profile?.university_course && <p className="text-sm font-bold text-primary">{profile.university_course}</p>}
                {profile?.target_university  && <p className="text-xs text-secondary">{profile.target_university}</p>}
              </div>
            </div>
          )}
          {hasJamb && (
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5">📊</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium mb-1.5">JAMB target · {profile.jamb_total_target} total</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(jambScores).map(([sub, score]) => (
                    <span key={sub} className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg font-bold border border-indigo-200 dark:border-indigo-800">
                      {sub.slice(0, 4)} · {score}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {hasWaec && (
            <div className="flex items-start gap-2.5">
              <span className="text-base mt-0.5">📝</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tertiary font-medium mb-1.5">WAEC target grades</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(waecGrades).map(([sub, grade]) => {
                    const n = parseInt(grade.replace(/\D/g, '')) || 0
                    const gc = n <= 3
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : n <= 6
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                    return (
                      <span key={sub} className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${gc}`}>
                        {sub.slice(0, 5)} · {grade}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [streak,        setStreak]        = useState(0)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: streakData }, { data: paths }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      ])

      setProfile(prof)
      setStreak(streakData?.current_streak ?? 0)

      // Build subject progress
      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(path => {
        const ids       = path.ordered_subtopic_ids ?? []
        const total     = ids.length
        const completed = ids.filter(id => completedIds.has(id)).length
        const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
        return { subject_id: path.subject_id, subjects: path.subjects, total, completed, pct }
      })
      setSubjects(enriched)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName, streak)
  const hasPath   = subjects.length > 0

  return (
    <div className="space-y-6 pb-28">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-secondary font-medium">{greeting.pre}</p>
          <h1 className="text-2xl font-black text-primary leading-tight">{greeting.main}</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
            <span className="text-base leading-none">🔥</span>
            <span className="text-sm font-black text-amber-700 dark:text-amber-400 tabular-nums">{streak}</span>
          </div>
        )}
      </div>

      {/* ── Goal banner ────────────────────────────────────────────────────── */}
      <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />

      {hasPath ? (
        <>
          {/* ── 1. Study Plan ─────────────────────────────────────────────── */}
          <StudyPlanSection />

          {/* ── 2. Practice Hub ───────────────────────────────────────────── */}
          <PracticeHub />

          {/* ── 3. Your Subjects ──────────────────────────────────────────── */}
          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(sub => <SubjectCard key={sub.subject_id} sub={sub} />)}
              </div>
            </div>
          )}

          {/* ── 4. My Targets ─────────────────────────────────────────────── */}
          <TargetsSummary profile={profile} onEdit={() => setShowGoalModal(true)} />
        </>
      ) : (
        /* Onboarding CTA */
        <div className="bg-card rounded-2xl shadow-md p-6 text-center space-y-4">
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

      {/* ── Goal modal ─────────────────────────────────────────────────────── */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={(updated) => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }}
          />
        </Suspense>
      )}

      <PracticeHubFAB />
    </div>
  )
}