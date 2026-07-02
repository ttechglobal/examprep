// src/app/student/layout.js
// REDESIGN — header updated to match the prototype:
//   • "E" navy mark + "Exam Prep" text (not "ExamPrep" one word)
//   • Navy logo mark with 3D bottom shadow — EXL brand
//   • Kept: PointsBadge, DarkModeToggle, bottom nav, desktop sidebar

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import { PointsProvider } from '@/contexts/PointsContext'
import PointsBadge from '@/components/ui/PointsBadge'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import Link from 'next/link'

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points, full_name')
    .eq('id', user.id)
    .single()

  const initialTotal = profile?.total_points ?? 0

  return (
    <LessonNavProvider>
      <PointsProvider initialTotal={initialTotal}>
        <div className="min-h-screen">

          {/* ── Top header ─────────────────────────────────────────────────── */}
          <header className="bg-card border-b border-default sticky top-0 z-40">
            <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">

              {/* Logo — E mark + "Exam Prep" */}
              <Link href="/student/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: '#0b1330',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                    boxShadow: '0 3px 0 #05070f',
                    fontFamily: 'inherit',
                  }}
                >
                  E
                </div>
                <span className="text-sm font-black text-primary tracking-tight">
                  Exam{' '}
                  <span className="font-medium text-secondary">Prep</span>
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {[
                  { href: '/student/dashboard', label: 'Home'      },
                  { href: '/student/learn',     label: 'Learn'     },
                  { href: '/student/practice',  label: 'Practise'  },
                  { href: '/student/community', label: 'Community' },
                  { href: '/student/profile',   label: 'Profile'   },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="px-3 py-1.5 text-sm font-bold text-secondary hover:text-primary hover:bg-subtle rounded-xl transition-colors">
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <PointsBadge />
                <DarkModeToggle />
              </div>
            </div>
          </header>

          <main className="max-w-screen-xl mx-auto px-4 lg:px-8 py-5 pb-28 lg:pb-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 xl:grid-cols-[280px_1fr]">

            {/* ── Desktop sidebar ── */}
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-1">
                {[
                  { href: '/student/dashboard', label: 'Home',        emoji: '🏠' },
                  { href: '/student/learn',     label: 'Learn Hub',   emoji: '📚' },
                  { href: '/student/practice',  label: 'Practise',    emoji: '⚡' },
                  { href: '/student/community', label: 'Community',   emoji: '👥' },
                  { href: '/student/profile',   label: 'Profile',     emoji: '👤' },
                ].map(({ href, label, emoji }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-secondary hover:text-primary hover:bg-subtle transition-colors text-sm font-bold">
                    <span className="text-base">{emoji}</span>
                    {label}
                  </Link>
                ))}
              </nav>
            </aside>

            <div className="min-w-0 max-w-2xl lg:max-w-none">
              {children}
            </div>
          </main>

          <div className="lg:hidden">
            <BottomNavWrapper />
          </div>
        </div>
      </PointsProvider>
    </LessonNavProvider>
  )
}