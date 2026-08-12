'use client'
// src/components/ui/BottomNav.jsx — EXL Game Feel
// 5-item nav: Home / Practise / Learn / Leaderboard / Profile
// Active: EXL Cyan #18B7F2 with colour-specific accent per tab
// Animated dot indicator at top of active item

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ICONS = {
  Home: {
    active: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 10L11 3L19 10V19H14.5V14H7.5V19H3V10Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>),
    inactive: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 10L11 3L19 10V19H14.5V14H7.5V19H3V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none"/></svg>),
  },
  Practise: {
    active: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.5"/><path d="M9 8L15 11L9 14V8Z" fill="currentColor"/></svg>),
    inactive: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M9 8L15 11L9 14V8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/></svg>),
  },
  Learn: {
    active: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L3 8L11 13L19 8L11 3Z" fill="currentColor"/><path d="M6 11V17M16 11V17M6 17C6 17 8 19 11 19C14 19 16 17 16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>),
    inactive: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L3 8L11 13L19 8L11 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/><path d="M6 11V17M16 11V17M6 17C6 17 8 19 11 19C14 19 16 17 16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>),
  },
  Leaderboard: {
    active: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="13" width="4" height="7" rx="1" fill="currentColor"/><rect x="9" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/></svg>),
    inactive: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="13" width="4" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="9" y="9" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="16" y="5" width="4" height="15" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>),
  },
  Profile: {
    active: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="3" fill="currentColor"/><path d="M5 20C5 16.7 7.7 14 11 14C14.3 14 17 16.7 17 20" fill="currentColor" opacity=".8"/></svg>),
    inactive: (<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M5 20C5 16.7 7.7 14 11 14C14.3 14 17 16.7 17 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>),
  },
}

const NAV = [
  { href: '/student/dashboard', label: 'Home',        key: 'Home',        accent: '#18B7F2' },
  { href: '/student/practice',  label: 'Practise',    key: 'Practise',    accent: '#9b7ae0' },
  { href: '/student/learn',     label: 'Learn',       key: 'Learn',       accent: '#4ade80' },
  { href: '/student/community', label: 'Leaderboard', key: 'Leaderboard', accent: '#FFB800' },
  { href: '/student/profile',   label: 'Profile',     key: 'Profile',     accent: '#18B7F2' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const activeHref = NAV.find(({ href }) =>
    href === pathname || (href !== '/student/dashboard' && pathname.startsWith(href + '/'))
  )?.href ?? ''

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      height: 70,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--nav-border)',
      display: 'flex', alignItems: 'center', padding: '0 6px 10px',
    }}>
      {NAV.map(({ href, label, key, accent }) => {
        const isActive = href === activeHref
        const icons = ICONS[key]
        return (
          <Link key={href} href={href} prefetch={true} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 4px 0', borderRadius: 16,
            textDecoration: 'none',
            color: isActive ? accent : 'var(--text-tert)',
            position: 'relative',
            transition: 'all .18s',
          }}>
            {/* Active dot indicator */}
            <div style={{
              position: 'absolute', top: 2,
              width: isActive ? 16 : 0, height: 2.5,
              borderRadius: 2, background: accent,
              transition: 'width .2s cubic-bezier(.34,1.3,.64,1)',
              overflow: 'hidden',
            }} />

            <div style={{
              transform: isActive ? 'translateY(1px) scale(1.08)' : 'scale(1)',
              transition: 'transform .18s cubic-bezier(.34,1.3,.64,1)',
              lineHeight: 0,
            }}>
              {isActive ? icons.active : icons.inactive}
            </div>

            <span style={{
              fontSize: isActive ? 9.5 : 9, fontWeight: isActive ? 800 : 600,
              letterSpacing: '.01em', lineHeight: 1,
              color: isActive ? accent : 'var(--text-tert)',
              transition: 'all .15s',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}