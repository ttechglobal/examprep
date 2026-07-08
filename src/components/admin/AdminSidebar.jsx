'use client'
// src/components/admin/AdminSidebar.jsx — v3 EXL Studio style
// Dark sidebar (#0d0e14), white content area, pill nav items, live badge

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { section: 'MENU', items: [
    { href: '/admin/dashboard',       label: 'Dashboard',      icon: '◼', dot: true  },
    { href: '/admin/curriculum',      label: 'Content',        icon: '📚'            },
    { href: '/admin/past-questions',  label: 'Past Questions', icon: '↑'             },
    { href: '/admin/users',           label: 'Students',       icon: '◎'             },
    { href: '/admin/schools',         label: 'Schools',        icon: '🏫'            },
  ]},
  { section: 'TOOLS', items: [
    { href: '/admin/analytics',       label: 'Analytics',      icon: '📈'            },
    { href: '/admin/video-lessons',   label: 'Videos',         icon: '🎬'            },
    { href: '/admin/core-topics',     label: 'Core Topics',    icon: '⭐'            },
    { href: '/admin/questions',       label: 'Question Bank',  icon: '🗃'            },
  ]},
]

function NavItem({ href, label, icon, dot, active }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 10,
      textDecoration: 'none',
      background: active ? 'rgba(255,255,255,.12)' : 'transparent',
      transition: 'background .15s',
    }}
    className={!active ? 'hover:bg-white/5' : ''}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? '#fff' : 'rgba(255,255,255,.5)', flex: 1 }}>
        {label}
      </span>
      {dot && active && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
      )}
    </Link>
  )
}

export default function AdminSidebar({ userName }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const supabase    = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function SidebarContent() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0e14' }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>EP</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1 }}>ExamPrep</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>ADMIN</p>
            </div>
          </div>
          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.25)', marginTop: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', letterSpacing: '.06em' }}>LIVE</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {NAV.map((group, gi) => (
            <div key={gi}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.2)', padding: '0 12px', marginBottom: 4 }}>
                {group.section}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => (
                  <NavItem
                    key={item.href}
                    {...item}
                    active={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {(userName ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName ?? 'Admin'}</p>
            </div>
          </div>
          <button onClick={signOut}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
            ← Exit Studio
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex" style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 200, flexDirection: 'column', zIndex: 40, background: '#0d0e14' }}>
        <SidebarContent />
      </aside>

      {/* Mobile */}
      <div className="lg:hidden">
        {mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 50 }} />
            <aside style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 220, zIndex: 60, background: '#0d0e14' }}>
              <SidebarContent />
            </aside>
          </>
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0d0e14', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMobileOpen(true)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span style={{ fontWeight: 900, color: '#a78bfa', fontSize: 14 }}>ExamPrep Admin</span>
        </div>
      </div>
    </>
  )
}