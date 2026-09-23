'use client'
// src/app/student/leaderboard/page.js — v4
// Fully mobile-responsive. National default, school tab appears when connected.

import { useState, useEffect, useCallback } from 'react'
import { usePoints }       from '@/contexts/PointsContext'
import { useTheme }        from '@/contexts/ThemeContext'
import { useStudentUser }  from '@/app/student/layout'
import { InviteFriendsCard } from '@/components/student/InviteFriendsCard'
import JoinSchool          from '@/components/student/JoinSchool'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

const CACHE_SECS = 120
function cacheKey(sc, per) { return `ep_lb_${sc}_${per}` }
function readCache(sc, per) {
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey(sc,per)) || 'null')
    if (c && (Date.now()-(c.ts||0)) < CACHE_SECS*1000) return c.data
  } catch {}
  return null
}
function writeCache(sc, per, data) {
  try { localStorage.setItem(cacheKey(sc,per), JSON.stringify({ data, ts:Date.now() })) } catch {}
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ entries, myId }) {
  if (entries.length < 3) return null
  const order       = [entries[1], entries[0], entries[2]]
  const heights     = [48, 66, 38]
  const sizes       = [36, 46, 32]
  const platColors  = ['rgba(24,183,242,.18)','rgba(255,184,0,.25)','rgba(255,106,0,.18)']
  const medalColors = [CYAN, GOLD, ORANGE]
  const ranks       = [2,1,3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4, padding:'10px 8px 0', marginBottom:6 }}>
      {order.map((entry, col) => {
        const isMe    = entry?.student_id === myId
        const isFirst = col === 1
        return (
          <div key={col} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, minWidth:0, maxWidth: col===1 ? 110 : 95 }}>
            {isFirst ? <div style={{ fontSize:15, marginBottom:3 }}>👑</div> : <div style={{ height:18 }}/>}
            <div style={{ width:18, height:18, borderRadius:'50%', background:medalColors[col], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'#fff', marginBottom:4 }}>{ranks[col]}</div>
            {/* Avatar */}
            <div style={{ width:sizes[col], height:sizes[col], borderRadius:'50%', background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:platColors[col], border:`2px solid ${medalColors[col]}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:sizes[col]*0.36, fontWeight:900, color:isMe?GOLD:medalColors[col], marginBottom:4, flexShrink:0 }}>
              {(entry?.name||'?').charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign:'center', marginBottom:5, width:'100%', padding:'0 2px' }}>
              <div style={{ fontSize:10, fontWeight:800, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry?.name||'—'}</div>
              <div style={{ fontSize:isFirst?11:10, fontWeight:900, color:isFirst?GOLD:BLUE, marginTop:1 }}>{(entry?.xp||0).toLocaleString()} XP</div>
            </div>
            <div style={{ width:'100%', height:heights[col], borderRadius:'10px 10px 0 0', background:platColors[col], border:`1px solid ${medalColors[col]}45`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFirst && <div style={{ fontSize:16, opacity:.35 }}>⭐</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Board Row ─────────────────────────────────────────────────────────────────
function BoardRow({ entry, rank, myId, showSchool }) {
  const isMe = entry.student_id === myId
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderTop:'1px solid var(--border)', background:isMe?`${BLUE}08`:'transparent' }}>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:22, textAlign:'center', flexShrink:0 }}>{rank}</span>
      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:`${BLUE}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:isMe?GOLD:BLUE }}>
        {(entry.name||'S').charAt(0)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {isMe ? 'You' : (entry.name||'Student')}
        </div>
        {showSchool && entry.school && (
          <div style={{ fontSize:10, color:'var(--text-tert)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>🏫 {entry.school}</div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:isMe?GOLD:'var(--text-prim)' }}>{(entry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)', letterSpacing:'.04em' }}>XP</div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <Card>
      <style>{`@keyframes sk{0%,100%{opacity:.5}50%{opacity:.2}}`}</style>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid var(--border)', animation:'sk 1.5s infinite' }}>
          <div style={{ width:20, height:12, borderRadius:4, background:'var(--bg-subtle)', flexShrink:0 }}/>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', flexShrink:0 }}/>
          <div style={{ flex:1, height:12, borderRadius:6, background:'var(--bg-subtle)' }}/>
          <div style={{ width:50, height:12, borderRadius:6, background:'var(--bg-subtle)' }}/>
        </div>
      ))}
    </Card>
  )
}

// ── My rank banner ────────────────────────────────────────────────────────────
function MyRankBanner({ board, myId }) {
  const idx = board.findIndex(e => e.student_id === myId)
  if (idx < 0) return null
  const e = board[idx]
  const r = e.rank ?? idx+1
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:16, background:`${BLUE}0e`, border:`1px solid ${BLUE}28` }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD, flexShrink:0 }}>#{r}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)' }}>Your position</div>
        <div style={{ fontSize:11, color:'var(--text-tert)' }}>{r===1 ? "👑 You're leading!" : `${r-1} student${r>2?'s':''} ahead`}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, color:GOLD }}>{(e.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

// ── Period tabs ────────────────────────────────────────────────────────────────
const PERIODS = [
  { key:'week',     label:'This Week'  },
  { key:'lastWeek', label:'Last Week'  },
  { key:'month',    label:'This Month' },
  { key:'all',      label:'All Time'   },
]

// ── Hero banner ────────────────────────────────────────────────────────────────
function HeroBanner({ scope, schoolName }) {
  const isSchool = scope === 'school'
  return (
    <div style={{
      borderRadius:22, overflow:'hidden', position:'relative',
      background:`linear-gradient(140deg,${NAVY} 0%,#0c2360 55%,#0d3080 100%)`,
      padding:'20px 16px 20px',
      minHeight:110,
    }}>
      {/* Glow */}
      <div style={{ position:'absolute', top:0, right:0, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {/* Stars */}
      {[[GOLD,14,'16%'],[CYAN,9,'36%'],[GOLD,7,'56%']].map(([c,fs,top],i)=>(
        <div key={i} style={{ position:'absolute', top, right:`${14+i*9}%`, fontSize:fs, color:c, opacity:.38, pointerEvents:'none' }}>✦</div>
      ))}

      {/* Content — mascot + text + trophy in a flex row */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:12, position:'relative', zIndex:1 }}>
        {/* Mascot */}
        <div style={{ width:72, flexShrink:0, alignSelf:'flex-end' }}>
          <img
            src="/images/zara_studybuddy.png" alt=""
            style={{ width:'100%', display:'block', objectFit:'contain', objectPosition:'bottom', filter:'drop-shadow(0 6px 12px rgba(0,0,0,.5))' }}
            onError={e=>{e.currentTarget.style.display='none'}}
          />
        </div>

        {/* Text */}
        <div style={{ flex:1, minWidth:0, paddingBottom:4 }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:isSchool?GOLD:CYAN, marginBottom:4, opacity:.9 }}>
            {isSchool ? '🏫 School Board' : '🌍 National Board'}
          </div>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.1, marginBottom:2 }}>
            {isSchool && schoolName ? schoolName : 'Leaderboard'}
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>
            {isSchool ? 'Rankings within your school' : 'Compete with students across Nigeria'}
          </div>
        </div>

        {/* Trophy */}
        <div style={{ flexShrink:0, alignSelf:'flex-end' }}>
          <svg width="54" height="62" viewBox="0 0 70 80" fill="none">
            <ellipse cx="35" cy="73" rx="16" ry="5" fill="rgba(255,255,255,.08)"/>
            <rect x="28" y="59" width="14" height="14" rx="2" fill={GOLD} opacity=".8"/>
            <rect x="20" y="67" width="30" height="6" rx="3" fill={GOLD}/>
            <path d="M15 8h40v28c0 11-9 20-20 20S15 47 15 36V8z" fill={GOLD}/>
            <path d="M15 14H6C6 14 4 30 15 35" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M55 14h9c0 0 2 16-9 21" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <circle cx="35" cy="26" r="8" fill="rgba(255,255,255,.2)"/>
            <text x="35" y="31" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="900">★</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Connect to School ──────────────────────────────────────────────────────────
function ConnectSchoolCTA({ isGuest, onLinked, profile }) {
  const [showForm, setShowForm] = useState(false)

  if (isGuest) {
    return (
      <Link href="/onboarding?mode=signup" style={{ textDecoration:'none', display:'block' }}>
        <SchoolButton label="Create account to connect your school"/>
      </Link>
    )
  }
  return (
    <div>
      <button onClick={()=>setShowForm(v=>!v)} style={{ width:'100%', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
        <SchoolButton label={showForm ? 'Hide' : 'Connect to School'}/>
      </button>
      {showForm && (
        <div style={{ marginTop:10, borderRadius:18, border:'1px solid var(--border)', background:'var(--bg-card)', padding:'16px 18px' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:4 }}>Enter your school code</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', marginBottom:12, lineHeight:1.5 }}>Ask your teacher for the code to join the school leaderboard and share your progress.</div>
          <JoinSchool profile={profile} onLinked={onLinked} compact={true}/>
        </div>
      )}
    </div>
  )
}

function SchoolButton({ label }) {
  return (
    <div style={{
      borderRadius:18, background:'var(--bg-card)', border:'2px solid var(--border)',
      boxShadow:'0 4px 0 var(--border)', padding:'14px 18px',
      display:'flex', alignItems:'center', gap:14,
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 0 var(--border)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 var(--border)'}}
      onMouseDown={e=>{e.currentTarget.style.transform='translateY(2px)';e.currentTarget.style.boxShadow='0 1px 0 var(--border)'}}
      onMouseUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 0 var(--border)'}}
    >
      <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:`${BLUE}0e`, border:`2px solid ${BLUE}22`, boxShadow:`0 3px 0 ${BLUE}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏫</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)' }}>{label}</div>
        <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>See class rankings · Share progress with teachers</div>
      </div>
      <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, background:BLUE, boxShadow:'0 3px 0 #0a40a0', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  )
}

// ── Hall of Champions link ─────────────────────────────────────────────────────
function HallLink() {
  return (
    <Link href="/student/leaderboard/hall" style={{ textDecoration:'none', display:'block' }}>
      <div style={{ borderRadius:14, border:'1px solid var(--border)', background:'var(--bg-card)', padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,184,0,.1)', border:'1px solid rgba(255,184,0,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>🏛️</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)' }}>Hall of Champions</div>
          <div style={{ fontSize:10, color:'var(--text-tert)', marginTop:1 }}>Monthly winners</div>
        </div>
        <svg width="11" height="11" viewBox="0 0 13 13" fill="none" style={{ opacity:.35, flexShrink:0 }}>
          <path d="M4 2l5 4.5L4 11" stroke="var(--text-prim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyBoard({ scope }) {
  return (
    <Card style={{ padding:'28px 16px', textAlign:'center' }}>
      <div style={{ fontSize:30, marginBottom:8 }}>🏆</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:5 }}>No rankings yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', marginBottom:14 }}>
        {scope==='school' ? 'Be the first in your school to earn XP!' : 'Start practising to appear here!'}
      </div>
      <Link href="/student/practice" style={{ textDecoration:'none' }}>
        <div style={{ display:'inline-block', padding:'10px 20px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
      </Link>
    </Card>
  )
}

// ── School not connected placeholder ──────────────────────────────────────────
function SchoolNotConnected() {
  return (
    <Card style={{ padding:'26px 18px', textAlign:'center' }}>
      <div style={{ fontSize:34, marginBottom:8 }}>🏫</div>
      <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', marginBottom:5 }}>Your school board</div>
      <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.6, maxWidth:260, margin:'0 auto' }}>
        Connect your school to see how you rank against classmates.
      </div>
    </Card>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null
  const myId                = profile?.id ?? null

  const [schoolId,   setSchoolId]   = useState(null)
  const [schoolName, setSchoolName] = useState(null)

  useEffect(() => {
    if (profile?.school_id)   setSchoolId(profile.school_id)
    if (profile?.school_name) setSchoolName(profile.school_name)
  }, [profile?.school_id, profile?.school_name])

  const hasSchool = !isGuest && !!schoolId

  const [scope,   setScope]   = useState('national')
  const [period,  setPeriod]  = useState('week')
  const [board,   setBoard]   = useState([])
  const [loading, setLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  // Switch to school tab automatically when school is connected
  useEffect(() => { if (hasSchool) setScope('school') }, [hasSchool])

  const fetchBoard = useCallback(async (sc, per) => {
    if (sc==='school' && !hasSchool) { setBoard([]); setLoading(false); return }
    const cached = readCache(sc,per)
    if (cached?.length) { setBoard(cached); setLoading(false); return }
    setLoading(true); setIsFallback(false)
    try {
      const url = sc==='school' ? `/api/leaderboard/school?limit=20&period=${per}` : `/api/leaderboard/national?limit=20&period=${per}`
      const res  = await fetch(url)
      if (!res.ok) { setBoard([]); return }
      const data = await res.json()
      const list = data.leaderboard ?? []
      if (data.school_name) setSchoolName(data.school_name)
      if (list.length) writeCache(sc,per,list)
      setBoard(list); setIsFallback(!!data.fallback)
    } catch { setBoard([]) }
    finally { setLoading(false) }
  }, [hasSchool])

  useEffect(() => { if (isReady) fetchBoard(scope,period) }, [isReady,scope,period,hasSchool,fetchBoard])

  function handleLinked({ school_id, school_name }) {
    setSchoolId(school_id)
    if (school_name) setSchoolName(school_name)
    setBoard([]); setLoading(true); setScope('school')
    setTimeout(() => fetchBoard('school',period), 500)
  }

  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ height:110, borderRadius:22, background:`linear-gradient(135deg,${NAVY},#0d2872)`, opacity:.7 }}/>
      <Skeleton/>
    </div>
  )

  const showJoinCTA = scope==='school' && !hasSchool

  return (
    <>
      {/* Responsive styles injected inline */}
      <style>{`
        .lb-period-scroll { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
        .lb-period-scroll::-webkit-scrollbar { display:none; }
        .lb-row-school { font-size:10px; }
        @media(min-width:400px) { .lb-row-school { font-size:11px; } }
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── Scope tabs — only when school connected ── */}
        {hasSchool && (
          <div style={{ display:'inline-flex', alignSelf:'flex-start', background:'var(--bg-subtle)', borderRadius:14, padding:3, border:'1px solid var(--border)', gap:2 }}>
            {[{id:'national',label:'🌍 National'},{id:'school',label:'🏫 School'}].map(t=>{
              const on = t.id===scope
              return (
                <button key={t.id} onClick={()=>setScope(t.id)} style={{ padding:'7px 14px', borderRadius:11, fontSize:12, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', transition:'all .15s' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Hero ── */}
        <HeroBanner scope={scope} schoolName={schoolName}/>

        {/* ── Period tabs — horizontal scroll on small screens ── */}
        {!showJoinCTA && (
          <div className="lb-period-scroll">
            {PERIODS.map(t=>{
              const on = t.key===period
              return (
                <button key={t.key} onClick={()=>setPeriod(t.key)} style={{ padding:'7px 12px', borderRadius:999, fontSize:12, fontWeight:on?800:600, border:`1.5px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}12`:'transparent', color:on?BLUE:'var(--text-tert)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, transition:'all .15s' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ── School: not connected ── */}
        {showJoinCTA && <SchoolNotConnected/>}

        {/* ── My rank ── */}
        {!showJoinCTA && !loading && board.length>0 && myId && <MyRankBanner board={board} myId={myId}/>}

        {/* ── Fallback notice ── */}
        {!showJoinCTA && !loading && isFallback && period!=='all' && board.length>0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:12, background:'rgba(255,184,0,.08)', border:'1px solid rgba(255,184,0,.22)' }}>
            <span>ℹ️</span>
            <span style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5 }}>Showing all-time XP — weekly data populates as students practise.</span>
          </div>
        )}

        {/* ── Board ── */}
        {!showJoinCTA && (
          loading ? <Skeleton/> :
          !board.length ? <EmptyBoard scope={scope}/> :
          <Card>
            {board.length>=3 && <Podium entries={board.slice(0,3)} myId={myId}/>}
            {board.slice(board.length>=3?3:0).map((entry,i)=>(
              <BoardRow key={entry.student_id||i} entry={entry} rank={(board.length>=3?3:0)+i+1} myId={myId} showSchool={scope==='national'}/>
            ))}
          </Card>
        )}

        {/* ── Hall + Invite — stack on mobile, side by side on wider screens ── */}
        <style>{`.lb-extras{display:flex;flex-direction:column;gap:10px}@media(min-width:440px){.lb-extras{flex-direction:row}}`}</style>
        <div className="lb-extras">
          <div style={{ flex:1 }}><HallLink/></div>
          <div style={{ flex:1 }}><InviteFriendsCard compact={true}/></div>
        </div>

        {/* ── Connect to School CTA ── */}
        {!hasSchool && <ConnectSchoolCTA isGuest={isGuest} onLinked={handleLinked} profile={profile}/>}

        {/* ── School connected badge ── */}
        {hasSchool && schoolName && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)' }}>
            <span>🏫</span>
            <div style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--text-sec)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{schoolName}</div>
            <span style={{ fontSize:11, color:GREEN, fontWeight:800, flexShrink:0 }}>Connected ✓</span>
          </div>
        )}

        <div style={{ height:8 }}/>
      </div>
    </>
  )
}