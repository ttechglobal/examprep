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
      {/* ── Admin dark theme overrides — neutralises all legacy light hardcodes ── */}
      <style>{`
        /* Canvas */
        .admin-shell, .admin-shell * { box-sizing: border-box; }
        .admin-content { color: #e6edf3; }

        /* White / near-white backgrounds → dark surfaces */
        .admin-content [style*="background: #fff"],
        .admin-content [style*="background:#fff"],
        .admin-content [style*="background: white"],
        .admin-content [style*='background: "#fff"'] { background: #161b22 !important; }

        .admin-content [style*="background: #f9fafb"],
        .admin-content [style*="background:#f9fafb"],
        .admin-content [style*="background: #f3f4f6"],
        .admin-content [style*="background:#f3f4f6"],
        .admin-content [style*="background: #fafafa"],
        .admin-content [style*="background:#fafafa"],
        .admin-content [style*="background: #f5f5f5"],
        .admin-content [style*="background: #f5f5f0"] { background: #1c2128 !important; }

        .admin-content [style*="background: #eff6ff"],
        .admin-content [style*="background:#eff6ff"],
        .admin-content [style*="background: #f0fdf4"],
        .admin-content [style*="background:#f0fdf4"],
        .admin-content [style*="background: #fef2f2"],
        .admin-content [style*="background:#fef2f2"],
        .admin-content [style*="background: #fffbeb"],
        .admin-content [style*="background:#fffbeb"] { background: rgba(255,255,255,.06) !important; }

        /* Dark text on light bg → light text */
        .admin-content [style*="color: #111827"],
        .admin-content [style*="color:#111827"],
        .admin-content [style*="color: #1f2937"],
        .admin-content [style*="color:#1f2937"],
        .admin-content [style*="color: #374151"],
        .admin-content [style*="color:#374151"] { color: #e6edf3 !important; }

        .admin-content [style*="color: #6b7280"],
        .admin-content [style*="color:#6b7280"],
        .admin-content [style*="color: #9ca3af"],
        .admin-content [style*="color:#9ca3af"],
        .admin-content [style*="color: #4b5563"],
        .admin-content [style*="color:#4b5563"] { color: #8b949e !important; }

        /* Light borders → dark borders */
        .admin-content [style*="border: 1px solid #e5e7eb"],
        .admin-content [style*="border:1px solid #e5e7eb"],
        .admin-content [style*="border-color: #e5e7eb"],
        .admin-content [style*="1px solid #f3f4f6"] { border-color: rgba(255,255,255,.1) !important; }

        /* Tailwind utility overrides */
        .admin-content .bg-white      { background-color: #161b22 !important; }
        .admin-content .bg-gray-50    { background-color: #1c2128 !important; }
        .admin-content .bg-gray-100   { background-color: #21262d !important; }
        .admin-content .bg-gray-200   { background-color: #30363d !important; }
        .admin-content .text-gray-900 { color: #e6edf3 !important; }
        .admin-content .text-gray-800 { color: #c9d1d9 !important; }
        .admin-content .text-gray-700 { color: #b1bac4 !important; }
        .admin-content .text-gray-600 { color: #8b949e !important; }
        .admin-content .text-gray-500 { color: #6e7681 !important; }
        .admin-content .text-gray-400 { color: #6e7681 !important; }
        .admin-content .text-black     { color: #e6edf3 !important; }
        .admin-content .border-gray-100,
        .admin-content .border-gray-200,
        .admin-content .border-gray-300 { border-color: #30363d !important; }
        .admin-content .divide-gray-100 > * + *,
        .admin-content .divide-gray-200 > * + * { border-color: #30363d !important; }

        /* Inputs / selects / textareas */
        .admin-content input,
        .admin-content select,
        .admin-content textarea {
          background-color: #21262d !important;
          border-color: #30363d !important;
          color: #e6edf3 !important;
        }
        .admin-content input::placeholder,
        .admin-content textarea::placeholder { color: #6e7681 !important; }

        /* Tables */
        .admin-content table { border-color: #30363d; }
        .admin-content th { background: #161b22 !important; color: #8b949e !important; border-color: #30363d !important; }
        .admin-content td { border-color: #30363d !important; color: #e6edf3; }
        .admin-content tr:hover td { background: rgba(255,255,255,.03) !important; }

        /* Modals / overlays */
        .admin-content [style*="background: rgba(0,0,0"] { /* keep overlays */ }
        .admin-content [style*="position: fixed"][style*="z-index"] { /* keep modals */ }

        /* Scrollbars */
        .admin-content ::-webkit-scrollbar { width: 8px; height: 8px; }
        .admin-content ::-webkit-scrollbar-track { background: #161b22; }
        .admin-content ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        .admin-content ::-webkit-scrollbar-thumb:hover { background: #484f58; }
      `}</style>

      <div className="admin-shell" style={{ minHeight: '100vh', background: '#0d1117', display: 'flex' }}>
        <AdminSidebar />

        {/* Main content — offset by sidebar width on desktop only */}
        <div className="flex-1 min-w-0 lg:ml-[220px] admin-content">
          <main style={{ padding: '24px 20px', maxWidth: 1280 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}