'use client'
// src/components/student/StudentNav.jsx
// Shared sidebar (desktop) and bottom nav (mobile) for all student pages.
//
// XP is read from PointsContext — no xp prop needed. Both components
// automatically update whenever a practice session is saved because
// setTotalPoints() is called in the session page after save.
//
// Import:
//   import { StudentSidebar, StudentBottomNav } from '@/components/student/StudentNav'
//
// Usage (in layout.js — active is derived from pathname):
//   <StudentSidebar active="home" dark={dark} />
//   <StudentBottomNav active="home" dark={dark} />

import Link from 'next/link'
import { usePoints } from '@/contexts/PointsContext'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

// Nav item definitions — used by both sidebar and bottom nav
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
//   active  — id string (e.g. 'home', 'practice')
//   dark    — boolean from ThemeContext
// Inline rank helpers (mirrors src/lib/ranks.js — no import needed here)
const _RANK_NAMES = ['Newcomer','Beginner','Learner','Explorer','Starter','Rookie','Apprentice','Trainee','Challenger','Initiate','Solver','Thinker','Problem Solver','Quick Mind','Sharp Mind','Brainiac','Strategist','Tactician','Scholar','Achiever','Specialist','Expert','Ace','Mastermind','Genius','Elite','Prodigy','Virtuoso','Grand Solver','Master Solver','Elite Mind','Mastermind','Top Scholar','Brain Master','Logic Master','Knowledge Master','Question Master','Challenge Master','Exam Master','Learning Master','Rising Star','Star Scholar','Academic Star','Brain Champion','Knowledge Champion','Quiz Champion','Challenge Champion','Exam Champion','Learning Champion','Grand Champion','Legend','Rising Legend','Scholar Legend','Brain Legend','Knowledge Legend','Master Legend','Exam Legend','Learning Legend','Grand Legend','Legendary Mind','Mythic Learner','Mythic Solver','Mythic Scholar','Mythic Mind','Mythic Master','Mythic Genius','Mythic Champion','Mythic Strategist','Mythic Legend','Mythic Grandmaster','Royal Scholar','Crowned Scholar','Scholar King','Scholar Elite','Knowledge Royalty','Brain Royalty','Grand Scholar','Supreme Scholar','Royal Grandmaster','Crown Master','Cosmic Learner','Cosmic Solver','Cosmic Scholar','Cosmic Mind','Cosmic Master','Infinity Scholar','Infinity Master','Eternal Scholar','Ultimate Mind','Ultimate Master','Grandmaster','Supreme Grandmaster','Legendary Grandmaster','Master of Masters','Immortal Scholar','Transcendent Mind','Apex Scholar','Apex Master','Ultimate Scholar','The EXL Legend']
const _TIER_COLORS = ['#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#22c55e','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#1264E5','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#7C3AED','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#F97316','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#EF4444','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#FFB800','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#18B7F2','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#9333EA','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#6366F1','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00','#FF6A00']
const _TIER_NAMES = ['Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Rookie','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Skilled','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Advanced','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Elite','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Champion','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Legendary','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Mythic','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Royal','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Endgame','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige','Prestige']
const _RANK_XP = (() => { const t=[0]; for(let i=1;i<10;i++)t.push(t[t.length-1]+200+i*20); for(let i=0;i<10;i++)t.push(t[t.length-1]+500+i*50); for(let i=0;i<10;i++)t.push(t[t.length-1]+1200+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+2500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+3800+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+5500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+7500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+9500+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+12000+i*100); for(let i=0;i<10;i++)t.push(t[t.length-1]+15000+i*100); return t })()
function _getRankFromXp(xp) { let r=1; for(let i=_RANK_XP.length-1;i>=0;i--){if(xp>=_RANK_XP[i]){r=i+1;break}} return Math.min(r,100) }
function _getRankProgress(xp) { const rank=_getRankFromXp(xp); const xs=_RANK_XP[rank-1]??0; const xe=_RANK_XP[rank]??xs+1; const pct=rank===100?100:Math.min(100,Math.round(((xp-xs)/(xe-xs))*100)); return { rank, name:_RANK_NAMES[rank-1], tier:_TIER_NAMES[rank-1], color:_TIER_COLORS[rank-1], pct, xpToNext:rank===100?0:xe-xp } }

export function StudentSidebar({ active = 'home', dark }) {
  const { totalPoints: xp } = usePoints()
  const { rank, name: rankName, tier, color: rankColor, pct: rankPct, xpToNext } = _getRankProgress(xp)

  return (
    <aside style={{
      width: 220, flexShrink: 0, position: 'sticky', top: 20,
      height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column',
      background:  dark ? 'rgba(14,17,32,.97)' : 'rgba(255,255,255,.95)',
      borderRadius: 20,
      border:      dark ? '1px solid rgba(255,255,255,.07)' : '1px solid rgba(6,42,120,.09)',
      boxShadow:   dark ? '0 4px 32px rgba(0,0,0,.4)' : '0 4px 24px rgba(6,42,120,.09)',
      padding: '20px 14px',
      backdropFilter: 'blur(16px)',
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

      {/* Nav links — profile sits below a divider */}
      <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
        {NAV.filter(n => n.id !== 'profile').map(item => {
          const on = item.id === active
          return (
            <Link key={item.id} href={item.href} style={{ textDecoration:'none' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13,
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
            display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13,
            background: active === 'profile' ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(18,100,229,.07)') : 'transparent',
            border:     active === 'profile' ? (dark ? '1px solid rgba(255,255,255,.1)' : '1px solid rgba(18,100,229,.14)') : '1px solid transparent',
            transition: 'all .12s',
          }}>
            <div style={{ width:32, height:32, borderRadius:10, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(6,42,120,.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>👤</div>
            <span style={{ fontSize:13, fontWeight: active === 'profile' ? 800 : 600, color: active === 'profile' ? (dark ? '#fff' : BLUE) : 'var(--text-tert)' }}>Profile</span>
            {active === 'profile' && <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:ORANGE, flexShrink:0 }}/>}
          </div>
        </Link>
      </div>

      {/* Rank card — live from PointsContext + 100-rank system */}
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

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
// Shows the first 5 nav items. Profile is accessible via the sidebar on desktop.
export function StudentBottomNav({ active = 'home', dark }) {
  const tabs = NAV.slice(0, 5)   // home, learn, practice, leaderboard, progress

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, height: 68,
      background:     dark ? 'rgba(10,13,28,.98)' : 'rgba(255,255,255,.98)',
      borderTop:      dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(6,42,120,.08)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: dark ? '0 -4px 20px rgba(0,0,0,.4)' : '0 -4px 20px rgba(6,42,120,.06)',
    }}>
      {tabs.map(tab => {
        const on       = tab.id === active
        const dotColor = tab.id === 'practice' ? ORANGE : BLUE
        return (
          <Link key={tab.id} href={tab.href} style={{
            textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '8px 0',
            borderTop: `2.5px solid ${on ? dotColor : 'transparent'}`,
          }}>
            <div style={{ width:28, height:28, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:on?18:16, background:on?tab.bg:'transparent', transition:'all .15s' }}>
              {tab.icon}
            </div>
            <span style={{ fontSize:9, fontWeight:on?800:600, textTransform:'uppercase', letterSpacing:'.06em', color:on?dotColor:'var(--text-tert)' }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}