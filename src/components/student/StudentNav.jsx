// src/components/student/StudentNav.jsx
// Shared sidebar + bottom nav used across ALL student pages.
// Import: import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'

'use client'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

export const NAV = [
  { id:'home',        label:'Home',     href:'/student/home',        icon:'🏠', bg:'rgba(6,42,120,.1)'   },
  { id:'learn',       label:'Learn',    href:'/student/learn',       icon:'📖', bg:'rgba(24,183,242,.1)' },
  { id:'practice',    label:'Practice', href:'/student/practice',    icon:'✏️', bg:'rgba(255,106,0,.1)'  },
  { id:'leaderboard', label:'Ranks',    href:'/student/leaderboard', icon:'🏆', bg:'rgba(255,184,0,.1)'  },
  { id:'progress',    label:'Progress', href:'/student/progress',    icon:'📊', bg:'rgba(34,197,94,.1)'  },
  { id:'profile',     label:'Profile',  href:'/student/profile',     icon:'👤', bg:'rgba(6,42,120,.07)'  },
]

// ─── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
// Props:
//   active  — id string matching NAV (e.g. 'home', 'practice')
//   xp      — total XP number (for level card)
//   dark    — boolean
export function StudentSidebar({ active = 'home', xp = 0, dark }) {
  const level   = Math.floor(xp / 2000) + 1
  const xpInLvl = xp % 2000
  const xpPct   = Math.min(100, Math.round((xpInLvl / 2000) * 100))

  return (
    <aside style={{
      width:220, flexShrink:0, position:'sticky', top:20,
      height:'calc(100vh - 40px)', display:'flex', flexDirection:'column',
      background: dark ? 'rgba(14,17,32,.97)' : 'rgba(255,255,255,.95)',
      borderRadius:20,
      border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.09)',
      boxShadow: dark ? '0 4px 32px rgba(0,0,0,.4)' : '0 4px 24px rgba(6,42,120,.09)',
      padding:'20px 14px', backdropFilter:'blur(16px)',
    }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:900, color:GOLD, letterSpacing:'-.02em' }}>EX</span>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', lineHeight:1 }}>ExamPrep</div>
          <div style={{ fontSize:9, fontWeight:600, color:'var(--text-tert)', marginTop:2 }}>EXL Learning World</div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
        {NAV.filter(n => n.id !== 'profile').map(item => {
          const on = item.id === active
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration:'none' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13,
                background: on ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(18,100,229,.07)') : 'transparent',
                border: on ? (dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(18,100,229,.14)') : '1px solid transparent',
                transition:'all .12s',
              }}>
                <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, background: on ? item.bg : (dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{item.icon}</div>
                <span style={{ fontSize:13, fontWeight:on?800:600, color: on ? (dark ? '#fff' : BLUE) : 'var(--text-tert)' }}>{item.label}</span>
                {on && <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:ORANGE, flexShrink:0 }}/>}
              </div>
            </Link>
          )
        })}

        <div style={{ height:1, background:'var(--border)', margin:'8px 4px' }}/>

        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13, border:'1px solid transparent' }}>
            <div style={{ width:32, height:32, borderRadius:10, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>👤</div>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text-tert)' }}>Profile</span>
          </div>
        </Link>
      </div>

      {/* Level / XP card */}
      <div style={{
        borderRadius:16, padding:'14px', marginTop:14,
        background: dark ? 'rgba(255,255,255,.04)' : 'rgba(18,100,229,.05)',
        border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(18,100,229,.1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)' }}>Level {level}</div>
          <div style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${GOLD}18`, color:GOLD, border:`1px solid ${GOLD}30` }}>Scholar</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <svg width="28" height="28" viewBox="0 0 44 44" aria-hidden="true" style={{ flexShrink:0 }}>
            <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill={NAVY} stroke={GOLD} strokeWidth="2.5"/>
            <text x="22" y="28" textAnchor="middle" fontSize="14" fill={GOLD} fontWeight="900">⚡</text>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ height:7, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${xpPct}%`, borderRadius:999, background:`linear-gradient(90deg,${ORANGE},${GOLD})`, transition:'width .8s ease' }}/>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{xpInLvl.toLocaleString()} XP</span>
          <span style={{ fontSize:10, color:'var(--text-tert)' }}>/ 2,000</span>
        </div>
      </div>
    </aside>
  )
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
// Props:
//   active — id string matching NAV
//   dark   — boolean
export function StudentBottomNav({ active = 'home', dark }) {
  const tabs = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]]
  const activeColor = active === 'home' ? BLUE : active === 'practice' ? ORANGE : BLUE

  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:100, height:68,
      background: dark ? 'rgba(10,13,28,.98)' : 'rgba(255,255,255,.98)',
      borderTop: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(6,42,120,.08)',
      backdropFilter:'blur(20px)', display:'flex', alignItems:'center',
      paddingBottom:'env(safe-area-inset-bottom)',
      boxShadow: dark ? '0 -4px 20px rgba(0,0,0,.4)' : '0 -4px 20px rgba(6,42,120,.06)',
    }}>
      {tabs.map(tab => {
        const on = tab.id === active
        const dotColor = tab.id === 'practice' ? ORANGE : BLUE
        return (
          <Link key={tab.id} href={tab.href} style={{
            textDecoration:'none', flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', gap:3, padding:'8px 0',
            borderTop:`2.5px solid ${on ? dotColor : 'transparent'}`,
          }}>
            <div style={{ width:28, height:28, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:on?18:16, background:on?tab.bg:'transparent', transition:'all .15s' }}>{tab.icon}</div>
            <span style={{ fontSize:9, fontWeight:on?800:600, textTransform:'uppercase', letterSpacing:'.06em', color:on?dotColor:'var(--text-tert)' }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}