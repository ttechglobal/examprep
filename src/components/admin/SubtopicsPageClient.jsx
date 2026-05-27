'use client'

import { useState } from 'react'
import Link from 'next/link'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

const STATUS_COLORS = {
  published:  'bg-green-100 text-green-700',
  in_review:  'bg-blue-100 text-blue-700',
  draft:      'bg-gray-100 text-gray-500',
}

export default function SubtopicsPageClient({ subject, topic, subtopics }) {
  const [filter, setFilter] = useState('all')
  const [expandedObjectives, setExpandedObjectives] = useState(new Set())

  const toggleObjectives = (id) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = subtopics.filter(s => {
    if (filter === 'ready') return s.lesson_generated
    if (filter === 'pending') return !s.lesson_generated
    if (filter === 'published') return s.lesson_status === 'published'
    if (filter === 'draft') return s.lesson_status === 'draft'
    return true
  })

  const readyCount = subtopics.filter(s => s.lesson_generated).length
  const pendingCount = subtopics.length - readyCount
  const publishedCount = subtopics.filter(s => s.lesson_status === 'published').length
  const pct = subtopics.length > 0
    ? Math.round((readyCount / subtopics.length) * 100) : 0

  return (
    <div className="space-y-5">

      {/* Topic header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-gray-900">{topic.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EXAM_COLORS[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {topic.exam_type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {subject.name} · {subtopics.length} subtopics
            </p>
          </div>
          <span className={`text-lg font-black ${pct === 100 ? 'text-green-600' : 'text-gray-400'}`}>
            {pct}%
          </span>
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-600 font-medium">{readyCount} lessons ready</span>
          {pendingCount > 0 && <span className="text-amber-500 font-medium">{pendingCount} pending</span>}
          <span className="text-gray-400">{publishedCount} published</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all',       label: `All (${subtopics.length})` },
          { id: 'ready',     label: `Ready (${readyCount})` },
          { id: 'pending',   label: `Pending (${pendingCount})` },
          { id: 'published', label: `Published (${publishedCount})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === f.id
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Subtopics */}
      <div className="space-y-2">
        {filtered.map(subtopic => (
          <div
            key={subtopic.id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-start gap-3 px-4 py-4">
              {/* Order */}
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {subtopic.order_index}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <p className="text-sm font-bold text-gray-900">{subtopic.name}</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${EXAM_COLORS[subtopic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {subtopic.exam_type}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[subtopic.lesson_status]}`}>
                    {subtopic.lesson_status}
                  </span>
                  {subtopic.lesson_generated ? (
                    <span className="text-xs font-medium text-green-600">Lesson Ready ✅</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-500">No Lesson Yet ⏳</span>
                  )}
                </div>

                {/* Objectives */}
                {subtopic.objectives?.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleObjectives(subtopic.id)}
                      className="text-xs text-indigo-500 hover:underline"
                    >
                      {expandedObjectives.has(subtopic.id)
                        ? `Hide objectives ↑`
                        : `${subtopic.objectives.length} objectives ↓`}
                    </button>
                    {expandedObjectives.has(subtopic.id) && (
                      <ul className="mt-2 space-y-1">
                        {subtopic.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                            <span className="text-indigo-400 flex-shrink-0 mt-0.5">·</span>
                            {obj}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Action button */}
              <div className="flex-shrink-0">
                <Link
                  href={`/admin/curriculum/${subject.slug}/${topic.slug}/${subtopic.id}`}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
                    subtopic.lesson_generated
                      ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                      : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {subtopic.lesson_generated ? 'View / Edit →' : 'Generate Lesson →'}
                </Link>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No subtopics match this filter.
          </div>
        )}
      </div>
    </div>
  )
}