'use client'
// src/app/student/home/page.js — v6
// ─────────────────────────────────────────────────────────────────────────────
// Student home: greeting, Practice / Battle cards, this week's activity,
// exam targets and the national leaderboard. Sections and styles live in
// components/student/home/.
//
// Data (nothing here blocks on the network):
//   profile   useStudentUser() — loaded once by the layout
//   XP        PointsContext
//   activity  useStudentActivity('week') — device + last server reply first,
//             refreshed in the background
//   board     useBoard() — same cache as the leaderboard page, so opening
//             either one fills the other
//
// v6: new design (image cards, day-named week chart, icon targets, avatar
//     leaderboard). The week and streak now come from the server for signed-in
//     students (they were device-only), the board reuses the leaderboard page's
//     cached hook instead of its own fetch + auth call, and "today" is the
//     Nigerian day.
// ─────────────────────────────────────────────────────────────────────────────

import { usePoints }          from '@/contexts/PointsContext'
import { useStudentUser }     from '@/app/student/layout'
import { useStudentActivity } from '@/hooks/useStudentActivity'
import { useBoard }           from '@/components/student/leaderboard/useLeaderboard'
import { appDay }             from '@/lib/dates'
import { Hero, ModeCards, ExamTargets, BoardCard, GuestNudge } from '@/components/student/home/HomeSections'
import WeekActivityCard from '@/components/student/WeekActivityCard'
import s from '@/components/student/home/home.module.css'

const cap = str => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

// Goals saved on this device win over the profile's (they're newer until synced).
function readTargets(profile) {
  let goals = {}
  try { goals = JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch {}
  const waec = goals.target_waec || profile?.target_waec
  return {
    university: goals.university  || profile?.target_university || null,
    course:     goals.course      || profile?.target_course     || null,
    jamb:       goals.target_jamb || profile?.target_jamb       || null,
    waec:       waec && typeof waec === 'object' && !Array.isArray(waec)
      ? Object.entries(waec).filter(([, grade]) => grade)
      : [],
  }
}

// Top three, plus the student's own row (at its real rank) when they're
// further down; otherwise the top four.
function boardRows(leaderboard, me) {
  const top = leaderboard.slice(0, 4)
  if (!me || top.some(r => r.is_me)) return top
  return [...leaderboard.slice(0, 3), { ...me, is_me: true }]
}

export default function HomePage() {
  const { totalPoints: xp } = usePoints()
  const profile = useStudentUser()
  const ready   = profile !== null
  const isGuest = !!profile?.isGuest
  const userId  = profile?.id ?? null

  const activity = useStudentActivity('week', { userId, isGuest, ready })
  const board    = useBoard({ scope: 'national', period: 'week', userId, ready })

  if (!ready) return <HomeSkeleton />

  const name = cap(profile.full_name?.split(' ')[0] || profile.username || 'Student')

  return (
    <div className={s.page}>
      <div className={s.main}>
        <Hero name={name} />
        <ModeCards />
        <ExamTargets {...readTargets(profile)} />
      </div>
      <div className={s.side}>
        {isGuest && <GuestNudge />}
        <div className={s.week}>
          <WeekActivityCard
            title="This Week" link={{ href: '/student/progress', label: 'Progress →' }}
            days={activity.days} today={appDay()}
            questions={activity.stats.questions} streak={activity.stats.streak} xp={xp || 0}
          />
        </div>
        <BoardCard rows={boardRows(board.leaderboard, board.me)} loading={board.loading} allTime={board.fallback} />
      </div>
    </div>
  )
}

function HomeSkeleton() {
  const block = height => ({ height, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true">
      <div style={{ height: 150 }} />
      <div style={block(156)} />
      <div style={block(156)} />
      <div style={block(200)} />
    </div>
  )
}
