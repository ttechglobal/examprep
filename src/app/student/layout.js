import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'
import DarkModeToggle from '@/components/ui/DarkModeToggle'

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <LessonNavProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 transition-colors">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-black">EP</span>
              </div>
              <span className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight">ExamPrep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DarkModeToggle />
              <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-5 pb-28">
          {children}
        </main>
        <BottomNavWrapper />
      </div>
    </LessonNavProvider>
  )
}