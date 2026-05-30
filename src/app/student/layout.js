// src/app/student/layout.js — REPLACE ENTIRE FILE
// Key changes vs current version:
// 1. Wrapper div: removed all bg classes — html/body handle page background
// 2. Header: explicit bg-white dark:bg-gray-900 (not bg-card which may not resolve yet)

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
        {/* NO background class — html/body from globals.css handles it */}
        <div className="min-h-screen">

          {/* Header — always solid, responds to dark/light correctly */}
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <div className="max-w-screen-xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">

              <Link href="/student/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <span className="text-white text-xs font-black">EP</span>
                </div>
                <span className="text-base font-black text-gray-900 dark:text-white tracking-tight">ExamPrep</span>
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {[
                  { href: '/student/dashboard', label: 'Home'      },
                  { href: '/student/learn',     label: 'Learn'     },
                  { href: '/student/practice',  label: 'Practice'  },
                  { href: '/student/videos',    label: 'Videos'    },
                  { href: '/student/community', label: 'Community' },
                  { href: '/student/profile',   label: 'Profile'   },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="px-3 py-1.5 text-sm font-bold
                               text-gray-500 dark:text-gray-400
                               hover:text-gray-900 dark:hover:text-white
                               hover:bg-gray-100 dark:hover:bg-gray-800
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
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-1">
                {[
                  { href: '/student/dashboard', label: 'Home',      emoji: '🏠' },
                  { href: '/student/learn',     label: 'Learn Hub', emoji: '📚' },
                  { href: '/student/practice',  label: 'Practice',  emoji: '✏️' },
                  { href: '/student/videos',    label: 'Videos',    emoji: '🎬' },
                  { href: '/student/community', label: 'Community', emoji: '👥' },
                  { href: '/student/profile',   label: 'Profile',   emoji: '👤' },
                ].map(({ href, label, emoji }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                               text-gray-500 dark:text-gray-400
                               hover:text-gray-900 dark:hover:text-white
                               hover:bg-gray-100 dark:hover:bg-gray-800
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