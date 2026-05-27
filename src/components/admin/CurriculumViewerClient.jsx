'use client'

import { useState } from 'react'
import Link from 'next/link'

const EXAM_COLORS = {
  WAEC: 'bg-blue-100 text-blue-700 border-blue-200',
  JAMB: 'bg-purple-100 text-purple-700 border-purple-200',
  BOTH: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

const STATUS_COLORS = {
  published: 'bg-green-100 text-green-700',
  in_review: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-500',
}

export default function CurriculumViewerClient({ subject, topics }) {
  const [expandedTopics, setExpandedTopics] = useState(new Set())
  const [filterExam, setFilterExam] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const toggleTopic = (id) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedTopics(new Set(topics.map(t => t.id)))
  const collapseAll = () => setExpandedTopics(new Set())

  // Stats
  const allSubtopics = topics.flatMap(t => t.subtopics)
  const published = allSubtopics.filter(s => s.lesson_status === 'published').length
  const inReview  = allSubtopics.filter(s => s.lesson_status === 'in_review').length
  const draft     = allSubtopics.filter(s => s.lesson_status === 'draft').length
  const pct = allSubtopics.length > 0
    ? Math.round((published / allSubtopics.length) * 100) : 0

  // Filter topics
  const filteredTopics = topics
    .map(topic => {
      const filteredSubs = topic.subtopics.filter(sub => {
        const matchExam = filterExam === 'ALL' || sub.exam_type === filterExam
        const matchStatus = filterStatus === 'all' || sub.lesson_status === filterStatus
        const matchSearch = !search ||
          sub.name.toLowerCase().includes(search.toLowerCase()) ||
          topic.name.toLowerCase().includes(search.toLowerCase())
        return matchExam && matchStatus && matchSearch
      })
      return { ...topic, subtopics: filteredSubs }
    })
    .filter(t =>
      (filterExam === 'ALL' || t.exam_type === filterExam || t.subtopics.length > 0) &&
      (!search || t.subtopics.length > 0 || t.name.toLowerCase().includes(search.toLowerCase()))
    )

  return (
    <div className="space-y-5">

      {/* Subject header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-gray-900">{subject.name}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${EXAM_COLORS[subject.exam_type]}`}>
                {subject.exam_type}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {topics.length} topics · {allSubtopics.length} subtopics
            </p>
          </div>
          <Link
            href="/admin/curriculum/upload"
            className="text-xs font-bold px-3 py-2 border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Upload new curriculum
          </Link>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-600 font-medium">✓ {published} published</span>
          {inReview > 0 && <span className="text-blue-600 font-medium">● {inReview} in review</span>}
          {draft > 0 && <span className="text-gray-400">○ {draft} draft</span>}
          <span className="ml-auto text-gray-400">{pct}% complete</span>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics or subtopics..."
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <div className="flex gap-2">
          <select
            value={filterExam}
            onChange={e => setFilterExam(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="ALL">All exams</option>
            <option value="WAEC">WAEC only</option>
            <option value="JAMB">JAMB only</option>
            <option value="BOTH">Both</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="in_review">In review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Expand/collapse */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {filteredTopics.length} topics · {filteredTopics.reduce((a, t) => a + t.subtopics.length, 0)} subtopics
        </p>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline font-medium">
            Expand all
          </button>
          <span className="text-gray-300">·</span>
          <button onClick={collapseAll} className="text-xs text-gray-400 hover:underline">
            Collapse all
          </button>
        </div>
      </div>

      {/* Topic list */}
      <div className="space-y-2">
        {filteredTopics.map((topic, ti) => (
          <div key={topic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

            {/* Topic header */}
            <button
              onClick={() => toggleTopic(topic.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-black flex items-center justify-center flex-shrink-0">
                {topic.order_index}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{topic.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {topic.subtopics.length} subtopics ·{' '}
                  {topic.subtopics.filter(s => s.lesson_status === 'published').length} published
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EXAM_COLORS[topic.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {topic.exam_type}
              </span>
              <span className={`text-gray-300 text-xs transition-transform duration-200 ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Subtopics */}
            {expandedTopics.has(topic.id) && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {topic.subtopics.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">
                    No subtopics match your filters.
                  </p>
                ) : (
                  topic.subtopics.map((sub, si) => (
                    <div key={sub.id} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-300 mt-0.5 w-4 flex-shrink-0">
                          {sub.order_index}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${EXAM_COLORS[sub.exam_type] ?? 'bg-gray-100 text-gray-500 border-gray-200'} border`}>
                              {sub.exam_type}
                            </span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[sub.lesson_status]}`}>
                              {sub.lesson_status}
                            </span>
                            <span className="text-xs text-gray-300">
                              {'★'.repeat(sub.exam_frequency ?? 1)}
                            </span>
                          </div>

                          {/* Objectives */}
                          {sub.objectives?.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {sub.objectives.map((obj, oi) => (
                                <li key={oi} className="text-xs text-gray-500 flex items-start gap-1.5">
                                  <span className="text-indigo-400 flex-shrink-0 mt-0.5">·</span>
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Edit lesson link */}
                        <Link
                          href={`/admin/subjects/${subject.slug}/${topic.slug}/${sub.id}`}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 px-2.5 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex-shrink-0"
                        >
                          {sub.lesson_status === 'draft' ? 'Create lesson' : 'Edit'}
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {filteredTopics.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No topics match your filters.
          </div>
        )}
      </div>
    </div>
  )
}