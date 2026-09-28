'use client'
// src/app/student/leaderboard/page.js — v6
// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard: National | My School, the time period, last week's champions
// and the rankings table.
//
// Data: /api/leaderboard/{national|school} (lib/leaderboard/server.js) through
// useBoard (cached on the device, refreshed in the background) and
// useChampions. Signed-in students get `me` back with their true rank even
// outside the top 20. Guests see the national board and a sign-up row.
//
// Layout (leaderboard.module.css): desktop has the title on the left and the
// scope + period controls on the right, above the champions; phones put the
// period tabs under the champions.
//
// v6: new design. Scope is a two-button toggle; the champions hero shows last
//     week only (older weeks: the Hall of Champions page).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudentUser, useUpdateStudentProfile } from '@/app/student/layout'
import JoinSchool from '@/components/student/JoinSchool'
import { Sheet } from '@/components/student/profile/sheets'
import {
  ChampionsHero, PeriodTabs, ScopeToggle, Board, InviteBanner, styles as s,
} from '@/components/student/leaderboard/LeaderboardSections'
import { useBoard, useChampions } from '@/components/student/leaderboard/useLeaderboard'
import { periodWindow, formatWindow } from '@/lib/leaderboard/periods'

const CHAMPIONS_WEEKS_AGO = 1   // the champions are last week's, a finished week

export default function LeaderboardPage() {
  const router  = useRouter()
  const profile = useStudentUser()
  const updateLayoutProfile = useUpdateStudentProfile()
  const ready   = profile !== null
  const isGuest = !!profile?.isGuest
  const userId  = profile?.id ?? null

  // ── School link (can change on this page via the join sheet) ──────────────
  const [linked, setLinked] = useState(null)
  const schoolId  = linked?.school_id ?? profile?.school_id ?? null
  const hasSchool = !isGuest && !!schoolId

  const [scope,   setScope]   = useState('national')
  const [period,  setPeriod]  = useState('week')
  const [joining, setJoining] = useState(false)

  const board     = useBoard({ scope, period, userId, ready, enabled: scope !== 'school' || hasSchool })
  const champions = useChampions(CHAMPIONS_WEEKS_AGO, ready)
  const schoolName = board.school_name ?? linked?.school_name ?? profile?.school_name ?? null

  const dateLabel = useMemo(() => formatWindow(periodWindow('week', { weeksAgo: CHAMPIONS_WEEKS_AGO })), [])

  // 'join': "My School" without a linked school.
  const onScope = useCallback(value => {
    if (value !== 'join') return setScope(value)
    if (isGuest) router.push('/onboarding?mode=signup')
    else setJoining(true)
  }, [isGuest, router])

  function onLinked(patch) {
    setLinked(patch)
    updateLayoutProfile(patch)
    setJoining(false)
    setScope('school')
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1 className={s.title}>Leaderboard</h1>
        <p className={s.subtitle}>
          {scope === 'school' && schoolName ? `Compete with students at ${schoolName}` : 'Compete with students across Nigeria'}
        </p>
      </header>

      <div className={s.scopeArea}>
        <ScopeToggle scope={scope} hasSchool={hasSchool} onChange={onScope} />
      </div>

      <div className={s.periodArea}>
        <PeriodTabs period={period} onChange={setPeriod} />
      </div>

      <ChampionsHero dateLabel={dateLabel} entries={champions.entries} loading={!ready || champions.loading} />

      <Board
        board={board.leaderboard}
        me={board.me}
        isGuest={isGuest}
        scope={scope}
        period={period}
        loading={!ready || board.loading}
        error={board.error}
        fallback={board.fallback}
        onRetry={board.retry}
        emptyText={scope === 'school' ? 'Be the first in your school to earn XP.' : 'Start practising to appear here.'}
      />

      <InviteBanner />

      {joining && (
        <Sheet title="Connect your school" onClose={() => setJoining(false)}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-sec)', margin: '0 0 16px' }}>
            Enter the code from your teacher to see your school’s leaderboard and share your progress with them.
          </p>
          <JoinSchool profile={profile} onLinked={onLinked} compact />
        </Sheet>
      )}
    </div>
  )
}
