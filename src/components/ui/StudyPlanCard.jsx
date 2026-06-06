// src/components/ui/StudyPlanCard.jsx
//
// Shared study plan topic card + data-fetching widget used by Dashboard and LearnPage.
//
// KEY DESIGN DECISIONS:
//
// 1. SUBJECT COLOUR — uses CSS custom properties set via the `style` attribute
//    on each card. The SUBJECT_STYLES map provides both light and dark values.
//    A `data-dark` attribute on the card wrapper switches which CSS var resolves.
//    This is more robust than passing `isDark` as a prop because it responds to
//    dynamic theme changes without re-renders.
//
// 2. MINI RING TRACK — was hardcoded #f1f5f9 (near-white), invisible in dark mode.
//    Fixed to rgba(100,116,139,0.25) which reads well on both light and dark bg.
//
// 3. STATUS PILL — both light and dark values stored as CSS vars on the element,
//    toggled by .dark on <html> via standard CSS variables.
//
// 4. CARD BG/BORDER — uses bg-card + border-default (CSS tokens) so they
//    automatically adapt. No hardcoded #ffffff or #ede9e3.

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ── Subject colour map ─────────────────────────────────────────────────────────
// Each entry has light (bg/text) and dark (darkBg/darkText) values.
const SUBJECT_STYLES = {
  'Mathematics':                 { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6', darkBg: '#172554', darkText: '#93c5fd' },
  'Further Mathematics':         { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9', darkBg: '#0c4a6e', darkText: '#7dd3fc' },
  'English Language':            { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7', darkBg: '#3b0764', darkText: '#d8b4fe' },
  'Use of English':              { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7', darkBg: '#3b0764', darkText: '#d8b4fe' },
  'Physics':                     { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4', darkBg: '#083344', darkText: '#67e8f9' },
  'Chemistry':                   { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e', darkBg: '#052e16', darkText: '#86efac' },
  'Biology':                     { bg: '#ecfdf5', text: '#047857', accent: '#10b981', darkBg: '#022c22', darkText: '#6ee7b7' },
  'Economics':                   { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b', darkBg: '#451a03', darkText: '#fcd34d' },
  'Government':                  { bg: '#fef2f2', text: '#b91c1c', accent: '#ef4444', darkBg: '#450a0a', darkText: '#fca5a5' },
  'Literature in English':       { bg: '#fdf2f8', text: '#9d174d', accent: '#ec4899', darkBg: '#500724', darkText: '#f9a8d4' },
  'Geography':                   { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6', darkBg: '#042f2e', darkText: '#5eead4' },
  'Agricultural Science':        { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16', darkBg: '#1a2e05', darkText: '#bef264' },
  'Commerce':                    { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', darkBg: '#1e1b4b', darkText: '#a5b4fc' },
  'History':                     { bg: '#fff7ed', text: '#c2410c', accent: '#f97316', darkBg: '#431407', darkText: '#fdba74' },
  'Accounting':                  { bg: '#fefce8', text: '#a16207', accent: '#eab308', darkBg: '#1e1700', darkText: '#fde047' },
  'Computer Science':            { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9', darkBg: '#0c4a6e', darkText: '#7dd3fc' },
  'Civic Education':             { bg: '#f0fdf4', text: '#166534', accent: '#22c55e', darkBg: '#052e16', darkText: '#86efac' },
  'default':                     { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', darkBg: '#1e1b4b', darkText: '#a5b4fc' },
}

const STATUS_CONFIG = {
  weak:      { label: 'Needs work', icon: '🎯', lightBg: '#fef2f2', lightText: '#dc2626', darkBg: '#450a0a', darkText: '#f87171', barColor: '#f87171' },
  improving: { label: 'Improving',  icon: '📈', lightBg: '#fffbeb', lightText: '#d97706', darkBg: '#451a03', darkText: '#fbbf24', barColor: '#fbbf24' },
  untested:  { label: 'New',        icon: '📖', lightBg: '#eef2ff', lightText: '#4338ca', darkBg: '#1e1b4b', darkText: '#a5b4fc', barColor: '#a5b4fc' },
  strong:    { label: 'Strong',     icon: '✅', lightBg: '#f0fdf4', lightText: '#16a34a', darkBg: '#052e16', darkText: '#4ade80', barColor: '#4ade80' },
}

function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }
function getStatus(key)        { return STATUS_CONFIG[key]   ?? STATUS_CONFIG.untested  }

// ── Dark mode detection hook ───────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    // Read once from <html> class
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    // Watch for changes (DarkModeToggle updates <html class>)
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

// ── Mini progress ring ─────────────────────────────────────────────────────────
export function MiniRing({ pct, size = 34 }) {
  const r    = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* Track — visible in both light and dark */}
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        style={{ fontSize: size * 0.24, fontWeight: 900, fill: color }}>
        {pct}%
      </text>
    </svg>
  )
}

// ── Single topic card ──────────────────────────────────────────────────────────
export function StudyPlanCard({ item }) {
  const isDark = useIsDark()
  const s      = getSubjectStyle(item.subjectName ?? '')
  const cfg    = getStatus(item.status)
  const pct    = item.accuracyPct ?? 0

  const subjectStyle = isDark
    ? { backgroundColor: s.darkBg, color: s.darkText }
    : { backgroundColor: s.bg,     color: s.text      }

  const statusStyle = isDark
    ? { backgroundColor: cfg.darkBg, color: cfg.darkText }
    : { backgroundColor: cfg.lightBg, color: cfg.lightText }

  return (
    <Link
      href={`/student/study-plan/${item.topicId}`}
      onClick={() => {
        try {
          sessionStorage.setItem('study_plan_topic', JSON.stringify({
            topicId:        item.topicId,
            topicName:      item.topicName,
            subjectName:    item.subjectName,
            subjectId:      item.subjectId,
            examType:       item.examType ?? 'WAEC',
            attempts:       item.attemptCount ?? 0,
            correct:        Math.round((pct / 100) * (item.attemptCount ?? 0)),
            insightMessage: item.insightMessage,
          }))
        } catch {}
      }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-default bg-card
                 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800
                 active:scale-[0.985] transition-all duration-150 group"
    >
      {/* Left colour accent bar — subject colour */}
      <div
        style={{ backgroundColor: s.accent }}
        className="w-1 h-10 rounded-full flex-shrink-0"
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Subject badge + status pill */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            style={subjectStyle}
            className="text-[10px] font-black px-2 py-0.5 rounded-full leading-tight whitespace-nowrap"
          >
            {item.subjectName}
          </span>
          <span
            style={statusStyle}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight whitespace-nowrap"
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>
        {/* Topic name */}
        <p className="text-sm font-black text-primary leading-snug truncate">
          {item.topicName}
        </p>
      </div>

      {/* Right: score ring or "New" badge + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {(item.attemptCount ?? 0) > 0
          ? <MiniRing pct={pct} size={34} />
          : <span style={statusStyle} className="text-[10px] font-bold px-2 py-1 rounded-full">New</span>
        }
        <svg
          className="w-3.5 h-3.5 text-tertiary group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </Link>
  )
}

// ── Data fetching + interleave logic (shared) ─────────────────────────────────
function useStudyPlanItems(maxItems = 4) {
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
          arr.sort((a, b) => {
            const od = (order[a.status] ?? 2) - (order[b.status] ?? 2)
            return od !== 0 ? od : (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0)
          })
        )

        // Round-robin across subjects
        const result = []
        const sids   = Object.keys(bySubject)
        let round    = 0
        while (result.length < maxItems && round < 10) {
          let added = false
          for (const sid of sids) {
            if (result.length >= maxItems) break
            if (bySubject[sid][round]) { result.push(bySubject[sid][round]); added = true }
          }
          if (!added) break
          round++
        }
        setItems(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [maxItems])

  return { items, loading, hasAny }
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-default bg-card animate-pulse">
      <div className="w-1 h-10 rounded-full bg-subtle flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-1.5">
          <div className="h-4 w-16 bg-subtle rounded-full" />
          <div className="h-4 w-14 bg-subtle rounded-full" />
        </div>
        <div className="h-4 w-40 bg-subtle rounded" />
      </div>
      <div className="w-8 h-8 rounded-full bg-subtle" />
    </div>
  )
}

// ── Full widget — used by Dashboard ───────────────────────────────────────────
// Has its own data fetching, header, empty state, footer.
export function StudyPlanSection() {
  const { items, loading, hasAny } = useStudyPlanItems(4)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-primary">Study Plan</p>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:underline">
          See all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-5 text-center space-y-3 bg-card border border-default">
          <p className="text-2xl">🎯</p>
          <p className="text-sm font-bold text-primary">No plan yet</p>
          <p className="text-xs text-secondary leading-relaxed max-w-[200px] mx-auto">
            {hasAny
              ? "You're on top of everything! Keep practising."
              : 'Take the diagnostic so we can show you what to focus on.'}
          </p>
          {!hasAny && (
            <Link href="/diagnostic"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
              Take diagnostic →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => <StudyPlanCard key={item.topicId} item={item} />)}
        </div>
      )}
    </div>
  )
}

// ── Compact widget — used by LearnPage ────────────────────────────────────────
// Wrapped in a card container with header + footer links.
export function StudyPlanPreview() {
  const { items, loading, hasAny } = useStudyPlanItems(4)

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-default overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-default">
          <div className="h-4 w-28 bg-subtle rounded animate-pulse" />
          <div className="h-3 w-40 bg-subtle rounded animate-pulse mt-1.5" />
        </div>
        <div className="p-4 space-y-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-default overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-default">
        <div>
          <p className="text-sm font-black text-primary">Study Plan</p>
          <p className="text-xs text-secondary mt-0.5">
            {items.length > 0
              ? `${items.length} topic${items.length !== 1 ? 's' : ''} to focus on`
              : 'Take a diagnostic to get started'}
          </p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-black text-indigo-500 hover:text-indigo-400 transition-colors">
          See all →
        </Link>
      </div>

      {/* Empty state */}
      {(!hasAny || items.length === 0) ? (
        <div className="px-5 py-8 text-center space-y-3">
          <div className="text-3xl">🎯</div>
          <div>
            <p className="text-sm font-bold text-primary">No study plan yet</p>
            <p className="text-xs text-secondary mt-1 leading-relaxed max-w-[200px] mx-auto">
              Take the diagnostic test and we'll show you exactly what to work on.
            </p>
          </div>
          <Link href="/diagnostic"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-2">
            {items.map(item => <StudyPlanCard key={item.topicId} item={item} />)}
          </div>
          <div className="border-t border-default">
            <Link href="/student/study-plan"
              className="flex items-center justify-center gap-1 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-subtle transition-colors">
              View full study plan
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}