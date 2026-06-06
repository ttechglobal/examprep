'use client'
// src/app/student/study-plan/page.js
//
// TAILWIND v4 COLOUR FIX:
// Dynamic Tailwind classes like ${color.bg}, ${color.text}, ${cfg.bar}, ${cfg.pill}
// are assembled at runtime and invisible to the v4 scanner — they render transparent.
// Fix: replaced every dynamic colour className with inline style using
// explicit hex values from SUBJECT_STYLES and STATUS_STYLES maps.

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import PracticeHubFAB from '@/components/ui/PracticeHubFAB'

// ── Subject colour map ────────────────────────────────────────────────────────
const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490' },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d' },
  'Biology':               { bg: '#ecfdf5', text: '#047857' },
  'Economics':             { bg: '#fffbeb', text: '#b45309' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c' },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca' },
  'default':               { bg: '#eef2ff', text: '#4338ca' },
}

function getSubjectStyle(name) {
  return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default
}

// ── Status config — inline style values instead of Tailwind classes ───────────
const STATUS = {
  weak:      { label: 'Needs work',  icon: '🎯', barColor: '#f87171', pillBg: '#fef2f2', pillColor: '#dc2626' },
  improving: { label: 'Improving',   icon: '📈', barColor: '#fbbf24', pillBg: '#fffbeb', pillColor: '#d97706' },
  untested:  { label: 'Not started', icon: '📖', barColor: '#a5b4fc', pillBg: '#eef2ff', pillColor: '#4338ca' },
  strong:    { label: 'Strong',      icon: '✅', barColor: '#4ade80', pillBg: '#f0fdf4', pillColor: '#16a34a' },
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function MiniRing({ pct, size = 36 }) {
  const r    = (size / 2) - 4
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

// ── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ item, rank }) {
  const cfg = STATUS[item.status] ?? STATUS.weak
  const s   = getSubjectStyle(item.subjectName ?? '')

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
        {/* Thin top strip — inline style for status colour */}
        <div style={{ backgroundColor: cfg.barColor }} className="h-0.5 w-full" />

        <div className="p-4 flex items-center gap-3">
          {/* Rank bubble */}
          <div className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-black text-tertiary">{rank}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {/* Subject pill — inline style */}
              <span
                style={{ backgroundColor: s.bg, color: s.text }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {item.subjectName}
              </span>
              {/* Status pill — inline style */}
              <span
                style={{ backgroundColor: cfg.pillBg, color: cfg.pillColor }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <p className="text-sm font-black text-primary leading-snug">{item.topicName}</p>
            {item.insightMessage && (
              <p className="text-xs text-secondary mt-0.5 leading-relaxed line-clamp-1">
                {item.insightMessage}
              </p>
            )}
          </div>

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

  const score = Math.round(((improving * 0.5) + (strong * 1)) / total * 100)
  const scoreColor = score >= 60 ? '#16a34a' : score >= 30 ? '#d97706' : undefined

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-primary">Your progress</p>
        <span
          style={scoreColor ? { color: scoreColor } : undefined}
          className={`text-sm font-black tabular-nums ${!scoreColor ? 'text-secondary' : ''}`}
        >
          {score}%
        </span>
      </div>
      <div className="h-2.5 bg-subtle rounded-full overflow-hidden flex">
        {weak > 0 && <div style={{ width: `${(weak / total) * 100}%`, backgroundColor: '#f87171' }} className="h-full transition-all duration-700" />}
        {untested > 0 && <div style={{ width: `${(untested / total) * 100}%`, backgroundColor: '#d1d5db' }} className="h-full transition-all duration-700" />}
        {improving > 0 && <div style={{ width: `${(improving / total) * 100}%`, backgroundColor: '#fbbf24' }} className="h-full transition-all duration-700" />}
        {strong > 0 && <div style={{ width: `${(strong / total) * 100}%`, backgroundColor: '#4ade80' }} className="h-full transition-all duration-700" />}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {weak > 0 && <span className="flex items-center gap-1.5 text-xs text-secondary"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#f87171' }} />{weak} need work</span>}
        {improving > 0 && <span className="flex items-center gap-1.5 text-xs text-secondary"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#fbbf24' }} />{improving} improving</span>}
        {strong > 0 && <span className="flex items-center gap-1.5 text-xs text-secondary"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#4ade80' }} />{strong} mastered</span>}
        {untested > 0 && <span className="flex items-center gap-1.5 text-xs text-secondary"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#d1d5db' }} />{untested} not started</span>}
      </div>
    </div>
  )
}

// ── Subject tab ───────────────────────────────────────────────────────────────
function SubjectTab({ subject, isActive, onClick }) {
  const s = getSubjectStyle(subject.name)
  return (
    <button
      onClick={onClick}
      style={isActive ? { backgroundColor: s.bg, color: s.text } : undefined}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0 ${
        isActive ? 'shadow-sm' : 'bg-subtle text-secondary hover:text-primary'
      }`}
    >
      {subject.name}
      {subject.weakCount > 0 && (
        <span
          style={isActive ? { backgroundColor: 'rgba(255,255,255,0.4)', color: s.text } : { backgroundColor: '#fee2e2', color: '#dc2626' }}
          className="text-[9px] font-black min-w-[14px] h-3.5 px-1 rounded-full"
        >
          {subject.weakCount}
        </span>
      )}
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
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

  const { activeItems, masteredItems } = useMemo(() => {
    const subjectItems = items
      .filter(i => i.subjectId === activeSubjId)
      .sort((a, b) => {
        const order = { weak: 0, improving: 1, untested: 2, strong: 3 }
        const od = (order[a.status] ?? 2) - (order[b.status] ?? 2)
        return od !== 0 ? od : (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0)
      })
    return {
      activeItems:   subjectItems.filter(i => (i.accuracyPct ?? 0) < 90),
      masteredItems: subjectItems.filter(i => (i.accuracyPct ?? 0) >= 90),
    }
  }, [items, activeSubjId])

  const enrichedSubjects = useMemo(() =>
    subjects.map(s => ({
      ...s,
      weakCount: items.filter(i => i.subjectId === s.id && i.status === 'weak' && (i.accuracyPct ?? 0) < 90).length,
    })),
    [subjects, items]
  )

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

        <ProgressSummary items={allSubjectItems} />

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

        <MasteredSection
          items={masteredItems.map(i => ({ ...i, subjectName: activeSubject?.name ?? i.subjectName }))}
        />
      </div>

      <PracticeHubFAB />
    </>
  )
}