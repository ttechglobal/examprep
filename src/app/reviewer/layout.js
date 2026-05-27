import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReviewerLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-6">
            <span className="font-black text-lg text-indigo-600">ExamPrep</span>
            <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
              Reviewer
            </span>
            <Link href="/reviewer/dashboard" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              My Reviews
            </Link>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}