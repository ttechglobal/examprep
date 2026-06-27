'use client'
// src/components/dashboard/TodaysFocus.jsx

import Link from 'next/link'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'

function deriveActions({ learningPaths, lessonProgress, subtopicMap, isDark, max = 3 }) {
  const completedIds = new Set(
    (lessonProgress ?? []).filter(p => p.completed).map(p => p.subtopic_id)
  )
  const actions = []

  for (const path of (learningPaths ?? [])) {
    if (actions.length >= max) break
    const subjectName = path.subjects?.name
    const color = resolveSubjectColors(subjectName, isDark)

    const nextId = (path.ordered_subtopic_ids ?? []).find(id =>
      !completedIds.has(id) && subtopicMap?.[id]?.lesson_status === 'published'
    )
    if (!nextId) continue
    const sub = subtopicMap?.[nextId]
    if (!sub) continue

    actions.push({
      type:      'lesson',
      label:     subjectName,
      sublabel:  sub.name,
      topicName: sub.topics?.name ?? null,
      href:      `/student/lesson/${nextId}`,
      color,
      cta:       'Start lesson',
    })
  }

  // Fill remaining slots with a practice nudge
  if (actions.length < max && (learningPaths?.length ?? 0) > 0) {
    const subjectWithNoLesson = learningPaths.find(
      p => !actions.some(a => a.label === p.subjects?.name)
    ) ?? learningPaths[0]
    const name = subjectWithNoLesson?.subjects?.name
    if (name) {
      actions.push({
        type:     'practice',
        label:    name,
        sublabel: 'Mixed practice session',
        topicName: null,
        href:     '/student/practice',
        color:    resolveSubjectColors(name, isDark),
        cta:      'Practice now',
      })
    }
  }

  return actions.slice(0, max)
}

export default function TodaysFocus({ learningPaths, lessonProgress, subtopicMap }) {
  const isDark = useIsDark()
  const actions = deriveActions({ learningPaths, lessonProgress, subtopicMap, isDark })
  if (!actions.length) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-primary text-sm">Today&apos;s Focus</h3>
        <span className="text-xs text-tertiary">{actions.length} suggested</span>
      </div>

      <div className="space-y-2">
        {actions.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className="flex items-center gap-3 bg-card rounded-2xl border border-default shadow-sm px-4 py-3 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group"
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: action.color.bg }}
            >
              {action.type === 'lesson' ? (
                <svg className="w-5 h-5" style={{ color: action.color.text }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg className="w-5 h-5" style={{ color: action.color.text }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-tertiary uppercase tracking-wide">
                {action.label}{action.topicName ? ` · ${action.topicName}` : ''}
              </p>
              <p className="text-sm font-bold text-primary truncate mt-0.5">{action.sublabel}</p>
            </div>

            <span
              className="text-xs font-black px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: action.color.bg, color: action.color.text }}
            >
              {action.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}