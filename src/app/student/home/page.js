'use client'
// src/app/student/home/page.js

import { useState, useEffect, useCallback } from 'react'
import { usePoints }         from '@/contexts/PointsContext'
import { useRouter }         from 'next/navigation'
import { useTheme }          from '@/contexts/ThemeContext'
import { useStudentUser }    from '@/app/student/layout'
import { createClient }      from '@/lib/supabase/client'
import Link from 'next/link'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#22c55e'
const PURPLE = '#7C3AED'
const CYAN   = '#18B7F2'

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
}

const MSGS = [
  (n, l) => l > 0 ? `Just ${l} more ${l === 1 ? 'quest' : 'quests'} to go, ${n}!` : `All done today, ${n}. Excellent work!`,
  (n)    => `You are on track, ${n}. Keep the momentum going.`,
  (n, l) => l > 0 ? `${n}, knock out those quests and earn your XP.` : `Every quest done. You owned today, ${n}.`,
  (n)    => `Consistent effort every day is what separates you, ${n}.`,
]

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:'var(--bg-card)', borderRadius:20, border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(6,42,120,.05)', overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}
function SectionLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:18, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{children}</span>
      {right}
    </div>
  )
}

// ─── HERO BANNER ─────────────────────────────────────────────────────────────
function HeroBanner({ name, quests, xp, dark }) {
  const leftCount = quests.filter(q => !q.completed).length
  const msg       = MSGS[Math.floor(Date.now() / 86400000) % MSGS.length](name, leftCount)
  const level     = Math.floor((xp || 0) / 2000) + 1
  const xpInLvl   = (xp || 0) % 2000
  const xpPct     = Math.min(100, Math.round((xpInLvl / 2000) * 100))

  return (
    <div style={{
      borderRadius: 24, overflow:'hidden', position:'relative',
      background: `linear-gradient(135deg, ${NAVY} 0%, #0d2872 55%, #0e3494 100%)`,
      padding: '28px 28px 0',
      minHeight: 200,
    }}>
      {/* Glow blobs */}
      <div style={{ position:'absolute', top:-40, right:-40, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.14) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:0, left:'30%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
      {/* Sparkles */}
      <div style={{ position:'absolute', top:18, right:'38%', fontSize:14, color:GOLD, opacity:.6 }}>✦</div>
      <div style={{ position:'absolute', top:32, right:'33%', fontSize:8,  color:CYAN, opacity:.5 }}>✦</div>
      <div style={{ position:'absolute', top:60, right:'41%', fontSize:10, color:GOLD, opacity:.35 }}>✦</div>

      <div style={{ display:'flex', alignItems:'flex-end', gap:0 }}>
        {/* Text */}
        <div style={{ flex:1, zIndex:1, paddingBottom:28 }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.14em', color:'rgba(255,255,255,.4)', marginBottom:8 }}>
            Good {getGreeting()}
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.03em', lineHeight:1.25, marginBottom:10 }}>
            {msg}
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:`${GOLD}cc`, marginBottom:20 }}>
            — Zara, your study buddy
          </div>

          {/* XP bar */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)', borderRadius:14, padding:'10px 14px', border:'1px solid rgba(255,255,255,.12)' }}>
            <svg width="22" height="22" viewBox="0 0 44 44" aria-hidden="true">
              <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" fill={NAVY} stroke={GOLD} strokeWidth="2.5"/>
              <text x="22" y="28" textAnchor="middle" fontSize="13" fill={GOLD} fontWeight="900">⚡</text>
            </svg>
            <div style={{ minWidth:100 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', color:'rgba(255,255,255,.5)' }}>Level {level}</span>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.55)' }}>{xpInLvl.toLocaleString()} / 2,000</span>
              </div>
              <div style={{ height:5, borderRadius:999, background:'rgba(255,255,255,.15)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${xpPct}%`, borderRadius:999, background:`linear-gradient(90deg,${ORANGE},${GOLD})` }}/>
              </div>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <div style={{ width:220, flexShrink:0, alignSelf:'flex-end', position:'relative', zIndex:1 }}>
          <img
            src="/images/zara_studybuddy.png"
            alt="Zara your study buddy"
            style={{ width:'100%', display:'block', objectFit:'contain', objectPosition:'bottom', filter:'drop-shadow(0 8px 24px rgba(0,0,0,.5))' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── TWO-COLUMN GRID WRAPPER (desktop only) ────────────────────────────────
function PageGrid({ left, right }) {
  return (
    <>
      <style>{`
        .home-grid { display: flex; flex-direction: column; gap: 22px }
        .home-grid-right { display: flex; flex-direction: column; gap: 18px }
        @media (min-width: 1024px) {
          .home-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: flex-start }
        }
      `}</style>
      <div className="home-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:22 }}>{left}</div>
        <div className="home-grid-right">{right}</div>
      </div>
    </>
  )
}

// ─── TODAY'S QUESTS ───────────────────────────────────────────────────────────
function TodaysQuests({ quests, dark }) {
  const done = quests.filter(q => q.completed).length

  if (!quests.length) return (
    <div>
      <SectionLabel>Today's Quests</SectionLabel>
      <Card style={{ padding:'28px 20px', textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:10 }}>🎯</div>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-prim)', marginBottom:6 }}>No quests yet</div>
        <div style={{ fontSize:13, color:'var(--text-tert)', marginBottom:16 }}>Set up your subjects to unlock daily quests and start earning XP.</div>
        <Link href="/student/subjects">
          <div style={{ display:'inline-block', padding:'10px 22px', borderRadius:999, background:BLUE, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>Set up subjects →</div>
        </Link>
      </Card>
    </div>
  )

  return (
    <div>
      <SectionLabel right={
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:16 }}>🔥</span>
          <span style={{ fontSize:13, fontWeight:800, color:ORANGE }}>{done}/{quests.length} done</span>
        </div>
      }>Today's Quests</SectionLabel>
      <Card>
        {quests.map((q, i) => (
          <div key={q.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < quests.length-1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:q.completed?GREEN:'transparent', border:q.completed?'none':`2px solid ${dark?'rgba(255,255,255,.18)':'rgba(6,42,120,.15)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {q.completed && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:q.completed?'var(--text-tert)':'var(--text-prim)', textDecoration:q.completed?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.title}</div>
              <div style={{ fontSize:11, color:'var(--text-tert)', marginTop:2 }}>{q.subtitle}</div>
            </div>
            <div style={{ fontSize:12, fontWeight:800, color:q.completed?'var(--text-tert)':ORANGE, flexShrink:0 }}>+{q.xp} XP</div>
          </div>
        ))}
        <Link href="/student/practice" style={{ textDecoration:'none' }}>
          <div style={{ padding:'13px 20px', textAlign:'center', fontSize:13, fontWeight:700, color:BLUE, borderTop:'1px solid var(--border)', cursor:'pointer' }}>
            Start practising →
          </div>
        </Link>
      </Card>
    </div>
  )
}

// ─── EXAM GOALS ───────────────────────────────────────────────────────────────
function ExamGoals({ profile, exams }) {
  const items = [
    { icon:'🏛️', label:'University', value: profile?.target_university || 'Not set', color:BLUE   },
    { icon:'📚', label:'Course',     value: profile?.target_course     || 'Not set', color:PURPLE  },
  ]
  if (exams.includes('WAEC') || !exams.length) items.push({ text:'WAEC', label:'WAEC target', value: profile?.target_waec || 'Not set', color:NAVY   })
  if (exams.includes('JAMB') || !exams.length) items.push({ text:'JAMB', label:'JAMB target', value: profile?.target_jamb || 'Not set', color:ORANGE })

  const allNotSet = items.every(i => i.value === 'Not set')

  return (
    <div>
      <SectionLabel right={<Link href="/student/profile" style={{ textDecoration:'none', fontSize:13, fontWeight:700, color:BLUE }}>Edit →</Link>}>
        Exam Goals
      </SectionLabel>
      {allNotSet && (
        <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:12, background:`${ORANGE}10`, border:`1px solid ${ORANGE}25`, fontSize:12, color:ORANGE, fontWeight:700 }}>
          💡 Set your goals in Profile to stay focused and track what matters.
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, border:'1px solid var(--border)' }}>
            <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:`${item.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:item.text?11:20, fontWeight:900, color:item.color }}>
              {item.text || item.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:item.color, marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PRACTICE ACTIVITY ────────────────────────────────────────────────────────
function PracticeActivity({ activity, dark }) {
  const days     = ['M','T','W','T','F','S','S']
  const todayIdx = (new Date().getDay() + 6) % 7
  const maxH     = Math.max(...activity, 1)
  const total    = activity.reduce((a, b) => a + b, 0)

  return (
    <Card style={{ padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)' }}>Practice Activity</span>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)' }}>This week</span>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:54, marginTop:16, marginBottom:8 }}>
        {days.map((d, i) => {
          const h = Math.max(Math.round((activity[i] / maxH) * 46), activity[i] > 0 ? 6 : 3)
          const isToday = i === todayIdx
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
              <div style={{ width:'100%', borderRadius:'4px 4px 0 0', height:h, background:isToday?ORANGE:BLUE, opacity:isToday?1:activity[i]>0?0.6:0.13 }}/>
              <span style={{ fontSize:9, fontWeight:700, color:isToday?ORANGE:'var(--text-tert)', textTransform:'uppercase' }}>{d}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', paddingTop:12, borderTop:'1px solid var(--border)', marginTop:8 }}>
        {[{val:total,label:'Questions'},{val:'0🔥',label:'Streak'}].map((s,i)=>(
          <div key={i} style={{ flex:1, textAlign:i===1?'right':'left' }}>
            <div style={{ fontSize:18, fontWeight:900, color:i===1?ORANGE:'var(--text-prim)', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-tert)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── LEADERBOARD SNAP ─────────────────────────────────────────────────────────
function LeaderboardSnap({ board, myId, dark }) {
  const medals = ['🥇','🥈','🥉']
  return (
    <Card style={{ padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)' }}>Leaderboard</span>
        <Link href="/student/leaderboard" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:BLUE }}>See all →</Link>
      </div>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-tert)', marginBottom:14 }}>Global · This week</div>
      {board.length === 0 ? (
        <div style={{ padding:'18px 0', textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:6 }}>🏆</div>
          <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>Start practising to<br/>appear on the board!</div>
        </div>
      ) : board.map((entry, i) => {
        const isMe = entry.student_id === myId
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 6px', borderBottom:i<board.length-1?'1px solid var(--border)':'none', background:isMe?`${BLUE}08`:'transparent', borderRadius:isMe?10:0 }}>
            <span style={{ fontSize:i<3?14:11, width:22, textAlign:'center', flexShrink:0 }}>{i<3?medals[i]:i+1}</span>
            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:`${BLUE}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:BLUE }}>
              {(entry.first_name||'?').charAt(0)}
            </div>
            <span style={{ flex:1, fontSize:13, fontWeight:isMe?800:600, color:isMe?BLUE:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{isMe?'You':entry.first_name}</span>
            <span style={{ fontSize:12, fontWeight:800, color:isMe?GOLD:'var(--text-tert)', flexShrink:0 }}>{(entry.points||0).toLocaleString()} XP</span>
          </div>
        )
      })}
    </Card>
  )
}

// ─── JUMP IN ──────────────────────────────────────────────────────────────────
function JumpInCards() {
  return (
    <div>
      <SectionLabel>Jump In</SectionLabel>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {[
          { icon:'⚡', label:'Speed Round',  sub:'10 questions · 60 sec',   xp:'+15 XP',  dark:false, href:'/student/practice?mode=speed', bg:'var(--bg-card)', border:'var(--border)' },
          { icon:'📋', label:'Mock Exam',    sub:'Full WAEC / JAMB format', xp:'+200 XP', dark:true,  href:'/student/practice?mode=mock',  bg:`linear-gradient(145deg,${NAVY},#04194a)`, border:'rgba(24,183,242,.2)' },
        ].map(item => (
          <Link key={item.label} href={item.href} style={{ textDecoration:'none' }}>
            <div style={{ borderRadius:20, padding:'20px 18px', display:'flex', flexDirection:'column', gap:12, background:item.bg, border:`1px solid ${item.border}`, minHeight:140, position:'relative', overflow:'hidden', cursor:'pointer', boxShadow: item.dark ? `0 8px 32px rgba(6,42,120,.35)` : '0 2px 8px rgba(6,42,120,.05)' }}>
              {item.dark && <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.14) 0%,transparent 70%)', pointerEvents:'none' }}/>}
              <div style={{ width:46, height:46, borderRadius:'50%', background: item.dark?'rgba(255,184,0,.18)':'rgba(18,100,229,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:item.dark?'#fff':'var(--text-prim)', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:12, color:item.dark?'rgba(255,255,255,.5)':'var(--text-tert)' }}>{item.sub}</div>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:999, fontSize:11, fontWeight:800, background:item.dark?'rgba(255,255,255,.14)':'rgba(255,184,0,.14)', color:item.dark?'#fff':ORANGE, alignSelf:'flex-start' }}>
                ⚡ {item.xp}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── CONSISTENCY BANNER ───────────────────────────────────────────────────────
function ConsistencyBanner() {
  return (
    <div style={{ borderRadius:20, background:'rgba(255,184,0,.06)', border:`1px solid ${GOLD}28`, padding:'20px 24px', display:'flex', alignItems:'center', gap:16, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', right:-30, top:-30, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,.1) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ fontSize:38, flexShrink:0 }}>🏆</div>
      <div style={{ flex:1, zIndex:1 }}>
        <div style={{ fontSize:15, fontWeight:900, color:'var(--text-prim)', marginBottom:4 }}>Consistency is your superpower! 💪</div>
        <div style={{ fontSize:12, color:'var(--text-tert)', lineHeight:1.5 }}>Keep practising daily and watch yourself level up.</div>
      </div>
    </div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router  = useRouter()
  const { dark }            = useTheme()
  const { totalPoints: xp } = usePoints()
  const layoutProfile       = useStudentUser()   // from layout — already fetched

  const [quests,   setQuests]   = useState([])
  const [board,    setBoard]    = useState([])
  const [myId,     setMyId]     = useState(null)
  const [activity, setActivity] = useState([0,0,0,0,0,0,0])
  const [ready,    setReady]    = useState(false)

  // Derive exams from layout profile
  const exams   = layoutProfile?.exam_types || []
  const profile = layoutProfile

  function buildQuests(prof) {
    try {
      const cached = JSON.parse(localStorage.getItem('ep_quests') || '{}')
      if (cached.date === new Date().toISOString().slice(0,10) && cached.quests?.length) {
        setQuests(cached.quests); return
      }
    } catch {}
    const subs = prof?.subjects || []
    const [s0='Mathematics', s1='English', s2='a subject'] = subs
    const pool = [
      { id:1, title:`Solve 8 ${s0} questions`,  subtitle:'Keep your streak going!', xp:20, completed:false },
      { id:2, title:`${s1} speed round`,          subtitle:'10 questions · 60 sec',  xp:15, completed:false },
      { id:3, title:`Score 60%+ in ${s2}`,        subtitle:'Practice set',           xp:25, completed:false },
      { id:4, title:"Revise today's lesson",       subtitle:'Quick recap',            xp:10, completed:false },
    ]
    try { localStorage.setItem('ep_quests', JSON.stringify({ date: new Date().toISOString().slice(0,10), quests: pool })) } catch {}
    setQuests(pool)
  }

  const loadPageData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setMyId(session.user.id)

        // Load leaderboard + activity in parallel
        const [boardRes] = await Promise.all([
          fetch('/api/leaderboard/global?limit=6&period=week').then(r => r.json()).catch(() => ({ leaderboard: [] })),
        ])
        setBoard(boardRes?.leaderboard || [])

        // Activity this week
        const monday = new Date()
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        monday.setHours(0, 0, 0, 0)
        const { data: attempts } = await supabase.from('question_attempts')
          .select('created_at').eq('student_id', session.user.id).gte('created_at', monday.toISOString())
        if (attempts?.length) {
          const counts = [0,0,0,0,0,0,0]
          attempts.forEach(a => { const d = new Date(a.created_at); counts[(d.getDay()+6)%7]++ })
          setActivity(counts)
        }
      } else {
        // Guest
        try {
          const guest = JSON.parse(localStorage.getItem('ep_guest') || '{}')
          if (!guest.onboarded) { router.replace('/onboarding'); return }
        } catch { router.replace('/onboarding'); return }
      }
    } catch (e) { console.error(e) }
    finally { setReady(true) }
  }, [router])

  // Build quests once we have a profile (from layout context)
  useEffect(() => {
    if (profile !== null) buildQuests(profile)
  }, [profile])

  // Redirect if not onboarded
  useEffect(() => {
    if (profile !== null && !profile?.onboarded && !profile?.isGuest) {
      router.replace('/onboarding')
    }
  }, [profile, router])

  useEffect(() => { loadPageData() }, [loadPageData])

  // Show spinner only until page data is ready; profile streams in after
  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid var(--border)`, borderTopColor:BLUE, animation:'spin .7s linear infinite' }}/>
    </div>
  )

  const displayName = cap(profile?.full_name?.split(' ')[0] || profile?.username || 'Student')

  return (
    <PageGrid
      left={<>
        <HeroBanner name={displayName} quests={quests} xp={xp} dark={dark} />
        <TodaysQuests quests={quests} dark={dark} />
        <ExamGoals profile={profile} exams={exams} />
        <JumpInCards />
        <ConsistencyBanner />
      </>}
      right={<>
        <PracticeActivity activity={activity} dark={dark} />
        <LeaderboardSnap board={board} myId={myId} dark={dark} />
      </>}
    />
  )
}