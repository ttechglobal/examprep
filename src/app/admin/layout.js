// src/app/admin/layout.js
// CHANGED: Auth is now password-based via a session cookie, not Supabase.
// Admin sets ADMIN_PASSWORD in .env.local and logs in at /admin-login.
// No Supabase account required.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

const COOKIE_NAME = 'admin_session'

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  // Not logged in — send to admin login, not the student login
  if (!session?.value) {
    redirect('/admin-login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex' }}>
      <AdminSidebar userName="Admin" />

      {/* Main — offset by sidebar on desktop */}
      <div className="flex-1 min-w-0 lg:ml-[200px]">
        <main style={{ padding: '32px 28px', maxWidth: 1200 }}>
          {children}
        </main>
      </div>
    </div>
  )
}