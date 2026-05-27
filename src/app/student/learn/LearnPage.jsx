'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

function ProgressBar({ pct, colorClass }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-700`}
        style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
      />
    </div>
  )
}

// ── Topic card — expandable subtopic list ─────────────────────
function TopicCard({ topic, completedIds, color, recommendedOrder }) {
  const [expanded, setExpanded] = useState(false)

  const subtopics = topic.subtopics ?? []
  const live = subtopics.filter(s => s.lesson_status === 'published')
  const completed = subtopics.filter(s => completedIds.has(s.id)).length
  const pct = subtopics.length > 0 ? Math.round((completed / subtopics.length) * 100) : 0
  const allDone = completed === subtopics.length && subtopics.length > 0

  // next subtopic = first in recommended order (from study plan) or first incomplete live one
  const nextSubtopic = recommendedOrder
    ? recommendedOrder.find(id => !completedIds.has(id) && subtopics.find(s => s.id === id && s.lesson_status === 'published'))
    : live.find(s => !completedIds.has(s.id))?.id

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
          allDone ? 'bg-green-100 text-green-600' :
          pct > 0 ? `${color.bg} ${color.text}` :
          'bg-gray-100 text-gray-400'
        }`}>
          {allDone ? '✓' : pct > 0 ? `${pct}%` : '○'}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${allDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {topic.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {completed === 0 && live.length === 0
              ? 'Lessons coming soon'
              : completed === 0
              ? `${live.length} lesson${live.length !== 1 ? 's' : ''} ready`
              : completed === subtopics.length
              ? 'All complete 🎉'
              : `${completed} of ${subtopics.length} done`}
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {subtopics.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No subtopics yet.</p>
          ) : (
            subtopics.map((sub, i) => {
              const done = completedIds.has(sub.id)
              const isNext = sub.id === nextSubtopic
              const isLive = sub.lesson_status === 'published'

              return (
                <Link
                  key={sub.id}
                  href={isLive ? `/student/lesson/${sub.id}` : '#'}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    !isLive ? 'opacity-40 cursor-default' :
                    isNext ? `${color.light} hover:opacity-90` :
                    'hover:bg-gray-50'
                  }`}
                  onClick={e => { if (!isLive) e.preventDefault() }}
                >
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-green-100 text-green-600' :
                    isNext ? `${color.accent} text-white` :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>

                  <span className={`text-sm flex-1 ${
                    done ? 'text-gray-400 line-through' :
                    isNext ? `font-semibold ${color.text}` :
                    'text-gray-700'
                  }`}>
                    {sub.name}
                  </span>

                  {isNext && isLive && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text} flex-shrink-0`}>
                      Up next
                    </span>
                  )}
                  {done && <span className="text-xs text-gray-300 flex-shrink-0">Done</span>}
                  {!isLive && <span className="text-xs text-gray-300 flex-shrink-0">Soon</span>}
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Learn page ───────────────────────────────────────────
export default function LearnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [profile, setProfile] = useState(null)
  const [subjectList, setSubjectList] = useState([])      // [{id, name, slug, exam_type}] — from profile subjects
  const [topicsBySubject, setTopicsBySubject] = useState({}) // subjectId → [{id, name, subtopics[]}]
  const [completedIds, setCompletedIds] = useState(new Set())
  const [studyPlanMap, setStudyPlanMap] = useState({})    // subjectId → ordered_subtopic_ids[]
  const [loading, setLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(false)

  // UI state
  const [activeExam, setActiveExam] = useState(null)      // 'WAEC' | 'JAMB' — for BOTH students
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Load profile and progress in parallel
    const [{ data: prof }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))

    // Load study plan if available — purely for ordering hints, not a gate
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('subject_id, ordered_subtopic_ids')
      .eq('student_id', user.id)

    const planMap = {}
    ;(paths ?? []).forEach(p => { planMap[p.subject_id] = p.ordered_subtopic_ids })
    setStudyPlanMap(planMap)

    // Build subject list from profile.subjects
    // These are the subjects the student enrolled for
    const enrolledSubjectNames = prof?.subjects ?? []

    if (enrolledSubjectNames.length === 0) {
      // No subjects set — show a helpful prompt, but still render the page
      setLoading(false)
      return
    }

    // Fetch subject rows matching enrolled names, filtered by exam type
    const examType = prof?.exam_type ?? 'WAEC'
    let subjectQuery = supabase
      .from('subjects')
      .select('id, name, slug, exam_type')
      .in('name', enrolledSubjectNames)
      .eq('is_active', true)

    // For non-BOTH students, also allow BOTH-tagged subjects (they apply to all)
    // We fetch all matching name subjects and filter client-side
    const { data: subjectRows } = await subjectQuery

    // Filter to relevant exam subjects
    const relevant = (subjectRows ?? []).filter(s => {
      if (examType === 'BOTH') return true
      return s.exam_type === examType || s.exam_type === 'BOTH'
    })

    setSubjectList(relevant)

    // Set initial exam toggle and selected subject
    const firstExam = examType === 'BOTH' ? 'WAEC' : null
    setActiveExam(firstExam)

    const subjectParam = searchParams.get('subject')
    const match = subjectParam ? relevant.find(s => s.slug === subjectParam) : null
    const first = match ?? relevant[0]
    if (first) {
      setSelectedSubjectId(first.id)
      loadTopics(first.id)
    } else {
      setLoading(false)
    }
  }

  async function loadTopics(subjectId) {
    if (topicsBySubject[subjectId]) return // already loaded
    setTopicsLoading(true)

    const { data: topics } = await supabase
      .from('topics')
      .select(`
        id, name, slug, order_index,
        subtopics (
          id, name, slug, lesson_status, order_index
        )
      `)
      .eq('subject_id', subjectId)
      .order('order_index')

    // Sort subtopics by order_index
    const sorted = (topics ?? []).map(t => ({
      ...t,
      subtopics: (t.subtopics ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    }))

    setTopicsBySubject(prev => ({ ...prev, [subjectId]: sorted }))
    setTopicsLoading(false)
    setLoading(false)
  }

  const handleSelectSubject = (subjectId) => {
    setSelectedSubjectId(subjectId)
    loadTopics(subjectId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMultiExam = profile?.exam_type === 'BOTH'

  // Subjects visible in current exam tab
  const visibleSubjects = isMultiExam
    ? subjectList.filter(s => s.exam_type === activeExam || s.exam_type === 'BOTH')
    : subjectList

  const selectedSubject = visibleSubjects.find(s => s.id === selectedSubjectId) ?? visibleSubjects[0]
  const topics = selectedSubject ? (topicsBySubject[selectedSubject.id] ?? []) : []
  const color = getSubjectColor(selectedSubject?.name)

  // Study plan order for selected subject (used as ordering hint only)
  const planOrder = selectedSubject ? studyPlanMap[selectedSubject.id] : null

  // Subject-level progress
  const allSubtopicIds = topics.flatMap(t => (t.subtopics ?? []).map(s => s.id))
  const subjectCompleted = allSubtopicIds.filter(id => completedIds.has(id)).length
  const subjectTotal = allSubtopicIds.length
  const subjectPct = subjectTotal > 0 ? Math.round((subjectCompleted / subjectTotal) * 100) : 0

  // ── No subjects enrolled yet ──────────────────────────────────
  if (subjectList.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-black text-gray-900">Learn</h1>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-5xl mb-3">📚</div>
          <h3 className="font-black text-gray-900 text-lg mb-2">No subjects yet</h3>
          <p className="text-gray-500 text-sm mb-5">
            Set up your subjects in your profile to start learning.
          </p>
          <Link
            href="/student/profile"
            className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors"
          >
            Set up subjects →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">

      {/* Page title */}
      <h1 className="text-xl font-black text-gray-900">Learn</h1>

      {/* ── Exam toggle (BOTH students only) ── */}
      {isMultiExam && (
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
          {['WAEC', 'JAMB'].map(exam => (
            <button
              key={exam}
              onClick={() => {
                setActiveExam(exam)
                const first = subjectList.find(s => s.exam_type === exam || s.exam_type === 'BOTH')
                if (first) handleSelectSubject(first.id)
              }}
              className={`px-5 py-2 text-sm font-black rounded-xl transition-all ${
                activeExam === exam
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {exam}
            </button>
          ))}
        </div>
      )}

      {/* ── Subject pill selector ── */}
      {visibleSubjects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {visibleSubjects.map(sub => {
            const c = getSubjectColor(sub.name)
            const isActive = selectedSubject?.id === sub.id
            return (
              <button
                key={sub.id}
                onClick={() => handleSelectSubject(sub.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                  isActive ? `${c.accent} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {sub.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Selected subject header ── */}
      {selectedSubject && (
        <>
          <div className={`${color.bg} rounded-3xl px-5 py-4`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-lg font-black ${color.text}`}>{selectedSubject.name}</h2>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white/60 ${color.text}`}>
                {subjectPct}%
              </span>
            </div>
            <ProgressBar pct={subjectPct} colorClass={color.accent} />
            <p className={`text-xs mt-1.5 ${color.text} opacity-70`}>
              {subjectCompleted === 0
                ? 'Ready to start! 🚀'
                : subjectCompleted === subjectTotal && subjectTotal > 0
                ? '🏆 All topics completed!'
                : `${subjectCompleted} of ${subjectTotal} subtopics done`}
            </p>
          </div>

          {/* ── Topics ── */}
          {topicsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topics.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-gray-400 text-sm">No topics uploaded yet for this subject.</p>
              <p className="text-xs text-gray-400 mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-gray-900">Topics</h3>
                <span className="text-xs text-gray-400">{topics.length} topics</span>
              </div>

              {topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  completedIds={completedIds}
                  color={color}
                  recommendedOrder={planOrder}
                />
              ))}
            </div>
          )}

          {/* ── Practice section ── */}
          <div className="pt-2">
            <h3 className="text-sm font-black text-gray-900 px-1 mb-3">Practice</h3>
            <div className="space-y-2">
              <Link
                href={`/student/practice?subject=${selectedSubject.slug}`}
                className={`flex items-center justify-between bg-white border ${color.border} rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors group`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✏️</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">Practice {selectedSubject.name}</p>
                    <p className="text-xs text-gray-400">Mixed questions from all topics</p>
                  </div>
                </div>
                <span className={`${color.text} group-hover:translate-x-0.5 transition-transform`}>→</span>
              </Link>

              <Link
                href={`/student/practice?subject=${selectedSubject.slug}&mode=topic`}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">Practice by Topic</p>
                    <p className="text-xs text-gray-400">Focus on a specific area</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}