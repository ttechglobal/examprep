'use client'
// src/app/student/videos/page.js
//
// TAILWIND v4 COLOUR FIX:
// - VideoRow icon bubble: ${color.bg} → inline style
// - Subject filter chips: ${color.accent} text-white → inline style
// - getSubjectColor import removed, replaced with SUBJECT_STYLES

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4' },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e' },
  'Biology':               { bg: '#ecfdf5', text: '#047857', accent: '#10b981' },
  'Economics':             { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c', accent: '#ef4444' },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d', accent: '#ec4899' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1' },
  'default':               { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1' },
}
function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

const SUBJECT_ICONS = {
  'Mathematics': '📐', 'English Language': '📝', 'Physics': '⚡',
  'Chemistry': '🧪', 'Biology': '🦋', 'Economics': '📊',
  'Government': '🏛️', 'Literature in English': '📖', 'Geography': '🌍',
  'History': '📜', 'Commerce': '🏪', 'Accounting': '🧾',
  'Agricultural Science': '🌱', 'Further Mathematics': '🔢',
  'Computer Science': '💻', 'Civic Education': '⚖️',
}
function getSubjectIcon(name) { return SUBJECT_ICONS[name] ?? '📚' }

const LESSON_TYPE_ICONS = { calculation: '🧮', concept: '📘', mixed: '🧠' }

// ── Video row ─────────────────────────────────────────────────────────────────
function VideoRow({ lesson }) {
  const s = getSubjectStyle(lesson.subjects?.name ?? '')
  return (
    <Link href={`/student/videos/${lesson.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-subtle transition-colors">
      {/* Icon bubble — inline style for subject colour */}
      <div
        style={{ backgroundColor: s.bg }}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
      >
        {LESSON_TYPE_ICONS[lesson.lesson_type] ?? '🎬'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary truncate">{lesson.title}</p>
        {lesson.topics?.name && (
          <p className="text-xs text-tertiary mt-0.5 truncate">{lesson.topics.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-tertiary">5 Qs</span>
        <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </Link>
  )
}

// ── Subject group card ─────────────────────────────────────────────────────────
function SubjectGroup({ subjectName, lessons, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const s    = getSubjectStyle(subjectName)
  const icon = getSubjectIcon(subjectName)

  const topicMap = useMemo(() => {
    const map = {}
    lessons.forEach(l => {
      const t = l.topics?.name ?? 'Other'
      if (!map[t]) map[t] = []
      map[t].push(l)
    })
    return map
  }, [lessons])

  return (
    <div className="bg-card rounded-2xl border border-default overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-subtle transition-colors text-left"
      >
        {/* Subject colour bubble — inline style */}
        <div
          style={{ backgroundColor: s.bg }}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-primary">{subjectName}</p>
          <p className="text-xs text-tertiary">
            {lessons.length} video{lessons.length !== 1 ? 's' : ''} · {Object.keys(topicMap).length} topic{Object.keys(topicMap).length !== 1 ? 's' : ''}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-tertiary transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-default">
          {Object.entries(topicMap).map(([topicName, topicLessons]) => (
            <div key={topicName}>
              {Object.keys(topicMap).length > 1 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-black text-tertiary uppercase tracking-wide">{topicName}</p>
                </div>
              )}
              <div className="divide-y divide-default">
                {topicLessons.map(l => <VideoRow key={l.id} lesson={l} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VideosPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [lessons,       setLessons]       = useState([])
  const [subjects,      setSubjects]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filterSubject, setFilterSubject] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('exam_type, subjects').eq('id', user.id).single()

      const params = new URLSearchParams()
      if (prof?.exam_type) params.set('examType', prof.exam_type)

      const res  = await fetch(`/api/video-lessons?${params}`)
      const data = await res.json()
      const all  = data.lessons ?? []
      setLessons(all)

      // Build subject list from lessons, preserving order
      const seen = new Set()
      const subs = []
      all.forEach(l => {
        if (l.subjects && !seen.has(l.subjects.id)) {
          seen.add(l.subjects.id)
          subs.push(l.subjects)
        }
      })
      setSubjects(subs)
      setLoading(false)
    }
    init()
  }, [])

  const filtered = useMemo(() => {
    let list = lessons
    if (filterSubject) list = list.filter(l => l.subject_id === filterSubject)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.subjects?.name?.toLowerCase().includes(q) ||
        l.topics?.name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [lessons, filterSubject, search])

  const groupedBySubject = useMemo(() => {
    const map = {}
    filtered.forEach(l => {
      const name = l.subjects?.name ?? 'Other'
      if (!map[name]) map[name] = []
      map[name].push(l)
    })
    return map
  }, [filtered])

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-black text-primary">Video Lessons</h1>
        <p className="text-secondary text-sm mt-1">
          Watch, then practise — every video has 5 questions to check your understanding.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search videos, topics, subjects…"
          className="w-full pl-10 pr-4 py-3 bg-card border border-default rounded-2xl text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Subject filter chips — inline style for active colour */}
      {subjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setFilterSubject('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              !filterSubject
                ? 'bg-indigo-600 text-white'
                : 'bg-card border border-default text-secondary hover:border-indigo-300'
            }`}
          >
            All
          </button>
          {subjects.map(sub => {
            const s      = getSubjectStyle(sub.name)
            const icon   = getSubjectIcon(sub.name)
            const active = filterSubject === sub.id
            return (
              <button
                key={sub.id}
                onClick={() => setFilterSubject(active ? '' : sub.id)}
                // Active state uses inline style — avoids dynamic Tailwind class problem
                style={active ? { backgroundColor: s.accent, color: '#ffffff' } : undefined}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active
                    ? ''
                    : 'bg-card border border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                <span>{icon}</span>
                {sub.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-subtle rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedBySubject).length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">🎬</p>
          <p className="text-sm font-bold text-primary">No videos found</p>
          <p className="text-xs text-secondary">
            {search ? 'Try a different search term' : 'Video lessons are being added — check back soon'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedBySubject).map(([subjectName, subLessons], i) => (
            <SubjectGroup
              key={subjectName}
              subjectName={subjectName}
              lessons={subLessons}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}