'use client'
// src/app/login/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Student login — Google OAuth or email + password.
//
// After sign-in:
//   1. syncOnLogin() flushes any queued guest sessions.
//   2. Role check routes to the right dashboard.
//
// Layout:
//   Desktop (≥768px) — two columns: branding left, form right
//   Mobile           — single column, form only
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Suspense } from 'react'
import { createClient }        from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const BG     = '#08090f'
const CARD   = 'rgba(255,255,255,0.05)'
const BORDER = 'rgba(255,255,255,0.09)'
const BRON   = 'rgba(18,100,229,0.5)'
const TEXT   = '#fff'
const DIM    = 'rgba(255,255,255,0.5)'
const FAINT  = 'rgba(255,255,255,0.25)'
const ERR    = '#ef5d4e'

// ── Icons ─────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink:0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// ── Left panel — branding ─────────────────────────────────────────────────────
function BrandPanel() {
  const testimonials = [
    { text: 'I improved from 180 to 271 in JAMB after two months on ExamPrep.', name: 'Chidi O.', exam: 'JAMB 2025' },
    { text: 'The topic tracking showed exactly where I was weak. My WAEC Biology went from C6 to B2.', name: 'Amaka N.', exam: 'WAEC 2025' },
    { text: 'Best exam prep app in Nigeria. Period.', name: 'Tunde A.', exam: 'JAMB 2024' },
  ]
  const t = testimonials[Math.floor(Date.now() / 86400000) % testimonials.length]

  return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 52px', position:'relative', overflow:'hidden', minHeight:'100dvh' }}>

      <div aria-hidden="true" style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(18,100,229,0.1) 0%, rgba(24,183,242,0.04) 60%, transparent 100%)', pointerEvents:'none' }}/>
      <div aria-hidden="true" style={{ position:'absolute', top:-60, right:-60, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,184,0,0.07) 0%,transparent 70%)', pointerEvents:'none' }}/>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:56 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', boxShadow:'0 6px 0 #03153d' }}>E</div>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>ExamPrep</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontSize:36, fontWeight:900, color:TEXT, letterSpacing:'-.04em', lineHeight:1.15, marginBottom:16 }}>
        Welcome back.<br/>
        <span style={{ color:CYAN }}>Keep going.</span>
      </h1>
      <p style={{ fontSize:15, color:DIM, lineHeight:1.7, marginBottom:48, maxWidth:360 }}>
        Your progress is waiting. Every session gets you closer to your target score.
      </p>

      {/* Testimonial */}
      <div style={{ padding:'24px', borderRadius:20, background:'rgba(255,255,255,0.04)', border:`1px solid ${BORDER}`, maxWidth:400 }}>
        <div style={{ fontSize:28, color:GOLD, marginBottom:12, lineHeight:1 }}>"</div>
        <p style={{ fontSize:14, color:TEXT, lineHeight:1.7, marginBottom:16, fontStyle:'italic' }}>
          {t.text}
        </p>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${BLUE},${CYAN})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0 }}>
            {t.name[0]}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:TEXT }}>{t.name}</div>
            <div style={{ fontSize:11, color:DIM }}>{t.exam}</div>
          </div>
        </div>
      </div>

      <p style={{ fontSize:12, color:FAINT, marginTop:48 }}>
        Don't have an account?{' '}
        <Link href="/signup" style={{ color:CYAN, fontWeight:700, textDecoration:'none' }}>Sign up free →</Link>
      </p>
    </div>
  )
}

// ── Form panel ────────────────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from')

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error,      setError]      = useState(
    searchParams.get('error') === 'auth_failed'
      ? 'Authentication failed. Please try again.'
      : null
  )

  const supabase = createClient()

  async function afterLogin() {
    import('@/lib/localSessionSync')
      .then(({ syncOnLogin }) => syncOnLogin())
      .catch(() => {})

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase
      .from('profiles').select('role').eq('id', user?.id).single()

    const dest = from                          ? from
      : profile?.role === 'school_admin'       ? '/school/dashboard'
      : profile?.role === 'admin'              ? '/admin/dashboard'
      : profile?.role === 'reviewer'           ? '/reviewer'
      : '/student/home'

    router.push(dest)
  }

  async function handleGoogle() {
    setGoogleBusy(true); setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setGoogleBusy(false) }
  }

  async function handleEmail(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    await afterLogin()
  }

  const busy = loading || googleBusy

  return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 40px', minHeight:'100dvh', maxWidth:480, width:'100%', margin:'0 auto' }}>

      {/* Mobile-only logo */}
      <div className="mobile-logo" style={{ display:'none', alignItems:'center', gap:10, marginBottom:36 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', boxShadow:'0 4px 0 #03153d' }}>E</div>
        <span style={{ fontSize:13, fontWeight:800, color:DIM, textTransform:'uppercase', letterSpacing:'.1em' }}>ExamPrep</span>
      </div>

      <h2 style={{ fontSize:26, fontWeight:900, color:TEXT, letterSpacing:'-.03em', marginBottom:6 }}>
        Sign in to ExamPrep
      </h2>
      <p style={{ fontSize:14, color:DIM, marginBottom:28, lineHeight:1.6 }}>
        Continue your exam prep journey.
      </p>

      {error && (
        <div style={{ padding:'12px 16px', background:'rgba(239,93,78,.12)', border:'1px solid rgba(239,93,78,.3)', borderRadius:12, fontSize:13, color:ERR, marginBottom:20 }}>
          {error}
        </div>
      )}

      {/* Google */}
      <button onClick={handleGoogle} disabled={busy}
        style={{ width:'100%', padding:'13px 16px', borderRadius:13, border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontSize:14, fontWeight:700, cursor:googleBusy?'wait':busy?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontFamily:'inherit', transition:'opacity .15s', opacity:googleBusy?0.6:1 }}>
        <GoogleIcon/>
        {googleBusy ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div style={{ position:'relative', textAlign:'center', margin:'20px 0' }}>
        <div style={{ position:'absolute', left:0, right:0, top:'50%', height:1, background:BORDER }}/>
        <span style={{ position:'relative', background:BG, padding:'0 14px', fontSize:11, color:FAINT, fontWeight:700 }}>OR</span>
      </div>

      {/* Email form */}
      <form onSubmit={handleEmail} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:FAINT, marginBottom:8 }}>
            Email address
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" required
            style={{ width:'100%', padding:'13px 16px', borderRadius:12, boxSizing:'border-box', background:CARD, border:`1.5px solid ${email ? BRON : BORDER}`, color:TEXT, fontSize:14, fontWeight:600, outline:'none', fontFamily:'inherit', transition:'border-color .15s' }}
          />
        </div>

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:FAINT }}>
              Password
            </label>
            <Link href="/reset-password" style={{ fontSize:12, color:CYAN, fontWeight:600, textDecoration:'none' }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password" autoComplete="current-password" required
              style={{ width:'100%', padding:'13px 46px 13px 16px', borderRadius:12, boxSizing:'border-box', background:CARD, border:`1.5px solid ${password ? BRON : BORDER}`, color:TEXT, fontSize:14, fontWeight:600, outline:'none', fontFamily:'inherit', transition:'border-color .15s' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
              style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:DIM, lineHeight:1, padding:0 }}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy || !email || !password}
          style={{ width:'100%', padding:'15px', borderRadius:13, border:'none', background:busy||!email||!password?'rgba(255,255,255,.06)':NAVY, color:busy||!email||!password?DIM:'#fff', fontSize:15, fontWeight:800, cursor:loading?'wait':busy||!email||!password?'not-allowed':'pointer', boxShadow:busy||!email||!password?'none':'0 5px 0 #03153d', letterSpacing:'-.01em', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <p style={{ textAlign:'center', fontSize:13, color:DIM, marginTop:24 }}>
        New to ExamPrep?{' '}
        <Link href="/signup" style={{ color:CYAN, fontWeight:700, textDecoration:'none' }}>
          Create a free account
        </Link>
      </p>

      <p style={{ textAlign:'center', fontSize:12, color:FAINT, marginTop:32 }}>
        Are you a school?{' '}
        <Link href="/school/login" style={{ color:FAINT, fontWeight:700, textDecoration:'underline' }}>
          School sign in →
        </Link>
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:${BG}; }
        .login-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100dvh;
          background: ${BG};
          position: relative;
        }
        .login-left {
          border-right: 1px solid ${BORDER};
        }
        @media (max-width: 767px) {
          .login-grid { display: block; }
          .login-left  { display: none; }
          .mobile-logo { display: flex !important; }
        }
      `}</style>

      <div aria-hidden="true" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-120, right:-80, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(18,100,229,.07) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-60, width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.04) 0%,transparent 70%)' }}/>
      </div>

      <div className="login-grid" style={{ position:'relative', zIndex:1 }}>
        <div className="login-left">
          <BrandPanel/>
        </div>
        <Suspense fallback={null}>
          <LoginForm/>
        </Suspense>
      </div>
    </>
  )
}