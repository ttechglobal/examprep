'use client'
// src/components/admin/AdminSidebar.jsx — v5
// CHANGES from v4:
//   • Nav restructured: Questions / Curriculum / Platform
//   • Removed: Videos, Lessons (curriculum now = topic tree only)
//   • Added: Question Bank moved to Questions section
//   • Dark style, layout, sign-out — all unchanged from v4

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { section: 'QUESTIONS', items: [
    { href: '/admin/dashboard',          label: 'Dashboard',        icon: '◼', dot: true },
    { href: '/admin/past-questions',     label: 'Past Questions',   icon: '🗃'            },
    { href: '/admin/questions/upload',   label: 'Upload Questions', icon: '⬆️'           },
    { href: '/admin/questions',          label: 'Question Bank',    icon: '🔍'            },
  ]},
  { section: 'CURRICULUM', items: [
    { href: '/admin/subjects-manager',   label: 'Subjects',         icon: '📑'            },
    { href: '/admin/curriculum',         label: 'Topic Tree',       icon: '🌿'            },
    { href: '/admin/core-topics',        label: 'Core Topics',      icon: '⭐'            },
  ]},
  { section: 'PLATFORM', items: [
    { href: '/admin/users',              label: 'Students',         icon: '👤'            },
    { href: '/admin/schools',            label: 'Schools',          icon: '🏫'            },
    { href: '/admin/analytics',          label: 'Analytics',        icon: '📈'            },
    { href: '/admin/reviewers',          label: 'Reviewers',        icon: '👁'            },
  ]},
]

function NavItem({ href, label, icon, dot, active, onClick }) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 10,
      textDecoration: 'none',
      background: active ? 'rgba(167,139,250,.18)' : 'transparent',
      borderLeft: active ? '2.5px solid #a78bfa' : '2.5px solid transparent',
      transition: 'background .12s',
    }}>
      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: active ? 800 : 500, color: active ? '#e9d5ff' : 'rgba(255,255,255,.45)', flex: 1, letterSpacing: active ? '-0.01em' : '0' }}>
        {label}
      </span>
      {dot && active && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
      )}
    </Link>
  )
}

function SidebarBody({ pathname, onLinkClick, onSignOut }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0e14' }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>EP</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1 }}>ExamPrep</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', marginTop: 1, letterSpacing: '.08em' }}>ADMIN STUDIO</p>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', letterSpacing: '.06em' }}>LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {NAV.map((group, gi) => (
          <div key={gi}>
            <p style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.18)', padding: '0 12px', marginBottom: 4, textTransform: 'uppercase' }}>
              {group.section}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Admin</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.25)' }}>examprep.ng</p>
          </div>
        </div>
        <button onClick={onSignOut}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center', transition: 'background .12s' }}>
          ← Sign out
        </button>
      </div>
    </div>
  )
}

export default function AdminSidebar() {
  const pathname       = usePathname()
  const router         = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function signOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin-login')
  }

  return (
    <>
      {/* ── Desktop sidebar — fixed position, layout offsets with lg:ml-[220px] ── */}
      <aside className="hidden lg:flex" style={{
        position: 'fixed', left: 0, top: 0, height: '100vh', width: 220,
        flexDirection: 'column', zIndex: 40,
      }}>
        <SidebarBody pathname={pathname} onLinkClick={undefined} onSignOut={signOut} />
      </aside>

      {/* ── Mobile: sticky top bar + drawer ── */}
      <div className="lg:hidden">
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: '#0d0e14', borderBottom: '1px solid rgba(255,255,255,.06)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setMobileOpen(true)} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <span style={{ fontWeight: 900, color: '#a78bfa', fontSize: 14, letterSpacing: '-0.01em' }}>ExamPrep Admin</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>
            {NAV.flatMap(g => g.items).find(i => pathname === i.href || (i.href !== '/admin/dashboard' && pathname.startsWith(i.href)))?.label ?? ''}
          </span>
        </div>

        {/* Drawer */}
        {mobileOpen && (
          <>
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 50, backdropFilter: 'blur(4px)' }}
            />
            <aside style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 240, zIndex: 60, boxShadow: '4px 0 24px rgba(0,0,0,.4)' }}>
              <div style={{ position: 'absolute', top: 14, right: 12, zIndex: 1 }}>
                <button onClick={() => setMobileOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
                  ✕
                </button>
              </div>
              <SidebarBody pathname={pathname} onLinkClick={() => setMobileOpen(false)} onSignOut={signOut} />
            </aside>
          </>
        )}
      </div>
    </>
  )
}