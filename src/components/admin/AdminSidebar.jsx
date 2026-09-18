'use client'
// src/components/admin/AdminSidebar.jsx — v7
// CHANGES from v6:
//   • Mobile: replaced top bar + slide-in drawer with a clean 4-tab bottom nav
//     (Overview, Students, Performance, More) + "More" opens a slide-up sheet
//   • Desktop: fixed sidebar unchanged

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY = '#062A78'
const BLUE = '#1264E5'
const CYAN = '#18B7F2'
const BG   = '#0a0c14'
const BG2  = '#070810'

// ── Nav tree ──────────────────────────────────────────────────────────────────
const SECTIONS = {
  questions: {
    label: 'Questions',
    icon: '🗃',
    accent: '#6366f1',
    items: [
      { href: '/admin/dashboard',                label: 'Hub',                  icon: '◼' },
      { href: '/admin/questions/upload',         label: 'Upload Questions',     icon: '📤' },
      { href: '/admin/questions/import',         label: 'Import via Sdash',     icon: '⬆' },
      { href: '/admin/questions/myquest-import', label: 'Import via MyQuest',   icon: '⬆' },
      { href: '/admin/questions',                label: 'Question Bank',         icon: '🔍' },
      { href: '/admin/past-questions',           label: 'Past Questions',        icon: '🗃' },
      { href: '/admin/coverage',                 label: 'Year Coverage',         icon: '📅' },
    ],
  },
  content: {
    label: 'Content',
    icon: '📚',
    accent: '#0ea5e9',
    items: [
      { href: '/admin/dashboard',        label: 'Hub',                    icon: '◼' },
      { href: '/admin/curriculum',       label: 'Topic Tree',             icon: '🌿' },
      { href: '/admin/subjects-manager', label: 'Subjects',               icon: '📑' },
      { href: '/admin/core-topics',      label: 'Core Topics',            icon: '⭐' },
      { href: '/admin/flashcards',       label: 'Flashcards & Formulas',  icon: '🃏' },
      { href: '/admin/video-lessons',    label: 'Video Lessons',          icon: '🎬' },
    ],
  },
  platform: {
    label: 'Platform',
    icon: '⚙️',
    accent: '#10b981',
    items: [
      { href: '/admin/dashboard',          label: 'Hub',           icon: '◼' },
      { href: '/admin/users',              label: 'Students',      icon: '👤' },
      { href: '/admin/schools',            label: 'Schools',       icon: '🏫' },
      { href: '/admin/early-access-leads', label: 'Early Access',  icon: '📋' },
      { href: '/admin/access-codes',       label: 'Access Codes',  icon: '🎟' },
      { href: '/admin/analytics',          label: 'Analytics',     icon: '📈' },
      { href: '/admin/reviewers',          label: 'Reviewers',     icon: '👁' },
    ],
  },
}

function getSectionForPath(pathname) {
  if (!pathname || pathname === '/admin/dashboard') return 'questions'
  if (['/admin/curriculum', '/admin/subjects-manager', '/admin/core-topics',
       '/admin/flashcards', '/admin/video-lessons'].some(p => pathname.startsWith(p))) return 'content'
  if (['/admin/users', '/admin/schools', '/admin/access-codes',
       '/admin/analytics', '/admin/reviewers', '/admin/early-access-leads'].some(p => pathname.startsWith(p))) return 'platform'
  return 'questions'
}

const NAV_FLAT = Object.values(SECTIONS).flatMap(s => s.items)

// ── Logo ──────────────────────────────────────────────────────────────────────
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

// ── Nav item (desktop sidebar) ────────────────────────────────────────────────
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

// ── Desktop sidebar body ──────────────────────────────────────────────────────
function SidebarBody({ pathname, onLinkClick, onSignOut }) {
  const sectionKey    = getSectionForPath(pathname)
  const section       = SECTIONS[sectionKey]
  const otherSections = Object.entries(SECTIONS).filter(([k]) => k !== sectionKey)

  function isActive(href) {
    if (href === '/admin/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: BG, willChange: 'transform', transform: 'translateZ(0)',
    }}>
      {/* Logo header */}
      <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid rgba(255,255,255,.07)`, flexShrink: 0 }}>
        <Link href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, textDecoration: 'none' }}>
          <LogoMark size={28} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>ExamPrep</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', marginTop: 2, letterSpacing: '.1em' }}>ADMIN STUDIO</p>
          </div>
        </Link>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 7,
          background: `rgba(255,255,255,.07)`,
          border: `1px solid rgba(255,255,255,.12)`,
        }}>
          <span style={{ fontSize: 11 }}>{section.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{section.label}</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.1) transparent',
      }}>
        <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.16)', padding: '0 11px', marginBottom: 4, textTransform: 'uppercase' }}>{section.label}</p>
        {section.items.map(item => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onClick={onLinkClick} />
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '14px 8px 10px' }} />
        <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.12)', padding: '0 11px', marginBottom: 6, textTransform: 'uppercase' }}>Switch to</p>
        {otherSections.map(([key, sec]) => (
          <Link
            key={key}
            href={sec.items[1]?.href ?? '/admin/dashboard'}
            onClick={onLinkClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 11px', borderRadius: 10,
              textDecoration: 'none', transition: 'background .15s', background: 'transparent',
            }}
          >
            <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{sec.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.28)', flex: 1 }}>{sec.label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2.5L8 5 5.5 7.5" stroke="rgba(255,255,255,.2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 14px', borderTop: `1px solid rgba(255,255,255,.07)`, background: BG2, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg,${BLUE},${NAVY})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0,
            border: `1.5px solid rgba(255,255,255,.12)`,
          }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Admin</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)' }}>examprep.ng</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 9,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.38)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center', transition: 'background .12s',
          }}
        >← Sign out</button>
      </div>
    </div>
  )
}

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────
// 4 tabs: Overview (dashboard), Students (users), Performance (analytics), More (sheet)

const BOTTOM_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/admin/dashboard',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8"/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8"/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8"/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8"/>
      </svg>
    ),
    match: (p) => p === '/admin/dashboard',
  },
  {
    id: 'students',
    label: 'Students',
    href: '/admin/users',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8"/>
        <path d="M2 21c0-4 3.1-7 7-7s7 3 7 7" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="19" cy="8" r="3" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.6"/>
        <path d="M16.5 21c0-2.8 1.1-4.5 2.5-4.5s2.5 1.7 2.5 4.5" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    match: (p) => p.startsWith('/admin/users') || p.startsWith('/admin/schools'),
  },
  {
    id: 'performance',
    label: 'Performance',
    href: '/admin/analytics',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l4-5 4 3 4-7 4 4" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 20h18" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    match: (p) => p.startsWith('/admin/analytics') || p.startsWith('/admin/coverage'),
  },
  {
    id: 'more',
    label: 'More',
    href: null,   // opens sheet instead
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 12h16M4 18h16" stroke={active ? BLUE : 'rgba(255,255,255,.35)'} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    match: () => false,
  },
]

// More sheet groups
const MORE_GROUPS = [
  {
    title: 'Questions',
    items: [
      { href: '/admin/questions/upload',         label: 'Upload Questions',     icon: '📤' },
      { href: '/admin/questions/import',         label: 'Import via Sdash',     icon: '⬆' },
      { href: '/admin/questions/myquest-import', label: 'Import via MyQuest',   icon: '⬆' },
      { href: '/admin/questions',                label: 'Question Bank',         icon: '🔍' },
      { href: '/admin/past-questions',           label: 'Past Questions',        icon: '🗃' },
      { href: '/admin/coverage',                 label: 'Year Coverage',         icon: '📅' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/curriculum',       label: 'Topic Tree',             icon: '🌿' },
      { href: '/admin/subjects-manager', label: 'Subjects',               icon: '📑' },
      { href: '/admin/core-topics',      label: 'Core Topics',            icon: '⭐' },
      { href: '/admin/flashcards',       label: 'Flashcards & Formulas',  icon: '🃏' },
      { href: '/admin/video-lessons',    label: 'Video Lessons',          icon: '🎬' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/admin/schools',            label: 'Schools',       icon: '🏫' },
      { href: '/admin/early-access-leads', label: 'Early Access',  icon: '📋' },
      { href: '/admin/access-codes',       label: 'Access Codes',  icon: '🎟' },
      { href: '/admin/reviewers',          label: 'Reviewers',     icon: '👁' },
    ],
  },
]

function MobileBottomNav({ pathname, onMoreOpen }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: BG,
      borderTop: '1px solid rgba(255,255,255,.09)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {BOTTOM_TABS.map(tab => {
        const active = tab.match(pathname)
        return (
          <button
            key={tab.id}
            onClick={tab.href ? undefined : onMoreOpen}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 4px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* Active indicator dot */}
            {active && (
              <span style={{
                position: 'absolute', top: 8, width: 20, height: 3,
                borderRadius: 99, background: BLUE,
                boxShadow: `0 0 8px ${BLUE}66`,
              }} />
            )}

            {tab.href ? (
              <Link href={tab.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textDecoration:'none' }}>
                {tab.icon(active)}
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,.35)',
                  letterSpacing: '-.01em',
                }}>{tab.label}</span>
              </Link>
            ) : (
              <>
                {tab.icon(false)}
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.35)', letterSpacing: '-.01em' }}>{tab.label}</span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function MobileMoreSheet({ open, onClose, pathname, onSignOut }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(0,0,0,.6)',
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        background: '#0d0f1a',
        borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,.09)',
        borderBottom: 'none',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        willChange: 'transform',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'rgba(255,255,255,.15)' }}/>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <LogoMark size={24} />
            <span style={{ fontSize:14, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>ExamPrep Admin</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,.5)', fontSize: 14,
            }}
          >✕</button>
        </div>

        {/* Scrollable group list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0 8px' }}>
          {MORE_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
                color: 'rgba(255,255,255,.2)', textTransform: 'uppercase',
                padding: '10px 20px 6px',
              }}>{group.title}</div>
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 20px',
                      textDecoration: 'none',
                      background: active ? 'rgba(18,100,229,.12)' : 'transparent',
                      borderLeft: active ? `3px solid ${BLUE}` : '3px solid transparent',
                      transition: 'background .12s',
                    }}
                  >
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{
                      fontSize: 14, fontWeight: active ? 700 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,.55)',
                      flex: 1,
                    }}>{item.label}</span>
                    {active && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, boxShadow: `0 0 8px ${CYAN}` }}/>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer — sign out */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0, background: BG2,
        }}>
          <button
            onClick={onSignOut}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 11,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >← Sign out</button>
        </div>
      </div>
    </>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function AdminSidebar() {
  const pathname       = usePathname()
  const router         = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  async function signOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin-login')
  }

  return (
    <>
      {/* ── Desktop: fixed sidebar ──────────────────────────────────────── */}
      <aside
        className="hidden lg:block"
        style={{
          position: 'fixed', left: 0, top: 0,
          width: 220, height: '100vh',
          zIndex: 40, isolation: 'isolate',
        }}
      >
        <SidebarBody pathname={pathname} onLinkClick={undefined} onSignOut={signOut} />
      </aside>

      {/* ── Mobile: bottom tab bar + slide-up more sheet ────────────────── */}
      <div className="lg:hidden">
        <MobileBottomNav pathname={pathname} onMoreOpen={() => setMoreOpen(true)} />
        <MobileMoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          pathname={pathname}
          onSignOut={signOut}
        />
      </div>
    </>
  )
}
