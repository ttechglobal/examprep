'use client'
// src/app/student/layout.js

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { useTheme }      from '@/contexts/ThemeContext'
import { usePoints }     from '@/contexts/PointsContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { StudentSidebar, StudentBottomNav, NAV } from '@/components/student/StudentNav'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const NAVY = '#062A78'
const BLUE = '#1264E5'
const GOLD = '#FFB800'
const ORANGE = '#FF6A00'
const CYAN = '#18B7F2'

const SHELL_EXCLUDED = ['/student/practice/session', '/student/subjects']

// ── Shared profile context — fetched once in layout, available to all pages ───
export const StudentUserContext = createContext(null)
export function useStudentUser() { return useContext(StudentUserContext) }

// ── Active nav ────────────────────────────────────────────────────────────────
function useActiveNav() {
  const pathname = usePathname()
  const match = [...NAV].reverse().find(item => pathname.startsWith(item.href))
  return match ?? NAV[0]
}

// ── Rank helpers ──────────────────────────────────────────────────────────────
const _RANK_XP = (() => {
  const t = [0]
  for (let i = 1; i < 10; i++) t.push(t[t.length-1] + 200 + i * 20)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 500 + i * 50)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 1200 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 2500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 3800 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 5500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 7500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 9500 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 12000 + i * 100)
  for (let i = 0; i < 10; i++) t.push(t[t.length-1] + 15000 + i * 100)
  return t
})()
const _RANK_NAMES = ['Newcomer','Beginner','Learner','Explorer','Starter','Rookie','Apprentice','Trainee','Challenger','Initiate','Solver','Thinker','Problem Solver','Quick Mind','Sharp Mind','Brainiac','Strategist','Tactician','Scholar','Achiever','Specialist','Expert','Ace','Mastermind','Genius','Elite','Prodigy','Virtuoso','Grand Solver','Master Solver','Elite Mind','Mastermind','Top Scholar','Brain Master','Logic Master','Knowledge Master','Question Master','Challenge Master','Exam Master','Learning Master','Rising Star','Star Scholar','Academic Star','Brain Champion','Knowledge Champion','Quiz Champion','Challenge Champion','Exam Champion','Learning Champion','Grand Champion','Legend','Rising Legend','Scholar Legend','Brain Legend','Knowledge Legend','Master Legend','Exam Legend','Learning Legend','Grand Legend','Legendary Mind','Mythic Learner','Mythic Solver','Mythic Scholar','Mythic Mind','Mythic Master','Mythic Genius','Mythic Champion','Mythic Strategist','Mythic Legend','Mythic Grandmaster','Royal Scholar','Crowned Scholar','Scholar King','Scholar Elite','Knowledge Royalty','Brain Royalty','Grand Scholar','Supreme Scholar','Royal Grandmaster','Crown Master','Cosmic Learner','Cosmic Solver','Cosmic Scholar','Cosmic Mind','Cosmic Master','Infinity Scholar','Infinity Master','Eternal Scholar','Ultimate Mind','Ultimate Master','Grandmaster','Supreme Grandmaster','Legendary Grandmaster','Master of Masters','Immortal Scholar','Transcendent Mind','Apex Scholar','Apex Master','Ultimate Scholar','The EXL Legend']
function getRankFromXp(xp) {
  let r = 1
  for (let i = _RANK_XP.length - 1; i >= 0; i--) { if (xp >= _RANK_XP[i]) { r = i + 1; break } }
  return Math.min(r, 100)
}

// ── Background ────────────────────────────────────────────────────────────────
function AppBackground({ dark }) {
  return (
    <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:dark?'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)':'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      {dark ? (<>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
        <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
      </>) : (<>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
        <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
      </>)}
      {['📐','⚗️','📚','🧬','✏️','🔭'].map((ic,i) => (
        <div key={i} style={{ position:'absolute', fontSize:20, opacity:dark?0.08:0.06, userSelect:'none', ...([{top:'8%',right:'6%'},{top:'22%',left:'3%'},{top:'48%',right:'4%'},{bottom:'28%',left:'5%'},{bottom:'12%',right:'9%'},{top:'68%',left:'2%'}][i]) }}>{ic}</div>
      ))}
      {[[14,'12%','18%',GOLD],[10,'78%','8%',BLUE],[8,'45%','92%',CYAN],[12,'88%','55%',GOLD]].map(([sz,top,left,c],i) => (
        <div key={i} style={{ position:'absolute', top, left, fontSize:sz, color:c, opacity:dark?0.16:0.1 }}>✦</div>
      ))}
    </div>
  )
}

// ── Desktop Topbar ────────────────────────────────────────────────────────────
function DesktopTopbar({ name }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const rank     = getRankFromXp(xp || 0)
  const rankName = _RANK_NAMES[rank - 1] ?? 'Newcomer'
  const initials = (name || 'EX').slice(0, 2).toUpperCase()

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:18, borderBottom:'1px solid var(--border)', marginBottom:22, flexShrink:0 }}>
      <div style={{ flex:1, maxWidth:420, position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="var(--text-tert)" strokeWidth="1.8"/>
            <path d="M15 15l3 3" stroke="var(--text-tert)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <input placeholder="Search topics, questions, exams…"
          style={{ width:'100%', padding:'10px 14px 10px 40px', borderRadius:13, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-prim)', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)', border:`1px solid ${GOLD}30` }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span suppressHydrationWarning style={{ fontSize:13, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()} XP</span>
        </div>
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px 6px 6px', borderRadius:999, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:GOLD }}>{initials}</div>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-prim)', lineHeight:1 }}>{name || 'Student'}</div>
              <div style={{ fontSize:9, color:'var(--text-tert)', marginTop:1 }}>{rankName}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft:2 }}>
              <path d="M3 4.5l3 3 3-3" stroke="var(--text-tert)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </Link>
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

// ── Mobile Topbar ─────────────────────────────────────────────────────────────
function MobileTopbar({ pageTitle }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.92)':'rgba(249,250,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{pageTitle}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 10px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.1)' }}>
          <span style={{ fontSize:13 }}>⚡</span>
          <span suppressHydrationWarning style={{ fontSize:12, fontWeight:900, color:GOLD }}>{(xp||0).toLocaleString()}</span>
        </div>
        <Link href="/student/profile" style={{ textDecoration:'none' }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="4" stroke="var(--text-tert)" strokeWidth="1.7"/>
              <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--text-tert)" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </div>
        </Link>
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

// ── Inner layout ──────────────────────────────────────────────────────────────
function StudentLayoutInner({ children }) {
  const { dark } = useTheme()
  const active   = useActiveNav()
  const pathname = usePathname()
  const isExcluded = SHELL_EXCLUDED.some(p => pathname.startsWith(p))

  // Fetch full profile once — share via context to every page
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          try {
            const g = JSON.parse(localStorage.getItem('ep_guest') || '{}')
            setProfile({ ...g, isGuest: true })
            if (g.full_name || g.username) {
              try { localStorage.setItem('ep_student_name', g.full_name || g.username) } catch {}
            }
          } catch {}
          return
        }
        const { data } = await supabase
          .from('profiles')
          .select('id,full_name,username,total_points,exam_types,subjects,subjects_waec,subjects_jamb,target_university,target_course,target_waec,target_jamb,onboarded,school_id,class_level')
          .eq('id', user.id).single()
        if (data) {
          setProfile(data)
          try { localStorage.setItem('ep_student_name', data.full_name || data.username || '') } catch {}
        }
      } catch (e) { console.error('layout profile:', e) }
    })()
  }, [])

  // Name for topbar — from profile or localStorage cache
  const name = profile?.full_name || profile?.username ||
    (() => { try { return localStorage.getItem('ep_student_name') || '' } catch { return '' } })()

  if (isExcluded) return (
    <StudentUserContext.Provider value={profile}>
      {children}
    </StudentUserContext.Provider>
  )

  return (
    <StudentUserContext.Provider value={profile}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <AppBackground dark={dark} />

      {/* ── DESKTOP — Tailwind hides this on mobile ── */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1340, width:'100%', margin:'0 auto', padding:'20px 24px 60px', display:'flex', gap:20, alignItems:'flex-start' }}>
          <StudentSidebar active={active.id} dark={dark} />
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            <DesktopTopbar name={name} />
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </div>
      </div>

      {/* ── MOBILE — Tailwind hides this on desktop ── */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}>
        <MobileTopbar pageTitle={active.label} />
        <div style={{ padding:'12px 16px 0' }}>
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>

      {/* ── BOTTOM NAV — outside all stacking contexts so position:fixed works ── */}
      <div className="lg:hidden">
        <StudentBottomNav active={active.id} dark={dark} />
      </div>
    </StudentUserContext.Provider>
  )
}

export default function StudentLayout({ children }) {
  return (
    <PointsProvider>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </PointsProvider>
  )
}