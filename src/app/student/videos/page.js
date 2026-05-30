'use client'
// src/app/student/videos/page.js
// Redesigned: grouped by subject, topic playlists, easy search, dark mode

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// Subject emoji icons — gives each card a visual identity
const SUBJECT_ICONS = {
  'Mathematics':            '📐',
  'English Language':       '📝',
  'Physics':                '⚡',
  'Chemistry':              '🧪',
  'Biology':                '🦋',
  'Economics':              '📊',
  'Government':             '🏛️',
  'Literature':             '📖',
  'Geography':              '🌍',
  'History':                '📜',
  'Commerce':               '🏪',
  'Accounting':             '🧾',
  'Agricultural Science':   '🌱',
  'Further Mathematics':    '🔢',
  'Computer Science':       '💻',
  'Civic Education':        '⚖️',
  'Christian Religious Studies': '✝️',
  'Islamic Religious Studies':   '☪️',
  'Yoruba':                 '🗣️',
  'Igbo':                   '🗣️',
  'Hausa':                  '🗣️',
}

function getSubjectIcon(name) {
  return SUBJECT_ICONS[name] ?? '📚'
}

const LESSON_TYPE_ICONS = {
  calculation: '🧮',
  concept:     '📘',
  mixed:       '🧠',
}

// ─── Single video row ─────────────────────────────────────────────────────────
function VideoRow({ lesson }) {
  const color = getSubjectColor(lesson.subjects?.name ?? '')
  return (
    <Link href={`/student/videos/${lesson.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-subtle transition-colors">
      <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 text-base`}>
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

// ─── Subject group card ───────────────────────────────────────────────────────
function SubjectGroup({ subjectName, lessons, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const color  = getSubjectColor(subjectName)
  const icon   = getSubjectIcon(subjectName)
  const topics = useMemo(() => {
    const map = {}
    lessons.forEach(l => {
      const t = l.topics?.name ?? 'General'
      if (!map[t]) map[t] = []
      map[t].push(l)
    })
    return map
  }, [lessons])

  return (
    <div className="bg-card rounded-2xl border border-default overflow-hidden">
      {/* Subject header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-4 ${color.bg} text-left`}
      >
        <div className={`w-10 h-10 rounded-xl ${color.accent} flex items-center justify-center flex-shrink-0 text-xl`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-base ${color.text}`}>{subjectName}</p>
          <p className={`text-xs ${color.text} opacity-70 mt-0.5`}>
            {lessons.length} video{lessons.length !== 1 ? 's' : ''} · {Object.keys(topics).length} topic{Object.keys(topics).length !== 1 ? 's' : ''}
          </p>
        </div>
        <svg
          className={`w-5 h-5 ${color.text} opacity-70 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Topic groups inside subject */}
      {open && (
        <div className="divide-y divide-default">
          {Object.entries(topics).map(([topicName, topicLessons]) => (
            <div key={topicName}>
              {/* Topic header label */}
              <div className="px-4 py-2 bg-subtle">
                <p className="text-xs font-black text-secondary uppercase tracking-wide">{topicName}</p>
              </div>
              {/* Video rows */}
              <div className="divide-y divide-default">
                {topicLessons.map(lesson => (
                  <VideoRow key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VideosPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile, setProfile]   = useState(null)
  const [subjects, setSubjects] = useState([])
  const [lessons, setLessons]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterSubject, setFilterSubject] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('exam_type, subjects').eq('id', user.id).single()
      setProfile(prof)

      if (prof?.subjects?.length) {
        const { data: subRows } = await supabase.from('subjects')
          .select('id, name, slug, exam_type').in('name', prof.subjects).eq('is_active', true).order('name')
        setSubjects(subRows ?? [])
      }
    })
  }, [])

  useEffect(() => {
    if (!profile) return
    loadAll()
  }, [profile])

  async function loadAll() {
    setLoading(true)
    const params = new URLSearchParams({ page: '1', pageSize: '200' })
    if (profile?.exam_type && profile.exam_type !== 'BOTH') params.set('examType', profile.exam_type)
    const res  = await fetch(`/api/video-lessons?${params}`)
    const data = await res.json()
    setLessons(data.lessons ?? [])
    setLoading(false)
  }

  // Filter lessons
  const filtered = useMemo(() => {
    return lessons.filter(l => {
      if (filterSubject && l.subject_id !== filterSubject) return false
      if (search) {
        const q = search.toLowerCase()
        return l.title.toLowerCase().includes(q) ||
               l.subjects?.name?.toLowerCase().includes(q) ||
               l.topics?.name?.toLowerCase().includes(q)
      }
      return true
    })
  }, [lessons, filterSubject, search])

  // Group by subject
  const bySubject = useMemo(() => {
    const map = {}
    filtered.forEach(l => {
      const name = l.subjects?.name ?? 'Other'
      if (!map[name]) map[name] = []
      map[name].push(l)
    })
    return map
  }, [filtered])

  const hasSearch = search.length > 0 || filterSubject !== ''

  return (
    <div className="space-y-5 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Video Lessons</h1>
        <p className="text-secondary text-sm mt-1">
          Watch, then practise — every video has 5 questions to check your understanding.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search videos, topics, subjects…"
          className="w-full pl-10 pr-4 py-3 bg-card border border-default rounded-2xl text-sm
                     text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

      {/* Subject filter chips */}
      {subjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setFilterSubject('')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              !filterSubject ? 'bg-indigo-600 text-white' : 'bg-card border border-default text-secondary hover:border-indigo-300'
            }`}>
            All
          </button>
          {subjects.map(s => {
            const color  = getSubjectColor(s.name)
            const icon   = getSubjectIcon(s.name)
            const active = filterSubject === s.id
            return (
              <button key={s.id} onClick={() => setFilterSubject(active ? '' : s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active ? `${color.accent} text-white` : 'bg-card border border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}>
                <span>{icon}</span>
                {s.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(bySubject).length === 0 ? (
        <div className="text-center py-16 bg-card border border-default rounded-2xl">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-bold text-primary mb-1">No videos found</p>
          <p className="text-sm text-secondary">
            {hasSearch ? 'Try a different search or clear the filter.' : 'New videos are added every week — check back soon.'}
          </p>
          {hasSearch && (
            <button onClick={() => { setSearch(''); setFilterSubject('') }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(bySubject).map(([subjectName, subLessons], i) => (
            <SubjectGroup
              key={subjectName}
              subjectName={subjectName}
              lessons={subLessons}
              defaultOpen={i === 0 || hasSearch}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && filtered.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">🎬 New videos added every week</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Each video comes with 5 practice questions to test your understanding.</p>
        </div>
      )}
    </div>
  )
}