'use client'
// src/app/student/leaderboard/page.js — v2
// ─────────────────────────────────────────────────────────────────────────────
// Local-first. Profile from layout context (instant, no redundant auth call).
// Leaderboard: background fetch, cached 10 min per scope+period combination.
// Guests: show national board, hide school tab, show join CTA.
// No blocking spinner — skeleton while board loads.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { usePoints }       from '@/contexts/PointsContext'
import { useTheme }        from '@/contexts/ThemeContext'
import { useStudentUser }  from '@/app/student/layout'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'

const BOARD_CACHE_SECS = 600

function boardCacheKey(scope, period) { return `ep_lb_${scope}_${period}` }
function readBoardCache(scope, period) {
  try {
    const c = JSON.parse(localStorage.getItem(boardCacheKey(scope, period)) || 'null')
    if (c && (Date.now() - (c.ts||0)) < BOARD_CACHE_SECS*1000) return c.data
    return null
  } catch { return null }
}
function writeBoardCache(scope, period, data) {
  try { localStorage.setItem(boardCacheKey(scope, period), JSON.stringify({ data, ts: Date.now() })) } catch {}
}

function Card({ children, style={} }) {
  return <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 16px rgba(6,42,120,.06)', overflow:'hidden', ...style }}>{children}</div>
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function HeroBanner({ dark }) {
  return (
    <div style={{ borderRadius:22, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY} 0%,#0a1f5e 60%,#0e2875 100%)`:`linear-gradient(135deg,${NAVY} 0%,#0c2360 50%,#1040a0 100%)`, padding:'28px 32px', display:'flex', alignItems:'center', minHeight:130 }}>
      <div style={{ position:'absolute', top:0, right:0, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {[[GOLD,14,'18%'],[CYAN,10,'32%'],[GOLD,8,'48%'],['#fff',12,'12%']].map(([c,fs,top],i)=>(
        <div key={i} style={{ position:'absolute', top, right:`${12+i*8}%`, fontSize:fs, color:c, opacity:.5 }}>✦</div>
      ))}
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1.1, marginBottom:8 }}>Leaderboard</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,.55)' }}>Compete. Climb. Become the best version of you.</div>
      </div>
      <div style={{ position:'relative', width:200, height:130, flexShrink:0, zIndex:1 }}>
        <img src="/images/zara_studybuddy.png" alt="Zara" style={{ position:'absolute', bottom:0, left:0, width:120, height:120, objectFit:'contain', filter:'drop-shadow(0 4px 16px rgba(0,0,0,.4))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
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

// ─── AVATAR ───────────────────────────────────────────────────────────────────
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

// ─── PODIUM ───────────────────────────────────────────────────────────────────
function Podium({ entries, myId, dark }) {
  if (entries.length < 3) return null
  const order   = [entries[1], entries[0], entries[2]]
  const heights = [110, 140, 90]
  const sizes   = [68, 84, 62]
  const platformColors = [
    dark?'rgba(24,183,242,.25)':'rgba(24,183,242,.18)',
    dark?'rgba(255,184,0,.35)':'rgba(255,184,0,.28)',
    dark?'rgba(255,106,0,.25)':'rgba(224,106,0,.18)',
  ]
  const medalColors = [CYAN, GOLD, ORANGE]
  const ranks = [2, 1, 3]

  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:12, padding:'0 0 8px', marginBottom:20 }}>
      {order.map((entry,col)=>{
        const isMe    = entry?.student_id===myId
        const isFirst = col===1
        return (
          <div key={col} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, maxWidth:col===1?180:150 }}>
            {isFirst ? <div style={{ fontSize:22, marginBottom:4 }}>👑</div> : <div style={{ height:26 }}/>}
            <div style={{ width:26, height:26, borderRadius:'50%', background:medalColors[col], display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', marginBottom:6 }}>{ranks[col]}</div>
            <div style={{ position:'relative', marginBottom:10 }}>
              <Avatar name={entry?.name||entry?.first_name||'?'} size={sizes[col]} idx={col} isMe={isMe}/>
            </div>
            <div style={{ textAlign:'center', marginBottom:10 }}>
              <div style={{ fontSize:isFirst?14:13, fontWeight:900, color:isMe?BLUE:'var(--text-prim)' }}>{entry?.name||entry?.first_name||'—'}</div>
              <div style={{ fontSize:isFirst?16:14, fontWeight:900, color:BLUE, marginTop:4 }}>{(entry?.xp||entry?.points||0).toLocaleString()} XP</div>
            </div>
            <div style={{ width:'100%', height:heights[col], borderRadius:'12px 12px 0 0', background:platformColors[col], border:`1px solid ${medalColors[col]}50`, borderBottom:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFirst && <div style={{ fontSize:20, opacity:.4 }}>⭐</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── BOARD SKELETON ───────────────────────────────────────────────────────────
function BoardSkeleton() {
  return (
    <Card>
      {[...Array(6)].map((_,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ width:22, height:16, borderRadius:4, background:'var(--bg-subtle)' }}/>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--bg-subtle)', flexShrink:0 }}/>
          <div style={{ flex:1, height:14, borderRadius:6, background:'var(--bg-subtle)' }}/>
          <div style={{ width:60, height:14, borderRadius:6, background:'var(--bg-subtle)' }}/>
        </div>
      ))}
      <style>{`@keyframes pulse2{0%,100%{opacity:.6}50%{opacity:.3}}`}</style>
    </Card>
  )
}

// ─── GUEST CTA ────────────────────────────────────────────────────────────────
function GuestLeaderboardCTA({ dark }) {
  return (
    <div style={{ borderRadius:18, padding:'22px 20px', background:`linear-gradient(135deg,${BLUE} 0%,${NAVY} 100%)`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
      <div style={{ fontSize:13, fontWeight:900, color:'#fff', marginBottom:6 }}>🏆 Join the leaderboard!</div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,.65)', lineHeight:1.5, marginBottom:16 }}>Create a free account to earn XP, climb the ranks, and compete with students across Nigeria.</div>
      <Link href="/register" style={{ textDecoration:'none' }}>
        <button style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', cursor:'pointer', background:'#fff', color:BLUE, fontSize:13, fontWeight:900, fontFamily:'inherit' }}>Create Free Account →</button>
      </Link>
    </div>
  )
}

// ─── ABOUT CARD ───────────────────────────────────────────────────────────────
function AboutLeaderboard({ dark }) {
  return (
    <Card style={{ padding:'18px' }}>
      <div style={{ fontSize:14, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', marginBottom:14 }}>About Leaderboard</div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[
          { icon:'⭐', text:'Earn XP by practising questions and completing daily quests.' },
          { icon:'📅', text:'Leaderboard resets every week.' },
          { icon:'🎁', text:'Top performers get special rewards!' },
        ].map((item,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:dark?'rgba(255,255,255,.05)':'rgba(18,100,229,.06)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
            <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5, paddingTop:4 }}>{item.text}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const SCOPE_TABS  = [{key:'school',label:'School'},{key:'national',label:'National'}]
const PERIOD_TABS = [{key:'week',label:'This Week'},{key:'lastWeek',label:'Last Week'},{key:'month',label:'This Month'},{key:'all',label:'All Time'}]

export default function LeaderboardPage() {
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const profile             = useStudentUser()
  const isGuest             = !!profile?.isGuest
  const isReady             = profile !== null
  const hasSchool           = !isGuest && !!profile?.school_id

  const myId    = profile?.id ?? null
  const name    = profile?.full_name?.split(' ')[0] || profile?.username || 'Student'

  // Guests can only see national board
  const [scope,   setScope]   = useState('national')
  const [period,  setPeriod]  = useState('week')
  const [board,   setBoard]   = useState(() => readBoardCache('national', 'week') ?? [])
  const [loading, setLoading] = useState(board.length === 0)
  const fetchRef = useRef(null)

  useEffect(() => {
    if (!isReady) return

    const cached = readBoardCache(scope, period)
    if (cached) { setBoard(cached); setLoading(false); return }

    setLoading(true)
    const ctrl = new AbortController()
    fetchRef.current = ctrl

    const endpoint = scope === 'school'
      ? `/api/leaderboard/school?limit=12&period=${period}`
      : `/api/leaderboard/national?limit=12&period=${period}`
    fetch(endpoint, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const data = d.leaderboard ?? []
        writeBoardCache(scope, period, data)
        setBoard(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [isReady, scope, period])

  // Page skeleton while layout resolves
  if (!isReady) return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ height:130, borderRadius:22, background:`linear-gradient(135deg,${NAVY},#0d2872)`, opacity:0.7 }}/>
      <BoardSkeleton/>
    </div>
  )

  const champion = board[0] ? { name: board[0].name || board[0].first_name, xp: board[0].xp || board[0].points || 0 } : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes pulse2{0%,100%{opacity:.6}50%{opacity:.3}} @media(min-width:1024px){.lb-grid{display:grid!important;grid-template-columns:1fr 260px!important;gap:18px!important;align-items:flex-start!important}}`}</style>

      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        {/* Scope — hide school tab for guests */}
        {!isGuest && (
          <div style={{ display:'flex', background:dark?'rgba(255,255,255,.04)':'rgba(6,42,120,.04)', borderRadius:13, padding:3, border:'1px solid var(--border)' }}>
            {SCOPE_TABS.map(t=>{
              const on=t.key===scope
              return <button key={t.key} onClick={()=>setScope(t.key)} style={{ padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:on?800:600, border:'none', cursor:'pointer', fontFamily:'inherit', background:on?BLUE:'transparent', color:on?'#fff':'var(--text-tert)', boxShadow:on?`0 2px 8px ${BLUE}40`:'none', transition:'all .15s' }}>{t.label}</button>
            })}
          </div>
        )}
        {isGuest && (
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-tert)' }}>🌍 National Board</div>
        )}

        {/* Period */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
          {PERIOD_TABS.map(t=>{
            const on=t.key===period
            return <button key={t.key} onClick={()=>setPeriod(t.key)} style={{ padding:'8px 14px', borderRadius:999, fontSize:12, fontWeight:on?800:600, border:`1px solid ${on?BLUE:'var(--border)'}`, background:on?`${BLUE}14`:'transparent', color:on?BLUE:'var(--text-tert)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' }}>{t.label}</button>
          })}
        </div>
      </div>

      {/* School CTA for users without school */}
      {!isGuest && !hasSchool && scope === 'school' && (
        <div style={{ borderRadius:16, padding:'14px 16px', background:dark?`${NAVY}cc`:`linear-gradient(135deg,${BLUE}15,${NAVY}10)`, border:`1px solid ${BLUE}25`, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ fontSize:28, flexShrink:0 }}>🏫</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', marginBottom:3 }}>Connect your school first</div>
            <div style={{ fontSize:11, color:'var(--text-tert)' }}>Go to your profile to enter your school code.</div>
          </div>
          <Link href="/student/profile" style={{ textDecoration:'none', flexShrink:0 }}>
            <button style={{ padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', background:BLUE, color:'#fff', fontSize:12, fontWeight:800, fontFamily:'inherit' }}>Profile →</button>
          </Link>
        </div>
      )}

      <HeroBanner dark={dark}/>

      <div className="lb-grid" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {/* Left — board */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {loading ? <BoardSkeleton/> : board.length === 0 ? (
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
              {board.length >= 3 && <Podium entries={board.slice(0,3)} myId={myId} dark={dark}/>}
              {board.length > 3 && (
                <div style={{ paddingBottom:8 }}>
                  {board.slice(3).map((entry,i)=>{
                    const isMe = entry.student_id===myId
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 18px', borderTop:'1px solid var(--border)', background:isMe?`${BLUE}08`:'transparent' }}>
                        <span style={{ fontSize:12, fontWeight:800, color:'var(--text-tert)', width:22, textAlign:'center', flexShrink:0 }}>{i+4}</span>
                        <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:`${BLUE}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:BLUE }}>
                          {(entry.first_name||entry.name||'S').charAt(0)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {isMe?'You':(entry.first_name||entry.name||'Student')}
                          </div>
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

          {/* Motivational footer */}
          <div style={{ borderRadius:20, overflow:'hidden', position:'relative', background:dark?`linear-gradient(135deg,${NAVY},#0a1f5e)`:`linear-gradient(135deg,#f0f6ff,#e8f0ff)`, border:`1px solid ${BLUE}20`, padding:'20px 20px 20px 150px', minHeight:110 }}>
            <div style={{ position:'absolute', bottom:0, left:0, width:140, height:110 }}>
              <img src="/images/zara_studybuddy.png" alt="Zara" style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'bottom left', filter:'drop-shadow(0 2px 8px rgba(0,0,0,.2))' }} onError={e=>{e.currentTarget.style.display='none'}}/>
            </div>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontSize:15, fontWeight:900, color:dark?'#fff':'var(--text-prim)', letterSpacing:'-.02em', marginBottom:4 }}>You're doing great! 🚀</div>
              <div style={{ fontSize:12, color:dark?'rgba(255,255,255,.6)':'var(--text-tert)', lineHeight:1.5 }}>Practice more questions, complete your daily quests and move up the ranks!</div>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {isGuest && <GuestLeaderboardCTA dark={dark}/>}
          <AboutLeaderboard dark={dark}/>
        </div>
      </div>
    </div>
  )
}