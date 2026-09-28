'use client'
// src/app/student/practice/page.js — v17
// ─────────────────────────────────────────────────────────────────────────────
// Practice: pick a way to practise, see recent sessions and this week's streak.
// Local-first: works for guests and signed-in students. The profile comes from
// the layout (useStudentUser); subjects resolve from the device cache first.
//
//   Hero · Topic Practice + Mock Exam cards · More Practice Modes (Quick 5,
//   Custom, Study) · Recent Sessions · Practice Streak
// Sections: components/student/practice/. The mode + subject picker is
// components/student/practice/PracticeSetupSheet.jsx.
//
// v17: setup sheet redesign. The sheet loads subjects per exam itself
//      (hooks/useExamSubjects), so this page no longer does. Mock always goes
//      to the exam chooser (it used to jump straight into the current exam).
//      Opening the sheet adds a history entry: the phone's Back closes it.
// v16: new design. The Battle card left this page (Battle has its own tab).
//      Recent Sessions shows topic, score bar and time (hooks/useRecentSessions);
//      the streak card is shared with Home. "Study Practice" opens Custom with
//      Study mode chosen. Speed Round stays in the sheet only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useStudentUser } from '@/app/student/layout'
import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { examSubjectNames } from '@/hooks/useExamSubjects'
import { appDay } from '@/lib/dates'
import { useStudentActivity } from '@/hooks/useStudentActivity'
import { useRecentSessions } from '@/hooks/useRecentSessions'
import WeekActivityCard from '@/components/student/WeekActivityCard'
import PracticeSetupSheet from '@/components/student/practice/PracticeSetupSheet'
import { PracticeHero, PrimaryModes, MoreModes, RecentSessions, NoSubjects } from '@/components/student/practice/PracticeSections'
import s from '@/components/student/practice/practice.module.css'

const RECENT_LIMIT = 3
const cap = str => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const router       = useRouter()
  const { dark }     = useTheme()
  const { totalPoints: xp } = usePoints()
  const searchParams = useSearchParams()

  // ── Profile: read from layout context (already handles guest + auth) ─────────
  const profile  = useStudentUser()
  const isGuest  = !!profile?.isGuest
  const isReady  = profile !== null  // layout has finished its auth check
  const userId   = profile?.id ?? null

  const activity = useStudentActivity('week', { userId, isGuest, ready: isReady })
  const recent   = useRecentSessions(RECENT_LIMIT, { userId, isGuest, ready: isReady })

  // The setup sheet: null, or { screen, sessionType }. Opening it adds one
  // browser-history entry, so the phone's Back button closes it instead of
  // leaving the page; starting from it replaces that entry.
  const [sheet, setSheet] = useState(null)

  const openSheet = useCallback((screen = 'modes', sessionType = 'practice') => {
    window.history.pushState(null, '', window.location.href)
    setSheet({ screen, sessionType })
  }, [])
  const closeSheet = useCallback(() => window.history.back(), [])

  useEffect(() => {
    const onPop = () => setSheet(null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Leaving from the sheet replaces its history entry, so Back from the next
  // screen returns to Practice, not to a closed sheet.
  const leaveTo = useCallback(path => { setSheet(null); router.replace(path) }, [router])

  function handleStart(config) {
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    leaveTo('/student/practice/session')
  }

  // Links into the sheet: ?modal=1 (e.g. "Practise again") and ?mode=…
  useEffect(() => {
    if (!isReady) return
    const MODE_PARAM = { speed: 'timed', custom: 'custom', quick5: 'quick5', topic: 'topic' }
    const mode = searchParams?.get('mode')
    if (mode === 'mock') { router.replace('/student/practice/mock'); return }
    if (MODE_PARAM[mode]) openSheet(MODE_PARAM[mode])
    else if (searchParams?.get('modal') === '1') openSheet('modes')
  }, [searchParams, isReady, openSheet, router])

  if (!isReady) return <PracticeSkeleton />

  const hasSubjects = examSubjectNames(profile, 'WAEC').length + examSubjectNames(profile, 'JAMB').length > 0
  const name = cap(profile.full_name?.split(' ')[0] || profile.username || 'Student')

  return (
    <div className={s.page}>
      <PracticeHero name={name} />

      {!hasSubjects ? (
        <NoSubjects isGuest={isGuest} />
      ) : (
        <>
          <PrimaryModes onTopic={() => openSheet('topic')} onMock={() => router.push('/student/practice/mock')} />
          <MoreModes
            onPick={key => (key === 'study' ? openSheet('custom', 'study') : openSheet(key))}
            onSeeAll={() => openSheet('modes')}
          />
          <div className={s.bottom}>
            <RecentSessions sessions={recent.sessions} loading={recent.loading} dark={dark} />
            <div className={s.streak}>
              <WeekActivityCard
                title="Practice Streak" link={{ href: '/student/progress', label: 'This Week' }}
                days={activity.days} today={appDay()}
                questions={activity.stats.questions} questionsLabel="Questions This Week"
                streak={activity.stats.streak} xp={xp || 0}
              />
            </div>
          </div>
        </>
      )}

      {sheet && (
        <PracticeSetupSheet
          profile={profile}
          initialScreen={sheet.screen}
          initialSessionType={sheet.sessionType}
          onStart={handleStart}
          onMock={() => leaveTo('/student/practice/mock')}
          onBattle={() => leaveTo('/student/battle')}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}

function PracticeSkeleton() {
  const block = height => ({ height, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true">
      <div style={{ height: 200 }} />
      <div style={block(156)} />
      <div style={block(156)} />
      <div style={block(120)} />
    </div>
  )
}
