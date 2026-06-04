'use client'
// src/app/student/dashboard/page.js

import { useState, useEffect, memo, Suspense, lazy } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getMasteryLevel } from '@/lib/theme'
import { DashboardSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

// ── Per-subject colour palette (inline styles — immune to Tailwind JIT purge) ─
const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9', iconBg: 'rgba(14,165,233,0.12)' },
  'English Language':      { bg: '#faf5ff', text: '#6d28d9', accent: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4', iconBg: 'rgba(6,182,212,0.12)'  },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)'  },
  'Biology':               { bg: '#ecfdf5', text: '#047857', accent: '#10b981', iconBg: 'rgba(16,185,129,0.12)' },
  'Economics':             { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)' },
  'Government':            { bg: '#fff1f2', text: '#b91c1c', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)'  },
  'Literature in English': { bg: '#fdf2f8', text: '#be185d', accent: '#ec4899', iconBg: 'rgba(236,72,153,0.12)' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6', iconBg: 'rgba(20,184,166,0.12)' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16', iconBg: 'rgba(132,204,22,0.12)' },
  'Commerce':              { bg: '#faf5ff', text: '#6d28d9', accent: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)' },
}
const DEFAULT_STYLE = { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', iconBg: 'rgba(99,102,241,0.12)' }
function getStyle(name) { return SUBJECT_STYLES[name] ?? DEFAULT_STYLE }

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(firstName, streak) {
  const hour = new Date().getHours()
  const name = firstName ? `, ${firstName}` : ''
  if (streak >= 7) return { pre: `${streak}-day streak 🔥`, main: `Keep it going${name}!` }
  if (streak >= 3) return { pre: 'Building momentum',       main: `Great work${name} 💪` }
  if (hour < 12)   return { pre: 'Good morning',            main: `Ready to learn${name}? ☀️` }
  if (hour < 17)   return { pre: 'Good afternoon',          main: `Let's make progress${name} 📚` }
  return                   { pre: 'Good evening',            main: `Keep pushing${name} 🌙` }
}

// ── Subject SVG icons ─────────────────────────────────────────────────────────
function SubjectSVGIcon({ name, size = 18, color }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const w = size, h = size
  const icons = {
    'Mathematics':         <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M18 4H6l6 8-6 8h12"/></svg>,
    'Further Mathematics': <svg width={w} height={h} viewBox="0 0 24 24" {...s}><line x1="6" y1="4" x2="18" y2="4"/><line x1="9" y1="4" x2="9" y2="20"/><path d="M15 4v10a2 2 0 002 2"/></svg>,
    'Physics':             <svg width={w} height={h} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2" fill={color} stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(120 12 12)"/></svg>,
    'Chemistry':           <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M9 3h6"/><path d="M10 3v5.5L5.5 17A2 2 0 007.3 20h9.4a2 2 0 001.8-2.9L14 8.5V3"/><line x1="7.5" y1="14" x2="16.5" y2="14"/></svg>,
    'Biology':             <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M7 3s3.5 3 3.5 9S7 21 7 21"/><path d="M17 3s-3.5 3-3.5 9 3.5 9 3.5 9"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
    'Economics':           <svg width={w} height={h} viewBox="0 0 24 24" {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    'Government':          <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    'English Language':    <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M4 6h16M4 12h16M4 18h10"/></svg>,
  }
  const def = <svg width={w} height={h} viewBox="0 0 24 24" {...s}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
  return icons[name] ?? def
}

// ── Goal banner ───────────────────────────────────────────────────────────────
const GoalBanner = memo(function GoalBanner({ profile, onClick }) {
  if (profile?.goals_set) return null
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl px-5 py-4 text-left hover:opacity-95 active:scale-[0.98] transition-all shadow-sm">
      <span className="text-2xl">🎯</span>
      <div className="flex-1">
        <p className="font-black text-white text-sm">Set your exam goals</p>
        <p className="text-white/80 text-xs mt-0.5">Tell us your target — we'll personalise your plan</p>
      </div>
      <svg className="w-5 h-5 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  )
})

// ── Study Plan ────────────────────────────────────────────────────────────────
// FIX: no dividing lines — cards with gap instead
// FIX: subject badge shown on every row
const StudyPlanSection = memo(function StudyPlanSection() {
  const STATUS_CONFIG = {
    weak:      { color: '#dc2626', bg: '#fef2f2', label: 'Needs work', icon: '🎯' },
    improving: { color: '#d97706', bg: '#fffbeb', label: 'Improving',  icon: '📈' },
    untested:  { color: '#4f46e5', bg: '#eef2ff', label: 'Not tried',  icon: '📖' },
    strong:    { color: '#16a34a', bg: '#f0fdf4', label: 'Strong',     icon: '✅' },
  }

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [hasAny,  setHasAny]  = useState(false)

  useEffect(() => {
    fetch('/api/student/study-plan')
      .then(r => r.json())
      .then(data => {
        setHasAny(data.hasAnyAttempts ?? false)
        const allItems = (data.items ?? []).filter(i => (i.accuracyPct ?? 0) < 90)
        const bySubject = {}
        allItems.forEach(i => {
          if (!bySubject[i.subjectId]) bySubject[i.subjectId] = []
          bySubject[i.subjectId].push(i)
        })
        const order = { weak: 0, improving: 1, untested: 2, strong: 3 }
        Object.values(bySubject).forEach(arr =>
          arr.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2) || (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0))
        )
        const result = []
        const sids = Object.keys(bySubject)
        let round = 0
        while (result.length < 4 && round < 10) {
          let added = false
          for (const sid of sids) {
            if (result.length >= 4) break
            if (bySubject[sid][round]) { result.push(bySubject[sid][round]); added = true }
          }
          if (!added) break
          round++
        }
        setItems(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-primary">Study Plan</p>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-subtle animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-5 text-center space-y-3" style={{ background: '#fdfcfa', border: '1px solid #ede9e3' }}>
          <p className="text-2xl">🎯</p>
          <p className="text-sm font-bold text-primary">No plan yet</p>
          <p className="text-xs text-secondary leading-relaxed">
            {hasAny ? 'You\'re on top of everything! Keep practising.' : 'Take the diagnostic so we can show you what to focus on.'}
          </p>
          {!hasAny && (
            <Link href="/diagnostic" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
              Take diagnostic →
            </Link>
          )}
        </div>
      ) : (
        // NO dividing lines — gap between cards instead
        <div className="space-y-2">
          {items.map((item, i) => {
            const cfg      = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.untested
            const subjStyle = getStyle(item.subjectName)
            const pct      = item.accuracyPct ?? 0

            return (
              <Link key={item.topicId ?? i}
                href={`/student/study-plan/${item.topicId}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all"
                style={{ background: '#ffffff', border: '1px solid #ede9e3' }}>

                {/* Subject dot accent */}
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: subjStyle.accent }} />

                <div className="flex-1 min-w-0">
                  {/* Subject badge — always visible */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: subjStyle.bg, color: subjStyle.text }}>
                      {item.subjectName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-primary truncate">{item.topicName}</p>
                </div>

                {/* Status + score */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {pct > 0 && (
                    <span className="text-xs font-black tabular-nums"
                      style={{ color: pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626' }}>
                      {pct}%
                    </span>
                  )}
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <svg className="w-3.5 h-3.5 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </Link>
            )
          })}

          <Link href="/student/study-plan"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
            View full study plan →
          </Link>
        </div>
      )}
    </div>
  )
})

// ── Practice Hub ──────────────────────────────────────────────────────────────
const PracticeHub = memo(function PracticeHub() {
  const modes = [
    { id: 'timed', label: 'Timed Practice',  desc: 'Countdown timer, mixed', href: '/student/practice?mode=timed', gradient: 'from-indigo-500 to-indigo-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg> },
    { id: 'topic', label: 'Topic Quiz',       desc: 'Focus on one topic',     href: '/student/practice?mode=topic',  gradient: 'from-violet-500 to-violet-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
    { id: 'exam',  label: 'Exam Simulation',  desc: 'Full format, timed',     href: '/student/practice?mode=exam',   gradient: 'from-rose-500 to-rose-600',
      icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg> },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-primary">Practice Hub</p>
        <Link href="/student/practice" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
      </div>
      <div className="sm:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollSnapType: 'x mandatory' }}>
          {modes.map(m => (
            <Link key={m.id} href={m.href}
              className="flex-shrink-0 w-[62vw] max-w-[220px] bg-card rounded-2xl shadow-sm p-4 hover:shadow-md active:scale-[0.97] transition-all"
              style={{ scrollSnapAlign: 'start' }}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-3`}>{m.icon}</div>
              <p className="text-sm font-black text-primary">{m.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{m.desc}</p>
              <span className="inline-block mt-3 text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {modes.map(m => (
          <Link key={m.id} href={m.href}
            className="flex flex-col gap-3 bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center`}>{m.icon}</div>
            <div>
              <p className="text-sm font-black text-primary">{m.label}</p>
              <p className="text-xs text-secondary mt-0.5 leading-snug">{m.desc}</p>
            </div>
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">Start →</span>
          </Link>
        ))}
      </div>
    </div>
  )
})

// ── Subject card — improved styling, inline styles ────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub }) {
  const name    = sub.subjects?.name ?? ''
  const style   = getStyle(name)
  const mastery = getMasteryLevel(sub.pct ?? 0)
  const pct     = sub.pct ?? 0

  return (
    <Link href={`/student/subjects/${sub.subjects?.slug}`}
      className="block rounded-2xl overflow-hidden active:scale-[0.97] transition-all"
      style={{
        border: `1.5px solid ${style.accent}22`,
        boxShadow: `0 2px 8px ${style.accent}18`,
      }}>

      {/* Coloured top section */}
      <div style={{ background: style.bg, padding: '14px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          {/* Icon bubble */}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: style.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <SubjectSVGIcon name={name} size={18} color={style.text} />
          </div>
          {/* Mastery emoji */}
          <span style={{ fontSize: 16 }}>{mastery.emoji}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 900, color: style.text, lineHeight: 1.3, marginTop: 2 }}>{name}</p>
      </div>

      {/* Progress footer */}
      <div style={{ background: '#fff', padding: '10px 14px 12px' }}>
        {/* Progress bar */}
        <div style={{ height: 5, background: '#f0ece4', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: style.accent,
            width: `${pct}%`,
            transition: 'width 0.7s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{sub.completed ?? 0}/{sub.total ?? 0} topics</span>
          <span style={{
            fontSize: 12, fontWeight: 900,
            color: pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#9ca3af'
          }}>{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ── Targets summary — no dividing lines, all 4 sections, scores shown ─────────
const TargetsSummary = memo(function TargetsSummary({ profile, onEdit }) {
  const waecGrades  = profile?.waec_target_grades  ?? {}
  const jambScores  = profile?.jamb_target_scores  ?? {}
  const examType    = profile?.exam_type ?? ''
  const hasWaec     = Object.keys(waecGrades).length > 0 && (examType === 'WAEC' || examType === 'BOTH')
  const hasJamb     = Object.keys(jambScores).length > 0 && (examType === 'JAMB' || examType === 'BOTH')
  const hasCourse   = Boolean(profile?.university_course)
  const hasUni      = Boolean(profile?.target_university)
  const hasAny      = hasWaec || hasJamb || hasCourse || hasUni

  const jambTotal   = profile?.jamb_total_target
    ?? Object.values(jambScores).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #ede9e3', background: '#fdfcfa' }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #ede9e3' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
            <span className="text-base">🎯</span>
          </div>
          <p className="text-sm font-black text-primary">My Targets</p>
        </div>
        <button onClick={onEdit}
          className="text-xs font-bold text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
          Edit
        </button>
      </div>

      {!hasAny ? (
        <div className="px-5 py-5 text-center space-y-3">
          <p className="text-xs text-secondary leading-relaxed">Set your targets to stay motivated and track your progress.</p>
          <button onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-400 transition-colors">
            Set targets →
          </button>
        </div>
      ) : (
        // NO dividing lines — vertical space between sections instead
        <div className="px-5 py-4 space-y-5">

          {/* 1. Target Course */}
          {hasCourse && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
                <span className="text-base">🎓</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mb-0.5">Target Course</p>
                <p className="text-sm font-black text-primary truncate">{profile.university_course}</p>
              </div>
            </div>
          )}

          {/* 2. Target University */}
          {hasUni && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                <span className="text-base">🏛️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mb-0.5">Target University</p>
                <p className="text-sm font-black text-primary truncate">{profile.target_university}</p>
              </div>
            </div>
          )}

          {/* 3. JAMB Target — with per-subject scores */}
          {hasJamb && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e0e7ff' }}>
                  <span className="text-base">📊</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">JAMB Target</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-primary">{jambTotal} total</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#4f46e5' }}>JAMB</span>
                  </div>
                </div>
              </div>
              {/* Per-subject score pills */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(jambScores).map(([sub, score]) => (
                  <div key={sub}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                    style={{ background: '#e0e7ff', border: '1px solid #c7d2fe' }}>
                    <span className="text-xs font-bold" style={{ color: '#3730a3' }}>{sub}</span>
                    <span className="text-xs font-black" style={{ color: '#4f46e5' }}>{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. WAEC Target — with per-subject grades */}
          {hasWaec && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d1fae5' }}>
                  <span className="text-base">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">WAEC Target Grades</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-primary">{Object.keys(waecGrades).length} subjects</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#059669' }}>WAEC</span>
                  </div>
                </div>
              </div>
              {/* Per-subject grade pills — colour-coded A1-B3 green, C4-C6 amber, D7+ red */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(waecGrades).map(([sub, grade]) => {
                  const n  = parseInt(grade.replace(/\D/g, '')) || 0
                  const bg = n <= 3 ? '#d1fae5' : n <= 6 ? '#fef3c7' : '#fee2e2'
                  const tx = n <= 3 ? '#065f46' : n <= 6 ? '#92400e' : '#991b1b'
                  const bd = n <= 3 ? '#6ee7b7' : n <= 6 ? '#fcd34d' : '#fca5a5'
                  return (
                    <div key={sub}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                      style={{ background: bg, border: `1px solid ${bd}` }}>
                      <span className="text-xs font-bold" style={{ color: tx }}>{sub}</span>
                      <span className="text-xs font-black" style={{ color: tx }}>{grade}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
})

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading,       setLoading]       = useState(true)
  const [profile,       setProfile]       = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [streak,        setStreak]        = useState(0)
  const [showGoalModal, setShowGoalModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: streakData }, { data: paths }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('student_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
        supabase.from('student_learning_paths')
          .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
          .eq('student_id', user.id),
        supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      ])

      setProfile(prof)
      setStreak(streakData?.current_streak ?? 0)

      const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))
      const enriched = (paths ?? []).map(path => {
        const ids       = path.ordered_subtopic_ids ?? []
        const total     = ids.length
        const completed = ids.filter(id => completedIds.has(id)).length
        const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
        return { subject_id: path.subject_id, subjects: path.subjects, total, completed, pct }
      })
      setSubjects(enriched)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />

  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const greeting  = getGreeting(firstName, streak)
  const hasPath   = subjects.length > 0

  return (
    <div className="space-y-6 pb-28">

      {/* Greeting + streak */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-secondary font-medium">{greeting.pre}</p>
          <h1 className="text-2xl font-black text-primary leading-tight">{greeting.main}</h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
            style={{ background: '#f59e0b' }}>
            <span className="text-base leading-none">🔥</span>
            <span className="text-sm font-black tabular-nums" style={{ color: '#fff' }}>{streak}</span>
          </div>
        )}
      </div>

      <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />

      {hasPath ? (
        <>
          <StudyPlanSection />
          <PracticeHub />

          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-primary">Your Subjects</p>
                <Link href="/student/learn" className="text-xs font-bold text-indigo-500 hover:underline">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(sub => <SubjectCard key={sub.subject_id} sub={sub} />)}
              </div>
            </div>
          )}

          <TargetsSummary profile={profile} onEdit={() => setShowGoalModal(true)} />
        </>
      ) : (
        <div className="rounded-2xl p-6 text-center space-y-4"
          style={{ border: '1px solid #ede9e3', background: '#fdfcfa' }}>
          <p className="text-4xl">📝</p>
          <div>
            <p className="font-black text-primary text-lg">Get your personalised study plan</p>
            <p className="text-secondary text-sm mt-1 leading-relaxed">Answer 10 questions and we'll build a plan around your weak areas.</p>
          </div>
          <GoalBanner profile={profile} onClick={() => setShowGoalModal(true)} />
          <Link href="/diagnostic"
            className="block w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 text-center">
            Take the diagnostic →
          </Link>
        </div>
      )}

      {showGoalModal && (
        <Suspense fallback={null}>
          <GoalModal
            profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={(updated) => { setProfile(prev => ({ ...prev, ...updated })); setShowGoalModal(false) }}
          />
        </Suspense>
      )}

      <PracticeHubFAB />
    </div>
  )
}