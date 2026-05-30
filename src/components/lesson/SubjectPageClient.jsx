'use client'
// src/components/lesson/SubjectPageClient.jsx
// Fixes: full dark mode, search bar, cleaner subtopic list, back button in correct place

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'

// ─── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ topic, progressMap, color, nextSubtopicId, searchQuery }) {
  const [open, setOpen] = useState(false)

  const subtopics = topic.subtopics ?? []
  const published = subtopics.filter(s => s.lesson_status === 'published')

  // Auto-open if any subtopic matches search
  const filteredSubs = searchQuery
    ? subtopics.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : subtopics

  // Don't render topic if search active and no subtopics match
  if (searchQuery && !filteredSubs.length) return null

  const completedInTopic = subtopics.filter(s => progressMap[s.id]?.completed).length
  const totalInTopic     = subtopics.length
  const topicPct         = totalInTopic > 0 ? Math.round((completedInTopic / totalInTopic) * 100) : 0
  const isExpanded       = searchQuery ? true : open

  return (
    <div className="bg-card rounded-2xl border border-default overflow-hidden">
      {/* Topic header */}
      <button
        onClick={() => !searchQuery && setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-subtle transition-colors text-left"
      >
        {/* Completion indicator */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          completedInTopic === totalInTopic && totalInTopic > 0
            ? 'bg-green-100 dark:bg-green-900/40'
            : color.bg
        }`}>
          {completedInTopic === totalInTopic && totalInTopic > 0 ? (
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className={`text-xs font-black ${color.text}`}>{completedInTopic}/{totalInTopic}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-primary truncate">{topic.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-subtle rounded-full overflow-hidden max-w-[80px]">
              <div
                className={`h-full ${color.accent} rounded-full transition-all duration-500`}
                style={{ width: `${topicPct}%` }}
              />
            </div>
            <span className="text-xs text-tertiary">{published.length} lesson{published.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {!searchQuery && (
          <svg
            className={`w-4 h-4 text-tertiary flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Subtopics list */}
      {isExpanded && (
        <div className="border-t border-default divide-y divide-default">
          {filteredSubs.map(subtopic => {
            const prog       = progressMap[subtopic.id]
            const completed  = prog?.completed ?? false
            const inProgress = !completed && (prog?.slides_completed ?? 0) > 0
            const isNext     = subtopic.id === nextSubtopicId
            const hasLesson  = subtopic.lesson_status === 'published'

            const statusIcon = completed
              ? <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              : inProgress
              ? <div className="w-5 h-5 rounded-full border-2 border-indigo-400 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
              : isNext
              ? <div className={`w-5 h-5 rounded-full border-2 ${color.border} flex items-center justify-center flex-shrink-0`}>
                  <div className={`w-2 h-2 rounded-full ${color.accent}`} />
                </div>
              : <div className="w-5 h-5 rounded-full border-2 border-default flex-shrink-0" />

            const statusText = !hasLesson
              ? <span className="text-xs text-tertiary">Coming soon</span>
              : completed
              ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Done ✓</span>
              : inProgress
              ? <span className="text-xs text-indigo-500 font-medium">
                  {prog.slides_completed}/{prog.total_slides ?? '?'} slides
                </span>
              : isNext
              ? <span className={`text-xs font-black px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>Up next</span>
              : null

            const row = (
              <div className={`flex items-center gap-3 px-4 py-3 ${hasLesson && !completed ? 'hover:bg-subtle' : ''} transition-colors`}>
                {statusIcon}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${
                    completed ? 'text-tertiary line-through' : isNext ? `font-bold ${color.text}` : 'text-primary font-medium'
                  }`}>
                    {subtopic.name}
                  </p>
                </div>
                {statusText}
                {hasLesson && !completed && (
                  <svg className="w-3.5 h-3.5 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )

            if (!hasLesson) return <div key={subtopic.id}>{row}</div>
            return <Link key={subtopic.id} href={`/student/lesson/${subtopic.id}`}>{row}</Link>
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SubjectPageClient({ subject, topics, progress, learningPath }) {
  const router = useRouter()
  const color  = getSubjectColor(subject.name)
  const [search, setSearch] = useState('')

  // Build progress map
  const progressMap = {}
  progress.forEach(p => { progressMap[p.subtopic_id] = p })

  // Compute overall stats
  const allSubtopics       = topics.flatMap(t => t.subtopics)
  const totalSubtopics     = allSubtopics.length
  const publishedSubtopics = allSubtopics.filter(s => s.lesson_status === 'published').length
  const completedSubtopics = allSubtopics.filter(s => progressMap[s.id]?.completed).length
  const overallPct         = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0
  const mastery            = getMasteryLevel(overallPct)

  // Next subtopic
  let nextSubtopicId = null
  if (learningPath?.ordered_subtopic_ids?.length) {
    nextSubtopicId = learningPath.ordered_subtopic_ids.find(id => {
      const prog    = progressMap[id]
      const sub     = allSubtopics.find(s => s.id === id)
      return sub?.lesson_status === 'published' && !prog?.completed
    }) ?? null
  }
  if (!nextSubtopicId) {
    nextSubtopicId = allSubtopics.find(s =>
      s.lesson_status === 'published' && !progressMap[s.id]?.completed
    )?.id ?? null
  }
  const nextSubtopic = allSubtopics.find(s => s.id === nextSubtopicId)

  return (
    <div className="space-y-4">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Subject header — themed, dark mode safe */}
      <div className={`${color.bg} ${color.border} border rounded-3xl p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className={`text-2xl font-black ${color.text}`}>{subject.name}</h1>
            <p className="text-secondary text-sm mt-0.5">
              {publishedSubtopics} of {totalSubtopics} lessons available
            </p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full bg-white/60 dark:bg-black/20 ${mastery.color} flex-shrink-0`}>
            {mastery.emoji} {mastery.label}
          </span>
        </div>
        <div className="h-2.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
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

      {/* Continue CTA */}
      {nextSubtopic && (
        <Link
          href={`/student/lesson/${nextSubtopic.id}`}
          className={`flex items-center justify-between w-full ${color.accent} text-white rounded-2xl px-5 py-4 hover:opacity-90 transition-opacity active:scale-[0.98]`}
        >
          <div>
            <p className="text-xs font-medium opacity-80">Continue where you left off</p>
            <p className="text-sm font-black mt-0.5">{nextSubtopic.name}</p>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics and subtopics…"
          className="w-full pl-10 pr-4 py-3 bg-card border border-default rounded-2xl text-sm
                     text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-2">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            progressMap={progressMap}
            color={color}
            nextSubtopicId={nextSubtopicId}
            searchQuery={search}
          />
        ))}
        {search && topics.every(t =>
          !(t.subtopics ?? []).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
        ) && (
          <div className="text-center py-8 text-secondary">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-medium">No results for "{search}"</p>
          </div>
        )}
      </div>

      {/* All done */}
      {completedSubtopics === publishedSubtopics && publishedSubtopics > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="font-black text-green-800 dark:text-green-300">
            You've finished all available {subject.name} lessons!
          </p>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">More lessons coming soon.</p>
        </div>
      )}
    </div>
  )
}