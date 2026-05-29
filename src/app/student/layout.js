// src/app/student/layout.js
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import { PointsProvider } from '@/contexts/PointsContext'
import PointsBadge from '@/components/ui/PointsBadge'
import DarkModeToggle from '@/components/ui/DarkModeToggle'

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch total_points for initial hydration
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_points')
    .eq('id', user.id)
    .single()

  const initialTotal = profile?.total_points ?? 0

  return (
    <LessonNavProvider>
      <PointsProvider initialTotal={initialTotal}>
        <div className="min-h-screen bg-base">
          <header className="bg-card border-b border-default sticky top-0 z-40">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-black">EP</span>
                </div>
                <span className="text-base font-black text-primary tracking-tight">ExamPrep</span>
              </div>
              <div className="flex items-center gap-2">
                <PointsBadge />
                <DarkModeToggle />
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-lg mx-auto px-4 py-5 pb-28">
            {children}
          </main>
          <BottomNavWrapper />
        </div>
      </PointsProvider>
    </LessonNavProvider>
  )
}