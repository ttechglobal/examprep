// src/components/ui/StudyPlanCard.jsx
//
// Shared study plan topic card + data-fetching widget used by Dashboard and LearnPage.
//
// KEY DESIGN DECISIONS:
//
// 1. SUBJECT COLOUR — uses inline style (not Tailwind classes) driven by the
//    SUBJECT_STYLES map, switched between light/dark values via the isDark hook.
//    This is the proven-correct pattern for this codebase's Tailwind v4 setup.
//
// 2. MINI RING TRACK — rgba(100,116,139,0.2), reads well on both light and dark bg.
//
// 3. STATUS PILL — both light and dark values stored per status in STATUS_CONFIG.
//
// 4. CARD BG/BORDER — uses bg-card + border-default (CSS tokens) so they
//    automatically adapt. No hardcoded #ffffff or #ede9e3.
//
// 5. NEW — 'review' status (spaced repetition). Topics surfaced back into the
//    plan after their scheduled review date arrives. Distinct blue treatment,
//    shows a "Last practiced N days ago" sub-line. Always sorts LAST — review
//    items never compete with active weak/improving topics for attention.
//
// 6. NEW — CoachBanner. The "coach talking to you" headline shown above the
//    topic list, built from buildCoachSummary() in studyPlanEngine.js. Colour
//    variant (red/amber/indigo) reflects the mix of weak vs improving items
//    in the currently active subject/items set.

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { buildCoachSummary } from '@/lib/studyPlanEngine'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

// NOTE: SUBJECT_STYLES removed — use resolveSubjectColors(name, isDark) from
// @/lib/subjectTheme — the single canonical source. This fixes the colour drift
// that occurred when this local map was updated independently.

// STATUS_CONFIG — uses CSS var tokens so colours adapt to light/dark automatically.
// barColor is used for SVG rings/bars where CSS vars can't be used directly.
const STATUS_CONFIG = {
  weak:      { label: 'Needs work', icon: '🎯', bg: 'var(--danger-bg)',  text: 'var(--danger)',  border: 'var(--danger-border)',  barColor: '#f87171' },
  improving: { label: 'Improving',  icon: '📈', bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning-border)', barColor: '#fbbf24' },
  untested:  { label: 'New',        icon: '📖', bg: 'var(--active-bg)',  text: 'var(--active-text)', border: 'var(--active-border)', barColor: '#818cf8' },
  strong:    { label: 'Strong',     icon: '✅', bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success-border)', barColor: '#4ade80' },
  review:    { label: 'Review due', icon: '🔁', bg: 'var(--active-bg)',  text: 'var(--active-text)', border: 'var(--active-border)', barColor: '#7dd3fc' },
}

function getStatus(key) { return STATUS_CONFIG[key] ?? STATUS_CONFIG.untested }

// ── "Last practiced N days ago" label — for review-status cards ──────────────
function daysSinceLabel(lastTestedAt) {
  if (!lastTestedAt) return null
  const days = Math.floor((Date.now() - new Date(lastTestedAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Practiced today'
  if (days === 1) return 'Last practiced yesterday'
  return `Last practiced ${days} days ago`
}

// ── Mini progress ring ─────────────────────────────────────────────────────────
export function MiniRing({ pct, size = 34 }) {
  const r    = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
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
  const colors = resolveSubjectColors(item.subjectName ?? '', isDark)
  const cfg    = getStatus(item.status)
  const pct    = item.accuracyPct ?? 0
  const isReview = item.status === 'review'

  // Use canonical subject colours from resolveSubjectColors
  const subjectStyle = { backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }
  // Status styles now use CSS var tokens from updated STATUS_CONFIG
  const statusStyle  = { backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }

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
        style={{ backgroundColor: colors.solid }}
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
        {/* Review sub-line — only for review-status items */}
        {isReview && item.lastTestedAt && (
          <p className="text-[10px] text-secondary mt-0.5 leading-tight">
            {daysSinceLabel(item.lastTestedAt)}
          </p>
        )}
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

// ── Coach banner — the "coach talking to you" sentence at the top of the plan ─
// Built from buildCoachSummary() in studyPlanEngine.js. Colour variant reflects
// the mix of weak vs improving items in the items array passed in.
export function CoachBanner({ items, subjectName }) {
  const summary = buildCoachSummary(items, subjectName)
  if (!summary) return null

  const weak      = items.filter(i => i.status === 'weak').length
  const improving = items.filter(i => i.status === 'improving').length

  const variant =
    weak >= 2      ? 'red' :
    weak === 1     ? 'amber' :
    improving >= 1 ? 'indigo' :
    'indigo'

  const styles = {
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100',
  }
  const icons = { red: '🎯', amber: '📈', indigo: '✅' }

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${styles[variant]}`}>
      <span className="text-base leading-none flex-shrink-0 mt-0.5">{icons[variant]}</span>
      <p className="text-sm leading-relaxed font-medium">{summary}</p>
    </div>
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

        // Sort order: weak < improving < untested < strong < review.
        // Review always sorts last within a subject, matching the
        // "never displaces active gaps" rule from studyPlanEngine.js.
        const order = { weak: 0, improving: 1, untested: 2, strong: 3, review: 4 }
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
// Has its own data fetching, header, empty state, footer. CoachBanner sits
// above the topic list, built from the same items the section displays.
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
        <div className="space-y-3">
          <CoachBanner items={items} />
          <div className="space-y-2">
            {items.map(item => <StudyPlanCard key={item.topicId} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Compact widget — used by LearnPage ────────────────────────────────────────
// Wrapped in a card container with header + footer links. CoachBanner sits
// inside the card, below the header, above the topic list.
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
          <div className="px-4 pt-4">
            <CoachBanner items={items} />
          </div>
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