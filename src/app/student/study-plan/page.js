'use client'
// src/app/student/study-plan/page.js
// VERSION: 2025-STUDY-PLAN-FIX

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

const STATUS_CONFIG = {
  weak:      { label: 'Needs work',    dot: 'bg-red-400',   badge: 'bg-red-50 text-red-700 border-red-100',     bar: 'bg-red-400',   left: 'border-l-red-400'   },
  improving: { label: 'Getting there', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-100', bar: 'bg-amber-400', left: 'border-l-amber-400' },
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center">
        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-black text-gray-900">Let's find out where to start</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
          Take a quick diagnostic test and we'll build your personal study plan — showing exactly which topics to focus on first.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        <Link href="/diagnostic"
          className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors text-center">
          Take the diagnostic test →
        </Link>
        <Link href="/student/practice"
          className="w-full py-3 bg-gray-50 border border-gray-200 text-gray-600 text-sm font-bold rounded-2xl hover:bg-gray-100 transition-colors text-center">
          Start a practice session
        </Link>
      </div>
    </div>
  )
}

function SubjectTab({ subject, isActive, onClick }) {
  const color = getSubjectColor(subject.name)
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all
        ${isActive ? `${color.bg} ${color.text} shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
      {subject.name}
      {subject.itemCount > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/40' : 'bg-gray-200 text-gray-600'}`}>
          {subject.itemCount}
        </span>
      )}
    </button>
  )
}

function TopicCard({ item }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.weak
  return (
    <Link href={`/student/topics/${item.topicSlug}`} className="block group">
      <div className={`bg-white border border-gray-100 border-l-4 ${cfg.left} rounded-2xl p-4 hover:shadow-sm transition-all duration-200 group-hover:-translate-y-0.5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <p className="text-sm font-black text-gray-900 leading-tight mb-1">{item.topicName}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{item.insightMessage}</p>
          </div>
          <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-indigo-400 transition-colors"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${item.accuracyPct}%` }} />
          </div>
          <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{item.accuracyPct}%</span>
        </div>
      </div>
    </Link>
  )
}

function SubjectEmptyState({ subjectName }) {
  return (
    <div className="flex flex-col items-center py-12 px-4 text-center gap-4">
      <p className="text-sm font-bold text-gray-700">No plan for {subjectName} yet</p>
      <p className="text-xs text-gray-500 max-w-[220px] mx-auto">
        Start a practice session or take the diagnostic so we can track your weak topics.
      </p>
      <Link href="/diagnostic"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 transition-colors">
        Take diagnostic →
      </Link>
    </div>
  )
}

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
        console.log('[study-plan page] API response:', data)
        setSubjects(data.subjects ?? [])
        setItems(data.items ?? [])
        setHasAnyAttempts(data.hasAnyAttempts ?? false)
        if (data.subjects?.length) setActiveSubjId(data.subjects[0].id)
      } catch (e) {
        console.error('[study-plan page] fetch error:', e)
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  const activeItems = useMemo(() =>
    items.filter(i => i.subjectId === activeSubjId).sort((a, b) => a.accuracyPct - b.accuracyPct),
    [items, activeSubjId]
  )
  const activeSubject = subjects.find(s => s.id === activeSubjId)

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="space-y-4 px-1">
      <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-red-700">Error loading study plan: {error}</p>
      </div>
    </div>
  )

  if (!subjects.length || !hasAnyAttempts) return (
    <div className="space-y-4 px-1">
      <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
      <EmptyState />
    </div>
  )

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Updates automatically after every session</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {subjects.map(s => (
          <SubjectTab key={s.id} subject={s} isActive={s.id === activeSubjId} onClick={() => setActiveSubjId(s.id)} />
        ))}
      </div>

      {activeItems.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          {activeItems.filter(i => i.status === 'weak').length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              {activeItems.filter(i => i.status === 'weak').length} need work
            </span>
          )}
          {activeItems.filter(i => i.status === 'improving').length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {activeItems.filter(i => i.status === 'improving').length} improving
            </span>
          )}
        </div>
      )}

      {activeSubject && activeItems.length === 0
        ? <SubjectEmptyState subjectName={activeSubject.name} />
        : <div className="space-y-2.5">{activeItems.map(item => <TopicCard key={item.id} item={item} />)}</div>
      }
    </div>
  )
}