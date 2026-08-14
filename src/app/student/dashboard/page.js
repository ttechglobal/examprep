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

// ── "Your target" strip ─────────────────────────────────────────────────────
function TargetStrip({ profile, onEdit }) {
  const course     = profile?.university_course?.trim() ?? ''
  const university = profile?.target_university?.trim() ?? ''
  const profession = profile?.desired_profession?.trim() ?? ''
  const examType   = profile?.exam_type ?? 'WAEC'
  const jambTotal  = profile?.jamb_total_target ?? 0
  const waecGrades = profile?.waec_target_grades ?? {}
  const hasAny     = course || university || profession

  const now      = new Date()
  const nextJune = new Date(now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear(), 5, 1)
  const daysLeft = Math.max(0, Math.ceil((nextJune - now) / 86400000))

  // Build exam label — never show "BOTH"
  const examLabels = examType === 'BOTH' ? ['WAEC', 'JAMB']
    : examType === 'JAMB' ? ['JAMB'] : ['WAEC']

  // Build score summary line
  const scoreLine = (() => {
    const parts = []
    if ((examType === 'WAEC' || examType === 'BOTH') && Object.keys(waecGrades).length > 0) {
      const grades = Object.values(waecGrades)
      const as = grades.filter(g => g === 'A1').length
      const bs = grades.filter(g => g === 'B2' || g === 'B3').length
      const cs = grades.filter(g => ['C4','C5','C6'].includes(g)).length
      const summary = [as>0?`${as} A${as!==1?'s':''}`:null, bs>0?`${bs} B${bs!==1?'s':''}`:null, cs>0?`${cs} C${cs!==1?'s':''}`:null].filter(Boolean).join(', ')
      if (summary) parts.push(`WAEC: ${summary}`)
    }
    if ((examType === 'JAMB' || examType === 'BOTH') && jambTotal > 0) {
      parts.push(`JAMB: ${jambTotal}/400`)
    }
    return parts.join(' · ')
  })()

  if (!hasAny) {
    return (
      <button onClick={onEdit} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:14, background:'var(--bg-card)', border:'1px solid var(--border)', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--bg-subtle)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🎯</div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-prim)', marginBottom:2 }}>Set your exam target</p>
          <p style={{ fontSize:11, color:'var(--text-sec)' }}>{examLabels.join(' & ')} — course, score, profession</p>
        </div>
        <span style={{ color:'var(--text-tert)', fontSize:16 }}>›</span>
      </button>
    )
  }

  const headline = course || profession || university

  return (
    <div style={{ padding:'13px 14px', borderRadius:14, background:'rgba(255,184,0,.07)', border:'1px solid rgba(255,184,0,.18)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>🎯</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:5, marginBottom:4, flexWrap:'wrap' }}>
            {examLabels.map(e => (
              <span key={e} style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:999, background: e==='JAMB'?'rgba(155,122,224,.15)':'rgba(34,197,94,.12)', color: e==='JAMB'?'#9b7ae0':'#22c55e', border:`1px solid ${e==='JAMB'?'rgba(155,122,224,.25)':'rgba(34,197,94,.2)'}` }}>{e}</span>
            ))}
          </div>
          <p style={{ fontSize:13, fontWeight:800, color:'var(--text-prim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:scoreLine?2:0 }}>{headline}</p>
          {scoreLine && <p style={{ fontSize:10, color:'var(--text-tert)' }}>{scoreLine}</p>}
        </div>
        <button onClick={onEdit} style={{ textAlign:'right', flexShrink:0, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          <p style={{ fontSize:20, fontWeight:900, color:'#FFB800', lineHeight:1 }}>{daysLeft}</p>
          <p style={{ fontSize:9, color:'var(--text-tert)' }}>days left</p>
        </button>
      </div>
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

// ── Soft diagnostic nudge — shown when no learning path, but NOT a blocker ────
function DiagnosticNudge({ profile, onEdit }) {
  return (
    <div style={{ background: 'rgba(18,100,229,.08)', border: '1px solid rgba(18,100,229,.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🎯</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 2 }}>Get a personalised path</p>
        <p style={{ fontSize: 11, color: 'var(--text-tert)', lineHeight: 1.4 }}>Take a quick diagnostic and we'll focus your practice on weak areas.</p>
      </div>
      <Link href="/diagnostic" style={{ padding: '8px 13px', borderRadius: 10, background: '#1264E5', color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Start →
      </Link>
    </div>
  )
}

// ── Right sidebar: Activity chart ─────────────────────────────────────────────
// Matches prototype exactly: small bar chart Mon–Sun + streak label
function SidebarActivity({ sessionDays, streak = 0 }) {
  const isDark = useIsDark()
  const today = new Date()

  // Always Mon–Sun of the current week
  const dow = today.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysSinceMon = (dow + 6) % 7
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() - daysSinceMon)
  thisMonday.setHours(0, 0, 0, 0)
  const todayKey = today.toISOString().slice(0, 10)
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const key      = d.toISOString().slice(0, 10)
    const isToday  = key === todayKey
    const isFuture = d > today
    return { key, label: DAY_LABELS[i], count: isFuture ? 0 : (sessionDays[key] ?? 0), isToday, isFuture }
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
            const col  = day.isFuture
              ? (isDark ? 'rgba(255,255,255,.03)' : '#f8fafc')
              : day.count > 0
              ? (day.isToday ? '#1264E5' : isDark ? 'rgba(24,183,242,.5)' : '#5cb8ea')
              : (isDark ? 'rgba(255,255,255,.07)' : '#e8eef8')
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', height: barH, borderRadius: '3px 3px 1px 1px', background: col }} />
                <span style={{ fontSize: 7, fontWeight: day.isToday ? 700 : 400, color: day.isFuture ? (isDark ? 'rgba(255,255,255,.15)' : '#d1d5db') : day.isToday ? '#1264E5' : 'var(--text-tert)', lineHeight: 1 }}>{day.label.slice(0, 1)}</span>
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
function SidebarClassRank({ leaderboard, myId, scope = 'national' }) {
  const medals = ['🥇', '🥈', '🥉']
  const { totalPoints: liveXP } = usePoints()
  const scopeLabel = scope === 'class' ? 'Class' : scope === 'school' ? 'School' : 'National'

  if (!leaderboard.length) return (
    <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Leaderboard</p>
        <Link href="/student/community" style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', textDecoration: 'none' }}>See all →</Link>
      </div>
      <div style={{ padding: '14px 13px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>Start practising to appear here!</p>
      </div>
    </div>
  )

  return (
    <div style={{ borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 13px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-prim)' }}>Leaderboard</p>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(24,183,242,.12)', color: '#18B7F2' }}>{scopeLabel}</span>
        </div>
        <Link href="/student/community" style={{ fontSize: 10, fontWeight: 700, color: '#18B7F2', textDecoration: 'none' }}>Full board →</Link>
      </div>
      <div>
        {leaderboard.slice(0, 5).map((entry, i) => {
          const isMe = entry.student_id === myId
          const pts  = isMe ? liveXP : (entry.points ?? 0)
          // API returns first_name or full_name depending on source
          const name = isMe ? 'You' : (entry.first_name ?? entry.full_name?.split(' ')[0] ?? 'Student')
          return (
            <div key={entry.student_id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', background: isMe ? 'rgba(24,183,242,.07)' : 'transparent' }}>
              <span style={{ fontSize: i < 3 ? 12 : 10, fontWeight: 800, color: 'var(--text-tert)', minWidth: 16, textAlign: 'center', flexShrink: 0 }}>
                {i < 3 ? medals[i] : `${i + 1}`}
              </span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 500, color: isMe ? '#18B7F2' : 'var(--text-prim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
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

// ── Downloads button — simple nav row ────────────────────────────────────────
function DownloadsCard() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/student/downloads')}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        transition: 'border-color .15s',
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(18,100,229,.1)', border: '1px solid rgba(18,100,229,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
        📥
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-prim)', marginBottom: 1 }}>Download past questions</p>
        <p style={{ fontSize: 11, color: 'var(--text-tert)' }}>Practise offline — no internet needed</p>
      </div>
      <span style={{ fontSize: 16, color: 'var(--text-tert)', flexShrink: 0 }}>›</span>
    </button>
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
        padding: '22px 18px',
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
  const [lboardScope,   setLboardScope]   = useState('national') // 'class' | 'school' | 'national'

  useEffect(() => { if (userId) load(userId) }, [userId]) // eslint-disable-line

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLeaderboard()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Cascade: class → school cohort → national
  async function fetchLeaderboard() {
    try {
      // 1. Try class leaderboard
      const classRes = await fetch('/api/leaderboard/class?limit=5').then(r => r.json()).catch(() => ({}))
      if (classRes.leaderboard?.length) {
        setLeaderboard(classRes.leaderboard.slice(0, 5))
        setLboardScope('class')
        return
      }
      // 2. Try school cohort leaderboard
      const cohortRes = await fetch('/api/leaderboard/cohort?scope=school&limit=5').then(r => r.json()).catch(() => ({}))
      if (cohortRes.leaderboard?.length) {
        setLeaderboard(cohortRes.leaderboard.slice(0, 5))
        setLboardScope('school')
        return
      }
      // 3. Fall back to national
      const globalRes = await fetch('/api/leaderboard/global?limit=5').then(r => r.json()).catch(() => ({}))
      setLeaderboard(globalRes.leaderboard ?? [])
      setLboardScope('national')
    } catch { /* silent */ }
  }

  async function load(uid) {
    const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()+6)%7)); d.setHours(0,0,0,0); return d.toISOString() })()
    try {
      const [{ data: prof }, { data: paths }, { data: masteryFlat }, { data: streakRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
          .eq('student_id', uid),
        // Flat select — no join, student_topic_mastery FK not exposed via PostgREST
        supabase.from('student_topic_mastery')
          .select('topic_id, score')
          .eq('student_id', uid)
          .order('score', { ascending: true })
          .limit(50),
        supabase.from('student_streaks')
          .select('current_streak, last_active_date')
          .eq('student_id', uid)
          .maybeSingle(),
      ])

      setProfile(prof)

      // Fetch topic details separately
      const mTopicIds = (masteryFlat ?? []).map(r => r.topic_id).filter(Boolean)
      const { data: mTopics } = mTopicIds.length > 0
        ? await supabase.from('topics').select('id, name, subject_id').in('id', mTopicIds)
        : { data: [] }
      const mTopicMap = {}
      for (const t of mTopics ?? []) mTopicMap[t.id] = t

      // Enrich mastery rows
      const mastery = (masteryFlat ?? []).map(m => ({
        ...m,
        topics: mTopicMap[m.topic_id] ?? null,
      })).filter(m => m.topics)

      const topicScoresBySubject = {}
      for (const m of mastery) {
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
        .map(m => {
          const subjectPath = paths?.find(p => p.subject_id === m.topics?.subject_id)
          return {
            topicId:     m.topic_id,
            topicName:   m.topics?.name ?? '',
            subjectName: subjectPath?.subjects?.name ?? '',
            pct:         Math.round(m.score ?? 0),
          }
        })
      setWeakTopics(weak)

      const streak = streakRow?.current_streak ?? prof?.streak_days ?? 0
      setRealStreak(streak)

      // Non-blocking secondaries — fire after state is set
      const fourteenDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 14); d.setHours(0,0,0,0); return d.toISOString() })()
      supabase.from('question_attempts').select('created_at')
        .eq('student_id', uid).gte('created_at', fourteenDaysAgo)
        .then(r => {
          const rows = r.data ?? []
          const byDate = {}
          // Count attempts per day first (simpler and more reliable than 30-min session gaps)
          for (const a of rows) {
            if (!a.created_at) continue
            const day = a.created_at.slice(0, 10)
            byDate[day] = (byDate[day] ?? 0) + 1
          }
          // Convert attempt counts to session counts (1 session per active day)
          const sessionsByDay = {}
          for (const [day, count] of Object.entries(byDate)) {
            if (count > 0) sessionsByDay[day] = 1
          }
          setSessionDays(sessionsByDay)
        }).catch(() => {})

      fetch('/api/student/next-topic')
        .then(r => r.json())
        .then(data => setPlanItems(data.topics ?? {}))
        .catch(() => {})

      fetchLeaderboard()

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
          .dash-grid  { display: grid !important; grid-template-columns: 1fr 240px; gap: 24px; align-items: start; }
          .dash-right { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .dash-right { display: none !important; }
        }
      `}</style>

      <div className="dash-grid" style={{ display: 'block', paddingBottom: 112 }}>

        {/* ── LEFT: main feed ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ── 1. Greeting + pills ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--text-tert)', marginBottom: 3 }}>{greeting.eyebrow}</p>
                  <p style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--text-prim)', lineHeight: 1.2 }}>{greeting.hero}</p>
                </div>
              </div>

              {/* ── 2. Zara coach banner ── */}
              <CoachBanner emoji={coach.emoji} message={coach.message} />

              {/* ── 2b. Soft diagnostic nudge (only when no path) ── */}
              {!hasPath && <DiagnosticNudge profile={profile} onEdit={() => setShowGoalModal(true)} />}

              {/* ── 3. Daily Quest card ── */}
              <DailyQuestCard subjects={subjects} weakTopics={weakTopics} streak={realStreak} sessionDays={sessionDays} onStart={() => setPracticeModal(firstSub ?? { id: null, name: '' })} />

              {/* ── 4. Downloads card ── */}
              <DownloadsCard />

              {/* ── 5. Target strip ── */}
              <TargetStrip profile={profile} onEdit={() => setShowGoalModal(true)} />
        </div>

        {/* ── RIGHT sidebar (desktop only) ── */}
        <div className="dash-right" style={{ display: 'none', flexDirection: 'column', gap: 10, paddingTop: 6, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 170px)', overflowY: 'auto' }}>
          <SidebarActivity sessionDays={sessionDays} streak={realStreak} />
          <SidebarClassRank leaderboard={leaderboard} myId={profile?.id} scope={lboardScope} />
          <SidebarTarget profile={profile} onEdit={() => setShowGoalModal(true)} />
        </div>

      </div>

      {/* Goal modal */}
      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            key={profile?.id ?? 'goal'}
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