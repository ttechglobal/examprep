'use client'
// src/app/student/learn/LearnPage.jsx
// LEARNING HUB — high-level overview. NO topic lists here.
// Sections:
//   1. Exam badge(s)
//   2. Enrolled subjects — tappable cards → /student/subjects/[slug]
//   3. + Add subject shortcut
//   4. Study plan preview (next 5 items) → /student/study-plan
//   5. Practice past questions shortcut

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import Link from 'next/link'

// ─── Exam badge ───────────────────────────────────────────────────────────────
function ExamBadge({ exam }) {
  const map = {
    WAEC: { bg: 'bg-blue-600',   label: 'WAEC' },
    JAMB: { bg: 'bg-purple-600', label: 'JAMB' },
    BOTH: { bg: 'bg-indigo-600', label: 'WAEC + JAMB' },
  }
  const e = map[exam] ?? map.WAEC
  return (
    <span className={`${e.bg} text-white text-xs font-black px-3 py-1 rounded-full`}>
      {e.label}
    </span>
  )
}

// ─── Subject card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, completedIds, allSubtopicIds }) {
  const color  = getSubjectColor(subject.name)
  const total  = allSubtopicIds.length
  const done   = allSubtopicIds.filter(id => completedIds.has(id)).length
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0
  const mastery = getMasteryLevel(pct)

  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      className="flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm px-4 py-4 hover:shadow-md hover:border-gray-200 active:scale-[0.98] transition-all"
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-2xl ${color.accent} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <span className="text-white text-sm font-black">{subject.name.slice(0,2).toUpperCase()}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-gray-900 text-sm truncate">{subject.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[100px] overflow-hidden">
            <div
              className={`h-full ${color.accent} rounded-full transition-all duration-700`}
              style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
        <p className={`text-xs mt-1 ${mastery.color}`}>{mastery.emoji} {mastery.label}</p>
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ─── Study plan preview ───────────────────────────────────────────────────────
function StudyPlanPreview({ learningPaths, subtopicMap, completedIds }) {
  const items = []
  const completedSet = new Set(completedIds)

  for (const path of learningPaths) {
    if (items.length >= 5) break
    const color = getSubjectColor(path.subjects?.name)
    for (const id of (path.ordered_subtopic_ids ?? [])) {
      if (items.length >= 5) break
      if (completedSet.has(id)) continue
      const sub = subtopicMap[id]
      if (!sub) continue
      items.push({ id, sub, subjectName: path.subjects?.name, color })
    }
  }

  if (!items.length) return null

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900">Study Plan</h3>
          <p className="text-xs text-gray-400 mt-0.5">Your personalised order</p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
          View all
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(({ id, sub, subjectName, color }, i) => {
          const isNext = i === 0
          const live   = sub.lesson_status === 'published'
          const inner  = (
            <div className={`flex items-center gap-3 px-5 py-3 ${isNext ? color.bg : ''} ${live ? 'hover:bg-gray-50' : 'opacity-50'} transition-colors`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                isNext ? `${color.accent} text-white` : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{subjectName}</span>
                  {isNext && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Up next</span>}
                  {!live && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Coming soon</span>}
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{sub.name}</p>
              </div>
              {live && (
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          )
          return live
            ? <Link key={id} href={`/student/lesson/${id}`}>{inner}</Link>
            : <div key={id}>{inner}</div>
        })}
      </div>
      <div className="border-t border-gray-50 px-5 py-3">
        <Link href="/student/study-plan" className="flex items-center justify-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-500">
          View full study plan →
        </Link>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [profile, setProfile]               = useState(null)
  const [subjectList, setSubjectList]       = useState([])
  const [topicsBySubject, setTopicsBySubject] = useState({})  // subjectId → subtopic ids[]
  const [completedIds, setCompletedIds]     = useState(new Set())
  const [learningPaths, setLearningPaths]   = useState([])
  const [subtopicMap, setSubtopicMap]       = useState({})
  const [loading, setLoading]               = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)').eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    const enrolledNames = prof?.subjects ?? []
    if (!enrolledNames.length) { setLoading(false); return }

    const examType = prof?.exam_type ?? 'WAEC'
    const { data: subjectRows } = await supabase
      .from('subjects')
      .select('id, name, slug, exam_type')
      .in('name', enrolledNames)
      .eq('is_active', true)

    const relevant = (subjectRows ?? []).filter(s =>
      examType === 'BOTH' || s.exam_type === examType || s.exam_type === 'BOTH'
    )
    setSubjectList(relevant)

    // Fetch all subtopic IDs per subject for mastery % on cards
    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      let allSubs = []
      for (let i = 0; i < allIds.length; i += 200) {
        const { data } = await supabase
          .from('subtopics')
          .select('id, name, slug, lesson_status, subject_id, topics(name)')
          .in('id', allIds.slice(i, i + 200))
        allSubs = allSubs.concat(data ?? [])
      }
      const sMap = {}
      allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)

      // Group subtopic IDs by subject
      const bySubject = {}
      allSubs.forEach(s => {
        if (!bySubject[s.subject_id]) bySubject[s.subject_id] = []
        bySubject[s.subject_id].push(s.id)
      })
      setTopicsBySubject(bySubject)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Learn</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your learning hub</p>
        </div>
        {profile?.exam_type && <ExamBadge exam={profile.exam_type} />}
      </div>

      {/* No subjects state */}
      {subjectList.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-5xl mb-3">📚</p>
          <p className="font-black text-gray-900 text-base mb-1">No subjects yet</p>
          <p className="text-gray-500 text-sm mb-5">Set up your subjects to start learning.</p>
          <Link href="/student/profile" className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Set up subjects →
          </Link>
        </div>
      )}

      {/* Subjects */}
      {subjectList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-black text-gray-900">My Subjects</h3>
            <span className="text-xs text-gray-400">{subjectList.length} enrolled</span>
          </div>
          <div className="space-y-2.5">
            {subjectList.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                completedIds={completedIds}
                allSubtopicIds={topicsBySubject[subject.id] ?? []}
              />
            ))}
          </div>

          {/* Add subject */}
          <Link
            href="/student/profile?section=subjects"
            className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-3xl px-4 py-3.5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Add a subject</p>
              <p className="text-xs text-gray-400 mt-0.5">Expand your study plan</p>
            </div>
          </Link>
        </div>
      )}

      {/* Study plan preview */}
      {learningPaths.length > 0 && (
        <StudyPlanPreview
          learningPaths={learningPaths}
          subtopicMap={subtopicMap}
          completedIds={completedIds}
        />
      )}

      {/* Diagnostic CTA if no plan */}
      {learningPaths.length === 0 && subjectList.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5">
          <p className="text-3xl mb-2">🗺</p>
          <p className="font-black text-indigo-900 mb-1">Get your personalised plan</p>
          <p className="text-sm text-indigo-700 mb-3">Take a quick diagnostic and we'll build a study plan based on your gaps.</p>
          <Link href="/diagnostic" className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      )}

      {/* Practice shortcut */}
      <Link
        href="/student/practice"
        className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl px-5 py-4 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-sm">Practice Past Questions</p>
          <p className="text-white/70 text-xs mt-0.5">Topic practice · Mock tests · Exam simulation</p>
        </div>
        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

    </div>
  )
}