'use client'
// src/components/lesson/SubjectPageClient.jsx
//
// TAILWIND v4 COLOUR FIX:
// Dynamic class strings like ${color.bg}, ${color.text}, ${color.accent},
// ${color.border} from getSubjectColor() are assembled at runtime — Tailwind v4
// never sees them, so they render transparent/invisible.
//
// Fix: replaced every dynamic colour className with inline style using
// SUBJECT_STYLES hex values. Affected elements:
//   - Hero header band (background + text)
//   - Progress bar fill in hero
//   - Topic card completion bubble (count text colour, progress fill)
//   - "Up next" badge on subtopic rows
//   - Subtopic name text colour when isNext
//   - Status icon dot when isNext

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMasteryLevel } from '@/lib/theme'

// ── Subject colour map ─────────────────────────────────────────────────────────
const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9', iconBg: 'rgba(14,165,233,0.12)' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce', accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490', accent: '#06b6d4', iconBg: 'rgba(6,182,212,0.12)'  },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)'  },
  'Biology':               { bg: '#ecfdf5', text: '#047857', accent: '#10b981', iconBg: 'rgba(16,185,129,0.12)' },
  'Economics':             { bg: '#fffbeb', text: '#b45309', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)'  },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d', accent: '#ec4899', iconBg: 'rgba(236,72,153,0.12)' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e', accent: '#14b8a6', iconBg: 'rgba(20,184,166,0.12)' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f', accent: '#84cc16', iconBg: 'rgba(132,204,22,0.12)' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', iconBg: 'rgba(99,102,241,0.12)' },
  'default':               { bg: '#eef2ff', text: '#4338ca', accent: '#6366f1', iconBg: 'rgba(99,102,241,0.12)' },
}

function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

// ─── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ topic, progressMap, subjectStyle, nextSubtopicId, searchQuery }) {
  const [open, setOpen] = useState(false)

  const subtopics = topic.subtopics ?? []
  const published = subtopics.filter(s => s.lesson_status === 'published')

  const filteredSubs = searchQuery
    ? subtopics.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : subtopics

  if (searchQuery && !filteredSubs.length) return null

  const completedInTopic = subtopics.filter(s => progressMap[s.id]?.completed).length
  const totalInTopic     = subtopics.length
  const topicPct         = totalInTopic > 0 ? Math.round((completedInTopic / totalInTopic) * 100) : 0
  const isExpanded       = searchQuery ? true : open
  const allDone          = completedInTopic === totalInTopic && totalInTopic > 0

  return (
    <div className="bg-card rounded-2xl border border-default overflow-hidden">
      <button
        onClick={() => !searchQuery && setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-subtle transition-colors text-left"
      >
        {/* Completion bubble — inline style for subject colour */}
        <div
          style={allDone ? undefined : { backgroundColor: subjectStyle.iconBg }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-green-100 dark:bg-green-900/40' : ''}`}
        >
          {allDone ? (
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span style={{ color: subjectStyle.text }} className="text-xs font-black">
              {completedInTopic}/{totalInTopic}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-primary truncate">{topic.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {/* Progress bar — inline style for fill colour */}
            <div className="flex-1 h-1 bg-subtle rounded-full overflow-hidden max-w-[80px]">
              <div
                style={{ width: `${topicPct}%`, backgroundColor: subjectStyle.accent }}
                className="h-full rounded-full transition-all duration-500"
              />
            </div>
            <span className="text-xs text-tertiary">
              {published.length} lesson{published.length !== 1 ? 's' : ''}
            </span>
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
              ? <div
                  style={{ borderColor: subjectStyle.accent }}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                >
                  <div style={{ backgroundColor: subjectStyle.accent }} className="w-2 h-2 rounded-full" />
                </div>
              : <div className="w-5 h-5 rounded-full border-2 border-default flex-shrink-0" />

            // "Up next" badge — inline style instead of dynamic className
            const statusText = !hasLesson
              ? <span className="text-xs text-tertiary">Coming soon</span>
              : completed
              ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Done ✓</span>
              : inProgress
              ? <span className="text-xs text-indigo-500 font-medium">
                  {prog.slides_completed}/{prog.total_slides ?? '?'} slides
                </span>
              : isNext
              ? <span
                  style={{ backgroundColor: subjectStyle.bg, color: subjectStyle.text }}
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                >
                  Up next
                </span>
              : null

            const row = (
              <div className={`flex items-center gap-3 px-4 py-3 ${hasLesson && !completed ? 'hover:bg-subtle' : ''} transition-colors`}>
                {statusIcon}
                <div className="flex-1 min-w-0">
                  {/* Subtopic name — inline style for isNext colour */}
                  <p
                    style={isNext && !completed ? { color: subjectStyle.text } : undefined}
                    className={`text-sm truncate ${
                      completed ? 'text-tertiary line-through'
                      : isNext   ? 'font-bold'
                      :            'text-primary font-medium'
                    }`}
                  >
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
            return <Link key={subtopic.id} href={`/student/learn/${subtopic.slug}`}>{row}</Link>
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SubjectPageClient({ subject, topics, progress, learningPath }) {
  const router = useRouter()
  const s      = getSubjectStyle(subject.name)
  const [search, setSearch] = useState('')

  const progressMap = {}
  progress.forEach(p => { progressMap[p.subtopic_id] = p })

  const allSubtopics       = topics.flatMap(t => t.subtopics)
  const totalSubtopics     = allSubtopics.length
  const publishedSubtopics = allSubtopics.filter(sub => sub.lesson_status === 'published').length
  const completedSubtopics = allSubtopics.filter(sub => progressMap[sub.id]?.completed).length
  const overallPct         = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0
  const mastery            = getMasteryLevel(overallPct)

  let nextSubtopicId = null
  if (learningPath?.ordered_subtopic_ids?.length) {
    nextSubtopicId = learningPath.ordered_subtopic_ids.find(id => {
      const prog = progressMap[id]
      const sub  = allSubtopics.find(sub => sub.id === id)
      return sub?.lesson_status === 'published' && !prog?.completed
    }) ?? null
  }
  if (!nextSubtopicId) {
    nextSubtopicId = allSubtopics.find(sub =>
      sub.lesson_status === 'published' && !progressMap[sub.id]?.completed
    )?.id ?? null
  }

  const nextSubtopic = allSubtopics.find(sub => sub.id === nextSubtopicId)
  const filteredTopics = useMemo(() =>
    topics.filter(t => {
      if (!search) return true
      return (t.subtopics ?? []).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
        || t.name.toLowerCase().includes(search.toLowerCase())
    }),
    [topics, search]
  )

  return (
    <div className="pb-20 space-y-5">
      {/* Hero header */}
      <div style={{ backgroundColor: s.bg }} className="rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 style={{ color: s.text }} className="text-2xl font-black leading-tight">
                {subject.name}
              </h1>
              <p style={{ color: s.text }} className="text-sm mt-0.5 opacity-70">
                {totalSubtopics} subtopics · {publishedSubtopics} lessons available
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl">{mastery.emoji}</span>
              <p style={{ color: s.text }} className="text-xs font-black mt-0.5 opacity-70">
                {mastery.label}
              </p>
            </div>
          </div>

          {/* Overall progress bar — inline style for fill colour */}
          <div className="mt-4 space-y-1.5">
            <div className="h-2 bg-white/40 rounded-full overflow-hidden">
              <div
                style={{ width: `${overallPct}%`, backgroundColor: s.accent }}
                className="h-full rounded-full transition-all duration-700"
              />
            </div>
            <div className="flex items-center justify-between">
              <p style={{ color: s.text }} className="text-xs opacity-70">
                {completedSubtopics} of {totalSubtopics} completed
              </p>
              <p style={{ color: s.text }} className="text-xs font-black">{overallPct}%</p>
            </div>
          </div>
        </div>

        {/* Continue button */}
        {nextSubtopic && (
          <div className="bg-card/80 px-4 py-3 border-t border-default">
            <Link
              href={`/student/learn/${nextSubtopic.slug}`}
              className="flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div style={{ backgroundColor: s.iconBg }} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg style={{ color: s.text }} className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-tertiary">Continue</p>
                  <p className="text-sm font-black text-primary truncate">{nextSubtopic.name}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-tertiary group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="w-4 h-4 text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="search"
          placeholder="Search subtopics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-default rounded-2xl pl-9 pr-4 py-2.5 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-indigo-300 transition-colors"
        />
      </div>

      {/* Topics list */}
      <div className="space-y-2.5">
        {filteredTopics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            progressMap={progressMap}
            subjectStyle={s}
            nextSubtopicId={nextSubtopicId}
            searchQuery={search}
          />
        ))}
        {filteredTopics.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-tertiary">No subtopics match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}