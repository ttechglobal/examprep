'use client'
// src/app/student/dashboard/page.js
// Homepage = streak + today's practice + targets.
// Study plan and subject cards live in the Learn tab.
// Games accessible via persistent FAB.

import { useState, useEffect, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import { TargetsSummary } from '@/components/dashboard/TargetsSummary'
import { useIsDark } from '@/lib/useIsDark'
import TodaysPracticeCard from '@/components/dashboard/TodaysPracticeCard'
import StreakStrip from '@/components/dashboard/StreakStrip'
import GamesFAB from '@/components/dashboard/GamesFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

function getGreeting(firstName, streak) {
  const hour = new Date().getHours()
  const name = firstName ? `, ${firstName}` : ''
  if (streak >= 7) return { pre: `${streak}-day streak 🔥`, main: `Keep it going${name}!` }
  if (streak >= 3) return { pre: 'Building momentum',       main: `Great work${name} 💪` }
  if (hour < 12)   return { pre: 'Good morning',            main: `Ready for today's 10${name}?` }
  if (hour < 17)   return { pre: 'Good afternoon',          main: `Got a few minutes${name}?` }
  return                   { pre: 'Good evening',            main: `One more set before bed${name}?` }
}

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const isDark   = useIsDark()

  const [loading,        setLoading]        = useState(true)
  const [profile,        setProfile]        = useState(null)
  const [subjects,       setSubjects]       = useState([])
  const [streak,         setStreak]         = useState(0)
  const [practicedToday, setPracticedToday] = useState(false)
  const [showGoalModal,  setShowGoalModal]  = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: streakData }, { data: paths }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_streaks').select('current_streak, last_active_date').eq('student_id', user.id).maybeSingle(),
        supabase.from('student_learning_paths')
          .select('subject_id, subjects(id, name, slug, exam_type)')
          .eq('student_id', user.id),
      ])

      setProfile(prof)
      setStreak(streakData?.current_streak ?? 0)
      const today = new Date().toISOString().slice(0, 10)
      setPracticedToday(streakData?.last_active_date === today)
      setSubjects((paths ?? []).map(p => ({ subject_id: p.subject_id, subjects: p.subjects })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName, streak)

  return (
    <>
      <div className="space-y-5 pb-32">

        <div className="pt-1">
          <p className="text-xs text-secondary font-medium">{greeting.pre}</p>
          <h1 className="text-2xl font-black text-primary leading-tight">{greeting.main}</h1>
        </div>

        <StreakStrip streak={streak} practicedToday={practicedToday} />

        <TodaysPracticeCard profile={profile} subjects={subjects} />

        <TargetsSummary profile={profile} onEdit={() => setShowGoalModal(true)} isDark={isDark} />

        {showGoalModal && (
          <Suspense fallback={null}>
            <GoalModal
              profile={profile}
              onClose={() => setShowGoalModal(false)}
              onSave={(updated) => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }}
            />
          </Suspense>
        )}
      </div>

      <GamesFAB />
    </>
  )
}