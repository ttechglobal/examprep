'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import Link from 'next/link'

export default function LessonsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('subjects, exam_type')
        .eq('id', user.id)
        .single()

      const { data: paths } = await supabase
        .from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(name, slug)')
        .eq('student_id', user.id)

      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('subtopic_id, completed')
        .eq('student_id', user.id)

      const completedIds = new Set(progress?.filter(p => p.completed).map(p => p.subtopic_id) ?? [])

      const enriched = (paths ?? []).map(path => {
        const total = path.ordered_subtopic_ids?.length ?? 0
        const completed = path.ordered_subtopic_ids?.filter(id => completedIds.has(id)).length ?? 0
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0
        return { ...path, total, completed, pct, mastery: getMasteryLevel(pct) }
      })

      setSubjects(enriched)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Lessons</h1>
        <p className="text-gray-500 text-sm mt-1">Study topic by topic, build mastery step by step.</p>
      </div>

      {subjects.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-bold text-gray-700 mb-2">No subjects yet</p>
          <p className="text-sm text-gray-400 mb-4">Take a quick test to get your study plan first.</p>
          <Link href="/diagnostic" className="inline-block px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl">
            Take a quick test →
          </Link>
        </div>
      )}

      {subjects.map(sub => {
        const color = getSubjectColor(sub.subjects?.name)
        return (
          <Link
            key={sub.subject_id}
            href={`/student/subjects/${sub.subjects?.slug}`}
            className={`block bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${color.border}`}
          >
            <div className={`${color.bg} px-5 py-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-black text-base ${color.text}`}>{sub.subjects?.name}</h3>
                <span className={`text-xs font-bold ${sub.mastery.color}`}>
                  {sub.mastery.emoji} {sub.mastery.label}
                </span>
              </div>
              <div className="h-2 bg-white/60 rounded-full">
                <div
                  className={`h-full ${color.accent} rounded-full`}
                  style={{ width: `${sub.pct}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${color.text} opacity-80`}>
                {sub.completed} of {sub.total} topics completed
              </p>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {sub.completed === sub.total && sub.total > 0
                  ? '🏆 All topics done!'
                  : `Continue from topic ${sub.completed + 1}`}
              </span>
              <span className={`text-sm font-bold ${color.text}`}>→</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}