'use client'
// src/components/student/StudentNav.jsx — v2
// ─────────────────────────────────────────────────────────────────────────────
// Student navigation, rendered by app/student/layout.js:
//   StudentSidebar    desktop (≥1024px): every section + the rank card
//   StudentBottomNav  phones: Home · Practice · Battle · Leaderboard · Profile,
//                     plus the Flashcards button (phones only — on desktop,
//                     flashcards live under Learn)
//   NAV               every section, also used by the layout to work out
//                     which one is active from the URL
// Styles for the bottom nav and flashcards button: ./StudentNav.module.css.
//
// v2: Battle added to the sidebar and bottom nav (it replaces nothing: the
//     bottom nav goes from 4 tabs to 5). The Learning Tools sheet is replaced
//     by a Flashcards button that opens flashcards directly. The rank card
//     reads lib/ranks.js instead of its own copy of the rank tables.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { getRankProgress } from '@/lib/ranks'
import n from './StudentNav.module.css'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

export const NAV = [
  { id:'home',        label:'Home',        href:'/student/home',        icon:'🏠', bg:'rgba(6,42,120,.1)'    },
  { id:'learn',       label:'Learn',       href:'/student/learn',       icon:'📖', bg:'rgba(24,183,242,.1)'  },
  { id:'practice',    label:'Practice',    href:'/student/practice',    icon:'✏️', bg:'rgba(255,106,0,.1)'   },
  { id:'battle',      label:'Battle',      href:'/student/battle',      icon:'🎮', bg:'rgba(124,58,237,.12)' },
  { id:'leaderboard', label:'Leaderboard', href:'/student/leaderboard', icon:'🏆', bg:'rgba(255,184,0,.12)'  },
  { id:'progress',    label:'Progress',    href:'/student/progress',    icon:'📊', bg:'rgba(34,197,94,.1)'   },
  { id:'profile',     label:'Profile',     href:'/student/profile',     icon:'👤', bg:'rgba(6,42,120,.07)'   },
]

const BOTTOM_TABS = ['home', 'practice', 'battle', 'leaderboard', 'profile']

// No Flashcards button on the Battle hub (it would cover the mode cards) or
// on the flashcards screens themselves.
const NO_FAB_PATHS = ['/student/battle', '/student/learn/flashcards']

// ─── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
function SidebarLink({ item, on, dark }) {
  return (
    <Link href={item.href} style={{ textDecoration:'none' }} aria-current={on ? 'page' : undefined}>
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'9px 12px 9px 10px', borderRadius:14,
        background: on ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(18,100,229,.07)') : 'transparent',
        border:     on ? (dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(18,100,229,.14)') : '1px solid transparent',
        transition: 'background .12s',
      }}>
        <div style={{ width:36, height:36, borderRadius:11, flexShrink:0, background: on ? item.bg : (dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
          {item.icon}
        </div>
        <span style={{ fontSize:14, fontWeight:on?800:600, color: on ? (dark ? '#fff' : BLUE) : 'var(--text-sec)' }}>
          {item.label}
        </span>
        {on && <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:ORANGE, flexShrink:0 }}/>}
      </div>
    </Link>
  )
}

export function StudentSidebar({ active = 'home', dark }) {
  const { totalPoints: xp } = usePoints()
  const { rank, name: rankName, tier, pct: rankPct, xpToNext } = getRankProgress(xp || 0)
  const rankColor = tier.color

  return (
    <aside style={{
      width: 256, flexShrink: 0, position: 'sticky', top: 20,
      height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column',
      background:  dark ? 'rgba(14,17,32,.97)' : 'rgba(255,255,255,.95)',
      borderRadius: 22,
      border:      dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.09)',
      boxShadow:   dark ? '0 4px 32px rgba(0,0,0,.4)' : '0 4px 24px rgba(6,42,120,.09)',
      padding: '22px 14px 18px 16px',
      backdropFilter: 'blur(16px)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, margin:'0 0 26px 4px' }}>
        <div style={{ width:40, height:40, borderRadius:12, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:900, color:GOLD, letterSpacing:'-.02em' }}>EX</span>
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', lineHeight:1 }}>ExamPrep</div>
          <div style={{ fontSize:10, fontWeight:600, color:'var(--text-tert)', marginTop:3 }}>EXL Learning World</div>
        </div>
      </div>

      <nav aria-label="Main" style={{ display:'flex', flexDirection:'column', gap:4, flex:1, overflowY:'auto' }}>
        {NAV.filter(item => item.id !== 'profile').map(item => (
          <SidebarLink key={item.id} item={item} on={item.id === active} dark={dark} />
        ))}
        <div style={{ height:1, background:'var(--border)', margin:'8px 4px' }}/>
        <SidebarLink item={NAV.find(item => item.id === 'profile')} on={active === 'profile'} dark={dark} />
      </nav>

      {/* Rank card */}
      <div suppressHydrationWarning style={{
        borderRadius:16, padding:'14px', marginTop:14,
        background: dark ? 'rgba(255,255,255,.04)' : 'rgba(18,100,229,.05)',
        border:     dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(18,100,229,.1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-sec)' }}>Rank {rank}</div>
          <div title={`${tier.tier} tier`} style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:999, background:`${rankColor}1f`, color:rankColor, border:`1px solid ${rankColor}33` }}>{rankName}</div>
        </div>
        <div style={{ height:6, borderRadius:999, background:'var(--border)', overflow:'hidden', marginBottom:8 }}>
          <div style={{ height:'100%', width:`${rankPct}%`, borderRadius:999, background:`linear-gradient(90deg,${rankColor},${rankColor}99)`, transition:'width .8s ease' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-sec)' }}>{(xp || 0).toLocaleString()} XP</span>
          {rank < 100
            ? <span style={{ fontSize:11, color:'var(--text-tert)' }}>{xpToNext.toLocaleString()} to next</span>
            : <span style={{ fontSize:11, color:rankColor, fontWeight:800 }}>MAX 👑</span>}
        </div>
      </div>
    </aside>
  )
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
function TabIcon({ id, on }) {
  const stroke = { stroke:'currentColor', strokeWidth:1.9, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' }
  const fill   = on ? 'currentColor' : 'none'
  switch (id) {
    case 'home': return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19v-8.5z" {...stroke} fill={fill} fillOpacity={on ? .18 : 0}/>
      </svg>)
    case 'practice': return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 4.5l4 4L9 19H5v-4L15.5 4.5z" {...stroke} fill={fill} fillOpacity={on ? .18 : 0}/>
        <path d="M13 7l4 4" {...stroke}/>
      </svg>)
    case 'battle': return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.4 2.4 0 0 1-4.2 1L14 15h-4l-1.9 2.4a2.4 2.4 0 0 1-4.2-1l-.8-4A4.5 4.5 0 0 1 7.5 7z" {...stroke} fill={fill} fillOpacity={on ? .18 : 0}/>
        <path d="M8 10v3M6.5 11.5h3" {...stroke}/>
        <circle cx="15.5" cy="10.5" r=".9" fill="currentColor"/><circle cx="17" cy="12.5" r=".9" fill="currentColor"/>
      </svg>)
    case 'leaderboard': return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" {...stroke} fill={fill} fillOpacity={on ? .18 : 0}/>
        <path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" {...stroke}/>
      </svg>)
    case 'profile': return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" {...stroke} fill={fill} fillOpacity={on ? .18 : 0}/>
        <path d="M4.5 20.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7" {...stroke}/>
      </svg>)
    default: return null
  }
}

export function StudentBottomNav({ active = 'home' }) {
  const pathname = usePathname()
  const tabs = BOTTOM_TABS.map(id => NAV.find(item => item.id === id))
  const showFab = !NO_FAB_PATHS.some(path => pathname.startsWith(path))
  return (
    <>
      <nav className={n.bottomNav} aria-label="Main">
        {tabs.map(tab => {
          const on = tab.id === active
          return (
            <Link key={tab.id} href={tab.href} className={on ? `${n.tab} ${n.tabOn}` : n.tab} aria-current={on ? 'page' : undefined}>
              <span className={n.tabIcon}><TabIcon id={tab.id} on={on} /></span>
              <span className={n.tabLabel}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {showFab && <FlashcardsButton />}
    </>
  )
}

// ─── FLASHCARDS BUTTON (phones) ───────────────────────────────────────────────
// Shows its label at the top of a page, then shrinks to the icon once the
// student scrolls, so it never covers content they're reading.
function FlashcardsButton() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const update = () => setCompact(window.scrollY > 48)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <Link href="/student/learn/flashcards" className={compact ? `${n.fab} ${n.fabCompact}` : n.fab} aria-label="Flashcards">
      <span className={n.fabIcon} aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 28 28">
          <rect x="7.5" y="3.5" width="14" height="18" rx="3" transform="rotate(12 14.5 12.5)" fill="#C4B5FD" />
          <rect x="5" y="6" width="14" height="18" rx="3" fill="#fff" />
          <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22.5 3.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#FFD23F" />
        </svg>
      </span>
      <span className={n.fabLabel}>Flashcards</span>
    </Link>
  )
}
