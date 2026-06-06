// src/app/student/layout.js
// CHANGE: "Videos" replaced with "Practice" in both desktop header nav and sidebar.
// Videos is still accessible via /student/videos — just no longer in primary nav.

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

              <Link href="/student/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <span className="text-white text-xs font-black">EP</span>
                </div>
                <span className="text-base font-black text-primary tracking-tight">ExamPrep</span>
              </Link>

              {/* Desktop top nav — Videos replaced with Practice */}
              <nav className="hidden lg:flex items-center gap-1">
                {[
                  { href: '/student/dashboard', label: 'Home'      },
                  { href: '/student/learn',     label: 'Learn'     },
                  { href: '/student/practice',  label: 'Practice'  },
                  { href: '/student/community', label: 'Community' },
                  { href: '/student/profile',   label: 'Profile'   },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="px-3 py-1.5 text-sm font-bold text-secondary
                               hover:text-primary hover:bg-subtle
                               rounded-xl transition-colors">
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

            {/* ── Desktop sidebar — Videos replaced with Practice ───────────── */}
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-1">
                {[
                  { href: '/student/dashboard', label: 'Home',        emoji: '🏠' },
                  { href: '/student/learn',     label: 'Learn Hub',   emoji: '📚' },
                  { href: '/student/practice',  label: 'Practice HQ', emoji: '✨' },
                  { href: '/student/videos',    label: 'Videos',      emoji: '🎬' },
                  { href: '/student/community', label: 'Community',   emoji: '👥' },
                  { href: '/student/profile',   label: 'Profile',     emoji: '👤' },
                ].map(({ href, label, emoji }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                               text-secondary hover:text-primary hover:bg-subtle
                               transition-colors text-sm font-bold">
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