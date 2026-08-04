'use client'
// src/app/student/StudentLayoutClient.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reads the current pathname to decide whether to show the full chrome
// (header + sidebar + bottom nav) or just render children directly.
//
// FOCUSED ROUTES — no chrome at all, page manages its own UI:
//   /student/practice/session
//   /student/exam/session
//   /student/learn/[subtopicSlug]   (lesson viewer)
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import HeaderXPPill from '@/components/ui/HeaderXPPill'
import Link from 'next/link'

const DESKTOP_NAV = [
  { href: '/student/dashboard',  label: 'Home',      icon: '🏠' },
  { href: '/student/practice',   label: 'Practise',  icon: '⚡' },
  { href: '/student/learn',      label: 'Learn',     icon: '📚' },
  { href: '/student/community',  label: 'Community', icon: '👥' },
  { href: '/student/profile',    label: 'Profile',   icon: '👤' },
]

// Routes that should render with zero chrome — the page manages its own full-screen UI
const FOCUSED_ROUTES = [
  '/student/practice/session',
  '/student/exam/session',
]

function isFocusedRoute(pathname) {
  if (!pathname) return false
  // Exact matches for session pages
  if (FOCUSED_ROUTES.some(r => pathname === r || pathname.startsWith(r + '?'))) return true
  // Any subtopic lesson page: /student/learn/[anything]
  if (/^\/student\/learn\/[^/]+/.test(pathname)) return true
  return false
}

export default function StudentLayoutClient({ children, profile }) {
  const pathname = usePathname()
  const focused  = isFocusedRoute(pathname)

  // ── Focused mode: render children only, no chrome ────────────────────────
  if (focused) {
    return <>{children}</>
  }

  // ── Normal mode: full header + sidebar + bottom nav ───────────────────────
  return (
    <div className="min-h-screen bg-base">

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-default"
        style={{
          height: 52,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{
          width: '100%', maxWidth: 1280, margin: '0 auto', padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {/* Logo */}
          <Link href="/student/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9, background: '#0b1330',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
              boxShadow: '0 3px 0 #05070f', flexShrink: 0,
            }}>E</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', letterSpacing: '-0.01em', lineHeight: 1 }}>
              Exam{' '}<span style={{ color: 'var(--text-sec)', fontWeight: 500 }}>Prep</span>
            </span>
          </Link>

          {/* Desktop centre nav */}
          <nav style={{ display: 'none', flex: 1, justifyContent: 'center', gap: 2 }} className="lg:flex">
            {DESKTOP_NAV.map(({ href, label }) => (
              <Link key={href} href={href} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-sec)', textDecoration: 'none' }}
                className="hover:bg-subtle hover:text-primary transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: XP pill + dark mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <HeaderXPPill points={profile?.total_points ?? 0} streak={profile?.streak_days ?? 0} />
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* ── Content: sidebar + page ── */}
      <main
        style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 112px' }}
        className="lg:pb-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 xl:grid-cols-[240px_1fr]"
      >
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <nav style={{ position: 'sticky', top: 68 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {DESKTOP_NAV.map(({ href, label, icon }) => (
                <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-sec)', textDecoration: 'none' }}
                  className="hover:bg-subtle hover:text-primary transition-colors">
                  <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Page content */}
        <div style={{ minWidth: 0, maxWidth: 680 }} className="lg:max-w-none">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNavWrapper />
      </div>
    </div>
  )
}