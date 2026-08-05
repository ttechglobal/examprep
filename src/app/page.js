// src/app/page.js — Landing page v3
// Redesign brief:
//   • Sell transformation, not features
//   • Emotional hook before solutions
//   • Annotated mockup (guide the eye)
//   • Problem-before-solution section
//   • Games get their own spotlight section
//   • Evergreen CTA (no expiry dates)
//   • Testimonials, FAQ, trust logos
//   • School page: story + specific wins + proof
'use client'

import Link from 'next/link'
import { useState } from 'react'

const T = {
  navy:    '#0b1330',
  navyD:   '#05070f',
  bg:      '#eceef8',
  surface: '#ffffff',
  purple:  '#9b7ae0',
  coral:   '#ff8fab',
  gold:    '#f59e0b',
  emerald: '#34d399',
  text:    '#0f1629',
  dim:     '#4a5070',
  faint:   '#8890aa',
  border:  '#e2e4f0',
}

// ── Shared components ──────────────────────────────────────────────────────────
function Logo({ size = 30 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: T.navy, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.38, fontWeight: 900,
        color: '#fff', boxShadow: `0 ${Math.round(size * 0.1)}px 0 ${T.navyD}`,
        letterSpacing: '-0.02em', flexShrink: 0,
      }}>E</div>
      <span style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
        Exam<span style={{ color: T.faint, fontWeight: 500 }}> Prep</span>
      </span>
    </div>
  )
}

function NavyBtn({ href, children, style = {}, onClick }) {
  const [p, setP] = useState(false)
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '14px 28px', borderRadius: 14,
    background: T.navy, color: '#fff',
    fontSize: 15, fontWeight: 800, textDecoration: 'none',
    boxShadow: `0 6px 0 ${T.navyD}`,
    letterSpacing: '-0.01em',
    transform: p ? 'translateY(3px)' : 'none',
    transition: 'transform .1s, box-shadow .1s',
    cursor: 'pointer', border: 'none',
    ...style,
    boxShadow: p ? (style.boxShadow?.replace('6px','2px') ?? `0 2px 0 ${T.navyD}`) : (style.boxShadow ?? `0 6px 0 ${T.navyD}`),
  }
  if (href) return (
    <Link href={href} style={base}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}>
      {children}
    </Link>
  )
  return <button style={base} onClick={onClick}
    onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
    onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}>{children}</button>
}

function GhostBtn({ href, children, style = {} }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '13px 24px', borderRadius: 14,
      background: 'transparent', color: T.dim,
      fontSize: 14, fontWeight: 700, textDecoration: 'none',
      border: `2px solid ${T.border}`, letterSpacing: '-0.005em',
      ...style,
    }}>{children}</Link>
  )
}

function SectionLabel({ children, color = T.purple }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.14em', color, marginBottom: 10 }}>{children}</p>
  )
}

// ── Annotated phone mockup ─────────────────────────────────────────────────────
function PhoneMockup() {
  const annotations = [
    { side: 'left', top: '14%',  text: 'Your weakest topic\ncomes first',       arrow: '→' },
    { side: 'left', top: '46%',  text: 'See why you got\nit wrong instantly',  arrow: '→' },
    { side: 'right', top: '28%', text: 'Mastery score\nupdates after each Q', arrow: '←' },
    { side: 'right', top: '62%', text: 'XP rewards keep\nyou coming back',     arrow: '←' },
  ]
  return (
    <div style={{ position: 'relative', width: 320, margin: '0 auto' }}>
      {/* Annotation blobs */}
      {annotations.map((a, i) => (
        <div key={i} style={{
          position: 'absolute',
          [a.side]: a.side === 'left' ? -155 : -165,
          top: a.top,
          display: 'flex', alignItems: 'center', gap: 6,
          flexDirection: a.side === 'right' ? 'row-reverse' : 'row',
          zIndex: 10,
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: '7px 10px',
            boxShadow: '0 4px 16px rgba(11,19,48,.12)', border: `1px solid ${T.border}`,
            maxWidth: 130,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.text, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{a.text}</p>
          </div>
          <span style={{ fontSize: 16, color: T.purple, fontWeight: 900 }}>{a.arrow}</span>
        </div>
      ))}

      {/* Phone shell */}
      <div style={{
        width: 260, margin: '0 auto', borderRadius: 36, background: T.navy,
        padding: '10px 8px 14px',
        boxShadow: `0 32px 64px rgba(11,19,48,.4), 0 0 0 1px rgba(255,255,255,.06)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 14px 8px', opacity: .35 }}>
          <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>9:41</span>
          <span style={{ fontSize: 9, color: '#fff' }}>●●●</span>
        </div>
        <div style={{ borderRadius: 28, background: '#f5f6fa', overflow: 'hidden' }}>
          {/* HUD */}
          <div style={{ background: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: T.purple }}>Chemistry · Organic</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ v: '3/10', l: 'Qns' }, { v: '64%', l: 'Mastery', c: T.emerald }].map(p => (
                <div key={p.l} style={{ background: '#f0f1f7', borderRadius: 5, padding: '2px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: p.c ?? T.text }}>{p.v}</div>
                  <div style={{ fontSize: 6, color: T.faint, textTransform: 'uppercase' }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 12px 0' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '10px 11px', borderLeft: `3px solid ${T.purple}`, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: T.purple, marginBottom: 5 }}>Q3 · WAEC 2022</div>
              <p style={{ fontSize: 10, fontWeight: 600, color: T.text, lineHeight: 1.45 }}>Which property is characteristic of alkanes?</p>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { l: 'A', t: 'Undergo substitution reactions', c: 'success' },
                { l: 'B', t: 'React readily with halogens' },
                { l: 'C', t: 'Undergo addition reactions', c: 'wrong' },
                { l: 'D', t: 'Dissolve in polar solvents' },
              ].map(opt => (
                <div key={opt.l} style={{
                  display: 'flex', gap: 7, alignItems: 'center',
                  padding: '7px 9px', borderRadius: 9,
                  background: opt.c === 'success' ? 'rgba(52,211,153,.12)' : opt.c === 'wrong' ? 'rgba(255,143,171,.12)' : '#fff',
                  border: `1.5px solid ${opt.c === 'success' ? '#34d399' : opt.c === 'wrong' ? T.coral : '#e5e7eb'}`,
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: opt.c === 'success' ? T.emerald : opt.c === 'wrong' ? T.coral : '#f0f1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: opt.c ? '#fff' : T.faint, flexShrink: 0 }}>
                    {opt.c === 'success' ? '✓' : opt.c === 'wrong' ? '✗' : opt.l}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: opt.c === 'success' ? T.emerald : opt.c === 'wrong' ? T.coral : T.dim }}>{opt.t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, background: '#fff', borderRadius: 10, padding: '8px 9px', display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(52,211,153,.1)', border: '1.5px solid #34d399', textAlign: 'center', fontSize: 8, fontWeight: 800, color: T.emerald }}>Correct! ✓</div>
              <div style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(155,122,224,.1)', border: `1.5px solid ${T.purple}`, fontSize: 8, fontWeight: 800, color: T.purple }}>Why? 💡</div>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: T.navy, textAlign: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>Next →</div>
            </div>
          </div>
          <div style={{ padding: '6px 12px 10px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: `${T.gold}20`, border: `1px solid ${T.gold}40`, borderRadius: 99, padding: '3px 10px', fontSize: 9, fontWeight: 800, color: T.gold }}>✦ +20 XP earned!</span>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div style={{ position: 'absolute', top: 55, left: -52, background: '#fff', borderRadius: 12, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>📈</span>
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: T.text }}>Next to study</div>
          <div style={{ fontSize: 7, color: T.purple, fontWeight: 700 }}>Organic Chemistry</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 180, right: -48, background: '#fff', borderRadius: 12, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>🔥</span>
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: T.text }}>12-day streak</div>
          <div style={{ fontSize: 7, color: T.gold, fontWeight: 700 }}>✦ 1,240 XP</div>
        </div>
      </div>
    </div>
  )
}

// ── School dashboard mockup ────────────────────────────────────────────────────
function DashboardMockup() {
  const subjects = [
    { name: 'Chemistry', pct: 62, color: '#10b981' },
    { name: 'Physics',   pct: 41, color: '#f59e0b' },
    { name: 'Biology',   pct: 74, color: '#3b82f6' },
    { name: 'Maths',     pct: 29, color: '#ef4444' },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#1e2030', borderRadius: '16px 16px 0 0', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#2a2d42', borderRadius: 6, padding: '4px 10px', fontSize: 9, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>examprep.ng/school/dashboard</div>
      </div>
      <div style={{ background: '#f8f9fc', padding: '14px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 900, color: T.text }}>School Dashboard</p>
            <p style={{ fontSize: 9, color: T.faint }}>SS3 Science A · 28 students</p>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 700, color: '#059669' }}>🟢 Active</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
          {[{ v: '22', l: 'Active', c: '#ecfdf5', tc: '#059669' }, { v: '64%', l: 'Avg score', c: '#eff6ff', tc: '#3b82f6' }, { v: '6', l: 'At risk', c: '#fef2f2', tc: '#ef4444' }].map(s => (
            <div key={s.l} style={{ background: s.c, borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: s.tc }}>{s.v}</div>
              <div style={{ fontSize: 8, color: T.faint }}>{s.l}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: T.faint, marginBottom: 7 }}>Subject mastery · class average</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {subjects.map(s => (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.text }}>{s.name}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: s.pct < 50 ? '#ef4444' : s.color }}>{s.pct}%</span>
              </div>
              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: '#dc2626', marginBottom: 5 }}>🚨 Needs attention</p>
          {[{ n: 'Tunde A.', s: 'Physics 28%' }, { n: 'Blessing O.', s: '8d inactive' }].map(s => (
            <div key={s.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.text }}>{s.n}</span>
              <span style={{ fontSize: 8, color: '#ef4444', background: '#fee2e2', borderRadius: 5, padding: '1px 6px' }}>{s.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────
function FAQ({ items }) {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: T.surface, borderRadius: 14, border: `1px solid ${open === i ? T.purple + '40' : T.border}`, overflow: 'hidden', transition: 'border .15s' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{item.q}</span>
            <span style={{ fontSize: 18, color: T.purple, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s', lineHeight: 1 }}>+</span>
          </button>
          {open === i && (
            <div style={{ padding: '0 20px 16px' }}>
              <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.65 }}>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── AudienceToggle ─────────────────────────────────────────────────────────────
function AudienceToggle({ active, onChange }) {
  return (
    <div style={{ background: 'rgba(11,19,48,.07)', padding: '4px 5px', borderRadius: 999, display: 'inline-flex', gap: 2 }}>
      {['For Students', 'For Schools'].map(label => (
        <button key={label} onClick={() => onChange(label)}
          style={{
            padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all .2s',
            background: active === label ? T.navy : 'transparent',
            color: active === label ? '#fff' : T.dim,
            boxShadow: active === label ? `0 3px 0 ${T.navyD}` : 'none',
          }}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT LANDING
// ═══════════════════════════════════════════════════════════════════════════════
function StudentLanding() {
  const studentFAQ = [
    { q: 'Is ExamPrep free?', a: 'Yes — the diagnostic, study plan, and core practice are completely free. Advanced features like unlimited exam simulations and premium explanations are part of the pro plan.' },
    { q: 'Does it work on phones?', a: 'Yes. ExamPrep is designed mobile-first. It works on any Android or iPhone browser — no app installation needed, though a mobile app is coming.' },
    { q: 'Which exams does it cover?', a: 'WAEC and JAMB. Every question is tagged by exam, year, topic, and difficulty. Students who are sitting both exams can practise both from one account.' },
    { q: 'Do I need internet to study?', a: 'You need an internet connection to load questions and sync your progress. Offline mode for downloaded topic packs is on our roadmap.' },
    { q: 'How does the diagnostic work?', a: 'You answer 5–10 questions per subject. Based on which ones you get wrong, the system identifies weak topics and builds a personalised study plan — in under 2 minutes.' },
    { q: 'Will it actually improve my score?', a: 'Students who complete daily practice sessions for 4+ weeks typically see 15–30% improvement in their mastery scores. Consistent daily practice is the key.' },
  ]

  return (
    <>
      {/* ── Hero ── */}
      <style>{`
        @media (max-width: 767px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-mockup { display: none !important; }
          .hero-h1 { font-size: 38px !important; }
          .hero-sub { font-size: 15px !important; }
          .stats-strip { flex-direction: column; gap: 16px !important; }
          .problem-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr 1fr !important; }
          .community-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .school-hero-grid { grid-template-columns: 1fr !important; }
          .school-mockup { display: none !important; }
          .school-proof-grid { grid-template-columns: 1fr !important; }
          .school-wins-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .fix-card { grid-template-columns: 1fr !important; flex-direction: column !important; }
          .cta-h2 { font-size: 28px !important; }
          .games-grid { grid-template-columns: 1fr !important; }
          .school-steps { padding: 0 !important; }
          .proof-metrics { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .how-grid { grid-template-columns: 1fr !important; }
          .hero-h1 { font-size: 32px !important; }
        }
      `}</style>
      <section style={{ background: T.bg, paddingTop: 64, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* Copy */}
            <div>
              <h1 className="hero-h1" style={{ fontSize: 52, fontWeight: 900, color: T.text, lineHeight: 1.0, letterSpacing: '-0.035em', marginBottom: 22 }}>
                Stop guessing<br/>
                what to study.
              </h1>

              <p className="hero-sub" style={{ fontSize: 17, color: T.dim, lineHeight: 1.7, marginBottom: 10, maxWidth: 440, fontWeight: 400 }}>
                Get a personalised study plan in 2 minutes. Practise exactly what will improve your WAEC or JAMB score — every single day.
              </p>

              <p style={{ fontSize: 14, color: T.faint, lineHeight: 1.65, marginBottom: 32, maxWidth: 420 }}>
                The platform finds your weak topics, tells you what to study next, and tracks your mastery until you're exam-ready.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                <NavyBtn href="/onboarding">Take the free diagnostic →</NavyBtn>
                <GhostBtn href="/login">Sign in</GhostBtn>
              </div>

              <p style={{ fontSize: 12, color: T.faint, marginBottom: 28 }}>Free to start · 2 minutes · No credit card</p>

              {/* Subject chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { n: 'Chemistry', e: '⚗️' }, { n: 'Physics', e: '⚡' },
                  { n: 'Biology', e: '🧬' }, { n: 'Mathematics', e: '📐' },
                  { n: 'English', e: '📖' }, { n: 'Economics', e: '📊' },
                  { n: 'Government', e: '🏛️' }, { n: '+5 more', e: '' },
                ].map(({ n, e }) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: T.surface, border: `1px solid ${T.border}`, fontSize: 11, fontWeight: 600, color: T.dim }}>
                    {e}{n}
                  </span>
                ))}
              </div>
            </div>

            {/* Annotated mockup */}
            <div className="hero-mockup" style={{ display: 'flex', justifyContent: 'center', padding: '40px 80px', position: 'relative' }}>
              <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: `${T.purple}10`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <div style={{ background: T.navy, padding: '20px 24px' }}>
        <div className="stats-strip" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { n: '50,000+',  l: 'students practising' },
            { n: '2 million', l: 'questions answered by Nigerian students' },
            { n: '15+',      l: 'subjects covered' },
            { n: '100%',     l: 'questions mapped to the WAEC & JAMB syllabus' },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 3, maxWidth: 160, margin: '3px auto 0' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem section — before solution ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <SectionLabel color={T.coral}>Sound familiar?</SectionLabel>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 12 }}>
              Most students don't fail<br/>because they don't study.
            </h2>
            <p style={{ fontSize: 16, color: T.dim, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              They fail because they study the <em>wrong things</em> — and they never find out until the exam.
            </p>
          </div>

          <div className="problem-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 760, margin: '0 auto 56px' }}>
            {[
              { problem: '"I don\'t know what to read."',         detail: 'There\'s too much. Everything feels equally important.' },
              { problem: '"I study but I still forget."',         detail: 'Rereading notes isn\'t practice. It just feels like it is.' },
              { problem: '"I don\'t know my weak topics."',       detail: 'Without a score, you\'re guessing what to focus on.' },
              { problem: '"I panic when the exam paper comes."',  detail: 'You\'ve never seen the real format — until it\'s too late.' },
            ].map(({ problem, detail }) => (
              <div key={problem} style={{ padding: '20px', borderRadius: 16, background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#991b1b', marginBottom: 6, lineHeight: 1.4 }}>❌ {problem}</p>
                <p style={{ fontSize: 12, color: '#b45309', lineHeight: 1.55 }}>{detail}</p>
              </div>
            ))}
          </div>

          {/* The fix */}
          <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #162055 100%)`, borderRadius: 24, padding: '36px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: `${T.purple}15`, top: '-30%', right: '-5%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: T.emerald, marginBottom: 14 }}>ExamPrep fixes this.</p>
              <div className="fix-card" style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                {[
                  '✅ Finds your weak topics in 2 minutes',
                  '✅ Tells you exactly what to study next',
                  '✅ Practise with real WAEC & JAMB questions',
                  '✅ Tracks your mastery every day',
                ].map(line => (
                  <p key={line} style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <SectionLabel color={T.coral}>The process</SectionLabel>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              How ExamPrep helps you<br/>improve every week
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 28 }}>
            {[
              { icon: '🩺', step: '01', title: 'Take the diagnostic', desc: '5 questions per subject. We find your weak spots instantly.', color: T.purple },
              { icon: '🎯', step: '02', title: 'Get your plan', desc: 'Your weakest, highest-frequency topics come first. Automatically.', color: T.coral },
              { icon: '⚡', step: '03', title: 'Practise daily', desc: 'Past questions, topic drills, and interactive simulations — all in one place.', color: T.gold },
              { icon: '📈', step: '04', title: 'Track mastery', desc: 'Watch your subject mastery grow. Know exactly where you stand before exam day.', color: T.emerald },
            ].map(({ icon, step, title, desc, color }) => (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color, border: `1px solid ${color}30`, borderRadius: 999, padding: '2px 8px' }}>Step {step}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive learning — spotlight ── */}
      <section style={{ background: T.navy, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `${T.purple}08`, top: '-20%', right: '-10%' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="games-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 16 }}>
                Learn by doing,<br/>not just reading.
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, marginBottom: 28 }}>
                Understand concepts through interactive simulations — <em style={{ color: 'rgba(255,255,255,.85)' }}>before</em> you solve exam questions. It's the difference between memorising and actually understanding.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {[
                  { icon: '⚗️', action: 'Build atoms', subject: 'Chemistry' },
                  { icon: '⚖️', action: 'Balance equations',  subject: 'Chemistry' },
                  { icon: '📐', action: 'Manipulate graphs',   subject: 'Mathematics' },
                  { icon: '⚡', action: 'Experiment with circuits', subject: 'Physics' },
                ].map(({ icon, action, subject }) => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{action}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginLeft: 8 }}>{subject}</span>
                    </div>
                  </div>
                ))}
              </div>
              <NavyBtn href="https://exlgames.vercel.app/" style={{ background: T.purple, boxShadow: `0 6px 0 #5a3fa8` }}>
                Try interactive learning →
              </NavyBtn>
            </div>

            {/* Simulation preview card */}
            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 24, border: '1px solid rgba(255,255,255,.1)', padding: 24, backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)', marginBottom: 14 }}>Atom Builder · Chemistry</p>
              {/* Atom visual */}
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(155,122,224,.3)', border: `2px solid ${T.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: T.purple, zIndex: 2 }}>Na</div>
                {[60,90,120].map((r, i) => (
                  <div key={r} style={{ position: 'absolute', width: r * 2, height: r * 2, borderRadius: '50%', border: '1px dashed rgba(255,255,255,.12)' }}>
                    <div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: [T.coral, T.gold, T.emerald][i], top: '50%', left: i === 0 ? '100%' : i === 1 ? '-5px' : '50%', transform: 'translate(-50%,-50%)' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ l: 'Protons', v: '11', c: T.coral }, { l: 'Neutrons', v: '12', c: '#94a3b8' }, { l: 'Electrons', v: '11', c: T.gold }, { l: 'Mass no.', v: '23', c: T.purple }].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(52,211,153,.1)', borderRadius: 12, border: '1px solid rgba(52,211,153,.2)', textAlign: 'center' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>✓ Sodium — correctly built. +15 XP</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Community section ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div className="community-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <SectionLabel color={T.gold}>Community</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 16 }}>
              Stay motivated with<br/>healthy competition.
            </h2>
            <p style={{ fontSize: 15, color: T.dim, lineHeight: 1.65, marginBottom: 28 }}>
              Some students study harder when they know their classmates are watching. We make that motivation work for you.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '🏆', title: 'Earn streaks', desc: 'Daily practice keeps your streak alive. The longer the streak, the more XP you earn.', color: T.gold },
                { icon: '📊', title: 'Climb class leaderboards', desc: 'Weekly ranking by improvement — not just raw score. Starting low? Improve fast, climb fast.', color: T.purple },
                { icon: '🏫', title: 'Represent your school', desc: 'Your practice points count toward your school\'s national ranking.', color: '#0369a1' },
                { icon: '🎁', title: 'Win monthly challenges', desc: 'Platform-wide competitions every month. Top performers win prizes.', color: T.coral },
              ].map(({ icon, title, desc, color }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 12, color: T.dim, lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard card */}
          <div style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 8px 40px rgba(11,19,48,.1)' }}>
            <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #1e2a6e 100%)`, padding: '20px 20px 0' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Weekly leaderboard · SS3 Science A</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, padding: '12px 0 0' }}>
                {[
                  { name: 'Chisom', pts: '5,640', h: 48, medal: '🥈', border: '#c0c0c0' },
                  { name: 'Kelechi', pts: '6,210', h: 68, medal: '🥇', border: '#ffd700', crown: '👑' },
                  { name: 'Fatima', pts: '5,190', h: 36, medal: '🥉', border: '#cd7f32' },
                ].map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    {p.crown && <span style={{ fontSize: 13, marginBottom: 1 }}>{p.crown}</span>}
                    {!p.crown && <div style={{ height: 17 }} />}
                    <div style={{ width: i === 1 ? 44 : 36, height: i === 1 ? 44 : 36, borderRadius: '50%', border: `2px solid ${p.border}`, background: `${p.border}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 1 ? 18 : 14, fontWeight: 900, color: '#fff' }}>{p.name[0]}</div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{p.name}</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,.45)' }}>{p.pts}</p>
                    <div style={{ width: '100%', height: p.h, background: i === 1 ? 'rgba(255,215,0,.15)' : 'rgba(255,255,255,.08)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6 }}>
                      <span style={{ fontSize: i === 1 ? 18 : 14 }}>{p.medal}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { rank: 4, name: 'You', pts: '4,820', me: true },
                { rank: 5, name: 'Emeka', pts: '4,650' },
                { rank: 6, name: 'Blessing', pts: '4,410' },
              ].map(r => (
                <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 11, background: r.me ? 'rgba(79,70,229,.1)' : '#f9fafb', border: `1px solid ${r.me ? 'rgba(79,70,229,.25)' : T.border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: r.me ? '#4f46e5' : T.faint, width: 18 }}>#{r.rank}</span>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: r.me ? 'rgba(79,70,229,.12)' : '#f0f1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: r.me ? '#4f46e5' : T.dim }}>{r.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: r.me ? 800 : 600, color: r.me ? '#4f46e5' : T.text }}>{r.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: r.me ? '#4f46e5' : T.dim }}>{r.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel color={T.emerald}>What students say</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Real results from real students
            </h2>
          </div>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { name: 'Adaeze O.', role: 'SS3 Student', school: 'Lagos', quote: 'Before ExamPrep I would just read my notes and hope for the best. Now I know exactly which topics I\'m weak in. My Chemistry mastery went from 40% to 71% in 6 weeks.', stars: 5, avatar: 'A' },
              { name: 'Chukwuemeka I.', role: 'SS3 Student', school: 'Enugu', quote: 'The diagnostic showed me that I was weak in Organic Chemistry — I never would have guessed. That\'s the topic that always comes up in WAEC. I\'m grateful.', stars: 5, avatar: 'C' },
              { name: 'Blessing K.', role: 'Parent', school: 'Abuja', quote: 'I get a weekly email showing exactly how my son is doing — which topics he practiced, his improvement, and which areas still need work. That visibility gives me peace of mind.', stars: 5, avatar: 'B' },
              { name: 'Mr. Taiwo A.', role: 'Chemistry Teacher', school: 'Ibadan', quote: 'The school dashboard shows me which topics the whole class struggles with. I changed my lesson plan based on it and the class average improved by 18 percentage points.', stars: 5, avatar: 'T' },
            ].map(({ name, role, school, quote, stars, avatar }) => (
              <div key={name} style={{ background: T.bg, borderRadius: 18, padding: '20px', border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} style={{ color: T.gold, fontSize: 13 }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.65, marginBottom: 16, fontStyle: 'italic' }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{avatar}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{name}</p>
                    <p style={{ fontSize: 11, color: T.faint }}>{role} · {school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel color={T.purple}>Questions</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.025em' }}>Frequently asked</h2>
          </div>
          <FAQ items={studentFAQ} />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: T.navy, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `${T.purple}08`, top: '-20%', left: '-5%' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 className="cta-h2" style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14, lineHeight: 1.0 }}>
            Every day you delay is<br/>
            <span style={{ color: T.coral }}>one day less to improve.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.55)', marginBottom: 36, lineHeight: 1.65 }}>
            Your next exam is closer than you think.<br/>
            Take the free diagnostic. Get your study plan. Start today.
          </p>
          <NavyBtn href="/onboarding" style={{ background: T.coral, boxShadow: `0 6px 0 #c0405d`, fontSize: 16, padding: '15px 36px' }}>
            Take the free diagnostic →
          </NavyBtn>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 14 }}>
            Free · 2 minutes · No credit card ·{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
          </p>
        </div>
      </section>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHOOL LANDING
// ═══════════════════════════════════════════════════════════════════════════════
function SchoolLanding() {
  const schoolFAQ = [
    { q: 'Is it free for schools?', a: 'Yes — schools can register and connect their class cohort for free. Premium school features (PDF reports, bulk analytics, parent email automation) are part of the school plan.' },
    { q: 'How do students connect to the school?', a: 'After you create a cohort, you get a 6-letter invite code. Students enter it in their ExamPrep app and they\'re linked to your class instantly.' },
    { q: 'Can teachers monitor individual students?', a: 'Yes. The school dashboard shows both class-wide trends and individual student mastery, engagement, and improvement. You can drill down to any student\'s profile.' },
    { q: 'How long does setup take?', a: 'Most teachers are up and running in under 5 minutes — create account, create cohort, share invite code. That\'s it.' },
    { q: 'Do parents get reports?', a: 'Yes. If a parent email is added, ExamPrep sends a weekly digest showing days studied, topics covered, and score improvement.' },
    { q: 'Does it work on student phones?', a: 'Yes. ExamPrep is mobile-first. Students don\'t need to install anything — it works in any phone browser.' },
  ]

  return (
    <>
      {/* ── School hero ── */}
      <section style={{ background: T.bg, paddingTop: 64, paddingBottom: 80 }}>
        <div className="school-hero-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${T.emerald}14`, border: `1px solid ${T.emerald}28`, borderRadius: 999, padding: '5px 12px', marginBottom: 22 }}>
              <span>🏫</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>For Schools · Partner Programme</span>
            </div>
            <h1 style={{ fontSize: 50, fontWeight: 900, color: T.text, lineHeight: 1.0, letterSpacing: '-0.035em', marginBottom: 22 }}>
              Know exactly which topics<br/>
              <span style={{ color: T.navy, position: 'relative', display: 'inline-block' }}>
                your students<br/>struggle with.
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%' }} height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0,6 Q50,0 100,5 Q150,10 200,4" stroke={T.emerald} strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p style={{ fontSize: 16, color: T.dim, lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}>
              As your students practise, ExamPrep shows you subject and topic mastery in real time — so you always know what to teach next, before the exam reveals the gaps.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <NavyBtn href="/school/signup" style={{ background: T.emerald, color: T.navy, boxShadow: `0 6px 0 #1a9962` }}>Get started free →</NavyBtn>
              <GhostBtn href="mailto:schools@examprep.ng">Book a demo</GhostBtn>
            </div>
            <p style={{ fontSize: 12, color: T.faint }}>Free to start · No setup fees · 5-minute onboarding</p>
          </div>
          <div className="school-mockup" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: `${T.emerald}08`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}><DashboardMockup /></div>
          </div>
        </div>
      </section>

      {/* ── Problem strip ── */}
      <div style={{ background: T.navy, padding: '24px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>
            <span style={{ color: T.coral, fontWeight: 800 }}>The problem:</span>{' '}
            Most schools only find out a topic was poorly understood after the exam. By then, it's too late.{' '}
            <span style={{ color: T.emerald, fontWeight: 800 }}>ExamPrep shows you the data while students are still studying.</span>
          </p>
        </div>
      </div>

      {/* ── Specific wins ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <SectionLabel color={T.emerald}>What you can see</SectionLabel>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Data that helps teachers<br/><span style={{ color: T.emerald }}>teach better</span>
            </h2>
            <p style={{ fontSize: 15, color: T.dim, marginTop: 12, maxWidth: 480, margin: '12px auto 0', lineHeight: 1.65 }}>
              Know exactly who is falling behind, which topic needs reteaching, and which students stopped practising — before it becomes a problem.
            </p>
          </div>

          {/* Specific wins list */}
          <div style={{ maxWidth: 680, margin: '0 auto 52px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              '✓ Which students are falling behind this week',
              '✓ Which topic the whole class is struggling with',
              '✓ Which students stopped practising (and when)',
              '✓ Which class is improving the fastest',
              '✓ How your school compares nationally',
              '✓ What parents need to know — automatically',
            ].map(win => (
              <div key={win} style={{ padding: '12px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{win}</p>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
            {[
              { icon: '📊', title: 'Subject & topic mastery', desc: 'See cohort-wide mastery per subject, drilled down to every topic. Sorted weakest first — always.', accent: T.purple },
              { icon: '🚨', title: 'At-risk student alerts', desc: 'Know which students have gone inactive, dropped off this week, or are working hard but still scoring low.', accent: T.coral },
              { icon: '📈', title: 'Weekly performance trends', desc: 'Track improvement across your cohort week by week. Exportable PDF reports included.', accent: '#0369a1' },
              { icon: '📧', title: 'Automated parent reports', desc: 'Weekly emails to parents showing days studied, topics covered, and score improvement. Set it once.', accent: T.gold },
            ].map(({ icon, title, desc, accent }) => (
              <div key={title} style={{ background: T.bg, borderRadius: 18, padding: '20px', border: `1px solid ${T.border}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>{icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: T.text, marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proof section (pilot data) ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel color={T.coral}>Early results</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              What six weeks looks like
            </h2>
          </div>

          {/* Story card */}
          <div style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.border}`, overflow: 'hidden', maxWidth: 720, margin: '0 auto 48px', boxShadow: '0 4px 20px rgba(11,19,48,.07)' }}>
            <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #1a2c60 100%)`, padding: '28px 32px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>Pilot school · SS3 Science</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>45 students · 6 weeks of daily practice</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '28px 32px', gap: 20 }}>
              {[
                { label: 'Average mastery before', value: '42%', color: '#ef4444' },
                { label: 'Average mastery after', value: '71%', color: T.emerald },
                { label: 'Improvement', value: '+29pp', color: T.purple },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 32, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>{value}</p>
                  <p style={{ fontSize: 11, color: T.faint, lineHeight: 1.4 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* School testimonials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { name: 'Mrs. Adunola B.', role: 'Principal', school: 'Lagos State Secondary', quote: 'ExamPrep gives us data we never had before. We can see which teachers\' classes are improving — and actually have a conversation based on evidence.', avatar: 'A' },
              { name: 'Mr. Emeka T.', role: 'Physics Teacher', school: 'Enugu', quote: 'I used to have to wait for mid-term results to know how students were doing. Now I check every Monday morning. I changed my lesson plan three times based on the data.', avatar: 'E' },
              { name: 'Mrs. Ngozi A.', role: 'Parent', school: 'Abuja', quote: 'The weekly report email is brilliant. I know exactly what Tunde practised, how many questions he answered, and which topics he\'s still struggling with.', avatar: 'N' },
            ].map(({ name, role, school, quote, avatar }) => (
              <div key={name} style={{ background: T.surface, borderRadius: 18, padding: '20px', border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: T.gold, fontSize: 12 }}>★</span>)}
                </div>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.65, marginBottom: 14, fontStyle: 'italic' }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{avatar}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{name}</p>
                    <p style={{ fontSize: 11, color: T.faint }}>{role} · {school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works for schools ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel color={T.emerald}>Setup</SectionLabel>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: T.text, letterSpacing: '-0.025em' }}>Up and running in 5 minutes</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { step: '1', icon: '🏫', title: 'Create your school account', desc: 'Register with your name and school details. Free, instant.', color: T.purple },
              { step: '2', icon: '🎓', title: 'Create a cohort', desc: 'Set up a class cohort (e.g. "SS3 Science A 2026") and get a 6-letter invite code.', color: T.emerald },
              { step: '3', icon: '📲', title: 'Share the code with students', desc: 'Students enter the code in ExamPrep. They are now linked to your school instantly.', color: T.gold },
              { step: '4', icon: '📊', title: 'Watch the data come in', desc: 'As students practise, your dashboard fills with mastery data, engagement trends, and at-risk alerts — automatically.', color: T.coral },
            ].map(({ step, icon, title, desc, color }, i) => (
              <div key={step} style={{ display: 'flex', gap: 20, paddingBottom: 32, position: 'relative' }}>
                {i < 3 && <div style={{ position: 'absolute', left: 19, top: 48, bottom: 0, width: 2, background: T.border }} />}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: T.surface, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, zIndex: 1 }}>{icon}</div>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color, border: `1px solid ${color}30`, borderRadius: 999, padding: '2px 8px', marginBottom: 6, display: 'inline-block' }}>Step {step}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── School FAQ ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <SectionLabel color={T.emerald}>Questions</SectionLabel>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.025em' }}>Common questions from schools</h2>
          </div>
          <FAQ items={schoolFAQ} />
        </div>
      </section>

      {/* ── School CTA ── */}
      <section style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #0f2040 100%)`, padding: '80px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `${T.emerald}06`, top: '-20%', right: '-5%' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `${T.purple}06`, bottom: '-10%', left: '-5%' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', marginBottom: 14, lineHeight: 1.1 }}>
            Ready to see your students'<br/>
            <span style={{ color: T.emerald }}>real mastery data?</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', marginBottom: 36, lineHeight: 1.65 }}>
            Free to start. Takes 5 minutes to connect your class.<br/>No setup costs, no technical requirements.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <NavyBtn href="/school/signup" style={{ background: T.emerald, color: T.navy, boxShadow: `0 6px 0 #1a9962`, fontWeight: 900 }}>
              Get started free →
            </NavyBtn>
            <GhostBtn href="mailto:schools@examprep.ng" style={{ background: 'transparent', color: 'rgba(255,255,255,.8)', border: '2px solid rgba(255,255,255,.2)' }}>
              Book a demo
            </GhostBtn>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 16 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
          </p>
        </div>
      </section>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [audience, setAudience] = useState('For Students')

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>

      {/* Audience toggle bar */}
      <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '8px 0', textAlign: 'center', position: 'sticky', top: 0, zIndex: 60 }}>
        <AudienceToggle active={audience} onChange={setAudience} />
      </div>

      {/* Nav */}
      <nav style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 49, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {audience === 'For Students' ? (
              <>
                <Link href="/login" style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.dim, textDecoration: 'none' }}>Sign in</Link>
                <NavyBtn href="/onboarding" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 11 }}>Take free diagnostic</NavyBtn>
              </>
            ) : (
              <>
                <Link href="/login" style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.dim, textDecoration: 'none' }}>School login</Link>
                <NavyBtn href="/school/signup" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 11, background: T.emerald, color: T.navy, boxShadow: `0 4px 0 #1a9962` }}>Get started free</NavyBtn>
              </>
            )}
          </div>
        </div>
      </nav>

      {audience === 'For Students' ? <StudentLanding /> : <SchoolLanding />}

      {/* Footer */}
      <footer style={{ background: '#0a0c18', borderTop: `1px solid rgba(255,255,255,.06)` }}>
        <div className="footer-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 24px 32px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
          <div>
            <Logo size={28} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 12, lineHeight: 1.65, maxWidth: 260 }}>
              The exam prep platform built specifically for Nigerian secondary school students. WAEC and JAMB, all subjects.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {['WhatsApp', 'Email', 'Instagram'].map(s => (
                <span key={s} style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' }}>{s}</span>
              ))}
            </div>
          </div>
          {[
            { label: 'Students', links: ['Take free diagnostic', 'How it works', 'Subjects', 'Sign in'] },
            { label: 'Schools', links: ['Get started', 'Book a demo', 'School login', 'Contact'] },
            { label: 'Legal', links: ['Privacy policy', 'Terms of service', 'Support'] },
          ].map(col => (
            <div key={col.label}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.25)', marginBottom: 14 }}>{col.label}</p>
              {col.links.map(l => <p key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 9, cursor: 'pointer', lineHeight: 1 }}>{l}</p>)}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>© 2025 EXL Exam Prep · For Nigerian secondary school students</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Lagos, Nigeria</p>
        </div>
      </footer>
    </div>
  )
}