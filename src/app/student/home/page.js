'use client'
// src/app/student/home/page.js — v7
// Uses shared StudentSidebar + StudentBottomNav from StudentNav component.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }
function getInitials(n) { return (n || 'EX').slice(0, 2).toUpperCase() }
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

// Zara motivational messages
const MSGS = [
  (n, l) => l > 0 ? `Just ${l} more ${l === 1 ? 'quest' : 'quests'} to go, ${n}!` : `All done today, ${n}. Excellent work!`,
  (n) => `You are on track, ${n}. Keep the momentum going.`,
  (n, l) => l > 0 ? `${n}, knock out those quests and earn your XP.` : `Every quest done. You owned today, ${n}.`,
  (n) => `Consistent effort every day is what separates you, ${n}.`,
]

// ─── SHARED BACKGROUND ───────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark ? 'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)' : 'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark ? (<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
        <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,184,0,.04)', filter:'blur(50px)', top:'40%', left:'40%' }}/>
      </>) : (<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
        <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(24,183,242,.03)', filter:'blur(40px)', top:'50%', right:'20%' }}/>
      </>)}
      {['📐','⚗️','📚','🧬','✏️','🔭'].map((ic,i)=>{
        const pos = [{top:'8%',right:'6%'},{top:'22%',left:'3%'},{top:'48%',right:'4%'},{bottom:'28%',left:'5%'},{bottom:'12%',right:'9%'},{top:'68%',left:'2%'}][i]
        return <div key={i} style={{ position:'absolute', fontSize:20, opacity:dark?0.08:0.06, userSelect:'none', ...pos }}>{ic}</div>
      })}
      {[[14,'12%','18%',GOLD],[10,'78%','8%',BLUE],[8,'45%','92%',CYAN],[12,'88%','55%',GOLD]].map(([sz,top,left,c],i)=>(
        <div key={i} style={{ position:'absolute', top, left, fontSize:sz, color:c, opacity:dark?0.16:0.1 }}>✦</div>
      ))}
    </div>
  )
}

// Sidebar + BottomNav come from shared StudentNav component (imported above)

// ─── SHARED CARD ─────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function SecLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>{children}</span>
      {right}
    </div>
  )
}

// ─── DESKTOP TOPBAR ──────────────────────────────────────────────────────────
function DesktopTopbar({ name, xp, dark, toggle }) {
  const level    = Math.floor((xp || 0) / 2000) + 1
  const initials = getInitials(name)
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:22 }}>
      {/* Search */}
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/><path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <input placeholder="Search topics, questions, exams…" style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
      </div>
      {/* Right cluster */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        {/* XP */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>
        {/* Hearts */}
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)' }}>
          <span style={{ fontSize:16 }}>💗</span>
          <span style={{ fontSize:13, fontWeight:900, color:'#f43f5e' }}>32</span>
        </div>
        {/* Profile chip */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name}</div>
            <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>Level {level} 👑</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}><path d="M3 4.5l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {/* Dark mode */}
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
function MobileTopbar({ name, xp, dark, toggle }) {
  const initials = getInitials(name)
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.92)':'rgba(249,250,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
        <div>
          <div style={{ fontSize:10, color:'var(--text-tert)', fontWeight:600 }}>Good {getGreeting()},</div>
          <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em', lineHeight:1.1 }}>{name} 👑</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()}</span>
        </div>
        {/* Notifications */}
        <div style={{ width:34, height:34, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M11 3C7.7 3 5 5.7 5 9V14L3 16H19L17 14V9C17 5.7 14.3 3 11 3Z" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/><path d="M9 18C9 19.1 9.9 20 11 20C12.1 20 13 19.1 13 18" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/></svg>
          <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:BLUE, border:'2px solid var(--bg-card)' }}/>
        </div>
        <button onClick={toggle} style={{ width:34, height:34, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── HERO / MASCOT BANNER ─────────────────────────────────────────────────────
function HeroBanner({ name, quests, xp, dark, isMobile = false }) {
  const leftCount = quests.filter(q => !q.completed).length
  const msg = MSGS[Math.floor(Date.now() / 86400000) % MSGS.length](name, leftCount)
  const level   = Math.floor((xp || 0) / 2000) + 1
  const xpInLvl = (xp || 0) % 2000
  const xpPct   = Math.min(100, Math.round((xpInLvl / 2000) * 100))

  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'22px 24px' }}>
      {/* Glow orb */}
      <div style={{ position:'absolute', top:0, right:0, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {/* Sparkles */}
      <div style={{ position:'absolute', top:14, right:'40%', fontSize:14, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'36%', fontSize:8, color:CYAN, opacity:.6 }}>✦</div>
      <div style={{ position:'absolute', bottom:20, right:'42%', fontSize:10, color:GOLD, opacity:.4 }}>✦</div>

      <div style={{ display:'flex', alignItems:'flex-end', gap:0 }}>
        {/* Left: text + optional XP pill (mobile only — desktop has sidebar) */}
        <div style={{ flex:1, zIndex:1 }}>
          <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.45)', marginBottom:6 }}>Good {getGreeting()}</div>
          <div style={{ fontSize:isMobile?18:20, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.25, marginBottom:12 }}>{msg}</div>
          <div style={{ fontSize:11, fontWeight:700, color:`${GOLD}cc`, marginBottom:isMobile?14:6 }}>— Zara, your study buddy</div>

          {/* XP progress pill — only on mobile (desktop: already in sidebar) */}
          {isMobile && (
            <div style={{ background:'rgba(255,255,255,.09)', backdropFilter:'blur(8px)', borderRadius:14, padding:'10px 13px', border:'1px solid rgba(255,255,255,.12)', display:'inline-flex', alignItems:'center', gap:9, minWidth:180 }}>
              <svg width="24" height="24" viewBox="0 0 44 44" aria-hidden="true" style={{ flexShrink:0 }}>
                <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill={NAVY} stroke={GOLD} strokeWidth="2.5"/>
                <text x="22" y="28" textAnchor="middle" fontSize="13" fill={GOLD} fontWeight="900">⚡</text>
              </svg>
              <div style={{ flex:1, minWidth:90 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.5)' }}>Level {level}</span>
                  <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.6)' }}>{xpInLvl.toLocaleString()} / 2,000</span>
                </div>
                <div style={{ height:5, borderRadius:999, background:'rgba(255,255,255,.15)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${xpPct}%`, borderRadius:999, background:`linear-gradient(90deg,${ORANGE},${GOLD})`, transition:'width .8s ease' }}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mascot — desktop: bigger (260×280), mobile: medium (155×170) */}
        <div style={{ width:isMobile?155:260, height:isMobile?170:280, flexShrink:0, position:'relative', zIndex:1, alignSelf:'flex-end', marginRight:isMobile?0:-4 }}>
          <img
            src="/images/zara_studybuddy.png"
            alt="Zara your study buddy"
            style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom center', display:'block', filter:'drop-shadow(0 6px 20px rgba(0,0,0,.45))' }}
            onError={e => { e.currentTarget.style.display='none' }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── TODAY'S QUESTS ───────────────────────────────────────────────────────────
function TodaysQuests({ quests, dark }) {
  const done = quests.filter(q => q.completed).length

  return (
    <div>
      <SecLabel
        right={
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:15 }}>🔥</span>
            <span style={{ fontSize:12, fontWeight:800, color:ORANGE }}>{done} / {quests.length} done</span>
          </div>
        }
      >
        Today's Quests
      </SecLabel>
      <Card>
        {quests.map((q, i) => (
          <div key={q.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:i<quests.length-1?'1px solid var(--border)':'none' }}>
            <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, background:q.completed?GREEN:'transparent', border:q.completed?'none':`2px solid ${dark?'rgba(255,255,255,.2)':'rgba(6,42,120,.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
              {q.completed && <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:q.completed?'var(--text-tert)':'var(--text-prim)', textDecoration:q.completed?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>{q.subtitle}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:800, color:q.completed?'var(--text-tert)':ORANGE }}>+{q.xp} XP</span>
              <div style={{ width:20, height:20, borderRadius:6, background:q.completed?'rgba(34,197,94,.1)':'rgba(255,106,0,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:9, fontWeight:900, color:q.completed?GREEN:ORANGE }}>XP</span>
              </div>
            </div>
          </div>
        ))}
        <Link href="/student/practice" style={{ textDecoration:'none' }}>
          <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:12, fontWeight:700, color:BLUE, background:dark?'rgba(18,100,229,.06)':'rgba(18,100,229,.03)', borderTop:'1px solid var(--border)', cursor:'pointer' }}>
            View all quests <span style={{ fontSize:14 }}>›</span>
          </div>
        </Link>
      </Card>
    </div>
  )
}

// ─── JUMP IN CARDS ────────────────────────────────────────────────────────────
function JumpInCards({ dark }) {
  const items = [
    { icon:'⚡', iconBg:`rgba(255,184,0,.2)`, label:'Speed Round', sub:'10 questions · 60 sec', xp:'+15 XP', isDark:false, href:'/student/practice?mode=speed' },
    { icon:'📋', iconBg:`rgba(255,255,255,.18)`, label:'Mock Exam', sub:'Full WAEC / JAMB format', xp:'+200 XP', isDark:true, href:'/student/practice?mode=mock' },
  ]
  return (
    <div>
      <SecLabel>Jump In</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {items.map(item => (
          <Link key={item.label} href={item.href} style={{ textDecoration:'none' }}>
            <div style={{ borderRadius:20, padding:'18px 16px', display:'flex', flexDirection:'column', gap:10, cursor:'pointer', background:item.isDark?`linear-gradient(145deg,${NAVY} 0%,#04194a 100%)`:'var(--bg-card)', border:item.isDark?`1px solid rgba(24,183,242,.2)`:'1px solid var(--border)', boxShadow:item.isDark?`0 6px 24px rgba(6,42,120,.4)`:'0 2px 10px rgba(6,42,120,.05)', minHeight:130, transition:'transform .15s', position:'relative', overflow:'hidden' }}>
              {item.isDark && <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.12) 0%,transparent 70%)', pointerEvents:'none' }}/>}
              <div style={{ width:44, height:44, borderRadius:'50%', background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:900, color:item.isDark?'#fff':'var(--text-prim)', marginBottom:3 }}>{item.label}</div>
                <div style={{ fontSize:11, color:item.isDark?'rgba(255,255,255,.5)':'var(--text-tert)' }}>{item.sub}</div>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:999, fontSize:10, fontWeight:800, background:item.isDark?'rgba(255,255,255,.15)':'rgba(255,184,0,.14)', color:item.isDark?'#fff':ORANGE, alignSelf:'flex-start' }}>⚡ {item.xp}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── EXAM GOALS ──────────────────────────────────────────────────────────────
function ExamGoals({ goals, exams, dark }) {
  const items = [
    { icon:'🏛️', label:'University', value:goals?.university||'Not set', color:BLUE },
    { icon:'📚', label:'Course',     value:goals?.course||'Not set',     color:PURPLE },
  ]
  if (!exams.length || exams.includes('WAEC')) items.push({ text:'WAEC', label:'WAEC target', value:goals?.waec||'Not set', color:NAVY })
  if (!exams.length || exams.includes('JAMB')) items.push({ text:'JAMB', label:'JAMB target', value:goals?.jamb||'Not set', color:ORANGE })

  return (
    <div>
      <SecLabel right={<Link href="/student/profile" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>Edit →</Link>}>
        Exam Goals
      </SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:16, padding:'13px 14px', display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)', boxShadow:'0 1px 6px rgba(6,42,120,.04)' }}>
            <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:`${item.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:item.text?11:18, fontWeight:900, color:item.color }}>
              {item.text || item.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:item.color, marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PRACTICE ACTIVITY ────────────────────────────────────────────────────────
function PracticeActivity({ activity, dark }) {
  const days = ['M','T','W','T','F','S','S']
  const todayIdx = (new Date().getDay() + 6) % 7
  const maxH = Math.max(...activity, 1)
  const total = activity.reduce((a,b)=>a+b,0)

  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Practice Activity</span>
        <span style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)' }}>This week</span>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:52, marginTop:14, marginBottom:8 }}>
        {days.map((d, i) => {
          const h = Math.max(Math.round((activity[i] / maxH) * 44), activity[i] > 0 ? 4 : 2)
          const isToday = i === todayIdx
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', borderRadius:'4px 4px 0 0', height:h, background:isToday?ORANGE:BLUE, opacity:isToday?1:activity[i]>0?0.55:0.12, transition:'height .4s' }}/>
              <span style={{ fontSize:9, fontWeight:700, color:isToday?ORANGE:'var(--text-tert)', textTransform:'uppercase' }}>{d}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:0, marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
        {[{val:total,label:'Questions'},{val:'68%',label:'Accuracy'},{val:`12🔥`,label:'Streak'}].map((s,i)=>(
          <div key={i} style={{ flex:1, textAlign:i===1?'center':i===2?'right':'left' }}>
            <div style={{ fontSize:16, fontWeight:900, color:i===2?ORANGE:'var(--text-prim)', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── LEADERBOARD SNAPSHOT ─────────────────────────────────────────────────────
function LeaderboardSnap({ board, myId, dark }) {
  const medals = ['🥇','🥈','🥉']
  const avBgs  = [`${GOLD}22`,`${BLUE}20`,`${ORANGE}18`,`${CYAN}18`,`${NAVY}14`]
  const avCols = [GOLD, BLUE, ORANGE, CYAN, NAVY]

  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Leaderboard</span>
        <Link href="/student/leaderboard" style={{ textDecoration:'none', fontSize:11, fontWeight:700, color:BLUE }}>See all →</Link>
      </div>
      <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:14 }}>School · This week</div>
      {board.length === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-tert)', padding:'12px 0', textAlign:'center' }}>Start practising to rank!</div>
      ) : board.map((entry, i) => {
        const isMe = entry.student_id === myId
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 6px', borderBottom:i<board.length-1?'1px solid var(--border)':'none', background:isMe?`${BLUE}08`:'transparent', borderRadius:isMe?10:0 }}>
            <span style={{ fontSize:i<3?13:10, width:22, textAlign:'center', flexShrink:0, fontWeight:800, color:'var(--text-tert)' }}>{i<3?medals[i]:i+1}</span>
            <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, background:avBgs[i%5], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:avCols[i%5] }}>
              {(entry.first_name||'S').charAt(0)}
            </div>
            <span style={{ flex:1, fontSize:12, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {isMe?'You':entry.first_name}
            </span>
            <span style={{ fontSize:11, fontWeight:800, color:isMe?GOLD:'var(--text-tert)', flexShrink:0 }}>{(entry.points||0).toLocaleString()} XP</span>
          </div>
        )
      })}
    </Card>
  )
}

// ─── CONSISTENCY BANNER ───────────────────────────────────────────────────────
function ConsistencyBanner() {
  return (
    <div style={{ borderRadius:20, background:'rgba(255,184,0,.06)', border:`1px solid ${GOLD}30`, padding:'18px 22px', display:'flex', alignItems:'center', gap:14, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', right:-20, top:-20, width:130, height:130, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ fontSize:36, flexShrink:0 }}>🏆</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:3 }}>Consistency is your superpower! 💪</div>
        <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>Keep practising daily and watch yourself level up.</div>
      </div>
      <div style={{ flexShrink:0, fontSize:32, zIndex:1 }}>⭐</div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router  = useRouter()
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
    const pool = [
      {id:1, title:`Solve 8 ${s0} questions`,  subtitle:'Keep your streak going!', xp:20, completed:false},
      {id:2, title:`${s1} speed round`,          subtitle:'10 questions · 60 sec',   xp:15, completed:false},
      {id:3, title:`Score 60%+ in ${s2}`,        subtitle:`${s2} practice set`,      xp:25, completed:false},
      {id:4, title:"Revise today's lesson",       subtitle:'Quick recap',             xp:10, completed:false},
    ]
    localStorage.setItem('ep_quests', JSON.stringify({date:new Date().toISOString().slice(0,10), quests:pool}))
    setQuests(pool)
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
          setProfile({username:guest.username, subjects:guest.subjects||[]})
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
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const name = cap(profile?.username||profile?.full_name?.split(' ')[0]||'Student')

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      <AppBackground dark={dark}/>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1340, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="home" xp={xp} dark={dark}/>

          {/* Main area: topbar + two-col body */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            {/* Topbar stretches full width of this area */}
            <DesktopTopbar name={name} xp={xp} dark={dark} toggle={toggle}/>

            {/* Two-col body below topbar */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'flex-start' }}>
              {/* Centre feed */}
              <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
                <HeroBanner name={name} quests={quests} xp={xp} dark={dark} isMobile={false}/>
                <TodaysQuests quests={quests} dark={dark}/>
                <ExamGoals goals={goals} exams={exams} dark={dark}/>
                <ConsistencyBanner/>
              </div>

              {/* Right column — sticky */}
              <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:14 }}>
                <PracticeActivity activity={activity} dark={dark}/>
                <LeaderboardSnap board={board} myId={myId} dark={dark}/>
                <JumpInCards dark={dark}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar name={name} xp={xp} dark={dark} toggle={toggle}/>
        <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:20 }}>
          <HeroBanner name={name} quests={quests} xp={xp} dark={dark} isMobile={true}/>
          <TodaysQuests quests={quests} dark={dark}/>
          <ExamGoals goals={goals} exams={exams} dark={dark}/>
          <JumpInCards dark={dark}/>
          <ConsistencyBanner/>
        </div>
        <StudentBottomNav active="home" dark={dark}/>
      </div>
    </>
  )
}