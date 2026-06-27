'use client'
// src/app/student/learn/LearnPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FULL FILE — adds a "Practice your way" quick-access row (Games + Video
// lessons) between the Study Plan preview and the Subject cards.
//
// Subject colour comes from resolveSubjectColors() in @/lib/subjectTheme,
// the canonical subject colour source, switched via the shared useIsDark
// hook from @/lib/useIsDark. Everything else is unchanged from the existing
// file: header, SubjectIcon, SubjectCard, data loading, subjectProgress
// memo, goal modal, FAB. Only addition is QuickAccessCard + GamesAndVideosRow
// and their call site in the main return.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMasteryLevel } from '@/lib/theme'
import { getGameTypeTheme } from '@/lib/gameTheme'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import { StudyPlanPreview } from '@/components/ui/StudyPlanCard'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import SubjectIcon from '@/components/ui/SubjectIcon'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ── Subject card — full dark mode support ─────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completed, total, isDark }) {
  const s = resolveSubjectColors(subject.name, isDark)

  const headerBg    = s.bg
  const nameColor   = s.text
  const iconBg      = isDark ? `${s.solid}22` : `${s.solid}18`
  const footerBg    = isDark ? '#1f2937'  : '#ffffff'
  const trackColor  = isDark ? '#374151'  : '#f1f5f9'
  const borderColor = isDark ? `${s.solid}30` : `${s.solid}25`
  const pctColor    = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : isDark ? '#6b7280' : '#9ca3af'
  const metaColor   = isDark ? '#6b7280' : '#9ca3af'

  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-all"
      style={{ border: `1.5px solid ${borderColor}`, boxShadow: `0 2px 8px ${s.solid}15` }}
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
          <div style={{ height: '100%', borderRadius: 99, background: s.solid, width: `${pct}%`, transition: 'width 0.7s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: metaColor }}>{completed}/{total} topics</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: pctColor }}>{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ── Quick access card — Games / Video lessons ────────────────────────────────
// Same visual weight as SubjectCard but laid out horizontally since there
// are only two of these, not a grid. Colour comes from gameTheme.js so the
// "Games" card always matches the colour students see again inside the
// Games hub itself (consistency of meaning across the app).
const QuickAccessCard = memo(function QuickAccessCard({ href, title, subtitle, emoji, solidColor, isDark }) {
  const cardBg     = isDark ? '#111827' : '#ffffff'
  const cardBorder = isDark ? '#1f2937' : '#ede9e3'

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl overflow-hidden active:scale-[0.97] transition-all"
      style={{
        background: cardBg,
        border: `1.5px solid ${cardBorder}`,
        boxShadow: isDark ? 'none' : `0 2px 8px ${solidColor}15`,
      }}
    >
      <div
        className="w-14 h-14 flex items-center justify-center flex-shrink-0 text-2xl"
        style={{ background: solidColor }}
      >
        {emoji}
      </div>
      <div className="flex-1 py-2 pr-2 min-w-0">
        <p className="text-sm font-black text-primary leading-snug">{title}</p>
        <p className="text-[11px] text-secondary mt-0.5 leading-snug">{subtitle}</p>
      </div>
      <svg className="w-4 h-4 text-tertiary flex-shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  )
})

// ── Games & Videos row ────────────────────────────────────────────────────────
// Sits between the Study Plan preview and Subject cards. Per product brief:
// past questions remain the focus of the hub, but Games and Video lessons
// should be one tap away from the hub itself, not buried inside topic pages.
const GamesAndVideosRow = memo(function GamesAndVideosRow({ isDark }) {
  const sortTheme  = getGameTypeTheme('sort_it')
  const matchTheme = getGameTypeTheme('connector')

  return (
    <div>
      <p className="text-sm font-black text-primary mb-3">Practice your way</p>
      <div className="grid grid-cols-1 gap-2.5">
        <QuickAccessCard
          href="/student/games"
          title="Games"
          subtitle="Sort, match and build your way to mastery"
          emoji="🎮"
          solidColor={isDark ? sortTheme.darkSolid : sortTheme.solid}
          isDark={isDark}
        />
        <QuickAccessCard
          href="/student/videos"
          title="Video lessons"
          subtitle="Watch short, focused lessons on any topic"
          emoji="🎬"
          solidColor={isDark ? matchTheme.darkSolid : matchTheme.solid}
          isDark={isDark}
        />
      </div>
    </div>
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

      {/* Games & Video lessons quick access — NEW */}
      <GamesAndVideosRow isDark={isDark} />

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
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-black rounded-xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
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