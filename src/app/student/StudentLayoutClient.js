'use client'
// src/app/student/StudentLayoutClient.js — v5
// CHANGES:
//   • No left outline/accent bar on active sidebar items
//   • Profile avatar button in header (top-right)
//   • Progress in sidebar (replaces profile in main nav)
//   • Right sidebar with leaderboard snapshot on desktop (non-dashboard pages)

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import HeaderXPPill from '@/components/ui/HeaderXPPill'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ── SVG Icons (20×20) ─────────────────────────────────────────────────────────
const Icons = {
  Home: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M3 9.5L10 3L17 9.5V18H13V13H7V18H3V9.5Z"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  ),
  Practise: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M8 7L14 10L8 13V7Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Learn: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L2 7L10 12L18 7L10 2Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M5 10V16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M15 10V16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M5 16C5 16 7 18 10 18C13 18 15 16 15 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  Community: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6" r="3" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
      <path d="M4 18C4 14.7 6.7 12 10 12C13.3 12 16 14.7 16 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="3.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="16.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 17C1 15.3 2.6 14 4.5 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M19 17C19 15.3 17.4 14 15.5 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Profile: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7"/>
      <path d="M3 18C3 14.7 6.1 12 10 12C13.9 12 17 14.7 17 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  Progress: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="12" width="3" height="6" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="8.5" y="8" width="3" height="10" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
      <rect x="15" y="4" width="3" height="14" rx="1" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Exam: ({ active }) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="2" width="14" height="16" rx="2" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 7H13M7 10H13M7 13H10" stroke={active ? '#fff' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

const DESKTOP_NAV = [
  { href: '/student/dashboard',  label: 'Home',      icon: 'Home',      accent: '#0b1330', section: 'MAIN' },
  { href: '/student/practice',   label: 'Practise',  icon: 'Practise',  accent: '#9b7ae0', section: 'MAIN' },
  { href: '/student/learn',      label: 'Learn',     icon: 'Learn',     accent: '#5cb8ea', section: 'MAIN' },
  { href: '/student/community',  label: 'Community', icon: 'Community', accent: '#6cce8e', section: 'MAIN' },
  { href: '/student/progress',   label: 'Progress',  icon: 'Progress',  accent: '#f59e0b', section: 'MAIN' },
  { href: '/student/profile',    label: 'Profile',   icon: 'Profile',   accent: '#0b1330', section: 'PROFILE' },
]

const FOCUSED_ROUTES = [
  '/student/practice/session',
  '/student/exam/session',
]

function isFocusedRoute(pathname) {
  if (!pathname) return false
  if (FOCUSED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))) return true
  if (/^\/student\/learn\/[^/]+/.test(pathname)) return true
  return false
}

function SidebarLink({ href, label, icon, accent, isActive }) {
  const IconComp = Icons[icon]
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px',
      borderRadius: 13, textDecoration: 'none',
      // FIX: no left outline/border bar — just background tint for active state
      background: isActive ? `${accent}12` : 'transparent',
      border: `1.5px solid ${isActive ? `${accent}22` : 'transparent'}`,
      transition: 'all .15s',
      color: isActive ? accent : 'var(--text-sec)',
    }}>
      {/* Removed left accent bar — clean active state */}
      <span style={{ flexShrink: 0, lineHeight: 0 }}>
        {IconComp && <IconComp active={isActive} />}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: isActive ? 800 : 600, color: isActive ? accent : 'var(--text-sec)', letterSpacing: isActive ? '-0.01em' : '0', transition: 'all .15s' }}>
        {label}
      </span>
      {isActive && (
        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      )}
    </Link>
  )
}

// ── Leaderboard snapshot for right sidebar ────────────────────────────────────
function LayoutLeaderboard({ myId }) {
  const [board, setBoard] = useState([])
  const medals = ['🥇', '🥈', '🥉']
  const { totalPoints: liveXP } = usePoints()

  useEffect(() => {
    function fetchBoard() {
      fetch('/api/leaderboard/global?limit=5')
        .then(r => r.json())
        .then(data => setBoard(data.leaderboard ?? []))
        .catch(() => {})
    }
    fetchBoard()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchBoard() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!board.length) return null

  return (
    <div style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-prim)' }}>This week</p>
        <Link href="/student/community" style={{ fontSize: 10, fontWeight: 700, color: '#9b7ae0', textDecoration: 'none' }}>Full board →</Link>
      </div>
      <div style={{ padding: '4px 0 4px' }}>
        {board.slice(0, 5).map((entry, i) => {
          const isMe = entry.student_id === myId
          const pts = isMe ? liveXP : (entry.points ?? 0)
          return (
            <div key={entry.student_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: isMe ? 'rgba(155,122,224,.07)' : 'transparent' }}>
              <span style={{ fontSize: i < 3 ? 13 : 10, fontWeight: 800, color: 'var(--text-tert)', minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
                {i < 3 ? medals[i] : `${i + 1}`}
              </span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 500, color: isMe ? '#9b7ae0' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isMe ? 'You' : (entry.full_name?.split(' ')[0] ?? 'Student')}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? '#ffc36b' : 'var(--text-tert)', flexShrink: 0 }}>
                {pts.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StudentLayoutClient({ children, profile }) {
  const pathname = usePathname()
  const focused  = isFocusedRoute(pathname)
  const [mockLabel, setMockLabel] = useState('WAEC')
  useEffect(() => {
    const t = setInterval(() => setMockLabel(l => l === 'WAEC' ? 'JAMB' : 'WAEC'), 3500)
    return () => clearInterval(t)
  }, [])

  const [liveStreak, setLiveStreak] = useState(profile?.streak_days ?? 0)
  useEffect(() => {
    async function fetchStreak() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: streakRow } = await supabase
          .from('student_streaks')
          .select('current_streak')
          .eq('student_id', user.id)
          .maybeSingle()
        if (streakRow?.current_streak != null) {
          setLiveStreak(streakRow.current_streak)
        } else {
          const { data: prof } = await supabase
            .from('profiles').select('streak_days').eq('id', user.id).single()
          if (prof?.streak_days) setLiveStreak(prof.streak_days)
        }
      } catch {}
    }
    fetchStreak()
  }, [])

  if (focused) return <>{children}</>

  const activeHref = DESKTOP_NAV.find(({ href }) =>
    pathname === href ||
    (href !== '/student/dashboard' && pathname.startsWith(href + '/'))
  )?.href ?? ''

  const mainNav    = DESKTOP_NAV.filter(n => n.section === 'MAIN')
  const profileNav = DESKTOP_NAV.filter(n => n.section === 'PROFILE')

  // Profile initial avatar (first letter of name or email)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 56,
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 1440, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link href="/student/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#0b1330', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 0 #05070f', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 13L6 4L10 10.5L12 7.5L15 13H2Z" fill="white" opacity=".9"/>
                <circle cx="12.5" cy="4" r="1.8" fill="#9b7ae0"/>
              </svg>
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-0.03em' }}>Exam</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-tert)', letterSpacing: '-0.02em' }}>Prep</span>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <HeaderXPPill points={profile?.total_points ?? 0} streak={liveStreak} />
            <DarkModeToggle />
            {/* ── Profile button in header — always shows person icon ── */}
            <Link href="/student/profile" style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeHref === '/student/profile' ? '#0b1330' : 'var(--bg-subtle)',
              border: `1.5px solid ${activeHref === '/student/profile' ? '#0b1330' : 'var(--border)'}`,
              color: activeHref === '/student/profile' ? '#fff' : 'var(--text-sec)',
              textDecoration: 'none',
              transition: 'all .15s',
              overflow: 'hidden',
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
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', padding: '0 20px', gap: 0 }}>

        {/* ── Desktop left sidebar ── */}
        <aside style={{ width: 260, flexShrink: 0, paddingTop: 24, paddingRight: 20 }} className="hidden lg:block">
          <nav style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Main nav */}
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', padding: '0 12px', marginBottom: 6 }}>Navigation</p>
            {mainNav.map(({ href, label, icon, accent }) => (
              <SidebarLink key={href} href={href} label={label} icon={icon} accent={accent} isActive={href === activeHref} />
            ))}

            {/* Exam shortcut */}
            <Link href="/student/exam" style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px',
              borderRadius: 13, textDecoration: 'none',
              background: pathname.startsWith('/student/exam') ? 'rgba(245,185,66,.12)' : 'transparent',
              border: `1.5px solid ${pathname.startsWith('/student/exam') ? 'rgba(245,185,66,.22)' : 'transparent'}`,
              transition: 'all .15s', marginTop: 2,
            }}>
              <span style={{ lineHeight: 0, color: pathname.startsWith('/student/exam') ? '#d97706' : 'var(--text-sec)', flexShrink: 0 }}>
                <Icons.Exam active={pathname.startsWith('/student/exam')} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: pathname.startsWith('/student/exam') ? 800 : 600, color: pathname.startsWith('/student/exam') ? '#d97706' : 'var(--text-sec)' }}>
                Mock Exam
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', padding: '2px 6px', borderRadius: 5, background: 'rgba(245,185,66,.15)', color: '#d97706', flexShrink: 0, minWidth: 34, textAlign: 'center' }}>{mockLabel}</span>
            </Link>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '14px 8px' }} />

            {/* Profile — stays in sidebar too */}
            {profileNav.map(({ href, label, icon, accent }) => (
              <SidebarLink key={href} href={href} label={label} icon={icon} accent={accent} isActive={href === activeHref} />
            ))}

            {/* Streak mini-card */}
            <div style={{ marginTop: 20, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 14px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Your streak</p>
                <span style={{ fontSize: 14 }}>🔥</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {liveStreak}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 2 }}>days in a row</p>
              <div style={{ height: 4, background: 'var(--bg-inset)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${Math.min(100, (liveStreak / 30) * 100)}%`, background: '#f59e0b', borderRadius: 99 }} />
              </div>
            </div>
          </nav>
        </aside>

        {/* ── Page content ── */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 20, paddingBottom: 120 }} className="lg:pb-12">
          {children}
        </div>

        {/* ── Right sidebar: leaderboard snapshot (desktop, non-dashboard pages) ── */}
        {!pathname.startsWith('/student/dashboard') && (
          <aside style={{ width: 220, flexShrink: 0, paddingTop: 20, paddingLeft: 16 }} className="hidden xl:block">
            <div style={{ position: 'sticky', top: 80 }}>
              <LayoutLeaderboard myId={profile?.id} />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNavWrapper />
      </div>
    </div>
  )
}