'use client'
// src/app/page.js — ExamPrep Landing Page v4
// Matches the EXL game-feel prototype exactly.
// Dark mode default, light mode via .light class on html.
// Sections: Nav → Hero → Problem → How it works → Quick 5 → Leaderboard → Schools → FAQ → CTA → Footer
// Removed: stats bar, testimonials (per brief)

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const D = {
  // Dark mode
  bg:      '#0a0c14',
  card:    'rgba(255,255,255,.04)',
  border:  'rgba(255,255,255,.08)',
  prim:    '#ffffff',
  sec:     'rgba(255,255,255,.65)',
  tert:    'rgba(255,255,255,.35)',
  navy:    '#071B49',
  navyCard:'linear-gradient(145deg,#071B49 0%,#0c2460 55%,#062A78 100%)',
}
const L = {
  // Light mode
  bg:      '#f0f4ff',
  card:    '#ffffff',
  border:  '#dde4f5',
  prim:    '#071B49',
  sec:     '#3a4870',
  tert:    '#7a8aaa',
  navy:    '#062A78',
  navyCard:'linear-gradient(145deg,#062A78 0%,#1264E5 100%)',
}
const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'

// ── Logo mark (E + graduation cap SVG + A1 badge) ────────────────────────────
function LogoMark({ size = 30 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.28),
        background: '#062A78', boxShadow: `0 ${Math.round(size * 0.1)}px 0 #020c20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 512 512" fill="none">
          <path d="M292 105C235 103 167 118 137 153C112 182 122 208 155 215C185 221 222 210 263 196L226 236C185 253 139 274 131 307C122 344 165 363 208 354C250 345 292 323 331 298L302 353C267 379 210 406 155 403C98 400 64 369 76 325C86 286 120 262 165 241C124 247 83 239 69 210C52 175 81 136 121 116C164 94 226 83 292 86Z" fill="url(#lg)"/>
          <path d="M98 94L202 48L306 94L202 139Z" fill="#062A78"/>
          <path d="M123 91L202 57L281 91L202 123Z" fill="#1264E5"/>
          <path d="M61 335C123 401 272 427 383 365C430 339 451 309 444 287" stroke="#FFB800" strokeWidth="44" strokeLinecap="round" fill="none"/>
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#18B7F2"/><stop offset=".5" stopColor="#1264E5"/><stop offset="1" stopColor="#062A78"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div style={{
        position: 'absolute', top: -5, right: -7,
        background: GOLD, borderRadius: 3,
        fontSize: 6.5, fontWeight: 900, color: '#062A78',
        padding: '1px 4px', lineHeight: 1.4,
      }}>A1</div>
    </div>
  )
}

// ── Dark mode hook ────────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const stored = localStorage.getItem('exl-theme')
    if (stored) setDark(stored === 'dark')
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])
  const toggle = () => {
    setDark(d => {
      localStorage.setItem('exl-theme', !d ? 'dark' : 'light')
      return !d
    })
  }
  return [dark, toggle]
}

// ── Token helper ──────────────────────────────────────────────────────────────
function useT(dark) { return dark ? D : L }

// ── Shared components ─────────────────────────────────────────────────────────
function PressBtn({ href, onClick, children, gold = false, ghost = false, sm = false, style = {} }) {
  const [p, setP] = useState(false)
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    fontWeight: 900, letterSpacing: '-.015em', position: 'relative', overflow: 'hidden',
    borderRadius: 14,
    padding: sm ? '9px 18px' : '14px 28px',
    fontSize: sm ? 13 : 15,
    transform: p ? 'translateY(3px)' : 'none',
    transition: 'transform .1s, box-shadow .1s',
    ...(gold
      ? { background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: '#fff', boxShadow: p ? `0 2px 0 #b85000` : `0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.28)` }
      : ghost
      ? { background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)', boxShadow: 'none' }
      : { background: BLUE, color: '#fff', boxShadow: p ? `0 2px 0 #0a3fa0` : `0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.3)` }),
    ...style,
  }
  const shimmer = (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2.5s infinite', pointerEvents: 'none' }} />
  )
  const handlers = {
    onMouseDown: () => setP(true), onMouseUp: () => setP(false),
    onMouseLeave: () => setP(false), onTouchStart: () => setP(true), onTouchEnd: () => setP(false),
  }
  if (href) return <Link href={href} style={base} {...handlers}>{shimmer}{children}</Link>
  return <button style={base} onClick={onClick} {...handlers}>{shimmer}{children}</button>
}

function EyeBrow({ children, color = CYAN }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}30`, fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
      {children}
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Is ExamPrep free?',             a: 'Yes — the diagnostic, study plan, and core practice are completely free. Advanced features like unlimited exam simulations are part of the pro plan.' },
  { q: 'Which exams does it cover?',    a: 'WAEC and JAMB. Every question is tagged by exam, year, topic, and difficulty. Students sitting both can practise both from one account.' },
  { q: 'How does the diagnostic work?', a: 'You answer 5–10 questions per subject. Based on which ones you get wrong, the system identifies your weak topics and builds a personalised study plan — in under 2 minutes.' },
  { q: 'Does it work on phones?',       a: 'Yes. ExamPrep is designed mobile-first. It works on any Android or iPhone browser — no app to install.' },
  { q: 'Will it improve my score?',     a: 'Students who complete daily practice sessions for 4+ weeks typically see 15–30% improvement in mastery scores. Consistent daily practice is the key.' },
  { q: 'How do schools connect?',       a: 'Teachers create a cohort and share a 6-letter invite code. Students enter it and are instantly linked to the class dashboard.' },
]

function FAQ({ dark }) {
  const [open, setOpen] = useState(null)
  const t = useT(dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FAQS.map((item, i) => (
        <div key={i} style={{ background: t.card, border: `1px solid ${open === i ? CYAN + '40' : t.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .15s' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12, fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.prim }}>{item.q}</span>
            <span style={{ fontSize: 20, color: CYAN, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s', lineHeight: 1 }}>+</span>
          </button>
          {open === i && (
            <div style={{ padding: '0 20px 16px' }}>
              <p style={{ fontSize: 13, color: t.sec, lineHeight: 1.7 }}>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Phone mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 260, margin: '0 auto', animation: 'float 4s ease-in-out infinite' }}>
      {/* Shell */}
      <div style={{ borderRadius: 40, background: '#071B49', padding: '10px 8px 14px', boxShadow: '0 40px 80px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 14px 7px', opacity: .3 }}>
          <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>9:41</span>
          <span style={{ fontSize: 9, color: '#fff' }}>●●●</span>
        </div>
        <div style={{ borderRadius: 30, background: '#f0f4ff', overflow: 'hidden' }}>
          {/* HUD */}
          <div style={{ background: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: BLUE }}>Physics · Waves</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ v: '3/5', l: 'Qns' }, { v: '72%', l: 'Mastery', c: '#059669' }].map(p => (
                <div key={p.l} style={{ background: '#f0f4ff', borderRadius: 5, padding: '2px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: p.c ?? '#071B49' }}>{p.v}</div>
                  <div style={{ fontSize: 6, color: '#7a8aaa', textTransform: 'uppercase' }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Question */}
          <div style={{ padding: '10px 11px 0' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '10px 11px', borderLeft: `3px solid ${BLUE}`, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: BLUE, marginBottom: 5 }}>Q3 · WAEC 2023</div>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#071B49', lineHeight: 1.45 }}>A wave has frequency 50 Hz and wavelength 2 m. What is its velocity?</p>
            </div>
            {/* Options */}
            {[
              { l: 'A', t: '100 m/s', s: 'correct' },
              { l: 'B', t: '25 m/s',  s: 'wrong' },
              { l: 'C', t: '50 m/s' },
              { l: 'D', t: '200 m/s' },
            ].map(o => (
              <div key={o.l} style={{
                display: 'flex', gap: 7, alignItems: 'center', padding: '6px 8px', borderRadius: 9, marginBottom: 5,
                background: o.s === 'correct' ? 'rgba(52,211,153,.1)' : o.s === 'wrong' ? 'rgba(248,113,113,.08)' : '#f8f9fc',
                border: `1.5px solid ${o.s === 'correct' ? '#34d399' : o.s === 'wrong' ? '#f87171' : '#e5e7eb'}`,
              }}>
                <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color: o.s ? '#fff' : '#9ca3af', background: o.s === 'correct' ? '#22c55e' : o.s === 'wrong' ? '#ef4444' : '#f0f4ff' }}>
                  {o.s === 'correct' ? '✓' : o.s === 'wrong' ? '✗' : o.l}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: o.s === 'correct' ? '#16a34a' : o.s === 'wrong' ? '#dc2626' : '#3a4870' }}>{o.t}</span>
              </div>
            ))}
            {/* Action row */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(52,211,153,.1)', border: '1.5px solid #34d399', textAlign: 'center', fontSize: 8, fontWeight: 800, color: '#16a34a' }}>Correct! ✓</div>
              <div style={{ padding: '6px 10px', borderRadius: 8, background: `${BLUE}18`, border: `1.5px solid ${BLUE}`, fontSize: 8, fontWeight: 800, color: BLUE }}>Why? 💡</div>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: BLUE, textAlign: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>Next →</div>
            </div>
          </div>
          {/* XP chip */}
          <div style={{ padding: '8px 11px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,184,0,.15)', border: `1px solid rgba(255,184,0,.3)`, borderRadius: 99, padding: '3px 10px', fontSize: 9, fontWeight: 800, color: GOLD }}>✦ +25 XP earned!</span>
          </div>
        </div>
      </div>
      {/* Floating badges */}
      {[
        { top: 30, left: -20, emoji: '🔥', title: '7-day streak!', sub: '✦ 1,820 XP total', delay: '.2s' },
        { top: 'auto', bottom: 90, right: -24, emoji: '📈', title: 'Physics: 72%', sub: 'Up from 41% last week', delay: '.4s' },
        { top: 'auto', bottom: 20, left: -10, emoji: '🏆', title: '#1 in class', sub: 'Weekly leaderboard', delay: '.6s' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'absolute', top: b.top, bottom: b.bottom, left: b.left, right: b.right,
          background: 'rgba(6,10,20,.92)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,.12)', borderRadius: 12,
          padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          animation: `pop .5s ${b.delay} ease both`,
        }}>
          <span style={{ fontSize: 16 }}>{b.emoji}</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{b.title}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,.45)' }}>{b.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [dark, toggleDark] = useDark()
  const [audience, setAudience] = useState('students')
  const t = useT(dark)

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
    @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
    @keyframes pop { 0% { transform: scale(.8); opacity: 0 } 60% { transform: scale(1.04) } 100% { transform: scale(1); opacity: 1 } }
    @keyframes flame { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(1.1) } }
    @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(18,100,229,.25) } 50% { box-shadow: 0 0 40px rgba(18,100,229,.5) } }
    @media (max-width: 767px) {
      .hero-grid, .two-col, .school-grid { grid-template-columns: 1fr !important; }
      .phone-wrap { display: none !important; }
      .hero-h1 { font-size: 38px !important; }
      .section-h2 { font-size: 30px !important; }
      .cta-h2 { font-size: 32px !important; }
      .steps-grid { grid-template-columns: 1fr 1fr !important; }
      .footer-grid { grid-template-columns: 1fr 1fr !important; }
      .stat-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 480px) {
      .hero-h1 { font-size: 32px !important; }
      .steps-grid { grid-template-columns: 1fr !important; }
      .footer-grid { grid-template-columns: 1fr !important; }
      .hero-btns { flex-direction: column !important; }
      .hero-btns a, .hero-btns button { width: 100% !important; justify-content: center !important; }
    }
  `

  const wrap  = { maxWidth: 1100, margin: '0 auto', padding: '0 24px' }
  const sec   = (bg, extra = {}) => ({ background: bg, padding: '96px 0', ...extra })

  return (
    <div style={{ background: t.bg, color: t.prim, minHeight: '100vh', transition: 'background .2s, color .2s' }}>
      <style>{css}</style>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 58, borderBottom: `1px solid ${t.border}`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: dark ? 'rgba(6,10,20,.85)' : 'rgba(248,251,255,.9)', display: 'flex', alignItems: 'center' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <LogoMark size={30} />
            <span style={{ fontSize: 15, fontWeight: 900, color: t.prim, letterSpacing: '-.03em' }}>Exam<span style={{ fontWeight: 400, color: t.tert }}>Prep</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/login" style={{ padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: t.sec, textDecoration: 'none' }}>Sign in</Link>
            <PressBtn href="/onboarding" sm>Start free →</PressBtn>
            {/* Dark mode toggle */}
            <button onClick={toggleDark} style={{ marginLeft: 6, width: 34, height: 34, borderRadius: 9, border: `1px solid ${t.border}`, background: t.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: t.sec }} aria-label="Toggle dark mode">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ ...sec(dark ? '#0a0c14' : '#f0f4ff', { background: dark ? `radial-gradient(ellipse at 65% 0%,rgba(18,100,229,.18) 0%,transparent 55%), radial-gradient(ellipse at 10% 90%,rgba(24,183,242,.1) 0%,transparent 50%), #0a0c14` : '#f0f4ff', paddingTop: 72 }), position: 'relative', overflow: 'hidden' }}>

        {/* Ambient star dots - dark only */}
        {dark && Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: '#fff', width: Math.random() * 1.8 + 0.5, height: Math.random() * 1.8 + 0.5, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: .1, animation: `float ${2 + Math.random() * 3}s ${Math.random() * 4}s ease-in-out infinite`, pointerEvents: 'none' }} />
        ))}

        <div style={wrap}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <EyeBrow color={CYAN}>
                <span style={{ animation: 'flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
                Built for WAEC &amp; JAMB
              </EyeBrow>
              <h1 className="hero-h1" style={{ fontSize: 56, fontWeight: 900, lineHeight: .97, letterSpacing: '-.04em', color: t.prim, marginBottom: 22 }}>
                Stop cramming.<br/>
                Start <span style={{ background: `linear-gradient(135deg,${CYAN},${BLUE})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>scoring.</span>
              </h1>
              <p style={{ fontSize: 17, color: t.sec, lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>
                Practice just 5 questions a day. ExamPrep finds your weak topics, shows you what to study next, and tracks your mastery — until exam day.
              </p>
              <div className="hero-btns" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <PressBtn href="/onboarding" gold style={{ fontSize: 16, padding: '15px 32px' }}>Start your Quick 5 →</PressBtn>
                <PressBtn href="#how" ghost>See how it works</PressBtn>
              </div>
              <p style={{ fontSize: 12, color: t.tert, marginBottom: 24 }}>Free · 2 minutes to start · No credit card</p>
              {/* Subject chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {['⚗️ Chemistry','⚡ Physics','🧬 Biology','📐 Mathematics','📖 English','📊 Economics','+ 6 more'].map(s => (
                  <span key={s} style={{ padding: '4px 11px', borderRadius: 999, background: t.card, border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600, color: t.tert }}>{s}</span>
                ))}
              </div>
            </div>
            {/* Phone */}
            <div className="phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'relative', padding: '40px 0' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%,rgba(18,100,229,.18) 0%,transparent 65%)', pointerEvents: 'none' }} />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section style={sec(dark ? '#071B49' : '#ffffff', { position: 'relative' })}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 52px' }}>
            <EyeBrow color="#f87171">Sound familiar?</EyeBrow>
            <h2 className="section-h2" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.0, color: t.prim }}>
              Most students don't fail because they don't study.
            </h2>
            <p style={{ fontSize: 16, color: t.sec, lineHeight: 1.7, marginTop: 16 }}>
              They fail because they study the <em style={{ color: t.prim, fontStyle: 'normal', fontWeight: 700 }}>wrong things</em> — and never find out until the exam.
            </p>
          </div>
          {/* Problem cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 760, margin: '0 auto 44px' }} className="two-col">
            {[
              { p: '"I don\'t know what to study."',     d: 'Too many topics, not enough time. Everything feels equally important.' },
              { p: '"I study but I still forget."',      d: 'Re-reading notes isn\'t practice. It just feels like it is.' },
              { p: '"I don\'t know my weak topics."',    d: 'Without a score, you\'re guessing where to focus — until the exam proves you wrong.' },
              { p: '"I panic when the paper comes."',    d: 'You\'ve never practised under real exam conditions — until it\'s too late.' },
            ].map(({ p, d }) => (
              <div key={p} style={{ padding: 20, borderRadius: 16, background: dark ? 'rgba(255,255,255,.04)' : '#fef2f2', border: `1px solid ${dark ? 'rgba(255,255,255,.07)' : '#fecaca'}` }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: dark ? 'rgba(255,255,255,.8)' : '#991b1b', marginBottom: 6 }}>❌ {p}</p>
                <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,.4)' : '#b45309', lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
          {/* Fix strip */}
          <div style={{ background: `rgba(18,100,229,.1)`, border: `1.5px solid rgba(18,100,229,.25)`, borderRadius: 18, padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 760, margin: '0 auto' }} className="two-col">
            {['Finds your weak topics in 2 minutes','Tells you exactly what to study next','Real WAEC & JAMB past questions','Tracks your mastery every day'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 700, color: t.prim }}>
                <span style={{ color: '#4ade80', fontSize: 16, flexShrink: 0 }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={sec(t.bg)}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto 56px' }}>
            <EyeBrow color={CYAN}>The process</EyeBrow>
            <h2 className="section-h2" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.0, color: t.prim }}>Exam-ready in four steps</h2>
          </div>
          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }}>
            {[
              { icon: '🩺', label: 'Take the diagnostic', desc: '5 questions per subject. 2 minutes. We find your exact weak spots.', color: CYAN },
              { icon: '🎯', label: 'Get your plan',       desc: 'Your weakest, highest-frequency topics come first. Personalised, automatic.', color: BLUE },
              { icon: '⚡', label: 'Practice daily',      desc: 'Just 5 questions a day. WAEC and JAMB past questions, timed drills, all in one place.', color: GOLD },
              { icon: '📈', label: 'Track mastery',       desc: 'Watch your subject mastery climb. Know exactly where you stand before exam day.', color: '#4ade80' },
            ].map(({ icon, label, desc, color }) => (
              <div key={label}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: t.prim, marginBottom: 8, letterSpacing: '-.02em' }}>{label}</h3>
                <p style={{ fontSize: 13, color: t.sec, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick 5 ── */}
      <section style={{ ...sec(dark ? '#071B49' : '#f0f4ff'), position: 'relative', overflow: 'hidden' }}>
        <div style={wrap}>
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <EyeBrow color={GOLD}>The Quick 5 method</EyeBrow>
              <h2 className="section-h2" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.0, color: t.prim, marginBottom: 18 }}>5 questions a day.<br/>That's all it takes.</h2>
              <p style={{ fontSize: 16, color: t.sec, lineHeight: 1.7, marginBottom: 28 }}>
                Research shows daily short practice beats weekend marathons. Every session is designed to take 3–4 minutes — short enough to fit between classes, meals, or before bed.
              </p>
              {[
                { icon: '⏱', c: GOLD, title: 'Takes 3–4 minutes',            desc: 'Short enough that there\'s no excuse not to do it.' },
                { icon: '🧠', c: CYAN, title: 'Spaced repetition built in',   desc: 'The system revisits what you got wrong — until you get it right.' },
                { icon: '🎯', c: '#4ade80', title: 'Earn XP, build streaks', desc: 'Finish 5, and you\'ll want to do 5 more.' },
              ].map(({ icon, c, title, desc }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c}18`, border: `1px solid ${c}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: t.prim, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 13, color: t.sec }}>{desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 28 }}>
                <PressBtn href="/onboarding">Start your first Quick 5 →</PressBtn>
              </div>
            </div>

            {/* Quest card demo */}
            <div>
              <div style={{
                borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(145deg,#071B49 0%,#0c2460 55%,#062A78 100%)',
                border: `1.5px solid rgba(24,183,242,.28)`,
                animation: 'glow 4s ease-in-out infinite',
              }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
                {/* Ring + content */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" style={{ filter: `drop-shadow(0 0 8px ${BLUE}88)` }}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke={BLUE} strokeWidth="7"
                        strokeLinecap="round" strokeDasharray="120 200"
                        transform="rotate(-90 40 40)"/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>3</span>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>/5</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Quick 5</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: GOLD }}>+50 XP</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 14 }}>Physics · Waves & Sound · ~4 min</p>
                    <PressBtn href="/onboarding" style={{ width: '100%', fontSize: 13, padding: '11px 0', justifyContent: 'center' }}>Start today's quest →</PressBtn>
                  </div>
                </div>
                {/* Week dots */}
                <div style={{ display: 'flex', gap: 6, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)', alignItems: 'center' }}>
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => {
                    const done = i === 0, today = i === 1
                    return (
                      <div key={d} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800,
                        background: today ? BLUE : done ? 'rgba(24,183,242,.15)' : 'rgba(255,255,255,.04)',
                        border: `1px solid ${today ? BLUE : done ? 'rgba(24,183,242,.3)' : 'rgba(255,255,255,.08)'}`,
                        color: today ? '#fff' : done ? CYAN : 'rgba(255,255,255,.2)',
                      }}>{today ? '●' : done ? '✓' : d[0]}</div>
                    )
                  })}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ animation: 'flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: ORANGE }}>7 days</span>
                  </div>
                </div>
              </div>

              {/* After-5 hook */}
              <div style={{ marginTop: 12, padding: 18, background: dark ? 'rgba(255,184,0,.07)' : 'rgba(255,184,0,.08)', border: '1.5px solid rgba(255,184,0,.2)', borderRadius: 18, textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: t.prim, marginBottom: 4 }}>Want to push to 80%? ⚡</p>
                <p style={{ fontSize: 12, color: t.tert, marginBottom: 14 }}>Another Quick 5. Same topic. 3 minutes.</p>
                <PressBtn href="/onboarding" gold style={{ width: '100%', fontSize: 13, padding: '12px 0', justifyContent: 'center' }}>Go again — Quick 5 ⚡</PressBtn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section style={sec(t.bg)}>
        <div style={wrap}>
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* Leaderboard card */}
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 22, overflow: 'hidden' }}>
              {/* Podium */}
              <div style={{ background: 'linear-gradient(155deg,#062A78 0%,#1264E5 100%)', padding: '20px 20px 0' }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>This week · SS3 Science A</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingBottom: 0 }}>
                  {[
                    { n: 'Amaka', p: '1,856', h: 50, bg: 'linear-gradient(135deg,#0ea5e9,#818cf8)', medal: '🥈' },
                    { n: 'Chidi', p: '2,340', h: 72, bg: `linear-gradient(135deg,${CYAN},${BLUE})`, medal: '🥇', crown: true, me: true },
                    { n: 'Temi',  p: '1,620', h: 36, bg: 'linear-gradient(135deg,#4ade80,#22c55e)', medal: '🥉' },
                  ].map((person, i) => (
                    <div key={person.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                      {person.crown && <svg width="20" height="14" viewBox="0 0 24 18" fill="none"><path d="M2 14L5 5L10 10L12 3L14 10L19 5L22 14H2Z" fill={GOLD} stroke={ORANGE} strokeWidth="1" strokeLinejoin="round"/><rect x="2" y="14" width="20" height="3" rx="1.5" fill={ORANGE}/></svg>}
                      {!person.crown && <div style={{ height: 16 }} />}
                      <div style={{ width: person.me ? 46 : 38, height: person.me ? 46 : 38, borderRadius: '50%', background: person.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: person.me ? 16 : 13, fontWeight: 900, color: '#fff', border: person.me ? `2px solid rgba(24,183,242,.5)` : 'none' }}>{person.n[0]}</div>
                      <p style={{ fontSize: person.me ? 11 : 10, fontWeight: person.me ? 900 : 700, color: person.me ? CYAN : '#fff' }}>{person.n}</p>
                      <p style={{ fontSize: 9, color: person.me ? GOLD : 'rgba(255,255,255,.45)', fontWeight: person.me ? 800 : 400 }}>{person.p}</p>
                      <div style={{ width: '100%', height: person.h, background: i === 1 ? 'rgba(255,184,0,.12)' : 'rgba(255,255,255,.07)', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6, fontSize: i === 1 ? 18 : 14 }}>{person.medal}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Rows */}
              <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { rank: '4', n: 'Ola',    p: '1,245', me: false },
                  { rank: '—', n: 'You',    p: '2,340', me: true },
                  { rank: '5', n: 'Emeka',  p: '1,102', me: false },
                ].map(r => (
                  <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11, background: r.me ? `rgba(24,183,242,.08)` : t.card, border: `1px solid ${r.me ? 'rgba(24,183,242,.2)' : t.border}` }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: r.me ? CYAN : t.tert, minWidth: 16, textAlign: 'center' }}>{r.rank}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.me ? `linear-gradient(135deg,${CYAN},${BLUE})` : t.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: r.me ? '#fff' : t.sec }}>{r.n[0]}</div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: r.me ? 800 : 500, color: r.me ? CYAN : t.prim }}>{r.n}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.me ? GOLD : t.tert }}>{r.p} XP</span>
                  </div>
                ))}
              </div>
              {/* Weekly challenge */}
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ background: 'linear-gradient(155deg,#0d0d1a,#1a0d2e)', border: '1px solid rgba(155,122,224,.25)', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⚡</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Science Sprint</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>50 questions this week</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.2)', padding: '3px 9px', borderRadius: 999 }}>3d left</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: `linear-gradient(90deg,#9b7ae0,${BLUE})`, borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 5 }}>30/50 · 20 more to claim 500 XP</p>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div>
              <EyeBrow color={GOLD}>Community</EyeBrow>
              <h2 className="section-h2" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.0, color: t.prim, marginBottom: 18 }}>Stay motivated with healthy competition.</h2>
              <p style={{ fontSize: 16, color: t.sec, lineHeight: 1.7, marginBottom: 32 }}>Some students study harder when their classmates are watching. We make that work for you — with weekly leaderboards, streaks, and challenges.</p>
              {[
                { icon: '🏆', c: GOLD,    title: 'Weekly class leaderboard', desc: 'Ranked by improvement — not just raw score. Improve fast, climb fast.' },
                { icon: '🔥', c: ORANGE,  title: 'Daily streaks',            desc: 'Practice every day. Longer streaks earn more XP.' },
                { icon: '🎁', c: '#4ade80', title: 'Monthly challenges',     desc: 'Platform-wide science sprints. Top performers win prizes.' },
              ].map(({ icon, c, title, desc }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c}18`, border: `1px solid ${c}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: t.prim, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 13, color: t.sec, lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Schools ── */}
      <section id="schools" style={{ ...sec(dark ? '#071B49' : '#f0f4ff'), position: 'relative' }}>
        <div style={wrap}>
          <div className="school-grid two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 999, padding: '5px 13px', marginBottom: 20 }}>
                <span>🏫</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>For Schools · Partner Programme</span>
              </div>
              <h2 className="section-h2" style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-.035em', lineHeight: 1.0, color: t.prim, marginBottom: 18 }}>Know exactly which topics your students struggle with.</h2>
              <p style={{ fontSize: 16, color: t.sec, lineHeight: 1.7, marginBottom: 32 }}>As your students practise, ExamPrep shows you topic mastery in real time — so you always know what to teach next, before the exam reveals the gaps.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <PressBtn href="/school/signup">Get started free →</PressBtn>
                <PressBtn href="mailto:schools@examprep.ng" ghost>Book a demo</PressBtn>
              </div>
              <p style={{ fontSize: 12, color: t.tert }}>Free to start · No setup fees · 5-minute onboarding</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '📊', c: '#9b7ae0', title: 'Topic mastery data',  desc: 'Class-wide mastery per subject, drilled to every topic. Weakest first, always.' },
                { icon: '🚨', c: '#f87171', title: 'At-risk alerts',       desc: 'Know which students have gone inactive or are scoring low before it\'s too late.' },
                { icon: '📈', c: CYAN,      title: 'Weekly trends',        desc: 'Track improvement week by week. PDF exports included.' },
                { icon: '📧', c: GOLD,      title: 'Parent reports',       desc: 'Automated weekly emails to parents. Set once, runs automatically.' },
              ].map(({ icon, c, title, desc }) => (
                <div key={title} style={{ padding: 20, borderRadius: 16, background: t.card, border: `1px solid ${t.border}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c}18`, border: `1px solid ${c}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: t.prim, marginBottom: 6, letterSpacing: '-.01em' }}>{title}</h3>
                  <p style={{ fontSize: 13, color: t.sec, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={sec(t.bg)}>
        <div style={{ ...wrap, maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <EyeBrow color={CYAN}>Questions</EyeBrow>
            <h2 className="section-h2" style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.035em', color: t.prim }}>Frequently asked</h2>
          </div>
          <FAQ dark={dark} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ ...sec('#062A78', { position: 'relative', overflow: 'hidden', textAlign: 'center', background: `linear-gradient(160deg,#062A78 0%,#0a0c14 70%)` }) }}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: '#fff', width: Math.random() * 1.8 + 0.5, height: Math.random() * 1.8 + 0.5, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: .1, animation: `float ${2 + Math.random() * 3}s ${Math.random() * 4}s ease-in-out infinite`, pointerEvents: 'none' }} />
        ))}
        <div style={{ ...wrap, position: 'relative', zIndex: 1, maxWidth: 600 }}>
          <h2 className="cta-h2" style={{ fontSize: 52, fontWeight: 900, lineHeight: .97, letterSpacing: '-.04em', marginBottom: 18, color: '#fff' }}>
            Every day you delay is{' '}
            <span style={{ color: GOLD }}>one day less to improve.</span>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', marginBottom: 40, lineHeight: 1.65 }}>
            Your exam is closer than you think.<br/>Take the free diagnostic. Get your study plan. Start today.
          </p>
          <PressBtn href="/onboarding" gold style={{ fontSize: 17, padding: '16px 40px' }}>Start your Quick 5 →</PressBtn>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', marginTop: 18 }}>
            Free · 2 minutes · No credit card ·{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,.45)', textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#050710', borderTop: '1px solid rgba(255,255,255,.06)', padding: '52px 0 28px' }}>
        <div style={wrap}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
            <div>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 14 }}>
                <LogoMark size={28} />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>Exam<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.35)' }}>Prep</span></span>
              </Link>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', lineHeight: 1.65, maxWidth: 240 }}>The exam prep platform built for Nigerian secondary school students. WAEC and JAMB, all subjects.</p>
            </div>
            {[
              { label: 'Students', links: [['Free diagnostic','/onboarding'],['How it works','#how'],['Sign in','/login']] },
              { label: 'Schools',  links: [['Get started','/school/signup'],['Book a demo','mailto:schools@examprep.ng'],['School login','/login']] },
              { label: 'Legal',    links: [['Privacy policy','#'],['Terms of service','#'],['Support','#']] },
            ].map(col => (
              <div key={col.label}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,.22)', marginBottom: 14 }}>{col.label}</p>
                {col.links.map(([l, href]) => <Link key={l} href={href} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,.38)', marginBottom: 10, textDecoration: 'none' }}>{l}</Link>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>© 2025 EXL Exam Prep · For Nigerian secondary school students</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>Lagos, Nigeria</p>
          </div>
        </div>
      </footer>
    </div>
  )
}