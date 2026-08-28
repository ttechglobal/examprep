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

        /* ── Admin light canvas — always light regardless of student dark mode ── */
        .admin-shell {
          background: #f4f6fb;
          color: #111827;
          /* Override CSS variables so dark mode doesn't bleed in */
          --bg-base:   #f4f6fb;
          --bg-card:   #ffffff;
          --bg-subtle: #f9fafb;
          --bg-inset:  #f3f4f6;
          --text-prim: #111827;
          --text-sec:  #374151;
          --text-tert: #6b7280;
          --border:    #e5e7eb;
        }

        /* Force all form controls inside admin to always render as light */
        .admin-shell input,
        .admin-shell select,
        .admin-shell textarea {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: #e5e7eb !important;
        }
        .admin-shell input::placeholder,
        .admin-shell textarea::placeholder {
          color: #9ca3af !important;
        }
        /* Labels, paragraphs, spans */
        .admin-shell label,
        .admin-shell p,
        .admin-shell span,
        .admin-shell h1, .admin-shell h2, .admin-shell h3,
        .admin-shell h4, .admin-shell h5, .admin-shell h6 {
          color: inherit;
        }
        /* Code / pre blocks */
        .admin-shell code,
        .admin-shell pre {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
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