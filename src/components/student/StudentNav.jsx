'use client'
// src/components/student/StudentNav.jsx
// Sidebar (desktop) + BottomNav (mobile, 4 tabs) + FAB (mobile only)

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePoints } from '@/contexts/PointsContext'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'

// Full nav — sidebar uses all of these
export const NAV = [
  { id:'home',        label:'Home',        href:'/student/home',        icon:'🏠', bg:'rgba(6,42,120,.1)'   },
  { id:'learn',       label:'Learn',       href:'/student/learn',       icon:'📖', bg:'rgba(24,183,242,.1)' },
  { id:'practice',    label:'Practice',    href:'/student/practice',    icon:'✏️', bg:'rgba(255,106,0,.1)'  },
  { id:'leaderboard', label:'Leaderboard', href:'/student/leaderboard', icon:'🏆', bg:'rgba(255,184,0,.1)'  },
  { id:'progress',    label:'Progress',    href:'/student/progress',    icon:'📊', bg:'rgba(34,197,94,.1)'  },
  { id:'profile',     label:'Profile',     href:'/student/profile',     icon:'👤', bg:'rgba(6,42,120,.07)'  },
]

// Bottom nav — 4 tabs
const BOTTOM_TABS = [
  { id:'home',        label:'Home',        href:'/student/home',        icon:'🏠', color: BLUE   },
  { id:'practice',    label:'Practice',    href:'/student/practice',    icon:'✏️', color: ORANGE },
  { id:'leaderboard', label:'Ranks',       href:'/student/leaderboard', icon:'🏆', color: GOLD   },
  // Profile replaced Progress: it holds more of what students need day to day,
  // and links to detailed progress from its Activity card.
  { id:'profile',     label:'Profile',     href:'/student/profile',     icon:'👤', color: BLUE   },
]

// ─── RANK HELPERS ─────────────────────────────────────────────────────────────
const _RANK_NAMES = ['Newcomer','Beginner','Learner','Explorer','Starter','Rookie','Apprentice','Trainee','Challenger','Initiate','Solver','Thinker','Problem Solver','Quick Mind','Sharp Mind','Brainiac','Strategist','Tactician','Scholar','Achiever','Specialist','Expert','Ace','Mastermind','Genius','Elite','Prodigy','Virtuoso','Grand Solver','Master Solver','Elite Mind','Mastermind','Top Scholar','Brain Master','Logic Master','Knowledge Master','Question Master','Challenge Master','Exam Master','Learning Master','Rising Star','Star Scholar','Academic Star','Brain Champion','Knowledge Champion','Quiz Champion','Challenge Champion','Exam Champion','Learning Champion','Grand Champion','Legend','Rising Legend','Scholar Legend','Brain Legend','Knowledge Legend','Master Legend','Exam Legend','Learning Legend','Grand Legend','Legendary Mind','Mythic Learner','Mythic Solver','Mythic Scholar','Mythic Mind','Mythic Master','Mythic Genius','Mythic Champion','Mythic Strategist','Mythic Legend','Mythic Grandmaster','Royal Scholar','Crowned Scholar','Scholar King','Scholar Elite','Knowledge Royalty','Brain Royalty','Grand Scholar','Supreme Scholar','Royal Grandmaster','Crown Master','Cosmic Learner','Cosmic Solver','Cosmic Scholar','Cosmic Mind','Cosmic Master','Infinity Scholar','Infinity Master','Eternal Scholar','Ultimate Mind','Ultimate Master','Grandmaster','Supreme Grandmaster','Legendary Grandmaster','Master of Masters','Immortal Scholar','Transcendent Mind','Apex Scholar','Apex Master','Ultimate Scholar','The EXL Legend']
const _TIER_COLORS = ['#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00']
const _TIER_NAMES = ['Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige']
const _RANK_XP = (() => { const t=[0]; for(let i=1;i<10;i++)t.push(t[t.length-1]+200+i*20); for(let i=0;i<10;i++)t.push(t[t.length-1]+500+i*50); for(let i=0;i<10;i++)t.push(t[t.length-1]+1200+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+2500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+3800+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+5500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+7500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+9500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+12000+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+15000+i*100); return t })()
function _getRankFromXp(xp) { let r=1; for(let i=_RANK_XP.length-1;i>=0;i--){if(xp>=_RANK_XP[i]){r=i+1;break}} return Math.min(r,100) }
function _getRankProgress(xp) { const rank=_getRankFromXp(xp); const xs=_RANK_XP[rank-1]??0; const xe=_RANK_XP[rank]??xs+1; const pct=rank===100?100:Math.min(100,Math.round(((xp-xs)/(xe-xs))*100)); return { rank, name:_RANK_NAMES[rank-1], tier:_TIER_NAMES[rank-1], color:_TIER_COLORS[rank-1], pct, xpToNext:rank===100?0:xe-xp } }

// ─── DESKTOP SIDEBAR ──────────────────────────────────────────────────────────
export function StudentSidebar({ active = 'home', dark }) {
  const { totalPoints: xp } = usePoints()
  const { rank, name: rankName, tier, color: rankColor, pct: rankPct, xpToNext } = _getRankProgress(xp)

  return (
    <aside style={{
      width: 256, flexShrink: 0, position: 'sticky', top: 20,
      height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column',
      background:  dark ? 'rgba(14,17,32,.97)' : 'rgba(255,255,255,.95)',
      borderRadius: 20,
      border:      dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.09)',
      boxShadow:   dark ? '0 4px 32px rgba(0,0,0,.4)' : '0 4px 24px rgba(6,42,120,.09)',
      padding: '24px 16px 24px 20px',
      backdropFilter: 'blur(16px)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
        <div style={{ width:36, height:36, borderRadius:11, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:900, color:GOLD, letterSpacing:'-.02em' }}>EX</span>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', lineHeight:1 }}>ExamPrep</div>
          <div style={{ fontSize:9, fontWeight:600, color:'var(--text-tert)', marginTop:2 }}>EXL Learning World</div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
        {NAV.filter(n => n.id !== 'profile').map(item => {
          const on = item.id === active
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration:'none' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px 10px 14px', borderRadius:13,
                background: on ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(18,100,229,.07)') : 'transparent',
                border:     on ? (dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(18,100,229,.14)') : '1px solid transparent',
                transition: 'all .12s',
              }}>
                <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, background: on ? item.bg : (dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize:13, fontWeight:on?800:600, color: on ? (dark ? '#fff' : BLUE) : 'var(--text-tert)' }}>
                  {item.label}
                </span>
                {on && <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:ORANGE, flexShrink:0 }}/>}
              </div>
            </Link>
          )
        })}
        <div style={{ height:1, background:'var(--border)', margin:'8px 4px' }}/>
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 12px 10px 14px', borderRadius:13,
            background: active === 'profile' ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(18,100,229,.07)') : 'transparent',
            border:     active === 'profile' ? (dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(18,100,229,.14)') : '1px solid transparent',
          }}>
            <div style={{ width:32, height:32, borderRadius:10, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>👤</div>
            <span style={{ fontSize:13, fontWeight: active === 'profile' ? 800 : 600, color: active === 'profile' ? (dark ? '#fff' : BLUE) : 'var(--text-tert)' }}>Profile</span>
            {active === 'profile' && <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:ORANGE, flexShrink:0 }}/>}
          </div>
        </Link>
      </div>

      {/* Rank card */}
      <div suppressHydrationWarning style={{
        borderRadius:16, padding:'12px', marginTop:14,
        background: dark ? 'rgba(255,255,255,.04)' : 'rgba(18,100,229,.05)',
        border:     dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(18,100,229,.1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)' }}>Rank {rank}</div>
          <div style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background:`${rankColor}20`, color:rankColor, border:`1px solid ${rankColor}35` }}>{tier}</div>
        </div>
        <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:6, lineHeight:1.2 }}>{rankName}</div>
        <div style={{ height:6, borderRadius:999, background:'var(--border)', overflow:'hidden', marginBottom:6 }}>
          <div style={{ height:'100%', width:`${rankPct}%`, borderRadius:999, background:`linear-gradient(90deg,${rankColor},${rankColor}99)`, transition:'width .8s ease' }}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>{xp.toLocaleString()} XP</span>
          {rank < 100 && <span style={{ fontSize:9, color:'var(--text-tert)' }}>{xpToNext.toLocaleString()} to next</span>}
          {rank === 100 && <span style={{ fontSize:9, color:rankColor, fontWeight:800 }}>MAX 👑</span>}
        </div>
      </div>
    </aside>
  )
}

// ─── LEARNING TOOLS FAB ───────────────────────────────────────────────────────
// Floating card-stack button → modal with learning tools
function LearningToolsFAB({ dark }) {
  const [open, setOpen] = useState(false)
  const overlayRef      = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (overlayRef.current && e.target === overlayRef.current) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    function handler(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const TOOLS = [
    {
      id: 'flashcards',
      href: '/student/learn/flashcards',
      icon: '🃏',
      label: 'Flashcards',
      desc: 'Memorise key facts fast',
      color: PURPLE,
      bg: 'rgba(124,58,237,.1)',
      border: 'rgba(124,58,237,.25)',
    },
    // Future tools slot in here
    {
      id: 'coming',
      href: null,
      icon: '📝',
      label: 'Summary Notes',
      desc: 'Coming soon',
      color: BLUE,
      bg: 'rgba(18,100,229,.07)',
      border: 'rgba(18,100,229,.18)',
      disabled: true,
    },
  ]

  return (
    <>
      {/* ── FAB button — stacked cards visual ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Learning Tools"
        style={{
          position: 'fixed',
          // Sits just above the bottom nav (68px) with 12px gap
          bottom: `calc(68px + env(safe-area-inset-bottom) + 14px)`,
          right: 16,
          zIndex: 90,
          width: 52, height: 52,
          border: 'none', cursor: 'pointer', padding: 0,
          background: 'none',
        }}
      >
        {/* Stacked card layers — depth effect */}
        <div style={{ position:'relative', width:52, height:52 }}>
          {/* Back card */}
          <div style={{
            position:'absolute', top:4, left:4, right:-4,
            height:44, borderRadius:12,
            background: dark ? '#2a1f5e' : '#c4b5fd',
            border: '1.5px solid rgba(124,58,237,.3)',
            transform: 'rotate(6deg)',
          }}/>
          {/* Mid card */}
          <div style={{
            position:'absolute', top:2, left:2, right:-2,
            height:44, borderRadius:12,
            background: dark ? '#3b2a7a' : '#ddd6fe',
            border: '1.5px solid rgba(124,58,237,.4)',
            transform: 'rotate(3deg)',
          }}/>
          {/* Front card — main button surface */}
          <div style={{
            position:'absolute', inset:0,
            height:46, borderRadius:12,
            background: PURPLE,
            border: '1.5px solid rgba(124,58,237,.6)',
            boxShadow: `0 4px 0 #4c1d95, 0 6px 16px rgba(124,58,237,.45)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: 22,
          }}>
            🃏
          </div>
        </div>
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          {/* Sheet — slides up from bottom */}
          <div style={{
            width: '100%',
            background: dark ? '#0f1225' : '#fff',
            borderRadius: '24px 24px 0 0',
            border: dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(6,42,120,.09)',
            boxShadow: '0 -8px 40px rgba(0,0,0,.3)',
            padding: '0 0 calc(24px + env(safe-area-inset-bottom))',
            animation: 'slideUp .22s ease-out',
          }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

            {/* Handle */}
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
              <div style={{ width:36, height:4, borderRadius:2, background: dark ? 'rgba(255,255,255,.15)' : 'rgba(6,42,120,.12)' }}/>
            </div>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 16px' }}>
              <div>
                <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Learning Tools</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>Pick a tool to study smarter</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ width:32, height:32, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16 }}
              >
                ✕
              </button>
            </div>

            {/* Tool list */}
            <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
              {TOOLS.map(tool => {
                const inner = (
                  <div style={{
                    display:'flex', alignItems:'center', gap:14,
                    padding:'14px 16px', borderRadius:16,
                    background: tool.disabled
                      ? (dark ? 'rgba(255,255,255,.03)' : 'rgba(6,42,120,.03)')
                      : tool.bg,
                    border: `1.5px solid ${tool.disabled ? 'var(--border)' : tool.border}`,
                    boxShadow: tool.disabled ? 'none' : `0 2px 0 ${tool.border}`,
                    opacity: tool.disabled ? 0.55 : 1,
                    cursor: tool.disabled ? 'default' : 'pointer',
                  }}>
                    {/* Icon panel */}
                    <div style={{
                      width:46, height:46, borderRadius:13, flexShrink:0,
                      background: tool.disabled
                        ? (dark ? 'rgba(255,255,255,.06)' : 'rgba(6,42,120,.06)')
                        : `${tool.color}18`,
                      border: `1.5px solid ${tool.disabled ? 'var(--border)' : tool.border}`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                    }}>
                      {tool.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, color: tool.disabled ? 'var(--text-tert)' : 'var(--text-prim)' }}>
                        {tool.label}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-tert)', marginTop:2 }}>
                        {tool.desc}
                      </div>
                    </div>
                    {!tool.disabled && (
                      <div style={{
                        width:32, height:32, borderRadius:10, flexShrink:0,
                        background: tool.color, boxShadow:`0 2px 0 ${tool.color}88`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {tool.disabled && (
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)', background:'var(--bg-subtle)', border:'1px solid var(--border)', borderRadius:6, padding:'2px 8px' }}>
                        Soon
                      </div>
                    )}
                  </div>
                )

                return tool.disabled ? (
                  <div key={tool.id}>{inner}</div>
                ) : (
                  <Link key={tool.id} href={tool.href} onClick={() => setOpen(false)} style={{ textDecoration:'none', display:'block' }}>
                    {inner}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
// 4 tabs: Home, Practice, Leaderboard, Profile
export function StudentBottomNav({ active = 'home', dark }) {
  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 68,
        background:     dark ? 'rgba(10,13,28,.98)' : 'rgba(255,255,255,.98)',
        borderTop:      dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(6,42,120,.08)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: dark ? '0 -4px 20px rgba(0,0,0,.4)' : '0 -4px 20px rgba(6,42,120,.06)',
      }}>
        {BOTTOM_TABS.map(tab => {
          const on = tab.id === active
          return (
            <Link key={tab.id} href={tab.href} style={{
              textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, padding: '8px 0',
              borderTop: `2.5px solid ${on ? tab.color : 'transparent'}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: on ? 18 : 16,
                background: on ? `${tab.color}14` : 'transparent',
                transition: 'all .15s',
              }}>
                {tab.icon}
              </div>
              <span style={{
                fontSize: 9, fontWeight: on ? 800 : 600,
                textTransform: 'uppercase', letterSpacing: '.06em',
                color: on ? tab.color : 'var(--text-tert)',
              }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* FAB — only on mobile, outside nav so z-index is independent */}
      <LearningToolsFAB dark={dark} />
    </>
  )
}