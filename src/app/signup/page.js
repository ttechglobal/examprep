'use client'
// src/app/signup/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Student signup — Google OAuth or email + password.
//
// The student has already done their setup during guest onboarding (ep_guest).
// This page only needs credentials. On success, syncOnLogin() flushes the
// guest session queue and the profile lands in Supabase automatically.
//
// Layout:
//   Desktop (≥768px) — two columns: branding left, form right
//   Mobile           — single column, form only
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { createClient }        from '@/lib/supabase/client'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#062A78'
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
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

// ── Left panel — desktop branding ─────────────────────────────────────────────
function BrandPanel({ guestName, guestExam, guestSubjects }) {
  const firstName = guestName?.split(' ')[0]
  const hasSetup  = guestExam && guestSubjects?.length > 0

  const stats = [
    { icon:'🏆', label:'Past questions', value:'10,000+' },
    { icon:'📚', label:'Subjects covered', value:'13' },
    { icon:'🎯', label:'Avg score improvement', value:'+31%' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 52px', position:'relative', overflow:'hidden', minHeight:'100dvh' }}>

      {/* Background glow */}
      <div aria-hidden="true" style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(18,100,229,0.12) 0%, rgba(24,183,242,0.06) 50%, transparent 100%)', pointerEvents:'none' }}/>
      <div aria-hidden="true" style={{ position:'absolute', bottom:-80, left:-80, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:52 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:NAVY, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', boxShadow:'0 6px 0 #03153d', flexShrink:0 }}>E</div>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT, letterSpacing:'-.01em' }}>ExamPrep</span>
      </div>

      {/* Headline */}
      {hasSetup ? (
        <>
          <h1 style={{ fontSize:36, fontWeight:900, color:TEXT, letterSpacing:'-.04em', lineHeight:1.15, marginBottom:12 }}>
            {firstName ? `Welcome, ${firstName}.` : 'Almost there.'}<br/>
            <span style={{ color:CYAN }}>Save your progress.</span>
          </h1>
          <p style={{ fontSize:15, color:DIM, lineHeight:1.7, marginBottom:32, maxWidth:380 }}>
            You're preparing for <strong style={{ color:TEXT }}>{guestExam}</strong> with <strong style={{ color:TEXT }}>{guestSubjects.length} subject{guestSubjects.length !== 1 ? 's' : ''}</strong>. Create a free account and your setup syncs instantly.
          </p>
          {/* Subject pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:40 }}>
            {guestSubjects.slice(0, 5).map(s => (
              <span key={s} style={{ padding:'6px 12px', borderRadius:999, background:'rgba(18,100,229,0.15)', border:'1px solid rgba(18,100,229,0.3)', fontSize:12, fontWeight:700, color:CYAN }}>
                {s}
              </span>
            ))}
            {guestSubjects.length > 5 && (
              <span style={{ padding:'6px 12px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:`1px solid ${BORDER}`, fontSize:12, fontWeight:700, color:DIM }}>
                +{guestSubjects.length - 5} more
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 style={{ fontSize:36, fontWeight:900, color:TEXT, letterSpacing:'-.04em', lineHeight:1.15, marginBottom:12 }}>
            Ace your exams.<br/>
            <span style={{ color:CYAN }}>Start for free.</span>
          </h1>
          <p style={{ fontSize:15, color:DIM, lineHeight:1.7, marginBottom:40, maxWidth:380 }}>
            Nigeria's smartest WAEC and JAMB prep platform. Practice past questions, track your weak topics, and improve with every session.
          </p>
        </>
      )}

      {/* Stats */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:'rgba(255,255,255,0.06)', border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:TEXT }}>{s.value}</div>
              <div style={{ fontSize:12, color:DIM }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <p style={{ fontSize:12, color:FAINT, marginTop:48 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color:CYAN, fontWeight:700, textDecoration:'none' }}>Sign in →</Link>
      </p>
    </div>
  )
}

// ── Form panel ────────────────────────────────────────────────────────────────
function FormPanel({ guestName, onDone, onEmailDone }) {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error,      setError]      = useState(null)

  const supabase    = createClient()
  const firstName   = guestName?.split(' ')[0]

  async function handleGoogle() {
    setGoogleBusy(true); setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (oauthError) { setError(oauthError.message); setGoogleBusy(false) }
    // On success the browser redirects — nothing more to do here
  }

  async function handleEmail(e) {
    e.preventDefault()
    if (!email || !password)  { setError('Enter your email and a password'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: guestName || undefined },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Flush guest queue — non-blocking
    import('@/lib/localSessionSync').then(({ syncOnLogin }) => syncOnLogin()).catch(() => {})
    setLoading(false)
    onEmailDone(email)
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
        {firstName ? `Hi ${firstName}, create your account` : 'Create your account'}
      </h2>
      <p style={{ fontSize:14, color:DIM, marginBottom:28, lineHeight:1.6 }}>
        Free forever. No credit card needed.
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
            placeholder="you@example.com" autoComplete="email"
            style={{ width:'100%', padding:'13px 16px', borderRadius:12, boxSizing:'border-box', background:CARD, border:`1.5px solid ${email ? BRON : BORDER}`, color:TEXT, fontSize:14, fontWeight:600, outline:'none', fontFamily:'inherit', transition:'border-color .15s' }}
          />
        </div>

        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:FAINT, marginBottom:8 }}>
            Password
          </label>
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6+ characters" autoComplete="new-password"
              style={{ width:'100%', padding:'13px 46px 13px 16px', borderRadius:12, boxSizing:'border-box', background:CARD, border:`1.5px solid ${password ? BRON : BORDER}`, color:TEXT, fontSize:14, fontWeight:600, outline:'none', fontFamily:'inherit', transition:'border-color .15s' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)} tabIndex={-1}
              style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:DIM, lineHeight:1, padding:0 }}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
          <p style={{ fontSize:11, color:FAINT, marginTop:6 }}>Must be at least 6 characters</p>
        </div>

        <button type="submit" disabled={busy || !email || !password}
          style={{ width:'100%', padding:'15px', borderRadius:13, border:'none', background:busy||!email||!password?'rgba(255,255,255,.06)':NAVY, color:busy||!email||!password?DIM:'#fff', fontSize:15, fontWeight:800, cursor:loading?'wait':busy||!email||!password?'not-allowed':'pointer', boxShadow:busy||!email||!password?'none':'0 5px 0 #03153d', letterSpacing:'-.01em', fontFamily:'inherit', transition:'all .15s', marginTop:4 }}>
          {loading ? 'Creating account…' : 'Create free account →'}
        </button>
      </form>

      <p style={{ textAlign:'center', fontSize:13, color:DIM, marginTop:24 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color:CYAN, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
      </p>

      <p style={{ textAlign:'center', fontSize:11, color:FAINT, marginTop:16, lineHeight:1.6 }}>
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ color:FAINT, textDecoration:'underline' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" style={{ color:FAINT, textDecoration:'underline' }}>Privacy Policy</Link>
      </p>
    </div>
  )
}

// ── Email confirmation screen ─────────────────────────────────────────────────
function ConfirmScreen({ email }) {
  const router = useRouter()
  return (
    <div style={{ minHeight:'100dvh', background:BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <div style={{ width:'100%', maxWidth:440, textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:20 }}>📬</div>
        <h2 style={{ fontSize:26, fontWeight:900, color:TEXT, letterSpacing:'-.03em', marginBottom:10 }}>
          Check your email
        </h2>
        <p style={{ fontSize:14, color:DIM, lineHeight:1.75, marginBottom:32 }}>
          We sent a confirmation link to{' '}
          <strong style={{ color:TEXT }}>{email}</strong>.
          Click it to activate your account.
          Your practice history and setup are already saved.
        </p>
        <button onClick={() => router.push('/student/home')}
          style={{ width:'100%', maxWidth:360, padding:'15px', borderRadius:13, border:'none', background:NAVY, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 5px 0 #03153d', fontFamily:'inherit', letterSpacing:'-.01em' }}>
          Go to dashboard →
        </button>
        <p style={{ fontSize:12, color:FAINT, marginTop:20 }}>
          Didn't receive it? Check your spam folder, or{' '}
          <button onClick={() => window.location.reload()}
            style={{ background:'none', border:'none', color:CYAN, fontSize:12, fontWeight:700, cursor:'pointer', padding:0, fontFamily:'inherit' }}>
            try again
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter()

  const [guestName,     setGuestName]     = useState('')
  const [guestExam,     setGuestExam]     = useState('')
  const [guestSubjects, setGuestSubjects] = useState([])
  const [confirmedEmail, setConfirmedEmail] = useState(null)

  // Read guest profile for personalisation
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem('ep_guest') || '{}')
      setGuestName(g.full_name || g.username || '')
      setGuestExam(g.exam_type || g.exams?.[0] || '')
      const subs = g.subjects_waec?.length
        ? g.subjects_waec
        : g.subjects_jamb?.length
        ? g.subjects_jamb
        : g.subjects ?? []
      setGuestSubjects(subs)
    } catch {}
  }, [])

  // Redirect if already signed in
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/student/home')
    })
  }, [])

  if (confirmedEmail) return <ConfirmScreen email={confirmedEmail}/>

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; background:${BG}; }
        .signup-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 100dvh;
          background: ${BG};
          position: relative;
        }
        .signup-left {
          border-right: 1px solid ${BORDER};
          display: flex;
        }
        .signup-right {
          display: flex;
          background: ${BG};
        }
        @media (max-width: 767px) {
          .signup-grid {
            display: block;
          }
          .signup-left {
            display: none;
          }
          .mobile-logo {
            display: flex !important;
          }
        }
      `}</style>

      {/* Background glows */}
      <div aria-hidden="true" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-120, right:-80, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(18,100,229,.08) 0%,transparent 70%)' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-60, width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(24,183,242,.05) 0%,transparent 70%)' }}/>
      </div>

      <div className="signup-grid" style={{ position:'relative', zIndex:1 }}>
        {/* Left — branding */}
        <div className="signup-left">
          <BrandPanel
            guestName={guestName}
            guestExam={guestExam}
            guestSubjects={guestSubjects}
          />
        </div>

        {/* Right — form */}
        <div className="signup-right">
          <FormPanel
            guestName={guestName}
            onEmailDone={email => setConfirmedEmail(email)}
          />
        </div>
      </div>
    </>
  )
}