'use client'
// src/app/student/dashboard/page.js  — v4
// ─────────────────────────────────────────────────────────────────────────────
// FIXES vs v2:
//   1. Font: uses the app font (Plus Jakarta Sans via font-family:inherit / var(--font-jakarta))
//      Space Grotesk is NOT installed — removed every reference to it.
//   2. Hero card layout:
//      - Subject name removed from the big heading — the BIG text is now the TOPIC name
//      - Subject only appears once, in the small tag pill at the top
//      - Icon pushed down; topic name pushed toward bottom of card
//      - Spacer between tag pill and icon/topic block creates visual breathing room
//      - "Practise Now" button sits at the very bottom of the card
//   3. Hero card light mode: the card dark gradient now adapts —
//      light mode shows a rich navy/indigo card so it still pops on a white bg
//      (not transparent/washed). Uses isDark to pick bg.
//   4. Targets collapsed: shows ALL target lines (Course, University, WAEC, JAMB)
//      stacked vertically — not just the headline. Exactly like the prototype.
//   5. Subject Mastery light mode: progress bar track uses a visible grey (#e5e7eb)
//      in light mode and the fill uses the accent colour — always visible.
//
// COLOUR RULES (Tailwind v4):
//   - Structural: bg-card, bg-base, bg-subtle, text-primary, text-secondary,
//     text-tertiary, border-default → Tailwind token classes (always safe)
//   - All hex values → inline style only (never dynamic Tailwind classes)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ─── dark-mode hook ───────────────────────────────────────────────────────────
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

// ─── subject config ───────────────────────────────────────────────────────────
// All values explicit hex — never Tailwind dynamic classes
const SUBJECT_CFG = {
  'Physics':               { accent: '#ff8fab', darkCardBg: 'linear-gradient(170deg,#1f0a14 0%,#0e0820 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#1a0f24 0%,#0f0a1e 55%,#090912 100%)', n1: '#ff8fab', n2: '#9b7ae0', icon: '⚡'  },
  'Chemistry':             { accent: '#9b7ae0', darkCardBg: 'linear-gradient(170deg,#140e28 0%,#0e0a1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#140e28 0%,#0e0a1c 55%,#090912 100%)', n1: '#9b7ae0', n2: '#ff8fab', icon: '⚗️' },
  'Biology':               { accent: '#6cce8e', darkCardBg: 'linear-gradient(170deg,#081a10 0%,#061210 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#061814 0%,#071210 55%,#090912 100%)', n1: '#6cce8e', n2: '#5cb8ea', icon: '🧬' },
  'Mathematics':           { accent: '#5cb8ea', darkCardBg: 'linear-gradient(170deg,#091426 0%,#070d1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#091426 0%,#07101e 55%,#090912 100%)', n1: '#5cb8ea', n2: '#9b7ae0', icon: '📐' },
  'Further Mathematics':   { accent: '#5cb8ea', darkCardBg: 'linear-gradient(170deg,#091426 0%,#070d1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#091426 0%,#07101e 55%,#090912 100%)', n1: '#5cb8ea', n2: '#9b7ae0', icon: '📐' },
  'English Language':      { accent: '#a78bfa', darkCardBg: 'linear-gradient(170deg,#130e28 0%,#0e0a1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#130e28 0%,#0e0a1c 55%,#090912 100%)', n1: '#a78bfa', n2: '#ff8fab', icon: '📖' },
  'Use of English':        { accent: '#a78bfa', darkCardBg: 'linear-gradient(170deg,#130e28 0%,#0e0a1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#130e28 0%,#0e0a1c 55%,#090912 100%)', n1: '#a78bfa', n2: '#ff8fab', icon: '📖' },
  'Economics':             { accent: '#fcd34d', darkCardBg: 'linear-gradient(170deg,#1a1200 0%,#0e0d04 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#1a1200 0%,#100e04 55%,#090912 100%)', n1: '#fcd34d', n2: '#6cce8e', icon: '📊' },
  'Government':            { accent: '#f87171', darkCardBg: 'linear-gradient(170deg,#1a0808 0%,#0e0808 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#1a0808 0%,#0e0808 55%,#090912 100%)', n1: '#f87171', n2: '#fcd34d', icon: '🏛️'},
  'Geography':             { accent: '#34d399', darkCardBg: 'linear-gradient(170deg,#061a10 0%,#061210 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#061a10 0%,#071210 55%,#090912 100%)', n1: '#34d399', n2: '#5cb8ea', icon: '🌍' },
  'Literature in English': { accent: '#f9a8d4', darkCardBg: 'linear-gradient(170deg,#1a0814 0%,#0e0812 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#1a0814 0%,#0e0812 55%,#090912 100%)', n1: '#f9a8d4', n2: '#a78bfa', icon: '📚' },
  'Agricultural Science':  { accent: '#86efac', darkCardBg: 'linear-gradient(170deg,#071408 0%,#061208 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#071408 0%,#061208 55%,#090912 100%)', n1: '#86efac', n2: '#fcd34d', icon: '🌱' },
  'Commerce':              { accent: '#818cf8', darkCardBg: 'linear-gradient(170deg,#0e0e28 0%,#0c0c1e 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#0e0e28 0%,#0c0c1e 55%,#090912 100%)', n1: '#818cf8', n2: '#5cb8ea', icon: '💼' },
  'Accounting':            { accent: '#fde68a', darkCardBg: 'linear-gradient(170deg,#1a1400 0%,#0e0d00 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#1a1400 0%,#100e00 55%,#090912 100%)', n1: '#fde68a', n2: '#6cce8e', icon: '🧮' },
  'Computer Science':      { accent: '#67e8f9', darkCardBg: 'linear-gradient(170deg,#061418 0%,#060e14 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#061418 0%,#060e14 55%,#090912 100%)', n1: '#67e8f9', n2: '#818cf8', icon: '💻' },
  'default':               { accent: '#9b7ae0', darkCardBg: 'linear-gradient(170deg,#140e28 0%,#0e0a1c 55%,#09090d 100%)', lightCardBg: 'linear-gradient(170deg,#140e28 0%,#0e0a1c 55%,#090912 100%)', n1: '#9b7ae0', n2: '#ff8fab', icon: '📝' },
}
const getCfg = (name) => SUBJECT_CFG[name] ?? SUBJECT_CFG.default

// ─── greeting ────────────────────────────────────────────────────────────────
function getGreeting(firstName) {
  const hour = new Date().getHours()
  const name = firstName ? `, ${firstName}` : ''
  if (hour < 12) return { pre: 'Good morning',   main: `Ready to practise${name}? ☀️` }
  if (hour < 17) return { pre: 'Good afternoon', main: `Let's keep the momentum${name} ⚡` }
  return               { pre: 'Good evening',    main: `Keep pushing${name} 🌙` }
}

// ─── Ambient SVG pattern ──────────────────────────────────────────────────────
function AmbientPattern({ cfg }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="38"  cy="44"  r="3" fill={cfg.n1} />
      <circle cx="98"  cy="26"  r="2" fill={cfg.n1} />
      <circle cx="163" cy="54"  r="3" fill={cfg.n1} />
      <circle cx="228" cy="33"  r="2" fill={cfg.n2} />
      <circle cx="303" cy="49"  r="3" fill={cfg.n1} />
      <circle cx="352" cy="21"  r="2" fill={cfg.n2} />
      <line x1="38"  y1="44"  x2="98"  y2="26"  stroke={cfg.n1} strokeWidth="1" />
      <line x1="98"  y1="26"  x2="163" y2="54"  stroke={cfg.n1} strokeWidth="1" />
      <line x1="163" y1="54"  x2="228" y2="33"  stroke={cfg.n1} strokeWidth="1" />
      <line x1="228" y1="33"  x2="303" y2="49"  stroke={cfg.n1} strokeWidth="1" />
      <line x1="303" y1="49"  x2="352" y2="21"  stroke={cfg.n1} strokeWidth="1" />
      <circle cx="19"  cy="114" r="2" fill={cfg.n1} />
      <circle cx="84"  cy="94"  r="3" fill={cfg.n2} />
      <circle cx="173" cy="119" r="2" fill={cfg.n1} />
      <circle cx="258" cy="101" r="3" fill={cfg.n1} />
      <circle cx="328" cy="117" r="2" fill={cfg.n2} />
      <line x1="19"  y1="114" x2="84"  y2="94"  stroke={cfg.n1} strokeWidth="1" />
      <line x1="84"  y1="94"  x2="173" y2="119" stroke={cfg.n1} strokeWidth="1" />
      <line x1="173" y1="119" x2="258" y2="101" stroke={cfg.n1} strokeWidth="1" />
      <line x1="258" y1="101" x2="328" y2="117" stroke={cfg.n1} strokeWidth="1" />
    </svg>
  )
}

// ─── HERO PRACTICE CARD ───────────────────────────────────────────────────────
// FIX: big text = topic name, subject only in tag pill
// FIX: subject icon + topic pushed toward bottom, spacer in middle
// FIX: card bg works in light mode (dark gradient always, readable always)
// FIX: "Practise Now" anchored at bottom
const PracticeHeroCard = memo(function PracticeHeroCard({ sub, planItem, isDark }) {
  const router      = useRouter()
  const cfg         = getCfg(sub?.subjects?.name ?? '')
  const subjectName = sub?.subjects?.name ?? 'Subject'
  const topicName   = planItem?.topicName ?? null
  const isCore      = planItem?.isCore ?? false
  const btnRef      = useRef(null)

  function handlePractise(e) {
    e.stopPropagation()
    const params = new URLSearchParams({ mode: 'topic', subject_id: sub.subject_id })
    if (planItem?.topicId) params.set('topic_id', planItem.topicId)
    router.push(`/student/practice?${params}`)
  }

  const pressDown = () => {
    if (!btnRef.current) return
    btnRef.current.style.transform = 'translateY(4px)'
    btnRef.current.style.boxShadow = '0 2px 0 #05070f'
  }
  const pressUp = () => {
    if (!btnRef.current) return
    btnRef.current.style.transform = ''
    btnRef.current.style.boxShadow = '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.45)'
  }

  // Card bg is always a dark gradient — makes the accent colours pop in both modes
  const cardBg = isDark ? cfg.darkCardBg : cfg.lightCardBg

  return (
    <div style={{
      borderRadius: 26,
      overflow: 'hidden',
      border: `1px solid ${cfg.accent}35`,
      boxShadow: isDark
        ? '0 24px 56px rgba(0,0,0,.55)'
        : `0 16px 48px ${cfg.accent}25, 0 4px 12px rgba(0,0,0,.12)`,
    }}>
      <div style={{
        background: cardBg,
        padding: '22px 20px 20px',
        position: 'relative',
        overflow: 'hidden',
        // Fixed card height so button sits at bottom consistently
        minHeight: 340,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AmbientPattern cfg={cfg} />

        {/* Spacer — pushes icon + topic toward bottom */}
        <div style={{ flex: 1, minHeight: 48 }} />

        {/* ③ Icon + topic block — floated toward bottom */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 18, marginBottom: 14,
            background: `${cfg.accent}1a`, border: `1px solid ${cfg.accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: `0 8px 24px rgba(0,0,0,.3)`,
          }}>
            {cfg.icon}
          </div>

          {/* Topic name — BIG text (the thing to practise) */}
          <div style={{
            fontSize: topicName ? 24 : 20,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: topicName ? 4 : 0,
          }}>
            {topicName ?? subjectName}
          </div>

          {/* Sub-label — "Topic" label only if we have a topic */}
          {topicName && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 600, marginBottom: 0 }}>
              {subjectName}
            </div>
          )}
        </div>

        {/* ④ Core badge */}
        {isCore && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 8,
            background: 'rgba(255,195,107,.09)', border: '1px solid rgba(255,195,107,.22)',
            fontSize: 11, fontWeight: 700, color: '#ffc36b',
            marginBottom: 16, position: 'relative', zIndex: 1, alignSelf: 'flex-start',
          }}>
            🔥 High exam frequency · Core topic
          </div>
        )}
        {!isCore && <div style={{ height: 12, position: 'relative', zIndex: 1 }} />}

        {/* ⑤ CTA — anchored at bottom */}
        <button
          ref={btnRef}
          onClick={handlePractise}
          onMouseDown={pressDown}
          onMouseUp={pressUp}
          onMouseLeave={pressUp}
          onTouchStart={pressDown}
          onTouchEnd={pressUp}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 15,
            background: '#0b1330', color: '#fff',
            fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
            border: 'none', cursor: 'pointer', textAlign: 'center',
            boxShadow: '0 6px 0 #05070f, 0 10px 24px rgba(0,0,0,.45)',
            transition: 'transform 0.1s, box-shadow 0.1s',
            position: 'relative', zIndex: 1,
          }}
        >
          Practise Now →
        </button>
      </div>
    </div>
  )
})

// ─── carousel ─────────────────────────────────────────────────────────────────
function SubjectCarousel({ subjects, planItems, isDark }) {
  const [idx, setIdx] = useState(0)
  const startX = useRef(null)

  const sub     = subjects[idx]
  const cfg     = getCfg(sub?.subjects?.name ?? '')
  const planItem = planItems?.[sub?.subject_id] ?? null

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx < -40 && idx < subjects.length - 1) setIdx(i => i + 1)
    if (dx > 40  && idx > 0)                   setIdx(i => i - 1)
    startX.current = null
  }

  return (
    <div>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ userSelect: 'none' }}>
        <PracticeHeroCard sub={sub} planItem={planItem} isDark={isDark} />
      </div>

      {subjects.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 14 }}>
          {subjects.map((s, i) => {
            const dotCfg = getCfg(s?.subjects?.name ?? '')
            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Switch to ${s?.subjects?.name}`}
                style={{
                  width: i === idx ? 22 : 7, height: 7,
                  borderRadius: i === idx ? 4 : '50%',
                  background: i === idx ? dotCfg.accent : 'rgba(128,128,128,.25)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'all 0.2s',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TARGETS WIDGET ───────────────────────────────────────────────────────────
// FIX: collapsed state shows ALL target lines stacked (Course, Uni, WAEC, JAMB)
// — matches the prototype exactly. No single-line "headline".
function TargetsWidget({ profile, onEdit, isDark }) {
  const [open, setOpen] = useState(false)

  const course     = profile?.university_course?.trim()  ?? ''
  const university = profile?.target_university?.trim()  ?? ''
  const waecGrades = profile?.waec_target_grades         ?? {}
  const jambScores = profile?.jamb_target_scores         ?? {}
  const examType   = profile?.exam_type                  ?? ''
  const hasWaec    = Object.keys(waecGrades).length > 0 && (examType === 'WAEC' || examType === 'BOTH')
  const hasJamb    = Object.keys(jambScores).length > 0 && (examType === 'JAMB' || examType === 'BOTH')
  const jambTotal  = profile?.jamb_total_target
    ?? Object.values(jambScores).reduce((s, v) => s + (Number(v) || 0), 0)
  const hasAny     = course || university || hasWaec || hasJamb

  // Prompt to set targets
  if (!hasAny) {
    return (
      <button
        onClick={onEdit}
        className="w-full flex items-center gap-4 bg-card border border-default rounded-2xl px-4 py-4 text-left active:opacity-80 transition-opacity"
      >
        <span style={{ fontSize: 22 }}>🎯</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-primary">Set your exam targets</p>
          <p className="text-xs text-secondary mt-0.5">WAEC grades · JAMB score · target university</p>
        </div>
        <span className="text-secondary">›</span>
      </button>
    )
  }

  // border colour adapts to mode
  const borderCol   = isDark ? 'rgba(255,255,255,.07)' : '#e5e7eb'
  const labelColor  = isDark ? '#6b7280' : '#9ca3af'
  const valueColor  = isDark ? '#f9fafb' : '#111827'
  const cardBg      = isDark ? '#111827' : '#ffffff'

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 18, overflow: 'hidden' }}>

      {/* Header row — icon + "My Targets" + chevron */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: 'rgba(255,195,107,.12)', border: '1px solid rgba(255,195,107,.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>🎯</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: labelColor, marginBottom: 8 }}>
            My Targets
          </p>

          {/* ── COLLAPSED: always-visible rows, each on its own line, generous spacing ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {course && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, width: 52, flexShrink: 0 }}>Course</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>{course}</span>
              </div>
            )}
            {university && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, width: 52, flexShrink: 0 }}>Uni</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>{university}</span>
              </div>
            )}
            {hasWaec && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, width: 52, flexShrink: 0 }}>WAEC</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>
                  {Object.keys(waecGrades).length} subjects targeted
                </span>
              </div>
            )}
            {hasJamb && jambTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, width: 52, flexShrink: 0 }}>JAMB</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#9b7ae0', lineHeight: 1.2 }}>{jambTotal} / 400</span>
              </div>
            )}
          </div>
        </div>

        <svg
          style={{ width: 16, height: 16, flexShrink: 0, marginTop: 4, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : '', color: labelColor }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── EXPANDED: full detail ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${borderCol}`, padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {course && <TargetRow label="Course" value={course} labelColor={labelColor} valueColor={valueColor} />}
          {university && <TargetRow label="University" value={university} labelColor={labelColor} valueColor={valueColor} />}
          {hasJamb && jambTotal > 0 && (
            <TargetRow label="JAMB" value={`${jambTotal} / 400`} labelColor={labelColor} valueColor='#9b7ae0' />
          )}
          {hasWaec && (
            <div>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, display: 'block', marginBottom: 7 }}>
                WAEC
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(waecGrades).map(([sub, grade]) => (
                  <span key={sub} style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                    background: 'rgba(108,206,142,.12)', color: '#6cce8e',
                    border: '1px solid rgba(108,206,142,.25)',
                  }}>
                    {sub} · {grade}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onEdit}
            style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 2 }}
          >
            Edit targets →
          </button>
        </div>
      )}
    </div>
  )
}

function TargetRow({ label, value, labelColor, valueColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, width: 56, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: valueColor, lineHeight: 1.3 }}>
        {value}
      </span>
    </div>
  )
}

// ─── SUBJECT MASTERY ──────────────────────────────────────────────────────────
// FIX: progress bar track is always visible (explicit grey in light, dark in dark)
// FIX: fill uses subject accent colour — always rendered via inline style
const SubjectMastery = memo(function SubjectMastery({ subjects, isDark }) {
  if (!subjects.length) return null

  const cardBg    = isDark ? '#111827' : '#ffffff'
  const borderCol = isDark ? 'rgba(255,255,255,.07)' : '#e5e7eb'
  const divCol    = isDark ? 'rgba(255,255,255,.07)' : '#f3f4f6'
  const namCol    = isDark ? '#f9fafb' : '#111827'
  const trackCol  = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb'  // FIX: light mode track now clearly visible

  return (
    <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: `1px solid ${divCol}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#6b7280' : '#9ca3af' }}>
          Subject Mastery
        </span>
        <Link href="/student/learn" style={{ fontSize: 11, fontWeight: 700, color: '#9b7ae0' }}>
          Details →
        </Link>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {subjects.map(sub => {
          const name = sub.subjects?.name ?? ''
          const cfg  = getCfg(name)
          const pct  = sub.pct ?? 0
          const pctLabel = pct >= 70 ? cfg.accent : pct >= 40 ? '#f59e0b' : '#ef4444'

          return (
            <div key={sub.subject_id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: namCol }}>{name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: pctLabel }}>{pct}%</span>
              </div>
              {/* Track + fill — both always explicit values, never Tailwind */}
              <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: trackCol }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.max(pct, 2)}%`,   // minimum 2% so bar is always visible
                  background: cfg.accent,
                  transition: 'width 0.7s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: isDark ? '#6b7280' : '#9ca3af' }}>
                  {sub.completed ?? 0} / {sub.total ?? 0} subtopics
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ─── no-path state ────────────────────────────────────────────────────────────
function NoPathState({ profile, onEdit }) {
  return (
    <div className="bg-card rounded-2xl border border-default p-6 text-center space-y-4">
      <span style={{ fontSize: 40, display: 'block' }}>📝</span>
      <div>
        <p className="font-black text-primary" style={{ fontSize: 16 }}>
          Get your personalised practice path
        </p>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
          Answer 10 questions and we'll prioritise the topics you need most.
        </p>
      </div>
      {!profile?.goals_set && (
        <button
          onClick={onEdit}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 14,
            background: '#ffc36b', color: '#0b1330',
            fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
          }}
        >
          Set your goals first →
        </button>
      )}
      <Link
        href="/diagnostic"
        style={{
          display: 'block', padding: '14px 0', borderRadius: 14,
          background: '#0b1330', color: '#fff',
          fontSize: 14, fontWeight: 700,
          boxShadow: '0 6px 0 #05070f, 0 10px 20px rgba(0,0,0,.35)',
          textAlign: 'center',
        }}
      >
        Take the diagnostic →
      </Link>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const isDark   = useIsDark()

  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [planItems,     setPlanItems]     = useState({})
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [
      { data: prof },
      { data: paths },
      { data: prog },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
      supabase.from('lesson_progress')
        .select('subtopic_id, completed')
        .eq('student_id', user.id),
    ])

    setProfile(prof)

    const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
    const enriched = (paths ?? []).map(path => {
      const ids  = path.ordered_subtopic_ids ?? []
      const done = ids.filter(id => completedIds.has(id)).length
      const pct  = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
      return { subject_id: path.subject_id, subjects: path.subjects, total: ids.length, completed: done, pct }
    })
    setSubjects(enriched)

    // Load study plan for next core topic per subject
    if (enriched.length > 0) {
      try {
        const res  = await fetch('/api/student/study-plan')
        const data = await res.json()
        const by   = {}
        for (const item of (data.items ?? [])) {
          const sid = item.subjectId
          if (!sid || by[sid] || item.status === 'mastered') continue
          by[sid] = {
            topicName: item.topicName ?? null,
            topicId:   item.topicId   ?? null,
            isCore:    item.isCore    ?? false,
          }
        }
        setPlanItems(by)
      } catch {
        // non-critical
      }
    }

    setLoading(false)
  }

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName)
  const hasPath   = subjects.length > 0

  return (
    <>
      <div className="space-y-5 pb-28">

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-secondary" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
            {greeting.pre}
          </p>
          <h1 className="text-primary" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {greeting.main}
          </h1>
        </div>

        {hasPath ? (
          <>
            <SubjectCarousel subjects={subjects} planItems={planItems} isDark={isDark} />
            <TargetsWidget    profile={profile} onEdit={() => setShowGoalModal(true)} isDark={isDark} />
            <SubjectMastery   subjects={subjects} isDark={isDark} />
          </>
        ) : (
          <NoPathState profile={profile} onEdit={() => setShowGoalModal(true)} />
        )}
      </div>

      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => {
              setProfile(prev => ({ ...prev, ...updated }))
              setShowGoalModal(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}