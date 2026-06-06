'use client'
// src/app/student/learn/LearnPage.jsx

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMasteryLevel } from '@/lib/theme'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import { StudyPlanPreview } from '@/components/ui/StudyPlanCard'
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

// ── Subject colour map ─────────────────────────────────────────────────────────
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

// ── Subject SVG icons ─────────────────────────────────────────────────────────
function SubjectIcon({ name, color, size = 20 }) {
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

// ── Subject card — full dark mode support ─────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completed, total, isDark }) {
  const s = getSubjectStyle(subject.name)

  const headerBg    = isDark ? s.darkBg   : s.bg
  const nameColor   = isDark ? s.darkText : s.text
  const iconBg      = isDark ? `${s.accent}22` : `${s.accent}18`
  const footerBg    = isDark ? '#1f2937'  : '#ffffff'
  const trackColor  = isDark ? '#374151'  : '#f1f5f9'
  const borderColor = isDark ? `${s.accent}30` : `${s.accent}25`
  const pctColor    = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : isDark ? '#6b7280' : '#9ca3af'
  const metaColor   = isDark ? '#6b7280' : '#9ca3af'

  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
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
            <SubjectIcon name={subject.name} color={nameColor} size={18} />
          </div>
          <span style={{ fontSize: 16 }}>{mastery.emoji}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 900, color: nameColor, lineHeight: 1.3 }}>{subject.name}</p>
      </div>

      {/* Progress footer */}
      <div style={{ background: footerBg, padding: '10px 14px 12px' }}>
        <div style={{ height: 5, background: trackColor, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 99, background: s.accent, width: `${pct}%`, transition: 'width 0.7s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: metaColor }}>{completed}/{total} topics</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: pctColor }}>{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router   = useRouter()
  const isDark   = useIsDark()
  const supabase = useMemo(() => createClient(), [])

  const [profile,       setProfile]      = useState(null)
  const [subjectList,   setSubjectList]  = useState([])
  const [completedIds,  setCompletedIds] = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)

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
    setSubjectList((paths ?? []).map(p => p.subjects).filter(Boolean))
    setLoading(false)
  }

  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      const path      = learningPaths.find(p => p.subject_id === subject.id)
      const ids       = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, pct, mastery: getMasteryLevel(pct), completed, total }
    })
  }, [subjectList, learningPaths, completedIds])

  if (loading) return <LearnHubSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6 pb-28">

      {/* Header */}
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

      {/* Study Plan — shared widget from StudyPlanCard */}
      <StudyPlanPreview />

      {/* Subject cards */}
      {subjectProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-primary">Your Subjects</p>
            <span className="text-xs text-tertiary">
              {subjectProgress.length} subject{subjectProgress.length !== 1 ? 's' : ''}
            </span>
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
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {/* No subjects yet */}
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

      {/* Goal modal */}
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