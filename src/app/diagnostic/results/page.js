'use client'
// src/app/diagnostic/results/page.js — v3
// Full light + dark via CSS var tokens.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const CIRC = 326.73 // 2π × 52

function getScoreTier(pct) {
  if (pct >= 80) return { label: 'Excellent',       color: '#059669' }
  if (pct >= 60) return { label: 'Good',             color: '#0369a1' }
  if (pct >= 40) return { label: 'Building',         color: '#4338ca' }
  return              { label: 'Getting started',   color: '#dc2626' }
}

function ScoreRing({ pct, color }) {
  const [dash, setDash] = useState(0)
  const [disp, setDisp] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => { setDash(CIRC * pct / 100); setDisp(pct) }, 100)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="flex flex-col items-center py-5">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r="52" fill="none" stroke="var(--bg-subtle)" strokeWidth="10"/>
        <circle cx="65" cy="65" r="52" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
        <text x="65" y="60" textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="800"
          style={{ fill: 'var(--text-prim)' }}>
          {disp}%
        </text>
        <text x="65" y="78" textAnchor="middle" fontSize="11"
          style={{ fill: 'var(--text-sec)' }}>
          {getScoreTier(pct).label}
        </text>
      </svg>
    </div>
  )
}

function TopicRow({ name, pct, isLast }) {
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'
  const trackBg = 'var(--bg-subtle)'
  return (
    <div className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <span className="flex-1 text-xs font-bold text-primary">{name}</span>
      <div style={{ width: 60, height: 4, background: trackBg, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width .8s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color, width: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function Cta3D({ href, onClick, children }) {
  const [p, setP] = useState(false)
  const style = {
    display: 'block', width: '100%', padding: '15px 0', borderRadius: 14,
    background: '#0b1330', color: '#fff',
    fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
    textAlign: 'center', letterSpacing: '-0.01em',
    transform: p ? 'translateY(3px)' : 'none',
    boxShadow: p ? '0 2px 0 #05070f' : '0 6px 0 #05070f, 0 10px 24px rgba(10,13,26,0.2)',
    transition: 'transform .1s, box-shadow .1s',
  }
  const h = { onMouseDown: () => setP(true), onMouseUp: () => setP(false), onMouseLeave: () => setP(false), onTouchStart: () => setP(true), onTouchEnd: () => setP(false) }
  if (href) return <Link href={href} style={style}>{children}</Link>
  return <button onClick={onClick} style={style} {...h}>{children}</button>
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
    let data; try { data = JSON.parse(raw) } catch { router.push('/'); return }
    const { answers = {}, questions = [] } = data
    const total   = questions.length
    const correct = questions.filter(q => answers[q.id]?.is_correct).length
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0
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
    setSummary({ pct, total, correct, topics, weakTopics: topics.filter(t => t.pct < 60), xp: correct * 10 })
    createClient().auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user)
      if (!user || saved.current) return
      saved.current = true; setSaveStatus('saving')
      fetch('/api/diagnostic/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions, examType: data.setup?.examType ?? 'WAEC', subjects: data.setup?.subjects ?? [] }),
      }).then(r => setSaveStatus(r.ok ? 'done' : 'error')).catch(() => setSaveStatus('error'))
    })
  }, [router])

  if (!summary) return (
    <div className="min-h-dvh bg-base flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#4338ca', borderTopColor: 'transparent' }} />
    </div>
  )

  const tier = getScoreTier(summary.pct)
  const subjectLabel = (() => { try { return JSON.parse(sessionStorage.getItem('diagnostic_setup') ?? '{}').subjects?.[0] ?? 'Diagnostic' } catch { return 'Diagnostic' } })()

  return (
    <div className="min-h-dvh bg-base flex flex-col">

      {/* App bar */}
      <div className="flex items-center justify-between px-4 border-b border-default flex-shrink-0"
        style={{ height: 52, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)' }}>
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: 9, background: '#0b1330',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff', boxShadow: '0 2px 0 #05070f',
          }}>E</div>
          <span className="text-primary font-bold text-sm">Exam <span className="text-secondary font-medium">Prep</span></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--gold)' }}>
          ✦ +{summary.xp} XP
        </div>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-10"
        style={{ maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Score ring + heading */}
        <ScoreRing pct={summary.pct} color={tier.color} />
        <div className="text-center -mt-4">
          <p className="text-primary font-black text-base">{subjectLabel} Diagnostic</p>
          <p className="text-secondary text-xs mt-1 leading-relaxed max-w-xs mx-auto">
            {summary.pct >= 60 ? 'Good work — focus sessions will push you higher.' : 'Focused practice on weak topics will close these gaps fast.'}
          </p>
        </div>

        {/* Score summary row */}
        <div className="bg-card border border-default rounded-2xl shadow-card flex overflow-hidden">
          {[
            { label: 'Correct', value: summary.correct },
            { label: 'Missed',  value: summary.total - summary.correct },
            { label: 'Total',   value: summary.total },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex-1 py-3 text-center"
              style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <p className="text-primary font-black text-xl">{value}</p>
              <p className="text-tertiary font-semibold" style={{ fontSize: 10 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Weak topics callout */}
        {summary.weakTopics.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
            <p className="font-black uppercase tracking-wide mb-3"
              style={{ fontSize: 9, letterSpacing: '0.09em', color: 'var(--danger)' }}>
              🎯 Focus here first
            </p>
            {summary.weakTopics.map((t, i) => (
              <TopicRow key={t.name} name={t.name} pct={t.pct} isLast={i === summary.weakTopics.length - 1} />
            ))}
          </div>
        )}

        {/* All topics */}
        <div className="bg-card border border-default rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-default">
            <p className="text-tertiary font-black uppercase tracking-wide" style={{ fontSize: 9, letterSpacing: '0.09em' }}>All topics</p>
          </div>
          <div className="px-4">
            {summary.topics.map((t, i) => (
              <TopicRow key={t.name} name={t.name} pct={t.pct} isLast={i === summary.topics.length - 1} />
            ))}
          </div>
        </div>

        {saveStatus === 'saving' && <p className="text-center text-tertiary text-xs">Saving your results…</p>}

        {isSignedIn
          ? <Cta3D href="/student/dashboard">View my practice plan →</Cta3D>
          : <div className="flex flex-col gap-3">
              <Cta3D href="/signup?from=diagnostic">Save results &amp; create account →</Cta3D>
              <Link href="/student/dashboard" className="text-center text-secondary text-xs font-semibold">
                Continue without saving
              </Link>
            </div>
        }
      </div>
    </div>
  )
}