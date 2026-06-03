'use client'
// src/app/school/dashboard/page.js  v2
// Layout: mobile-first but designed for desktop too.
// Desktop uses the sidebar (SchoolNav) and a wider content area with a grid.
// Five sections on one page, each with an id anchor for sidebar links.
// Bottom tab bar only shows on mobile.
// Reports section: generates client-side PDFs via jsPDF.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Colour helpers ───────────────────────────────────────────────────────────
function accColor(pct) {
  if (pct === null || pct === undefined) return { text: 'text-gray-400', bg: 'bg-gray-100', bar: 'bg-gray-200', label: '—' }
  if (pct >= 70) return { text: 'text-green-700',  bg: 'bg-green-50',  bar: 'bg-green-500',  label: 'Strong' }
  if (pct >= 45) return { text: 'text-amber-700',  bg: 'bg-amber-50',  bar: 'bg-amber-400',  label: 'Fair'   }
  return           { text: 'text-red-700',    bg: 'bg-red-50',    bar: 'bg-red-500',    label: 'Weak'   }
}
function AccBar({ pct, h = 'h-2' }) {
  const { bar } = accColor(pct)
  return (
    <div className={`${h} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct ?? 0}%` }} />
    </div>
  )
}

// ─── Mobile bottom tabs ───────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'students', label: 'Students', emoji: '👥' },
  { id: 'topics',   label: 'Topics',   emoji: '📚' },
  { id: 'cohort',   label: 'Cohort',   emoji: '🎓' },
  { id: 'reports',  label: 'Reports',  emoji: '📄' },
]

function MobileBottomTabs({ active, onChange }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-1">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              active === t.id ? 'text-emerald-600' : 'text-gray-400'
            }`}>
            <span className="text-lg leading-none">{t.emoji}</span>
            <span className={`text-[10px] font-bold leading-tight ${active === t.id ? 'text-emerald-600' : 'text-gray-400'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, emoji, accent = 'indigo' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600',
                   amber:  'bg-amber-50  text-amber-600',  red:    'bg-red-50    text-red-600' }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl ${colors[accent]} flex items-center justify-center text-lg flex-shrink-0`}>
        {emoji}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
        <p className="text-xs font-bold text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Create cohort inline form ────────────────────────────────────────────────
function CreateCohortInline({ currentCohort, onCreated }) {
  const [open,     setOpen]     = useState(false)
  const [name,     setName]     = useState('')
  const [session,  setSession]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/school/cohort', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), session: session.trim() }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onCreated?.(data.cohort)
      setOpen(false); setName(''); setSession('')
    } catch { setError('Failed — try again') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎓</span>
          <div className="text-left">
            <p className="text-sm font-black text-gray-900">
              {currentCohort ? `New cohort (archives "${currentCohort.name}")` : 'Create your first cohort'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {currentCohort ? 'Start a fresh cohort for a new set of students' : 'Get a code to share with your students'}
            </p>
          </div>
        </div>
        <span className={`text-sm transition-transform ${open ? 'rotate-180' : ''} text-gray-400`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50">
          {currentCohort && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠ "{currentCohort.name}" will be archived. Student data is preserved.
            </p>
          )}
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Cohort name (e.g. SS3 Science 2026)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <input value={session} onChange={e => setSession(e.target.value)}
            placeholder="Session (e.g. 2025/2026) — optional"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving || !name.trim()}
              className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-500 disabled:opacity-40 transition-colors">
              {saving ? 'Creating…' : 'Create cohort →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OVERVIEW SECTION ─────────────────────────────────────────────────────────
function OverviewSection({ data, onTabChange, onCohortCreated }) {
  const { summary, subjectTopics, weeklyEngagement, atRisk, students, cohort } = data
  const engRate = summary.totalStudents > 0
    ? Math.round((summary.activeThisWeek / summary.totalStudents) * 100) : 0

  const topWeak = subjectTopics
    .flatMap(s => s.topics.filter(t => t.total >= 3).map(t => ({ ...t, subjectName: s.subjectName })))
    .sort((a, b) => a.accuracy - b.accuracy).slice(0, 4)

  const streakLeaders = [...students].filter(s => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 3)

  return (
    <div id="overview" className="space-y-5">
      {/* No cohort CTA */}
      {!cohort && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <p className="text-lg font-black mb-1">Get started</p>
          <p className="text-sm opacity-90 mb-4">Create a cohort to get your invite code and start tracking your students.</p>
          <CreateCohortInline currentCohort={null} onCreated={onCohortCreated} />
        </div>
      )}

      {/* Stats grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Students"   value={summary.totalStudents} emoji="👥" accent="indigo" />
        <StatCard
          label="Active This Week"
          value={summary.activeThisWeek}
          sub={`${engRate}% engagement`}
          emoji="🔥"
          accent={engRate >= 60 ? 'emerald' : engRate >= 30 ? 'amber' : 'red'}
        />
        <StatCard
          label="Avg Accuracy"
          value={summary.avgAccuracy !== null ? `${summary.avgAccuracy}%` : '—'}
          sub="30-day practice"
          emoji="🎯"
          accent={summary.avgAccuracy >= 70 ? 'emerald' : 'indigo'}
        />
        <StatCard label="Lessons This Week" value={summary.lessonsThisWeek} emoji="📚" accent="indigo" />
      </div>

      {/* Engagement alert */}
      {summary.totalStudents > 0 && (
        <div className={`rounded-2xl px-4 py-3.5 ${
          engRate >= 60 ? 'bg-emerald-50 border border-emerald-200' :
          engRate >= 30 ? 'bg-amber-50 border border-amber-200' :
                          'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm font-bold leading-snug ${
            engRate >= 60 ? 'text-emerald-800' : engRate >= 30 ? 'text-amber-800' : 'text-red-800'
          }`}>
            {engRate >= 60
              ? `🎉 Great engagement — ${summary.activeThisWeek} of ${summary.totalStudents} students active this week`
              : engRate >= 30
              ? `📢 ${summary.totalStudents - summary.activeThisWeek} students haven't studied this week`
              : `⚠️ Low engagement — only ${summary.activeThisWeek} students active this week`}
          </p>
        </div>
      )}

      {/* Desktop: two-column layout for bottom section */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0">

        {/* At-risk */}
        {atRisk.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 flex items-center justify-between">
              <p className="text-sm font-black text-red-700">⚠ Needs attention ({atRisk.length})</p>
              <button onClick={() => onTabChange('students')} className="text-xs text-red-600 font-bold hover:underline">
                View all →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {students.filter(s => atRisk.includes(s.id)).slice(0, 5).map(s => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-black text-red-600">{s.full_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    !s.isActiveThisWeek ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'
                  }`}>
                    {!s.isActiveThisWeek ? 'Inactive' : `${s.accuracy}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak topics */}
        {topWeak.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-black text-gray-900">Weakest Topics</p>
              <button onClick={() => onTabChange('topics')} className="text-xs text-emerald-600 font-bold hover:underline">
                Full breakdown →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {topWeak.map((t, i) => {
                const c = accColor(t.accuracy)
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">{t.subjectName}</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{t.topicName}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ml-3 flex-shrink-0 ${c.bg} ${c.text}`}>
                        {t.accuracy}%
                      </span>
                    </div>
                    <AccBar pct={t.accuracy} />
                    <p className="text-xs text-gray-400 mt-1">{t.total} attempts</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly engagement */}
        {weeklyEngagement.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-black text-gray-900 mb-4">Weekly Engagement</p>
            <div className="flex items-end gap-2 h-24">
              {weeklyEngagement.map((w, i) => {
                const maxA = Math.max(...weeklyEngagement.map(x => x.active), 1)
                const h    = summary.totalStudents > 0 ? Math.max(4, Math.round((w.active / maxA) * 80)) : 4
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <p className="text-xs font-black text-emerald-600">{w.active}</p>
                    <div className="w-full flex items-end" style={{ height: 60 }}>
                      <div className="w-full bg-emerald-500 rounded-t-lg transition-all duration-700" style={{ height: `${h}px` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">{w.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Streak leaders */}
        {streakLeaders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-black text-gray-900">🔥 Streak Leaders</p>
            </div>
            <div className="divide-y divide-gray-50">
              {streakLeaders.map((s, i) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-gray-300 w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-xs font-black text-orange-600">{s.full_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                  </div>
                  <span className="text-sm font-black text-orange-600">{s.currentStreak}d 🔥</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── STUDENTS SECTION ─────────────────────────────────────────────────────────
function StudentsSection({ students, atRisk }) {
  const [search,     setSearch]    = useState('')
  const [sortBy,     setSortBy]    = useState('name')
  const [filter,     setFilter]    = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = students
    .filter(s => {
      if (filter === 'at_risk')  return atRisk.includes(s.id)
      if (filter === 'active')   return s.isActiveThisWeek
      if (filter === 'inactive') return !s.isActiveThisWeek
      return true
    })
    .filter(s => !search || s.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'accuracy') return (b.accuracy ?? -1) - (a.accuracy ?? -1)
      if (sortBy === 'streak')   return b.currentStreak - a.currentStreak
      return (a.full_name ?? '').localeCompare(b.full_name ?? '')
    })

  return (
    <div id="students" className="space-y-4 pt-2 lg:pt-0">
      <div className="lg:flex lg:items-center lg:justify-between">
        <h2 className="text-lg font-black text-gray-900 hidden lg:block">Students</h2>
        <p className="text-sm text-gray-500 hidden lg:block">{students.length} students in cohort</p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search students…"
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'all',      label: `All (${students.length})` },
          { id: 'at_risk',  label: `⚠ At risk (${atRisk.length})` },
          { id: 'active',   label: 'Active' },
          { id: 'inactive', label: 'Inactive' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              filter === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:border-emerald-300'
            }`}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex gap-1 flex-shrink-0">
          {[{ id: 'name', l: 'Name' }, { id: 'accuracy', l: 'Acc' }, { id: 'streak', l: 'Streak' }].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                sortBy === s.id ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-700'
              }`}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm text-gray-500">No students match</p>
          </div>
        )}
        {filtered.map(s => {
          const c = accColor(s.accuracy)
          const isExpanded = expandedId === s.id
          const isAtRisk   = atRisk.includes(s.id)
          return (
            <div key={s.id} className={`bg-white rounded-2xl border overflow-hidden ${isAtRisk ? 'border-red-200' : 'border-gray-200'}`}>
              <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isAtRisk ? 'bg-red-100' : s.isActiveThisWeek ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <span className={`text-sm font-black ${isAtRisk ? 'text-red-600' : s.isActiveThisWeek ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{s.full_name}</p>
                    {s.currentStreak > 0 && <span className="text-xs text-orange-500 font-bold flex-shrink-0">{s.currentStreak}d 🔥</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.isActiveThisWeek ? '✓ Active this week' : 'Inactive this week'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.accuracy !== null && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{s.accuracy}%</span>
                  )}
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: 'Accuracy',     v: s.accuracy !== null ? `${s.accuracy}%` : '—', col: c.text },
                      { l: 'Streak',       v: `${s.currentStreak}d`, col: 'text-orange-600' },
                      { l: 'Lessons/wk',   v: s.lessonsThisWeek,     col: 'text-indigo-600' },
                    ].map(stat => (
                      <div key={stat.l} className="bg-white rounded-xl p-2.5 text-center border border-gray-100">
                        <p className={`text-lg font-black ${stat.col}`}>{stat.v}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{stat.l}</p>
                      </div>
                    ))}
                  </div>
                  {s.subjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.subjects.map(sub => {
                        const sa = s.subjectAcc?.[sub]
                        const sacc = sa && sa.total > 0 ? Math.round((sa.correct / sa.total) * 100) : null
                        const sc = accColor(sacc)
                        return (
                          <div key={sub} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-2.5 py-1.5">
                            <p className="text-xs font-bold text-gray-700">{sub}</p>
                            {sacc !== null && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sacc}%</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {Object.keys(s.subjectAcc ?? {}).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">No practice data yet</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TOPICS SECTION ───────────────────────────────────────────────────────────
function TopicsSection({ subjectTopics }) {
  const [selected, setSelected] = useState(subjectTopics[0]?.subjectName ?? '')
  const subject = subjectTopics.find(s => s.subjectName === selected)

  if (!subjectTopics.length) {
    return (
      <div id="topics" className="pt-2 lg:pt-0">
        <h2 className="text-lg font-black text-gray-900 mb-4 hidden lg:block">Topics</h2>
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-3xl mb-2">📚</p>
          <p className="text-sm text-gray-500">Topic performance appears once students start practising</p>
        </div>
      </div>
    )
  }

  return (
    <div id="topics" className="space-y-4 pt-2 lg:pt-0">
      <div className="lg:flex lg:items-center lg:justify-between">
        <h2 className="text-lg font-black text-gray-900 hidden lg:block">Topics</h2>
        <p className="text-xs text-gray-500 hidden lg:block">Sorted weakest first · Last 30 days</p>
      </div>
      <p className="text-xs text-gray-500 lg:hidden">Cohort accuracy per topic · sorted weakest first</p>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {subjectTopics.map(s => {
          const c = accColor(s.accuracy)
          return (
            <button key={s.subjectName} onClick={() => setSelected(s.subjectName)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                selected === s.subjectName ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-700 bg-white hover:border-emerald-300'
              }`}>
              {s.subjectName}
              {s.accuracy !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selected === s.subjectName ? 'bg-white/20 text-white' : `${c.bg} ${c.text}`}`}>
                  {s.accuracy}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {subject && (
        <div className="space-y-2">
          {subject.topics.map((t, i) => {
            const c = accColor(t.accuracy)
            return (
              <div key={t.topicId} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{t.topicName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.total} attempts · {t.correct} correct</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
                    <span className="text-sm font-black text-gray-700">{t.accuracy}%</span>
                  </div>
                </div>
                <AccBar pct={t.accuracy} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── COHORT SECTION ───────────────────────────────────────────────────────────
function CohortSection({ cohort, allCohorts, totalStudents, onCohortCreated }) {
  const [copied,      setCopied]      = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const inviteLink = cohort && typeof window !== 'undefined'
    ? `${window.location.origin}/join/${cohort.invite_code}` : ''

  function copyCode() {
    if (!cohort) return
    navigator.clipboard.writeText(cohort.invite_code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function share() {
    if (!inviteLink) return
    if (navigator.share) {
      navigator.share({ title: `Join ${cohort.name} on ExamPrep`, url: inviteLink })
    } else {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div id="cohort" className="space-y-4 pt-2 lg:pt-0">
      <h2 className="text-lg font-black text-gray-900 hidden lg:block">Cohort</h2>

      {cohort ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <p className="font-black text-gray-900">{cohort.name}</p>
              {cohort.session && <p className="text-xs text-gray-400 mt-0.5">{cohort.session}</p>}
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Active</span>
          </div>

          {/* Big code */}
          <div className="px-4 py-6 bg-gradient-to-br from-emerald-50 to-teal-50">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Student invite code</p>
            <div className="flex items-center justify-between gap-4">
              <p className="text-5xl font-black text-emerald-700 tracking-[0.4em] font-mono">{cohort.invite_code}</p>
              <button onClick={copyCode}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-black border transition-colors ${
                  copied ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-emerald-500 mt-2">Students enter this in ExamPrep → Community → Join School</p>
          </div>

          {/* Share + member count */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              <span className="font-black text-gray-900">{totalStudents}</span> student{totalStudents !== 1 ? 's' : ''} joined
            </p>
            <button onClick={share}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              Share invite
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">🎓</p>
          <p className="font-black text-gray-900 mb-1">No active cohort</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">Create a cohort to get an invite code for your students.</p>
        </div>
      )}

      <CreateCohortInline currentCohort={cohort} onCreated={onCohortCreated} />

      {/* History */}
      {allCohorts.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            <span>Past cohorts ({allCohorts.filter(c => !c.is_active).length})</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHistory && (
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {allCohorts.filter(c => !c.is_active).map(c => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{c.name}</p>
                    {c.session && <p className="text-xs text-gray-400">{c.session}</p>}
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{c.invite_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── REPORTS SECTION ──────────────────────────────────────────────────────────
// PDF generated client-side from JSON data using a print-friendly HTML page
// loaded in a hidden iframe and triggered via window.print().
// No external library needed — uses browser print-to-PDF.

function ReportsSection({ schoolName, cohortName }) {
  const [generating,  setGenerating]  = useState(null)
  const [period,      setPeriod]      = useState('month')
  const iframeRef = useRef(null)

  async function generatePDF(type) {
    setGenerating(type)
    try {
      const res  = await fetch(`/api/school/report?type=${type}&period=${period}`)
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      printReport(type, data)
    } catch { alert('Failed to generate report — try again') }
    finally { setGenerating(null) }
  }

  async function downloadCSV() {
    setGenerating('csv')
    try {
      const res  = await fetch(`/api/school/report?type=students&period=${period}&format=csv`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url
      a.download = `students_report_${period}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed') }
    finally { setGenerating(null) }
  }

  function printReport(type, data) {
    const html = buildReportHTML(type, data)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:210mm;height:297mm;border:none;'
    document.body.appendChild(iframe)
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 600)
  }

  function buildReportHTML(type, data) {
    const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb;">
        <div>
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px;">ExamPrep School Report</div>
          <h1 style="font-size:22px;font-weight:900;margin:0 0 2px;">${data.schoolName}</h1>
          <p style="font-size:12px;color:#6b7280;margin:0;">${data.cohort ? `Cohort: ${data.cohort}` : ''} &nbsp;·&nbsp; ${data.periodLabel}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">Generated ${generated}</p>
        </div>
      </div>`

    let body = ''

    if (type === 'students') {
      const { summary, students } = data
      body = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          ${[
            ['Total Students', summary.total],
            ['Active This Week', summary.active],
            ['Avg Accuracy', summary.avgAccuracy !== null ? `${summary.avgAccuracy}%` : '—'],
            ['Lessons Completed', summary.totalLessons],
          ].map(([l, v]) => `
            <div style="background:#f9fafb;border-radius:12px;padding:14px;">
              <p style="font-size:20px;font-weight:900;margin:0 0 2px;">${v}</p>
              <p style="font-size:10px;color:#6b7280;margin:0;">${l}</p>
            </div>`).join('')}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f3f4f6;">
              ${['Student','Exam','Subjects','Lessons','Questions','Accuracy','Streak','Last Active'].map(h =>
                `<th style="padding:8px 10px;text-align:left;font-weight:700;color:#374151;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${students.map((s, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                <td style="padding:7px 10px;font-weight:600;">${s.name}</td>
                <td style="padding:7px 10px;color:#6b7280;">${s.exam}</td>
                <td style="padding:7px 10px;color:#6b7280;">${s.subjects.join(', ')}</td>
                <td style="padding:7px 10px;">${s.lessons}</td>
                <td style="padding:7px 10px;">${s.total}</td>
                <td style="padding:7px 10px;font-weight:700;color:${s.accuracy >= 70 ? '#16a34a' : s.accuracy >= 45 ? '#d97706' : s.accuracy !== null ? '#dc2626' : '#9ca3af'};">
                  ${s.accuracy !== null ? `${s.accuracy}%` : '—'}
                </td>
                <td style="padding:7px 10px;">${s.streak}d</td>
                <td style="padding:7px 10px;color:#6b7280;">${s.lastActive ? new Date(s.lastActive).toLocaleDateString('en-GB') : 'Never'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`
    }

    if (type === 'subjects') {
      body = data.subjects.map(sub => `
        <div style="margin-bottom:28px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <h2 style="font-size:16px;font-weight:900;margin:0;">${sub.name}</h2>
            <span style="font-size:13px;font-weight:700;color:${sub.accuracy >= 70 ? '#16a34a' : sub.accuracy >= 45 ? '#d97706' : '#dc2626'};">
              ${sub.accuracy !== null ? `${sub.accuracy}% overall` : '—'}
            </span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:7px 10px;text-align:left;font-weight:700;">Topic</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;">Attempts</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;">Accuracy</th>
                <th style="padding:7px 10px;text-align:left;font-weight:700;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${sub.topics.map((t, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                  <td style="padding:7px 10px;font-weight:500;">${t.topicName}</td>
                  <td style="padding:7px 10px;color:#6b7280;">${t.total}</td>
                  <td style="padding:7px 10px;font-weight:700;color:${t.accuracy >= 70 ? '#16a34a' : t.accuracy >= 45 ? '#d97706' : '#dc2626'};">
                    ${t.accuracy}%
                  </td>
                  <td style="padding:7px 10px;">
                    <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:${t.accuracy >= 70 ? '#dcfce7' : t.accuracy >= 45 ? '#fef3c7' : '#fee2e2'};color:${t.accuracy >= 70 ? '#16a34a' : t.accuracy >= 45 ? '#d97706' : '#dc2626'};">
                      ${t.accuracy >= 70 ? 'Strong' : t.accuracy >= 45 ? 'Fair' : 'Needs work'}
                    </span>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')
    }

    if (type === 'management') {
      const { summary, subjectSummary, atRisk, topPerformers } = data
      body = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
          ${[
            ['Total Students',   summary.total],
            ['Active This Week', `${summary.active} (${summary.engRate}%)`],
            ['Avg Accuracy',     summary.avgAccuracy !== null ? `${summary.avgAccuracy}%` : '—'],
            ['Lessons (period)', summary.totalLessons],
            ['Questions (period)', summary.totalQuestions],
            ['Students at risk', atRisk.length],
          ].map(([l, v]) => `
            <div style="background:#f9fafb;border-radius:12px;padding:14px;">
              <p style="font-size:18px;font-weight:900;margin:0 0 2px;">${v}</p>
              <p style="font-size:10px;color:#6b7280;margin:0;">${l}</p>
            </div>`).join('')}
        </div>

        <h2 style="font-size:15px;font-weight:900;margin:24px 0 10px;">Subject Performance</h2>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px;">
          <thead><tr style="background:#f3f4f6;">
            <th style="padding:7px 10px;text-align:left;font-weight:700;">Subject</th>
            <th style="padding:7px 10px;text-align:left;font-weight:700;">Attempts</th>
            <th style="padding:7px 10px;text-align:left;font-weight:700;">Accuracy</th>
          </tr></thead>
          <tbody>
            ${subjectSummary.map((s, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                <td style="padding:7px 10px;font-weight:600;">${s.name}</td>
                <td style="padding:7px 10px;color:#6b7280;">${s.total}</td>
                <td style="padding:7px 10px;font-weight:700;color:${s.accuracy >= 70 ? '#16a34a' : s.accuracy >= 45 ? '#d97706' : '#dc2626'};">
                  ${s.accuracy !== null ? `${s.accuracy}%` : '—'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>

        ${atRisk.length > 0 ? `
          <h2 style="font-size:15px;font-weight:900;margin:0 0 10px;">Students Needing Support</h2>
          <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px;">
            <thead><tr style="background:#fee2e2;">
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Student</th>
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Accuracy</th>
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Status</th>
            </tr></thead>
            <tbody>
              ${atRisk.map((s, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#fef2f2'};">
                  <td style="padding:7px 10px;font-weight:600;">${s.name}</td>
                  <td style="padding:7px 10px;">${s.accuracy !== null ? `${s.accuracy}%` : '—'}</td>
                  <td style="padding:7px 10px;color:#dc2626;">${!s.isActive ? 'Inactive this week' : 'Low accuracy'}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}

        ${topPerformers.length > 0 ? `
          <h2 style="font-size:15px;font-weight:900;margin:0 0 10px;">Top Performers</h2>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#dcfce7;">
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Student</th>
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Accuracy</th>
              <th style="padding:7px 10px;text-align:left;font-weight:700;">Streak</th>
            </tr></thead>
            <tbody>
              ${topPerformers.map((s, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f0fdf4'};">
                  <td style="padding:7px 10px;font-weight:600;">${s.name}</td>
                  <td style="padding:7px 10px;font-weight:700;color:#16a34a;">${s.accuracy}%</td>
                  <td style="padding:7px 10px;">${s.streak}d 🔥</td>
                </tr>`).join('')}
            </tbody>
          </table>` : ''}
      `
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 20mm; size: A4; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111827; margin: 0; }
        * { box-sizing: border-box; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>${header}${body}</body></html>`
  }

  const REPORTS = [
    {
      type:    'management',
      label:   'Management Report',
      sub:     'Executive summary for school board — engagement, accuracy, at-risk students',
      emoji:   '📊',
      color:   'bg-indigo-50 border-indigo-200',
      btnColor:'bg-indigo-600 hover:bg-indigo-500',
    },
    {
      type:    'subjects',
      label:   'Subject Report (Teachers)',
      sub:     'Per-subject topic breakdown — which topics students are weak on',
      emoji:   '📚',
      color:   'bg-emerald-50 border-emerald-200',
      btnColor:'bg-emerald-600 hover:bg-emerald-500',
    },
    {
      type:    'students',
      label:   'Student Progress Report',
      sub:     'Full student table — lessons, accuracy, streak, last active',
      emoji:   '👥',
      color:   'bg-violet-50 border-violet-200',
      btnColor:'bg-violet-600 hover:bg-violet-500',
    },
  ]

  return (
    <div id="reports" className="space-y-4 pt-2 lg:pt-0">
      <div className="lg:flex lg:items-center lg:justify-between">
        <h2 className="text-lg font-black text-gray-900 hidden lg:block">Reports</h2>
        <p className="text-sm text-gray-500 hidden lg:block">Generate and share PDF reports</p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-gray-600">Report period:</p>
        {[{ id: 'week', l: 'Last 7 days' }, { id: 'month', l: 'Last 30 days' }].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              period === p.id ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Report cards */}
      <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {REPORTS.map(r => (
          <div key={r.type} className={`rounded-2xl border ${r.color} p-4 flex flex-col gap-3`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <div>
                <p className="text-sm font-black text-gray-900">{r.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{r.sub}</p>
              </div>
            </div>
            <button
              onClick={() => generatePDF(r.type)}
              disabled={!!generating}
              className={`w-full py-2.5 ${r.btnColor} text-white text-xs font-black rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2`}
            >
              {generating === r.type ? (
                <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Download PDF</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* CSV download */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Export to CSV / Excel</p>
          <p className="text-xs text-gray-400 mt-0.5">Student data table — open in Excel or Google Sheets</p>
        </div>
        <button onClick={downloadCSV} disabled={!!generating}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors">
          {generating === 'csv' ? '…' : '⬇ CSV'}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SchoolDashboardPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const res = await fetch('/api/school/dashboard')
    const d   = await res.json()
    if (d.error) { setError(d.error); setLoading(false); return }
    setData(d); setLoading(false)
  }, [router, supabase])

  useEffect(() => { load() }, [load])

  function handleCohortCreated(newCohort) {
    setData(prev => prev ? {
      ...prev,
      cohort:     newCohort,
      allCohorts: [newCohort, ...(prev.allCohorts ?? [])],
      summary:    { ...prev.summary, totalStudents: 0 },
    } : prev)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading school data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm font-bold text-gray-700 mb-2">{error}</p>
          <button onClick={load} className="text-emerald-600 text-sm hover:underline">Try again</button>
        </div>
      </div>
    )
  }

  const { cohort, allCohorts, summary, students, subjectTopics, weeklyEngagement, atRisk, school } = data

  // On desktop everything is visible in one page with scroll.
  // On mobile only the active tab content is shown.
  return (
    <>
      {/* ── Page header (mobile only — desktop uses sidebar) ── */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-black text-gray-900">Dashboard</h1>
          {cohort && <p className="text-xs text-gray-400">{cohort.name}</p>}
        </div>
      </div>

      {/* Desktop: page header */}
      <div className="hidden lg:flex lg:items-center lg:justify-between lg:mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">School Dashboard</h1>
          {cohort
            ? <p className="text-sm text-gray-500 mt-1">Active cohort: {cohort.name}{cohort.session ? ` · ${cohort.session}` : ''}</p>
            : <p className="text-sm text-gray-500 mt-1">No active cohort yet</p>
          }
        </div>
        {!cohort && (
          <div className="w-72">
            <CreateCohortInline currentCohort={null} onCreated={handleCohortCreated} />
          </div>
        )}
      </div>

      {/* ── MOBILE: tab-based single section ── */}
      <div className="lg:hidden">
        {tab === 'overview' && (
          <OverviewSection data={data} onTabChange={setTab} onCohortCreated={handleCohortCreated} />
        )}
        {tab === 'students' && (
          <StudentsSection students={students} atRisk={atRisk} />
        )}
        {tab === 'topics' && (
          <TopicsSection subjectTopics={subjectTopics} />
        )}
        {tab === 'cohort' && (
          <CohortSection cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents} onCohortCreated={handleCohortCreated} />
        )}
        {tab === 'reports' && (
          <ReportsSection schoolName={school?.name ?? ''} cohortName={cohort?.name ?? ''} />
        )}
      </div>

      {/* ── DESKTOP: all sections stacked with anchors ── */}
      <div className="hidden lg:block space-y-16">
        <OverviewSection data={data} onTabChange={setTab} onCohortCreated={handleCohortCreated} />
        <StudentsSection students={students} atRisk={atRisk} />
        <TopicsSection subjectTopics={subjectTopics} />
        <CohortSection cohort={cohort} allCohorts={allCohorts} totalStudents={summary.totalStudents} onCohortCreated={handleCohortCreated} />
        <ReportsSection schoolName={school?.name ?? ''} cohortName={cohort?.name ?? ''} />
      </div>

      <MobileBottomTabs active={tab} onChange={setTab} />
    </>
  )
}