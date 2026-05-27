import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'
import Link from 'next/link'

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_streak:student_streaks(current_streak)')
    .eq('id', user.id)
    .single()

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-black text-indigo-600">ExamPrep</span>
          <Link
            href="/student/profile"
            className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-colors"
          >
            <span className="text-white text-xs font-black">{initial}</span>
          </Link>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}