'use client'
// src/app/student/learn/page.js — v1
// Learn page: EXL Learning World hero + Learn Tools (Flashcards, Key Formulas)
// + Activity Today + Continue Learning + motivational footer
// Desktop: shared sidebar + 2-col. Mobile: topbar + single col + bottom nav.

import { useState, useEffect } from 'react'
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
const RED    = '#f43f5e'

const SUBJ_COLOR = {
  'Mathematics':'#FF6A00','English Language':'#22c55e','Use of English':'#22c55e',
  'Physics':'#7C3AED','Chemistry':'#1264E5','Biology':'#18B7F2',
  'Further Mathematics':'#062A78','Economics':'#f43f5e','Government':'#9b7ae0',
  'Geography':'#34d399','Literature in English':'#f9a8d4','default':'#1264E5',
}
const SUBJ_ICON = {
  'Mathematics':'🧮','English Language':'📖','Use of English':'📖','Physics':'⚡',
  'Chemistry':'⚗️','Biology':'🧬','Further Mathematics':'📐','Economics':'📊',
  'Government':'🏛️','Geography':'🌍','Literature in English':'📚','default':'📝',
}
const getColor = n => SUBJ_COLOR[n] ?? SUBJ_COLOR.default
const getIcon  = n => SUBJ_ICON[n]  ?? SUBJ_ICON.default

// ─── BG ───────────────────────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage: dark?'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)':'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark?(<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>):(<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(124,58,237,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
      {['📖','🔬','⚡','🧬'].map((ic,i)=>{
        const pos=[{top:'8%',right:'6%'},{top:'35%',left:'3%'},{bottom:'25%',right:'4%'},{top:'65%',left:'2%'}][i]
        return <div key={i} style={{ position:'absolute', fontSize:18, opacity:dark?0.07:0.05, userSelect:'none', ...pos }}>{ic}</div>
      })}
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}

// ─── DESKTOP TOPBAR ───────────────────────────────────────────────────────────
function DesktopTopbar({ name, xp, dark, toggle }) {
  const level = Math.floor((xp||0)/2000)+1
  const initials = (name||'EX').slice(0,2).toUpperCase()
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/><path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <input placeholder="Search topics, lessons, formulas…" style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||12840).toLocaleString()} XP</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(244,63,94,.12)':'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)' }}>
          <span style={{ fontSize:16 }}>💗</span>
          <span style={{ fontSize:13, fontWeight:900, color:RED }}>32</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name}</div>
            <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>Level {level} 👑</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}><path d="M3 4.5l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
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
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.93)':'rgba(249,250,255,.93)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>Learn</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||12840).toLocaleString()}</span>
        </div>
        <div style={{ position:'relative', width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M11 3C7.7 3 5 5.7 5 9V14L3 16H19L17 14V9C17 5.7 14.3 3 11 3Z" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/><path d="M9 18C9 19.1 9.9 20 11 20C12.1 20 13 19.1 13 18" stroke="var(--text-tert)" strokeWidth="1.7" fill="none"/></svg>
          <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:ORANGE, border:'2px solid var(--bg-card)' }}/>
        </div>
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

// ─── EXL LEARNING WORLD HERO ─────────────────────────────────────────────────
function LearningWorldHero({ name, dark }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 55%,#112f90 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 45%,#1548b8 100%)`, minHeight:160, display:'flex', alignItems:'stretch' }}>
      {/* Ambient glow blobs */}
      <div style={{ position:'absolute', top:-30, right:160, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-40, right:60, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>

      {/* Sparkles */}
      {[[GOLD,14,'22%','top',14],[CYAN,9,'38%','top',22],['#fff',11,'14%','top',32],[GOLD,7,'28%','bottom',18]].map(([c,fs,right,side,top],i)=>(
        <div key={i} style={{ position:'absolute', [side]:top, right, fontSize:fs, color:c, opacity:.55 }}>✦</div>
      ))}

      {/* Floating subject icons — desktop only visual */}
      <div style={{ position:'absolute', right:290, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:10, opacity:.85 }}>
        {[{bg:'rgba(24,183,242,.2)',icon:'🌍'},{bg:'rgba(18,100,229,.25)',icon:'⚗️'},{bg:'rgba(124,58,237,.2)',icon:'⚡'}].map((b,i)=>(
          <div key={i} style={{ width:44, height:44, borderRadius:14, background:b.bg, border:'1px solid rgba(255,255,255,.15)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{b.icon}</div>
        ))}
      </div>

      {/* Play button illustration */}
      <div style={{ position:'absolute', right:170, top:'50%', transform:'translateY(-50%)', width:60, height:60, borderRadius:'50%', background:'rgba(255,184,0,.9)', boxShadow:`0 4px 20px ${GOLD}60`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:2 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5.14v14l11-7-11-7z" fill="#fff"/></svg>
      </div>

      {/* Text content */}
      <div style={{ flex:1, padding:'28px 32px', zIndex:1, maxWidth:480 }}>
        <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.14em', color:'rgba(255,255,255,.5)', marginBottom:8 }}>EXL · Interactive Learning</div>
        <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.15, marginBottom:8 }}>
          EXL Learning World
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:20 }}>
          An interactive learning platform to learn by doing.
        </div>
        <Link href="/student/learn/world" style={{ textDecoration:'none', display:'inline-block' }}>
          <button
            onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:13, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:hov?CYAN:BLUE, color:'#fff', boxShadow:hov?`0 6px 20px ${CYAN}50`:`0 4px 16px ${BLUE}50`, transition:'all .15s' }}
          >
            Explore Learning World
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </Link>
        {/* Coming soon chip */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:12, padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:GREEN }}/>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.65)', letterSpacing:'.08em' }}>CHEMISTRY · PHYSICS — LIVE NOW</span>
        </div>
      </div>

      {/* Mascot — right side */}
      <div style={{ width:200, flexShrink:0, position:'relative', alignSelf:'flex-end', zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:170, objectFit:'contain', objectPosition:'bottom center', display:'block', filter:'drop-shadow(0 6px 20px rgba(0,0,0,.45))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── MOBILE HERO ─────────────────────────────────────────────────────────────
function MobileHero({ name, dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,${NAVY},#1040a0)`, padding:'22px 20px', display:'flex', alignItems:'flex-end', minHeight:150 }}>
      <div style={{ position:'absolute', top:0, right:0, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {/* Sparkles */}
      <div style={{ position:'absolute', top:14, right:'40%', fontSize:12, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'36%', fontSize:8, color:CYAN, opacity:.6 }}>✦</div>
      {/* Text */}
      <div style={{ flex:1, zIndex:1, paddingRight:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Hey {name}! 👋</div>
        <div style={{ fontSize:19, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.2, marginBottom:6 }}>Welcome to EXL Learning World</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:16 }}>An interactive learning platform to learn by doing.</div>
        <Link href="/student/learn/world" style={{ textDecoration:'none' }}>
          <button style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 18px', borderRadius:12, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:13, background:BLUE, color:'#fff', boxShadow:`0 4px 14px ${BLUE}50` }}>
            Explore Learning World
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </Link>
        <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:10, padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.12)' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:GREEN }}/>
          <span style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,.6)', letterSpacing:'.06em' }}>CHEMISTRY · PHYSICS LIVE</span>
        </div>
      </div>
      {/* Mascot */}
      <div style={{ width:110, height:120, flexShrink:0, zIndex:1, alignSelf:'flex-end' }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom', display:'block', filter:'drop-shadow(0 4px 12px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
    </div>
  )
}

// ─── LEARN TOOLS ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    key:'flashcards',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" fill="rgba(255,255,255,.25)"/>
        <rect x="6" y="2" width="20" height="14" rx="3" fill="rgba(255,255,255,.18)"/>
        <rect x="4" y="4" width="20" height="15" rx="3" fill="rgba(255,255,255,.9)"/>
        <text x="14" y="15" textAnchor="middle" fontSize="11" fill={PURPLE} fontWeight="900">?</text>
      </svg>
    ),
    bg: `linear-gradient(135deg,${PURPLE} 0%,#5b21b6 100%)`,
    glowColor: PURPLE,
    label: 'Flashcards',
    tags: ['Active Recall','Smart Practice'],
    tagColor: PURPLE,
    desc: 'Guess the answer before you flip. Practice, learn and earn XP!',
    dailyLabel: 'Daily Goal',
    dailyVal: 14,
    dailyMax: 20,
    dailyUnit: 'cards',
    ctaLabel: 'Start Studying',
    ctaColor: PURPLE,
    href: '/student/learn/flashcards',
  },
  {
    key:'formulas',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="4" fill="rgba(255,255,255,.15)"/>
        <text x="14" y="19" textAnchor="middle" fontSize="15" fill="#fff" fontWeight="900">fx</text>
      </svg>
    ),
    bg: `linear-gradient(135deg,${GREEN} 0%,#15803d 100%)`,
    glowColor: GREEN,
    label: 'Key Formulas',
    tags: ['Memorise','Understand','Apply'],
    tagColor: GREEN,
    desc: 'Learn key formulas with examples and quick checks.',
    dailyLabel: 'Daily Goal',
    dailyVal: 8,
    dailyMax: 15,
    dailyUnit: 'formulas',
    ctaLabel: 'Explore Formulas',
    ctaColor: GREEN,
    href: '/student/learn/formulas',
  },
]

function LearnToolCard({ tool, subjects, dark }) {
  const [subj, setSubj] = useState('')
  const pct = Math.round((tool.dailyVal / tool.dailyMax) * 100)

  return (
    <Card style={{ display:'flex', flexDirection:'column', overflow:'visible' }}>
      <div style={{ padding:'22px 22px 0', display:'flex', gap:14, alignItems:'flex-start' }}>
        {/* Icon */}
        <div style={{ width:56, height:56, borderRadius:18, background:tool.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 6px 20px ${tool.glowColor}40` }}>{tool.icon}</div>
        {/* Title + desc */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:5 }}>
            {tool.tags.map(t=>(
              <span key={t} style={{ fontSize:9, fontWeight:800, color:tool.tagColor, background:`${tool.tagColor}14`, border:`1px solid ${tool.tagColor}25`, padding:'2px 7px', borderRadius:999 }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>{tool.label}</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>{tool.desc}</div>
        </div>
      </div>

      {/* Subject selector */}
      <div style={{ padding:'16px 22px 0' }}>
        <div style={{ position:'relative' }}>
          <select value={subj} onChange={e=>setSubj(e.target.value)} style={{ width:'100%', appearance:'none', padding:'10px 36px 10px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:subj?'var(--text-prim)':'var(--text-tert)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
            <option value="">Select Subject</option>
            {subjects.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M2 4.5l4 4 4-4" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {/* CTA button */}
      <div style={{ padding:'12px 22px 0' }}>
        <Link href={subj?`${tool.href}/${encodeURIComponent(subj)}`:tool.href} style={{ textDecoration:'none', display:'block' }}>
          <button style={{ width:'100%', padding:'13px', borderRadius:13, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:900, fontSize:14, background:tool.ctaColor, color:'#fff', boxShadow:`0 4px 16px ${tool.glowColor}40`, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .15s' }}>
            {tool.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </Link>
      </div>

      {/* Daily goal bar */}
      <div style={{ padding:'16px 22px 20px', borderTop:'1px solid var(--border)', marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-tert)' }}>{tool.dailyLabel}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)' }}>{tool.dailyVal} / {tool.dailyMax} {tool.dailyUnit}</span>
            <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:999, background:`${ORANGE}14` }}>
              <span style={{ fontSize:10 }}>🛡️</span>
              <span style={{ fontSize:9, fontWeight:800, color:ORANGE }}>+20 XP</span>
            </div>
          </div>
        </div>
        <div style={{ height:8, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:tool.ctaColor, transition:'width .6s ease', boxShadow:`0 0 8px ${tool.glowColor}50` }}/>
        </div>
      </div>
    </Card>
  )
}

// ─── MOBILE TOOL CARD (compact) ──────────────────────────────────────────────
function MobileToolCard({ tool, dark }) {
  const pct = Math.round((tool.dailyVal / tool.dailyMax) * 100)
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <div style={{ width:48, height:48, borderRadius:15, background:tool.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 14px ${tool.glowColor}40` }}>{tool.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:4, marginBottom:3, flexWrap:'wrap' }}>
            {tool.tags.map(t=>(
              <span key={t} style={{ fontSize:8, fontWeight:800, color:tool.tagColor, background:`${tool.tagColor}14`, padding:'1px 6px', borderRadius:999 }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>{tool.label}</div>
          <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2, lineHeight:1.4 }}>{tool.desc}</div>
        </div>
        <Link href={tool.href} style={{ textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:9, background:`${tool.glowColor}14`, border:`1px solid ${tool.glowColor}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke={tool.glowColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </Link>
      </div>
      {/* Daily goal */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>Daily goal</span>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)' }}>{tool.dailyVal} / {tool.dailyMax} {tool.dailyUnit}</span>
      </div>
      <div style={{ height:7, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:tool.ctaColor }}/>
      </div>
    </Card>
  )
}

// ─── ACTIVITY TODAY ───────────────────────────────────────────────────────────
function ActivityToday({ activity, name, dark }) {
  const days = ['M','T','W','T','F','S','S']
  const todayIdx = (new Date().getDay()+6)%7
  const stats = [
    { icon:'📖', label:'Lessons Completed', value:activity.lessons??3, color:BLUE },
    { icon:'🎯', label:'Questions Answered', value:activity.questions??42, color:ORANGE },
    { icon:'📈', label:'Accuracy',           value:`${activity.accuracy??78}%`, color:GREEN },
    { icon:'⚡', label:'XP Earned',          value:(activity.xp??320).toLocaleString(), color:GOLD },
  ]

  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
        <div style={{ width:28, height:28, borderRadius:9, background:`${BLUE}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📊</div>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Your Activity Today</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
        {stats.map((s,i)=>(
          <div key={i} style={{ padding:'0 12px', borderRight:i<3?'1px solid var(--border)':'none', textAlign:'center' }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', marginBottom:4, lineHeight:1.3 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:900, color:s.color, letterSpacing:'-.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Streak row */}
      <div style={{ marginTop:18, padding:'14px', borderRadius:14, background:dark?'rgba(255,106,0,.08)':'rgba(255,106,0,.06)', border:`1px solid ${ORANGE}25`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{ fontSize:14, fontWeight:900, color:ORANGE }}>12 Day Streak</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-tert)' }}>Keep it up, {name}! You're on fire!</div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {days.map((d,i)=>(
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:i<6?ORANGE:dark?'rgba(255,255,255,.1)':'rgba(6,42,120,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {i<6?<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>:null}
              </div>
              <span style={{ fontSize:8, fontWeight:700, color:'var(--text-tert)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// ─── MOBILE ACTIVITY (compact 3-stat) ────────────────────────────────────────
function MobileActivityToday({ activity, dark }) {
  const stats = [
    { icon:'📖', label:'Lessons', value:activity.lessons??3, color:BLUE },
    { icon:'🎯', label:'Questions', value:activity.questions??42, color:ORANGE },
    { icon:'⚡', label:'XP Earned', value:(activity.xp??320).toLocaleString(), color:GOLD },
  ]
  return (
    <div>
      <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:10 }}>Your activity today</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {stats.map((s,i)=>(
          <Card key={i} style={{ padding:'14px 10px', textAlign:'center' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--text-tert)', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── CONTINUE LEARNING ───────────────────────────────────────────────────────
function ContinueLearning({ lessons, dark }) {
  if (!lessons.length) return null
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>Continue Learning</span>
        <Link href="/student/learn/all" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>View all</Link>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {lessons.map((l,i)=>{
          const col = getColor(l.subject)
          const pct = l.pct??0
          return (
            <Card key={i} style={{ padding:0, display:'flex', flexDirection:'column' }}>
              {/* Subject icon header */}
              <div style={{ height:70, background:`${col}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>{getIcon(l.subject)}</div>
              <div style={{ padding:'14px 16px 16px', flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{ fontSize:10, fontWeight:700, color:col, marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' }}>{l.subject}</div>
                <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.015em', lineHeight:1.3, marginBottom:10, flex:1 }}>{l.topic}</div>
                {/* Progress */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ height:5, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden', marginBottom:5 }}>
                    <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:col, transition:'width .5s ease' }}/>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>{pct}% complete</div>
                </div>
                <Link href={`/student/learn/lesson/${l.id}`} style={{ textDecoration:'none' }}>
                  <button style={{ width:'100%', padding:'9px', borderRadius:10, border:`1.5px solid ${col}40`, cursor:'pointer', fontFamily:'inherit', fontWeight:800, fontSize:12, background:'transparent', color:col, transition:'all .15s' }}>
                    Continue
                  </button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Mobile version — horizontal scroll cards
function MobileContinueLearning({ lessons, dark }) {
  if (!lessons.length) return null
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em' }}>Continue your learning</span>
        <Link href="/student/learn/all" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>View all</Link>
      </div>
      <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {lessons.map((l,i)=>{
          const col = getColor(l.subject)
          const pct = l.pct??0
          return (
            <Card key={i} style={{ minWidth:200, flexShrink:0 }}>
              <div style={{ height:56, background:`${col}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{getIcon(l.subject)}</div>
              <div style={{ padding:'12px 14px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:col, marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>{l.subject}</div>
                <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', lineHeight:1.3, marginBottom:8 }}>{l.topic}</div>
                <div style={{ height:5, borderRadius:999, background:dark?'rgba(255,255,255,.08)':'rgba(6,42,120,.07)', overflow:'hidden', marginBottom:5 }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:col }}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>{pct}% complete</span>
                  <Link href={`/student/learn/lesson/${l.id}`} style={{ textDecoration:'none', fontSize:11, fontWeight:800, color:col }}>Continue →</Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── MOTIVATIONAL FOOTER ─────────────────────────────────────────────────────
function MotivationalFooter({ dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}18`, padding:'20px 20px 20px 150px', minHeight:110, display:'flex', alignItems:'center' }}>
      <div style={{ position:'absolute', bottom:0, left:0, width:140, height:110 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
      <div style={{ position:'absolute', top:14, right:'14%', fontSize:14, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'9%', fontSize:9, color:BLUE, opacity:.4 }}>✦</div>
      {/* Bar chart decoration */}
      <div style={{ position:'absolute', bottom:16, right:22 }}>
        <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
          <rect x="0"  y="26" width="10" height="18" rx="2.5" fill={BLUE} opacity=".5"/>
          <rect x="14" y="18" width="10" height="26" rx="2.5" fill={BLUE} opacity=".65"/>
          <rect x="28" y="8"  width="10" height="36" rx="2.5" fill={BLUE} opacity=".8"/>
          <rect x="42" y="0"  width="10" height="44" rx="2.5" fill={BLUE}/>
          <path d="M5 22L19 12L33 16L47 4" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="47" cy="4" r="3" fill={ORANGE}/>
        </svg>
      </div>
      <div style={{ zIndex:1 }}>
        <div style={{ fontSize:15, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>Every concept you learn today,<br/>brings you closer to your goals! 🚀</div>
      </div>
    </div>
  )
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English Language','Further Mathematics']
const MOCK_LESSONS  = [
  { id:'chem-reactions', subject:'Chemistry', topic:'Chemical Reactions and Equations', pct:75 },
  { id:'phys-motion',    subject:'Physics',   topic:'Laws of Motion',                   pct:40 },
  { id:'math-quadratic', subject:'Mathematics',topic:'Quadratic Equations',              pct:20 },
]
const MOCK_ACTIVITY = { lessons:3, questions:42, accuracy:78, xp:320 }

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter()
  const { dark, toggle } = useTheme()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [xp,       setXp]       = useState(12840)
  const [subjects, setSubjects] = useState(MOCK_SUBJECTS)
  const [lessons,  setLessons]  = useState(MOCK_LESSONS)
  const [activity, setActivity] = useState(MOCK_ACTIVITY)

  useEffect(()=>{
    async function load() {
      try {
        const supabase = createClient()
        const { data:{session} } = await supabase.auth.getSession()
        if (session?.user) {
          const { data:prof } = await supabase.from('profiles').select('username,full_name,total_points,subjects').eq('id',session.user.id).single()
          if (prof) { setProfile(prof); setXp(prof.total_points||0); if(prof.subjects?.length) setSubjects(prof.subjects) }
          // Try activity
          const today = new Date(); today.setHours(0,0,0,0)
          const { data:att } = await supabase.from('question_attempts').select('is_correct,created_at').eq('student_id',session.user.id).gte('created_at',today.toISOString())
          if (att?.length) {
            const correct = att.filter(a=>a.is_correct).length
            setActivity({ lessons:3, questions:att.length, accuracy:att.length>0?Math.round((correct/att.length)*100):0, xp:att.length*8 })
          }
        }
      } catch(e){ console.error(e) }
      finally { setLoading(false) }
    }
    load()
  },[])

  const name = profile?.username||profile?.full_name?.split(' ')[0]||'King'
  const cap  = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : ''

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} ::-webkit-scrollbar{display:none}`}</style>
      <AppBackground dark={dark}/>

      {/* ══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1380, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active="learn" xp={xp} dark={dark}/>

          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>

            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {/* Full-width hero */}
              <LearningWorldHero name={cap(name)} dark={dark}/>

              {/* Learn Tools section */}
              <div>
                <div style={{ marginBottom:4 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em', marginBottom:4 }}>Learn Tools</div>
                  <div style={{ fontSize:13, color:'var(--text-tert)' }}>Powerful tools to help you learn smarter and remember better.</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                {TOOLS.map(tool=>(
                  <LearnToolCard key={tool.key} tool={tool} subjects={subjects} dark={dark}/>
                ))}
              </div>

              {/* Activity today — full width */}
              <ActivityToday activity={activity} name={cap(name)} dark={dark}/>

              {/* Continue learning */}
              <ContinueLearning lessons={lessons} dark={dark}/>

              <MotivationalFooter dark={dark}/>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MOBILE ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar name={cap(name)} xp={xp} dark={dark} toggle={toggle}/>
        <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:18 }}>
          <MobileHero name={cap(name)} dark={dark}/>

          {/* Learn Tools label */}
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.025em', marginBottom:4 }}>Learn Tools</div>
            <div style={{ fontSize:12, color:'var(--text-tert)' }}>Master concepts with smart, interactive tools.</div>
          </div>
          {TOOLS.map(tool=><MobileToolCard key={tool.key} tool={tool} dark={dark}/>)}

          <MobileActivityToday activity={activity} dark={dark}/>
          <MobileContinueLearning lessons={lessons} dark={dark}/>
          <MotivationalFooter dark={dark}/>
        </div>
        <StudentBottomNav active="learn" dark={dark}/>
      </div>
    </>
  )
}