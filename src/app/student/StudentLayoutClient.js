'use client'
// src/app/student/StudentLayoutClient.js — EXL Game Feel v2
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs v1:
//   • maxWidth 900 → 1280 on header + body wrapper — uses full desktop width
//   • Right aside 200px → 260px — more breathing room for leaderboard/target
//   • dash-grid right column 240px → 300px for wider screens
//   • Left sidebar still 220px (good as-is)
//   • Content area gains ~380px of previously wasted lateral space on 1440 screens
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { useUser } from '@/contexts/UserContext'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── App logo ──────────────────────────────────────────────────────────────────
function EXLLogo({ size = 30 }) {
  return (
    <img
      src="/images/examprep_logo.png"
      alt="ExamPrep A1"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

// ── SVG Nav icons ─────────────────────────────────────────────────────────────
const Icons = {
  Home: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M3 10L11 3L19 10V19H14.5V14H7.5V19H3V10Z"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  Practise: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.7" fill={active ? 'none' : 'none'}/>
      <path d="M9 8L15 11L9 14V8Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  Learn: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M11 3L3 8L11 13L19 8L11 3Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M6 11V17M16 11V17M6 17C6 17 8 19 11 19C14 19 16 17 16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  Leaderboard: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="13" width="4" height="7" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
      <rect x="9" y="9" width="4" height="11" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
      <rect x="16" y="5" width="4" height="15" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Progress: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M11 7V11L14 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  Profile: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
      <path d="M5 20C5 16.7 7.7 14 11 14C14.3 14 17 16.7 17 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  Exam: () => (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="2" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M7 7H15M7 11H15M7 15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

const DESKTOP_NAV = [
  { href: '/student/dashboard',    label: 'Home',        icon: 'Home',        accent: '#18B7F2', section: 'MAIN' },
  { href: '/student/practice',     label: 'Practise',    icon: 'Practise',    accent: '#9b7ae0', section: 'MAIN' },
  { href: '/student/learn',        label: 'Learn',       icon: 'Learn',       accent: '#4ade80', section: 'MAIN' },
  { href: '/student/community',    label: 'Leaderboard', icon: 'Leaderboard', accent: '#FFB800', section: 'MAIN' },
  { href: '/student/progress',     label: 'Progress',    icon: 'Progress',    accent: '#FF6A00', section: 'MAIN' },
  { href: '/student/profile',      label: 'Profile',     icon: 'Profile',     accent: '#18B7F2', section: 'PROFILE' },
]

const FOCUSED_ROUTES = ['/student/practice/session', '/student/exam/session']

function isFocusedRoute(pathname) {
  if (!pathname) return false
  if (FOCUSED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))) return true
  if (/^\/student\/learn\/[^/]+/.test(pathname)) return true
  return false
}

// ── Sidebar nav link ──────────────────────────────────────────────────────────
function SidebarLink({ href, label, icon, accent, isActive }) {
  const IconComp = Icons[icon]
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
      borderRadius: 11, textDecoration: 'none', fontFamily: 'inherit',
      background: isActive ? `${accent}10` : 'transparent',
      border: `1.5px solid ${isActive ? `${accent}30` : 'transparent'}`,
      transition: 'all .15s',
      color: isActive ? accent : 'var(--text-tert)',
    }}>
      <span style={{ flexShrink: 0, lineHeight: 0, color: isActive ? accent : 'var(--text-tert)' }}>
        {IconComp && <IconComp active={isActive} />}
      </span>
      <span style={{
        fontSize: 13, fontWeight: isActive ? 800 : 600,
        color: isActive ? accent : 'var(--text-tert)',
        flex: 1,
      }}>{label}</span>
      {isActive && (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      )}
    </Link>
  )
}

// ── Right sidebar: activity + leaderboard + target ────────────────────────────
function LayoutRightAside({ myId, profile }) {
  const [board, setBoard] = useState([])
  const { totalPoints: liveXP } = usePoints()
  const medals = ['🥇', '🥈', '🥉']

  useEffect(() => {
    fetch('/api/leaderboard/global?limit=5')
      .then(r => r.json()).then(d => setBoard(d.leaderboard ?? [])).catch(() => {})
    const onVis = () => { if (document.visibilityState === 'visible') fetch('/api/leaderboard/global?limit=5').then(r=>r.json()).then(d=>setBoard(d.leaderboard??[])).catch(()=>{}) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const now = new Date()
  const nextJune = new Date(now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(), 5, 1)
  const daysLeft = Math.max(0, Math.ceil((nextJune - now) / 86400000))

  const cardStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 14, overflow: 'hidden',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Class rank */}
      {board.length > 0 && (
        <div style={cardStyle}>
          <div style={{ padding: '10px 13px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Class rank</p>
            <Link href="/student/community" style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', textDecoration: 'none' }}>Full board →</Link>
          </div>
          {board.slice(0, 5).map((entry, i) => {
            const isMe = entry.student_id === myId
            const pts = isMe ? liveXP : (entry.points ?? 0)
            return (
              <div key={entry.student_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', background: isMe ? 'rgba(24,183,242,.07)' : 'transparent' }}>
                <span style={{ fontSize: i < 3 ? 12 : 10, fontWeight: 800, color: 'var(--text-tert)', minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
                  {i < 3 ? medals[i] : `${i + 1}`}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 500, color: isMe ? '#18B7F2' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isMe ? 'You' : (entry.full_name?.split(' ')[0] ?? 'Student')}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? '#FFB800' : 'var(--text-tert)', flexShrink: 0 }}>
                  {pts.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Target */}
      {(profile?.university_course || profile?.target_university) && (
        <div style={{ ...cardStyle, padding: 13 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>Your target</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.3 }}>
                {profile.university_course || 'Exam goal'}
              </p>
              {profile.target_university && (
                <p style={{ fontSize: 10, color: '#18B7F2', marginTop: 1 }}>{profile.target_university}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-prim)', lineHeight: 1 }}>{daysLeft}</p>
            <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>days left</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Header XP + Streak pill ───────────────────────────────────────────────────
function HeaderPills({ streak }) {
  const { totalPoints } = usePoints()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const formattedXP = totalPoints >= 1000
    ? `${(totalPoints / 1000).toFixed(1)}k`
    : String(totalPoints)

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(255,184,0,.12)', border: '1.5px solid rgba(255,184,0,.28)',
          fontSize: 11, fontWeight: 800, color: 'var(--gold)', opacity: 0,
        }}>
          <span>✦</span> 0 XP
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {streak >= 3 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 9px', borderRadius: 999,
          background: 'rgba(255,106,0,.12)', border: '1.5px solid rgba(255,106,0,.28)',
          fontSize: 11, fontWeight: 800, color: '#FF6A00',
        }}>
          <span style={{ animation: 'exl-flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
          {streak}
        </div>
      )}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999,
        background: 'rgba(255,184,0,.12)', border: '1.5px solid rgba(255,184,0,.28)',
        fontSize: 11, fontWeight: 800, color: 'var(--gold)',
      }}>
        <span>✦</span> {formattedXP} XP
      </div>
    </div>
  )
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function StudentLayoutClient({ children, profile }) {
  const pathname = usePathname()
  const focused  = isFocusedRoute(pathname)
  const { userId } = useUser()

  const [liveStreak, setLiveStreak] = useState(profile?.streak_days ?? 0)
  const [mockLabel,  setMockLabel]  = useState('WAEC')

  useEffect(() => {
    const t = setInterval(() => setMockLabel(l => l === 'WAEC' ? 'JAMB' : 'WAEC'), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function fetchStreak() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: s } = await supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle()
        if (s?.current_streak != null) setLiveStreak(s.current_streak)
        else {
          const { data: p } = await supabase.from('profiles').select('streak_days').eq('id', user.id).single()
          if (p?.streak_days) setLiveStreak(p.streak_days)
        }
      } catch {}
    }
    fetchStreak()
  }, [])

  if (focused) return <>{children}</>

  const activeHref = DESKTOP_NAV.find(({ href }) =>
    pathname === href || (href !== '/student/dashboard' && pathname.startsWith(href + '/'))
  )?.href ?? ''

  const mainNav    = DESKTOP_NAV.filter(n => n.section === 'MAIN')
  const profileNav = DESKTOP_NAV.filter(n => n.section === 'PROFILE')

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  // Show right aside on these pages
  const showAside = ['/student/dashboard', '/student/community', '/student/progress'].some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 54,
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--nav-border)',
        display: 'flex', alignItems: 'center',
      }}>
        {/* maxWidth: 1280 — was 900, now uses full desktop width */}
        <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

          <Link href="/student/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
            <EXLLogo size={30} />
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.03em' }}>Exam</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tert)', letterSpacing: '-0.02em' }}>Prep</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <HeaderPills streak={liveStreak} />
            <DarkModeToggle />
            <Link href="/student/profile" style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeHref === '/student/profile'
                ? 'linear-gradient(135deg,#18B7F2,#062A78)'
                : 'var(--bg-subtle)',
              border: `1.5px solid ${activeHref === '/student/profile' ? 'rgba(24,183,242,.3)' : 'var(--border)'}`,
              color: activeHref === '/student/profile' ? '#fff' : 'var(--text-sec)',
              textDecoration: 'none', overflow: 'hidden',
            }}>
              {initials && initials !== '?' ? (
                <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{initials}</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.5" fill="currentColor"/>
                  <path d="M3 18C3 14.69 6.13 12 10 12C13.87 12 17 14.69 17 18" fill="currentColor" opacity=".8"/>
                </svg>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      {/* maxWidth: 1280 — was 900 */}
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', padding: '0 24px', gap: 0 }}>

        {/* ── Left sidebar (desktop) ── */}
        <aside style={{ width: 220, flexShrink: 0, paddingTop: 20, paddingRight: 16 }} className="hidden lg:block">
          <nav style={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 2 }}>

            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', padding: '0 11px', marginBottom: 6 }}>Main</p>

            {mainNav.map(({ href, label, icon, accent }) => (
              <SidebarLink key={href} href={href} label={label} icon={icon} accent={accent} isActive={href === activeHref} />
            ))}

            {/* Mock exam shortcut */}
            <Link href="/student/exam" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
              borderRadius: 11, textDecoration: 'none', marginTop: 2,
              background: pathname.startsWith('/student/exam') ? 'rgba(255,184,0,.1)' : 'transparent',
              border: `1.5px solid ${pathname.startsWith('/student/exam') ? 'rgba(255,184,0,.28)' : 'transparent'}`,
              transition: 'all .15s',
            }}>
              <span style={{ lineHeight: 0, color: pathname.startsWith('/student/exam') ? '#FFB800' : 'var(--text-tert)', flexShrink: 0 }}>
                <Icons.Exam />
              </span>
              <span style={{ fontSize: 13, fontWeight: pathname.startsWith('/student/exam') ? 800 : 600, color: pathname.startsWith('/student/exam') ? '#FFB800' : 'var(--text-tert)', flex: 1 }}>
                Mock Exam
              </span>
              <span style={{
                fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em',
                padding: '2px 6px', borderRadius: 5,
                background: 'rgba(255,184,0,.14)', color: '#FFB800',
                flexShrink: 0,
              }}>{mockLabel}</span>
            </Link>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 6px' }} />

            {profileNav.map(({ href, label, icon, accent }) => (
              <SidebarLink key={href} href={href} label={label} icon={icon} accent={accent} isActive={href === activeHref} />
            ))}

            {/* Streak card — amber glow */}
            <div style={{
              marginTop: 20, borderRadius: 14, padding: 13,
              background: 'rgba(255,184,0,.07)',
              border: '1.5px solid rgba(255,184,0,.18)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Your streak</p>
                <span style={{ animation: 'exl-flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#FF6A00', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {liveStreak}
              </p>
              <p style={{ fontSize: 9.5, color: 'var(--text-tert)', marginTop: 2 }}>days in a row</p>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${Math.min(100, (liveStreak / 30) * 100)}%`, background: '#FF6A00', borderRadius: 99 }} />
              </div>
            </div>
          </nav>
        </aside>

        {/* ── Page content ── */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 20, paddingBottom: 120 }} className="lg:pb-12">
          {children}
        </div>

        {/* ── Right aside (desktop xl+, selected pages) ── */}
        {/* width: 260 — was 200 */}
        {showAside && (
          <aside style={{ width: 260, flexShrink: 0, paddingTop: 20, paddingLeft: 20 }} className="hidden xl:block">
            <div style={{ position: 'sticky', top: 72 }}>
              <LayoutRightAside myId={profile?.id} profile={profile} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <div className="lg:hidden">
        <BottomNavWrapper />
      </div>
    </div>
  )
}