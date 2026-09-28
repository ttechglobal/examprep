'use client'
// src/app/student/layout.js
// Student app shell: loads the profile once (shared via useStudentUser), and
// wraps every page in the sidebar (desktop) or top bar + bottom nav (phones).
//
// v2: Battle is a main tab, so /student/battle keeps the shell (only its
//     setup, match and 1v1 screens are full screen). Phone top bar follows the
//     new design (brand on Home and Practice). Rank names come from lib/ranks.js instead of
//     a local copy of the tables.

import { useState, useEffect, useLayoutEffect, useCallback, createContext, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { useTheme }      from '@/contexts/ThemeContext'
import { usePoints }     from '@/contexts/PointsContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { StudentSidebar, StudentBottomNav, NAV } from '@/components/student/StudentNav'
import { createClient } from '@/lib/supabase/client'
import { cacheAuthProfile } from '@/lib/localProfile'
import Link from 'next/link'
import NotificationScheduler from '@/components/ui/NotificationScheduler'
import ProfileSetupGate from '@/components/student/ProfileSetupGate'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { endLaunchSplash } from '@/lib/launchSplash'
import { hasLocalIdentity } from '@/lib/auth/client'
import { getRankProgress } from '@/lib/ranks'

const NAVY = '#062A78'
const BLUE = '#1264E5'
const GOLD = '#FFB800'
const ORANGE = '#FF6A00'
const CYAN = '#18B7F2'

// Full-screen screens with no sidebar / bottom nav. The Battle hub itself
// (/student/battle) keeps the nav, since Battle is a main tab; only the
// setup, the match and the 1v1 screens take over the screen.
const SHELL_EXCLUDED = [
  '/student/practice/session', '/student/practice/mock', '/student/learn/world',
  '/student/battle/setup', '/student/battle/session', '/student/battle/1v1',
]

// A battle guest (anonymous login from a 1v1 invite, no guest profile on this
// device) may only use the 1v1 screens. Anywhere else they start at /onboarding.
const BATTLE_GUEST_AREA = '/student/battle/1v1'

// ── Shared profile context — fetched once in layout, available to all pages ───
export const StudentUserContext = createContext(null)
export function useStudentUser() { return useContext(StudentUserContext) }

// Lets pages push a saved change into the shared profile: useUpdateStudentProfile()(patch)
const StudentProfileUpdateContext = createContext(() => {})
export function useUpdateStudentProfile() { return useContext(StudentProfileUpdateContext) }

// ── Active nav ────────────────────────────────────────────────────────────────
function useActiveNav() {
  const pathname = usePathname()
  const match = [...NAV].reverse().find(item => pathname.startsWith(item.href))
  return match ?? NAV[0]
}

// ── Background ────────────────────────────────────────────────────────────────
// Shows the app background image (globals.css sets --app-bg-image).
// Solid colour (--bg-base) paints instantly as a fallback — visible on poor
// connections or if the image never arrives. Overlay tint adjusts per theme.
function AppBackground({ dark }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        // Solid colour shows instantly — zero network dependency
        backgroundColor: dark ? '#0a0c14' : '#f0f4ff',
        // Dark mode is a plain canvas. The photo behind an 88% tint made every
        // card look smudged, so it's light-mode only.
        // Image loads on top; if it never arrives the solid colour remains
        backgroundImage: dark
          ? 'none'
          : "linear-gradient(rgba(240,244,255,.82),rgba(240,244,255,.82)),url('/images/app-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}

// ── Desktop Topbar ────────────────────────────────────────────────────────────
function DesktopTopbar({ name }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const rankName = getRankProgress(xp || 0).name
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

const BRAND_TOPBAR = new Set(['home', 'practice'])

// ── Mobile Topbar ─────────────────────────────────────────────────────────────
// Home and Practice show the brand (their greeting is the page's heading);
// every other tab shows its own name. Profile is a bottom tab, so it has no
// button here.
function MobileTopbar({ activeId, pageTitle }) {
  const { dark, toggle }    = useTheme()
  const { totalPoints: xp } = usePoints()
  const showBrand = BRAND_TOPBAR.has(activeId)

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 10px', position:'sticky', top:0, zIndex:50, background:dark?'rgba(10,13,28,.92)':'rgba(249,250,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        <div style={{ width:showBrand?38:30, height:showBrand?38:30, borderRadius:showBrand?11:9, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:showBrand?14:11, fontWeight:900, color:GOLD }}>EX</span>
        </div>
        {showBrand ? (
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.02em', lineHeight:1.05 }}>ExamPrep</div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-tert)', marginTop:2 }}>EXL Learning World</div>
          </div>
        ) : (
          <span style={{ fontSize:17, fontWeight:900, color:'var(--text-prim)', letterSpacing:'-.03em' }}>{pageTitle}</span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:999, background:dark?'rgba(255,184,0,.12)':'rgba(255,184,0,.12)', border:`1px solid ${GOLD}33` }}>
          <span style={{ fontSize:14 }}>⚡</span>
          <span suppressHydrationWarning style={{ fontSize:13, fontWeight:900, color:dark?GOLD:'#D98E00' }}>{(xp||0).toLocaleString()} XP</span>
        </div>
        <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{ width:40, height:40, borderRadius:12, background:'var(--bg-card)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          {dark
            ? <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="var(--text-tert)" strokeWidth="2"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M20 14.5A9 9 0 017.5 2a9 9 0 1012.5 12.5z" stroke="var(--text-tert)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
  const router   = useRouter()
  const { reconcileServerPoints } = usePoints()
  const [profile, setProfile] = useState(null)

  // 'ready'    → render the app
  // 'checking' → nothing on this device yet; confirm there's a session before
  //              rendering, and send the visitor to /onboarding if there isn't.
  // Devices that already have a guest or cached profile render immediately.
  const [gate, setGate] = useState('ready')

  // Merge a change into the shared profile (used by the profile page after a
  // save) so every screen, including the setup prompt, sees it immediately.
  // The first real screen is ready once we know who this is: end the
  // installed-app launch splash (no-op everywhere else).
  useEffect(() => {
    if (gate === 'ready' && profile) endLaunchSplash()
  }, [gate, profile])

  const updateProfile = useCallback(patch => {
    setProfile(p => (p ? { ...p, ...patch } : p))
  }, [])

  // Runs before first paint, so a fresh install never flashes the app shell.
  useLayoutEffect(() => {
    if (!hasLocalIdentity()) setGate('checking')
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        // getSession reads the stored session without a network round trip, so
        // signed-in students aren't treated as guests when they're offline.
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null

        // No account. A battle-guest login is not an account either: the rest
        // of the app treats it exactly like signed out.
        if (!user || user.is_anonymous) {
          try { localStorage.removeItem('ep_profile_cache') } catch {}
          let g = null
          try { g = JSON.parse(localStorage.getItem('ep_guest') || 'null') } catch {}

          // No guest profile either: a fresh install or a signed-out device.
          // Everyone starts at the welcome / sign-up screen, except a battle
          // guest who is in the middle of a 1v1.
          if (!g || g.migrated_to) {
            if (user?.is_anonymous && window.location.pathname.startsWith(BATTLE_GUEST_AREA)) {
              setProfile({ isGuest: true, battleGuestOnly: true, full_name: user.user_metadata?.display_name ?? null })
              setGate('ready')
              return
            }
            router.replace('/onboarding')
            return
          }

          // Normalise the guest profile to the same shape as a Supabase row.
          const examTypes = g.exam_types ?? g.exams ?? (g.exam_type ? [g.exam_type] : [])
          const examType  = examTypes[0] ?? 'WAEC'
          const legacySubjects = g.subjects ?? []
          const waecSubs = g.subjects_waec?.length ? g.subjects_waec
            : examTypes.includes('WAEC') ? legacySubjects : []
          const jambSubs = g.subjects_jamb?.length ? g.subjects_jamb
            : examTypes.includes('JAMB') ? legacySubjects : []

          setProfile({
            ...g,
            exam_type:     examType,
            exam_types:    examTypes.length ? examTypes : [examType],
            subjects:      legacySubjects,
            subjects_waec: waecSubs,
            subjects_jamb: jambSubs,
            isGuest: true,
          })
          if (g.full_name || g.username) {
            try { localStorage.setItem('ep_student_name', g.full_name || g.username) } catch {}
          }
          setGate('ready')
          return
        }

        setGate('ready')

        // exam_types / subjects_waec / subjects_jamb / onboarded may not exist
        // yet (pre-migration). If the select fails, fall back to the API route,
        // which handles missing columns; if that fails too (offline), use the
        // cached copy from the last visit.
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id,full_name,username,total_points,exam_type,exam_types,subjects,subjects_waec,subjects_jamb,school_id,onboarded,phone_number')
          .eq('id', user.id).single()

        let profileData = data
        if (profileError || !data) {
          try {
            const apiRes = await fetch('/api/student/profile')
            if (apiRes.ok) profileData = await apiRes.json()
          } catch {}
        }
        if (!profileData) {
          try {
            const cached = JSON.parse(localStorage.getItem('ep_profile_cache') || 'null')
            if (cached?.id === user.id) profileData = cached
          } catch {}
        }

        if (profileData) {
          // Normalise: ensure all fields exist regardless of DB migration state.
          const examType = profileData.exam_types?.[0] ?? profileData.exam_type ?? 'WAEC'
          const normalised = {
            ...profileData,
            exam_type:     examType,
            exam_types:    profileData.exam_types    ?? [examType],
            subjects_waec: profileData.subjects_waec ?? (examType === 'WAEC' ? (profileData.subjects ?? []) : []),
            subjects_jamb: profileData.subjects_jamb ?? (examType === 'JAMB' ? (profileData.subjects ?? []) : []),
            onboarded:     profileData.onboarded     ?? true,
            signup_method: user.user_metadata?.signup_method ?? 'email',
          }
          setProfile(normalised)
          cacheAuthProfile(normalised)
          reconcileServerPoints(normalised.total_points)
          try { localStorage.setItem('ep_student_name', profileData.full_name || profileData.username || '') } catch {}

          // Flush any practice sessions saved while offline or as a guest.
          import('@/lib/localSessionSync')
            .then(({ syncOnLogin }) => syncOnLogin())
            .catch(() => {})
        } else {
          endLaunchSplash()   // no profile data at all: show what we can
        }
      } catch (e) {
        console.error('layout profile:', e)
        setGate('ready')
        endLaunchSplash()
      }
    })()
  }, [router, reconcileServerPoints])

  // A battle guest who leaves the 1v1 screens goes to sign up (or continue as a guest).
  useEffect(() => {
    if (profile?.battleGuestOnly && !pathname.startsWith(BATTLE_GUEST_AREA)) router.replace('/onboarding')
  }, [profile, pathname, router])

  // Name for topbar — from profile or localStorage cache
  const name = profile?.full_name || profile?.username ||
    (() => { try { return localStorage.getItem('ep_student_name') || '' } catch { return '' } })()

  // Fresh install / signed out: brand splash while we confirm, then /onboarding.
  if (gate === 'checking') return <LoadingScreen />

  if (isExcluded) return (
    <StudentProfileUpdateContext.Provider value={updateProfile}>
      <StudentUserContext.Provider value={profile}>
        {children}
        <ProfileSetupGate profile={profile} />
      </StudentUserContext.Provider>
    </StudentProfileUpdateContext.Provider>
  )

  return (
    <StudentProfileUpdateContext.Provider value={updateProfile}>
    <StudentUserContext.Provider value={profile}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <AppBackground dark={dark} />

      {/* ── DESKTOP — Tailwind hides this on mobile ── */}
      <div className="hidden lg:flex" style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', display:'flex', alignItems:'flex-start' }}>
          {/* Sidebar — fixed on the left, with breathing room */}
          <div style={{ position:'sticky', top:0, height:'100dvh', flexShrink:0, padding:'0 12px 0 20px' }}>
            <StudentSidebar active={active.id} dark={dark} />
          </div>
          {/* Main column — topbar fixed at top, content scrolls */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', height:'100dvh' }}>
            <div style={{ position:'sticky', top:0, zIndex:40, padding:'20px 28px 0', flexShrink:0 }}>
              <DesktopTopbar name={name} />
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 28px 48px' }}>
              <Suspense fallback={null}>{children}</Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE — Tailwind hides this on desktop ── */}
      {/* Bottom padding clears the 68px nav and the Flashcards button above it,
          so the end of every page can scroll into view. */}
      <div className="lg:hidden" style={{ minHeight:'100dvh', paddingBottom:'calc(140px + env(safe-area-inset-bottom))', position:'relative', zIndex:1 }}>
        <MobileTopbar activeId={active.id} pageTitle={active.label} />
        <div style={{ padding:'12px 16px 0' }}>
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>

      {/* ── BOTTOM NAV — outside all stacking contexts so position:fixed works ── */}
      <div className="lg:hidden">
        <StudentBottomNav active={active.id} />
      </div>

      {/* ── NOTIFICATION PERMISSION BANNER — position:fixed, zIndex 8888 ── */}
      {/* Sits above everything. Only renders when permission is 'default'.  */}
      {/* Scheduling is server-side; this component only handles the prompt. */}
      <NotificationScheduler />

      {/* Asks new students to set up their profile before anything else */}
      <ProfileSetupGate profile={profile} />
    </StudentUserContext.Provider>
    </StudentProfileUpdateContext.Provider>
  )
}

export default function StudentLayout({ children }) {
  return (
    <PointsProvider>
      <StudentLayoutInner>{children}</StudentLayoutInner>
    </PointsProvider>
  )
}