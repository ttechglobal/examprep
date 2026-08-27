'use client'
// src/components/student/StudentTopbar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Uniform topbar for ALL student pages — desktop and mobile.
//
// Self-sufficient: fetches student name internally. No `name` prop needed.
// Name is cached in localStorage (ep_student_name) so it shows instantly
// on subsequent page loads with no flicker.
//
// XP and rank come from PointsContext — live, no prop needed.
// Both variants update automatically after practice sessions.
//
// Desktop: <DesktopTopbar searchPlaceholder?/>
// Mobile:  <MobileTopbar title extraAction?/>
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useTheme }  from '@/contexts/ThemeContext'
import { usePoints } from '@/contexts/PointsContext'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const NAVY = '#062A78'
const BLUE = '#1264E5'
const GOLD = '#FFB800'

// Inline rank helpers — same logic as src/lib/ranks.js
const _RANK_XP = (() => {
  const t = [0]
  for (let i = 1; i < 10; i++) t.push(t[t.length-1] + 200 + i * 20)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 500 + i * 50)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 1200 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 2500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 3800 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 5500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 7500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 9500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 12000 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 15000 + i * 100)
  return t
})()
const _RANK_NAMES = ['Newcomer','Beginner','Learner','Explorer','Starter','Rookie','Apprentice','Trainee','Challenger','Initiate','Solver','Thinker','Problem Solver','Quick Mind','Sharp Mind','Brainiac','Strategist','Tactician','Scholar','Achiever','Specialist','Expert','Ace','Mastermind','Genius','Elite','Prodigy','Virtuoso','Grand Solver','Master Solver','Elite Mind','Mastermind','Top Scholar','Brain Master','Logic Master','Knowledge Master','Question Master','Challenge Master','Exam Master','Learning Master','Rising Star','Star Scholar','Academic Star','Brain Champion','Knowledge Champion','Quiz Champion','Challenge Champion','Exam Champion','Learning Champion','Grand Champion','Legend','Rising Legend','Scholar Legend','Brain Legend','Knowledge Legend','Master Legend','Exam Legend','Learning Legend','Grand Legend','Legendary Mind','Mythic Learner','Mythic Solver','Mythic Scholar','Mythic Mind','Mythic Master','Mythic Genius','Mythic Champion','Mythic Strategist','Mythic Legend','Mythic Grandmaster','Royal Scholar','Crowned Scholar','Scholar King','Scholar Elite','Knowledge Royalty','Brain Royalty','Grand Scholar','Supreme Scholar','Royal Grandmaster','Crown Master','Cosmic Learner','Cosmic Solver','Cosmic Scholar','Cosmic Mind','Cosmic Master','Infinity Scholar','Infinity Master','Eternal Scholar','Ultimate Mind','Ultimate Master','Grandmaster','Supreme Grandmaster','Legendary Grandmaster','Master of Masters','Immortal Scholar','Transcendent Mind','Apex Scholar','Apex Master','Ultimate Scholar','The EXL Legend']

function getRankFromXp(xp) {
  let r = 1
  for (let i = _RANK_XP.length - 1; i >= 0; i--) { if (xp >= _RANK_XP[i]) { r = i + 1; break } }
  return Math.min(r, 100)
}

// ── Shared name hook — fetches once, caches in localStorage ──────────────────
function useStudentName() {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('ep_student_name') || '' } catch { return '' }
  })

  useEffect(() => {
    // If already cached, show it immediately then refresh in background
    async function fetchName() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single()
        const resolved = data?.full_name || data?.username || ''
        if (resolved) {
          setName(resolved)
          try { localStorage.setItem('ep_student_name', resolved) } catch {}
        }
      } catch {}
    }
    fetchName()
  }, [])

  return name
}

// ─── DESKTOP TOPBAR ───────────────────────────────────────────────────────────
export function DesktopTopbar({ searchPlaceholder = 'Search topics, questions, exams…' }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const name    = useStudentName()
  const rank    = getRankFromXp(xp)
  const rankName = _RANK_NAMES[rank - 1] ?? 'Newcomer'
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
        {/* XP pill */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>

        {/* Profile chip — name + rank */}
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name || 'Student'}</div>
              <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>{rankName}</div>
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
      {/* Left: logo + title */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{title}</span>
      </div>

      {/* Right: XP + extra + profile + dark toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()}</span>
        </div>

        {extraAction}

        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="4" stroke="var(--text-tert)" strokeWidth="1.7"/>
              <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--text-tert)" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </div>
        </Link>

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