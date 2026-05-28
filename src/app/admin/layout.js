// src/app/admin/layout.js  (REPLACE existing file — adds Video Lessons nav link)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <span className="font-black text-lg text-indigo-600">ExamPrep Admin</span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { href: '/admin/curriculum',     label: 'Curriculum' },
                { href: '/admin/subjects-manager', label: 'Subjects' },
                { href: '/admin/curriculum/upload', label: 'Upload' },
                { href: '/admin/questions',       label: 'Questions' },
                { href: '/admin/video-lessons',   label: '🎬 Videos' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/student/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
            ← Student view
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}