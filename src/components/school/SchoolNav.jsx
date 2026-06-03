'use client'
// src/components/school/SchoolNav.jsx
// Desktop: fixed sidebar with nav buttons that fire a tab change.
// Mobile: sticky top bar only (bottom tabs are in the page).
// Uses a custom event to communicate tab change to the dashboard page
// without prop drilling through the layout.

import { usePathname } from 'next/navigation'

const TABS = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'students', label: 'Students', emoji: '👥' },
  { id: 'topics',   label: 'Topics',   emoji: '📚' },
  { id: 'cohort',   label: 'Cohort',   emoji: '🎓' },
  { id: 'reports',  label: 'Reports',  emoji: '📄' },
]

function fireTabChange(id) {
  window.dispatchEvent(new CustomEvent('school-tab-change', { detail: id }))
}

export default function SchoolNav({ schoolName, schoolCity }) {
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

        {/* Nav items — fire custom event to switch tab in dashboard */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => fireTabChange(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-left"
            >
              <span className="text-base leading-none w-5 text-center">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="px-3 py-2 bg-emerald-50 rounded-xl">
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