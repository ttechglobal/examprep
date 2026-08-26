'use client'
// src/app/student/home/page.js — v5
// Full rebuild with: improved backgrounds, proper dark mode, new sidebar + bottom nav
// Desktop 3-col | Mobile single-col
// Mascot: /images/zara_studybuddy.png

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }
function getInitials(n) { return (n || 'EX').slice(0, 2).toUpperCase() }
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

// ─── ZARA MESSAGES ────────────────────────────────────────────────────────────
const MSGS = [
  (n, l) => l > 0 ? `Just ${l} more ${l === 1 ? 'quest' : 'quests'} to go, ${n}!` : `All done today, ${n}. Excellent work!`,
  (n) => `You are on track, ${n}. Keep the momentum going.`,
  (n, l) => l > 0 ? `${n}, knock out those quests and earn your XP.` : `Every quest done. You owned today, ${n}.`,
  (n) => `Consistent effort every day is what separates you, ${n}.`,
]

// ─── APP BACKGROUND — learning environment atmosphere ─────────────────────────
// Dot grid + soft orbs + barely-visible subject icons
function AppBackground({ dark }) {
  const icons = ['📐', '⚗️', '📚', '🧬', '✏️', '🔭']
  const positions = [
    { top: '8%', right: '6%', size: 24 },
    { top: '22%', left: '3%', size: 20 },
    { top: '45%', right: '4%', size: 18 },
    { bottom: '28%', left: '5%', size: 22 },
    { bottom: '12%', right: '8%', size: 16 },
    { top: '65%', left: '2%', size: 14 },
  ]

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: dark
          ? 'radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)'
          : 'radial-gradient(circle, rgba(6,42,120,.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}/>

      {/* Colour orbs */}
      {dark ? (
        <>
          <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.1)', filter:'blur(60px)', top:-80, right:-60 }}/>
          <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(6,42,120,.18)', filter:'blur(60px)', bottom:-60, left:-60 }}/>
          <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(255,184,0,.04)', filter:'blur(50px)', top:'40%', left:'35%' }}/>
        </>
      ) : (
        <>
          <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(18,100,229,.06)', filter:'blur(50px)', top:-60, right:-40 }}/>
          <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', background:'rgba(255,184,0,.05)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
          <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(24,183,242,.04)', filter:'blur(40px)', top:'50%', right:'20%' }}/>
        </>
      )}

      {/* Floating subject icons */}
      {icons.map((ic, i) => (
        <div key={i} style={{
          position: 'absolute', fontSize: positions[i].size,
          opacity: dark ? 0.1 : 0.08,
          ...positions[i],
          userSelect: 'none',
        }}>{ic}</div>
      ))}

      {/* Subtle corner sparkles */}
      {[[14,'12%','18%',GOLD],[10,'78%','8%',BLUE],[8,'45%','92%',CYAN],[12,'88%','55%',GOLD]].map(([sz,top,left,c],i)=>(
        <div key={`sp${i}`} style={{ position:'absolute', top, left, fontSize:sz, color:c, opacity: dark?0.18:0.12 }}>✦</div>
      ))}
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 18,
      border: '1px solid var(--border)',
      boxShadow: '0 2px 12px rgba(6,42,120,.06)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  )
}

function SecHead({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.025em' }}>{title}</span>
      {right}
    </div>
  )
}

// ─── XP SHIELD ────────────────────────────────────────────────────────────────
function XPShield({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" style={{ flexShrink: 0 }}>
      <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill={NAVY} stroke={GOLD} strokeWidth="2.5"/>
      <text x="22" y="28" textAnchor="middle" fontSize="15" fill={GOLD} fontWeight="900">⚡</text>
    </svg>
  )
}

// ─── DARK MODE TOGGLE ─────────────────────────────────────────────────────────
function DarkBtn({ dark, toggle }) {
  return (
    <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
      width: 36, height: 36, borderRadius: 11,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>
      {dark
        ? <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
        : <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      }
    </button>
  )
}

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
// Each item has a study-themed icon + coloured badge background
const NAV = [
  { id: 'home',        label: 'Home',        href: '/student/home',        icon: '🏠', color: NAVY,   bg: 'rgba(6,42,120,.1)'   },
  { id: 'learn',       label: 'Learn',       href: '/student/learn',       icon: '📖', color: CYAN,   bg: 'rgba(24,183,242,.1)' },
  { id: 'practice',    label: 'Practice',    href: '/student/practice',    icon: '⚡', color: ORANGE, bg: 'rgba(255,106,0,.1)'  },
  { id: 'leaderboard', label: 'Leaderboard', href: '/student/leaderboard', icon: '🏆', color: GOLD,   bg: 'rgba(255,184,0,.1)'  },
  { id: 'progress',    label: 'Progress',    href: '/student/progress',    icon: '📊', color: GREEN,  bg: 'rgba(34,197,94,.1)'  },
  { id: 'profile',     label: 'Profile',     href: '/student/profile',     icon: '👤', color: NAVY,   bg: 'rgba(6,42,120,.07)'  },
]

// ─── DESKTOP LEFT SIDEBAR ─────────────────────────────────────────────────────
function DesktopSidebar({ xp, dark }) {
  const level = Math.floor((xp || 0) / 2000) + 1
  const xpInLevel = (xp || 0) % 2000
  const xpPct = Math.min(100, Math.round((xpInLevel / 2000) * 100))
  const mainNav = NAV.filter(n => n.id !== 'profile')
  const profileNav = NAV.filter(n => n.id === 'profile')

  return (
    <aside style={{
      width: 224, flexShrink: 0, paddingRight: 16,
      position: 'sticky', top: 20,
      height: 'calc(100vh - 40px)',
      display: 'flex', flexDirection: 'column',
      // Sidebar surface — richer than the page bg
      background: dark ? 'rgba(14,17,32,.95)' : 'rgba(255,255,255,.92)',
      borderRadius: 20,
      border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.08)',
      boxShadow: dark ? '0 4px 24px rgba(0,0,0,.35)' : '0 4px 24px rgba(6,42,120,.08)',
      padding: '18px 14px',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: GOLD, flexShrink: 0 }}>E</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-prim)', letterSpacing: '-.02em', lineHeight: 1 }}>ExamPrep</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tert)', marginTop: 1 }}>EXL Learning World</div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {mainNav.map(item => {
          const on = item.id === 'home'
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                borderRadius: 12, cursor: 'pointer',
                background: on ? (dark ? 'rgba(255,255,255,.09)' : `rgba(6,42,120,.07)`) : 'transparent',
                border: on ? (dark ? '1px solid rgba(255,255,255,.1)' : `1px solid rgba(6,42,120,.12)`) : '1px solid transparent',
                transition: 'all .12s',
              }}>
                {/* Coloured icon badge */}
                <div style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: on ? item.bg : (dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  transition: 'all .12s',
                }}>{item.icon}</div>
                <span style={{
                  fontSize: 13,
                  fontWeight: on ? 800 : 600,
                  color: on ? (dark ? '#fff' : NAVY) : 'var(--text-tert)',
                }}>{item.label}</span>
                {on && (
                  <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: BLUE, flexShrink: 0 }}/>
                )}
              </div>
            </Link>
          )
        })}

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }}/>

        {profileNav.map(item => (
          <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, cursor: 'pointer', border: '1px solid transparent' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{item.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tert)' }}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* XP card at bottom */}
      <div style={{
        borderRadius: 14, padding: 14, marginTop: 12,
        background: dark ? 'rgba(255,255,255,.04)' : '#f4f7ff',
        border: dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.08)',
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>
          Level {level} · Scholar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <XPShield size={30}/>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${ORANGE}, ${GOLD})` }}/>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tert)' }}>
          {xpInLevel.toLocaleString()} / 2,000 XP
        </div>
      </div>
    </aside>
  )
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
function MobileNav({ dark }) {
  const leftTabs  = [NAV[0], NAV[1]]   // Home, Learn
  const rightTabs = [NAV[3], NAV[4]]   // Leaderboard, Progress

  const tabStyle = (on) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '6px 10px', textDecoration: 'none', cursor: 'pointer',
    borderTop: on ? `3px solid ${dark ? CYAN : NAVY}` : '3px solid transparent',
  })

  return (
    <nav aria-label="Main navigation" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 70,
      // Richer surface for dark mode
      background: dark ? 'rgba(14,17,32,.97)' : 'rgba(255,255,255,.98)',
      borderTop: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(6,42,120,.08)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: dark ? '0 -4px 20px rgba(0,0,0,.4)' : '0 -4px 20px rgba(6,42,120,.06)',
    }}>
      {leftTabs.map((tab, i) => {
        const on = tab.id === 'home'
        return (
          <Link key={tab.id} href={tab.href} style={tabStyle(on)}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: on ? tab.bg : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, transition: 'all .15s',
            }}>{tab.icon}</div>
            <span style={{
              fontSize: 8, fontWeight: on ? 800 : 600,
              textTransform: 'uppercase', letterSpacing: '.07em',
              color: on ? (dark ? CYAN : NAVY) : 'var(--text-tert)',
            }}>{tab.label}</span>
          </Link>
        )
      })}

      {/* Practice FAB */}
      <Link href="/student/practice" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: -20 }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: dark ? `linear-gradient(135deg, ${BLUE}, ${NAVY})` : NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 20px rgba(6,42,120,.45)`,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5V19M5 12H19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: dark ? CYAN : NAVY }}>
          Practice
        </span>
      </Link>

      {rightTabs.map(tab => (
        <Link key={tab.id} href={tab.href} style={tabStyle(false)}>
          <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{tab.icon}</div>
          <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-tert)' }}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}

// ─── HERO CARD ────────────────────────────────────────────────────────────────
function HeroCard({ name, quests, xp }) {
  const leftCount = quests.filter(q => !q.completed).length
  const msg = MSGS[Math.floor(Date.now() / 86400000) % MSGS.length](name, leftCount)
  const level = Math.floor((xp || 0) / 2000) + 1
  const xpInLevel = (xp || 0) % 2000
  const xpPct = Math.min(100, Math.round((xpInLevel / 2000) * 100))

  return (
    <Card style={{ position: 'relative' }}>
      {/* Hero gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(18,100,229,.04) 0%, rgba(240,248,255,.5) 50%, rgba(255,245,228,.3) 100%)', pointerEvents: 'none' }}/>
      {/* Sparkles inside hero */}
      {[[9,14,GOLD,8],[42,7,BLUE,6],[74,7,CYAN,7],[6,55,GOLD,5],[48,65,ORANGE,4]].map(([x,y,c,s],i)=>(
        <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:s, height:s, borderRadius:'50%', background:c, opacity:.5, pointerEvents:'none' }}/>
      ))}
      {[[27,9,GOLD,10],[54,17,BLUE,8],[76,5,GOLD,8]].map(([x,y,c,fs],i)=>(
        <div key={`s${i}`} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, fontSize:fs, color:c, opacity:.55, pointerEvents:'none' }}>✦</div>
      ))}

      {/* Content */}
      <div style={{ position:'relative', display:'flex', alignItems:'flex-end', minHeight:170 }}>
        <div style={{ flex:1, padding:'22px 0 18px 22px', zIndex:1 }}>
          <div style={{ fontSize:21, fontWeight:800, color:'var(--text-prim)', letterSpacing:'-.025em', lineHeight:1.3, marginBottom:8 }}>
            {msg}
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:ORANGE }}>— Zara, your study buddy</div>
        </div>
        <div style={{ flexShrink:0, alignSelf:'flex-end', zIndex:1 }}>
          <img
            src="/images/zara_studybuddy.png"
            alt="Zara your study buddy"
            width={148} height={172}
            style={{ display:'block', objectFit:'contain', objectPosition:'bottom center' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>

      {/* XP bar */}
      <div style={{
        position:'relative', margin:'0 16px 16px',
        background:'var(--bg-subtle)', borderRadius:14, padding:'10px 14px',
        display:'flex', alignItems:'center', gap:12, border:'1px solid var(--border)',
      }}>
        <XPShield size={36}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'var(--text-tert)', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:5 }}>
            Level {level}
          </div>
          <div style={{ height:7, borderRadius:4, background:'var(--border)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${xpPct}%`, borderRadius:4, background:`linear-gradient(90deg, ${ORANGE}, ${GOLD})`, transition:'width .8s ease' }}/>
          </div>
        </div>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', whiteSpace:'nowrap' }}>
          {xpInLevel.toLocaleString()} / 2,000 XP
        </div>
      </div>
    </Card>
  )
}

// ─── QUEST LIST ───────────────────────────────────────────────────────────────
function QuestList({ quests }) {
  const done = quests.filter(q => q.completed).length
  return (
    <div>
      <SecHead title="Today's Quests" right={
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:'var(--text-tert)' }}>
          <span style={{ fontSize:15 }}>🔥</span>
          <span style={{ fontWeight:900, color:'var(--text-prim)' }}>{done}</span>
          <span>/ {quests.length} completed</span>
        </div>
      }/>
      <Card>
        {quests.map((q, i) => (
          <div key={q.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i < quests.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, background:q.completed?BLUE:'transparent', border:q.completed?'none':'2px solid var(--border-strong)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {q.completed && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:q.completed?'var(--text-tert)':'var(--text-prim)', textDecoration:q.completed?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{q.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>{q.subtitle}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:800, color:q.completed?GREEN:BLUE }}>+{q.xp} XP</span>
              <div style={{ width:20, height:20, borderRadius:'50%', background:q.completed?GREEN:GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M5.5 1L3 5.5H5L4.5 9L7 4.5H5L5.5 1Z" fill="#fff"/></svg>
              </div>
            </div>
          </div>
        ))}
        <Link href="/student/practice" style={{ textDecoration:'none' }}>
          <div style={{ padding:'12px 16px', textAlign:'center', fontSize:13, fontWeight:700, color:BLUE, background:'rgba(18,100,229,.03)', borderTop:'1px solid var(--border)', cursor:'pointer' }}>
            View all quests ›
          </div>
        </Link>
      </Card>
    </div>
  )
}

// ─── EXAM GOALS ───────────────────────────────────────────────────────────────
function ExamGoals({ goals, exams }) {
  const base = [
    { icon:'🏛️', label:'University', value:goals?.university||'Not set', bg:'rgba(18,100,229,.08)' },
    { icon:'📚', label:'Course',     value:goals?.course||'Not set',     bg:'rgba(18,100,229,.08)' },
  ]
  if (!exams || exams.includes('WAEC')) base.push({ label:'WAEC target', value:goals?.waec||'Not set', bg:'rgba(6,42,120,.08)', text:'WAEC', textColor:NAVY })
  if (!exams || exams.includes('JAMB')) base.push({ label:'JAMB target', value:goals?.jamb||'Not set', bg:'rgba(255,106,0,.08)', text:'JAMB', textColor:ORANGE })

  return (
    <div>
      <SecHead title="Exam Goals" right={
        <Link href="/student/profile" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:ORANGE }}>Edit</Link>
      }/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
        {base.map((item, i) => (
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:14, padding:'12px 13px', display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)', boxShadow:'0 1px 4px rgba(6,42,120,.04)' }}>
            <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:item.text?11:18, fontWeight:900, color:item.textColor }}>
              {item.text || item.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:ORANGE, marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PRACTICE ACTIVITY ────────────────────────────────────────────────────────
function PracticeActivity({ activity }) {
  const days = ['M','T','W','T','F','S','S']
  const todayIdx = (new Date().getDay() + 6) % 7
  const maxH = Math.max(...activity, 1)
  return (
    <Card style={{ padding:16 }}>
      <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>Practice Activity</div>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:12 }}>This week</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:56 }}>
        {days.map((d, i) => {
          const h = Math.max(Math.round((activity[i] / maxH) * 48), activity[i] > 0 ? 4 : 2)
          const isToday = i === todayIdx
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', borderRadius:'3px 3px 0 0', height:h, background:isToday?NAVY:BLUE, opacity:isToday?1:activity[i]>0?0.55:0.15, transition:'height .4s' }}/>
              <span style={{ fontSize:9, fontWeight:700, color:isToday?NAVY:'var(--text-tert)', textTransform:'uppercase' }}>{d}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
        {[{val:activity.reduce((a,b)=>a+b,0),label:'Questions'},{val:'68%',label:'Accuracy'},{val:'5🔥',label:'Streak'}].map((s,i)=>(
          <div key={i}>
            <div style={{ fontSize:17, fontWeight:900, color:i===2?ORANGE:'var(--text-prim)', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── LEADERBOARD SNAPSHOT ─────────────────────────────────────────────────────
function LeaderboardSnap({ board, myId }) {
  const medals = ['🥇','🥈','🥉']
  const avBgs  = [`rgba(255,184,0,.15)`,`rgba(18,100,229,.12)`,`rgba(255,106,0,.1)`,`rgba(24,183,242,.1)`,`rgba(6,42,120,.08)`]
  const avCols = [GOLD, BLUE, ORANGE, CYAN, NAVY]

  return (
    <Card style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)' }}>Leaderboard</span>
        <Link href="/student/leaderboard" style={{ textDecoration:'none', fontSize:11, fontWeight:700, color:BLUE }}>See all →</Link>
      </div>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:12 }}>School · This week</div>
      {board.length === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-tert)', padding:'8px 0', textAlign:'center' }}>
          No data yet — start practising to rank!
        </div>
      ) : board.map((entry, i) => {
        const isMe = entry.student_id === myId
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 4px', borderBottom:i<board.length-1?'1px solid var(--border)':'none', background:isMe?'rgba(18,100,229,.05)':'transparent', borderRadius:isMe?8:0 }}>
            <span style={{ fontSize:i<3?13:10, width:20, textAlign:'center', flexShrink:0 }}>
              {i < 3 ? medals[i] : <span style={{ fontWeight:800, color:'var(--text-tert)', fontSize:11 }}>{i+1}</span>}
            </span>
            <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, background:avBgs[i%5], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:avCols[i%5] }}>
              {(entry.first_name||'S').charAt(0)}
            </div>
            <span style={{ flex:1, fontSize:12, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {isMe?'You':entry.first_name}
            </span>
            <span style={{ fontSize:11, fontWeight:800, color:isMe?GOLD:'var(--text-tert)', flexShrink:0 }}>
              {(entry.points||0).toLocaleString()} XP
            </span>
          </div>
        )
      })}
    </Card>
  )
}

// ─── JUMP IN ──────────────────────────────────────────────────────────────────
function JumpIn() {
  const items = [
    { icon:'⚡', iconBg:`rgba(255,184,0,.15)`, title:'Speed Round',  sub:'10 questions · 60 sec',  xp:'+15 XP', dark:false, href:'/student/practice?mode=speed' },
    { icon:'📋', iconBg:`rgba(255,255,255,.15)`, title:'Mock Exam', sub:'Full WAEC / JAMB format',  xp:'+50 XP', dark:true,  href:'/student/practice?mode=mock'  },
  ]
  return (
    <div>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:10 }}>Jump in</div>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {items.map(item => (
          <Link key={item.title} href={item.href} style={{ textDecoration:'none' }}>
            <div style={{
              display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:16, cursor:'pointer',
              background:item.dark?`linear-gradient(135deg, ${NAVY} 0%, #04194a 100%)`:'var(--bg-card)',
              border:item.dark?'none':'1px solid var(--border)',
              boxShadow:item.dark?`0 4px 16px rgba(6,42,120,.3)`:'0 2px 8px rgba(6,42,120,.04)',
            }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{item.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color:item.dark?'#fff':'var(--text-prim)', marginBottom:2 }}>{item.title}</div>
                <div style={{ fontSize:11, color:item.dark?'rgba(255,255,255,.5)':'var(--text-tert)' }}>{item.sub}</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:3, marginTop:5, padding:'3px 8px', borderRadius:999, fontSize:10, fontWeight:800, background:item.dark?'rgba(255,255,255,.15)':`rgba(255,184,0,.14)`, color:item.dark?'#fff':ORANGE }}>⚡ {item.xp}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3L9 7L5 11" stroke={item.dark?'rgba(255,255,255,.4)':'var(--text-tert)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter()
  const { dark, toggle } = useTheme()
  const [profile,  setProfile]  = useState(null)
  const [quests,   setQuests]   = useState([])
  const [goals,    setGoals]    = useState(null)
  const [exams,    setExams]    = useState([])
  const [xp,       setXp]       = useState(0)
  const [board,    setBoard]    = useState([])
  const [myId,     setMyId]     = useState(null)
  const [activity, setActivity] = useState([0,0,0,0,0,0,0])
  const [loading,  setLoading]  = useState(true)

  function buildQuests(prof) {
    try {
      const c = JSON.parse(localStorage.getItem('ep_quests')||'{}')
      if (c.date===new Date().toISOString().slice(0,10) && c.quests?.length) { setQuests(c.quests); return }
    } catch {}
    const subs = prof?.subjects||[]
    const [s0='Mathematics',s1='Biology',s2='Chemistry'] = subs
    const day = new Date().getDay()
    const count = (day===0||day===6)?2:day<=2?3:4
    const pool = [
      {id:1,title:`Solve 8 ${s0} questions`,   subtitle:'Keep your streak going!',xp:20,completed:false},
      {id:2,title:`${s1} speed round`,           subtitle:'10 questions · 60 sec',  xp:15,completed:false},
      {id:3,title:`Score 60%+ in ${s2}`,         subtitle:`${s2} practice set`,     xp:25,completed:false},
      {id:4,title:"Revise today's lesson",        subtitle:'Quick recap',            xp:10,completed:false},
    ]
    const daily = pool.slice(0,count)
    localStorage.setItem('ep_quests',JSON.stringify({date:new Date().toISOString().slice(0,10),quests:daily}))
    setQuests(daily)
  }

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data:{session} } = await supabase.auth.getSession()
      if (session?.user) {
        setMyId(session.user.id)
        const [profRes, boardRes] = await Promise.all([
          supabase.from('profiles').select('username,full_name,total_points,exam_types,subjects,target_university,target_course,target_waec,target_jamb,onboarded').eq('id',session.user.id).single(),
          fetch('/api/leaderboard/global?limit=6&period=week').then(r=>r.json()).catch(()=>({leaderboard:[]})),
        ])
        const prof = profRes.data
        if (prof) {
          if (!prof.onboarded) { router.replace('/onboarding'); return }
          setProfile(prof)
          setExams(prof.exam_types||['WAEC','JAMB'])
          setGoals({university:prof.target_university||'Not set',course:prof.target_course||'Not set',waec:prof.target_waec||'Not set',jamb:prof.target_jamb||'Not set'})
          setXp(prof.total_points||0)
          buildQuests(prof)
        }
        setBoard(boardRes.leaderboard||[])
        const monday = new Date(); monday.setDate(monday.getDate()-((monday.getDay()+6)%7)); monday.setHours(0,0,0,0)
        const {data:attempts} = await supabase.from('question_attempts').select('created_at').eq('student_id',session.user.id).gte('created_at',monday.toISOString())
        if (attempts) {
          const counts = [0,0,0,0,0,0,0]
          attempts.forEach(a=>{ const d=new Date(a.created_at); counts[(d.getDay()+6)%7]++ })
          setActivity(counts)
        }
      } else {
        try {
          const guest = JSON.parse(localStorage.getItem('ep_guest')||'{}')
          if (!guest.onboarded) { router.replace('/onboarding'); return }
          setProfile({username:guest.username,subjects:guest.subjects||[]})
          setExams(guest.exams||['WAEC','JAMB'])
          setGoals({university:'Not set',course:'Not set',waec:'Not set',jamb:'Not set'})
          buildQuests({subjects:guest.subjects||[]})
        } catch { router.replace('/onboarding'); return }
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  },[router])

  useEffect(()=>{ load() },[load])

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const name = cap(profile?.username||profile?.full_name?.split(' ')[0]||'King')
  const av   = getInitials(name)

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Background */}
      <AppBackground dark={dark}/>

      {/* ══ DESKTOP ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1320, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:18, alignItems:'flex-start' }}>

          <DesktopSidebar xp={xp} dark={dark}/>

          {/* Centre */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:18 }}>
            {/* Desktop header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:12, color:'var(--text-tert)', fontWeight:600, marginBottom:2 }}>Good {getGreeting()},</div>
                <div style={{ fontSize:22, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1 }}>{name} 👑</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <DarkBtn dark={dark} toggle={toggle}/>
                <div style={{ width:38, height:38, borderRadius:12, background:NAVY, color:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>{av}</div>
              </div>
            </div>
            <HeroCard name={name} quests={quests} xp={xp}/>
            <QuestList quests={quests}/>
            <ExamGoals goals={goals} exams={exams}/>
          </div>

          {/* Right column */}
          <div style={{ width:288, flexShrink:0, display:'flex', flexDirection:'column', gap:14, position:'sticky', top:20 }}>
            <PracticeActivity activity={activity}/>
            <LeaderboardSnap board={board} myId={myId}/>
            <JumpIn/>
          </div>
        </div>
      </div>

      {/* ══ MOBILE ══════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:88, position:'relative', zIndex:1 }}>
        {/* Mobile header */}
        <div style={{ padding:'52px 16px 14px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#dce8ff,#c4d8ff)', border:`1.5px solid rgba(6,42,120,.12)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:NAVY, flexShrink:0 }}>{av}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-tert)', marginBottom:2 }}>Good {getGreeting()},</div>
            <div style={{ fontSize:19, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', lineHeight:1 }}>{name} 👑</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <DarkBtn dark={dark} toggle={toggle}/>
            <div style={{ width:36, height:36, borderRadius:11, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', cursor:'pointer' }}>
              <svg width="17" height="17" viewBox="0 0 22 22" fill="none" aria-label="Notifications"><path d="M11 3C7.7 3 5 5.7 5 9V14L3 16H19L17 14V9C17 5.7 14.3 3 11 3Z" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/><path d="M9 18C9 19.1 9.9 20 11 20C12.1 20 13 19.1 13 18" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/></svg>
              <div style={{ position:'absolute',top:7,right:7,width:7,height:7,borderRadius:'50%',background:BLUE,border:'2px solid var(--bg-card)' }}/>
            </div>
          </div>
        </div>
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:18 }}>
          <HeroCard name={name} quests={quests} xp={xp}/>
          <QuestList quests={quests}/>
          <ExamGoals goals={goals} exams={exams}/>
          <div>
            <SecHead title="Jump In"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
              {[
                {icon:'⚡',bg:`rgba(255,184,0,.15)`,title:'Speed Round',sub:'10 Qs · 60 sec',xp:'+15 XP',dark:false,href:'/student/practice?mode=speed'},
                {icon:'📋',bg:`rgba(255,255,255,.15)`,title:'Mock Exam',sub:'Full WAEC format',xp:'+50 XP',dark:true,href:'/student/practice?mode=mock'},
              ].map(item=>(
                <Link key={item.title} href={item.href} style={{ textDecoration:'none' }}>
                  <div style={{ borderRadius:18,padding:'14px 13px',display:'flex',flexDirection:'column',gap:8,cursor:'pointer',background:item.dark?`linear-gradient(135deg,${NAVY},#04194a)`:'var(--bg-card)',border:item.dark?'none':'1px solid var(--border)',boxShadow:item.dark?`0 5px 18px rgba(6,42,120,.3)`:'0 2px 8px rgba(6,42,120,.04)',minHeight:120 }}>
                    <div style={{ width:44,height:44,borderRadius:'50%',background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:21 }}>{item.icon}</div>
                    <div style={{ fontSize:13,fontWeight:900,color:item.dark?'#fff':'var(--text-prim)' }}>{item.title}</div>
                    <div style={{ fontSize:11,color:item.dark?'rgba(255,255,255,.5)':'var(--text-tert)',marginTop:-4 }}>{item.sub}</div>
                    <div style={{ display:'inline-flex',alignItems:'center',gap:3,padding:'3px 9px',borderRadius:999,fontSize:10,fontWeight:800,background:item.dark?'rgba(255,255,255,.15)':`rgba(255,184,0,.14)`,color:item.dark?'#fff':ORANGE,alignSelf:'flex-start' }}>⚡ {item.xp}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <MobileNav dark={dark}/>
      </div>
    </>
  )
}