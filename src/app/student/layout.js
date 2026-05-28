import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNavWrapper from '@/components/ui/BottomNavWrapper'
import { LessonNavProvider } from '@/contexts/LessonNavContext'

// ─────────────────────────────────────────────────────────────────────────────
// src/app/student/layout.js
// Wraps with LessonNavProvider so LessonViewer can signal to hide BottomNav.
// BottomNav rendering moved to BottomNavWrapper (client component) so it can
// read the lesson context.
// ─────────────────────────────────────────────────────────────────────────────

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <LessonNavProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-xl font-black text-indigo-600">ExamPrep</span>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 pb-28">
          {children}
        </main>
        {/* BottomNavWrapper hides itself when a lesson is open */}
        <BottomNavWrapper />
      </div>
    </LessonNavProvider>
  )
}