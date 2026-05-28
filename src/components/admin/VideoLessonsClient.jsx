'use client'

// src/components/admin/VideoLessonsClient.jsx
// Lists all video lessons with filters. Links to create/edit pages.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_COLORS = {
  published: 'bg-green-100 text-green-800',
  draft:     'bg-yellow-100 text-yellow-800',
}

const LESSON_TYPE_LABELS = {
  calculation: '🧮 Calculation',
  concept:     '📘 Concept',
  mixed:       '🧠 Mixed',
}

export default function VideoLessonsClient({ subjects, topics, published, draft }) {
  const [lessons, setLessons]         = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)

  // Filters
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterSubject, setFilterSubject]   = useState('')
  const [filterExam, setFilterExam]         = useState('')
  const [search, setSearch]                 = useState('')

  const filteredTopics = filterSubject
    ? topics.filter(t => t.subject_id === filterSubject)
    : topics

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filterStatus)  params.set('status', filterStatus)
    if (filterSubject) params.set('subjectId', filterSubject)
    if (filterExam)    params.set('examType', filterExam)
    if (search)        params.set('search', search)

    fetch(`/api/admin/video-lessons?${params}`)
      .then(r => r.json())
      .then(data => {
        setLessons(data.lessons ?? [])
        setTotal(data.total ?? 0)
        setLoading(false)
      })
  }, [page, filterStatus, filterSubject, filterExam, search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('Delete this video lesson? This cannot be undone.')) return
    await fetch(`/api/admin/video-lessons/${id}`, { method: 'DELETE' })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Lessons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all video lesson packages — separate from text lessons
          </p>
        </div>
        <Link
          href="/admin/video-lessons/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
        >
          + New Video Lesson
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Published', value: published, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Draft',     value: draft,      color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Total',     value: published + draft, color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by title..."
          className="flex-1 min-w-[200px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={filterExam}
          onChange={e => { setFilterExam(e.target.value); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="">All exams</option>
          <option value="WAEC">WAEC</option>
          <option value="JAMB">JAMB</option>
          <option value="BOTH">BOTH</option>
        </select>
        <select
          value={filterSubject}
          onChange={e => { setFilterSubject(e.target.value); setPage(1) }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-semibold text-gray-600">No video lessons yet</p>
          <p className="text-sm mt-1">Create your first video lesson package to get started.</p>
          <Link
            href="/admin/video-lessons/new"
            className="inline-block mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-colors"
          >
            + Create first video lesson
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[lesson.status]}`}>
                      {lesson.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {LESSON_TYPE_LABELS[lesson.lesson_type] ?? lesson.lesson_type}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-full">
                      {lesson.exam_type}
                    </span>
                  </div>

                  <p className="font-bold text-gray-900 text-sm truncate">{lesson.title}</p>

                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {lesson.subjects?.name && (
                      <span className="font-medium text-gray-600">{lesson.subjects.name}</span>
                    )}
                    {lesson.topics?.name && (
                      <>
                        <span>·</span>
                        <span>{lesson.topics.name}</span>
                      </>
                    )}
                    {lesson.video_url ? (
                      <span className="text-green-600 font-medium">· Video attached ✓</span>
                    ) : (
                      <span className="text-amber-500">· No video yet</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/video-lessons/${lesson.id}`}
                    className="px-3 py-1.5 text-xs font-bold border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}