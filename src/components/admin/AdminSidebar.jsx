'use client'
// src/components/admin/AdminSidebar.jsx — v8
//
// Four distinct sections with clear mandates:
//   Questions  — sourcing and managing the question bank
//   Content    — curriculum, lessons, flashcards
//   Users      — students, access, notifications
//   Schools    — partner schools and analytics
//
// Desktop: fixed 220px sidebar, section switcher at top, nav items below.
// Mobile:  bottom bar (4 section tabs) + slide-up sheet for full nav.

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const NAVY  = '#062A78'
const BLUE  = '#1264E5'
const CYAN  = '#18B7F2'
const BG    = '#0a0c14'
const BG2   = '#070810'

// ── Section definitions ───────────────────────────────────────────────────────
// Each section is fully self-contained. No section has a "Hub" item — the
// logo at the top of the sidebar goes to /admin/dashboard for the overview.

const SECTIONS = [
  {
    key:     'questions',
    label:   'Questions',
    icon:    '🗃',
    accent:  '#6366f1',
    desc:    'Source & manage the question bank',
    items: [
      { href: '/admin/questions/upload',          label: 'Upload Questions',   icon: '📤' },
      { href: '/admin/questions/import',          label: 'Import via Sdash',   icon: '⬆' },
      { href: '/admin/questions/myquest-import',  label: 'Import via MyQuest', icon: '⬆' },
      { href: '/admin/questions',                 label: 'Question Bank',      icon: '🔍' },
      { href: '/admin/past-questions',            label: 'Past Questions',     icon: '🗃' },
      { href: '/admin/coverage',                  label: 'Year Coverage',      icon: '📅' },
    ],
    // Paths that belong to this section (for auto-detection)
    paths: ['/admin/questions', '/admin/past-questions', '/admin/coverage'],
  },
  {
    key:    'content',
    label:  'Content',
    icon:   '📚',
    accent: '#0ea5e9',
    desc:   'Curriculum, lessons & study materials',
    items: [
      { href: '/admin/curriculum',        label: 'Topic Tree',            icon: '🌿' },
      { href: '/admin/subjects-manager',  label: 'Subjects',              icon: '📑' },
      { href: '/admin/core-topics',       label: 'Core Topics',           icon: '⭐' },
      { href: '/admin/flashcards',        label: 'Flashcards & Formulas', icon: '🃏' },
      { href: '/admin/video-lessons',     label: 'Video Lessons',         icon: '🎬' },
    ],
    paths: [
      '/admin/curriculum', '/admin/subjects-manager', '/admin/core-topics',
      '/admin/flashcards', '/admin/formulas', '/admin/video-lessons', '/admin/subjects',
    ],
  },
  {
    key:    'users',
    label:  'Users',
    icon:   '👥',
    accent: '#10b981',
    desc:   'Students, access & communications',
    items: [
      { href: '/admin/users',              label: 'Students',          icon: '👤' },
      { href: '/admin/access-codes',       label: 'Access Codes',      icon: '🎟' },
      { href: '/admin/early-access-leads', label: 'Early Access',      icon: '📋' },
      { href: '/admin/reviewers',          label: 'Reviewers',         icon: '👁' },
      { href: '/admin/notifications',      label: 'Notifications',     icon: '🔔' },
      { href: '/admin/analytics',          label: 'Analytics',         icon: '📈' },
    ],
    paths: [
      '/admin/users', '/admin/access-codes', '/admin/early-access-leads',
      '/admin/reviewers', '/admin/notifications', '/admin/analytics',
    ],
  },
  {
    key:    'schools',
    label:  'Schools',
    icon:   '🏫',
    accent: '#f97316',
    desc:   'Partner schools & performance',
    items: [
      { href: '/admin/schools', label: 'Schools', icon: '🏫' },
    ],
    paths: ['/admin/schools'],
  },
]

// Auto-detect which section the current path belongs to.
// Falls back to 'questions' (the most-used section).
function detectSection(pathname) {
  if (!pathname || pathname === '/admin/dashboard') return 'questions'
  for (const s of SECTIONS) {
    if (s.paths.some(p => pathname === p || pathname.startsWith(p + '/'))) return s.key
  }
  return 'questions'
}

function getSection(key) {
  return SECTIONS.find(s => s.key === key) ?? SECTIONS[0]
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function isActive(href, pathname) {
  if (href === '/admin/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

function LogoMark({ size = 28 }) {
  return (
    <img
      src="/images/examprep_logo.png"
      alt="ExamPrep A1"
      width={size}
      height={size}
      style={{ flexShrink: 0, objectFit: 'contain', display: 'block' }}
    />
  )
}

// ── Desktop nav item ──────────────────────────────────────────────────────────
function NavItem({ href, label, icon, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 11px', borderRadius: 10,
        textDecoration: 'none',
        background: active ? 'rgba(24,183,242,.12)' : 'transparent',
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

// ── Section switcher pill row (desktop) ───────────────────────────────────────
function SectionSwitcher({ active: activeKey, onChange }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '10px 8px',
      borderBottom: '1px solid rgba(255,255,255,.07)',
    }}>
      {SECTIONS.map(s => {
        const on = s.key === activeKey
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 9,
              background: on ? `${s.accent}20` : 'transparent',
              border: on ? `1px solid ${s.accent}40` : '1px solid transparent',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .12s',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: on ? 800 : 500,
                color: on ? '#fff' : 'rgba(255,255,255,.38)',
                lineHeight: 1, marginBottom: 1,
              }}>{s.label}</p>
              {on && <p style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', lineHeight: 1 }}>{s.desc}</p>}
            </div>
            {on && (
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: s.accent, flexShrink: 0,
                boxShadow: `0 0 8px ${s.accent}`,
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function SidebarBody({ pathname, onLinkClick, onSignOut }) {
  const detectedKey   = detectSection(pathname)
  const [activeKey, setActiveKey] = useState(detectedKey)

  // Keep section in sync when navigating via links (not the switcher)
  useEffect(() => {
    setActiveKey(detectSection(pathname))
  }, [pathname])

  const section = getSection(activeKey)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: BG, willChange: 'transform', transform: 'translateZ(0)',
    }}>
      {/* Logo + dashboard link */}
      <div style={{
        padding: '14px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        flexShrink: 0,
      }}>
        <Link
          href="/admin/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 2 }}
        >
          <LogoMark size={28} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>ExamPrep</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', marginTop: 2, letterSpacing: '.1em' }}>ADMIN STUDIO</p>
          </div>
        </Link>
      </div>

      {/* Section switcher */}
      <SectionSwitcher active={activeKey} onChange={setActiveKey} />

      {/* Section nav items */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '10px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.1) transparent',
      }}>
        <p style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '.14em',
          color: 'rgba(255,255,255,.16)', padding: '0 11px', marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          {section.label}
        </p>

        {section.items.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href, pathname)}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid rgba(255,255,255,.07)',
        background: BG2, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg,${BLUE},${NAVY})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0,
            border: '1.5px solid rgba(255,255,255,.12)',
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
// 4 tabs map to the 4 sections. Tapping a tab that's already active
// opens the sheet so the user can see all items in that section.

function MobileBottomNav({ activeSection, onTabTap }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: BG,
      borderTop: '1px solid rgba(255,255,255,.09)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {SECTIONS.map(s => {
        const active = s.key === activeSection
        return (
          <button
            key={s.key}
            onClick={() => onTabTap(s.key)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, padding: '10px 4px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', top: 8, width: 20, height: 3,
                borderRadius: 99, background: s.accent,
                boxShadow: `0 0 8px ${s.accent}66`,
              }} />
            )}
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#fff' : 'rgba(255,255,255,.35)',
              letterSpacing: '-.01em',
            }}>{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Mobile slide-up sheet ─────────────────────────────────────────────────────
function MobileSheet({ open, onClose, activeSection, pathname, onSignOut }) {
  const section = getSection(activeSection)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(3px)',
          }}
        />
      )}

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        background: '#0d0f1a',
        borderRadius: '20px 20px 0 0',
        border: '1px solid rgba(255,255,255,.09)',
        borderBottom: 'none',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        willChange: 'transform',
        maxHeight: '82vh',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.15)' }} />
        </div>

        {/* Sheet header — shows current section */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10,
              background: `${section.accent}20`,
              border: `1px solid ${section.accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>{section.icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{section.label}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>{section.desc}</p>
            </div>
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

        {/* Section items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {/* Dashboard link */}
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px',
              textDecoration: 'none',
              background: pathname === '/admin/dashboard' ? 'rgba(18,100,229,.12)' : 'transparent',
              borderLeft: pathname === '/admin/dashboard' ? `3px solid ${BLUE}` : '3px solid transparent',
            }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>◼</span>
            <span style={{
              fontSize: 14, fontWeight: pathname === '/admin/dashboard' ? 700 : 500,
              color: pathname === '/admin/dashboard' ? '#fff' : 'rgba(255,255,255,.45)',
            }}>Dashboard</span>
          </Link>

          <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 20px 8px' }} />

          {section.items.map(item => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  textDecoration: 'none',
                  background: active ? 'rgba(18,100,229,.12)' : 'transparent',
                  borderLeft: active ? `3px solid ${section.accent}` : '3px solid transparent',
                  transition: 'background .12s',
                }}
              >
                <span style={{ fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,.55)',
                  flex: 1,
                }}>{item.label}</span>
                {active && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: section.accent, boxShadow: `0 0 8px ${section.accent}`,
                  }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Sign out */}
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
  const pathname    = usePathname()
  const router      = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Mobile: track which section is "active" for the bottom tabs
  const [mobileSection, setMobileSection] = useState(() => detectSection(pathname))

  // Keep mobile section in sync when pathname changes (e.g. navigating via a link inside the sheet)
  useEffect(() => {
    setMobileSection(detectSection(pathname))
  }, [pathname])

  async function signOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin-login')
  }

  function handleTabTap(sectionKey) {
    if (sectionKey === mobileSection) {
      // Already on this section — open the sheet to see all items
      setSheetOpen(true)
    } else {
      // Switch to the new section and open the sheet
      setMobileSection(sectionKey)
      setSheetOpen(true)
    }
  }

  return (
    <>
      {/* ── Desktop: fixed 220px sidebar ────────────────────────────────── */}
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

      {/* ── Mobile: bottom tab bar + slide-up sheet ──────────────────────── */}
      <div className="lg:hidden">
        <MobileBottomNav
          activeSection={mobileSection}
          onTabTap={handleTabTap}
        />
        <MobileSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          activeSection={mobileSection}
          pathname={pathname}
          onSignOut={signOut}
        />
      </div>
    </>
  )
}