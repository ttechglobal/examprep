'use client'
// src/app/student/dashboard/page.js — v6
// ─────────────────────────────────────────────────────────────────────────────
// Full redesign matching the Focus prototype exactly.
//
// LAYOUT (top to bottom, matching prototype):
//   1. Greeting — eyebrow (day + time of day) + big hero line with first name
//   2. "Next best move" hero card — ambient SVG + violet pill tag + subject
//      name large + topic line + freq/time badges + 3D navy CTA
//   3. Carousel dots — centred, one per subject, active = coloured pill
//   4. "Your subjects" — icon + name + 3px progress bar + coloured %
//   5. "Needs attention" — red-dot items, weakest topics first
//   6. "Your target" — icon box + goal + countdown days number
//
// DESIGN DECISIONS:
//   • Greeting is personal and time-aware — student sees themselves here
//   • Hero card is the single strongest action — one tap = practise
//   • Subjects are compact and scannable — not cards, just rows
//   • Needs attention is motivational, not alarming — "here's where to go next"
//   • Target strip is always anchored at the bottom — reminds why they're here
//   • Zero Tailwind dynamic classes, zero --indigo vars
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import { PracticeSetupModal } from '@/app/student/practice/page'
import Link from 'next/link'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ── Dark mode hook ────────────────────────────────────────────────────────────
function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ── Subject config ────────────────────────────────────────────────────────────
const SUBJECT_CFG = {
  'Physics':               { accent: '#ff8fab', cardBg: 'linear-gradient(160deg,#1f0a14 0%,#100820 55%,#0c0d12 100%)', n1: '#ff8fab', n2: '#9b7ae0', icon: '⚡'  },
  'Chemistry':             { accent: '#9b7ae0', cardBg: 'linear-gradient(160deg,#16102c 0%,#0d0a1c 55%,#0c0d12 100%)', n1: '#9b7ae0', n2: '#ff8fab', icon: '⚗️' },
  'Biology':               { accent: '#6cce8e', cardBg: 'linear-gradient(160deg,#081a10 0%,#061210 55%,#0c0d12 100%)', n1: '#6cce8e', n2: '#5cb8ea', icon: '🧬' },
  'Mathematics':           { accent: '#5cb8ea', cardBg: 'linear-gradient(160deg,#091426 0%,#070d1c 55%,#0c0d12 100%)', n1: '#5cb8ea', n2: '#9b7ae0', icon: '📐' },
  'Further Mathematics':   { accent: '#5cb8ea', cardBg: 'linear-gradient(160deg,#091426 0%,#070d1c 55%,#0c0d12 100%)', n1: '#5cb8ea', n2: '#9b7ae0', icon: '📐' },
  'English Language':      { accent: '#a78bfa', cardBg: 'linear-gradient(160deg,#130e28 0%,#0e0a1c 55%,#0c0d12 100%)', n1: '#a78bfa', n2: '#ff8fab', icon: '📖' },
  'Use of English':        { accent: '#a78bfa', cardBg: 'linear-gradient(160deg,#130e28 0%,#0e0a1c 55%,#0c0d12 100%)', n1: '#a78bfa', n2: '#ff8fab', icon: '📖' },
  'Economics':             { accent: '#fcd34d', cardBg: 'linear-gradient(160deg,#1a1200 0%,#0e0d04 55%,#0c0d12 100%)', n1: '#fcd34d', n2: '#6cce8e', icon: '📊' },
  'Government':            { accent: '#f87171', cardBg: 'linear-gradient(160deg,#1a0808 0%,#0e0808 55%,#0c0d12 100%)', n1: '#f87171', n2: '#fcd34d', icon: '🏛️' },
  'Geography':             { accent: '#34d399', cardBg: 'linear-gradient(160deg,#061a10 0%,#061210 55%,#0c0d12 100%)', n1: '#34d399', n2: '#5cb8ea', icon: '🌍' },
  'Literature in English': { accent: '#f9a8d4', cardBg: 'linear-gradient(160deg,#1a0814 0%,#0e0812 55%,#0c0d12 100%)', n1: '#f9a8d4', n2: '#a78bfa', icon: '📚' },
  'Agricultural Science':  { accent: '#86efac', cardBg: 'linear-gradient(160deg,#071408 0%,#061208 55%,#0c0d12 100%)', n1: '#86efac', n2: '#fcd34d', icon: '🌱' },
  'Commerce':              { accent: '#818cf8', cardBg: 'linear-gradient(160deg,#0e0e28 0%,#0c0c1e 55%,#0c0d12 100%)', n1: '#818cf8', n2: '#5cb8ea', icon: '💼' },
  'Accounting':            { accent: '#fde68a', cardBg: 'linear-gradient(160deg,#1a1400 0%,#0e0d00 55%,#0c0d12 100%)', n1: '#fde68a', n2: '#6cce8e', icon: '🧮' },
  'Computer Science':      { accent: '#67e8f9', cardBg: 'linear-gradient(160deg,#061418 0%,#060e14 55%,#0c0d12 100%)', n1: '#67e8f9', n2: '#818cf8', icon: '💻' },
  'default':               { accent: '#9b7ae0', cardBg: 'linear-gradient(160deg,#16102c 0%,#0d0a1c 55%,#0c0d12 100%)', n1: '#9b7ae0', n2: '#ff8fab', icon: '📝' },
}
const getCfg = name => SUBJECT_CFG[name] ?? SUBJECT_CFG.default

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(firstName) {
  const h    = new Date().getHours()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const day  = days[new Date().getDay()]
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const eyebrow = `${day} ${part}`

  const name = firstName ? `,\n${firstName}` : ''
  if (h < 12) return { eyebrow, hero: `Good morning${name} ⚡` }
  if (h < 17) return { eyebrow, hero: `Keep at it${name} 📖` }
  return            { eyebrow, hero: `One more topic${name} 🌙` }
}

// ── Ambient SVG — constellation nodes, matches prototype exactly ──────────────
function AmbientNodes({ n1, n2 }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.07 }} xmlns="http://www.w3.org/2000/svg">
      <circle cx="30"  cy="30"  r="2.5" fill={n1}/>
      <circle cx="90"  cy="18"  r="1.5" fill={n1}/>
      <circle cx="155" cy="38"  r="2"   fill={n1}/>
      <circle cx="220" cy="20"  r="1.5" fill={n2}/>
      <circle cx="310" cy="35"  r="2"   fill={n1}/>
      <circle cx="345" cy="14"  r="1.5" fill={n2}/>
      <line x1="30"  y1="30"  x2="90"  y2="18"  stroke={n1} strokeWidth="0.8"/>
      <line x1="90"  y1="18"  x2="155" y2="38"  stroke={n1} strokeWidth="0.8"/>
      <line x1="155" y1="38"  x2="220" y2="20"  stroke={n1} strokeWidth="0.8"/>
      <line x1="220" y1="20"  x2="310" y2="35"  stroke={n1} strokeWidth="0.8"/>
      <line x1="310" y1="35"  x2="345" y2="14"  stroke={n1} strokeWidth="0.8"/>
      <circle cx="20"  cy="120" r="2"   fill={n1}/>
      <circle cx="80"  cy="100" r="2.5" fill={n2}/>
      <circle cx="160" cy="128" r="1.5" fill={n1}/>
      <circle cx="260" cy="108" r="2"   fill={n1}/>
      <line x1="20"  y1="120" x2="80"  y2="100" stroke={n1} strokeWidth="0.8"/>
      <line x1="80"  y1="100" x2="160" y2="128" stroke={n1} strokeWidth="0.8"/>
      <line x1="160" y1="128" x2="260" y2="108" stroke={n1} strokeWidth="0.8"/>
    </svg>
  )
}

// ── 3D press button ───────────────────────────────────────────────────────────
function PressBtn({ onClick, children, style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        background: '#0b1330', color: '#fff', border: 'none', cursor: 'pointer',
        fontWeight: 800, fontSize: 15, borderRadius: 14, letterSpacing: '-0.01em',
        transform: p ? 'translateY(3px)' : '',
        boxShadow: p ? '0 2px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.4)',
        transition: 'transform .1s, box-shadow .1s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Hero card — "Next best move" ──────────────────────────────────────────────
const HeroCard = memo(function HeroCard({ sub, planItem, onStartPractice, isDark }) {
  const cfg         = getCfg(sub?.subjects?.name ?? '')
  const subjectName = sub?.subjects?.name ?? 'Subject'
  const topicName   = planItem?.topicName ?? null
  const isCore      = planItem?.isCore    ?? false

  // Light mode hero uses a flat deep-navy card (prototype uses --navy for light)
  const bg = isDark ? cfg.cardBg : '#0b1330'

  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      border: isDark ? `1px solid ${cfg.accent}30` : 'none',
      boxShadow: isDark
        ? `0 24px 56px rgba(0,0,0,.6), inset 0 1px 0 ${cfg.accent}18`
        : '0 20px 48px rgba(11,19,48,.35)',
    }}>
      <div style={{ background: bg, padding: '20px 20px 20px', position: 'relative', overflow: 'hidden', minHeight: 248, display: 'flex', flexDirection: 'column' }}>
        <AmbientNodes n1={isDark ? cfg.n1 : 'rgba(139,108,232,.9)'} n2={isDark ? cfg.n2 : 'rgba(255,143,171,.8)'} />

        {/* "Next best move" pill tag — prototype: violet-dim bg + violet border + violet text */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px 3px 7px', borderRadius: 999,
          background: isDark ? `${cfg.accent}18` : 'rgba(139,108,232,.18)',
          border: `1px solid ${isDark ? `${cfg.accent}30` : 'rgba(139,108,232,.35)'}`,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: isDark ? cfg.accent : '#C0A6FF',
          alignSelf: 'flex-start', marginBottom: 14, position: 'relative', zIndex: 1,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          Next best move
        </div>

        {/* Flex spacer — pushes content to lower half of card */}
        <div style={{ flex: 1, minHeight: 8 }} />

        {/* Subject name — large, white, Space-Grotesk-style */}
        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 3, position: 'relative', zIndex: 1 }}>
          {subjectName}
        </p>

        {/* Topic line */}
        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.45)', marginBottom: 6, position: 'relative', zIndex: 1 }}>
          Topic: <strong style={{ color: isDark ? `${cfg.accent}cc` : 'rgba(139,108,232,.85)', fontWeight: 600 }}>
            {topicName ?? 'Mixed practice'}
          </strong>
        </p>

        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {isCore && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, background: 'rgba(245,185,66,.1)', color: '#F5B942', fontSize: 10, fontWeight: 700 }}>
              🔥 High frequency
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 700 }}>
            10 questions · ~14 min
          </span>
        </div>

        {/* CTA */}
        <PressBtn onClick={() => onStartPractice(sub)} style={{ width: '100%', padding: '14px 0', borderRadius: 14, position: 'relative', zIndex: 1 }}>
          Practise now →
        </PressBtn>
      </div>
    </div>
  )
})

// ── Carousel with dots ────────────────────────────────────────────────────────
function SubjectCarousel({ subjects, planItems, onStartPractice, isDark }) {
  const [idx, setIdx]   = useState(0)
  const startX          = useRef(null)

  const sub      = subjects[idx]
  const planItem = planItems?.[sub?.subject_id] ?? null

  const onTouchStart = e => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = e => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx < -40 && idx < subjects.length - 1) setIdx(i => i + 1)
    if (dx > 40  && idx > 0)                   setIdx(i => i - 1)
    startX.current = null
  }

  return (
    <div>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ userSelect: 'none' }}>
        <HeroCard sub={sub} planItem={planItem} onStartPractice={onStartPractice} isDark={isDark} />
      </div>

      {subjects.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
          {subjects.map((s, i) => {
            const c = getCfg(s?.subjects?.name ?? '')
            const active = i === idx
            return (
              <button key={i} onClick={() => setIdx(i)}
                aria-label={`Switch to ${s?.subjects?.name}`}
                style={{ width: active ? 18 : 5, height: 5, borderRadius: active ? 3 : '50%', background: active ? c.accent : 'rgba(128,128,128,.22)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.22s' }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── "Your subjects" list ──────────────────────────────────────────────────────
// Prototype: icon box + name + 3px bar track + coloured % number
function SubjectRow({ sub, isLast }) {
  const name = sub.subjects?.name ?? ''
  const cfg  = getCfg(name)
  const pct  = sub.pct ?? 0
  const pctColor = pct >= 70 ? '#4CC987' : pct >= 40 ? '#F5B942' : '#E85050'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      {/* Subject icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
        background: `${cfg.accent}14`,
        border: `1px solid ${cfg.accent}22`,
      }}>
        {cfg.icon}
      </div>

      {/* Name + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 5 }}>{name}</p>
        <div style={{ height: 3, borderRadius: 2, overflow: 'hidden', background: 'var(--bg-inset)' }}>
          <div style={{ height: '100%', borderRadius: 2, background: cfg.accent, width: `${Math.max(pct, 2)}%`, transition: 'width 0.7s ease' }} />
        </div>
      </div>

      {/* % */}
      <span style={{ fontSize: 12, fontWeight: 800, flexShrink: 0, marginLeft: 8, color: pctColor }}>
        {pct}%
      </span>
    </div>
  )
}

function SubjectsList({ subjects, onSeeAll }) {
  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Your subjects</p>
        <button onClick={onSeeAll} style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          All →
        </button>
      </div>
      {subjects.map((sub, i) => (
        <SubjectRow key={sub.subject_id} sub={sub} isLast={i === subjects.length - 1} />
      ))}
    </div>
  )
}

// ── "Needs attention" ─────────────────────────────────────────────────────────
// Prototype: red dot + topic name + subject · % + "Practise →" link
function NeedsAttention({ weakTopics, onPractise }) {
  if (!weakTopics.length) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Needs attention</p>
        <Link href="/student/learn" style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', textDecoration: 'none' }}>
          Learn →
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weakTopics.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            cursor: 'pointer',
          }}>
            {/* Red alert dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E85050', flexShrink: 0 }} />

            {/* Label */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.2 }}>{t.topicName}</p>
              <p style={{ fontSize: 11, color: 'var(--text-sec)', marginTop: 2 }}>{t.subjectName} · {t.pct}%</p>
            </div>

            {/* Action */}
            <button
              onClick={() => onPractise(t)}
              style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
            >
              Practise →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── "Your target" strip ───────────────────────────────────────────────────────
// Prototype: icon box + key/value rows + big days-left number on the right
function TargetStrip({ profile, onEdit }) {
  const course     = profile?.university_course?.trim() ?? ''
  const university = profile?.target_university?.trim()  ?? ''
  const examType   = profile?.exam_type ?? 'WAEC'
  const jambTotal  = profile?.jamb_total_target ?? 0
  const hasAny     = course || university

  // Calculate days until next June (WAEC/JAMB exam period)
  const now      = new Date()
  const nextJune = new Date(now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(), 5, 1)
  const daysLeft = Math.max(0, Math.ceil((nextJune - now) / 86400000))

  if (!hasAny) {
    return (
      <button onClick={onEdit} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🎯</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', marginBottom: 2 }}>Set your exam target</p>
          <p style={{ fontSize: 11, color: 'var(--text-sec)' }}>University, course, JAMB score goal</p>
        </div>
        <span style={{ color: 'var(--text-tert)', fontSize: 16 }}>›</span>
      </button>
    )
  }

  const goalLine = course
    ? (university ? `${course} — ${university.replace('University of ', '').replace('University', 'Uni')}` : course)
    : university

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
    }}>
      {/* Icon box */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        🎯
      </div>

      {/* Goal text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-tert)', marginBottom: 2 }}>Goal</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalLine}</p>
        {jambTotal > 0 && (
          <p style={{ fontSize: 10, color: '#9b7ae0', marginTop: 1 }}>{examType} · {jambTotal}/400 target</p>
        )}
      </div>

      {/* Days countdown */}
      <button onClick={onEdit} style={{ textAlign: 'right', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-prim)', lineHeight: 1 }}>{daysLeft}</p>
        <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tert)' }}>days left</p>
      </button>
    </div>
  )
}

// ── "Or practise differently" quick mode grid ─────────────────────────────────
function QuickModes({ router, onTimed, onWeak }) {
  const MODES = [
    { emoji: '⏱️', label: 'Timed',       onClick: onTimed },
    { emoji: '📝', label: 'Mock Exam',   onClick: () => router.push('/student/exam') },
    { emoji: '📊', label: 'Weak Topics', onClick: onWeak },
    { emoji: '📚', label: 'Learn',       onClick: () => router.push('/student/learn') },
  ]
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-tert)', marginBottom: 10 }}>
        Or practise differently
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {MODES.map(m => (
          <button key={m.label} onClick={m.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '12px 4px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{m.emoji}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tert)', textAlign: 'center', lineHeight: 1.3 }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Empty / no-path state ─────────────────────────────────────────────────────
function NoPathState({ profile, onEdit }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 20px', textAlign: 'center' }}>
      <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>📝</span>
      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 8, letterSpacing: '-0.01em' }}>
        Get your personalised practice path
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-sec)', lineHeight: 1.6, marginBottom: 20 }}>
        Answer a few diagnostic questions and we'll build a study path around your weak areas.
      </p>
      {!profile?.goals_set && (
        <button onClick={onEdit} style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: '#F5B942', color: '#0b1330', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 0 #c4922e' }}>
          Set your goals first →
        </button>
      )}
      <Link href="/diagnostic" style={{ display: 'block', padding: '14px 0', borderRadius: 14, background: '#0b1330', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 0 #05070f', textAlign: 'center', textDecoration: 'none' }}>
        Take the diagnostic →
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const isDark   = useIsDark()

  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [weakTopics,    setWeakTopics]    = useState([])
  const [planItems,     setPlanItems]     = useState({})
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [practiceModal, setPracticeModal] = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: paths }, { data: prog }, { data: mastery }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_topic_mastery')
        .select('topic_id, score, topics(id, name, subject_id, subjects(name))')
        .eq('student_id', user.id)
        .order('score', { ascending: true })
        .limit(6),
    ])

    setProfile(prof)

    // Subject progress
    const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    const enriched = (paths ?? []).map(path => {
      const ids  = path.ordered_subtopic_ids ?? []
      const done = ids.filter(id => completedIds.has(id)).length
      const pct  = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
      return { subject_id: path.subject_id, subjects: path.subjects, total: ids.length, completed: done, pct }
    })
    setSubjects(enriched)

    // Weak topics — lowest mastery scores, max 3
    const weak = (mastery ?? [])
      .filter(m => m.topics && (m.score ?? 0) < 40)
      .slice(0, 3)
      .map(m => ({
        topicId:     m.topic_id,
        topicName:   m.topics?.name ?? '',
        subjectName: m.topics?.subjects?.name ?? '',
        pct:         Math.round(m.score ?? 0),
      }))
    setWeakTopics(weak)
    setLoading(false)

    // Fetch personalised next-topic recommendations non-blocking
    if (enriched.length > 0) {
      fetch('/api/student/next-topic')
        .then(r => r.json())
        .then(data => setPlanItems(data.topics ?? {}))
        .catch(() => {})
    }
  }

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName)
  const hasPath   = subjects.length > 0
  const firstSub  = subjects[0] ? { id: subjects[0].subject_id, name: subjects[0].subjects?.name ?? '' } : null
  const streakDays = profile?.streak_days ?? 0

  function openPractice(sub, quickMode) {
    const s = sub?.subject_id
      ? { id: sub.subject_id, name: sub.subjects?.name ?? '' }
      : sub
    if (!s) return
    setPracticeModal({ ...s, quickMode })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 112 }}>

        {/* ── 1. Greeting ── */}
        <div style={{ paddingTop: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 4 }}>
            {greeting.eyebrow}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--text-prim)', whiteSpace: 'pre-line' }}>
            {greeting.hero}
          </h1>
          {/* Streak chip — only if streak ≥ 2 */}
          {streakDays >= 2 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'rgba(245,185,66,.1)', border: '1px solid rgba(245,185,66,.2)', fontSize: 11, fontWeight: 700, color: '#F5B942' }}>
              🔥 {streakDays}-day streak
            </div>
          )}
        </div>

        {hasPath ? (
          <>
            {/* ── 2. Hero carousel ── */}
            <SubjectCarousel
              subjects={subjects}
              planItems={planItems}
              onStartPractice={sub => openPractice(sub)}
              isDark={isDark}
            />

            {/* ── 3. Your subjects ── */}
            <SubjectsList subjects={subjects} onSeeAll={() => router.push('/student/learn')} />

            {/* ── 4. Needs attention ── */}
            <NeedsAttention
              weakTopics={weakTopics}
              onPractise={t => openPractice(
                subjects.find(s => s.subjects?.name === t.subjectName) ?? firstSub
              )}
            />

            {/* ── 5. Target strip ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>Your target</p>
              </div>
              <TargetStrip profile={profile} onEdit={() => setShowGoalModal(true)} />
            </div>
          </>
        ) : (
          <NoPathState profile={profile} onEdit={() => setShowGoalModal(true)} />
        )}
      </div>

      {/* Goal modal */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }}
          />
        </Suspense>
      )}

      {/* Practice setup modal */}
      {practiceModal && (
        <PracticeSetupModal
          initialSubject={practiceModal}
          subjects={subjects.map(s => ({ id: s.subject_id, name: s.subjects?.name ?? '' }))}
          nextTopics={planItems}
          profile={profile}
          onClose={() => setPracticeModal(null)}
          onStart={({ subject, type, count, answerMode, topic, duration }) => {
            const config = {
              subjects:     [subject.name],
              subject_id:   subject.id,
              examType:     profile?.exam_type ?? 'WAEC',
              count, mode: type, answerMode,
              topicName:    topic?.topicName   ?? null,
              topic_id:     topic?.topicId     ?? null,
              isCore:       topic?.isCore      ?? false,
              durationSecs: duration           ?? null,
            }
            sessionStorage.setItem('practice_config', JSON.stringify(config))
            setPracticeModal(null)
            router.push('/student/practice/session')
          }}
          onMockExam={() => { setPracticeModal(null); router.push('/student/exam') }}
        />
      )}
    </>
  )
}