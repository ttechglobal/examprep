// src/app/page.js — Landing page v2
// ─────────────────────────────────────────────────────────────────────────────
// Design: student/school toggle above nav (uLesson pattern).
// Student view: game-like hero with illustrated phone mockup, tilted feature
//   cards, community section, social proof numbers.
// School view: data-first hero with dashboard illustration, insights messaging.
// Colour system: #0b1330 navy, #eceef8 lavender bg, #ff8fab coral,
//   #9b7ae0 purple, #34d399 emerald, #f59e0b gold.
// Aesthetic risk: feature cards rotate ±2° alternating — game-like energy
//   without being childish.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import Link from 'next/link'
import { useState } from 'react'

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  dim:     '#5a5f7a',
  faint:   '#9ca3c0',
  border:  '#e2e4f0',
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo({ size = 30 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: T.navy, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.4, fontWeight: 900,
        color: '#fff', boxShadow: `0 ${Math.round(size * 0.1)}px 0 ${T.navyD}`,
        letterSpacing: '-0.02em', flexShrink: 0,
      }}>E</div>
      <span style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
        Exam<span style={{ color: T.dim, fontWeight: 500 }}> Prep</span>
      </span>
    </div>
  )
}

// ── Navy 3D button ─────────────────────────────────────────────────────────────
function NavyBtn({ href, children, style = {} }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '13px 28px', borderRadius: 14,
      background: T.navy, color: '#fff',
      fontSize: 15, fontWeight: 800, textDecoration: 'none',
      boxShadow: `0 6px 0 ${T.navyD}, 0 8px 20px rgba(11,19,48,.18)`,
      letterSpacing: '-0.01em', transition: 'transform .1s, box-shadow .1s',
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 0 ${T.navyD}, 0 12px 28px rgba(11,19,48,.22)` }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${T.navyD}, 0 8px 20px rgba(11,19,48,.18)` }}
    >
      {children}
    </Link>
  )
}

function OutlineBtn({ href, children, style = {} }) {
  return (
    <Link href={href} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '13px 28px', borderRadius: 14,
      background: T.surface, color: T.text,
      fontSize: 15, fontWeight: 700, textDecoration: 'none',
      border: `2px solid ${T.border}`,
      letterSpacing: '-0.01em',
      ...style,
    }}>
      {children}
    </Link>
  )
}

// ── Phone mockup — illustrated practice session UI ────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 260, margin: '0 auto' }}>
      {/* Phone shell */}
      <div style={{
        width: 260, borderRadius: 36, background: T.navy,
        padding: '10px 8px 14px', boxShadow: `0 32px 64px rgba(11,19,48,.45), 0 0 0 1px rgba(255,255,255,.06)`,
      }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 14px 8px', opacity: .4 }}>
          <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>9:41</span>
          <span style={{ fontSize: 9, color: '#fff' }}>●●●</span>
        </div>
        {/* Screen */}
        <div style={{ borderRadius: 28, background: '#f5f6fa', overflow: 'hidden' }}>
          {/* HUD */}
          <div style={{ background: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: T.purple }}>Chemistry · Organic</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[{ v: '3/10', l: 'Qns' }, { v: '✦ 40', l: 'XP', c: T.gold }].map(p => (
                <div key={p.l} style={{ background: '#f0f1f7', borderRadius: 5, padding: '2px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: p.c ?? T.text }}>{p.v}</div>
                  <div style={{ fontSize: 6, color: T.faint, textTransform: 'uppercase' }}>{p.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question card */}
          <div style={{ padding: '10px 12px 0' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '10px 11px', borderLeft: `3px solid ${T.purple}`, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: T.purple, marginBottom: 5 }}>Q3 · WAEC 2022</div>
              <p style={{ fontSize: 10, fontWeight: 600, color: T.text, lineHeight: 1.45 }}>Which property is characteristic of alkanes?</p>
            </div>

            {/* Answer options */}
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

            {/* Bottom action bar */}
            <div style={{ marginTop: 8, background: '#fff', borderRadius: 10, padding: '7px 9px', display: 'flex', gap: 6, borderTop: '1px solid #f0f1f7' }}>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(52,211,153,.1)', border: '1.5px solid #34d399', textAlign: 'center', fontSize: 8, fontWeight: 800, color: T.emerald }}>Correct! ✓</div>
              <div style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(155,122,224,.1)', border: `1.5px solid ${T.purple}`, fontSize: 8, fontWeight: 800, color: T.purple }}>Why? 💡</div>
              <div style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: T.navy, textAlign: 'center', fontSize: 8, fontWeight: 800, color: '#fff' }}>Next →</div>
            </div>
          </div>

          {/* XP float */}
          <div style={{ padding: '6px 12px 10px', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: `${T.gold}20`, border: `1px solid ${T.gold}40`, borderRadius: 99, padding: '3px 10px', fontSize: 9, fontWeight: 800, color: T.gold }}>✦ +20 XP earned!</span>
          </div>
        </div>
      </div>

      {/* Floating subject chips — game UI decoration */}
      <div style={{ position: 'absolute', top: 60, left: -60, background: '#fff', borderRadius: 12, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>⚗️</span>
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: T.text }}>Chemistry</div>
          <div style={{ fontSize: 7, color: T.emerald, fontWeight: 700 }}>44% mastery</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 160, right: -55, background: '#fff', borderRadius: 12, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>🔥</span>
        <div>
          <div style={{ fontSize: 8, fontWeight: 800, color: T.text }}>12-day streak</div>
          <div style={{ fontSize: 7, color: T.gold, fontWeight: 700 }}>✦ 1,240 XP</div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 80, left: -50, background: '#fff', borderRadius: 12, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: T.text }}>#4 in class 🏆</span>
        </div>
        <div style={{ fontSize: 7, color: T.purple }}>out of 28 students</div>
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
      {/* Browser chrome */}
      <div style={{ background: '#1e2030', borderRadius: '16px 16px 0 0', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#2a2d42', borderRadius: 6, padding: '4px 10px', fontSize: 9, color: 'rgba(255,255,255,.4)', textAlign: 'center' }}>examprep.ng/school/dashboard</div>
      </div>
      {/* Dashboard */}
      <div style={{ background: '#f8f9fc', padding: '14px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 900, color: T.text }}>School Dashboard</p>
            <p style={{ fontSize: 9, color: T.faint }}>SS3 Science A · 28 students</p>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 700, color: '#059669' }}>🟢 Active</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
          {[{ v: '22', l: 'Active', c: '#ecfdf5', tc: '#059669' }, { v: '64%', l: 'Avg score', c: '#eff6ff', tc: '#3b82f6' }, { v: '6', l: 'At risk', c: '#fef2f2', tc: '#ef4444' }].map(s => (
            <div key={s.l} style={{ background: s.c, borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: s.tc }}>{s.v}</div>
              <div style={{ fontSize: 8, color: T.faint }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Subject mastery bars */}
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

        {/* At-risk section */}
        <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: '#dc2626', marginBottom: 5 }}>🚨 Students needing attention</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[{ n: 'Tunde A.', s: 'Physics 28%' }, { n: 'Blessing O.', s: 'Dropped off — 8d inactive' }].map(s => (
              <div key={s.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: T.text }}>{s.n}</span>
                <span style={{ fontSize: 8, color: '#ef4444', background: '#fee2e2', borderRadius: 5, padding: '1px 6px' }}>{s.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feature card — slight rotation for game-like energy ──────────────────────
function FeatureCard({ icon, title, desc, color, accent, rotate = 0, delay = 0 }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 20, padding: '22px 20px',
      border: `1px solid ${T.border}`,
      transform: `rotate(${rotate}deg)`,
      boxShadow: '0 4px 24px rgba(11,19,48,.08)',
      transition: 'transform .2s, box-shadow .2s',
      cursor: 'default',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(11,19,48,.14)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${rotate}deg)`; e.currentTarget.style.boxShadow = '0 4px 24px rgba(11,19,48,.08)' }}
    >
      {/* Icon in coloured blob */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 6, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>{desc}</p>
      <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: accent }}>
        Learn more <span>→</span>
      </div>
    </div>
  )
}

// ── Audience toggle (uLesson pattern — above the nav) ────────────────────────
function AudienceToggle({ active, onChange }) {
  return (
    <div style={{ background: 'rgba(11,19,48,.06)', padding: '4px 6px', borderRadius: 999, display: 'inline-flex', gap: 2 }}>
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
  return (
    <>
      {/* ── Hero ── */}
      <section style={{ background: T.bg, paddingTop: 60, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${T.purple}14`, border: `1px solid ${T.purple}30`, borderRadius: 999, padding: '5px 12px', marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.purple }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.purple }}>Built for WAEC &amp; JAMB · Nigeria</span>
            </div>

            <h1 style={{ fontSize: 52, fontWeight: 900, color: T.text, lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Practise smarter.{' '}
              <span style={{ color: T.navy, position: 'relative', display: 'inline-block' }}>
                Ace your exams.
                {/* Coral underline SVG decoration */}
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%' }} height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0,6 Q50,0 100,5 Q150,10 200,4" stroke={T.coral} strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p style={{ fontSize: 17, color: T.dim, lineHeight: 1.65, marginBottom: 32, maxWidth: 440 }}>
              Take a free diagnostic. Get a practice plan built around your weak topics. Study past questions every day. Watch your subject mastery grow.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <NavyBtn href="/onboarding">Take the free diagnostic →</NavyBtn>
              <OutlineBtn href="/login">Sign in</OutlineBtn>
            </div>

            <p style={{ fontSize: 12, color: T.faint }}>Free to start · 2 minutes · No credit card</p>

            {/* Subject chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 28 }}>
              {[
                { n: 'Chemistry', e: '⚗️', c: T.purple },
                { n: 'Physics',   e: '⚡', c: '#0369a1' },
                { n: 'Biology',   e: '🧬', c: '#059669' },
                { n: 'Maths',     e: '📐', c: '#0369a1' },
                { n: 'English',   e: '📖', c: T.purple },
                { n: 'Economics', e: '📊', c: T.gold },
                { n: 'Government',e: '🏛️', c: '#b91c1c' },
                { n: '+5 more',   e: '', c: T.faint },
              ].map(({ n, e, c }) => (
                <div key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: T.surface, border: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: c }}>
                  {e && <span>{e}</span>}{n}
                </div>
              ))}
            </div>
          </div>

          {/* Right: phone mockup */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', padding: '40px 60px' }}>
            {/* Background blob */}
            <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `${T.purple}10`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <div style={{ background: T.navy, padding: '18px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', gap: 24, flexWrap: 'wrap' }}>
          {[
            { n: '50,000+', l: 'students practising' },
            { n: '2M+',     l: 'questions answered' },
            { n: '15+',     l: 'subjects covered' },
            { n: '98%',     l: 'WAEC + JAMB aligned' },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid — tilted cards ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: T.purple, marginBottom: 8 }}>What you get</p>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Everything you need<br/>to go from weak to <span style={{ color: T.emerald }}>exam-ready</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            <FeatureCard rotate={-1.5} icon="🎯" title="Topic Mastery Tracker" accent={T.purple}
              desc="See exactly which topics you know and which you don't. Your mastery score updates live as you practise." />
            <FeatureCard rotate={1} icon="⚡" title="Past Questions" accent="#0369a1"
              desc="Every WAEC and JAMB past question tagged by topic, year, and difficulty. Practise the real exam format." />
            <FeatureCard rotate={-1} icon="💡" title="Instant Explanations" accent={T.coral}
              desc="After every question, get a clear explanation — concept, why your answer was wrong, worked solution." />
            <FeatureCard rotate={1.5} icon="🎮" title="Learning Games" accent={T.emerald}
              desc="Science games that teach electrochemistry, organelles, and more. Learning that doesn't feel like studying." />
            <FeatureCard rotate={-1} icon="⏱️" title="Exam Mode" accent={T.gold}
              desc="Full WAEC/JAMB simulations, timed, with topic-by-topic score reports after. Know if you're ready." />
            <FeatureCard rotate={1} icon="🏆" title="Community" accent={T.navy}
              desc="Class leaderboard, school rankings, national challenges. Compete with 50,000+ students across Nigeria." />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: T.coral, marginBottom: 8 }}>The process</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>From start to exam-ready</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 28 }}>
            {[
              { icon: '🩺', step: '01', title: 'Take the diagnostic', desc: '5 questions per subject. We find your weak spots instantly.', color: T.purple },
              { icon: '🎯', step: '02', title: 'Get your plan', desc: 'Your weakest, highest-frequency topics come first. Automatically.', color: T.coral },
              { icon: '⚡', step: '03', title: 'Practise daily', desc: 'Past questions, topic drills, games — all in one place.', color: T.gold },
              { icon: '📈', step: '04', title: 'Track mastery', desc: 'Watch your subject mastery grow. Know exactly where you stand.', color: T.emerald },
            ].map(({ icon, step, title, desc, color }) => (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color, border: `1px solid ${color}30`, borderRadius: 999, padding: '2px 8px' }}>Step {step}</span>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community section ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: T.gold, marginBottom: 8 }}>Community</p>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
              Compete with students across Nigeria
            </h2>
            <p style={{ fontSize: 15, color: T.dim, lineHeight: 1.65, marginBottom: 28 }}>
              Climb your class leaderboard. Represent your school nationally. Win monthly challenges. The top 3 get prizes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '👥', title: 'Class leaderboard', desc: 'See how you rank against your classmates every week', color: T.purple },
                { icon: '🏫', title: 'School rankings', desc: 'Your school vs 47 others — inter-school tournaments', color: '#0369a1' },
                { icon: '🌍', title: 'National board', desc: "See where you rank out of Nigeria's 50,000+ students", color: T.coral },
              ].map(({ icon, title, desc, color }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 12, color: T.dim }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Leaderboard illustration */}
          <div style={{ background: T.surface, borderRadius: 24, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 8px 40px rgba(11,19,48,.1)' }}>
            <div style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #1e2a6e 100%)`, padding: '20px 20px 0' }}>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>Weekly leaderboard · SS3 Science A</p>
              {/* Podium */}
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
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{p.name}</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>{p.pts}</p>
                    <div style={{ width: '100%', height: p.h, background: i === 1 ? 'rgba(255,215,0,.15)' : 'rgba(255,255,255,.08)', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6 }}>
                      <span style={{ fontSize: i === 1 ? 18 : 14 }}>{p.medal}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Rows below */}
            <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { rank: 4, name: 'You', pts: '4,820', me: true },
                { rank: 5, name: 'Emeka', pts: '4,650' },
                { rank: 6, name: 'Blessing', pts: '4,410' },
              ].map(r => (
                <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 11, background: r.me ? 'rgba(79,70,229,.1)' : '#f9fafb', border: `1px solid ${r.me ? 'rgba(79,70,229,.25)' : T.border}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: r.me ? '#4f46e5' : T.faint, width: 18, textAlign: 'center' }}>#{r.rank}</span>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: r.me ? 'rgba(79,70,229,.12)' : '#f0f1f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: r.me ? '#4f46e5' : T.dim }}>{r.name[0]}</div>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: r.me ? 800 : 600, color: r.me ? '#4f46e5' : T.text }}>{r.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: r.me ? '#4f46e5' : T.dim }}>{r.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final student CTA ── */}
      <section style={{ background: T.navy, padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px' }}>🎯</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', marginBottom: 12, lineHeight: 1.1 }}>
            Your exams are in {new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0)}.<br/>
            <span style={{ color: T.coral }}>Start practising today.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', marginBottom: 32, lineHeight: 1.65 }}>
            Free diagnostic. Personalised plan. Real past questions.<br/>Takes 2 minutes.
          </p>
          <NavyBtn href="/onboarding" style={{ background: T.coral, boxShadow: `0 6px 0 #c0405d, 0 8px 20px rgba(255,143,171,.3)`, fontSize: 16 }}>
            Take the free diagnostic →
          </NavyBtn>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 14 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,.6)', textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
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
  return (
    <>
      {/* ── School hero ── */}
      <section style={{ background: T.bg, paddingTop: 60, paddingBottom: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${T.emerald}14`, border: `1px solid ${T.emerald}30`, borderRadius: 999, padding: '5px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 11 }}>🏫</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>For Schools · Partner Programme</span>
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 900, color: T.text, lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Know exactly which topics{' '}
              <span style={{ color: T.navy, position: 'relative', display: 'inline-block' }}>
                your students struggle with.
                <svg style={{ position: 'absolute', bottom: -6, left: 0, width: '100%' }} height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0,6 Q50,0 100,5 Q150,10 200,4" stroke={T.emerald} strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p style={{ fontSize: 16, color: T.dim, lineHeight: 1.65, marginBottom: 32, maxWidth: 440 }}>
              As your students practise, ExamPrep shows you their subject and topic mastery in real time — so you always know what to teach next.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <NavyBtn href="/school/signup">Get started for free →</NavyBtn>
              <OutlineBtn href="mailto:schools@examprep.ng">Book a demo</OutlineBtn>
            </div>
            <p style={{ fontSize: 12, color: T.faint }}>Free for schools to try · No setup fees · 5-minute onboarding</p>
          </div>
          {/* Dashboard mockup */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: `${T.emerald}08`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem / solution strip ── */}
      <div style={{ background: T.navy, padding: '22px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}>
            <span style={{ color: T.coral, fontWeight: 800 }}>The problem:</span> Most schools only find out a topic was poorly understood after the exam. By then, it's too late.
            {' '}<span style={{ color: T.emerald, fontWeight: 800 }}>The solution:</span> ExamPrep shows you the data while students are still studying — every day, in real time.
          </p>
        </div>
      </div>

      {/* ── School features ── */}
      <section style={{ background: T.surface, padding: '80px 24px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: T.emerald, marginBottom: 8 }}>School Dashboard</p>
            <h2 style={{ fontSize: 38, fontWeight: 900, color: T.text, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Data that helps teachers<br/><span style={{ color: T.emerald }}>teach better</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { icon: '📊', title: 'Subject & topic mastery', desc: 'See cohort-wide mastery per subject, drilled down to every individual topic. Sorted weakest first — always.', accent: T.purple, rotate: -1 },
              { icon: '🚨', title: 'At-risk student alerts', desc: 'Know which students have gone inactive, which dropped off this week, and which are working hard but scoring low.', accent: T.coral, rotate: 1.5 },
              { icon: '📈', title: 'Weekly trends', desc: 'Track engagement week by week. See improvement across your whole cohort. Get printable PDF reports.', accent: '#0369a1', rotate: -1.5 },
              { icon: '🎓', title: 'Class cohort system', desc: 'Create your class cohort, share one invite code, and your students are connected. Takes 5 minutes.', accent: T.emerald, rotate: 1 },
              { icon: '📧', title: 'Parent reports', desc: "Weekly emails to parents showing days studied, topics covered, and score improvements. You set it once, we send it.", accent: T.gold, rotate: -1 },
              { icon: '🏫', title: 'School vs school', desc: 'Inter-school tournaments. Know how your students compare nationally. Build pride and healthy competition.', accent: T.navy, rotate: 1.5 },
            ].map(f => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} accent={f.accent} rotate={f.rotate} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works for schools ── */}
      <section style={{ background: T.bg, padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: T.text, letterSpacing: '-0.02em' }}>Up and running in 5 minutes</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { step: '1', icon: '🏫', title: 'Create your school account', desc: 'Register with your name and school details. Free, instant.', color: T.purple },
              { step: '2', icon: '🎓', title: 'Create a cohort', desc: 'Set up a class cohort (e.g. "SS3 Science A 2026") and get a 6-letter invite code.', color: T.emerald },
              { step: '3', icon: '📲', title: 'Share the code with students', desc: 'Students enter the code in ExamPrep. They are now linked to your school.', color: T.gold },
              { step: '4', icon: '📊', title: 'Watch the data come in', desc: 'As students practise, your dashboard fills with real mastery data, engagement trends, and at-risk alerts.', color: T.coral },
            ].map(({ step, icon, title, desc, color }, i) => (
              <div key={step} style={{ display: 'flex', gap: 20, paddingBottom: 32, position: 'relative' }}>
                {/* Connector line */}
                {i < 3 && <div style={{ position: 'absolute', left: 19, top: 48, bottom: 0, width: 2, background: `${T.border}` }} />}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}14`, border: `2px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, zIndex: 1, background: T.surface }}>
                  {icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color, border: `1px solid ${color}30`, borderRadius: 999, padding: '2px 8px' }}>Step {step}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: T.dim, lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── School CTA ── */}
      <section style={{ background: `linear-gradient(135deg, ${T.navy} 0%, #0f2040 100%)`, padding: '72px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: `${T.emerald}06`, top: '-20%', right: '-5%' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `${T.purple}06`, bottom: '-10%', left: '-5%' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 20px' }}>🏫</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', marginBottom: 12, lineHeight: 1.1 }}>
            Ready to see your students'<br/>
            <span style={{ color: T.emerald }}>real mastery data?</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', marginBottom: 32, lineHeight: 1.65 }}>
            Free to start. Takes 5 minutes to connect your class.<br/>No setup costs, no technical requirements.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <NavyBtn href="/school/signup" style={{ background: T.emerald, color: T.navy, boxShadow: `0 6px 0 #1a9962`, fontWeight: 900 }}>
              Get started free →
            </NavyBtn>
            <OutlineBtn href="mailto:schools@examprep.ng" style={{ background: 'transparent', color: 'rgba(255,255,255,.8)', border: '2px solid rgba(255,255,255,.2)' }}>
              Book a demo
            </OutlineBtn>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 16 }}>
            Already have a school account?{' '}
            <Link href="/login" style={{ color: 'rgba(255,255,255,.55)', textDecoration: 'none', fontWeight: 700 }}>Sign in →</Link>
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
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Audience toggle (above nav, exactly like uLesson) ── */}
      <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '8px 0', textAlign: 'center', position: 'sticky', top: 0, zIndex: 60 }}>
        <AudienceToggle active={audience} onChange={setAudience} />
      </div>

      {/* ── Nav ── */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 49, zIndex: 50, boxShadow: '0 1px 0 rgba(0,0,0,.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {audience === 'For Students' ? (
              <>
                <Link href="/login" style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.dim, textDecoration: 'none' }}>Sign in</Link>
                <NavyBtn href="/onboarding" style={{ padding: '9px 18px', fontSize: 13, borderRadius: 11 }}>Get started free</NavyBtn>
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

      {/* ── Page content ── */}
      {audience === 'For Students' ? <StudentLanding /> : <SchoolLanding />}

      {/* ── Footer ── */}
      <footer style={{ background: '#0a0c18', borderTop: `1px solid rgba(255,255,255,.06)` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 32px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
          <div>
            <Logo size={28} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 10, lineHeight: 1.65, maxWidth: 260 }}>
              The exam prep platform built specifically for Nigerian secondary school students. WAEC and JAMB, all subjects.
            </p>
          </div>
          {[
            { label: 'Students', links: ['Get started', 'How it works', 'Subjects', 'Practice modes', 'Sign in'] },
            { label: 'Schools', links: ['School dashboard', 'Get started', 'Book a demo', 'School login', 'Contact us'] },
            { label: 'Product', links: ['Features', 'Topic mastery', 'Games', 'Community', 'Exam mode'] },
          ].map(col => (
            <div key={col.label}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.3)', marginBottom: 12 }}>{col.label}</p>
              {col.links.map(l => <p key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 7, cursor: 'pointer' }}>{l}</p>)}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>© 2025 EXL Exam Prep · For Nigerian secondary school students</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>Lagos, Nigeria</p>
        </div>
      </footer>
    </div>
  )
}