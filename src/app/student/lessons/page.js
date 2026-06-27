'use client'
// src/app/student/lessons/page.js
// Fixes: dark mode compliance, show all subjects (no cap)

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getMasteryLevel } from '@/lib/theme'
import { resolveSubjectColors } from '@/lib/subjectTheme'
import { useIsDark } from '@/lib/useIsDark'
import Link from 'next/link'

export default function LessonsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const isDark   = useIsDark()

  const [subjects, setSubjects] = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: paths }, { data: prog }] = await Promise.all([
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
      supabase.from('lesson_progress')
        .select('subtopic_id, completed').eq('student_id', user.id),
    ])

    const completedIds = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))

    const enriched = (paths ?? []).map(path => {
      const total     = path.ordered_subtopic_ids?.length ?? 0
      const completed = path.ordered_subtopic_ids?.filter(id => completedIds.has(id)).length ?? 0
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { ...path, total, completed, pct, mastery: getMasteryLevel(pct) }
    })

    setSubjects(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-primary">Lessons</h1>
        <p className="text-secondary text-sm mt-1">Study topic by topic, build mastery step by step.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-card rounded-3xl border border-default p-6 text-center space-y-3">
          <p className="text-4xl">📚</p>
          <p className="font-bold text-primary">No subjects yet</p>
          <p className="text-sm text-secondary">Take a quick diagnostic to get your study plan.</p>
          <Link href="/diagnostic"
            className="inline-block px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors">
            Take the diagnostic →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(sub => {
            const color = resolveSubjectColors(sub.subjects?.name, isDark)
            return (
              <Link
                key={sub.subject_id}
                href={`/student/subjects/${sub.subjects?.slug}`}
                className="block bg-card rounded-2xl border border-default overflow-hidden
                           hover:border-indigo-200 dark:hover:border-indigo-700
                           hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="px-5 py-4" style={{ background: color.bg }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-base" style={{ color: color.text }}>{sub.subjects?.name}</h3>
                    <span className={`text-xs font-bold ${sub.mastery.color}`}>
                      {sub.mastery.emoji} {sub.mastery.label}
                    </span>
                  </div>
                  <div className="h-2 bg-card/50 dark:bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${sub.pct}%`, background: color.solid }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs opacity-80" style={{ color: color.text }}>
                      {sub.completed} of {sub.total} topics completed
                    </p>
                    <p className="text-xs font-black" style={{ color: color.text }}>{sub.pct}%</p>
                  </div>
                </div>
                <div className="px-5 py-3 flex items-center justify-between bg-card">
                  <span className="text-sm text-secondary">
                    {sub.completed === sub.total && sub.total > 0
                      ? '🏆 All topics done!'
                      : `${sub.total - sub.completed} topics remaining`}
                  </span>
                  <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}