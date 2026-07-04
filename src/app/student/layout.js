// src/app/student/layout.js — DEFINITIVE VERSION
// ─────────────────────────────────────────────────────────────────────────────
// Brand: EXL navy logo mark + "Exam Prep" wordmark (bold + muted)
// Header: bg-card / border-default — auto light/dark via CSS tokens
// Nav: Home · Practise · Learn · Community · Profile
// Desktop: 2-col layout (240px sidebar + content)
// Sidebar: sticky nav links with emoji icons
// No PracticeHubFAB — hero card on dashboard replaces it
// GamesFAB lives here — imported and placed above bottom nav
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import { PointsProvider } from '@/contexts/PointsContext'
import PointsBadge from '@/components/ui/PointsBadge'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import GamesFAB from '@/components/ui/GamesFAB'
import Link from 'next/link'

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
    .select('total_points, full_name')
    .eq('id', user.id)
    .single()

  return (
    <LessonNavProvider>
      <PointsProvider initialTotal={profile?.total_points ?? 0}>
        <div className="min-h-screen">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="bg-card border-b border-default sticky top-0 z-40"
            style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">

              {/* Logo */}
              <Link href="/student/dashboard"
                className="flex items-center gap-2 flex-shrink-0 group">
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: '#0b1330',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: '#fff',
                  boxShadow: '0 3px 0 #05070f',
                  transition: 'transform .15s',
                }}
                  className="group-hover:-translate-y-px"
                >E</div>
                <span className="text-sm font-black text-primary tracking-tight">
                  Exam{' '}
                  <span className="text-secondary font-medium">Prep</span>
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
                {DESKTOP_NAV.slice(0, 5).map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold text-secondary hover:text-primary hover:bg-subtle transition-all">
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <PointsBadge />
                <DarkModeToggle />
              </div>
            </div>
          </header>

          {/* ── Content ────────────────────────────────────────────────────── */}
          <main className="max-w-screen-xl mx-auto px-4 lg:px-8 py-5 pb-28 lg:pb-10
                           lg:grid lg:grid-cols-[220px_1fr] lg:gap-8
                           xl:grid-cols-[240px_1fr]">

            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-0.5">
                {DESKTOP_NAV.map(({ href, label, icon }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                               text-secondary hover:text-primary hover:bg-subtle
                               transition-colors text-sm font-bold">
                    <span className="text-base w-5 text-center">{icon}</span>
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Page content */}
            <div className="min-w-0 max-w-2xl lg:max-w-none">
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