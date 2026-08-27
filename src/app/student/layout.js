'use client'
// src/app/student/layout.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared shell for every student page.
//
// Because this file lives at src/app/student/layout.js, Next.js App Router
// keeps it mounted between page navigations inside /student/*. The sidebar,
// bottom nav, and background DON'T remount — only {children} re-renders.
// That eliminates the "whole page reloads" feel.
//
// What this layout owns:
//   • AppBackground (fixed decorative layer)
//   • StudentSidebar (desktop, sticky)
//   • StudentBottomNav (mobile, fixed)
//   • PointsProvider (XP context for sidebar + topbar + session results)
//
// What each PAGE owns:
//   • Its own topbar (DesktopTopbar / MobileTopbar) — because the page title
//     and name vary per page
//   • Its own content
//
// Exception: /student/practice/session has its own layout.js (empty override)
// that opts out of this shell — it's a full-screen immersive experience.
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation'
import { useTheme }    from '@/contexts/ThemeContext'
import { PointsProvider } from '@/contexts/PointsContext'
import { StudentSidebar, StudentBottomNav, NAV } from '@/components/student/StudentNav'

const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const CYAN   = '#18B7F2'

// ── Derive active nav id from pathname ────────────────────────────────────────
function useActiveNav() {
  const pathname = usePathname()
  // Match longest prefix first (e.g. /student/practice/session → practice)
  const match = NAV.slice().reverse().find(item => pathname.startsWith(item.href))
  return match?.id ?? 'home'
}

// ── Background — one instance, never re-renders ───────────────────────────────
function AppBackground({ dark }) {
  return (
    <div
      aria-hidden="true"
      style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}
    >
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: dark
          ? 'radial-gradient(circle,rgba(255,255,255,.03) 1px,transparent 1px)'
          : 'radial-gradient(circle,rgba(6,42,120,.06) 1px,transparent 1px)',
        backgroundSize: '28px 28px',
      }}/>

      {/* Glow blobs */}
      {dark ? (
        <>
          <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'rgba(18,100,229,.08)', filter:'blur(70px)', top:-100, right:-80 }}/>
          <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(6,42,120,.15)', filter:'blur(60px)', bottom:-80, left:-80 }}/>
          <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', background:'rgba(255,184,0,.04)', filter:'blur(50px)', top:'40%', left:'40%' }}/>
        </>
      ) : (
        <>
          <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'rgba(18,100,229,.05)', filter:'blur(60px)', top:-60, right:-40 }}/>
          <div style={{ position:'absolute', width:240, height:240, borderRadius:'50%', background:'rgba(255,106,0,.04)', filter:'blur(50px)', bottom:-40, left:-50 }}/>
          <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(24,183,242,.03)', filter:'blur(40px)', top:'50%', right:'20%' }}/>
        </>
      )}

      {/* Floating subject icons */}
      {['📐','⚗️','📚','🧬','✏️','🔭'].map((ic, i) => {
        const positions = [
          { top:'8%',    right:'6%'  },
          { top:'22%',   left:'3%'   },
          { top:'48%',   right:'4%'  },
          { bottom:'28%',left:'5%'   },
          { bottom:'12%',right:'9%'  },
          { top:'68%',   left:'2%'   },
        ]
        return (
          <div key={i} style={{ position:'absolute', fontSize:20, opacity:dark?0.08:0.06, userSelect:'none', ...positions[i] }}>
            {ic}
          </div>
        )
      })}

      {/* Sparkles */}
      {[[14,'12%','18%',GOLD],[10,'78%','8%',BLUE],[8,'45%','92%',CYAN],[12,'88%','55%',GOLD]].map(([sz,top,left,c], i) => (
        <div key={i} style={{ position:'absolute', top, left, fontSize:sz, color:c, opacity:dark?0.16:0.1 }}>✦</div>
      ))}
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function StudentLayout({ children }) {
  const { dark } = useTheme()
  const active   = useActiveNav()

  return (
    <PointsProvider>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <AppBackground dark={dark} />

      {/* ── DESKTOP ── */}
      <div
        className="hidden lg:flex"
        style={{ minHeight:'100dvh', position:'relative', zIndex:1 }}
      >
        <div style={{
          maxWidth: 1340, width: '100%', margin: '0 auto',
          padding: '20px 24px 60px',
          display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>
          {/* Sidebar stays mounted — only active highlight changes */}
          <StudentSidebar active={active} dark={dark} />

          {/* Page content area */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
            {children}
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div
        className="lg:hidden"
        style={{ minHeight:'100dvh', paddingBottom:80, position:'relative', zIndex:1 }}
      >
        {children}
        {/* Bottom nav stays mounted — only active tab changes */}
        <StudentBottomNav active={active} dark={dark} />
      </div>
    </PointsProvider>
  )
}