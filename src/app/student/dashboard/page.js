'use client'
// src/app/student/dashboard/page.js

import { useState, useEffect, memo, Suspense, lazy, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getMasteryLevel } from '@/lib/theme'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import { StudyPlanSection } from '@/components/ui/StudyPlanCard'
import { TargetsSummary } from '@/components/dashboard/TargetsSummary'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ── Dark mode hook ────────────────────────────────────────────────────────────
function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ── Subject colour map ────────────────────────────────────────────────────────
const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6', darkBg: '#172554', darkText: '#93c5fd' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9', darkBg: '#0c4a6e', darkText: '#7dd3fc' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7', darkBg: '#3b0764', darkText: '#d8b4fe' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4', darkBg: '#083344', darkText: '#67e8f9' },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e', darkBg: '#052e16', darkText: '#86efac' },
  'Biology':               { bg: '#ecfdf5', text: '#047857', accent: '#10b981', darkBg: '#022c22', darkText: '#6ee7b7' },
  'Economics':             { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b', darkBg: '#451a03', darkText: '#fcd34d' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c', accent: '#ef4444', darkBg: '#450a0a', darkText: '#fca5a5' },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d', accent: '#ec4899', darkBg: '#500724', darkText: '#f9a8d4' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6', darkBg: '#042f2e', darkText: '#5eead4' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16', darkBg: '#1a2e05', darkText: '#bef264' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', darkBg: '#1e1b4b', darkText: '#a5b4fc' },
  'default':               { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', darkBg: '#1e1b4b', darkText: '#a5b4fc' },
}
function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(firstName, streak) {
  const hour = new Date().getHours()
  const name = firstName ? `, ${firstName}` : ''
  if (streak >= 7) return { pre: `${streak}-day streak 🔥`, main: `Keep it going${name}!` }
  if (streak >= 3) return { pre: 'Building momentum',       main: `Great work${name} 💪` }
  if (hour < 12)   return { pre: 'Good morning',            main: `Ready to learn${name}? ☀️` }
  if (hour < 17)   return { pre: 'Good afternoon',          main: `Let's make progress${name} 📚` }
  return                   { pre: 'Good evening',            main: `Keep pushing${name} 🌙` }
}

// ── Subject SVG icons ─────────────────────────────────────────────────────────
function SubjectSVGIcon({ name, size = 18, color }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    'Mathematics':         <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M18 4H6l6 8-6 8h12"/></svg>,
    'Further Mathematics': <svg width={size} height={size} viewBox="0 0 24 24" {...s}><line x1="6" y1="4" x2="18" y2="4"/><line x1="9" y1="4" x2="9" y2="20"/><path d="M15 4v10a2 2 0 002 2"/></svg>,
    'Physics':             <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2" fill={color} stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(120 12 12)"/></svg>,
    'Chemistry':           <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M9 3h6"/><path d="M10 3v5.5L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-2.9L14 8.5V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>,
    'Biology':             <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M7 3s3.5 3 3.5 9S7 21 7 21"/><path d="M17 3s-3.5 3-3.5 9 3.5 9 3.5 9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
    'Economics':           <svg width={size} height={size} viewBox="0 0 24 24" {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    'Government':          <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    'English Language':    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  }
  return icons[name] ?? (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}>
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  )
}

// ── Goal banner ───────────────────────────────────────────────────────────────
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

// ── Subject card — full dark mode support ─────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub, isDark }) {
  const name    = sub.subjects?.name ?? ''
  const s       = getSubjectStyle(name)
  const mastery = getMasteryLevel(sub.pct ?? 0)
  const pct     = sub.pct ?? 0

  const headerBg   = isDark ? s.darkBg  : s.bg
  const nameColor  = isDark ? s.darkText : s.text
  const iconBg     = isDark ? `${s.accent}22` : `${s.accent}18`
  const footerBg   = isDark ? '#1f2937' : '#ffffff'
  const trackColor = isDark ? '#374151' : '#f1f5f9'
  const pctColor   = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : isDark ? '#6b7280' : '#9ca3af'
  const metaColor  = isDark ? '#6b7280' : '#9ca3af'
  const borderColor = isDark ? `${s.accent}30` : `${s.accent}25`

  return (
    <Link
      href={`/student/subjects/${sub.subjects?.slug}`}
      className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-all"
      style={{ border: `1.5px solid ${borderColor}`, boxShadow: `0 2px 8px ${s.accent}15` }}
    >
      {/* Coloured top band */}
      <div style={{ background: headerBg, padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <SubjectSVGIcon name={name} size={18} color={nameColor} />
          </div>
          <span style={{ fontSize: 16 }}>{mastery.emoji}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 900, color: nameColor, lineHeight: 1.3 }}>{name}</p>
      </div>

      {/* Progress footer */}
      <div style={{ background: footerBg, padding: '10px 14px 12px' }}>
        <div style={{ height: 5, background: trackColor, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 99, background: s.accent, width: `${pct}%`, transition: 'width 0.7s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: metaColor }}>{sub.completed ?? 0}/{sub.total ?? 0} topics</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: pctColor }}>{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ── Practice Hub ──────────────────────────────────────────────────────────────
const PracticeHub = memo(function PracticeHub() {
  const modes = [
    {
      id: 'timed', label: 'Timed Practice', desc: 'Countdown timer, mixed topics',
      href: '/student/practice?mode=timed', gradient: 'from-indigo-500 to-indigo-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
    },
    {
      id: 'topic', label: 'Topic Quiz', desc: 'Focus on one area',
      href: '/student/practice?mode=topic', gradient: 'from-violet-500 to-purple-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
    },
    {
      id: 'mock', label: 'Mock Exam', desc: 'Full exam simulation',
      href: '/student/practice?mode=mock', gradient: 'from-rose-500 to-red-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-primary">Practice HQ</p>
        <Link href="/student/practice" className="text-xs font-bold text-indigo-500 hover:underline">All modes →</Link>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none sm:hidden">
        {modes.map(m => (
          <Link key={m.id} href={m.href}
            className="flex-shrink-0 w-[58vw] max-w-[200px] bg-card rounded-2xl border border-default p-4 hover:shadow-md active:scale-[0.97] transition-all"
            style={{ scrollSnapAlign: 'start' }}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-3`}>
              {m.icon}
            </div>
            <p className="text-sm font-black text-primary">{m.label}</p>
            <p className="text-xs text-secondary mt-0.5 leading-snug">{m.desc}</p>
            <span className="inline-block mt-3 text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
          </Link>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {modes.map(m => (
          <Link key={m.id} href={m.href}
            className="flex flex-col gap-3 bg-card rounded-2xl border border-default p-4 hover:shadow-md transition-all active:scale-[0.98]">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center`}>
              {m.icon}
            </div>
            <div>
              <p className="text-sm font-black text-primary">{m.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{m.desc}</p>
            </div>
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
          </Link>
        ))}
      </div>
    </div>
  )
})

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const isDark   = useIsDark()

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

      {/* Greeting + streak */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-secondary font-medium">{greeting.pre}</p>
          <h1 className="text-2xl font-black text-primary leading-tight">{greeting.main}</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 dark:bg-amber-500 flex-shrink-0">
            <span className="text-base leading-none">🔥</span>
            <span className="text-sm font-black text-white tabular-nums">{streak}</span>
          </div>
        )}
      </div>

      <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />

      {hasPath ? (
        <>
          {/* Study Plan — uses shared StudyPlanCard component */}
          <StudyPlanSection />

          {/* Practice Hub */}
          <PracticeHub />

          {/* Subject cards */}
          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(sub => (
                  <SubjectCard key={sub.subject_id} sub={sub} isDark={isDark} />
                ))}
              </div>
            </div>
          )}

          {/* Targets */}
          <TargetsSummary profile={profile} onEdit={() => setShowGoalModal(true)} isDark={isDark} />
        </>
      ) : (
        /* No learning path yet */
        <div className="bg-card rounded-2xl border border-default p-6 text-center space-y-4">
          <p className="text-4xl">📝</p>
          <div>
            <p className="font-black text-primary text-lg">Get your personalised study plan</p>
            <p className="text-secondary text-sm mt-1 leading-relaxed">
              Answer 10 questions and we'll build a plan around your weak areas.
            </p>
          </div>
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
          <Link href="/diagnostic"
            className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center transition-opacity">
            Take the diagnostic →
          </Link>
        </div>
      )}

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