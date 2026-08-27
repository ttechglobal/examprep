'use client'
// src/app/student/leaderboard/page.js — v1
// Full leaderboard page matching design spec.
// Desktop: sidebar + hero banner + podium + table + right col (about + challenges)
// Mobile: sticky topbar + school/national tabs + podium + table + motivational footer

import { useState, useEffect } from 'react'
import { usePoints } from '@/contexts/PointsContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { useStudentUser } from '@/app/student/layout'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

// ─── BACKGROUND ───────────────────────────────────────────────────────────────

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}



// ─── DESKTOP HERO BANNER ──────────────────────────────────────────────────────
function HeroBanner({ dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'28px 32px', display:'flex', alignItems:'center', gap:0, minHeight:130 }}>
      {/* Glow */}
      <div style={{ position:'absolute', top:0, right:0, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {/* Sparkles */}
      {[[GOLD,14,'18%'],[CYAN,10,'32%'],[GOLD,8,'48%'],['#fff',12,'12%']].map(([c,fs,top],i)=>(
        <div key={i} style={{ position:'absolute', top, right:`${12+i*8}%`, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      {/* Text */}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.1, marginBottom:8 }}>Leaderboard</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,.55)', fontWeight:500 }}>Compete. Climb. Become the best version of you.</div>
      </div>
      {/* Mascot + trophy */}
      <div style={{ position:'relative', width:200, height:130, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ position:'absolute', bottom:0, left:0, width:120, height:120, objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
        {/* Trophy illustration */}
        <div style={{ position:'absolute', bottom:10, right:10 }}>
          <svg width="70" height="80" viewBox="0 0 70 80" fill="none">
            <ellipse cx="35" cy="72" rx="18" ry="6" fill="rgba(255,255,255,.12)"/>
            <rect x="28" y="58" width="14" height="14" rx="2" fill={GOLD} opacity=".9"/>
            <rect x="20" y="66" width="30" height="6" rx="3" fill={GOLD}/>
            <path d="M15 8h40v28c0 11-9 20-20 20S15 47 15 36V8z" fill={GOLD}/>
            <path d="M15 14H6C6 14 4 30 15 35" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M55 14h9c0 0 2 16-9 21" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <circle cx="35" cy="26" r="8" fill="rgba(255,255,255,.25)"/>
            <text x="35" y="31" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="900">★</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── TAB ROW ─────────────────────────────────────────────────────────────────
function TabRow({ tabs, active, onChange, pill=false, dark }) {
  return (
    <div style={{ display:'flex', gap:pill?6:0, background:pill?'transparent':(dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)'), borderRadius:pill?0:13, padding:pill?0:3, border:pill?'none':'1px solid var(--border)' }}>
      {tabs.map(t => {
        const on = t.key===active
        return (
          <button key={t.key} onClick={()=>onChange(t.key)} style={{ padding:pill?'7px 16px':'8px 18px', borderRadius:pill?999:10, fontSize:13, fontWeight:on?800:600, border:pill?`1.5px solid ${on?BLUE:'var(--border)'}`:'none', cursor:'pointer', fontFamily:'inherit', background:on?(pill?BLUE:(dark?'rgba(255,255,255,.1)':BLUE)):'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 10px ${BLUE}40`:'none', transition:'all .15s', whiteSpace:'nowrap' }}>{t.label}</button>
        )
      })}
    </div>
  )
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
const AV_COLORS = [
  {bg:'rgba(255,184,0,.2)',  color:GOLD},
  {bg:'rgba(18,100,229,.2)', color:BLUE},
  {bg:'rgba(255,106,0,.18)', color:ORANGE},
  {bg:'rgba(24,183,242,.18)',color:CYAN},
  {bg:'rgba(124,58,237,.18)',color:'#7C3AED'},
  {bg:'rgba(34,197,94,.18)', color:GREEN},
]
function Avatar({ name, size=36, idx=0, isMe=false }) {
  const { bg, color } = AV_COLORS[idx % AV_COLORS.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:900, color:isMe?GOLD:color, flexShrink:0, border:isMe?`2px solid ${GOLD}40`:'none' }}>
      {(name||'?').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── LAST WEEK CHAMPION ───────────────────────────────────────────────────────
function ChampionCard({ champion, weekNum, dark }) {
  if (!champion) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:18, background:dark?'rgba(255,184,0,.06)':'rgba(255,184,0,.07)', border:`1px solid ${GOLD}30`, marginBottom:18 }}>
      <div style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:999, background:GOLD, color:'#fff', flexShrink:0 }}>WEEK {weekNum}</div>
      <Avatar name={champion.name} size={42} idx={0}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', marginBottom:2 }}>Last Week Champion</div>
        <div style={{ fontSize:12, color:'var(--text-tert)' }}>{champion.name} · {champion.school}</div>
        <div style={{ fontSize:13, fontWeight:900, color:BLUE, marginTop:3 }}>{champion.xp.toLocaleString()} XP</div>
      </div>
      <div style={{ fontSize:32, flexShrink:0 }}>🏆</div>
    </div>
  )
}

// ─── PODIUM ───────────────────────────────────────────────────────────────────
function Podium({ entries, myId, dark }) {
  if (entries.length < 3) return null

  // Podium order: 2nd left, 1st centre, 3rd right
  const order   = [entries[1], entries[0], entries[2]]
  const heights = [110, 140, 90]   // podium block heights
  const sizes   = [68, 84, 62]     // avatar sizes
  const platformColors = [
    dark?'rgba(24,183,242,.25)':'rgba(24,183,242,.18)',    // 2nd – blue/silver
    dark?'rgba(255,184,0,.35)':'rgba(255,184,0,.28)',       // 1st – gold
    dark?'rgba(255,106,0,.25)':'rgba(224,106,0,.18)',       // 3rd – bronze/orange
  ]
  const platformBorders = [`${CYAN}50`, `${GOLD}70`, `${ORANGE}50`]
  const medalColors = [CYAN, GOLD, ORANGE]
  const ranks = [2, 1, 3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:12, padding:'0 0 8px', marginBottom:20 }}>
      {order.map((entry, col) => {
        const isMe = entry?.student_id===myId || entry?.isMe
        const isFirst = col===1
        return (
          <div key={col} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, flex:1, maxWidth:col===1?180:150 }}>
            {/* Crown for 1st */}
            {isFirst && <div style={{ fontSize:22, marginBottom:4 }}>👑</div>}
            {!isFirst && <div style={{ height:26 }}/>}

            {/* Medal badge */}
            <div style={{ width:26, height:26, borderRadius:'50%', background:medalColors[col], display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', marginBottom:6, boxShadow:`0 2px 8px ${medalColors[col]}50` }}>{ranks[col]}</div>

            {/* Avatar */}
            <div style={{ position:'relative', marginBottom:10 }}>
              <Avatar name={entry?.name||entry?.first_name||'?'} size={sizes[col]} idx={col} isMe={isMe}/>
              {isMe && <div style={{ position:'absolute', bottom:-4, right:-4, width:18, height:18, borderRadius:'50%', background:GOLD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>👑</div>}
            </div>

            {/* Name + XP */}
            <div style={{ textAlign:'center', marginBottom:10 }}>
              <div style={{ fontSize:isFirst?14:13, fontWeight:900, color:isMe?BLUE:'var(--text-prim)', letterSpacing:'-.01em' }}>{entry?.name||entry?.first_name||'—'}</div>
              {entry?.school && <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:130 }}>{entry.school}</div>}
              <div style={{ fontSize:isFirst?16:14, fontWeight:900, color:isMe?BLUE:BLUE, marginTop:4 }}>{(entry?.xp||entry?.points||0).toLocaleString()} XP</div>
            </div>

            {/* Podium block */}
            <div style={{ width:'100%', height:heights[col], borderRadius:'12px 12px 0 0', background:platformColors[col], border:`1px solid ${platformBorders[col]}`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFirst && <div style={{ fontSize:20, opacity:.4 }}>⭐</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── LEADERBOARD TABLE ────────────────────────────────────────────────────────
function LeaderboardTable({ entries, myId, period, dark }) {
  const medals = ['🥇','🥈','🥉']
  // Show rank 4 onwards (podium handles top 3)
  const rest = entries.slice(3)
  const myEntry = entries.find(e=>e.student_id===myId||e.isMe)
  const myRank  = myEntry ? entries.indexOf(myEntry)+1 : null

  if (!rest.length) return (
    <Card style={{ padding:'32px', textAlign:'center' }}>
      <div style={{ fontSize:13, color:'var(--text-tert)' }}>No data yet for this period. Start practising!</div>
    </Card>
  )

  return (
    <Card>
      {/* Table header */}
      <div style={{ display:'grid', gridTemplateColumns:'48px 1fr 1fr auto', gap:0, padding:'10px 18px', borderBottom:'1px solid var(--border)', background:dark?'rgba(255,255,255,.02)':'rgba(6,42,120,.02)' }}>
        {['Rank','User','School','XP'].map((h,i)=>(
          <div key={i} style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', textAlign:i===3?'right':'left' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {rest.map((entry, i) => {
        const rank = i + 4
        const isMe = entry.student_id===myId||entry.isMe
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'48px 1fr 1fr auto', gap:0, padding:'13px 18px', alignItems:'center', borderBottom:'1px solid var(--border)', background:isMe?(dark?`${BLUE}12`:`${BLUE}06`):'transparent', transition:'background .12s' }}>
            <div style={{ fontSize:13, fontWeight:800, color:rank<=3?medalColors[rank-1]:'var(--text-tert)' }}>
              {rank<=3?medals[rank-1]:rank}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
              <Avatar name={entry.name||entry.first_name||'?'} size={32} idx={i} isMe={isMe}/>
              <span style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isMe?'You':(entry.name||entry.first_name||'Student')}
              </span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-tert)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>
              {entry.school||'—'}
            </div>
            <div style={{ fontSize:13, fontWeight:900, color:isMe?GOLD:'var(--text-tert)', textAlign:'right', whiteSpace:'nowrap' }}>
              {(entry.xp||entry.points||0).toLocaleString()} XP
            </div>
          </div>
        )
      })}

      {/* My position if not in visible range */}
      {myRank && myRank > rest.length + 3 && myEntry && (
        <div style={{ padding:'13px 18px', background:dark?`${BLUE}12`:`${BLUE}06`, borderTop:'2px dashed var(--border)', display:'grid', gridTemplateColumns:'48px 1fr 1fr auto', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:900, color:BLUE }}>{myRank}</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Avatar name="You" size={32} isMe={true}/>
            <span style={{ fontSize:13, fontWeight:800, color:BLUE }}>You</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-tert)' }}>{myEntry.school||'—'}</div>
          <div style={{ fontSize:13, fontWeight:900, color:GOLD, textAlign:'right' }}>{(myEntry.xp||myEntry.points||0).toLocaleString()} XP</div>
        </div>
      )}
    </Card>
  )
}
const medalColors = [GOLD, CYAN, ORANGE]

// ─── NO SCHOOL CARD ───────────────────────────────────────────────────────────
function JoinSchoolCard({ dark }) {
  return (
    <div style={{ borderRadius:18, padding:'22px 20px', background:`linear-gradient(135deg,${BLUE} 0%,${NAVY} 100%)`, marginBottom:16, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
      <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:6, lineHeight:1.4 }}>Unlock more perks by connecting your school!</div>
      <div style={{ fontSize:24, marginBottom:14 }}>🎁</div>
      <button style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:'#fff', color:BLUE, fontSize:13, fontWeight:900, fontFamily:'inherit' }}>
        Join or Register Your School
      </button>
    </div>
  )
}

// ─── ABOUT LEADERBOARD ────────────────────────────────────────────────────────
function AboutLeaderboard({ dark }) {
  const items = [
    { icon:'⭐', text:'Earn XP by practising questions and completing daily quests.' },
    { icon:'📅', text:'Leaderboard resets every week.' },
    { icon:'🎁', text:'Top performers get special rewards!' },
  ]
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:14 }}>About Leaderboard</div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:dark?'rgba(255,255,255,.05)':'rgba(18,100,229,.06)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
            <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:4 }}>{item.text}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── CHALLENGES CARD ─────────────────────────────────────────────────────────
function ChallengesCard({ dark }) {
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em' }}>Challenges</span>
        <button style={{ fontSize:11, fontWeight:700, color:BLUE, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>View all</button>
      </div>
      {/* Challenge item */}
      <div style={{ borderRadius:14, border:'1px solid var(--border)', overflow:'hidden', marginBottom:14 }}>
        <div style={{ padding:'12px 14px', background:dark?'rgba(255,255,255,.03)':'rgba(6,42,120,.03)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${GOLD}18`, border:`1px solid ${GOLD}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏆</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:2 }}>Weekend Warrior</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.4 }}>Score the highest XP this weekend!</div>
            </div>
            <div style={{ width:28, height:28, borderRadius:8, background:`${BLUE}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:GREEN, animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--text-tert)' }}>Ends in</span>
            <span style={{ fontSize:11, fontWeight:900, color:'var(--text-prim)' }}>2d 14h 32m</span>
          </div>
        </div>
      </div>
      <button style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:13, fontWeight:900, fontFamily:'inherit', boxShadow:`0 4px 14px ${BLUE}50` }}>
        Join Challenge
      </button>
    </Card>
  )
}

// ─── MOTIVATIONAL FOOTER ─────────────────────────────────────────────────────
function MotivationalFooter({ name, dark }) {
  return (
    <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}20`, padding:'20px 20px 20px 150px', minHeight:110 }}>
      {/* Mascot */}
      <div style={{ position:'absolute', bottom:0, left:0, width:140, height:110 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
      </div>
      {/* Sparkles */}
      <div style={{ position:'absolute', top:12, right:'12%', fontSize:16, color:GOLD, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:28, right:'8%', fontSize:10, color:BLUE, opacity:.4 }}>✦</div>
      {/* Arrow/chart icon */}
      <div style={{ position:'absolute', bottom:16, right:20 }}>
        <svg width="50" height="42" viewBox="0 0 50 42" fill="none">
          <rect x="0"  y="24" width="10" height="18" rx="3" fill={BLUE} opacity=".6"/>
          <rect x="13" y="16" width="10" height="26" rx="3" fill={BLUE} opacity=".75"/>
          <rect x="26" y="8"  width="10" height="34" rx="3" fill={BLUE} opacity=".9"/>
          <rect x="39" y="0"  width="10" height="42" rx="3" fill={BLUE}/>
          <path d="M4 20L20 8L36 14L49 2" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="49" cy="2" r="3" fill={ORANGE}/>
        </svg>
      </div>
      <div style={{ zIndex:1, position:'relative' }}>
        <div style={{ fontSize:15, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>You're doing great! 🚀</div>
        <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.6)':'var(--text-tert)', lineHeight:1.5 }}>Practice more questions, complete your daily quests and move up the ranks!</div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const SCOPE_TABS  = [{key:'school',label:'School'},{key:'national',label:'National'}]
const PERIOD_TABS = [{key:'week',label:'This Week'},{key:'lastWeek',label:'Last Week'},{key:'month',label:'This Month'},{key:'lastMonth',label:'Last Month'},{key:'all',label:'All Time'}]

export default function LeaderboardPage() {
  const router  = useRouter()
  const { dark } = useTheme()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [scope,    setScope]    = useState('school')
  const [period,   setPeriod]   = useState('week')
  const [board,    setBoard]    = useState([])
  const [myId,     setMyId]     = useState('me')
  const { totalPoints: xp } = usePoints()
  const [hasSchool,setHasSchool]= useState(false)

  async function loadProfile() {
    try {
      const supabase = createClient()
      const { data:{session} } = await supabase.auth.getSession()
      if (session?.user) {
        setMyId(session.user.id)
        const { data:prof } = await supabase.from('profiles').select('username,full_name,total_points,school_id').eq('id',session.user.id).single()
        if (prof) { setProfile(prof); setHasSchool(!!prof.school_id) }
      }
    } catch(e) { console.error(e) }
  }

  async function fetchBoard() {
    try {
      const res = await fetch(`/api/leaderboard/global?limit=12&period=${period}&scope=${scope}`)
      if (res.ok) { const d = await res.json(); if(d.leaderboard?.length) setBoard(d.leaderboard) }
    } catch {} finally { setLoading(false) }
  }

  useEffect(()=>{ loadProfile() },[]) // eslint-disable-line
  useEffect(()=>{ fetchBoard() },[scope, period]) // eslint-disable-line

  const name      = profile?.username || profile?.full_name?.split(' ')[0] || 'King'
  const champion  = board[0] ? { name:board[0].name, school:board[0].school, xp:board[0].xp||board[0].points||0 } : null
  const weekNum   = 18

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0' }}>
      <div style={{ width:32,height:32,borderRadius:'50%',border:`3px solid var(--border)`,borderTopColor:BLUE,animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

      {/* Scope + Period filters */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:0, background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)' }}>
          {SCOPE_TABS.map(t=>{
            const on=t.key===scope
            return(
              <button key={t.key} onClick={()=>setScope(t.key)} style={{ padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 8px ${BLUE}40`:'none', transition:'all .15s' }}>{t.label}</button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
          {PERIOD_TABS.map(t=>{
            const on=t.key===period
            return(
              <button key={t.key} onClick={()=>setPeriod(t.key)} style={{ padding:'8px 14px', borderRadius:999, fontSize:12, fontWeight:on?800:600, border:`1px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}14`:'transparent', color:on?BLUE:'var(--text-tert)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}>{t.label}</button>
            )
          })}
        </div>
      </div>

      {/* No school banner */}
      {!hasSchool && (
        <div style={{ borderRadius:16, padding:'14px 16px', background:dark?`${NAVY}cc`:`linear-gradient(135deg,${BLUE}15,${NAVY}10)`, border:`1px solid ${BLUE}25`, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ fontSize:28, flexShrink:0 }}>🏫</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>You're not part of a school yet</div>
            <div style={{ fontSize:11, color:'var(--text-tert)' }}>Join your school to see your school leaderboard.</div>
          </div>
        </div>
      )}

      <HeroBanner dark={dark}/>
      <ChampionCard champion={champion} weekNum={weekNum} dark={dark}/>

      {/* Board */}
      {board.length === 0 ? (
        <Card style={{ padding:'28px 18px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No rankings yet</div>
          <div style={{ fontSize:12, color:'var(--text-tert)' }}>Start practising to appear on the leaderboard!</div>
          <Link href="/student/practice" style={{ textDecoration:'none' }}>
            <div style={{ marginTop:14, display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
          </Link>
        </Card>
      ) : (
        <Card>
          {/* Top 3 podium */}
          {board.length >= 1 && <Podium entries={board.slice(0,3)} myId={myId} dark={dark}/>}
          {/* Rest of board */}
          {board.length > 3 && (
            <div style={{ padding:'0 0 8px' }}>
              {board.slice(3).map((entry,i)=>{
                const isMe=entry.student_id===myId
                return(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', borderTop:'1px solid var(--border)', background:isMe?`${BLUE}08`:'transparent' }}>
                    <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:22, textAlign:'center', flexShrink:0 }}>{i+4}</span>
                    <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:`${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:BLUE }}>
                      {(entry.first_name||'S').charAt(0)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{isMe?'You':entry.first_name}</div>
                      {entry.school && <div style={{ fontSize:11, color:'var(--text-tert)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.school}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:isMe?GOLD:'var(--text-prim)' }}>{(entry.xp||entry.points||0).toLocaleString()}</div>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      <MotivationalFooter name={name} dark={dark}/>
      <ChallengesCard dark={dark}/>
    </div>
  )
}