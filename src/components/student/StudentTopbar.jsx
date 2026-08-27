'use client'
// src/components/student/StudentTopbar.jsx
// Shared topbar for all student pages — desktop and mobile variants.
//
// XP is read from PointsContext — no xp prop needed.
// Both variants update automatically when setTotalPoints() is called after a
// practice session is saved.
//
// Desktop props: name, searchPlaceholder?
// Mobile props:  title, extraAction?

import { useTheme } from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import Link from 'next/link'

const NAVY = '#062A78'
const BLUE = '#1264E5'
const GOLD = '#FFB800'
const RED  = '#f43f5e'

// ─── DESKTOP TOPBAR ───────────────────────────────────────────────────────────
export function DesktopTopbar({ name, searchPlaceholder = 'Search topics, questions, exams…' }) {
  const { dark, toggle }     = useTheme()
  const { totalPoints: xp }  = usePoints()
  const level    = Math.floor((xp || 0) / 2000) + 1
  const initials = (name || 'EX').slice(0, 2).toUpperCase()

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:22 }}>
      {/* Search */}
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/>
            <path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <input
          placeholder={searchPlaceholder}
          style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}
        />
      </div>

      {/* Right cluster */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        {/* XP pill — live from context */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>

        {/* Hearts placeholder */}
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)' }}>
          <span style={{ fontSize:16 }}>💗</span>
          <span style={{ fontSize:13, fontWeight:900, color:RED }}>32</span>
        </div>

        {/* Profile chip */}
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name}</div>
              <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>Level {level} 👑</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}>
              <path d="M3 4.5l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Link>

        {/* Dark mode toggle */}
        <button onClick={toggle} style={{ width:36, height:36, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="15" height="15" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="15" height="15" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── MOBILE TOPBAR ────────────────────────────────────────────────────────────
export function MobileTopbar({ title, extraAction }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.92)':'rgba(249,250,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      {/* Left: logo + page title */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{title}</span>
      </div>

      {/* Right: XP + optional action + profile + dark toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* XP pill — live from context */}
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()}</span>
        </div>

        {extraAction}

        {/* Profile icon */}
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="4" stroke="var(--text-tert)" strokeWidth="1.7"/>
              <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--text-tert)" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </div>
        </Link>

        {/* Dark mode toggle */}
        <button onClick={toggle} style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>
    </div>
  )
}