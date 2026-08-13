'use client'
// src/app/page.js — Landing Page v5
// No eyebrows. New copy from brief. Student/School toggle.
// Mobile: copy first, visual second. Clean nav on mobile.

import Link from 'next/link'
import { useState, useEffect } from 'react'

const BLUE   = '#1264E5'
const CYAN   = '#18B7F2'
const GOLD   = '#FFB800'
const ORANGE = '#FF6A00'
const GREEN  = '#4ade80'

// ── Dark mode ─────────────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(true)
  useEffect(() => {
    const stored = localStorage.getItem('ep-theme')
    setDark(stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])
  const toggle = () => setDark(d => { localStorage.setItem('ep-theme', !d ? 'dark' : 'light'); return !d })
  return [dark, toggle]
}

// ── PWA install ───────────────────────────────────────────────────────────────
function usePWA() {
  const [prompt, setPrompt] = useState(null)
  useEffect(() => {
    const handler = e => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  const install = () => {
    if (prompt) { prompt.prompt(); prompt.userChoice.then(() => setPrompt(null)) }
    else window.location.href = '/onboarding'
  }
  return install
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 30 }) {
  return (
    <img
      src="/images/examprep_logo.png"
      alt="ExamPrep A1"
      width={size} height={size}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

// ── Press button ──────────────────────────────────────────────────────────────
function Btn({ href, onClick, children, gold, ghost, sm, style = {} }) {
  const [p, setP] = useState(false)
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    fontWeight: 900, letterSpacing: '-.015em', borderRadius: 14,
    padding: sm ? '9px 18px' : '14px 28px',
    fontSize: sm ? 13 : 15,
    transform: p ? 'translateY(3px)' : 'none',
    transition: 'transform .1s, box-shadow .1s',
    position: 'relative', overflow: 'hidden',
    ...(gold
      ? { background: `linear-gradient(135deg,${GOLD},${ORANGE})`, color: '#fff', boxShadow: p ? '0 2px 0 #b85000' : '0 5px 0 #b85000, 0 8px 20px rgba(255,106,0,.28)' }
      : ghost
      ? { background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)', boxShadow: 'none' }
      : { background: BLUE, color: '#fff', boxShadow: p ? '0 2px 0 #0a3fa0' : '0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.3)' }),
    ...style,
  }
  const ev = {
    onMouseDown: () => setP(true), onMouseUp: () => setP(false),
    onMouseLeave: () => setP(false), onTouchStart: () => setP(true), onTouchEnd: () => setP(false),
  }
  if (href) return <Link href={href} style={base} {...ev}>{children}</Link>
  return <button style={base} onClick={onClick} {...ev}>{children}</button>
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Is ExamPrep free?',             a: 'Yes — the diagnostic, study plan, and core practice are completely free.' },
  { q: 'Which exams does it cover?',    a: 'WAEC and JAMB. Every question is tagged by exam, year, topic, and difficulty.' },
  { q: 'How does the diagnostic work?', a: 'You answer 5–10 questions per subject. The system identifies your weak topics and builds a personalised study plan in under 2 minutes.' },
  { q: 'Does it work on phones?',       a: 'Yes. ExamPrep is designed mobile-first. Install it from your browser — no app store needed.' },
  { q: 'Will it improve my score?',     a: 'Students who practise daily for 4+ weeks typically see 15–30% improvement in mastery scores.' },
  { q: 'How do schools connect?',       a: 'Teachers create a cohort and share a 6-letter invite code. Students enter it and are instantly linked to the class dashboard.' },
]
function FAQ({ border, prim, sec, card }) {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FAQS.map((item, i) => (
        <div key={i} style={{ background: card, border: `1px solid ${open === i ? CYAN + '40' : border}`, borderRadius: 14, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12, fontFamily: 'inherit' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: prim }}>{item.q}</span>
            <span style={{ fontSize: 20, color: CYAN, flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s', lineHeight: 1 }}>+</span>
          </button>
          {open === i && <div style={{ padding: '0 20px 16px' }}><p style={{ fontSize: 13, color: sec, lineHeight: 1.7 }}>{item.a}</p></div>}
        </div>
      ))}
    </div>
  )
}

// ── Zara mascot ───────────────────────────────────────────────────────────────
function ZaraHero() {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse at center,rgba(18,100,229,.22) 0%,transparent 68%)', pointerEvents: 'none' }} />
      {/* Floating badges */}
      {[
        { top: '12%', left: -18, emoji: '🔥', title: '7-day streak!',  sub: '✦ 1,820 XP total',   delay: '.3s' },
        { top: '34%', right: -22, emoji: '📈', title: 'Physics: 72%',   sub: 'Up from 41% last week', delay: '.5s' },
        { bottom: '10%', left: -8, emoji: '🏆', title: '#1 in class',   sub: 'Weekly leaderboard', delay: '.7s' },
      ].map((b, i) => (
        <div key={i} style={{ position: 'absolute', top: b.top, bottom: b.bottom, left: b.left, right: b.right, background: 'rgba(6,10,20,.92)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 28px rgba(0,0,0,.45)', zIndex: 3, animation: `pop .5s ${b.delay} ease both` }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{b.emoji}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{b.title}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{b.sub}</div>
          </div>
        </div>
      ))}
      <img
        src="/images/zara_studybuddy.png"
        alt="Zara — ExamPrep Study Buddy"
        style={{ width: 460, maxWidth: '100%', display: 'block', position: 'relative', zIndex: 2, animation: 'zaraFloat 5s ease-in-out infinite', transformOrigin: 'bottom center', filter: 'drop-shadow(0 32px 64px rgba(0,0,0,.5))' }}
      />
    </div>
  )
}

// ── Subject mastery visual ────────────────────────────────────────────────────
function MasteryVisual({ border }) {
  const subjects = [
    { icon: '📐', name: 'Mathematics', pct: 74, color: CYAN },
    { icon: '⚗️', name: 'Chemistry',   pct: 68, color: '#9b7ae0' },
    { icon: '⚡', name: 'Physics',     pct: 81, color: GREEN },
  ]
  const weak = ['⚡ Quadratic Equations', '⚡ Chemical Bonding', '⚡ Waves & Sound']
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${border}`, borderRadius: 20, padding: 24 }}>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)', marginBottom: 14 }}>Your subjects</p>
      {subjects.map(s => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: `1px solid ${border}`, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{s.icon}</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.name}</span>
          <div style={{ width: 120, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${s.pct}%`, borderRadius: 999, background: s.color }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 900, color: s.color, minWidth: 38, textAlign: 'right' }}>{s.pct}%</span>
        </div>
      ))}
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '18px 0' }} />
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)', marginBottom: 10 }}>Topics to work on</p>
      {weak.map(w => (
        <div key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', fontSize: 13, fontWeight: 700, color: '#f87171', margin: '0 0 6px', display: 'block' }}>{w}</div>
      ))}
    </div>
  )
}

// ── Q card visual ─────────────────────────────────────────────────────────────
function QCardVisual({ border }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${border}`, borderRadius: 22, padding: 20 }}>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: BLUE, background: 'rgba(18,100,229,.1)', border: '1px solid rgba(18,100,229,.2)', padding: '3px 9px', borderRadius: 6, display: 'inline-block', marginBottom: 14 }}>Physics · WAEC 2023</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.55, marginBottom: 18 }}>A wave has a frequency of 50 Hz and a wavelength of 2 m. What is its velocity?</p>
      {[
        { l: 'A', t: '100 m/s', s: 'correct' },
        { l: 'B', t: '25 m/s',  s: 'wrong' },
        { l: 'C', t: '50 m/s' },
      ].map(o => (
        <div key={o.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 11, border: `1.5px solid ${o.s === 'correct' ? '#34d399' : o.s === 'wrong' ? '#f87171' : border}`, background: o.s === 'correct' ? 'rgba(52,211,153,.08)' : o.s === 'wrong' ? 'rgba(248,113,113,.07)' : 'rgba(255,255,255,.03)', marginBottom: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: o.s ? '#fff' : 'rgba(255,255,255,.4)', background: o.s === 'correct' ? '#22c55e' : o.s === 'wrong' ? '#ef4444' : 'rgba(255,255,255,.08)' }}>
            {o.s === 'correct' ? '✓' : o.s === 'wrong' ? '✗' : o.l}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: o.s === 'correct' ? '#16a34a' : o.s === 'wrong' ? '#dc2626' : 'rgba(255,255,255,.5)' }}>{o.t}</span>
        </div>
      ))}
      <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 13, background: 'rgba(24,183,242,.07)', border: '1px solid rgba(24,183,242,.18)' }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: CYAN, marginBottom: 6 }}>💡 Explanation</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.65 }}>Velocity = frequency × wavelength = 50 × 2 = 100 m/s. The wave equation v = fλ connects all three values.</p>
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
        <div style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: BLUE, textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Next question →</div>
      </div>
    </div>
  )
}

// ── Interactive learn visual ───────────────────────────────────────────────────
function LearnVisual({ border }) {
  return (
    <div style={{ borderRadius: 22, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
      <div style={{ padding: '13px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        {['#ef4444','#FFB800','#4ade80'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', marginLeft: 8 }}>Chemical Bonding — Interactive</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ overflow: 'visible' }}>
            <circle cx="90" cy="90" r="18" fill="rgba(18,100,229,.3)" stroke={BLUE} strokeWidth="1.5"/>
            <text x="90" y="95" textAnchor="middle" fontSize="10" fontWeight="800" fill={CYAN}>Na</text>
            <circle cx="90" cy="90" r="40" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" strokeDasharray="4 3"/>
            <circle cx="90" cy="50" r="6" fill={GOLD}/><circle cx="122" cy="68" r="6" fill={GOLD}/>
            <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" strokeDasharray="4 3"/>
            <circle cx="90" cy="18" r="6" fill={CYAN}/><circle cx="154" cy="54" r="6" fill={CYAN}/>
            <circle cx="158" cy="126" r="6" fill={CYAN}/><circle cx="90" cy="162" r="6" fill={CYAN}/>
            <circle cx="26" cy="126" r="6" fill={CYAN}/><circle cx="22" cy="54" r="6" fill={CYAN}/>
            <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="1" strokeDasharray="4 3"/>
            <circle cx="90" cy="10" r="7" fill="rgba(255,106,0,.8)" stroke={ORANGE} strokeWidth="1.5"/>
            <text x="90" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">1e⁻</text>
          </svg>
        </div>
        <div style={{ background: 'rgba(18,100,229,.07)', border: '1px solid rgba(18,100,229,.18)', borderRadius: 12, padding: '11px 13px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>Sodium has <strong style={{ color: CYAN }}>1 valence electron</strong>. It loses this to form Na⁺ — a stable ionic bond with Chlorine.</p>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: `1px solid ${border}`, color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Previous</button>
          <button style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: BLUE, border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Next step →</button>
        </div>
      </div>
    </div>
  )
}

// ── Mastery card visual ───────────────────────────────────────────────────────
function MasteryCard({ border }) {
  const rows = [
    { topic: 'Waves & Sound',          pct: 72, color: GREEN },
    { topic: 'Electromagnetic Fields', pct: 58, color: GOLD },
    { topic: 'Circular Motion',        pct: 41, color: '#f87171' },
    { topic: "Newton's Laws",          pct: 83, color: GREEN },
    { topic: 'Thermodynamics',         pct: 29, color: '#f87171' },
  ]
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Physics — Topic mastery</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.2)', padding: '3px 8px', borderRadius: 6 }}>+8% this week</span>
      </div>
      {rows.map(r => (
        <div key={r.topic} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>{r.topic}</span>
          <div style={{ width: 100, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: r.color, minWidth: 34, textAlign: 'right' }}>{r.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Q5 card visual ────────────────────────────────────────────────────────────
function Q5Card() {
  return (
    <div style={{ borderRadius: 22, background: 'linear-gradient(148deg,#062A78 0%,#0c3080 50%,#1264E5 100%)', border: '1.5px solid rgba(24,183,242,.25)', padding: 28, animation: 'glow 4s ease-in-out infinite', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ filter: `drop-shadow(0 0 10px ${BLUE}66)` }}>
            <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8"/>
            <circle cx="44" cy="44" r="36" fill="none" stroke={BLUE} strokeWidth="8" strokeLinecap="round" strokeDasharray="135 226" transform="rotate(-90 44 44)"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>3</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>/5</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Quick 5</span>
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: GOLD }}>+50 XP</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>Physics · Waves & Sound · ~4 min</p>
          <Btn href="/onboarding" style={{ width: '100%', fontSize: 13, padding: '12px 0', justifyContent: 'center' }}>Start today's quest →</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,.09)', alignItems: 'center' }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => {
          const done = i === 0, today = i === 1
          return (
            <div key={d} style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: today ? BLUE : done ? 'rgba(24,183,242,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${today ? BLUE : done ? 'rgba(24,183,242,.3)' : 'rgba(255,255,255,.08)'}`, color: today ? '#fff' : done ? CYAN : 'rgba(255,255,255,.2)' }}>
              {today ? '●' : done ? '✓' : d[0]}
            </div>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ animation: 'flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: ORANGE }}>7 days</span>
        </div>
      </div>
    </div>
  )
}

// ── Leaderboard visual ────────────────────────────────────────────────────────
function LeaderboardVisual({ border }) {
  return (
    <div style={{ borderRadius: 22, overflow: 'hidden', background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
      <div style={{ background: 'linear-gradient(155deg,#062A78 0%,#1264E5 100%)', padding: '20px 20px 0' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>This week · SS3 Science A</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 0 }}>
          {[
            { n: 'Amaka', p: '1,856 XP', h: 44, bg: 'linear-gradient(135deg,#0ea5e9,#818cf8)', medal: '🥈', fs: 14, w: 40 },
            { n: 'Temi',  p: '2,340 XP', h: 68, bg: `linear-gradient(135deg,${CYAN},${BLUE})`,  medal: '🥇', fs: 18, w: 50, crown: true, me: true },
            { n: 'Chidi', p: '1,620 XP', h: 34, bg: 'linear-gradient(135deg,#4ade80,#22c55e)', medal: '🥉', fs: 13, w: 38 },
          ].map((person, i) => (
            <div key={person.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, order: i === 1 ? -1 : i }}>
              {person.crown && <svg width="22" height="15" viewBox="0 0 24 18" fill="none" style={{ marginBottom: 3 }}><path d="M2 14L5 5L10 10L12 3L14 10L19 5L22 14H2Z" fill={GOLD} stroke={ORANGE} strokeWidth="1" strokeLinejoin="round"/><rect x="2" y="14" width="20" height="3" rx="1.5" fill={ORANGE}/></svg>}
              {!person.crown && <div style={{ height: 18 }} />}
              <div style={{ width: person.w, height: person.w, borderRadius: '50%', background: person.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: person.fs, fontWeight: 900, color: '#fff', border: person.me ? '2px solid rgba(24,183,242,.5)' : 'none' }}>{person.n[0]}</div>
              <p style={{ fontSize: person.me ? 11 : 10, fontWeight: person.me ? 900 : 700, color: person.me ? CYAN : '#fff' }}>{person.n}</p>
              <p style={{ fontSize: 9, color: person.me ? GOLD : 'rgba(255,255,255,.4)', fontWeight: person.me ? 800 : 400 }}>{person.p}</p>
              <div style={{ width: '100%', height: person.h, background: person.me ? 'rgba(255,184,0,.1)' : 'rgba(255,255,255,.07)', borderRadius: '5px 5px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6, fontSize: person.me ? 20 : 14 }}>{person.medal}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[{ rank: '4', n: 'Ola', p: '1,245 XP' }, { rank: '—', n: 'You', p: '890 XP', me: true }].map(r => (
          <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11, background: r.me ? 'rgba(18,100,229,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${r.me ? 'rgba(18,100,229,.2)' : border}` }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: r.me ? CYAN : 'rgba(255,255,255,.3)', minWidth: 16, textAlign: 'center' }}>{r.rank}</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.me ? `linear-gradient(135deg,${CYAN},${BLUE})` : 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: r.me ? '#fff' : 'rgba(255,255,255,.6)' }}>{r.n[0]}</div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: r.me ? 800 : 500, color: r.me ? CYAN : '#fff' }}>{r.n}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.me ? GOLD : 'rgba(255,255,255,.4)' }}>{r.p}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ background: 'linear-gradient(155deg,#0d0d1a,#1a0d2e)', border: '1px solid rgba(155,122,224,.25)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,184,0,.12)', border: '1px solid rgba(255,184,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Science Sprint</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>50 questions this week</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, background: 'rgba(255,184,0,.1)', border: '1px solid rgba(255,184,0,.2)', padding: '3px 9px', borderRadius: 999 }}>3d left</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: `linear-gradient(90deg,#9b7ae0,${BLUE})`, borderRadius: 99 }} />
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 5 }}>30 / 50 questions</p>
        </div>
      </div>
    </div>
  )
}

// ── School dashboard visual ───────────────────────────────────────────────────
function SchoolDashVisual({ border }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${border}`, borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg,#062A78 0%,#0f3a90 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><p style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>SS3 Science A</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>34 students · Week 12</p></div>
        <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', padding: '3px 10px', borderRadius: 999 }}>Live</span>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px', borderBottom: `1px solid ${border}` }}>
        {[{ v: '71%', l: 'Class avg', c: GREEN }, { v: '28', l: 'Active', c: CYAN }, { v: '6', l: 'At risk', c: '#f87171' }].map(s => (
          <div key={s.l} style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: `1px solid ${border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1, marginBottom: 3 }}>{s.v}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 20px 6px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)' }}>Subject mastery</div>
      {[{ n: 'Chemistry', pct: 61, c: '#f87171' }, { n: 'Physics', pct: 74, c: GOLD }, { n: 'Biology', pct: 79, c: GREEN }].map(r => (
        <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${border}` }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.n}</span>
          <div style={{ width: 80, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden', flexShrink: 0 }}><div style={{ height: '100%', width: `${r.pct}%`, background: r.c, borderRadius: 999 }} /></div>
          <span style={{ fontSize: 11, fontWeight: 800, color: r.c, minWidth: 32, textAlign: 'right' }}>{r.pct}%</span>
        </div>
      ))}
      <div style={{ padding: '14px 20px 6px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)' }}>Topics needing attention</div>
      {[{ n: 'Chemical Bonding', pct: 43 }, { n: 'Waves & Sound', pct: 51 }, { n: 'Organic Chemistry', pct: 48 }].map(r => (
        <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${border}` }}>
          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>{r.n}</span>
          <div style={{ width: 80, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden', flexShrink: 0 }}><div style={{ height: '100%', width: `${r.pct}%`, background: '#f87171', borderRadius: 999 }} /></div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', minWidth: 32, textAlign: 'right' }}>{r.pct}%</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: 'rgba(248,113,113,.06)', borderTop: '1px solid rgba(248,113,113,.15)' }}>
        <span style={{ fontSize: 14 }}>🚨</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}><strong style={{ color: '#f87171' }}>Chemical Bonding</strong> needs attention — 43% class average</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [dark, toggleDark] = useDark()
  const [view, setView] = useState('students') // 'students' | 'schools'
  const [isMobile, setIsMobile] = useState(false)
  const installPWA = usePWA()
  const [iosModal, setIosModal] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 920)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const border  = 'rgba(255,255,255,.08)'
  const sec_bg  = '#071B49'
  const wrap    = { maxWidth: 1120, margin: '0 auto', padding: '0 28px' }
  const section = (bg, extra = {}) => ({ background: bg, padding: '104px 0', position: 'relative', ...extra })
  const two     = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 64, alignItems: 'center' }
  const h2style = { fontSize: isMobile ? 32 : 44, fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.0, color: '#fff' }
  const subStyle = { fontSize: 17, color: 'rgba(255,255,255,.52)', lineHeight: 1.72, marginTop: 14 }
  const soloLine = (color = GOLD) => ({ fontSize: isMobile ? 17 : 20, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginTop: 24, borderLeft: `3px solid ${color}`, paddingLeft: 16 })

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
    @keyframes flame { 0%,100% { transform: scaleY(1) skewX(0) } 40% { transform: scaleY(1.08) skewX(-2deg) } }
    @keyframes zaraFloat { 0%,100% { transform: translateY(0) rotate(-1deg) } 50% { transform: translateY(-12px) rotate(1deg) } }
    @keyframes pop { 0% { transform: scale(.8); opacity: 0 } 70% { transform: scale(1.04) } 100% { transform: scale(1); opacity: 1 } }
    @keyframes glow { 0%,100% { box-shadow: 0 0 24px rgba(18,100,229,.2) } 50% { box-shadow: 0 0 48px rgba(18,100,229,.45) } }
    @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  `

  return (
    <div style={{ background: '#08090f', color: '#fff', minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ── iOS install modal ── */}
      {iosModal && (
        <div onClick={() => setIosModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d1120', border: '1px solid rgba(255,255,255,.1)', borderRadius: '24px 24px 0 0', padding: '28px 24px', width: '100%', maxWidth: 480, margin: '0 auto' }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Add to iPhone Home Screen</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 20 }}>Open ExamPrep in Safari, then:</p>
            {['Tap the Share button at the bottom of Safari','Scroll and tap Add to Home Screen','Tap Add — ExamPrep opens like an app'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 13, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', marginBottom: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }} dangerouslySetInnerHTML={{ __html: step.replace(/Add to Home Screen|Add|Share/g, m => `<strong style="color:#fff">${m}</strong>`) }} />
              </div>
            ))}
            <button onClick={() => setIosModal(false)} style={{ width: '100%', marginTop: 10, padding: 14, borderRadius: 13, fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── Audience bar ── */}
      <div style={{ background: 'rgba(5,7,15,.96)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '7px 0', textAlign: 'center', position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ background: 'rgba(255,255,255,.06)', padding: 4, borderRadius: 999, display: 'inline-flex', gap: 2 }}>
          {['students','schools'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 22px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', background: view === v ? BLUE : 'transparent', color: view === v ? '#fff' : 'rgba(255,255,255,.4)', boxShadow: view === v ? '0 2px 10px rgba(18,100,229,.4)' : 'none' }}>
              {v === 'students' ? 'For Students' : 'For Schools'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 39, zIndex: 100, height: 60, borderBottom: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(5,7,15,.9)', display: 'flex', alignItems: 'center' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <LogoMark size={33} />
            <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>Exam<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.35)' }}>Prep</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isMobile ? (
              /* Mobile: For Schools + Install only */
              <>
                <button onClick={() => setView(view === 'students' ? 'schools' : 'students')} style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {view === 'students' ? 'For Schools' : 'For Students'}
                </button>
                <Btn onClick={installPWA} sm style={{ padding: '8px 14px', fontSize: 12 }}>📲 Install</Btn>
              </>
            ) : (
              /* Desktop: full nav */
              <>
                <button onClick={() => setView('students')} style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: view === 'students' ? '#fff' : 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>For Students</button>
                <button onClick={() => setView('schools')} style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: view === 'schools' ? '#fff' : 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>For Schools</button>
                <Link href="/login" style={{ padding: '7px 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', textDecoration: 'none' }}>Sign in</Link>
                <Btn onClick={installPWA} sm style={{ marginLeft: 4 }}>📲 Install</Btn>
                <Btn href="/onboarding" sm style={{ marginLeft: 4, background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.15)', color: 'rgba(255,255,255,.8)', boxShadow: 'none' }}>Start free →</Btn>
                <button onClick={toggleDark} style={{ marginLeft: 6, width: 34, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }} aria-label="Toggle dark mode">
                  {dark ? '☀️' : '🌙'}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>


      {/* ════════════════ STUDENT VIEW ════════════════ */}
      {view === 'students' && (
        <>
          {/* ── Hero ── */}
          <section style={{ ...section('#08090f', { background: `radial-gradient(ellipse 70% 50% at 65% 10%,rgba(18,100,229,.16) 0%,transparent 60%), radial-gradient(ellipse 40% 40% at 10% 85%,rgba(24,183,242,.09) 0%,transparent 55%), #08090f`, paddingTop: 72, paddingBottom: 0, overflow: 'hidden' }) }}>
            <div style={wrap}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 40, alignItems: 'flex-end', minHeight: isMobile ? 'auto' : 'calc(100vh - 99px)' }}>
                <div style={{ paddingBottom: isMobile ? 40 : 80 }}>
                  <h1 style={{ fontSize: isMobile ? 38 : 62, fontWeight: 900, lineHeight: .95, letterSpacing: '-.045em', color: '#fff', marginBottom: 22 }}>
                    Preparing for<br/>
                    WAEC &amp; JAMB?<br/>
                    <span style={{ background: `linear-gradient(135deg,${CYAN} 0%,${BLUE} 60%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>We've got you.</span>
                  </h1>
                  <p style={{ fontSize: 18, color: 'rgba(255,255,255,.58)', lineHeight: 1.72, marginBottom: 32, maxWidth: 480 }}>
                    Practice as little as 5 questions a day. Find your weak topics. Build mastery over time.
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, flexDirection: isMobile ? 'column' : 'row' }}>
                    <Btn onClick={installPWA} gold style={{ fontSize: 16, padding: '16px 32px', ...(isMobile ? { justifyContent: 'center' } : {}) }}>📲 Install ExamPrep</Btn>
                    <Btn href="/onboarding" ghost style={{ ...(isMobile ? { justifyContent: 'center' } : {}) }}>Start your Quick 5 →</Btn>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['⚗️ Chemistry','⚡ Physics','🧬 Biology','📐 Mathematics','📖 English','📊 Economics','+9 more'].map(s => (
                      <span key={s} style={{ padding: '4px 11px', borderRadius: 999, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                {!isMobile && <ZaraHero />}
              </div>
            </div>
          </section>

          {/* ── Know what topic ── */}
          <section style={section(sec_bg)}>
            <div style={wrap}>
              <div style={two}>
                <div>
                  <h2 style={h2style}>Know what topic to read next.</h2>
                  <p style={subStyle}>You don't have to spend your time wondering where to start.<br/><br/>ExamPrep shows you how you're doing across your subjects and topics — so you can focus on the areas that need your attention and keep building on the ones you're getting better at.</p>
                  <p style={soloLine()}>Your progress tells you what comes next.</p>
                </div>
                <MasteryVisual border={border} />
              </div>
            </div>
          </section>

          {/* ── Install strip ── */}
          <div style={{ background: 'rgba(18,100,229,.07)', borderTop: '1px solid rgba(18,100,229,.18)', borderBottom: '1px solid rgba(18,100,229,.18)', padding: '40px 0' }}>
            <div style={wrap}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.025em', marginBottom: 6 }}>Download ExamPrep.</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)' }}>Works on any device — install from your browser, no app store needed.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
                  {[
                    { icon: '💻', label: 'Install on', name: 'Desktop / Laptop', action: installPWA },
                    { icon: '📱', label: 'Install on', name: 'Android',           action: installPWA },
                    { icon: '🍎', label: 'Add to home on', name: 'iPhone / iPad', action: () => setIosModal(true) },
                  ].map(b => (
                    <div key={b.name} onClick={b.action} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)', cursor: 'pointer', ...(isMobile ? { width: '100%' } : {}) }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{b.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 1 }}>{b.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Practice + Explanations ── */}
          <section id="how" style={section('#08090f')}>
            <div style={wrap}>
              <div style={two}>
                <div>
                  <h2 style={h2style}>Easy to understand explanations.</h2>
                  <p style={subStyle}>Practise with questions. See where you went wrong. Get clear explanations — then use what you've learned on the next question.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                    {['Practice', 'Understand', 'Improve'].map((s, i, arr) => (
                      <>
                        <div key={s} style={{ fontSize: 13, fontWeight: 800, color: '#fff', padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>{s}</div>
                        {i < arr.length - 1 && <span key={s+'a'} style={{ fontSize: 16, color: 'rgba(255,255,255,.25)' }}>→</span>}
                      </>
                    ))}
                  </div>
                </div>
                <QCardVisual border={border} />
              </div>
            </div>
          </section>

          {/* ── Interactive learning ── */}
          <section style={section(sec_bg)}>
            <div style={wrap}>
              <div style={two}>
                {!isMobile && <LearnVisual border={border} />}
                <div>
                  <h2 style={h2style}>Learn by doing.</h2>
                  <p style={subStyle}>When a topic needs more than a question and an explanation, ExamPrep lets you learn by doing.<br/><br/>Interact with concepts. Work through problems step by step. Build understanding instead of just reading about it.</p>
                  <p style={soloLine(GREEN)}>Some things are easier to learn when you can do them.</p>
                </div>
                {isMobile && <LearnVisual border={border} />}
              </div>
            </div>
          </section>

          {/* ── Build mastery ── */}
          <section style={section('#08090f')}>
            <div style={wrap}>
              <div style={two}>
                <div>
                  <h2 style={h2style}>Build mastery over time.</h2>
                  <p style={subStyle}>Getting one question right doesn't mean you've mastered a topic. Getting one wrong doesn't mean you're bad at it.<br/><br/>Keep practising. ExamPrep tracks your progress across topics so you can see where you're improving, what still needs work, and how your mastery grows over time.</p>
                  <p style={soloLine()}>Mastery over perfection.</p>
                </div>
                <MasteryCard border={border} />
              </div>
            </div>
          </section>

          {/* ── Quick 5 ── */}
          <section style={section(sec_bg, { padding: '72px 0' })}>
            <div style={wrap}>
              <div style={two}>
                <Q5Card />
                <div>
                  <h2 style={h2style}>Make practice your daily habit.</h2>
                  <p style={subStyle}>You don't need a three-hour study session every time you open ExamPrep.<br/><br/>Start with 5 questions. Do another Quick 5 tomorrow. Keep going when you have more time. Come back when you don't.</p>
                  <p style={soloLine(ORANGE)}>Small practice adds up.</p>
                  <div style={{ marginTop: 32 }}>
                    <Btn href="/onboarding" gold style={{ fontSize: 15, padding: '15px 28px' }}>Start your Quick 5 →</Btn>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Community ── */}
          <section style={section('#08090f')}>
            <div style={wrap}>
              <div style={two}>
                {!isMobile && <LeaderboardVisual border={border} />}
                <div>
                  <h2 style={h2style}>Practice, learn, compete with friends.</h2>
                  <p style={subStyle}>Practise alongside your classmates. Keep your streak going. Take on challenges. See how you're improving and celebrate the progress together.</p>
                  <p style={soloLine()}>Practice together. Improve together.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
                    {[
                      { icon: '🏆', c: GOLD,    title: 'Weekly class leaderboard', desc: 'Ranked by practice — see yourself climb alongside your classmates.' },
                      { icon: '🔥', c: ORANGE,  title: 'Daily streaks',            desc: 'Every day you practise keeps the streak alive. Small habit, big results.' },
                      { icon: '⚡', c: GREEN,   title: 'Weekly challenges',        desc: 'Platform-wide science sprints. Top performers win prizes.' },
                    ].map(({ icon, c, title, desc }) => (
                      <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c}18`, border: `1px solid ${c}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{title}</p>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.55 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {isMobile && <LeaderboardVisual border={border} />}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section style={section(sec_bg)}>
            <div style={{ ...wrap, maxWidth: 760 }}>
              <h2 style={{ ...h2style, textAlign: 'center', marginBottom: 44 }}>Frequently asked</h2>
              <FAQ border={border} prim="#fff" sec="rgba(255,255,255,.55)" card="rgba(255,255,255,.04)" />
            </div>
          </section>

          {/* ── Final CTA ── */}
          <section style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '128px 0', background: 'linear-gradient(160deg,#062A78 0%,#08090f 65%)' }}>
            <div style={{ ...wrap, position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: isMobile ? 32 : 54, fontWeight: 900, lineHeight: .97, letterSpacing: '-.045em', marginBottom: 16, color: '#fff' }}>Practice. Learn.<br/>Improve. Repeat.</h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.48)', marginBottom: 40, lineHeight: 1.7 }}>Build mastery every day.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Btn onClick={installPWA} gold style={{ fontSize: 16, padding: '16px 32px' }}>📲 Install ExamPrep</Btn>
                <Btn href="/onboarding" ghost style={{ fontSize: 15, padding: '15px 28px' }}>Start your Quick 5 →</Btn>
              </div>
            </div>
          </section>
        </>
      )}


      {/* ════════════════ SCHOOL VIEW ════════════════ */}
      {view === 'schools' && (
        <>
          {/* ── School Hero ── */}
          <section style={{ ...section('#08090f', { background: `radial-gradient(ellipse 65% 55% at 30% 20%,rgba(74,222,128,.1) 0%,transparent 60%), radial-gradient(ellipse 40% 40% at 85% 70%,rgba(18,100,229,.1) 0%,transparent 55%), #08090f`, padding: '80px 0' }) }}>
            <div style={wrap}>
              <div style={two}>
                <div>
                  <h1 style={{ fontSize: isMobile ? 36 : 54, fontWeight: 900, lineHeight: .97, letterSpacing: '-.042em', marginBottom: 20, color: '#fff' }}>
                    Prepare<br/>
                    <span style={{ background: 'linear-gradient(135deg,#4ade80,#18B7F2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>exam-ready</span><br/>
                    students.
                  </h1>
                  <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, marginBottom: 30, maxWidth: 460 }}>
                    See student performance across subjects and topics, identify learning gaps early, and know what to focus on next.
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                    <Btn href="/school/signup" style={{ fontSize: 15, padding: '15px 28px', ...(isMobile ? { justifyContent: 'center' } : {}) }}>Get started →</Btn>
                    <Btn href="mailto:schools@examprep.ng" ghost style={{ ...(isMobile ? { justifyContent: 'center' } : {}) }}>Talk to our team →</Btn>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { icon: '📊', title: 'Topic mastery data',  desc: 'Cohort-wide mastery per subject, drilled to every topic. Weakest first, always.' },
                    { icon: '🚨', title: 'At-risk alerts',       desc: 'Know which students are scoring low before it becomes a problem.' },
                    { icon: '📈', title: 'Weekly trends',        desc: 'Track improvement across your class week by week. Exportable reports included.' },
                    { icon: '📧', title: 'Parent reports',       desc: 'Automated weekly emails to parents. Days studied, topics covered. Set once.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
                      <span style={{ fontSize: 22, marginBottom: 12, display: 'block' }}>{icon}</span>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-.01em' }}>{title}</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.42)', lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── See the gaps ── */}
          <section style={section(sec_bg)}>
            <div style={wrap}>
              <div style={two}>
                <div>
                  <h2 style={h2style}>See the gaps.<br/>Not just the scores.</h2>
                  <p style={subStyle}>An overall class score can tell you how students performed. Topic-level performance tells you <em style={{ color: '#fff', fontStyle: 'normal' }}>why.</em></p>
                  <p style={{ ...subStyle, marginTop: 16 }}>See which subjects and topics your students understand — and where they need more work.</p>
                  <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: '📊', c: GREEN,   title: 'Subject and topic breakdown', desc: 'Not just "Chemistry is weak." Exactly which topics inside Chemistry — and by how much.' },
                      { icon: '🔍', c: CYAN,    title: 'Real-time visibility',        desc: 'As students practise, the dashboard updates. No waiting for a test result.' },
                    ].map(({ icon, c, title, desc }) => (
                      <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
                        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${c}18`, border: `1px solid ${c}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
                        <div><p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-.01em' }}>{title}</p><p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>{desc}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
                <SchoolDashVisual border={border} />
              </div>
            </div>
          </section>

          {/* ── Give teachers a clearer picture ── */}
          <section style={section('#08090f')}>
            <div style={wrap}>
              <div style={two}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: '🎯', c: BLUE,    title: 'Know what to teach next.',     desc: 'Use student performance to focus revision and support where it\'s actually needed. Less guessing. Better teaching decisions.' },
                    { icon: '👤', c: '#f87171', title: 'Know who needs support.',    desc: 'See which students are struggling or falling behind. Turn data into earlier intervention.' },
                    { icon: '📅', c: GREEN,   title: 'See improvement over time.',   desc: 'Track how students and classes progress across subjects and topics. From learning gaps to measurable progress.' },
                  ].map(({ icon, c, title, desc }) => (
                    <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: `1px solid ${border}` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: `${c}18`, border: `1px solid ${c}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
                      <div><p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-.01em' }}>{title}</p><p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>{desc}</p></div>
                    </div>
                  ))}
                </div>
                <div>
                  <h2 style={h2style}>Give your teachers a clearer picture of learning gaps.</h2>
                  <p style={subStyle}>ExamPrep doesn't replace the teacher. It gives the teacher the information they need to teach better.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
                    {['Know what students understand','See where they\'re struggling','Know what to work on next'].map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>
                        <span style={{ color: GREEN, fontSize: 16 }}>✓</span>{s}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
                    <Btn href="/school/signup" style={{ fontSize: 15, padding: '14px 26px' }}>Get started →</Btn>
                    <Btn href="mailto:schools@examprep.ng" ghost>Talk to our team</Btn>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── School CTA ── */}
          <section style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '96px 0', background: 'linear-gradient(160deg,#062A78 0%,#08090f 70%)' }}>
            <div style={{ ...wrap, position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: isMobile ? 26 : 44, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.04em', marginBottom: 18, color: '#fff', maxWidth: 680, margin: '0 auto 18px' }}>
                Know exactly where your students need to improve long before the day of the examination.
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,.48)', marginBottom: 40, lineHeight: 1.7 }}>Help your students be confident and ready for the exam.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Btn href="/school/signup" style={{ fontSize: 16, padding: '16px 32px' }}>Get started →</Btn>
                <Btn href="mailto:schools@examprep.ng" ghost style={{ fontSize: 15, padding: '15px 28px' }}>Talk to our team →</Btn>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Footer ── */}
      <footer style={{ background: '#04060e', borderTop: '1px solid rgba(255,255,255,.05)', padding: '56px 0 28px' }}>
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2.2fr 1fr 1fr 1fr', gap: isMobile ? 28 : 48, marginBottom: 40 }}>
            <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 14 }}>
                <LogoMark size={30} />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>Exam<span style={{ fontWeight: 400, color: 'rgba(255,255,255,.35)' }}>Prep</span></span>
              </Link>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', lineHeight: 1.7, maxWidth: 240 }}>Exam preparation for Nigerian secondary school students. WAEC and JAMB, all subjects.</p>
            </div>
            {[
              { label: 'Students', links: [['Free diagnostic','/onboarding'],['How it works','#how'],['Sign in','/login']] },
              { label: 'Schools',  links: [['Get started','/school/signup'],['Book a demo','mailto:schools@examprep.ng'],['School login','/login']] },
              { label: 'Legal',    links: [['Privacy policy','#'],['Terms of service','#'],['Support','#']] },
            ].map(col => (
              <div key={col.label}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(255,255,255,.2)', marginBottom: 14 }}>{col.label}</p>
                {col.links.map(([l, href]) => <Link key={l} href={href} style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 10, textDecoration: 'none' }}>{l}</Link>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.18)' }}>© 2025 ExamPrep A1 · Built for Nigerian secondary school students</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.18)' }}>Lagos, Nigeria</p>
          </div>
        </div>
      </footer>
    </div>
  )
}