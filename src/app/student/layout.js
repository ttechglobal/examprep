import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black text-indigo-600">ExamPrep</span>
          {/* Streak badge — TODO: fetch from DB and show here */}
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}