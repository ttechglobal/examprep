'use client'
// src/components/school/SchoolNav.jsx — redesigned
// Sidebar (desktop) + mobile header + mobile bottom nav.

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense }                    from 'react'

const NAVY    = '#062A78'
const BLUE    = '#1264E5'
const EMERALD = '#059669'
const TEXT    = '#071B49'
const SEC     = '#3a4870'
const DIM     = '#7a8aaa'
const FAINT   = '#b0bada'
const BORDER  = '#e4eaf5'
const BG      = '#f4f7ff'
const CARD    = '#ffffff'
const GOLD    = '#FFB800'

// ── Icons ─────────────────────────────────────────────────────────────────────
function IcoOverview({ size=17, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill={color}/>
      <rect x="10" y="1" width="7" height="7" rx="1.5" fill={color} opacity=".4"/>
      <rect x="1" y="10" width="7" height="7" rx="1.5" fill={color} opacity=".4"/>
      <rect x="10" y="10" width="7" height="7" rx="1.5" fill={color} opacity=".7"/>
    </svg>
  )
}
function IcoStudents({ size=17, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="6.5" cy="5.5" r="3" stroke={color} strokeWidth="1.6"/>
      <path d="M1 15c0-3 2.5-5 5.5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="13" cy="6.5" r="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M10 15c0-2.5 1.3-4 3-4s3 1.5 3 4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IcoPerformance({ size=17, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M2 14l4-5 3 3 4-6 3 3" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14" cy="9" r="1.5" fill={color} opacity=".5"/>
    </svg>
  )
}
function IcoCohort({ size=17, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5L16 5.5V9.5C16 13.2 12.9 16.5 9 17C5.1 16.5 2 13.2 2 9.5V5.5L9 1.5Z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M6.5 9.5L8.5 11.5L12 7.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoSettings({ size=17, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" stroke={color} strokeWidth="1.5"/>
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M3.93 3.93l1.06 1.06M13.01 13.01l1.06 1.06M14.07 3.93l-1.06 1.06M4.99 13.01l-1.06 1.06"
        stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id:'overview',    label:'Overview',    Icon:IcoOverview    },
  { id:'students',    label:'Students',    Icon:IcoStudents    },
  { id:'performance', label:'Performance', Icon:IcoPerformance },
  { id:'cohort',      label:'Cohort',      Icon:IcoCohort      },
  { id:'settings',    label:'Settings',    Icon:IcoSettings    },
]

function NavItem({ item, active, onClick }) {
  return (
    <button onClick={() => onClick(item.id)} style={{
      width:'100%', display:'flex', alignItems:'center', gap:10,
      padding:'9px 12px 9px 16px', borderRadius:10, border:'none',
      background: active ? `${BLUE}0d` : 'transparent',
      cursor:'pointer', textAlign:'left', position:'relative',
      transition:'background .13s',
    }}>
      {active && (
        <div style={{ position:'absolute', left:4, top:'18%', bottom:'18%', width:3, borderRadius:2, background:BLUE }}/>
      )}
      <item.Icon size={17} color={active ? BLUE : DIM}/>
      <span style={{ fontSize:13, fontWeight:active?700:500, color:active?BLUE:SEC, letterSpacing:active?'-.01em':0 }}>
        {item.label}
      </span>
    </button>
  )
}

function SchoolNavInner({ schoolName, schoolCity, adminName }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const activeTab    = searchParams.get('tab') ?? 'overview'

  function goTab(id) {
    const p = new URLSearchParams(searchParams)
    p.set('tab', id)
    router.push(`/school/dashboard?${p.toString()}`)
  }

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/school-login')
  }

  const schoolInitials = (schoolName ?? '').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'EP'
  const adminInitials  = (adminName  ?? 'A').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()

  return (
    <>
      <style>{`
        /* ── Desktop: sidebar visible, mobile nav hidden ── */
        .school-sidebar { display: flex !important; }
        .school-mobile-header { display: none !important; }
        .school-mobile-bottom { display: none !important; }
        .school-content { padding-left: 240px; }

        /* ── Mobile: sidebar hidden, mobile chrome visible ── */
        @media (max-width: 768px) {
          .school-sidebar        { display: none !important; }
          .school-mobile-header  { display: flex !important; }
          .school-mobile-bottom  { display: flex !important; }
          .school-content        { padding-left: 0 !important; padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
        }

        /* ── Content padding ── */
        .school-content main { padding: 20px 16px; }
        @media (min-width: 480px)  { .school-content main { padding: 22px 20px; } }
        @media (min-width: 769px)  { .school-content main { padding: 28px 32px; } }
        @media (min-width: 1280px) { .school-content main { padding: 32px 40px; } }

        /* ── Mobile header ── */
        .school-mobile-header { align-items: center; gap: 10px; padding: 10px 16px; z-index: 40; }

        /* ── Mobile bottom nav ── */
        .school-mobile-bottom {
          padding: 0;
          padding-bottom: env(safe-area-inset-bottom);
          height: auto;
        }
        .school-mobile-bottom button {
          padding: 10px 0 8px;
          min-height: 56px;
        }

        /* ── Sidebar scrollable nav ── */
        .school-sidebar nav { overflow-y: auto; }
        .school-sidebar nav::-webkit-scrollbar { width: 3px; }
        .school-sidebar nav::-webkit-scrollbar-thumb { background: rgba(6,42,120,.1); border-radius: 99px; }

        /* ── Touch targets ── */
        @media (hover: none) {
          .school-mobile-bottom button { min-height: 56px; }
        }
      `}</style>

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="school-sidebar" style={{
        position:'fixed', left:0, top:0, bottom:0, width:240,
        background:CARD, borderRight:`1px solid ${BORDER}`,
        flexDirection:'column', zIndex:40,
        boxShadow:'1px 0 0 rgba(6,42,120,.04)',
      }}>
        {/* Brand + school identity */}
        <div style={{ padding:'18px 16px 14px', borderBottom:`1px solid ${BORDER}` }}>
          {/* ExamPrep wordmark */}
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:900, color:GOLD, letterSpacing:'-.02em' }}>EX</span>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:TEXT, lineHeight:1, letterSpacing:'-.02em' }}>ExamPrep</p>
              <p style={{ fontSize:9, color:DIM, marginTop:1 }}>School Dashboard</p>
            </div>
          </div>

          {/* School identity card */}
          <button onClick={() => goTab('settings')} style={{
            width:'100%', display:'flex', alignItems:'center', gap:9,
            padding:'10px 12px', borderRadius:11, border:`1px solid ${BORDER}`,
            background:BG, cursor:'pointer', textAlign:'left', transition:'border-color .15s',
          }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${NAVY},#1a3a8f)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', flexShrink:0 }}>
              {schoolInitials}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:12, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>{schoolName||'My School'}</p>
              {schoolCity && <p style={{ fontSize:10, color:DIM }}>{schoolCity}</p>}
            </div>
            <span style={{ fontSize:12, color:FAINT, flexShrink:0 }}>›</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} item={item} active={activeTab===item.id} onClick={goTab}/>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding:'10px 12px', borderTop:`1px solid ${BORDER}` }}>
          <button onClick={handleSignOut} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'9px 10px', borderRadius:10, border:'none',
            background:'transparent', cursor:'pointer', textAlign:'left',
            transition:'background .13s',
          }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
              {adminInitials}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:12, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{adminName||'School Admin'}</p>
              <p style={{ fontSize:10, color:DIM }}>Sign out →</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <header className="school-mobile-header" style={{
        position:'sticky', top:0, zIndex:40,
        background:'rgba(255,255,255,.97)', backdropFilter:'blur(14px)',
        borderBottom:`1px solid ${BORDER}`,
        boxShadow:'0 1px 8px rgba(6,42,120,.05)',
      }}>
        <div style={{ width:30, height:30, borderRadius:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:900, color:GOLD, letterSpacing:'-.02em' }}>EX</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:800, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>{schoolName||'School Dashboard'}</p>
          {adminName && <p style={{ fontSize:10, color:DIM, marginTop:1 }}>{adminName}</p>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
            {adminInitials}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav className="school-mobile-bottom" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:50,
        background:'rgba(255,255,255,.97)', backdropFilter:'blur(16px)',
        borderTop:`1px solid ${BORDER}`,
        boxShadow:'0 -2px 16px rgba(6,42,120,.06)',
        display:'flex',
      }}>
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id
          return (
            <button key={item.id} onClick={() => goTab(item.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              padding:'10px 4px 8px', background:'none', border:'none', cursor:'pointer',
              borderTop:`2.5px solid ${active?BLUE:'transparent'}`,
              transition:'border-color .15s', fontFamily:'inherit',
              WebkitTapHighlightColor:'transparent',
            }}>
              <item.Icon size={20} color={active ? BLUE : DIM}/>
              <span style={{ fontSize:9, fontWeight:active?800:600, color:active?BLUE:DIM, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1 }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

export default function SchoolNav(props) {
  return (
    <Suspense fallback={null}>
      <SchoolNavInner {...props}/>
    </Suspense>
  )
}