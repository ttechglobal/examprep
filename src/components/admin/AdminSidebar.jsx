'use client'
// src/components/admin/AdminSidebar.jsx — v6
// CHANGES from v5:
//   • Real LogoMark SVG (matches landing page brand identity)
//   • Import link added to Questions section
//   • Brand-aligned styling: EXL Navy (#062A78), EXL Blue (#1264E5), Gold (#FFB800)
//   • Active state uses EXL Blue glow instead of purple
//   • Desktop sidebar: position:fixed with lg:ml-[220px] offset — no layout shift on load
//   • Mobile: sticky top bar — no layout shift
//   • Overlay bug fixed: sidebar wrapper uses exact same approach as before but
//     the outer shell now renders with willChange:transform to guarantee GPU layer

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

// ── Brand tokens (mirrors landing page) ──────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const BG     = '#0a0c14'   // dark mode canvas — matches app globals.css
const BG2    = '#070810'   // slightly deeper for footer/header

// ── Nav tree ─────────────────────────────────────────────────────────────────
const NAV = [
  { section: 'QUESTIONS', items: [
    { href: '/admin/dashboard',          label: 'Dashboard',        icon: '◼' },
    { href: '/admin/past-questions',     label: 'Past Questions',   icon: '🗃' },
    { href: '/admin/coverage',           label: 'Year Coverage',    icon: '📅' },
    { href: '/admin/questions/import',   label: 'Import (SdashAPI)',icon: '⬆' },
    { href: '/admin/questions/upload',   label: 'Upload Questions', icon: '📤' },
    { href: '/admin/questions',          label: 'Question Bank',    icon: '🔍' },
  ]},
  { section: 'CURRICULUM', items: [
    { href: '/admin/subjects-manager',   label: 'Subjects',         icon: '📑' },
    { href: '/admin/curriculum',         label: 'Topic Tree',       icon: '🌿' },
    { href: '/admin/core-topics',        label: 'Core Topics',      icon: '⭐' },
  ]},
  { section: 'PLATFORM', items: [
    { href: '/admin/users',              label: 'Students',         icon: '👤' },
    { href: '/admin/schools',            label: 'Schools',          icon: '🏫' },
    { href: '/admin/analytics',          label: 'Analytics',        icon: '📈' },
    { href: '/admin/reviewers',          label: 'Reviewers',        icon: '👁' },
  ]},
]

// ── Logo mark — exact SVG from landing page ───────────────────────────────────
function LogoMark({ size = 28 }) {
  return (
    <img
      src="/images/examprep_logo.png"
      alt="ExamPrep A1 logo"
      width={size}
      height={size}
      style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
    />
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ href, label, icon, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 11px', borderRadius: 10,
        textDecoration: 'none',
        background: active ? `rgba(24,183,242,.12)` : 'transparent',
        transition: 'background .15s',
      }}
    >
      <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{
        fontSize: 12, fontWeight: active ? 800 : 500,
        color: active ? '#fff' : 'rgba(255,255,255,.40)',
        flex: 1, letterSpacing: active ? '-0.01em' : '0',
        transition: 'color .15s',
      }}>
        {label}
      </span>
      {active && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: CYAN, flexShrink: 0,
          boxShadow: `0 0 8px ${CYAN}`,
        }} />
      )}
    </Link>
  )
}

// ── Sidebar body ──────────────────────────────────────────────────────────────
function SidebarBody({ pathname, onLinkClick, onSignOut }) {
  const allItems = NAV.flatMap(g => g.items)

  function isActive(href) {
    if (href === '/admin/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: BG,
      // Guarantee GPU compositing so the sidebar never paints over content
      willChange: 'transform',
      transform: 'translateZ(0)',
    }}>

      {/* ── Logo header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 14px 13px',
        borderBottom: `1px solid rgba(255,255,255,.07)`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
          <LogoMark size={30} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
              ExamPrep
            </p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', marginTop: 2, letterSpacing: '.1em' }}>
              ADMIN STUDIO
            </p>
          </div>
        </div>

        {/* Live badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 6,
          background: 'rgba(24,183,242,.1)',
          border: `1px solid rgba(24,183,242,.22)`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: CYAN }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: CYAN, letterSpacing: '.08em' }}>LIVE</span>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 16,
        // Custom scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,.1) transparent',
      }}>
        {NAV.map((group, gi) => (
          <div key={gi}>
            <p style={{
              fontSize: 8, fontWeight: 800, letterSpacing: '.14em',
              color: 'rgba(255,255,255,.16)', padding: '0 11px',
              marginBottom: 4, textTransform: 'uppercase',
            }}>
              {group.section}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 14px',
        borderTop: `1px solid rgba(255,255,255,.07)`,
        background: BG2,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {/* Avatar — small EXL logo treatment */}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg,${BLUE},${NAVY})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0,
            border: `1.5px solid rgba(255,255,255,.12)`,
          }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Admin
            </p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)' }}>examprep.ng</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 9,
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.38)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', transition: 'background .12s',
          }}
        >
          ← Sign out
        </button>
      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function AdminSidebar() {
  const pathname     = usePathname()
  const router       = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin-login')
  }

  return (
    <>
      {/* ── Desktop: fixed sidebar, never causes layout shift ─────────── */}
      {/* The main content uses lg:ml-[220px] in layout.js to offset itself */}
      <aside
        className="hidden lg:block"
        style={{
          position: 'fixed', left: 0, top: 0,
          width: 220, height: '100vh',
          zIndex: 40,
          // Isolate stacking context so sidebar never overlays page content
          isolation: 'isolate',
        }}
      >
        <SidebarBody pathname={pathname} onLinkClick={undefined} onSignOut={signOut} />
      </aside>

      {/* ── Mobile: sticky top bar + slide-in drawer ──────────────────── */}
      <div className="lg:hidden">
        {/* Sticky top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: BG,
          borderBottom: `1px solid rgba(255,255,255,.07)`,
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setOpen(true)}
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,255,255,.07)',
                border: `1px solid rgba(255,255,255,.1)`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,.6)', flexShrink: 0,
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <LogoMark size={24} />
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 13, letterSpacing: '-0.02em' }}>
                ExamPrep Admin
              </span>
            </div>
          </div>
          {/* Current page label */}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>
            {NAV.flatMap(g => g.items).find(i =>
              i.href === '/admin/dashboard' ? pathname === i.href : pathname.startsWith(i.href)
            )?.label ?? ''}
          </span>
        </div>

        {/* Backdrop */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(6,42,120,.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 50,
            }}
          />
        )}

        {/* Drawer */}
        <aside style={{
          position: 'fixed', left: 0, top: 0,
          height: '100vh', width: 240, zIndex: 60,
          boxShadow: '6px 0 30px rgba(0,0,0,.5)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
          willChange: 'transform',
        }}>
          {/* Close button */}
          <div style={{ position: 'absolute', top: 14, right: 12, zIndex: 1 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,.08)',
                border: `1px solid rgba(255,255,255,.1)`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,.5)', fontSize: 13,
              }}
            >✕</button>
          </div>
          <SidebarBody
            pathname={pathname}
            onLinkClick={() => setOpen(false)}
            onSignOut={signOut}
          />
        </aside>
      </div>
    </>
  )
}