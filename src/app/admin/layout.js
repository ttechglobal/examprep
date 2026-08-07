// src/app/admin/layout.js

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

const COOKIE_NAME = 'admin_session'

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  if (!session?.value) {
    redirect('/admin-login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex' }}>
      <AdminSidebar />

      {/* Main content — offset by sidebar width on desktop only */}
      <div className="flex-1 min-w-0 lg:ml-[220px]">
        <main style={{ padding: '24px 20px', maxWidth: 1280 }}>
          {children}
        </main>
      </div>
    </div>
  )
}