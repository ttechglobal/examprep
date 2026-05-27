'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'

function SubtopicStatus({ subtopic, progressMap, isNext, position }) {
  const prog = progressMap[subtopic.id]
  const completed = prog?.completed ?? false
  const inProgress = prog && !prog.completed && prog.slides_completed > 0
  const hasLesson = subtopic.lesson_status === 'published'

  if (completed) {
    return (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <span className="text-green-600 text-sm font-black">✓</span>
      </div>
    )
  }

  if (inProgress) {
    const pct = prog.total_slides > 0
      ? Math.round((prog.slides_completed / prog.total_slides) * 100) : 0
    return (
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 relative">
        <span className="text-indigo-600 text-xs font-black">{pct}%</span>
      </div>
    )
  }

  if (isNext && hasLesson) {
    return (
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-black">→</span>
      </div>
    )
  }

  if (!hasLesson) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <span className="text-gray-300 text-xs">○</span>
      </div>
    )
  }

  return (
    <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-400 text-xs font-medium">{position}</span>
    </div>
  )
}

function TopicCard({ topic, progressMap, color, nextSubtopicId }) {
  const [expanded, setExpanded] = useState(true)

  const totalSubtopics = topic.subtopics.length
  const completedSubtopics = topic.subtopics.filter(s => progressMap[s.id]?.completed).length
  const publishedSubtopics = topic.subtopics.filter(s => s.lesson_status === 'published').length
  const pct = totalSubtopics > 0
    ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Topic header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-black">{topic.order_index}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{topic.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[80px]">
              <div
                className={`h-full ${color.accent} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {completedSubtopics}/{totalSubtopics}
            </span>
            {publishedSubtopics < totalSubtopics && (
              <span className="text-xs text-gray-300">
                · {publishedSubtopics} available
              </span>
            )}
          </div>
        </div>
        <span className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Subtopics */}
      {expanded && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {topic.subtopics.map((subtopic, i) => {
            const hasLesson = subtopic.lesson_status === 'published'
            const isNext = subtopic.id === nextSubtopicId
            const completed = progressMap[subtopic.id]?.completed
            const inProgress = progressMap[subtopic.id] && !completed

            const content = (
              <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                hasLesson
                  ? isNext
                    ? `${color.bg}`
                    : 'hover:bg-gray-50'
                  : 'opacity-50'
              }`}>
                <SubtopicStatus
                  subtopic={subtopic}
                  progressMap={progressMap}
                  isNext={isNext}
                  position={i + 1}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${
                    completed
                      ? 'text-gray-400 line-through'
                      : isNext
                      ? `font-bold ${color.text}`
                      : 'text-gray-800 font-medium'
                  }`}>
                    {subtopic.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {!hasLesson
                      ? 'Lesson coming soon'
                      : completed
                      ? 'Completed ✓'
                      : inProgress
                      ? `In progress — ${progressMap[subtopic.id].slides_completed} slides done`
                      : isNext
                      ? 'Up next for you'
                      : 'Not started'}
                  </p>
                </div>
                {isNext && hasLesson && (
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${color.bg} ${color.text} flex-shrink-0`}>
                    Start
                  </span>
                )}
                {!isNext && hasLesson && !completed && (
                  <span className="text-gray-300 text-sm flex-shrink-0">→</span>
                )}
              </div>
            )

            if (!hasLesson) {
              return (
                <div key={subtopic.id}>
                  {content}
                </div>
              )
            }

            return (
              <Link key={subtopic.id} href={`/student/lesson/${subtopic.id}`}>
                {content}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SubjectPageClient({
  subject,
  topics,
  progress,
  learningPath,
}) {
  const router = useRouter()
  const color = getSubjectColor(subject.name)

  // Build progress map
  const progressMap = {}
  progress.forEach(p => { progressMap[p.subtopic_id] = p })

  // Compute overall stats
  const allSubtopics = topics.flatMap(t => t.subtopics)
  const totalSubtopics = allSubtopics.length
  const publishedSubtopics = allSubtopics.filter(s => s.lesson_status === 'published').length
  const completedSubtopics = allSubtopics.filter(s => progressMap[s.id]?.completed).length
  const overallPct = totalSubtopics > 0
    ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0
  const mastery = getMasteryLevel(overallPct)

  // Find next subtopic from learning path or first incomplete published one
  let nextSubtopicId = null
  if (learningPath?.ordered_subtopic_ids?.length) {
    nextSubtopicId = learningPath.ordered_subtopic_ids.find(id => {
      const prog = progressMap[id]
      const subtopic = allSubtopics.find(s => s.id === id)
      return subtopic?.lesson_status === 'published' && !prog?.completed
    }) ?? null
  }
  if (!nextSubtopicId) {
    nextSubtopicId = allSubtopics.find(s =>
      s.lesson_status === 'published' && !progressMap[s.id]?.completed
    )?.id ?? null
  }

  const nextSubtopic = allSubtopics.find(s => s.id === nextSubtopicId)

  return (
    <div className="space-y-5">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors -mb-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Subject header */}
      <div className={`${color.bg} ${color.border} border rounded-3xl p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className={`text-2xl font-black ${color.text}`}>{subject.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {publishedSubtopics} of {totalSubtopics} lessons available
            </p>
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${mastery.bg} ${mastery.color}`}>
            {mastery.emoji} {mastery.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-xs ${color.text} opacity-80`}>
            {completedSubtopics} of {totalSubtopics} completed
          </span>
          <span className={`text-sm font-black ${color.text}`}>{overallPct}%</span>
        </div>
      </div>

      {/* Continue button */}
      {nextSubtopic && (
        <Link
          href={`/student/lesson/${nextSubtopic.id}`}
          className={`flex items-center justify-between w-full ${color.accent} text-white rounded-2xl px-5 py-4 hover:opacity-90 transition-opacity`}
        >
          <div>
            <p className="text-xs font-medium opacity-80">Continue where you left off</p>
            <p className="text-sm font-black mt-0.5">{nextSubtopic.name}</p>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      {/* Topics */}
      <div className="space-y-3">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            progressMap={progressMap}
            color={color}
            nextSubtopicId={nextSubtopicId}
          />
        ))}
      </div>

      {/* All done */}
      {completedSubtopics === publishedSubtopics && publishedSubtopics > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="font-black text-green-800">
            You've finished all available {subject.name} lessons!
          </p>
          <p className="text-green-600 text-sm mt-1">
            More lessons are being added. Check back soon.
          </p>
        </div>
      )}

    </div>
  )
}