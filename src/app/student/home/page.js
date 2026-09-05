'use client'
// src/app/student/home/page.js — v4
// ─────────────────────────────────────────────────────────────────────────────
// Mascot-led hero (no level badge), daily challenge (no icon), real exam
// targets, activity synced with progress page, streak from readLocalStreak,
// leaderboard snippet synced with leaderboard page cache.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { usePoints }           from '@/contexts/PointsContext'
import { useTheme }            from '@/contexts/ThemeContext'
import { useStudentUser }      from '@/app/student/layout'
import DailyChallenge          from '@/components/student/DailyChallenge'
import { readWeeklyActivity, readLocalStreak } from '@/lib/localSessionSync'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'

const BOARD_KEY  = 'ep_lb_national_week'   // matches leaderboard page cache key
const BOARD_TTL  = 2 * 60 * 1000           // 2 minutes — same as leaderboard page

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

const GREETINGS = [
  { pre: 'Ready to',   em: 'practise?',    sub: 'Your goals are waiting.' },
  { pre: 'Let\'s go,', em: 'crush it.',     sub: 'Every question takes you closer.' },
  { pre: 'Back at it,',em: 'keep going.',   sub: 'Consistent effort is what separates you.' },
  { pre: 'Time to',    em: 'level up.',     sub: 'Sharpen your skills and crush your goals.' },
]


// ─── LAYOUT GRID ─────────────────────────────────────────────────────────────
function PageGrid({ left, right }) {
  return (
    <>
      <style>{`
        .hg { display: flex; flex-direction: column; gap: 20px }
        @media (min-width: 1024px) {
          .hg { display: grid; grid-template-columns: 1fr 272px; gap: 22px; align-items: start }
        }
      `}</style>
      <div className="hg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{left}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{right}</div>
      </div>
    </>
  )
}


// ─── HERO ─────────────────────────────────────────────────────────────────────
// Name lives in the headline — lighter weight so it doesn't compete.
// Greeting rotates daily across 4 variants.
function Hero({ name }) {
  const g = GREETINGS[Math.floor(Date.now() / 86400000) % GREETINGS.length]

  return (
    <Link href="/student/practice" style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        borderRadius: 24,
        background: `linear-gradient(135deg, ${NAVY} 0%, #0d2464 60%, #0e1e50 100%)`,
        overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'flex-end',
        minHeight: 224, cursor: 'pointer',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(18,100,229,.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 60% at 80% 100%, rgba(255,184,0,.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ flex: 1, padding: '36px 0 36px 32px', zIndex: 2 }}>
          {/* Name — light weight, sits above the main line */}
          <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.45)', letterSpacing: '.01em', marginBottom: 4 }}>
            {name},
          </div>
          {/* Headline — two lines, em in brand blue */}
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-.03em', marginBottom: 8 }}>
            {g.pre}<br />
            <span style={{ color: '#4A9EF8' }}>{g.em}</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.38)', fontWeight: 500, lineHeight: 1.55, marginBottom: 28 }}>
            {g.sub}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: BLUE, borderRadius: 14, padding: '13px 22px',
            boxShadow: '0 4px 16px rgba(18,100,229,.45)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>Practice Now</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
            </svg>
          </div>
        </div>

        <div style={{ width: 200, flexShrink: 0, alignSelf: 'flex-end', zIndex: 2 }}>
          <img
            src="/images/zara_studybuddy.png"
            alt="Zara your study buddy"
            style={{ width: '100%', display: 'block', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,.55))' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>
    </Link>
  )
}


// ─── EXAM TARGETS ─────────────────────────────────────────────────────────────
// Real goals: university, course, JAMB score, WAEC subject grades.
// Reads ep_goals from localStorage, falls back to profile columns.
function ExamTargets({ profile, exams }) {
  const goals = (() => {
    try { return JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch { return {} }
  })()

  const university = goals.university  || profile?.target_university || null
  const course     = goals.course      || profile?.target_course     || null
  const targetJamb = goals.target_jamb || profile?.target_jamb       || null

  // target_waec shape: { SubjectName: 'A1', Biology: 'B2', ... }
  const rawWaec    = goals.target_waec || profile?.target_waec || null
  const waecGrades = rawWaec && typeof rawWaec === 'object' && !Array.isArray(rawWaec)
    ? Object.entries(rawWaec).filter(([, v]) => v)
    : []

  const allEmpty = !university && !course && !targetJamb && !waecGrades.length

  function gradeColor(g = '') {
    const l = g.toUpperCase()
    if (l.startsWith('A')) return GREEN
    if (l.startsWith('B')) return BLUE
    if (l.startsWith('C')) return ORANGE
    return '#ef4444'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>
          Exam targets
        </span>
        <Link href="/student/profile" style={{ fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>Edit →</Link>
      </div>

      {allEmpty ? (
        <div style={{ borderRadius: 18, border: `1px dashed ${ORANGE}40`, background: `${ORANGE}06`, padding: '22px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 4 }}>Set your exam targets</div>
          <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.6, marginBottom: 14 }}>
            Add your dream university, course, and grade targets so we can focus your prep.
          </div>
          <Link href="/student/profile" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 11, background: BLUE, color: '#fff', fontSize: 12, fontWeight: 800 }}>
              Add targets →
            </div>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {(university || course) && (
            <div style={{ display: 'grid', gridTemplateColumns: university && course ? '1fr 1fr' : '1fr', gap: 10 }}>
              {university && (
                <div style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}18`, borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: BLUE, marginBottom: 6 }}>University</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1.3 }}>{university}</div>
                </div>
              )}
              {course && (
                <div style={{ background: `${PURPLE}08`, border: `1px solid ${PURPLE}18`, borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: PURPLE, marginBottom: 6 }}>Course</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1.3 }}>{course}</div>
                </div>
              )}
            </div>
          )}

          {targetJamb && (
            <div style={{ background: `${ORANGE}08`, border: `1px solid ${ORANGE}20`, borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${ORANGE}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: ORANGE, flexShrink: 0, letterSpacing: '.04em' }}>
                JAMB
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: ORANGE, marginBottom: 3 }}>JAMB target score</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.03em', lineHeight: 1 }}>{targetJamb}</div>
              </div>
            </div>
          )}

          {waecGrades.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 12 }}>
                WAEC target grades
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {waecGrades.map(([subject, grade]) => (
                  <div key={subject} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: `${gradeColor(grade)}0f`,
                    border: `1px solid ${gradeColor(grade)}28`,
                    borderRadius: 10, padding: '7px 12px',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sec)' }}>{subject}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: gradeColor(grade) }}>{grade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}


// ─── PRACTICE ACTIVITY ────────────────────────────────────────────────────────
// Synced with progress page — reads the same ep_activity localStorage key
// via readWeeklyActivity(). Streak reads ep_streak via readLocalStreak().
function PracticeActivity({ activity, streak }) {
  const days     = ['M','T','W','T','F','S','S']
  const todayIdx = (new Date().getDay() + 6) % 7
  const maxH     = Math.max(...activity, 1)
  const total    = activity.reduce((a, b) => a + b, 0)

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: '20px 20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', letterSpacing: '-.01em' }}>Practice activity</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)' }}>This week</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56, marginBottom: 8 }}>
        {days.map((d, i) => {
          const isToday = i === todayIdx
          const h = activity[i] > 0 ? Math.max(Math.round((activity[i] / maxH) * 48), 7) : 3
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0', height: h,
                background: isToday ? ORANGE : BLUE,
                opacity: isToday ? 1 : activity[i] > 0 ? 0.55 : 0.12,
                transition: 'height .3s ease',
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? ORANGE : 'var(--text-tert)', textTransform: 'uppercase' }}>{d}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 4 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginTop: 3 }}>Questions</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: streak > 0 ? ORANGE : 'var(--text-tert)', letterSpacing: '-.02em', lineHeight: 1 }}>
            {streak > 0 ? `${streak}🔥` : '—'}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginTop: 3 }}>Day streak</div>
        </div>
      </div>
    </div>
  )
}


// ─── LEADERBOARD SNIPPET ─────────────────────────────────────────────────────
// Reads from the same ep_leaderboard_cache key as the full leaderboard page.
// Background-fetches on stale, so it's always fresh without blocking render.
function LeaderboardSnap({ board, myId }) {
  const medals = ['🥇','🥈','🥉']

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: '20px 20px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)' }}>Leaderboard</span>
        <Link href="/student/leaderboard" style={{ fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>See all →</Link>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 14 }}>
        National · this week
      </div>

      {!board.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.6 }}>Practise to appear<br />on the board!</div>
        </div>
      ) : board.map((entry, i) => {
        const isMe = entry.student_id === myId
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: isMe ? '8px 8px' : '9px 6px',
            borderBottom: i < board.length - 1 ? '1px solid var(--border)' : 'none',
            background: isMe ? `${BLUE}0a` : 'transparent',
            borderRadius: isMe ? 11 : 0,
            margin: isMe ? '3px -8px' : 0,
          }}>
            <span style={{ fontSize: i < 3 ? 14 : 11, width: 20, textAlign: 'center', flexShrink: 0, fontWeight: 800, color: i < 3 ? 'inherit' : 'var(--text-tert)' }}>
              {i < 3 ? medals[i] : i + 1}
            </span>
            <div style={{ width: 27, height: 27, borderRadius: '50%', flexShrink: 0, background: isMe ? BLUE : `${BLUE}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: isMe ? '#fff' : BLUE }}>
              {(entry.first_name || '?').charAt(0)}
            </div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 600, color: isMe ? BLUE : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isMe ? 'You' : entry.first_name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: isMe ? BLUE : 'var(--text-tert)', flexShrink: 0 }}>
              {(entry.points || 0).toLocaleString()}
            </span>
          </div>
        )
      })}
      <div style={{ height: 16 }} />
    </div>
  )
}


// ─── GUEST NUDGE ─────────────────────────────────────────────────────────────
function GuestNudge() {
  return (
    <div style={{ borderRadius: 18, background: `${BLUE}07`, border: `1px solid ${BLUE}18`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>☁️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 4 }}>Back up your progress</div>
        <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.55, marginBottom: 12 }}>
          You're practising as a guest. Create a free account to save your XP and streak.
        </div>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 11, background: BLUE, color: '#fff', fontSize: 12, fontWeight: 800 }}>
            Create free account →
          </div>
        </Link>
      </div>
    </div>
  )
}


// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()

  const isGuest = !!profile?.isGuest
  const isReady = profile !== null

  const exams    = profile?.exam_types ?? (profile?.exams ? profile.exams : ['WAEC'])
  const activity = isReady ? readWeeklyActivity() : [0,0,0,0,0,0,0]
  const streak   = isReady ? readLocalStreak()    : 0

  const [board, setBoard] = useState([])
  const [myId,  setMyId]  = useState(null)

  useEffect(() => {
    if (!isReady || isGuest) return
    try {
      const cached = JSON.parse(localStorage.getItem(BOARD_KEY) || 'null')
      if (cached?.data?.length && (Date.now() - (cached.ts || 0)) < BOARD_TTL) {
        setBoard(cached.data); setMyId(cached.myId ?? null); return
      }
    } catch {}
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const res = await fetch('/api/leaderboard/national?limit=6&period=week')
        if (!res.ok) return
        const data = await res.json()
        const lb = data?.leaderboard ?? []
        setBoard(lb); setMyId(user.id)
        localStorage.setItem(BOARD_KEY, JSON.stringify({ data: lb, myId: user.id, ts: Date.now() }))
      } catch {}
    })()
  }, [isReady, isGuest])

  const name = cap(profile?.full_name?.split(' ')[0] || profile?.username || 'Student')

  if (!isReady) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ borderRadius: 24, background: `linear-gradient(135deg,${NAVY},#0d2464)`, minHeight: 224, opacity: .65 }} />
      <div style={{ height: 100, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
    </div>
  )

  return (
    <PageGrid
      left={<>
        <Hero name={name} />
        {isGuest && <GuestNudge />}
        <DailyChallenge profile={profile} />
        <ExamTargets profile={profile} exams={exams} />
      </>}
      right={<>
        <PracticeActivity activity={activity} streak={streak} />
        <LeaderboardSnap board={board} myId={myId} />
      </>}
    />
  )
}