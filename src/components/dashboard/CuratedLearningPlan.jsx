'use client'
// src/components/dashboard/CuratedLearningPlan.jsx

import Link from 'next/link'
import { getSubjectColor } from '@/lib/theme'

function buildPlanItems({ learningPaths, lessonProgress, subtopicMap, max }) {
  const completedIds = new Set(
    (lessonProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id)
  )

  // Build a per-subject queue of upcoming items
  const queues = (learningPaths ?? []).map(path => (
    (path.ordered_subtopic_ids ?? [])
      .filter(id => !completedIds.has(id))
      .map(id => {
        const sub = subtopicMap?.[id]
        if (!sub) return null
        return {
          id,
          subtopicName: sub.name,
          topicName:    sub.topics?.name ?? '',
          subjectName:  path.subjects?.name ?? '',
          subjectSlug:  path.subjects?.slug ?? '',
          lesson_status: sub.lesson_status,
        }
      })
      .filter(Boolean)
  ))

  // Interleave across subjects
  const result = []
  let safety = 0
  while (result.length < max && safety < 200) {
    safety++
    let added = false
    for (const queue of queues) {
      if (result.length >= max) break
      if (queue.length > 0) { result.push(queue.shift()); added = true }
    }
    if (!added) break
  }
  return result
}

export default function CuratedLearningPlan({ learningPaths, lessonProgress, subtopicMap, maxItems = 5 }) {
  const items = buildPlanItems({ learningPaths, lessonProgress, subtopicMap, max: maxItems })
  if (!items.length) return null

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="font-black text-gray-900 text-sm">Your Study Plan</h3>
          <p className="text-xs text-gray-400 mt-0.5">Ordered by your weak areas</p>
        </div>
        <Link
          href="/student/learn"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors flex items-center gap-1"
        >
          See full plan
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {items.map((item, i) => {
          const color     = getSubjectColor(item.subjectName)
          const hasLesson = item.lesson_status === 'published'
          const isNext    = i === 0

          const inner = (
            <div className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
              hasLesson ? 'hover:bg-gray-50' : 'opacity-60'
            } ${isNext ? 'bg-indigo-50/40' : ''}`}>
              {/* Position number */}
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-gray-400">{i + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                    {item.subjectName}
                  </span>
                  {isNext && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Up next
                    </span>
                  )}
                  {!hasLesson && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{item.subtopicName}</p>
                {item.topicName && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{item.topicName}</p>
                )}
              </div>

              {hasLesson && (
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          )

          return hasLesson
            ? <Link key={item.id} href={`/student/lesson/${item.id}`}>{inner}</Link>
            : <div key={item.id}>{inner}</div>
        })}
      </div>

      {/* Footer link */}
      <div className="px-5 py-3 border-t border-gray-50">
        <Link
          href="/student/learn"
          className="flex items-center justify-center gap-1 w-full py-2.5 text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          See full study plan →
        </Link>
      </div>
    </div>
  )
}