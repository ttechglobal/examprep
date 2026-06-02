'use client'
// src/app/student/study-plan/page.js

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

// ── Status config — NO left-border pattern ────────────────────────────────────
const STATUS = {
  weak:      { label: 'Needs work', icon: '🎯', bar: 'bg-red-400',    pill: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' },
  improving: { label: 'Improving',  icon: '📈', bar: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
  untested:  { label: 'Not started',icon: '📖', bar: 'bg-indigo-300', pill: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
  strong:    { label: 'Strong',     icon: '✅', bar: 'bg-green-400',  pill: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' },
}

// ── Progress ring (small, inline SVG) ─────────────────────────────────────────
function MiniRing({ pct, size = 36 }) {
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="3.5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle"
        style={{ fontSize: size * 0.24, fontWeight: 900, fill: color }}>
        {pct}%
      </text>
    </svg>
  )
}

// ── Topic card — clean, native, no left border ────────────────────────────────
function TopicCard({ item, rank }) {
  const cfg   = STATUS[item.status] ?? STATUS.weak
  const color = getSubjectColor(item.subjectName ?? '')

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
            correct:        Math.round(((item.accuracyPct ?? 0) / 100) * (item.attemptCount ?? 0)),
            insightMessage: item.insightMessage,
          }))
        } catch {}
      }}
      className="block group"
    >
      <div className="bg-card rounded-2xl shadow-sm hover:shadow-md active:scale-[0.985] transition-all duration-200 overflow-hidden">
        {/* Thin top strip — only colour signal, no left border */}
        <div className={`h-0.5 w-full ${cfg.bar}`} />

        <div className="p-4 flex items-center gap-3">
          {/* Rank bubble */}
          <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-black text-tertiary">{rank}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Subject pill + status pill */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                {item.subjectName}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.pill}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            {/* Topic name */}
            <p className="text-sm font-black text-primary leading-snug">{item.topicName}</p>
            {/* Insight */}
            {item.insightMessage && (
              <p className="text-xs text-secondary mt-0.5 leading-relaxed line-clamp-1">
                {item.insightMessage}
              </p>
            )}
          </div>

          {/* Accuracy ring + chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {item.attemptCount > 0 && <MiniRing pct={item.accuracyPct ?? 0} />}
            <svg className="w-4 h-4 text-tertiary group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Mastered topics — collapsed by default ────────────────────────────────────
function MasteredSection({ items }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full py-2 px-1 text-xs font-bold text-tertiary hover:text-secondary transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        {items.length} mastered topic{items.length !== 1 ? 's' : ''} (hidden)
        <svg className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="space-y-1.5 mt-1">
          {items.map(item => (
            <Link
              key={item.topicId}
              href={`/student/study-plan/${item.topicId}`}
              className="flex items-center gap-3 px-4 py-2.5 bg-subtle rounded-xl hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
            >
              <span className="text-green-500 text-sm">✓</span>
              <span className="text-sm text-secondary font-medium flex-1 truncate">{item.topicName}</span>
              <span className="text-xs font-black text-green-600 dark:text-green-400 tabular-nums">
                {item.accuracyPct}%
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Progress summary bar ──────────────────────────────────────────────────────
function ProgressSummary({ items }) {
  const total     = items.length
  const weak      = items.filter(i => i.status === 'weak').length
  const improving = items.filter(i => i.status === 'improving').length
  const strong    = items.filter(i => i.status === 'strong' || i._mastered).length
  const untested  = items.filter(i => i.status === 'untested').length

  if (total === 0) return null

  // Overall progress score: weak=0, untested=0, improving=0.5, strong=1
  const score = total > 0
    ? Math.round(((improving * 0.5) + (strong * 1)) / total * 100)
    : 0

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-primary">Your progress</p>
        <span className={`text-sm font-black tabular-nums ${
          score >= 60 ? 'text-green-600 dark:text-green-400'
          : score >= 30 ? 'text-amber-500 dark:text-amber-400'
          : 'text-secondary'
        }`}>{score}%</span>
      </div>

      {/* Segmented bar */}
      <div className="h-2.5 bg-subtle rounded-full overflow-hidden flex">
        {weak > 0 && (
          <div className="bg-red-400 h-full transition-all duration-700"
            style={{ width: `${(weak / total) * 100}%` }} />
        )}
        {untested > 0 && (
          <div className="bg-gray-300 dark:bg-gray-600 h-full transition-all duration-700"
            style={{ width: `${(untested / total) * 100}%` }} />
        )}
        {improving > 0 && (
          <div className="bg-amber-400 h-full transition-all duration-700"
            style={{ width: `${(improving / total) * 100}%` }} />
        )}
        {strong > 0 && (
          <div className="bg-green-400 h-full transition-all duration-700"
            style={{ width: `${(strong / total) * 100}%` }} />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {weak > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            {weak} need work
          </span>
        )}
        {improving > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            {improving} improving
          </span>
        )}
        {strong > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            {strong} mastered
          </span>
        )}
        {untested > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            {untested} not started
          </span>
        )}
      </div>
    </div>
  )
}

// ── Subject tab ───────────────────────────────────────────────────────────────
function SubjectTab({ subject, isActive, onClick }) {
  const color = getSubjectColor(subject.name)
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
        isActive
          ? `${color.bg} ${color.text} shadow-sm`
          : 'bg-subtle text-secondary hover:text-primary'
      }`}
    >
      {subject.name}
      {subject.weakCount > 0 && (
        <span className={`text-[9px] font-black min-w-[14px] h-3.5 px-1 rounded-full ${
          isActive ? 'bg-white/40' : 'bg-red-100 text-red-600'
        }`}>
          {subject.weakCount}
        </span>
      )}
    </button>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center gap-5">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-4xl">
        🎯
      </div>
      <div>
        <p className="text-base font-black text-primary">Your study plan is empty</p>
        <p className="text-sm text-secondary mt-1.5 leading-relaxed max-w-[240px] mx-auto">
          Take a 10-question diagnostic test and we'll build a plan showing exactly what to work on.
        </p>
      </div>
      <Link
        href="/diagnostic"
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 active:scale-[0.97] transition-all shadow-md shadow-indigo-200 dark:shadow-none"
      >
        Take diagnostic test →
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudyPlanPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading,        setLoading]        = useState(true)
  const [subjects,       setSubjects]       = useState([])
  const [items,          setItems]          = useState([])
  const [hasAnyAttempts, setHasAnyAttempts] = useState(false)
  const [activeSubjId,   setActiveSubjId]   = useState(null)
  const [error,          setError]          = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      try {
        const res  = await fetch('/api/student/study-plan')
        const data = await res.json()
        setSubjects(data.subjects ?? [])
        setItems(data.items ?? [])
        setHasAnyAttempts(data.hasAnyAttempts ?? false)
        if (data.subjects?.length) setActiveSubjId(data.subjects[0].id)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Active items — split mastered (≥90%) from active
  const { activeItems, masteredItems } = useMemo(() => {
    const subjectItems = items
      .filter(i => i.subjectId === activeSubjId)
      .sort((a, b) => {
        const order = { weak: 0, improving: 1, untested: 2, strong: 3 }
        const od = (order[a.status] ?? 2) - (order[b.status] ?? 2)
        return od !== 0 ? od : (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0)
      })

    // Topics at 90%+ are "mastered" — hide from main list, show collapsed
    const mastered = subjectItems.filter(i => (i.accuracyPct ?? 0) >= 90)
    const active   = subjectItems.filter(i => (i.accuracyPct ?? 0) < 90)
    return { activeItems: active, masteredItems: mastered }
  }, [items, activeSubjId])

  // Enrich subjects with weak count badge
  const enrichedSubjects = useMemo(() =>
    subjects.map(s => ({
      ...s,
      weakCount: items.filter(i => i.subjectId === s.id && i.status === 'weak' && (i.accuracyPct ?? 0) < 90).length,
    })),
    [subjects, items]
  )

  // All items for this subject (for progress summary)
  const allSubjectItems = useMemo(() =>
    items.filter(i => i.subjectId === activeSubjId),
    [items, activeSubjId]
  )

  const activeSubject = enrichedSubjects.find(s => s.id === activeSubjId)

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-primary">Study Plan</h1>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-red-700">Error: {error}</p>
      </div>
    </div>
  )

  if (!subjects.length || !hasAnyAttempts) return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-primary">Study Plan</h1>
          <p className="text-xs text-secondary mt-0.5">Updates after every practice session</p>
        </div>
        <EmptyState />
      </div>
      <PracticeHubFAB />
    </>
  )

  return (
    <>
      <div className="space-y-5 pb-28">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-primary">Study Plan</h1>
            <p className="text-xs text-secondary mt-0.5">Updates after every session</p>
          </div>
          <Link
            href="/diagnostic"
            className="text-[11px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Retake →
          </Link>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {enrichedSubjects.map(s => (
            <SubjectTab
              key={s.id}
              subject={s}
              isActive={s.id === activeSubjId}
              onClick={() => setActiveSubjId(s.id)}
            />
          ))}
        </div>

        {/* Progress summary */}
        <ProgressSummary items={allSubjectItems} />

        {/* Active topic cards */}
        {activeItems.length === 0 && masteredItems.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <p className="text-2xl">🎉</p>
            <p className="text-sm font-bold text-primary">All caught up for {activeSubject?.name}!</p>
            <p className="text-xs text-secondary leading-relaxed max-w-[220px] mx-auto">
              Keep practising to maintain your scores, or take the diagnostic again.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeItems.map((item, idx) => (
              <TopicCard
                key={item.topicId}
                item={{ ...item, subjectName: activeSubject?.name ?? item.subjectName }}
                rank={idx + 1}
              />
            ))}
          </div>
        )}

        {/* Mastered topics — collapsed */}
        <MasteredSection
          items={masteredItems.map(i => ({ ...i, subjectName: activeSubject?.name ?? i.subjectName }))}
        />
      </div>

      <PracticeHubFAB />
    </>
  )
}