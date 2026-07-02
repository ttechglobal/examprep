'use client'
// src/app/student/progress/page.js (NEW) — or replace learn/page progress section
// Matches prototype screen 7 — Progress & Topic Mastery:
//   • SVG overall mastery ring with % + "Getting there" tier
//   • "+15% this week · Keep going" sub-label
//   • "Subjects" widget: per-subject icon + name + "X/Y core topics practised" + bar + %
//   • "This Week" bar chart: 7 bars, today highlighted in subject accent
//   • "87 questions · +15% accuracy" footer line
//   • Navy 3D "← Back to home" CTA

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const T = {
  bg:       '#0d0e14',
  surface:  '#13141f',
  surface2: '#1a1b28',
  border:   'rgba(255,255,255,0.07)',
  text:     '#eef0fa',
  dim:      '#7b7f9e',
  faint:    '#44475e',
  chem:     '#9b7ae0',
  success:  '#6cce8e',
  danger:   '#ef5d4e',
  gold:     '#ffc36b',
  navy:     '#0b1330',
  navyDeep: '#05070f',
}

const SUBJECT_CFG = {
  'Physics':               { accent: '#ff8fab', icon: '⚡'  },
  'Chemistry':             { accent: '#9b7ae0', icon: '⚗️' },
  'Biology':               { accent: '#6cce8e', icon: '🧬' },
  'Mathematics':           { accent: '#5cb8ea', icon: '📐' },
  'Further Mathematics':   { accent: '#5cb8ea', icon: '📐' },
  'English Language':      { accent: '#a78bfa', icon: '📖' },
  'Use of English':        { accent: '#a78bfa', icon: '📖' },
  'Economics':             { accent: '#fcd34d', icon: '📊' },
  'Government':            { accent: '#f87171', icon: '🏛️'},
  'Geography':             { accent: '#34d399', icon: '🌍' },
  'Literature in English': { accent: '#f9a8d4', icon: '📚' },
  'Agricultural Science':  { accent: '#86efac', icon: '🌱' },
  'Commerce':              { accent: '#818cf8', icon: '💼' },
  'Accounting':            { accent: '#fde68a', icon: '🧮' },
  'default':               { accent: '#9b7ae0', icon: '📝' },
}
const getCfg = name => SUBJECT_CFG[name] ?? SUBJECT_CFG.default

const CIRC = 188.5 // 2π×30

function OverallRing({ pct }) {
  const [dash, setDash] = useState(0)
  const [disp, setDisp] = useState(0)
  useEffect(() => { const t = setTimeout(() => { setDash(CIRC * pct / 100); setDisp(pct) }, 100); return () => clearTimeout(t) }, [pct])
  const tier = pct >= 70 ? 'Strong' : pct >= 50 ? 'Getting there' : pct >= 30 ? 'Building' : 'Starting out'
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ overflow: 'visible' }}>
          <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="7"/>
          <circle cx="40" cy="40" r="30" fill="none" stroke={T.chem} strokeWidth="7"
            strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
            transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
          <text x="40" y="45" textAnchor="middle" fill={T.text} fontFamily="inherit" fontSize="16" fontWeight="800">{disp}%</text>
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.dim, marginBottom: 3 }}>Overall mastery</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 2 }}>{tier}</p>
        <p style={{ fontSize: 11, color: T.dim }}>Keep practising to push this up</p>
      </div>
    </div>
  )
}

function SubjectRow({ sub }) {
  const cfg  = getCfg(sub.name)
  const pct  = sub.pct ?? 0
  const pctColor = pct >= 70 ? T.success : pct >= 40 ? T.gold : T.danger
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${cfg.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>{sub.name}</p>
        <p style={{ fontSize: 10, color: T.dim }}>
          {sub.completed ?? 0} / {sub.total ?? 0} core topics practised
        </p>
        <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
          <div style={{ height: '100%', borderRadius: 2, background: cfg.accent, width: `${pct}%`, transition: 'width .8s ease' }} />
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 800, color: pctColor, flexShrink: 0 }}>{pct}%</p>
    </div>
  )
}

function WeekChart({ data, accent }) {
  const days   = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su']
  const max    = Math.max(...data, 1)
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: 64, gap: 4, marginBottom: 8 }}>
      {days.map((d, i) => {
        const h = data[i] ? Math.round((data[i] / max) * 52) : 8
        const isToday = i === todayIdx
        const hasDone = data[i] > 0
        return (
          <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: h,
              background: isToday ? accent : hasDone ? `${accent}55` : 'rgba(255,255,255,.06)',
              boxShadow: isToday ? `0 0 8px ${accent}80` : 'none',
              transition: 'height .8s ease',
            }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: isToday ? accent : T.faint }}>
              {d}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ProgressPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [subjects, setSubjects] = useState([])
  const [weekData, setWeekData] = useState([0,0,0,0,0,0,0])
  const [weekTotal, setWeekTotal] = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: paths }, { data: prog }, { data: attempts }] = await Promise.all([
        supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name, slug)').eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
        supabase.from('question_attempts').select('created_at').eq('student_id', user.id).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      // Subject mastery
      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(p => {
        const ids  = p.ordered_subtopic_ids ?? []
        const done = ids.filter(id => completedIds.has(id)).length
        const pct  = ids.length > 0 ? Math.round((done / ids.length) * 100) : 0
        return { name: p.subjects?.name ?? '', total: ids.length, completed: done, pct }
      })
      setSubjects(enriched)

      // Weekly bar chart — group attempts by day of week
      const bars = [0,0,0,0,0,0,0]
      let total = 0
      ;(attempts ?? []).forEach(a => {
        const d = new Date(a.created_at)
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
        bars[dow]++; total++
      })
      setWeekData(bars)
      setWeekTotal(total)
      setLoading(false)
    }
    load()
  }, [])

  const overallPct = subjects.length > 0 ? Math.round(subjects.reduce((s, sub) => s + sub.pct, 0) / subjects.length) : 0
  const accent = '#9b7ae0'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.chem}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column' }}>

      {/* App bar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: `1px solid ${T.border}`, background: 'rgba(13,14,20,.96)', backdropFilter: 'blur(14px)', flexShrink: 0 }}>
        <Link href="/student/dashboard" style={{ fontSize: 13, color: T.dim, fontWeight: 700 }}>← Home</Link>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>My Progress</span>
        <div style={{ width: 44 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 48px', maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Overall ring */}
        <OverallRing pct={overallPct} />

        {/* Subjects breakdown */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.dim }}>Subjects</p>
          </div>
          <div style={{ padding: '0 14px' }}>
            {subjects.length > 0
              ? subjects.map(s => <SubjectRow key={s.name} sub={s} />)
              : <p style={{ padding: '16px 0', fontSize: 13, color: T.dim, textAlign: 'center' }}>Take the diagnostic to track your progress</p>
            }
          </div>
        </div>

        {/* Weekly activity */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.dim }}>This Week</p>
          </div>
          <div style={{ padding: '14px 14px 10px' }}>
            <WeekChart data={weekData} accent={accent} />
            <p style={{ fontSize: 11, color: T.dim, textAlign: 'center' }}>
              {weekTotal} question{weekTotal !== 1 ? 's' : ''} this week
              {weekTotal > 0 ? ' · Keep the momentum going' : ' · Start practising today!'}
            </p>
          </div>
        </div>

        {/* Back to home */}
        <PressButton onClick={() => router.push('/student/dashboard')}>← Back to home</PressButton>
      </div>
    </div>
  )
}

function PressButton({ onClick, children }) {
  const [p, setP] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)} onMouseLeave={() => setP(false)}
      onTouchStart={() => setP(true)} onTouchEnd={() => setP(false)}
      style={{
        width: '100%', padding: 15, borderRadius: 14,
        background: T.navy, color: '#fff', fontSize: 15, fontWeight: 700,
        border: 'none', cursor: 'pointer', textAlign: 'center',
        transform: p ? 'translateY(3px)' : '',
        boxShadow: p ? `0 2px 0 ${T.navyDeep}` : `0 6px 0 ${T.navyDeep}, 0 10px 20px rgba(0,0,0,.4)`,
        transition: 'transform .1s, box-shadow .1s',
      }}
    >
      {children}
    </button>
  )
}