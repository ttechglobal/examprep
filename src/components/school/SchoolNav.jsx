'use client'
// src/components/school/SchoolNav.jsx

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense }                    from 'react'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const TEXT   = '#071B49'
const SEC    = '#3a4870'
const DIM    = '#7a8aaa'
const FAINT  = '#b0bada'
const BORDER = '#e4eaf5'
const GOLD   = '#FFB800'
const SIDEBAR_W = 264

function IcoOverview({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2"  y="2"  width="7" height="7" rx="2"   fill={color}/>
      <rect x="11" y="2"  width="7" height="7" rx="2"   fill={color} opacity=".35"/>
      <rect x="2"  y="11" width="7" height="7" rx="2"   fill={color} opacity=".35"/>
      <rect x="11" y="11" width="7" height="7" rx="2"   fill={color} opacity=".65"/>
    </svg>
  )
}
function IcoStudents({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="7"  cy="6"  r="3.5" stroke={color} strokeWidth="1.7"/>
      <path d="M1 17c0-3.5 2.8-5.5 6-5.5" stroke={color} strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="14.5" cy="7" r="2.8" stroke={color} strokeWidth="1.5"/>
      <path d="M11 17c0-3 1.5-4.5 3.5-4.5S18 14 18 17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IcoPerformance({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M2 15l4.5-5.5 3.5 3.5 4.5-6.5 3.5 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15.5" cy="10" r="1.5" fill={color} opacity=".45"/>
    </svg>
  )
}
function IcoCohort({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 6.5V11C18 14.8 14.5 18 10 18.5C5.5 18 2 14.8 2 11V6.5L10 2Z"
        stroke={color} strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M7 10.5L9.5 13L13.5 8.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoSettings({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.8" stroke={color} strokeWidth="1.6"/>
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4"
        stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',    Icon: IcoOverview    },
  { id: 'students',    label: 'Students',    Icon: IcoStudents    },
  { id: 'performance', label: 'Performance', Icon: IcoPerformance },
  { id: 'cohort',      label: 'Cohort',      Icon: IcoCohort      },
  { id: 'settings',    label: 'Settings',    Icon: IcoSettings    },
]

function NavItem({ item, active, onClick }) {
  return (
    <button
      onClick={() => onClick(item.id)}
      className="school-nav-btn"
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px 10px 14px',
        borderRadius: 12, border: 'none',
        background: active ? `${BLUE}12` : 'transparent',
        cursor: 'pointer', textAlign: 'left', position: 'relative',
        transition: 'background .15s', fontFamily: 'inherit',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3.5, borderRadius: 99, background: BLUE,
        }}/>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? `${BLUE}18` : 'transparent',
        transition: 'background .15s',
      }}>
        <item.Icon size={20} color={active ? BLUE : DIM}/>
      </div>
      <span style={{
        fontSize: 13.5, fontWeight: active ? 700 : 500,
        color: active ? TEXT : SEC,
        letterSpacing: active ? '-.01em' : 0, lineHeight: 1,
      }}>
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

  const schoolInitials = (schoolName ?? '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'EP'
  const adminInitials  = (adminName  ?? 'A').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <>
      <style>{`
        .school-sidebar       { display: flex !important; }
        .school-mobile-header { display: none !important; }
        .school-mobile-bottom { display: none !important; }
        /* Single source of truth for the sidebar offset — padding-left only, no margin-left */
        .school-content       { padding-left: ${SIDEBAR_W}px; }

        @media (max-width: 768px) {
          .school-sidebar       { display: none !important; }
          .school-mobile-header { display: flex !important; }
          .school-mobile-bottom { display: flex !important; }
          .school-content       { padding-left: 0 !important; padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
        }

        /* main fills the content area — no margin:0 auto which fights the offset */
        .school-content main { padding: 20px 20px 80px; box-sizing: border-box; }
        @media (min-width: 769px)  { .school-content main { padding: 28px 28px 80px; } }
        @media (min-width: 1280px) { .school-content main { padding: 32px 36px 60px; } }

        .school-sidebar nav::-webkit-scrollbar       { width: 3px; }
        .school-sidebar nav::-webkit-scrollbar-thumb { background: rgba(6,42,120,.08); border-radius: 99px; }

        .school-nav-btn:hover { background: rgba(6,42,120,.05) !important; }
        .school-school-card:hover { border-color: #1264E5 !important; background: #f0f4ff !important; }
        .school-signout-btn:hover { border-color: #1264E5 !important; color: #1264E5 !important; }

        .school-mobile-header { align-items: center; gap: 10px; padding: 10px 16px; z-index: 40; }
        .school-mobile-bottom { padding: 0; padding-bottom: env(safe-area-inset-bottom); }
        .school-mobile-bottom button { min-height: 56px; padding: 10px 0 8px; }
        @media (hover: none) { .school-mobile-bottom button { min-height: 60px; } }
      `}</style>

      {/* ── Desktop sidebar ── */}
      <aside className="school-sidebar" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: SIDEBAR_W,
        background: '#fff', borderRight: `1px solid ${BORDER}`,
        flexDirection: 'column', zIndex: 40,
        boxShadow: '2px 0 20px rgba(6,42,120,.06)',
      }}>

        {/* Brand header */}
        <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${BORDER}` }}>
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: `linear-gradient(145deg, ${NAVY} 0%, #1a3a8f 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(6,42,120,.3)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: GOLD, letterSpacing: '-.01em' }}>EP</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: '-.03em' }}>ExamPrep</p>
              <p style={{ margin: '3px 0 0', fontSize: 10, color: FAINT, letterSpacing: '.01em' }}>School Dashboard</p>
            </div>
          </div>

          {/* School card */}
          <button
            onClick={() => goTab('settings')}
            className="school-school-card"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11,
              padding: '11px 13px', borderRadius: 13,
              border: `1.5px solid ${BORDER}`, background: '#f8f9ff',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'border-color .15s, background .15s',
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(145deg, ${NAVY} 0%, #2952c4 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '-.01em',
            }}>
              {schoolInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {schoolName || 'My School'}
              </p>
              {schoolCity && (
                <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>📍 {schoolCity}</p>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: .35 }}>
              <path d="M5 3l4 4-4 4" stroke={TEXT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '14px 10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 8px', padding: '0 6px', fontSize: 9.5, fontWeight: 800, color: FAINT, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Menu
          </p>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={goTab}/>
          ))}

          <div style={{ flex: 1, minHeight: 20 }}/>
          <div style={{ height: 1, background: BORDER, margin: '8px 4px 12px' }}/>

          {/* Support links */}
          <div style={{ padding: '12px 14px', borderRadius: 12, background: '#f4f7ff', border: `1px solid ${BORDER}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 800, color: FAINT, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Support
            </p>
            <a href="mailto:schools@examprep.ng" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
              fontSize: 12, color: SEC, fontWeight: 600, textDecoration: 'none',
            }}>
              <span>✉</span> Email us
            </a>
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
              fontSize: 12, color: '#059669', fontWeight: 600, textDecoration: 'none',
            }}>
              <span>💬</span> WhatsApp
            </a>
          </div>
        </nav>

        {/* Admin footer */}
        <div style={{ padding: '14px 12px 16px', borderTop: `1px solid ${BORDER}`, background: '#fafbff' }}>
          {/* Admin info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px 10px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {adminInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {adminName || 'School Admin'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>Administrator</p>
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="school-signout-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 10,
              border: `1.5px solid ${BORDER}`, background: '#fff',
              cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: SEC,
              fontFamily: 'inherit', transition: 'border-color .15s, color .15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9.5 9.5L12 7m0 0L9.5 4.5M12 7H5.5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="school-mobile-header" style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(6,42,120,.05)',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${NAVY}, #1a3a8f)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: GOLD }}>EP</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {schoolName || 'School Dashboard'}
          </p>
          {adminName && <p style={{ margin: '1px 0 0', fontSize: 10, color: DIM }}>{adminName}</p>}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${NAVY}, ${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {adminInitials}
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="school-mobile-bottom" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(16px)',
        borderTop: `1px solid ${BORDER}`, boxShadow: '0 -2px 16px rgba(6,42,120,.06)',
        display: 'flex',
      }}>
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id
          return (
            <button key={item.id} onClick={() => goTab(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: `2.5px solid ${active ? BLUE : 'transparent'}`,
              transition: 'border-color .15s', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <item.Icon size={21} color={active ? BLUE : DIM}/>
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? BLUE : DIM, textTransform: 'uppercase', letterSpacing: '.05em', lineHeight: 1 }}>
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