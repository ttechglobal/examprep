'use client'
// src/app/diagnostic/results/page.js — v2
// REDESIGN: matches prototype screen 3 exactly.
// KEY VISUAL DETAILS FROM PROTOTYPE:
//   • Dark bg (#0d0e14)
//   • app-bar: logo-row (E mark + "Exam Prep") LEFT, xp-pill RIGHT
//     xp-pill: bg rgba(255,195,107,.1) border rgba(255,195,107,.2) color gold
//   • scroll-zone: padding 20px 18px 24px, gap 14px
//   • score-ring-wrap: flex-col, align-center, padding 20px 0 10px
//     SVG: 130×130, r=52, stroke-width=10
//     ring stroke: #9b7ae0 with filter drop-shadow(0 0 16px rgba(155,122,224,.35))
//     text line 1: 28px 800 fill #eef0fa y=60 → "60%"
//     text line 2: 11px fill #7b7f9e y=78 → tier label "Building"
//   • Below ring: subject name 16px 800, encouraging copy 12px dim, max-width 260px
//   • Weak topics callout:
//     bg rgba(239,93,78,.08) border rgba(239,93,78,.2) border-radius 16px padding 14px
//     label: t-label style, color danger, "🎯 Focus here first", margin-bottom 10px
//     rows: topic-result-row = flex, gap 10px, padding 10px 0, border-bottom
//       tr-name: flex:1, 12px 700 text
//       tr-bar-wrap: width 60px, height 4px, bg rgba(255,255,255,.06), overflow hidden
//       tr-bar-fill: h 100%, border-radius 2px, color by score
//       tr-pct: 11px 800
//   • "All topics" widget: .widget card (bg surface, border, radius 18px)
//     widget-header: padding 11px 14px, border-bottom, t-label "All topics"
//     widget-body: padding 6px 14px
//     same topic-result-row pattern, last one has no border-bottom
//   • "View my practice plan →" navy 3D CTA
//   • Score ring animates strokeDasharray on mount

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const C = {
  bg:      '#0d0e14',
  surface: '#13141f',
  border:  'rgba(255,255,255,0.07)',
  text:    '#eef0fa',
  dim:     '#7b7f9e',
  chem:    '#9b7ae0',
  success: '#6cce8e',
  danger:  '#ef5d4e',
  gold:    '#ffc36b',
  navy:    '#0b1330',
  navyDeep:'#05070f',
}

// Ring circumference for r=52: 2π×52 ≈ 326.7
const CIRC = 326.73

function getScoreTier(pct) {
  if (pct >= 80) return { label: 'Excellent',      ring: '#6cce8e' }
  if (pct >= 60) return { label: 'Good',            ring: '#5cb8ea' }
  if (pct >= 40) return { label: 'Building',        ring: C.chem   }
  return              { label: 'Getting started',  ring: C.danger  }
}

function getEncouragement(pct) {
  if (pct >= 80) return "Outstanding! You have a strong foundation — let's sharpen the edges."
  if (pct >= 60) return "Good performance! A few focused sessions will push you much higher."
  if (pct >= 40) return "Focused practice on weak areas will close these gaps fast. Your plan is ready."
  return "Great start — every expert was once a beginner. Your plan is ready."
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, ringColor }) {
  const [dash, setDash] = useState(0)
  const [disp, setDisp] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      setDash(CIRC * pct / 100)
      setDisp(pct)
    }, 80)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <svg
      width="130" height="130" viewBox="0 0 130 130"
      style={{ filter: `drop-shadow(0 0 16px rgba(155,122,224,.35))` }}
    >
      {/* track */}
      <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10"/>
      {/* fill */}
      <circle
        cx="65" cy="65" r="52" fill="none"
        stroke={ringColor} strokeWidth="10"
        strokeDasharray={`${dash} ${CIRC}`}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* score text */}
      <text x="65" y="60" textAnchor="middle"
        fill={C.text} fontSize="28" fontWeight="800" fontFamily="inherit">
        {disp}%
      </text>
      {/* tier text */}
      <text x="65" y="78" textAnchor="middle"
        fill={C.dim} fontSize="11" fontFamily="inherit">
        {getScoreTier(pct).label}
      </text>
    </svg>
  )
}

// ── Topic result row ──────────────────────────────────────────────────────────
function TopicRow({ name, pct, isLast }) {
  const color = pct >= 70 ? C.success : pct >= 40 ? C.gold : C.danger
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text }}>{name}</span>
      <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: color,
          width: `${pct}%`, transition: 'width .8s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color }}>{pct}%</span>
    </div>
  )
}

// ── 3D navy CTA ───────────────────────────────────────────────────────────────
function Cta3D({ href, onClick, children }) {
  const [p, setP] = useState(false)
  const base = {
    display: 'block', width: '100%', padding: 15, borderRadius: 14,
    background: C.navy, color: '#fff',
    fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
    textAlign: 'center', letterSpacing: '-0.01em',
    transform: p ? 'translateY(3px)' : '',
    boxShadow: p
      ? `0 3px 0 ${C.navyDeep}`
      : `0 6px 0 ${C.navyDeep}, 0 10px 24px rgba(0,0,0,.4)`,
    transition: 'transform .1s, box-shadow .1s',
  }
  const handlers = {
    onMouseDown: () => setP(true), onMouseUp: () => setP(false),
    onMouseLeave: () => setP(false),
    onTouchStart: () => setP(true), onTouchEnd: () => setP(false),
  }
  if (href) return <Link href={href} style={base}>{children}</Link>
  return <button onClick={onClick} style={base} {...handlers}>{children}</button>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <style>{`@keyframes ep-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.chem}`, borderTopColor: 'transparent', animation: 'ep-spin .8s linear infinite' }} />
    </>
  )
}

export default function DiagnosticResultsPage() {
  const router = useRouter()
  const [summary,    setSummary]   = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [isSignedIn, setSignedIn]  = useState(false)
  const saved = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('diagnostic_results')
    if (!raw) { router.push('/'); return }

    let data
    try { data = JSON.parse(raw) } catch { router.push('/'); return }

    const { answers = {}, questions = [] } = data
    const total   = questions.length
    const correct = questions.filter(q => answers[q.id]?.is_correct).length
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

    // Build topic breakdown
    const topicMap = {}
    questions.forEach(q => {
      const name = q.topic_name || 'General'
      if (!topicMap[name]) topicMap[name] = { total: 0, correct: 0 }
      topicMap[name].total++
      if (answers[q.id]?.is_correct) topicMap[name].correct++
    })
    const topics = Object.entries(topicMap)
      .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct)

    const weakTopics = topics.filter(t => t.pct < 60)

    setSummary({ pct, total, correct, topics, weakTopics, xp: correct * 10 })

    // Save to DB in background — never blocks UI
    createClient().auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user)
      if (!user || saved.current) return
      saved.current = true
      setSaveStatus('saving')
      fetch('/api/diagnostic/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, questions,
          examType: data.setup?.examType ?? 'WAEC',
          subjects: data.setup?.subjects ?? [],
        }),
      })
        .then(r => setSaveStatus(r.ok ? 'done' : 'error'))
        .catch(() => setSaveStatus('error'))
    })
  }, [router])

  if (!summary) return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  const tier = getScoreTier(summary.pct)
  const subjectLabel = (() => { try { return JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}').subjects?.[0] ?? 'Diagnostic' } catch { return 'Diagnostic' } })()

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── App bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: `1px solid ${C.border}`,
        background: 'rgba(13,14,20,.96)', backdropFilter: 'blur(14px)', flexShrink: 0,
      }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9, background: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
            boxShadow: `0 3px 0 ${C.navyDeep}`,
          }}>E</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            Exam <span style={{ color: C.dim, fontWeight: 500 }}>Prep</span>
          </span>
        </div>

        {/* XP pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,195,107,.1)', border: '1px solid rgba(255,195,107,.2)',
          padding: '4px 9px', borderRadius: 999,
          fontSize: 11, fontWeight: 700, color: C.gold,
        }}>
          ✦ +{summary.xp} XP
        </div>
      </div>

      {/* ── Scroll zone ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '0 18px 32px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Score ring + subject + encouragement */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 0 10px',
        }}>
          <ScoreRing pct={summary.pct} ringColor={tier.ring} />
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 4 }}>
            {subjectLabel} Diagnostic
          </p>
          <p style={{
            fontSize: 12, color: C.dim, textAlign: 'center',
            maxWidth: 260, marginTop: 4, lineHeight: 1.6,
          }}>
            {getEncouragement(summary.pct)}
          </p>
        </div>

        {/* Weak topics callout */}
        {summary.weakTopics.length > 0 && (
          <div style={{
            background: 'rgba(239,93,78,.08)', border: '1px solid rgba(239,93,78,.2)',
            borderRadius: 16, padding: 14,
          }}>
            <p style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.09em', color: C.danger, marginBottom: 10,
            }}>
              🎯 Focus here first
            </p>
            {summary.weakTopics.map((t, i) => (
              <TopicRow
                key={t.name} name={t.name} pct={t.pct}
                isLast={i === summary.weakTopics.length - 1}
              />
            ))}
            {isSignedIn && (
              <p style={{ fontSize: 10, color: C.danger, marginTop: 8 }}>
                ✓ These have been added to your practice plan
              </p>
            )}
          </div>
        )}

        {/* All topics widget */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{
            padding: '11px 14px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.09em', color: C.dim,
            }}>All topics</span>
          </div>
          <div style={{ padding: '6px 14px' }}>
            {summary.topics.map((t, i) => (
              <TopicRow
                key={t.name} name={t.name} pct={t.pct}
                isLast={i === summary.topics.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Save status */}
        {saveStatus === 'saving' && (
          <p style={{ textAlign: 'center', fontSize: 11, color: C.dim }}>Saving your results…</p>
        )}
        {saveStatus === 'error' && (
          <p style={{ textAlign: 'center', fontSize: 11, color: C.danger }}>Couldn't save results right now</p>
        )}

        {/* CTAs */}
        {isSignedIn ? (
          <Cta3D href="/student/dashboard">View my practice plan →</Cta3D>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Cta3D href="/signup?from=diagnostic">Save results &amp; create account →</Cta3D>
            <Link
              href="/student/dashboard"
              style={{ display: 'block', textAlign: 'center', fontSize: 12, color: C.dim, fontWeight: 600 }}
            >
              Continue without saving
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}