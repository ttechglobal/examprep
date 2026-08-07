'use client'
// src/components/ui/BottomNav.jsx — v3
// CHANGE: Profile replaced by Progress in bottom nav. Profile moved to header.

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ICONS = {
  Home: {
    active: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 8.5L10 2.5L17 8.5V17C17 17.55 16.55 18 16 18H13V13H7V18H4C3.45 18 3 17.55 3 17V8.5Z" fill="currentColor" />
      </svg>
    ),
    inactive: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 8.5L10 2.5L17 8.5V17C17 17.55 16.55 18 16 18H13V13H7V18H4C3.45 18 3 17.55 3 17V8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  Practise: {
    active: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" fill="currentColor" opacity=".15"/>
        <path d="M7.5 6.5L14 10L7.5 13.5V6.5Z" fill="currentColor"/>
        <path d="M14 7V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    inactive: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 7L14 10L8 13V7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  Learn: {
    active: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3L2 7.5L10 12L18 7.5L10 3Z" fill="currentColor"/>
        <path d="M5 10V15C5 15 7 17 10 17C13 17 15 15 15 15V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <path d="M18 7.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    inactive: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3L2 7.5L10 12L18 7.5L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        <path d="M5 10V15C5 15 7 17 10 17C13 17 15 15 15 15V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M18 7.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  Community: {
    active: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" fill="currentColor"/>
        <circle cx="4.5" cy="9" r="2.2" fill="currentColor" opacity=".6"/>
        <circle cx="15.5" cy="9" r="2.2" fill="currentColor" opacity=".6"/>
        <path d="M4 17C4 14.24 6.69 12 10 12C13.31 12 16 14.24 16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <path d="M1 17C1 15.34 2.57 14 4.5 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".6"/>
        <path d="M19 17C19 15.34 17.43 14 15.5 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".6"/>
      </svg>
    ),
    inactive: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="4.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
        <circle cx="15.5" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
        <path d="M4 17C4 14.24 6.69 12 10 12C13.31 12 16 14.24 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M1 17C1 15.34 2.57 14 4.5 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        <path d="M19 17C19 15.34 17.43 14 15.5 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  Progress: {
    active: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="12" width="3.5" height="6" rx="1" fill="currentColor"/>
        <rect x="8.25" y="8" width="3.5" height="10" rx="1" fill="currentColor"/>
        <rect x="14.5" y="4" width="3.5" height="14" rx="1" fill="currentColor"/>
      </svg>
    ),
    inactive: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="12" width="3.5" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="8.25" y="8" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="14.5" y="4" width="3.5" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
}

const NAV = [
  { href: '/student/dashboard', label: 'Home',      key: 'Home'      },
  { href: '/student/practice',  label: 'Practise',  key: 'Practise'  },
  { href: '/student/learn',     label: 'Learn',     key: 'Learn'     },
  { href: '/student/community', label: 'Community', key: 'Community' },
  { href: '/student/progress',  label: 'Progress',  key: 'Progress'  },
]

const ACCENT_BY_PATH = {
  '/student/dashboard': '#0b1330',
  '/student/practice':  '#9b7ae0',
  '/student/learn':     '#5cb8ea',
  '/student/community': '#6cce8e',
  '/student/progress':  '#f59e0b',
}

export default function BottomNav() {
  const pathname = usePathname()
  const activeHref = NAV.find(({ href }) =>
    href === pathname ||
    (href !== '/student/dashboard' && pathname.startsWith(href + '/'))
  )?.href ?? ''
  const accent = ACCENT_BY_PATH[activeHref] ?? '#0b1330'

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 12px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        maxWidth: 480, margin: '0 auto',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 26,
        border: '1px solid var(--nav-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '6px 4px',
        pointerEvents: 'auto',
      }}>
        {NAV.map(({ href, label, key }) => {
          const isActive = href === activeHref
          const icons = ICONS[key]

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '7px 4px 5px',
                borderRadius: 18,
                textDecoration: 'none',
                color: isActive ? accent : 'var(--text-tert)',
                background: isActive ? `${accent}10` : 'transparent',
                transition: 'all 0.18s cubic-bezier(0.34,1.3,0.64,1)',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 5,
                width: isActive ? 18 : 0,
                height: 2.5,
                borderRadius: 2,
                background: accent,
                transition: 'width 0.2s cubic-bezier(0.34,1.3,0.64,1)',
                overflow: 'hidden',
              }} />
              <div style={{
                transform: isActive ? 'translateY(1px) scale(1.08)' : 'scale(1)',
                transition: 'transform 0.18s cubic-bezier(0.34,1.3,0.64,1)',
                lineHeight: 0,
              }}>
                {isActive ? icons.active : icons.inactive}
              </div>
              <span style={{
                fontSize: isActive ? 9.5 : 9,
                fontWeight: isActive ? 800 : 600,
                letterSpacing: isActive ? '-0.01em' : '0',
                lineHeight: 1,
                color: isActive ? accent : 'var(--text-tert)',
                transition: 'all 0.15s',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
