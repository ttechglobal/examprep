// src/app/page.js — Marketing Landing Page
// This is the PUBLIC homepage — what everyone sees first.
// Clear value proposition for students, parents, and schools.
// "Start Practising →" CTA goes to the onboarding/diagnostic flow (/onboarding).
// "Sign in" link for returning users.
// No auth wall — show the value, then invite them in.

import Link from 'next/link'

// ── Tokens (hardcoded for a server component) ─────────────────────────────────
const NAVY     = '#0b1330'
const NAVY_D   = '#05070f'
const CHEM     = '#9b7ae0'
const GOLD     = '#ffc36b'
const SUCCESS  = '#6cce8e'
const DANGER   = '#ef5d4e'
const MATH     = '#5cb8ea'
const TEXT     = '#eef0fa'
const DIM      = '#7b7f9e'
const BG       = '#0d0e14'
const SURFACE  = '#13141f'
const SURFACE2 = '#1a1b28'
const BORDER   = 'rgba(255,255,255,0.07)'

// ── Subject accent map ────────────────────────────────────────────────────────
const SUBJECT_ACCENTS = {
  'Chemistry':   CHEM,
  'Physics':     '#ff8fab',
  'Mathematics': MATH,
  'Biology':     SUCCESS,
  'Economics':   GOLD,
  'English':     '#a78bfa',
}

export default function LandingPage() {
  return (
    <div style={{ background: BG, minHeight: '100dvh', color: TEXT, fontFamily: 'inherit' }}>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,14,20,.96)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
              boxShadow: `0 3px 0 ${NAVY_D}`,
            }}>E</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>
              Exam <span style={{ color: DIM, fontWeight: 500 }}>Prep</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: DIM, textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/onboarding" style={{
              fontSize: 13, fontWeight: 700, color: '#fff',
              padding: '8px 16px', borderRadius: 10,
              background: NAVY, textDecoration: 'none',
              boxShadow: `0 3px 0 ${NAVY_D}`,
            }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px 72px' }}>
        {/* Ambient molecular pattern */}
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 320, opacity: 0.06, pointerEvents: 'none' }}
          viewBox="0 0 1080 320" preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="80"  cy="80"  r="5" fill={CHEM}/>
          <circle cx="220" cy="45"  r="3" fill={CHEM}/>
          <circle cx="380" cy="90"  r="5" fill={CHEM}/>
          <circle cx="540" cy="55"  r="3" fill="#ff8fab"/>
          <circle cx="700" cy="85"  r="5" fill={CHEM}/>
          <circle cx="860" cy="40"  r="3" fill="#ff8fab"/>
          <circle cx="1000" cy="80" r="5" fill={CHEM}/>
          <line x1="80" y1="80" x2="220" y2="45" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="220" y1="45" x2="380" y2="90" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="380" y1="90" x2="540" y2="55" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="540" y1="55" x2="700" y2="85" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="700" y1="85" x2="860" y2="40" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="860" y1="40" x2="1000" y2="80" stroke={CHEM} strokeWidth="1.5"/>
          <circle cx="40"  cy="200" r="3" fill={CHEM}/>
          <circle cx="180" cy="170" r="5" fill="#ff8fab"/>
          <circle cx="340" cy="210" r="3" fill={CHEM}/>
          <circle cx="500" cy="185" r="5" fill={CHEM}/>
          <circle cx="680" cy="215" r="3" fill="#ff8fab"/>
          <circle cx="840" cy="190" r="5" fill={CHEM}/>
          <line x1="40" y1="200" x2="180" y2="170" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="180" y1="170" x2="340" y2="210" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="340" y1="210" x2="500" y2="185" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="500" y1="185" x2="680" y2="215" stroke={CHEM} strokeWidth="1.5"/>
          <line x1="680" y1="215" x2="840" y2="190" stroke={CHEM} strokeWidth="1.5"/>
        </svg>

        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px 5px 6px', borderRadius: 999,
            background: `${CHEM}15`, border: `1px solid ${CHEM}30`,
            fontSize: 11, fontWeight: 700, color: CHEM,
            marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CHEM, display: 'inline-block' }} />
            Built for WAEC &amp; JAMB students
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 800,
            color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.05,
            marginBottom: 20,
          }}>
            Just practise.<br />
            <span style={{ color: CHEM }}>Ace your exams.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2.5vw, 18px)', color: DIM,
            maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.65,
          }}>
            Take a free diagnostic test. Get a personalised practice plan based on your weak topics.
            Practise past questions every day. Watch your scores improve.
          </p>

          {/* Hero CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/onboarding" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '16px 32px', borderRadius: 16,
              background: NAVY, color: '#fff',
              fontSize: 16, fontWeight: 800, textDecoration: 'none',
              boxShadow: `0 7px 0 ${NAVY_D}, 0 12px 28px rgba(0,0,0,.4)`,
              letterSpacing: '-0.01em',
            }}>
              Start Practising →
            </Link>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '16px 28px', borderRadius: 16,
              background: SURFACE, color: DIM,
              border: `1px solid ${BORDER}`,
              fontSize: 16, fontWeight: 700, textDecoration: 'none',
            }}>
              Sign in
            </Link>
          </div>

          <p style={{ fontSize: 12, color: DIM, marginTop: 16 }}>
            Free to start · No credit card · Works on any device
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '64px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: DIM, textAlign: 'center', marginBottom: 10 }}>
            How it works
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: TEXT, textAlign: 'center', letterSpacing: '-0.025em', marginBottom: 48 }}>
            From zero to exam-ready in 4 steps
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { n: '01', title: 'Take the diagnostic', desc: '5 quick questions per subject. We find out exactly which topics you struggle with.', icon: '🩺', color: CHEM },
              { n: '02', title: 'Get your plan',        desc: 'A personalised practice order — your weakest, highest-frequency topics come first.', icon: '🎯', color: '#ff8fab' },
              { n: '03', title: 'Practise every day',   desc: 'Past questions, topic drills, timed practice, mock exams — all in one place.', icon: '⚡', color: GOLD },
              { n: '04', title: 'Track your mastery',   desc: 'See your topic mastery grow. Know exactly how prepared you are, week by week.', icon: '📈', color: SUCCESS },
            ].map(({ n, title, desc, icon, color }) => (
              <div key={n} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: 6 }}>
                  Step {n}
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 6 }}>{title}</p>
                <p style={{ fontSize: 13, color: DIM, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subject coverage ── */}
      <section style={{ padding: '64px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.025em', marginBottom: 10 }}>
            Covers WAEC and JAMB subjects
          </h2>
          <p style={{ fontSize: 14, color: DIM, marginBottom: 32 }}>
            All questions are mapped to the official syllabus. Topics tagged by exam type so you only practise what matters for your exam.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Object.entries(SUBJECT_ACCENTS).map(([name, color]) => (
              <div key={name} style={{
                padding: '8px 16px', borderRadius: 999,
                background: `${color}15`, border: `1px solid ${color}30`,
                fontSize: 13, fontWeight: 700, color,
              }}>
                {name}
              </div>
            ))}
            {['Government', 'Geography', 'Commerce', 'Accounting', 'Literature', 'Agric Science', '+ more'].map(s => (
              <div key={s} style={{
                padding: '8px 16px', borderRadius: 999,
                background: SURFACE2, border: `1px solid ${BORDER}`,
                fontSize: 13, fontWeight: 600, color: DIM,
              }}>
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For students / parents / schools ── */}
      <section style={{ padding: '64px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.025em', textAlign: 'center', marginBottom: 40 }}>
            Built for everyone involved in exam success
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                icon: '🎓', who: 'For Students',
                points: ['Personalised practice plan from day one', 'Past questions tagged by topic and difficulty', 'See exactly which topics to focus on', 'Track your improvement week by week'],
                color: CHEM,
              },
              {
                icon: '👪', who: 'For Parents',
                points: ['Weekly progress reports by email', 'Know which subjects your child is working on', 'See if your child is practising daily', 'No expensive tutoring required'],
                color: GOLD,
              },
              {
                icon: '🏫', who: 'For Schools',
                points: ['Class-wide topic performance data', 'See which topics students struggle most', 'Weekly improvement trends per cohort', 'Identify students who need support early'],
                color: SUCCESS,
              },
            ].map(({ icon, who, points, color }) => (
              <div key={who} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, fontSize: 20,
                    background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{who}</p>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {points.map(p => (
                    <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: DIM, lineHeight: 1.5 }}>
                      <span style={{ color, marginTop: 2, flexShrink: 0 }}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '80px 24px', borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: TEXT, letterSpacing: '-0.025em', marginBottom: 14 }}>
            Ready to start practising?
          </h2>
          <p style={{ fontSize: 14, color: DIM, marginBottom: 32, lineHeight: 1.65 }}>
            Takes 2 minutes to get your personalised practice plan. Free to start, no credit card needed.
          </p>
          <Link href="/onboarding" style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '16px 40px', borderRadius: 16,
            background: NAVY, color: '#fff',
            fontSize: 16, fontWeight: 800, textDecoration: 'none',
            boxShadow: `0 7px 0 ${NAVY_D}, 0 12px 28px rgba(0,0,0,.4)`,
            letterSpacing: '-0.01em',
          }}>
            Take the free diagnostic →
          </Link>
          <p style={{ fontSize: 12, color: DIM, marginTop: 14 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: CHEM, fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: DIM }}>
          © 2025 EXL Exam Prep · Built for Nigerian secondary school students
        </p>
      </footer>
    </div>
  )
}