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
    <>
      <style>{`
        .admin-shell, .admin-shell * { box-sizing: border-box; }

        /* ── Admin light canvas ─────────────────────────────────────────── */
        .admin-shell {
          background: #f4f6fb;
          color: #111827;
        }

        /* Crisp scrollbars */
        .admin-content ::-webkit-scrollbar { width: 6px; height: 6px; }
        .admin-content ::-webkit-scrollbar-track { background: #f4f6fb; }
        .admin-content ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .admin-content ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      <div className="admin-shell" style={{ minHeight: '100vh', display: 'flex' }}>
        <AdminSidebar />

        {/* Main content — offset by sidebar width on desktop only */}
        <div className="flex-1 min-w-0 lg:ml-[220px] admin-content">
          <main style={{ padding: '28px 24px', maxWidth: 1280 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}