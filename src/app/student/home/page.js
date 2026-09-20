'use client'
// src/app/student/home/page.js — v5
// Clean, game-like home. Battle section added. Mascot free-floating. No mascot in cards.

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { Baloo_2 }             from 'next/font/google'
import { usePoints }           from '@/contexts/PointsContext'
import { useTheme }            from '@/contexts/ThemeContext'
import { useStudentUser }      from '@/app/student/layout'
import { readWeeklyActivity, readLocalStreak } from '@/lib/localSessionSync'
import BattleEntryCard from '@/components/battle/BattleEntryCard'

const baloo = Baloo_2({ subsets: ['latin'], weight: ['800'], display: 'swap' })

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const RED    = '#EF4444'
const PURPLE = '#7C3AED'

const BOARD_KEY = 'ep_lb_national_week'
const BOARD_TTL = 2 * 60 * 1000

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

const GREETINGS = [
  { em: "let's practice!",  sub: "5 minutes. Let's go.",  subIcon: "🔥" },
  { em: "let's level up!",  sub: "Every question counts.", subIcon: "⚡" },
  { em: "crush it today!",  sub: "You've got what it takes.", subIcon: "💪" },
  { em: "let's go again!",  sub: "Consistency wins exams.", subIcon: "🎯" },
  { em: "show out today!",  sub: "Your goals are waiting.", subIcon: "🚀" },
]


// ─── LAYOUT GRID ─────────────────────────────────────────────────────────────
function PageGrid({ left, right }) {
  return (
    <>
      <style>{`
        .hg { display: flex; flex-direction: column; gap: 18px }
        @media (min-width: 1024px) {
          .hg { display: grid; grid-template-columns: 1fr 272px; gap: 22px; align-items: start }
        }
      `}</style>
      <div className="hg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{left}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{right}</div>
      </div>
    </>
  )
}


// ─── HERO ─────────────────────────────────────────────────────────────────────
// Reference design: "[Name], let's practice!" large bold + sparkles, no card.
// Sub-line small below. Mascot top-right, large. Below: compact CTA card.
function Hero({ name }) {
  const g = GREETINGS[Math.floor(Date.now() / 86400000) % GREETINGS.length]

  return (
    <div>
      {/* ── Greeting area — no card, lives on page background ── */}
      <div style={{ position: 'relative', minHeight: 140, paddingRight: 200 }}>

        {/* Mascot — large, top-right, free-floating */}
        <div style={{ position: 'absolute', right: -8, top: -16, width: 190, zIndex: 3, pointerEvents: 'none' }}>
          <img
            src="/images/zara_studybuddy.png"
            alt=""
            style={{ width: '100%', display: 'block', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.2))' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Greeting text */}
        <div style={{ paddingTop: 16, position: 'relative', zIndex: 2 }}>
          {/* Main headline: "[Name], let's practice!" — Baloo 2 ExtraBold, playfully distorted */}
          <div className={baloo.className} style={{
            fontSize: 'clamp(26px, 5vw, 38px)',
            fontWeight: 800,
            lineHeight: 1.08,
            marginBottom: 10,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 5px',
          }}>
            {/* Sparkle left — wobbles */}
            <span style={{
              fontSize: 'clamp(16px, 3vw, 22px)', color: GOLD, marginRight: 2,
              display: 'inline-block',
              transform: 'rotate(-15deg) scale(1.1)',
            }}>✦</span>

            {/* Name — slight upward tilt */}
            <span style={{
              color: NAVY,
              display: 'inline-block',
              transform: 'rotate(-1.5deg) skewX(-3deg)',
              transformOrigin: 'bottom left',
            }}>{name},</span>

            {/* Playful phrase — squish + tilt the other way */}
            <span style={{
              color: BLUE,
              display: 'inline-block',
              transform: 'rotate(1deg) skewX(2deg) scaleY(1.04)',
              transformOrigin: 'bottom left',
            }}>{g.em}</span>

            {/* Sparkle right */}
            <span style={{
              fontSize: 'clamp(13px, 2.5vw, 17px)', color: GOLD, marginLeft: 2,
              display: 'inline-block',
              transform: 'rotate(20deg) scale(1.15)',
            }}>✦</span>
          </div>

          {/* Sub-line */}
          <div style={{
            fontSize: 'clamp(13px, 2vw, 16px)',
            fontWeight: 700,
            color: 'var(--text-sec)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{g.sub}</span>
            <span>{g.subIcon}</span>
          </div>
        </div>
      </div>

      {/* ── Compact CTA card — button only ── */}
      <div style={{ marginTop: 22 }}>
        <Link href="/student/practice" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${NAVY} 0%, #0d2464 60%, #162878 100%)`,
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: `0 6px 0 rgba(6,42,120,.28), 0 10px 24px rgba(6,42,120,.18)`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom,rgba(255,255,255,.08),transparent)', pointerEvents: 'none', borderRadius: '20px 20px 0 0' }}/>
            {/* Stars */}
            {[[GOLD,'10%','6%',8],[BLUE,'78%','16%',6],['#4A9EF8','38%','90%',5]].map(([c,t,l,fs],i)=>(
              <div key={i} style={{ position:'absolute', top:t, left:l, fontSize:fs, color:c, opacity:.35, pointerEvents:'none' }}>✦</div>
            ))}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.12em' }}>READY TO GO?</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>Start Practising Now</div>
            </div>
            <div style={{
              position: 'relative', zIndex: 1, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 7,
              background: BLUE, borderRadius: 13, padding: '11px 18px',
              boxShadow: '0 4px 0 rgba(10,54,180,.45)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>Go →</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
// ─── BATTLE SECTION ───────────────────────────────────────────────────────────
// Mirrors the battle page aesthetic — VS scoreboard, sky bg, game feel
function BattleCard() {
  return (
    <Link href="/student/battle" style={{ textDecoration: 'none', display: 'block' }}>
      <BattleEntryCard />
    </Link>
  )
}



// ─── EXAM TARGETS ─────────────────────────────────────────────────────────────
function ExamTargets({ profile }) {
  const goals = (() => {
    try { return JSON.parse(localStorage.getItem('ep_goals') || '{}') } catch { return {} }
  })()

  const university = goals.university  || profile?.target_university || null
  const course     = goals.course      || profile?.target_course     || null
  const targetJamb = goals.target_jamb || profile?.target_jamb       || null

  const rawWaec    = goals.target_waec || profile?.target_waec || null
  const waecGrades = rawWaec && typeof rawWaec === 'object' && !Array.isArray(rawWaec)
    ? Object.entries(rawWaec).filter(([, v]) => v) : []

  const allEmpty = !university && !course && !targetJamb && !waecGrades.length

  function gradeColor(g = '') {
    const l = g.toUpperCase()
    if (l.startsWith('A')) return GREEN
    if (l.startsWith('B')) return BLUE
    if (l.startsWith('C')) return ORANGE
    return RED
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>
          Exam Targets
        </span>
        <Link href="/student/profile" style={{ fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>Edit →</Link>
      </div>

      {allEmpty ? (
        <div style={{ borderRadius: 18, border: `1.5px dashed ${ORANGE}35`, background: `${ORANGE}05`, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🎯</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 4 }}>Set your targets</div>
          <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.6, marginBottom: 14 }}>
            Add your dream university, course, and grade targets.
          </div>
          <Link href="/student/profile" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-block', padding: '9px 18px', borderRadius: 11, background: BLUE, color: '#fff', fontSize: 12, fontWeight: 800 }}>
              Add targets →
            </div>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {(university || course) && (
            <div style={{ display: 'grid', gridTemplateColumns: university && course ? '1fr 1fr' : '1fr', gap: 9 }}>
              {university && (
                <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 5 }}>University</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1.3 }}>{university}</div>
                </div>
              )}
              {course && (
                <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 5 }}>Course</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1.3 }}>{course}</div>
                </div>
              )}
            </div>
          )}
          {targetJamb && (
            <div style={{ borderRadius: 16, background: `${BLUE}07`, border: `1px solid ${BLUE}18`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-sec)' }}>JAMB target</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: BLUE, letterSpacing: '-.02em' }}>{targetJamb}</span>
            </div>
          )}
          {waecGrades.length > 0 && (
            <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 10 }}>WAEC targets</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {waecGrades.map(([subj, grade]) => (
                  <div key={subj} style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 10, background: `${gradeColor(grade)}10`, border: `1px solid ${gradeColor(grade)}28`, padding: '5px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sec)' }}>{subj}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: gradeColor(grade) }}>{grade}</span>
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
function PracticeActivity({ activity, streak }) {
  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const max  = Math.max(...activity, 1)
  const today = new Date().getDay()
  const todayIdx = today === 0 ? 6 : today - 1

  const total = activity.reduce((s, v) => s + v, 0)

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>This Week</span>
        <Link href="/student/progress" style={{ fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>Progress →</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 52 }}>
        {activity.map((v, i) => {
          const isToday = i === todayIdx
          const pct = v / max
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', borderRadius: 5,
                height: Math.max(4, pct * 44),
                background: isToday ? ORANGE : BLUE,
                opacity: isToday ? 1 : v > 0 ? 0.5 : 0.1,
                transition: 'height .3s ease',
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? ORANGE : 'var(--text-tert)' }}>{DAYS[i]}</span>
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
function LeaderboardSnap({ board, myId }) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: '18px 20px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>Leaderboard</span>
        <Link href="/student/leaderboard" style={{ fontSize: 11, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>See all →</Link>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 14 }}>
        National · this week
      </div>

      {!board.length ? (
        <div style={{ textAlign: 'center', padding: '18px 0 14px' }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🏆</div>
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
              {(entry.name || 'S').charAt(0)}
            </div>
            <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 600, color: isMe ? BLUE : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isMe ? 'You' : entry.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: isMe ? BLUE : 'var(--text-tert)', flexShrink: 0 }}>
              {(entry.xp || 0).toLocaleString()}
            </span>
          </div>
        )
      })}
      <div style={{ height: 12 }} />
    </div>
  )
}


// ─── GUEST NUDGE ─────────────────────────────────────────────────────────────
function GuestNudge() {
  return (
    <div style={{ borderRadius: 18, background: `${BLUE}07`, border: `1px solid ${BLUE}18`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 26, flexShrink: 0 }}>☁️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 3 }}>Back up your progress</div>
        <div style={{ fontSize: 12, color: 'var(--text-tert)', lineHeight: 1.55, marginBottom: 12 }}>
          You're practising as a guest. Create a free account to save your XP and streak.
        </div>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 10, background: BLUE, color: '#fff', fontSize: 12, fontWeight: 800 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ borderRadius: 24, background: `linear-gradient(135deg,${NAVY},#0d2464)`, minHeight: 200, opacity: .65 }} />
      <div style={{ height: 90, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
      <div style={{ height: 120, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
    </div>
  )

  return (
    <PageGrid
      left={<>
        <Hero name={name} />
        <BattleCard />
        <ExamTargets profile={profile} />
      </>}
      right={<>
        {isGuest && <GuestNudge />}
        <PracticeActivity activity={activity} streak={streak} />
        <LeaderboardSnap board={board} myId={myId} />
      </>}
    />
  )
}