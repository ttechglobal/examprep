'use client'
// src/app/student/practice/page.js
// Practice HQ — central hub for all practice activity.
// Modes: Topic Practice · Timed Test · Mock Test · Exam Simulation
// Tabs:  Practice (modes) · History (past sessions + performance trend)

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ─── Mode cards ───────────────────────────────────────────────────────────────
const MODES = [
  {
    id:       'topic',
    emoji:    '🎯',
    title:    'Topic Practice',
    desc:     'Focus on one topic at a time',
    badge:    null,
    gradient: 'from-indigo-500 to-violet-600',
    light:    'bg-indigo-50 text-indigo-700',
    cta:      'Choose topic →',
  },
  {
    id:       'timed',
    emoji:    '⏱',
    title:    'Timed Practice Test',
    desc:     '10, 20, or 30 questions with a timer',
    badge:    null,
    gradient: 'from-blue-500 to-cyan-500',
    light:    'bg-blue-50 text-blue-700',
    cta:      'Start test →',
  },
  {
    id:       'mock',
    emoji:    '📋',
    title:    'Mock Test',
    desc:     'Full subject test, mixed difficulty',
    badge:    'Popular',
    gradient: 'from-emerald-500 to-teal-500',
    light:    'bg-emerald-50 text-emerald-700',
    cta:      'Start mock →',
  },
  {
    id:       'exam',
    emoji:    '🏆',
    title:    'Exam Simulation',
    desc:     'Full WAEC/JAMB format — real conditions',
    badge:    'Challenge',
    gradient: 'from-orange-500 to-red-500',
    light:    'bg-orange-50 text-orange-700',
    cta:      'Simulate exam →',
  },
]

// ─── Subject picker modal ─────────────────────────────────────────────────────
function SubjectPicker({ subjects, onSelect, onClose, title, subtitle }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div
        className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-2 pb-3">
          <h3 className="font-black text-gray-900 text-base">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="px-4 pb-6 space-y-2">
          {subjects.map(s => {
            const color = getSubjectColor(s.name)
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 ${color.bg} rounded-2xl text-left hover:opacity-90 active:scale-[0.98] transition-all`}
              >
                <div className={`w-10 h-10 rounded-xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-black">{s.name.slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${color.text}`}>{s.name}</p>
                  <p className={`text-xs ${color.text} opacity-60 mt-0.5`}>{s.exam_type}</p>
                </div>
                <svg className={`w-4 h-4 ${color.text} opacity-40`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Quick count picker ───────────────────────────────────────────────────────
function CountPicker({ onSelect, onClose, title, options = [10, 20, 30] }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const times = { 10: '15 min', 20: '30 min', 30: '45 min' }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-2 pb-3">
          <h3 className="font-black text-gray-900 text-base">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pick how many questions</p>
        </div>
        <div className="px-4 pb-8 grid grid-cols-3 gap-3">
          {options.map(n => (
            <button
              key={n}
              onClick={() => onSelect(n)}
              className="flex flex-col items-center py-5 bg-indigo-50 rounded-2xl hover:bg-indigo-100 active:scale-95 transition-all"
            >
              <span className="text-2xl font-black text-indigo-700">{n}</span>
              <span className="text-xs text-indigo-500 mt-1">{times[n] ?? `${n * 1.5} min`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ sessions, loading }) {
  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 px-4 py-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">📊</p>
        <p className="font-bold text-gray-700">No practice sessions yet</p>
        <p className="text-sm text-gray-400">Complete a practice session to see your history here</p>
      </div>
    )
  }

  // Compute accuracy trend (last 7 sessions)
  const recent = sessions.slice(0, 7).reverse()
  const maxBar = 100

  return (
    <div className="space-y-5 pt-2">

      {/* Trend mini-chart */}
      {recent.length >= 2 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-black text-gray-900 mb-4">Accuracy Trend</p>
          <div className="flex items-end gap-2 h-20">
            {recent.map((s, i) => {
              const pct = s.score_pct ?? 0
              const isLast = i === recent.length - 1
              const color = getSubjectColor(s.subject_name)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold ${isLast ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {pct}%
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: 56 }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ${isLast ? color.accent : 'bg-gray-200'}`}
                      style={{ height: `${Math.max(4, Math.round((pct / maxBar) * 56))}px` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Older</span>
            <span className="text-xs text-gray-400">Latest</span>
          </div>
        </div>
      )}

      {/* Session list */}
      <div className="space-y-2">
        {sessions.map((s, i) => {
          const color = getSubjectColor(s.subject_name)
          const date  = new Date(s.completed_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
          const pct   = s.score_pct ?? 0

          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-xs font-black ${color.text}`}>{s.subject_name?.slice(0,2).toUpperCase() ?? '??'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {s.mode === 'exam' ? 'Exam Simulation' : s.mode === 'mock' ? 'Mock Test' : `${s.questions_count} Questions`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{s.subject_name ?? 'Mixed'} · {date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-base font-black ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {pct}%
                </p>
                <p className="text-xs text-gray-400">{s.correct_count}/{s.questions_count}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PracticeHQPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [tab, setTab]           = useState('practice')  // 'practice' | 'history'
  const [profile, setProfile]   = useState(null)
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [loading, setLoading]   = useState(true)

  // Modal state
  const [subjectPicker, setSubjectPicker] = useState(null) // { mode }
  const [countPicker, setCountPicker]     = useState(null) // { mode, subject? }

  useEffect(() => { init() }, [])
  useEffect(() => { if (tab === 'history' && !sessions.length) loadHistory() }, [tab])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('subjects, exam_type')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    if (prof?.subjects?.length) {
      const { data: rows } = await supabase
        .from('subjects')
        .select('id, name, slug, exam_type')
        .in('name', prof.subjects)
        .eq('is_active', true)
      setSubjects(rows ?? [])
    }

    setLoading(false)
  }

  async function loadHistory() {
    if (!profile) return
    setSessionsLoading(true)
    try {
      // Aggregate question_attempts into sessions by context + created_at bucket
      const { data: attempts } = await supabase
        .from('question_attempts')
        .select('id, is_correct, subject_id, context, created_at, subjects(name)')
        .eq('student_id', (await supabase.auth.getUser()).data.user.id)
        .order('created_at', { ascending: false })
        .limit(200)

      // Group into pseudo-sessions by 30-min windows
      const grouped = []
      let current   = null

      for (const a of (attempts ?? [])) {
        const t = new Date(a.created_at).getTime()
        if (!current || t < current.startTime - 30 * 60 * 1000) {
          if (current) grouped.push(current)
          current = {
            subject_name:     a.subjects?.name ?? 'Mixed',
            subject_id:       a.subject_id,
            mode:             a.context ?? 'practice',
            questions_count:  0,
            correct_count:    0,
            completed_at:     a.created_at,
            startTime:        t,
          }
        }
        current.questions_count++
        if (a.is_correct) current.correct_count++
      }
      if (current) grouped.push(current)

      setSessions(grouped.map(s => ({
        ...s,
        score_pct: s.questions_count > 0 ? Math.round((s.correct_count / s.questions_count) * 100) : 0,
      })))
    } finally { setSessionsLoading(false) }
  }

  function startSession(config) {
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  function handleModePress(mode) {
    if (mode === 'topic') {
      setSubjectPicker({ mode })
    } else if (mode === 'timed') {
      setCountPicker({ mode, subjects: subjects.map(s => s.name) })
    } else if (mode === 'mock') {
      setSubjectPicker({ mode })
    } else if (mode === 'exam') {
      startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: subjects.map(s => s.name), count: 50, mode: 'exam' })
    }
  }

  function handleSubjectSelected(subject) {
    const mode = subjectPicker.mode
    setSubjectPicker(null)
    if (mode === 'mock') {
      startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: [subject.name], count: 40, mode: 'mock' })
    } else {
      setCountPicker({ mode, subjects: [subject.name] })
    }
  }

  function handleCountSelected(count) {
    const { mode, subjects: subs } = countPicker
    setCountPicker(null)
    startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: subs, count, mode })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Practice HQ</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your hub for every kind of exam practice</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {[{ id: 'practice', label: 'Practice' }, { id: 'history', label: 'History' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-black rounded-xl transition-all ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Practice tab */}
      {tab === 'practice' && (
        <div className="space-y-3">

          {/* Stats strip */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sessions', value: sessions.length },
                { label: 'Avg score', value: `${Math.round(sessions.reduce((a, s) => a + s.score_pct, 0) / sessions.length)}%` },
                { label: 'Best', value: `${Math.max(...sessions.map(s => s.score_pct))}%` },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 text-center">
                  <p className="text-lg font-black text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mode cards — 2 column grid */}
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => handleModePress(mode.id)}
                className="relative bg-white rounded-3xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md hover:border-gray-200 active:scale-[0.97] transition-all overflow-hidden"
              >
                {/* Gradient accent top strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mode.gradient} rounded-t-3xl`} />

                {/* Badge */}
                {mode.badge && (
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black ${mode.light}`}>
                    {mode.badge}
                  </div>
                )}

                <div className="mt-2 mb-3">
                  <span className="text-3xl">{mode.emoji}</span>
                </div>
                <p className="text-sm font-black text-gray-900 leading-snug">{mode.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-snug">{mode.desc}</p>
                <p className={`text-xs font-bold mt-3 bg-gradient-to-r ${mode.gradient} bg-clip-text text-transparent`}>
                  {mode.cta}
                </p>
              </button>
            ))}
          </div>

          {/* Quick start strip */}
          <div className="bg-indigo-600 rounded-3xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-black text-base">Quick Practice</p>
              <p className="text-indigo-200 text-xs mt-0.5">10 random questions, all subjects, right now</p>
            </div>
            <button
              onClick={() => startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: subjects.map(s => s.name), count: 10, mode: 'timed' })}
              className="flex-shrink-0 px-4 py-2.5 bg-white text-indigo-700 text-sm font-black rounded-2xl hover:bg-indigo-50 active:scale-95 transition-all"
            >
              Go →
            </button>
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <HistoryTab sessions={sessions} loading={sessionsLoading} />
      )}

      {/* Subject picker modal */}
      {subjectPicker && (
        <SubjectPicker
          subjects={subjects}
          title={MODES.find(m => m.id === subjectPicker.mode)?.title ?? 'Choose subject'}
          subtitle="Which subject do you want to focus on?"
          onSelect={handleSubjectSelected}
          onClose={() => setSubjectPicker(null)}
        />
      )}

      {/* Count picker modal */}
      {countPicker && (
        <CountPicker
          title="How many questions?"
          onSelect={handleCountSelected}
          onClose={() => setCountPicker(null)}
        />
      )}
    </div>
  )
}