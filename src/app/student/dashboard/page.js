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
import CoachBanner from '@/components/ui/CoachBanner'
import { homeCoach } from '@/lib/coach'
import Link from 'next/link'
import { usePoints } from '@/contexts/PointsContext'
import { useUser } from '@/contexts/UserContext'

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

// ── 3D press button — EXL Blue ────────────────────────────────────────────────
function PressBtn({ onClick, children, style = {} }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        background: '#1264E5', color: '#fff', border: 'none', cursor: 'pointer',
        fontWeight: 900, fontSize: 14, borderRadius: 14, letterSpacing: '-0.015em',
        transform: p ? 'translateY(3px)' : '',
        boxShadow: p ? '0 2px 0 #0a3fa0' : '0 5px 0 #0a3fa0, 0 8px 20px rgba(18,100,229,.3)',
        transition: 'transform .1s, box-shadow .1s',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.12) 50%,transparent 100%)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />
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

  // Both modes use the dark ambient card — light mode just has a stronger shadow
  const bg = cfg.cardBg

  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      border: `1px solid ${cfg.accent}${isDark ? '30' : '22'}`,
      boxShadow: isDark
        ? `0 24px 56px rgba(0,0,0,.6), inset 0 1px 0 ${cfg.accent}18`
        : `0 20px 48px rgba(11,19,48,.28), 0 4px 12px rgba(11,19,48,.15)`,
    }}>
      <div style={{ background: bg, padding: '20px 20px 20px', position: 'relative', overflow: 'hidden', minHeight: 248, display: 'flex', flexDirection: 'column' }}>
        <AmbientNodes n1={cfg.n1} n2={cfg.n2} />

        {/* Subject pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px 3px 7px', borderRadius: 999,
          background: `${cfg.accent}18`,
          border: `1px solid ${cfg.accent}30`,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: cfg.accent,
          alignSelf: 'flex-start', marginBottom: 14, position: 'relative', zIndex: 1,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          {subjectName}
        </div>

        {/* Flex spacer — pushes content to lower half of card */}
        <div style={{ flex: 1, minHeight: 8 }} />

        {/* Subject name — large, white, Space-Grotesk-style */}
        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 3, position: 'relative', zIndex: 1 }}>
          {subjectName}
        </p>

        {/* Topic line — only when there's a real topic */}
        {topicName && (
          <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.45)', marginBottom: 6, position: 'relative', zIndex: 1 }}>
            Topic: <strong style={{ color: `${cfg.accent}cc`, fontWeight: 600 }}>{topicName}</strong>
          </p>
        )}

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
  const pctColor = pct >= 70 ? '#4ade80' : pct >= 40 ? '#FFB800' : '#f87171'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11,
      padding: '11px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}22`,
      }}>{cfg.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-prim)' }}>{name}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: pctColor, flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, overflow: 'hidden', background: 'var(--border)' }}>
          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,#18B7F2,#1264E5)`, width: `${Math.max(pct, 2)}%`, transition: 'width .8s cubic-bezier(.34,1.56,.64,1)' }} />
        </div>
      </div>
    </div>
  )
}

function SubjectsList({ subjects, onSeeAll }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>Your subjects</span>
        <button onClick={onSeeAll} style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>All →</button>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '0 14px' }}>
        {subjects.map((sub, i) => (
          <SubjectRow key={sub.subject_id} sub={sub} isLast={i === subjects.length - 1} />
        ))}
      </div>
    </div>
  )
}

// ── "Level up faster" — Quick 5 weak topic cards ─────────────────────────────
function NeedsAttention({ weakTopics, onPractise }) {
  if (!weakTopics.length) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)' }}>Level up faster</span>
        <Link href="/student/learn" style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', textDecoration: 'none' }}>Study →</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {weakTopics.map((t, i) => {
          const cfg = SUBJECT_CFG[t.subjectName] ?? SUBJECT_CFG.default
          return (
            <div key={i} onClick={() => onPractise(t)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 13px', borderRadius: 13,
              background: 'var(--bg-card)', border: `1px solid ${cfg.accent}22`,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                background: `${cfg.accent}14`, border: `1px solid ${cfg.accent}22`,
              }}>{cfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.topicName}</p>
                <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>{t.subjectName} · {t.pct}% mastered</p>
              </div>
              <button onClick={e => { e.stopPropagation(); onPractise(t) }} style={{
                fontSize: 10, fontWeight: 800, color: cfg.accent,
                background: `${cfg.accent}12`, border: `1px solid ${cfg.accent}25`,
                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                fontFamily: 'inherit',
              }}>Quick 5 →</button>
            </div>
          )
        })}
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
      padding: '13px 14px', borderRadius: 14,
      background: 'rgba(255,184,0,.07)', border: '1px solid rgba(255,184,0,.18)',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>🎯</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalLine}</p>
        <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>
          {examType}{jambTotal > 0 ? ` · ${jambTotal}/400 target` : ''}
        </p>
      </div>
      <button onClick={onEdit} style={{ textAlign: 'right', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: '#FFB800', lineHeight: 1 }}>{daysLeft}</p>
        <p style={{ fontSize: 9, color: 'var(--text-tert)' }}>days left</p>
      </button>
    </div>
  )
}

// ── "Or practise differently" quick mode grid — v2 ────────────────────────────
// Each mode has a distinct colored icon background so they're scannable at a glance.
function QuickModes({ router, onTimed, onWeak }) {
  const MODES = [
    {
      emoji: '⏱️', label: 'Timed',
      iconBg: 'rgba(155,122,224,.15)', iconBorder: 'rgba(155,122,224,.25)',
      onClick: onTimed,
    },
    {
      emoji: '📝', label: 'Mock Exam',
      iconBg: 'rgba(11,19,48,.6)',    iconBorder: 'rgba(255,255,255,.15)',
      onClick: () => router.push('/student/exam'),
    },
    {
      emoji: '🎯', label: 'Weak Topics',
      iconBg: 'rgba(232,80,80,.12)',  iconBorder: 'rgba(232,80,80,.22)',
      onClick: onWeak,
    },
    {
      emoji: '📚', label: 'Learn',
      iconBg: 'rgba(92,184,234,.12)', iconBorder: 'rgba(92,184,234,.22)',
      onClick: () => router.push('/student/learn'),
    },
  ]
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--text-tert)', marginBottom: 10 }}>
        Or practise differently
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {MODES.map(m => (
          <button key={m.label} onClick={m.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            padding: '14px 6px', borderRadius: 16,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            cursor: 'pointer', transition: 'border-color .18s',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1,
              background: m.iconBg, border: `1px solid ${m.iconBorder}`,
            }}>
              {m.emoji}
            </div>
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
      <Link href="/diagnostic" style={{ display: 'block', padding: '14px 0', borderRadius: 14, background: '#1264E5', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 5px 0 #0a3fa0', textAlign: 'center', textDecoration: 'none' }}>
        Take the diagnostic →
      </Link>
    </div>
  )
}

// ── Right sidebar: Activity chart ─────────────────────────────────────────────
// Matches prototype exactly: small bar chart Mon–Sun + streak label
function SidebarActivity({ sessionDays, streak = 0 }) {
  const isDark = useIsDark()
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7  // Mon=0 … Sun=6
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek)
  monday.setHours(0, 0, 0, 0)
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const isFuture = i > dayOfWeek
    return { key, label, count: isFuture ? 0 : (sessionDays[key] ?? 0), isToday: i === dayOfWeek, isFuture }
  })
  const maxCount = Math.max(...days.map(d => d.count), 1)

  return (
    <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Activity</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#FF6A00' }}>🔥 {streak}d</span>
      </div>
      <div style={{ padding: '11px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
          {days.map((day, i) => {
            const barH = day.count > 0 ? Math.max(6, Math.round((day.count / maxCount) * 32)) : 2
            const col = day.isFuture
              ? (isDark ? 'rgba(255,255,255,.04)' : '#f1f5f9')
              : day.count > 0
                ? (day.isToday ? '#1264E5' : isDark ? 'rgba(24,183,242,.5)' : '#5cb8ea')
                : (isDark ? 'rgba(255,255,255,.07)' : '#e8eef8')
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', height: barH, borderRadius: '3px 3px 1px 1px', background: col }} />
                <span style={{ fontSize: 7, fontWeight: day.isToday ? 700 : 400, color: day.isToday ? '#1264E5' : 'var(--text-tert)', lineHeight: 1 }}>{day.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Right sidebar: Class rank snapshot ────────────────────────────────────────
// Matches prototype: medal/rank + first name + XP, "you" row highlighted cyan
function SidebarClassRank({ leaderboard, myId }) {
  const medals = ['🥇', '🥈', '🥉']
  const { totalPoints: liveXP } = usePoints()
  if (!leaderboard.length) return null

  return (
    <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Class rank</p>
        <Link href="/student/community" style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', textDecoration: 'none' }}>Full board →</Link>
      </div>
      <div>
        {leaderboard.slice(0, 5).map((entry, i) => {
          const isMe = entry.student_id === myId
          const pts = isMe ? liveXP : (entry.points ?? 0)
          return (
            <div key={entry.student_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', background: isMe ? 'rgba(24,183,242,.07)' : 'transparent' }}>
              <span style={{ fontSize: i < 3 ? 12 : 10, fontWeight: 800, color: 'var(--text-tert)', minWidth: 16, textAlign: 'center', flexShrink: 0 }}>
                {i < 3 ? medals[i] : `${i + 1}`}
              </span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 500, color: isMe ? '#18B7F2' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isMe ? 'You' : (entry.full_name?.split(' ')[0] ?? 'Student')}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? '#FFB800' : 'var(--text-tert)', flexShrink: 0 }}>
                {pts.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Right sidebar: Target card ────────────────────────────────────────────────
// Matches prototype: goal name + days-left big number
function SidebarTarget({ profile, onEdit }) {
  const course     = profile?.university_course?.trim() ?? ''
  const university = profile?.target_university?.trim()  ?? ''
  const examType   = profile?.exam_type ?? 'WAEC'
  const jambTotal  = profile?.jamb_total_target ?? 0
  const hasAny     = course || university

  const now      = new Date()
  const nextJune = new Date(now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(), 5, 1)
  const daysLeft = Math.max(0, Math.ceil((nextJune - now) / 86400000))

  if (!hasAny) {
    return (
      <button onClick={onEdit} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px', borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-prim)' }}>Set your target</p>
          <p style={{ fontSize: 10, color: 'var(--text-tert)', marginTop: 1 }}>University + course goal</p>
        </div>
      </button>
    )
  }

  const goalLine = course
    ? (university ? `${course} · ${university.replace('University of ', '').replace('University', 'Uni')}` : course)
    : university

  return (
    <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 13 }}>
      <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tert)', marginBottom: 8 }}>Your target</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-prim)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalLine}</p>
          <p style={{ fontSize: 10, color: '#18B7F2', marginTop: 1 }}>{examType}{jambTotal > 0 ? ` · ${jambTotal}/400 target` : ''}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-prim)', lineHeight: 1 }}>{daysLeft}</p>
        <p style={{ fontSize: 10, color: 'var(--text-tert)' }}>days left</p>
      </div>
    </div>
  )
}

// ── Daily Quest card — the hero game-feel component ───────────────────────────
// Progress ring (0/5), streak dots Mon–Sun, +50 XP reward, EXL Blue CTA
function DailyQuestCard({ subjects, weakTopics, streak, sessionDays, onStart }) {
  const [pressed, setPressed] = useState(false)

  // Build weekly dot state from sessionDays
  const days  = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const today = new Date()
  const weekDots = days.map((label, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i)
    const key = d.toISOString().slice(0, 10)
    const isToday = i === ((today.getDay() + 6) % 7)
    const done = !!sessionDays[key] || (isToday && Object.keys(sessionDays).length > 0)
    return { label, isToday, done }
  })

  const topicHint = weakTopics[0]
    ? `${weakTopics[0].topicName} · ${weakTopics[0].subjectName}`
    : subjects[0]?.subjects?.name ?? 'Your next topic'

  // Ring SVG — 0/5 empty (ready for today)
  const ringSize = 72, stroke = 7, r = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * r

  return (
    <div>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', display: 'block', marginBottom: 8 }}>Daily quest</span>
      <div style={{
        borderRadius: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer',
        background: 'linear-gradient(145deg,#071B49 0%,#0c2460 50%,#062A78 100%)',
        border: '1px solid rgba(24,183,242,.2)',
        animation: 'exl-glow-pulse 3s ease-in-out infinite',
        padding: 18,
      }} onClick={onStart}>

        {/* Glow orb */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(24,183,242,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          {/* Progress ring */}
          <div style={{ position: 'relative', flexShrink: 0, width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}
              style={{ filter: 'drop-shadow(0 0 8px #1264E588)' }}>
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke}/>
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="#1264E5" strokeWidth={stroke}
                strokeLinecap="round" strokeDasharray={`0 ${circ}`}
                transform={`rotate(-90 ${ringSize/2} ${ringSize/2})`}/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>0</p>
              <p style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>/ 5</p>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>Quick 5</p>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,184,0,.15)', border: '1px solid rgba(255,184,0,.25)', color: '#FFB800' }}>+50 XP</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topicHint} · ~4 min
            </p>
            <button
              onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
              onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
              onClick={e => { e.stopPropagation(); onStart() }}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#1264E5', color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: '-.015em',
                transform: pressed ? 'translateY(2px)' : '',
                boxShadow: pressed ? '0 2px 0 #0a3fa0' : '0 4px 0 #0a3fa0, 0 6px 16px rgba(18,100,229,.35)',
                transition: 'transform .1s, box-shadow .1s',
                position: 'relative', overflow: 'hidden', fontFamily: 'inherit',
              }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', backgroundSize: '200% 100%', animation: 'exl-shimmer 2.5s infinite', pointerEvents: 'none' }} />
              Start today's quest →
            </button>
          </div>
        </div>

        {/* Weekly streak dots */}
        <div style={{ display: 'flex', gap: 5, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)', position: 'relative', zIndex: 1, alignItems: 'center' }}>
          {weekDots.map(({ label, isToday, done }, i) => {
            let bg = 'rgba(255,255,255,.04)', bd = 'rgba(255,255,255,.08)', col = 'rgba(255,255,255,.2)', txt = label[0]
            if (isToday) { bg = '#1264E5'; bd = '#1264E5'; col = '#fff'; txt = '●' }
            else if (done) { bg = 'rgba(24,183,242,.15)'; bd = 'rgba(24,183,242,.3)'; col = '#18B7F2'; txt = '✓' }
            return (
              <div key={i} style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: bg, border: `1px solid ${bd}`, color: col }}>{txt}</div>
            )
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ animation: 'exl-flame 1.8s ease-in-out infinite', display: 'inline-block' }}>🔥</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#FF6A00' }}>{streak} days</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const isDark   = useIsDark()
  const { userId } = useUser()

  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [weakTopics,    setWeakTopics]    = useState([])
  const [planItems,     setPlanItems]     = useState({})
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [practiceModal, setPracticeModal] = useState(null)
  const [sessionDays,   setSessionDays]   = useState({})
  const [realStreak,    setRealStreak]    = useState(0)
  const [leaderboard,   setLeaderboard]   = useState([])

  useEffect(() => { if (userId) load(userId) }, [userId]) // eslint-disable-line

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/leaderboard/global?limit=5')
          .then(r => r.json())
          .then(data => setLeaderboard(data.leaderboard ?? []))
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function load(uid) {
    const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()+6)%7)); d.setHours(0,0,0,0); return d.toISOString() })()
    try {
      const [{ data: prof }, { data: paths }, { data: mastery }, { data: streakRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
          .eq('student_id', uid),
        supabase.from('student_topic_mastery')
          .select('topic_id, score, topics(id, name, subject_id, subjects(name))')
          .eq('student_id', uid)
          .order('score', { ascending: true })
          .limit(6),
        supabase.from('student_streaks')
          .select('current_streak, last_active_date')
          .eq('student_id', uid)
          .maybeSingle(),
      ])

      setProfile(prof)

      const topicScoresBySubject = {}
      for (const m of mastery ?? []) {
        const sid = m.topics?.subject_id
        if (!sid) continue
        if (!topicScoresBySubject[sid]) topicScoresBySubject[sid] = []
        topicScoresBySubject[sid].push(m.score ?? 0)
      }

      const enriched = (paths ?? []).map(path => {
        const scores = topicScoresBySubject[path.subject_id] ?? []
        const pct = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        const total = (path.ordered_subtopic_ids ?? []).length
        const completed = scores.filter(s => s >= 50).length
        return { subject_id: path.subject_id, subjects: path.subjects, total, completed, pct }
      })
      setSubjects(enriched)

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

      const streak = streakRow?.current_streak ?? prof?.streak_days ?? 0
      setRealStreak(streak)

      // Non-blocking secondaries — fire after state is set
      supabase.from('question_attempts').select('created_at')
        .eq('student_id', uid).gte('created_at', weekStart)
        .then(r => {
          const rows = r.data ?? []
          const byDate = {}
          const sorted = [...rows].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
          let lastTs = null
          for (const a of sorted) {
            if (!a.created_at) continue
            const day = a.created_at.slice(0, 10)
            const ts  = new Date(a.created_at).getTime()
            if (!lastTs || ts - lastTs > 30 * 60 * 1000) byDate[day] = (byDate[day] ?? 0) + 1
            lastTs = ts
          }
          setSessionDays(byDate)
        }).catch(() => {})

      fetch('/api/student/next-topic')
        .then(r => r.json())
        .then(data => setPlanItems(data.topics ?? {}))
        .catch(() => {})

      fetch('/api/leaderboard/global?limit=5')
        .then(r => r.json())
        .then(data => setLeaderboard(data.leaderboard ?? []))
        .catch(() => {})

    } catch (err) {
      console.error('[dashboard load]', err?.message ?? err)
    } finally {
      setLoading(false)
    }
  }
  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName)
  const hasPath   = subjects.length > 0
  const firstSub  = subjects[0] ? { id: subjects[0].subject_id, name: subjects[0].subjects?.name ?? '' } : null
  const streakDays = profile?.streak_days ?? 0

  const coach = homeCoach({
    firstName,
    streakDays,
    weakTopics,
    yesterdayQs: profile?.yesterday_questions ?? 0,
    nextSubject: subjects[0]?.subjects?.name,
    nextTopic:   weakTopics[0]?.topicName,
    todayQs:     profile?.today_questions ?? 0,
  })

  function openPractice(sub, quickMode) {
    router.push('/student/practice/setup')
  }

  return (
    <>
      {/* Two-column layout on desktop: main feed left, activity+leaderboard right */}
      <style>{`
        @media (min-width: 1024px) {
          .dash-grid  { display: grid !important; grid-template-columns: 1fr 196px; gap: 20px; align-items: start; }
          .dash-right { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .dash-right { display: none !important; }
        }
      `}</style>

      <div className="dash-grid" style={{ display: 'block', paddingBottom: 112 }}>

        {/* ── LEFT: main feed ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {hasPath ? (
            <>
              {/* ── 1. Greeting + pills ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>{greeting.eyebrow}</p>
                  <p style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--text-prim)', lineHeight: 1.2 }}>{greeting.hero}</p>
                </div>
              </div>

              {/* ── 2. Zara coach banner ── */}
              <CoachBanner emoji={coach.emoji} message={coach.message} />

              {/* ── 3. Daily Quest card ── */}
              <DailyQuestCard subjects={subjects} weakTopics={weakTopics} streak={realStreak} sessionDays={sessionDays} onStart={() => router.push('/student/practice')} />

              {/* ── 4. Level up faster (weak topics) ── */}
              <NeedsAttention weakTopics={weakTopics} onPractise={t => openPractice(subjects.find(s => s.subjects?.name === t.subjectName) ?? firstSub)} />

              {/* ── 5. Subject mastery rows ── */}
              <SubjectsList subjects={subjects} onSeeAll={() => router.push('/student/learn')} />

              {/* ── 6. Target strip ── */}
              <TargetStrip profile={profile} onEdit={() => setShowGoalModal(true)} />
            </>
          ) : (
            <NoPathState profile={profile} onEdit={() => setShowGoalModal(true)} />
          )}
        </div>

        {/* ── RIGHT sidebar (desktop only) ── */}
        <div className="dash-right" style={{ display: 'none', flexDirection: 'column', gap: 10, paddingTop: 6, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
          <SidebarActivity sessionDays={sessionDays} streak={realStreak} />
          <SidebarClassRank leaderboard={leaderboard} myId={profile?.id} />
          <SidebarTarget profile={profile} onEdit={() => setShowGoalModal(true)} />
        </div>

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