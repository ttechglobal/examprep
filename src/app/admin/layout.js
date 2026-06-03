// src/app/admin/layout.js
// New sidebar layout — replaces the cramped horizontal nav bar.
// Desktop: fixed left sidebar 240px + main content area.
// Mobile: top bar with hamburger → slide-over sidebar.
// Active section highlighting via pathname matching.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — server component passes data, client component handles interactivity */}
      <AdminSidebar userName={profile?.full_name ?? 'Admin'} />

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex-1 min-w-0 lg:ml-60">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <label htmlFor="admin-drawer" className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <span className="font-black text-indigo-600 text-base">ExamPrep Admin</span>
        </div>

        <main className="px-6 py-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  )
}