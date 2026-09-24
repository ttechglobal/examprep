'use client'
// src/app/student/leaderboard/page.js — v5
// ─────────────────────────────────────────────────────────────────────────────
// Weekly Champions carousel, period tabs, National / School picker, and the
// rankings table with the student's own row pinned on top.
//
// Data: /api/leaderboard/{national|school} (see lib/leaderboard/server.js).
// Signed-in students get `me` back with their true rank even outside the top
// 20. Guests see the national board and a sign-up prompt in their row.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStudentUser, useUpdateStudentProfile } from '@/app/student/layout'
import JoinSchool from '@/components/student/JoinSchool'
import { Sheet } from '@/components/student/profile/sheets'
import {
  ChampionsHero, PeriodTabs, ScopeSelect, Board, InviteBanner, styles as s,
} from '@/components/student/leaderboard/LeaderboardSections'
import { useBoard, useChampions } from '@/components/student/leaderboard/useLeaderboard'
import { periodWindow, formatWindow } from '@/lib/leaderboard/periods'

const CHAMPION_WEEKS = 4   // how far back the champions carousel goes

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

  const [scope,    setScope]    = useState('national')
  const [period,   setPeriod]   = useState('week')
  const [weeksAgo, setWeeksAgo] = useState(1)
  const [joining,  setJoining]  = useState(false)

  const board     = useBoard({ scope, period, userId, ready, enabled: scope !== 'school' || hasSchool })
  const champions = useChampions(weeksAgo, ready)
  const schoolName = board.school_name ?? linked?.school_name ?? profile?.school_name ?? null

  const dateLabel = useMemo(() => formatWindow(periodWindow('week', { weeksAgo })), [weeksAgo])

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

  const scopePicker = (
    <ScopeSelect scope={scope} schoolName={schoolName} hasSchool={hasSchool} onChange={onScope} />
  )

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.title}>Leaderboard</h1>
        <p className={s.subtitle}>
          {scope === 'school' && schoolName ? `Compete with students at ${schoolName}` : 'Compete with students across Nigeria'}
        </p>
        {scopePicker}
      </header>

      <ChampionsHero
        weeksAgo={weeksAgo}
        maxWeeksAgo={CHAMPION_WEEKS}
        onChange={w => setWeeksAgo(Math.min(Math.max(w, 1), CHAMPION_WEEKS))}
        dateLabel={dateLabel}
        entries={champions.entries}
        loading={!ready || champions.loading}
      />

      <div className={s.toolbar}>
        <PeriodTabs period={period} onChange={setPeriod} />
        {scopePicker}
      </div>

      <Board
        board={board.leaderboard}
        me={board.me}
        isGuest={isGuest}
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
