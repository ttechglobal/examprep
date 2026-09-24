'use client'
// src/app/student/profile/page.js — v5
// ─────────────────────────────────────────────────────────────────────────────
// Profile page: hero, plan / career / parents cards, exams & subjects,
// activity, goals, settings.
//
// Profile data
//   useStudentUser() from the layout paints instantly (guest or Supabase).
//   The layout only selects core columns, so for signed-in students we also
//   GET /api/student/profile once for goals, plan, email and parent_email.
//   Every save is applied on top of both, and pushed back to the layout.
//
// Saves (unchanged from v4, see components/student/profile/sheets.jsx)
//   Auth users  → /api/student/profile PATCH or /api/student/subjects PATCH
//   Guest users → localStorage via setLocalProfile()
//
// ?setup=1 walks new students through name → exams & subjects, then home.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStudentUser, useUpdateStudentProfile } from '@/app/student/layout'
import { signOut } from '@/lib/auth/client'
import { nextSetupStep } from '@/lib/profileSetup'
import { useTheme }  from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import Link from 'next/link'

import {
  ProfileHero, PlanCard, FeatureCard, SubjectsCard, ActivityCard, GoalsCard,
  SettingsCard, Banner, ProfileSkeleton, styles as s,
} from '@/components/student/profile/ProfileSections'
import {
  InfoSheet, SubjectsSheet, GoalsSheet, PlansSheet, CareerSheet, ParentsSheet,
  LanguageSheet, AccountSheet, NotificationsSheet,
} from '@/components/student/profile/sheets'
import { useProfileActivity } from '@/components/student/profile/useProfileActivity'
import { getPlanStatus, goalsOf, activeExamsOf } from '@/components/student/profile/profileModel'

const NOTIFICATION_LABEL = { granted: 'On', denied: 'Blocked', default: 'Off', unsupported: 'Not available' }

export default function ProfilePage() {
  const router              = useRouter()
  const searchParams        = useSearchParams()
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const layoutProfile       = useStudentUser()
  const updateLayoutProfile = useUpdateStudentProfile()
  const { permission, subscribe } = usePushSubscription()

  // ── Profile = full server row ← layout profile ← this page's saves ─────────
  const [remote,  setRemote]  = useState(null)
  const [patches, setPatches] = useState({})
  const profile = useMemo(
    () => (layoutProfile ? { ...remote, ...layoutProfile, ...patches } : null),
    [remote, layoutProfile, patches],
  )
  const isGuest = !!profile?.isGuest
  const userId  = layoutProfile?.id

  useEffect(() => {
    if (!userId || layoutProfile?.isGuest) return
    let cancelled = false
    fetch('/api/student/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setRemote(data) })
      .catch(() => {})   // offline: goals fall back to the local ep_goals copy
    return () => { cancelled = true }
  }, [userId, layoutProfile?.isGuest])

  const patchProfile = useCallback(updates => {
    setPatches(p => ({ ...p, ...updates }))
    updateLayoutProfile(updates)
  }, [updateLayoutProfile])

  // ── Sheets + guided setup ─────────────────────────────────────────────────
  const [sheet, setSheet] = useState(null)
  const closeSheet = useCallback(() => setSheet(null), [])

  const setupMode = searchParams.get('setup') === '1'
  const [setupTick, setSetupTick] = useState(0)
  const handledTick = useRef(-1)

  useEffect(() => {
    if (!setupMode || !profile || sheet || handledTick.current === setupTick) return
    handledTick.current = setupTick
    const next = nextSetupStep(profile)
    if (next) setSheet({ type: next })
    else if (setupTick > 0) router.replace('/student/home')
  }, [setupMode, profile, sheet, setupTick, router])

  function saveAndContinue(updates) {
    patchProfile(updates)
    setSetupTick(t => t + 1)
  }

  // ── Activity ──────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState('week')
  const activity = useProfileActivity(period, { isGuest, ready: !!profile })

  async function logout() {
    await signOut()
    router.replace('/onboarding?mode=signin')
  }

  const notificationState = typeof window !== 'undefined' && !('Notification' in window)
    ? 'unsupported'
    : permission

  if (!profile) return <ProfileSkeleton />

  const setupStep = nextSetupStep(profile)
  const plan      = getPlanStatus(profile)
  const goals     = goalsOf(profile)
  const firstExam = activeExamsOf(profile)[0] ?? 'WAEC'

  return (
    <div className={s.page}>
      {setupStep && (
        <Banner
          title="Finish setting up your profile"
          body={setupStep === 'info'
            ? 'Add your name, then pick your exams and subjects.'
            : 'Pick your exams and subjects to start practising.'}
          action={
            <button type="button" className={s.primaryBtn} onClick={() => setSheet({ type: setupStep })}>
              {setupStep === 'info' ? 'Add your name' : 'Pick subjects'}
            </button>
          }
        />
      )}

      {isGuest && (
        <Banner
          tone="guest"
          title="Back up your progress"
          body="Create a free account to save your progress and use it on any device."
          action={<Link href="/onboarding?mode=signup" className={s.primaryBtn} style={{ textDecoration: 'none' }}>Create free account</Link>}
        />
      )}

      <ProfileHero profile={profile} xp={xp || 0} isGuest={isGuest} onEdit={() => setSheet({ type: 'info' })} />

      <div className={s.featureRow}>
        <PlanCard plan={plan} onSeePlans={() => setSheet({ type: 'plans' })} />
        <FeatureCard
          kind="career"
          title="Career Quest"
          text="Discover your strengths. Explore future careers."
          onOpen={() => setSheet({ type: 'career' })}
        />
        <FeatureCard
          kind="parents"
          title="Parents Report"
          text={profile.parent_email
            ? `Weekly reports go to ${profile.parent_email}.`
            : 'Send weekly progress reports to your parents.'}
          onOpen={() => setSheet({ type: 'parents' })}
        />
      </div>

      <div className={s.mainGrid}>
        <div className={s.mainCol}>
          <SubjectsCard
            profile={profile}
            defaultExam={firstExam}
            onViewAll={() => setSheet({ type: 'subjects' })}
            onOpenExam={exam => setSheet({ type: 'subjects', exam })}
          />
          <GoalsCard goals={goals} onEdit={focus => setSheet({ type: 'goals', focus })} />
        </div>

        <div className={s.mainCol}>
          <ActivityCard period={period} onPeriodChange={setPeriod} stats={activity.stats} loading={activity.loading} />
          <SettingsCard
            dark={dark}
            notifications={NOTIFICATION_LABEL[notificationState] ?? 'Off'}
            onAppearance={toggle}
            onNotifications={() => setSheet({ type: 'notifications' })}
            onLanguage={() => setSheet({ type: 'language' })}
            onAccount={() => setSheet({ type: 'account' })}
          />
        </div>
      </div>

      {/* ── Sheets ── */}
      {sheet?.type === 'info' && (
        <InfoSheet profile={profile} isGuest={isGuest} onClose={closeSheet} onSaved={saveAndContinue} />
      )}
      {sheet?.type === 'subjects' && (
        <SubjectsSheet key={sheet.exam ?? 'all'} profile={profile} isGuest={isGuest} initialExam={sheet.exam ?? null} onClose={closeSheet} onSaved={saveAndContinue} />
      )}
      {sheet?.type === 'goals' && (
        <GoalsSheet profile={profile} isGuest={isGuest} focus={sheet.focus ?? null} onClose={closeSheet} onSaved={patchProfile} />
      )}
      {sheet?.type === 'plans' && <PlansSheet plan={plan} onClose={closeSheet} />}
      {sheet?.type === 'career' && (
        <CareerSheet onClose={closeSheet} onSetGoals={() => setSheet({ type: 'goals', focus: 'university' })} />
      )}
      {sheet?.type === 'parents' && (
        <ParentsSheet profile={profile} isGuest={isGuest} onClose={closeSheet} onSaved={patchProfile} />
      )}
      {sheet?.type === 'notifications' && (
        <NotificationsSheet state={notificationState} onEnable={subscribe} onClose={closeSheet} />
      )}
      {sheet?.type === 'language' && <LanguageSheet onClose={closeSheet} />}
      {sheet?.type === 'account' && (
        <AccountSheet
          profile={profile}
          isGuest={isGuest}
          onClose={closeSheet}
          onLinked={patchProfile}
          onEditInfo={() => setSheet({ type: 'info' })}
          onLogout={logout}
        />
      )}
    </div>
  )
}
