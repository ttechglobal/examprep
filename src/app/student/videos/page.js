'use client'

// src/app/student/videos/page.js  (REPLACE existing file)
// Shows published video lessons, filtered by student's subjects/exam type.
// Students can filter by subject or browse all.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

const LESSON_TYPE_ICONS = {
  calculation: '🧮',
  concept:     '📘',
  mixed:       '🧠',
}

export default function VideosPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile]     = useState(null)
  const [subjects, setSubjects]   = useState([])
  const [lessons, setLessons]     = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)

  const [filterSubject, setFilterSubject] = useState('')
  const [search, setSearch]               = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('exam_type, subjects')
        .eq('id', user.id)
        .single()

      setProfile(prof)

      // Fetch subjects this student is enrolled in
      if (prof?.subjects?.length) {
        const { data: subjectRows } = await supabase
          .from('subjects')
          .select('id, name, slug, exam_type')
          .in('name', prof.subjects)
          .eq('is_active', true)
          .order('name')
        setSubjects(subjectRows ?? [])
      }
    })
  }, [])

  useEffect(() => {
    if (!profile) return
    loadLessons()
  }, [profile, filterSubject, search, page])

  async function loadLessons() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filterSubject)    params.set('subjectId', filterSubject)
    if (search)           params.set('search', search)
    if (profile?.exam_type && profile.exam_type !== 'BOTH') {
      params.set('examType', profile.exam_type)
    }

    const res  = await fetch(`/api/video-lessons?${params}`)
    const data = await res.json()
    setLessons(data.lessons ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Video Lessons</h1>
        <p className="text-gray-500 text-sm mt-1">
          Watch, then practise — every video has 10 questions to test your understanding.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
        placeholder="Search videos..."
        className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />

      {/* Subject filter pills */}
      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => { setFilterSubject(''); setPage(1) }}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
              !filterSubject ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {subjects.map(sub => {
            const c = getSubjectColor(sub.name)
            const active = filterSubject === sub.id
            return (
              <button
                key={sub.id}
                onClick={() => { setFilterSubject(sub.id); setPage(1) }}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                  active ? `${c.accent} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {sub.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Lessons grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-bold text-gray-700">No videos yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'New videos are added every week — check back soon.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map(lesson => {
            const color = getSubjectColor(lesson.subjects?.name ?? '')
            return (
              <Link
                key={lesson.id}
                href={`/student/videos/${lesson.id}`}
                className="block bg-white rounded-3xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xl">
                      {lesson.video_url ? '▶' : LESSON_TYPE_ICONS[lesson.lesson_type] ?? '🎬'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-snug">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {lesson.subjects?.name && (
                        <span className={`text-xs font-bold ${color.text}`}>{lesson.subjects.name}</span>
                      )}
                      {lesson.topics?.name && (
                        <>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{lesson.topics.name}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                        {lesson.exam_type}
                      </span>
                      <span className="text-xs text-gray-400">10 questions</span>
                    </div>
                  </div>

                  <span className="text-gray-300 text-lg flex-shrink-0">›</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-indigo-800">🎬 New videos added every week</p>
        <p className="text-xs text-indigo-600 mt-1">Each video has 10 practice questions to check your understanding.</p>
      </div>
    </div>
  )
}