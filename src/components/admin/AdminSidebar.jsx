'use client'
// src/components/admin/AdminSidebar.jsx
// Sidebar navigation for the admin panel.
// Desktop: always visible fixed sidebar.
// Mobile: drawer via hidden checkbox trick (no JS needed for toggle).

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    section: null,
    items: [
      { href: '/admin/dashboard', label: 'Overview', icon: '📊' },
    ],
  },
  {
    section: 'Content',
    items: [
      { href: '/admin/curriculum',        label: 'Curriculum',    icon: '🗂' },
      { href: '/admin/subjects-manager',  label: 'Subjects',      icon: '📚' },
      { href: '/admin/video-lessons',     label: 'Videos',        icon: '🎬' },
    ],
  },
  {
    section: 'Questions',
    items: [
      { href: '/admin/questions',         label: 'Question Bank', icon: '❓' },
      { href: '/admin/questions/upload',  label: 'Upload',        icon: '⬆️' },
      { href: '/admin/core-topics',       label: 'Core Topics',   icon: '⭐' },
    ],
  },
  {
    section: 'Users',
    items: [
      { href: '/admin/users',             label: 'Students',      icon: '👥' },
      { href: '/admin/reviewers',         label: 'Reviewers',     icon: '🔍' },
      { href: '/admin/schools',           label: 'Schools',       icon: '🏫' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/admin/analytics',         label: 'Platform Stats', icon: '📈' },
    ],
  },
]

function NavItem({ href, label, icon, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-indigo-50 text-indigo-700 font-bold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-base leading-none w-5 text-center">{icon}</span>
      <span>{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
    </Link>
  )
}

function SidebarContent({ pathname }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black">EP</span>
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm leading-tight">ExamPrep</p>
            <p className="text-[10px] text-gray-400 font-medium">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 mb-1.5">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={
                    item.href === '/admin/dashboard'
                      ? pathname === '/admin/dashboard' || pathname === '/admin'
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <Link
          href="/student/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <span className="text-base leading-none w-5 text-center">👤</span>
          <span>Student view</span>
        </Link>
      </div>
    </div>
  )
}

export default function AdminSidebar({ userName }) {
  const pathname = usePathname()

  return (
    <>
      {/* ── Desktop sidebar (always visible) ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200 z-40">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile drawer (hidden checkbox trick) ─────────────────────────── */}
      <input type="checkbox" id="admin-drawer" className="peer hidden" />

      {/* Backdrop */}
      <label
        htmlFor="admin-drawer"
        className="peer-checked:fixed peer-checked:inset-0 peer-checked:bg-black/40 peer-checked:z-40 hidden peer-checked:block lg:hidden"
      />

      {/* Drawer panel */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50
                        -translate-x-full peer-checked:translate-x-0
                        transition-transform duration-200 ease-in-out
                        lg:hidden flex flex-col">
        {/* Close button */}
        <div className="absolute top-4 right-4">
          <label htmlFor="admin-drawer" className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </label>
        </div>
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  )
}