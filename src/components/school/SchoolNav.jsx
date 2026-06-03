'use client'
// src/components/school/SchoolNav.jsx
// Desktop: fixed left sidebar with section links.
// Mobile: sticky top bar + bottom tab nav.

import { usePathname } from 'next/navigation'

const TABS = [
  { id: 'overview',  label: 'Overview',  emoji: '📊', hash: '' },
  { id: 'students',  label: 'Students',  emoji: '👥', hash: '#students' },
  { id: 'topics',    label: 'Topics',    emoji: '📚', hash: '#topics' },
  { id: 'cohort',    label: 'Cohort',    emoji: '🎓', hash: '#cohort' },
  { id: 'reports',   label: 'Reports',   emoji: '📄', hash: '#reports' },
]

export default function SchoolNav({ schoolName, schoolCity }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/school/dashboard'

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-white border-r border-gray-200 z-40">
        {/* School identity */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base">🏫</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 leading-tight truncate">{schoolName}</p>
              {schoolCity && <p className="text-xs text-gray-400">{schoolCity}</p>}
            </div>
          </div>
        </div>

        {/* Nav items — these are hash links that trigger section jumps */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {TABS.map(t => (
            <a
              key={t.id}
              href={`/school/dashboard${t.hash}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="text-base leading-none w-5 text-center">{t.emoji}</span>
              {t.label}
            </a>
          ))}
        </nav>

        {/* Badge */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl">
            <span className="text-xs font-black text-emerald-600">School Admin</span>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">🏫</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 leading-tight truncate">{schoolName}</p>
            {schoolCity && <p className="text-xs text-gray-400 leading-tight">{schoolCity}</p>}
          </div>
        </div>
      </header>
    </>
  )
}