'use client'
// src/app/student/leaderboard/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Two tabs: School (within your school) and National (all students).
// School tab: shows rankings within your school. If not connected, shows
//   the JoinSchool widget inline so the student can connect right here.
// National tab: always visible, works for guests too.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePoints }       from '@/contexts/PointsContext'
import { useTheme }        from '@/contexts/ThemeContext'
import { useStudentUser }  from '@/app/student/layout'
import JoinSchool          from '@/components/student/JoinSchool'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

const CACHE_SECS     = 120  // school: 2 min
const NAT_CACHE_SECS = 120  // national: 2 min (was 10 — reduced to prevent stale empty caches)

function cacheKey(scope, period) { return `ep_lb_${scope}_${period}` }
function readCache(scope, period) {
  try {
    const ttl = scope === 'school' ? CACHE_SECS : NAT_CACHE_SECS
    const c   = JSON.parse(localStorage.getItem(cacheKey(scope, period)) || 'null')
    if (c && (Date.now() - (c.ts||0)) < ttl*1000) return c.data
    return null
  } catch { return null }
}
function writeCache(scope, period, data) {
  try { localStorage.setItem(cacheKey(scope, period), JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroBanner({ dark, scope, schoolName, cohortName }) {
  const isSchool = scope === 'school'
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'24px 28px', display:'flex', alignItems:'center', minHeight:120 }}>
      <div style={{ position:'absolute', top:0, right:0, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'18%'],[CYAN,10,'32%'],[GOLD,8,'52%'],['#fff',11,'12%']].map(([c,fs,top],i)=>(
        <div key={i} style={{ position:'absolute', top, right:`${12+i*8}%`, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em', color:isSchool?GOLD:CYAN, marginBottom:6, opacity:.9 }}>
          {isSchool ? '🏫 School Board' : '🌍 National Board'}
        </div>
        <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.1, marginBottom:4 }}>
          {isSchool && schoolName ? schoolName : 'Leaderboard'}
        </div>
        {isSchool && cohortName && (
          <div style={{ fontSize:12, color:GOLD, fontWeight:700, opacity:.85, marginBottom:2 }}>
            {cohortName}
          </div>
        )}
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>
          {isSchool
            ? cohortName ? `Rankings for ${cohortName}` : 'Rankings within your school'
            : 'Compete with students across Nigeria'}
        </div>
      </div>
      <div style={{ position:'relative', width:140, height:110, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="" style={{ position:'absolute', bottom:0, left:0, width:110, height:110, objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
        <div style={{ position:'absolute', bottom:8, right:0 }}>
          <svg width="62" height="72" viewBox="0 0 70 80" fill="none">
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

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_COLORS = [
  {bg:'rgba(255,184,0,.2)',color:GOLD},{bg:'rgba(18,100,229,.2)',color:BLUE},
  {bg:'rgba(255,106,0,.18)',color:ORANGE},{bg:'rgba(24,183,242,.18)',color:CYAN},
  {bg:'rgba(124,58,237,.18)',color:'#7C3AED'},{bg:'rgba(34,197,94,.18)',color:GREEN},
]
function Avatar({ name, size=36, idx=0, isMe=false }) {
  const { bg, color } = AV_COLORS[idx % AV_COLORS.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:900, color:isMe?GOLD:color, flexShrink:0, border:isMe?`2px solid ${GOLD}40`:'none' }}>
      {(name||'?').charAt(0).toUpperCase()}
    </div>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ entries, myId, dark }) {
  if (entries.length < 3) return null
  const order          = [entries[1], entries[0], entries[2]]
  const heights        = [110, 140, 90]
  const sizes          = [68, 84, 62]
  const platformColors = [
    dark?'rgba(24,183,242,.25)':'rgba(24,183,242,.18)',
    dark?'rgba(255,184,0,.35)':'rgba(255,184,0,.28)',
    dark?'rgba(255,106,0,.25)':'rgba(224,106,0,.18)',
  ]
  const medalColors = [CYAN, GOLD, ORANGE]
  const ranks = [2, 1, 3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:10, padding:'8px 0', marginBottom:20 }}>
      {order.map((entry, col) => {
        const isMe    = entry?.student_id === myId
        const isFirst = col === 1
        return (
          <div key={col} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, maxWidth:col===1?180:150 }}>
            {isFirst ? <div style={{ fontSize:20, marginBottom:4 }}>👑</div> : <div style={{ height:24 }}/>}
            <div style={{ width:24, height:24, borderRadius:'50%', background:medalColors[col], display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#fff', marginBottom:6 }}>{ranks[col]}</div>
            <div style={{ marginBottom:8 }}>
              <Avatar name={entry?.name||'?'} size={sizes[col]} idx={col} isMe={isMe}/>
            </div>
            <div style={{ textAlign:'center', marginBottom:10 }}>
              <div style={{ fontSize:isFirst?13:12, fontWeight:900, color:isMe?BLUE:'var(--text-prim)' }}>{entry?.name||'—'}</div>
              <div style={{ fontSize:isFirst?15:13, fontWeight:900, color:isFirst?GOLD:BLUE, marginTop:3 }}>{(entry?.xp||0).toLocaleString()} XP</div>
            </div>
            <div style={{ width:'100%', height:heights[col], borderRadius:'12px 12px 0 0', background:platformColors[col], border:`1px solid ${medalColors[col]}50`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFirst && <div style={{ fontSize:18, opacity:.4 }}>⭐</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Board row ─────────────────────────────────────────────────────────────────
function BoardRow({ entry, rank, myId, showSchool }) {
  const isMe = entry.student_id === myId
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderTop:'1px solid var(--border)', background:isMe?`${BLUE}08`:'transparent' }}>
      <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:24, textAlign:'center', flexShrink:0 }}>{rank}</span>
      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:isMe?`linear-gradient(135deg,${NAVY},${BLUE})`:`${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:isMe?GOLD:BLUE }}>
        {(entry.name||'S').charAt(0)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {isMe ? 'You' : (entry.name||'Student')}
        </div>
        {showSchool && entry.school && (
          <div style={{ fontSize:10, color:'var(--text-tert)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.school}</div>
        )}
        {entry.streak_days > 0 && (
          <div style={{ fontSize:10, color:ORANGE }}>🔥 {entry.streak_days}d streak</div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:isMe?GOLD:'var(--text-prim)' }}>{(entry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BoardSkeleton() {
  return (
    <Card>
      <style>{`@keyframes sk2{0%,100%{opacity:.5}50%{opacity:.25}}`}</style>
      {[...Array(7)].map((_,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)', animation:'sk2 1.6s infinite' }}>
          <div style={{ width:22, height:14, borderRadius:4, background:'var(--bg-subtle)' }}/>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', flexShrink:0 }}/>
          <div style={{ flex:1, height:13, borderRadius:6, background:'var(--bg-subtle)' }}/>
          <div style={{ width:56, height:13, borderRadius:6, background:'var(--bg-subtle)' }}/>
        </div>
      ))}
    </Card>
  )
}

// ── School: not connected state ───────────────────────────────────────────────
function SchoolNotConnected({ profile, onLinked, isGuest }) {
  if (isGuest) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Card style={{ padding:'28px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏫</div>
          <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', marginBottom:6 }}>Connect your school</div>
          <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
            Create a free account first, then enter your school's code to join the school leaderboard and share your progress with teachers.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/signup" style={{ textDecoration:'none' }}>
              <div style={{ padding:'11px 24px', borderRadius:12, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Create Free Account →</div>
            </Link>
            <Link href="/login" style={{ textDecoration:'none' }}>
              <div style={{ padding:'11px 24px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--text-prim)', fontSize:13, fontWeight:700 }}>Sign in</div>
            </Link>
          </div>
        </Card>
        <Card style={{ padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:12 }}>Why connect your school?</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { icon:'📊', text:'Your performance trends are shared with your teachers so they can help you improve.' },
              { icon:'🏆', text:'See how you rank against classmates on the school leaderboard.' },
              { icon:'📬', text:'Your parents can receive weekly progress reports if your school enables it.' },
            ].map((item,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
                <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:5 }}>{item.text}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card style={{ padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🏫</div>
        <div style={{ fontSize:16, fontWeight:900, color:'var(--text-prim)', marginBottom:6 }}>Connect your school</div>
        <div style={{ fontSize:13, color:'var(--text-tert)', lineHeight:1.6, marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
          Enter the school code your teacher gave you to join your school's leaderboard and let your teachers track your progress.
        </div>
        <div style={{ maxWidth:340, margin:'0 auto' }}>
          <JoinSchool profile={profile} onLinked={onLinked} compact={false}/>
        </div>
      </Card>
      <Card style={{ padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:12 }}>Why connect your school?</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { icon:'📊', text:'Your performance trends are shared with your teachers so they can help you improve.' },
            { icon:'🏆', text:'See how you rank against classmates on the school leaderboard.' },
            { icon:'📬', text:'Your parents can receive weekly progress reports if your school enables it.' },
          ].map((item,i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-subtle)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
              <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:5 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Board display ─────────────────────────────────────────────────────────────
function BoardDisplay({ board, myId, loading, scope }) {
  if (loading) return <BoardSkeleton/>
  if (!board.length) return (
    <Card style={{ padding:'28px 18px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>🏆</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-prim)', marginBottom:6 }}>No rankings yet</div>
      <div style={{ fontSize:12, color:'var(--text-tert)' }}>
        {scope === 'school' ? 'Be the first in your school to earn XP!' : 'Start practising to appear on the leaderboard!'}
      </div>
      <Link href="/student/practice" style={{ textDecoration:'none' }}>
        <div style={{ marginTop:14, display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800 }}>Start Practising →</div>
      </Link>
    </Card>
  )

  return (
    <Card>
      {board.length >= 3 && <Podium entries={board.slice(0,3)} myId={myId} dark={false}/>}
      {board.slice(board.length >= 3 ? 3 : 0).map((entry, i) => (
        <BoardRow key={entry.student_id} entry={entry} rank={(board.length >= 3 ? 3 : 0) + i + 1} myId={myId} showSchool={scope === 'national'}/>
      ))}
    </Card>
  )
}

// ── My rank banner ────────────────────────────────────────────────────────────
function MyRankBanner({ board, myId, xp }) {
  const myEntry = board.find(e => e.student_id === myId)
  if (!myEntry) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:16, background:`${BLUE}10`, border:`1px solid ${BLUE}25` }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:GOLD, flexShrink:0 }}>
        #{myEntry.rank}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--text-prim)' }}>Your position</div>
        <div style={{ fontSize:11, color:'var(--text-tert)' }}>
          {myEntry.rank === 1 ? '👑 You\'re in the lead!' : `${myEntry.rank - 1} student${myEntry.rank > 2 ? 's' : ''} ahead of you`}
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:900, color:GOLD }}>{(myEntry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color:'var(--text-tert)' }}>XP</div>
      </div>
    </div>
  )
}

// ── Period tabs ───────────────────────────────────────────────────────────────
const PERIOD_TABS = [
  { key:'week',     label:'This Week'  },
  { key:'lastWeek', label:'Last Week'  },
  { key:'month',    label:'This Month' },
  { key:'all',      label:'All Time'   },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null

  const myId = profile?.id ?? null

  const [scope,      setScope]      = useState('school')
  const [period,     setPeriod]     = useState('week')
  const [board,      setBoard]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [schoolName, setSchoolName] = useState(profile?.school_name ?? null)
  const [cohortName, setCohortName] = useState(null)

  // Live school_id — updated when JoinSchool completes
  const [schoolId, setSchoolId] = useState(profile?.school_id ?? null)
  useEffect(() => {
    if (profile?.school_id) setSchoolId(profile.school_id)
    if (profile?.school_name) setSchoolName(profile.school_name)
    // Guests start on national
    if (isGuest) setScope('national')
  }, [profile?.school_id, profile?.school_name, isGuest])

  const hasSchool = !isGuest && !!schoolId

  const fetchBoard = useCallback(async (sc, per) => {
    // School tab, no school → skip fetch
    if (sc === 'school' && !hasSchool) { setBoard([]); setLoading(false); return }

    const cached = readCache(sc, per)
    // Skip cache if it's empty — always re-fetch to check if data appeared
    if (cached && cached.length > 0) { setBoard(cached); setLoading(false); return }

    setLoading(true)
    try {
      const endpoint = sc === 'school'
        ? `/api/leaderboard/school?limit=20&period=${per}`
        : `/api/leaderboard/national?limit=20&period=${per}`
      const res  = await fetch(endpoint)
      if (!res.ok) { setBoard([]); return }
      const data = await res.json()
      const list = data.leaderboard ?? []
      if (data.school_name) setSchoolName(data.school_name)
      if (data.cohort_name) setCohortName(data.cohort_name)
      // Only cache non-empty results — empty may be a transient failure
      if (list.length > 0) writeCache(sc, per, list)
      setBoard(list)
    } catch {
      setBoard([])
    } finally {
      setLoading(false)
    }
  }, [hasSchool])

  useEffect(() => {
    if (!isReady) return
    fetchBoard(scope, period)
  }, [isReady, scope, period, hasSchool, fetchBoard])

  function handleLinked({ school_id, school_name }) {
    setSchoolId(school_id)
    if (school_name) setSchoolName(school_name)
    // Refresh school board now that they're connected
    setBoard([])
    setLoading(true)
    setTimeout(() => fetchBoard('school', period), 500)
  }

  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ height:120, borderRadius:22, background:`linear-gradient(135deg,${NAVY},#0d2872)`, opacity:.7 }}/>
      <BoardSkeleton/>
    </div>
  )

  const showSchoolBoard = scope === 'school' && hasSchool
  const showJoinCTA     = scope === 'school' && !hasSchool

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@media(min-width:1024px){.lb-grid{display:grid!important;grid-template-columns:1fr 260px!important;gap:18px!important;align-items:flex-start!important}}`}</style>

      {/* ── Scope tabs ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'inline-flex', background:'var(--bg-subtle)', borderRadius:14, padding:3, border:'1px solid var(--border)', gap:2 }}>
          <button onClick={() => setScope('school')} style={{ padding:'9px 20px', borderRadius:11, fontSize:13, fontWeight:scope==='school'?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:scope==='school'?BLUE:'transparent', color:scope==='school'?'#fff':'var(--text-tert)', transition:'all .15s', display:'flex', alignItems:'center', gap:6 }}>
            🏫 School
            {hasSchool && <span style={{ fontSize:10, background:scope==='school'?'rgba(255,255,255,.2)':'var(--border)', color:scope==='school'?'#fff':'var(--text-tert)', padding:'1px 6px', borderRadius:999 }}>●</span>}
          </button>
          <button onClick={() => setScope('national')} style={{ padding:'9px 20px', borderRadius:11, fontSize:13, fontWeight:scope==='national'?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:scope==='national'?BLUE:'transparent', color:scope==='national'?'#fff':'var(--text-tert)', transition:'all .15s' }}>
            🌍 National
          </button>
        </div>

        {/* Period tabs — only show when board is relevant */}
        {(!showJoinCTA) && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
            {PERIOD_TABS.map(t => {
              const on = t.key === period
              return (
                <button key={t.key} onClick={() => setPeriod(t.key)} style={{ padding:'7px 12px', borderRadius:999, fontSize:12, fontWeight:on?800:600, border:`1px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}14`:'transparent', color:on?BLUE:'var(--text-tert)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <HeroBanner dark={dark} scope={scope} schoolName={schoolName} cohortName={cohortName}/>

      <div className="lb-grid" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* ── Left / main ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* School: not connected */}
          {showJoinCTA && (
            <SchoolNotConnected profile={profile} onLinked={handleLinked} isGuest={isGuest}/>
          )}

          {/* School or national board */}
          {!showJoinCTA && (
            <>
              {/* My rank banner */}
              {!loading && board.length > 0 && myId && (
                <MyRankBanner board={board} myId={myId} xp={xp}/>
              )}

              <BoardDisplay board={board} myId={myId} loading={loading} scope={scope}/>

              {/* School: connected badge */}
              {scope === 'school' && hasSchool && schoolName && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)' }}>
                  <span>🏫</span>
                  <div style={{ flex:1, fontSize:12, fontWeight:700, color:'var(--text-sec)' }}>{schoolName}</div>
                  <span style={{ fontSize:11, color:GREEN, fontWeight:800 }}>Connected ✓</span>
                </div>
              )}

              {/* Motivational footer */}
              <div style={{ borderRadius:18, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}20`, padding:'18px 18px 18px 140px', minHeight:100 }}>
                <div style={{ position:'absolute', bottom:0, left:0, width:130, height:100 }}>
                  <img src="/images/zara_studybuddy.png" alt="" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
                </div>
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:14, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>Keep climbing! 🚀</div>
                  <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.55)':'var(--text-tert)', lineHeight:1.5 }}>Every practice session earns XP. Complete daily challenges to jump up the ranks fast!</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right col ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Guest CTA */}
          {isGuest && (
            <div style={{ borderRadius:18, padding:'20px 18px', background:`linear-gradient(135deg,${BLUE} 0%,${NAVY} 100%)`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
              <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:6 }}>🏆 Join the leaderboard!</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:14 }}>Create a free account to earn XP, connect your school, and compete with students across Nigeria.</div>
              <Link href="/register" style={{ textDecoration:'none' }}>
                <button style={{ width:'100%', padding:'11px', borderRadius:11, border:'none', cursor:'pointer', background:'#fff', color:BLUE, fontSize:13, fontWeight:900, fontFamily:'inherit' }}>Create Free Account →</button>
              </Link>
            </div>
          )}

          {/* School connection prompt in sidebar if on national */}
          {!isGuest && !hasSchool && scope === 'national' && (
            <Card style={{ padding:'16px' }}>
              <div style={{ fontSize:12, fontWeight:900, color:'var(--text-prim)', marginBottom:10 }}>🏫 Connect your school</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginBottom:12, lineHeight:1.5 }}>
                Enter the school code your teacher gave you to join the leaderboard and share progress with your teachers.
              </div>
              <JoinSchool profile={profile} onLinked={handleLinked} compact={true}/>
            </Card>
          )}

          {/* About */}
          <Card style={{ padding:'18px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text-prim)', marginBottom:12 }}>About Leaderboard</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { icon:'⭐', text:'Earn XP by practising questions and completing daily challenges.' },
                { icon:'🏫', text:'School leaderboard shows rankings within your school. Connect using the school code from your teacher.' },
                { icon:'📊', text:'Your performance trends are shared with your school if you\'re connected.' },
                { icon:'📅', text:'Weekly board resets every Monday.' },
              ].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:dark?'rgba(255,255,255,.05)':'rgba(18,100,229,.06)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{item.icon}</div>
                  <div style={{ fontSize:11, color:'var(--text-tert)', lineHeight:1.5, paddingTop:4 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}