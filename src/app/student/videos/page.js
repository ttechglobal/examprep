'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

export default function VideosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: paths } = await supabase
        .from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(name, slug)')
        .eq('student_id', user.id)

      if (!paths?.length) { setLoading(false); return }

      const allIds = paths.flatMap(p => p.ordered_subtopic_ids ?? [])

      const { data: subtopics } = await supabase
        .from('subtopics')
        .select('id, name, explainer_video_youtube_id, topics(name)')
        .in('id', allIds)

      const subtopicMap = {}
      subtopics?.forEach(s => { subtopicMap[s.id] = s })

      const enriched = paths.map(path => ({
        ...path,
        subtopics: (path.ordered_subtopic_ids ?? [])
          .map(id => subtopicMap[id])
          .filter(Boolean)
          .slice(0, 8),
      }))

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Video Lessons</h1>
        <p className="text-gray-500 text-sm mt-1">
          Short explainer videos for every topic — being added week by week.
        </p>
      </div>

      {subjects.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center">
          <p className="text-5xl mb-4">🎬</p>
          <p className="font-bold text-gray-700 mb-2">No subjects yet</p>
          <p className="text-sm text-gray-400">Take a diagnostic test to set up your subjects first.</p>
        </div>
      )}

      {subjects.map(sub => {
        const color = getSubjectColor(sub.subjects?.name)
        const availableCount = sub.subtopics.filter(s => s.explainer_video_youtube_id).length

        return (
          <div key={sub.subject_id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className={`font-black text-base ${color.text}`}>{sub.subjects?.name}</h2>
              <span className="text-xs text-gray-400">
                {availableCount} of {sub.subtopics.length} available
              </span>
            </div>

            <div className="space-y-2">
              {sub.subtopics.map(subtopic => {
                const hasVideo = !!subtopic.explainer_video_youtube_id

                return hasVideo ? (
                  <a
                    key={subtopic.id}
                    href={`https://www.youtube.com/watch?v=${subtopic.explainer_video_youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border ${color.border} ${color.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-lg">▶</span>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${color.text}`}>{subtopic.name}</p>
                      <p className="text-xs text-gray-500">{subtopic.topics?.name}</p>
                    </div>
                    <span className={`ml-auto text-xs font-bold ${color.text}`}>Watch →</span>
                  </a>
                ) : (
                  <div
                    key={subtopic.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50 opacity-60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-lg">▶</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{subtopic.name}</p>
                      <p className="text-xs text-gray-400">{subtopic.topics?.name}</p>
                    </div>
                    <span className="ml-auto text-xs text-gray-300 font-medium">Coming soon</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-indigo-800">🎬 New videos added every week</p>
        <p className="text-xs text-indigo-600 mt-1">
          Videos are being added topic by topic. Check back regularly.
        </p>
      </div>
    </div>
  )
}