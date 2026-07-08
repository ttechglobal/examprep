// src/app/admin/layout.js — EXL Studio style
// Dark sidebar (#0d0e14) + white/gray-50 main content area

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
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex' }}>
      <AdminSidebar userName={profile?.full_name ?? 'Admin'} />

      {/* Main — offset by sidebar on desktop */}
      <div className="flex-1 min-w-0 lg:ml-[200px]">
        <main style={{ padding: '32px 28px', maxWidth: 1200 }}>
          {children}
        </main>
      </div>
    </div>
  )
}