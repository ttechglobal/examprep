// src/app/student/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// HEADER REDESIGN — matches the v3 prototype exactly:
//   • Height: 52px (not 56px)
//   • Background: var(--bg-base) — matches page canvas, not card white
//   • Left: EXL logo mark (28×28, navy, 3D shadow) + "Exam Prep" wordmark
//   • Right: XP pill (gold border + gold text) + dark mode toggle
//   • Border: 1px solid var(--border) — subtle separator
//   • No desktop nav clutter in center — desktop uses sidebar only
//   • Logo mark uses 3D shadow: 0 3px 0 #05070f (same as CTA buttons)
//   • "Exam" bold + "Prep" muted — exact prototype text treatment
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import { PointsProvider } from '@/contexts/PointsContext'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import GamesFAB from '@/components/ui/GamesFAB'
import Link from 'next/link'
import HeaderXPPill from '@/components/ui/HeaderXPPill'

const DESKTOP_NAV = [
  { href: '/student/dashboard',  label: 'Home',       icon: '🏠' },
  { href: '/student/practice',   label: 'Practise',   icon: '⚡' },
  { href: '/student/learn',      label: 'Learn',      icon: '📚' },
  { href: '/student/community',  label: 'Community',  icon: '👥' },
  { href: '/student/progress',   label: 'Progress',   icon: '📊' },
  { href: '/student/profile',    label: 'Profile',    icon: '👤' },
]

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points, full_name, streak_days')
    .eq('id', user.id)
    .single()

  return (
    <LessonNavProvider>
      <PointsProvider initialTotal={profile?.total_points ?? 0}>
        <div className="min-h-screen bg-base">

          {/* ── Header ── */}
          {/* Matches prototype: 52px, bg-base, 3D logo mark, XP pill right */}
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
            <div
              style={{
                width: '100%',
                maxWidth: 1280,
                margin: '0 auto',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {/* ── Logo ── */}
              {/* 28×28 navy lettermark with 3D press shadow, wordmark "Exam Prep" */}
              <Link
                href="/student/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  textDecoration: 'none',
                }}
              >
                {/* Lettermark */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: '#0b1330',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  boxShadow: '0 3px 0 #05070f',
                  flexShrink: 0,
                }}>
                  E
                </div>

                {/* Wordmark */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-prim)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}>
                  Exam{' '}
                  <span style={{ color: 'var(--text-sec)', fontWeight: 500 }}>
                    Prep
                  </span>
                </span>
              </Link>

              {/* ── Desktop centre nav ── (hidden on mobile) */}
              <nav
                style={{
                  display: 'none',
                  flex: 1,
                  justifyContent: 'center',
                  gap: 2,
                }}
                className="lg:flex"
              >
                {DESKTOP_NAV.slice(0, 5).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-sec)',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-subtle hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* ── Right: XP pill + dark mode toggle ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {/* XP pill — gold bordered, matches prototype exactly */}
                <HeaderXPPill points={profile?.total_points ?? 0} streak={profile?.streak_days ?? 0} />

                {/* Dark mode toggle — circular, minimal */}
                <DarkModeToggle />
              </div>
            </div>
          </header>

          {/* ── Content layout ── */}
          <main
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '20px 16px 112px',
            }}
            className="lg:pb-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 xl:grid-cols-[240px_1fr]"
          >
            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <nav style={{ position: 'sticky', top: 68 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {DESKTOP_NAV.map(({ href, label, icon }) => (
                    <Link
                      key={href}
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-sec)',
                        textDecoration: 'none',
                      }}
                      className="hover:bg-subtle hover:text-primary transition-colors"
                    >
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

          {/* Mobile nav + Games FAB */}
          <div className="lg:hidden">
            <GamesFAB />
            <BottomNavWrapper />
          </div>
        </div>
      </PointsProvider>
    </LessonNavProvider>
  )
}