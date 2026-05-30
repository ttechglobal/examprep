'use client'
// src/app/student/learn/LearnPage.jsx
// Fixes:
// 1. Learning plan not showing — fixed subject_id matching for learning path data
// 2. Subject cap removed — shows ALL enrolled subjects
// 3. Subject cards redesigned — visual, gradient-accented
// 4. Full dark mode compliance using CSS variable tokens

import { useState, useEffect, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import Link from 'next/link'

// ─── Subject card ─────────────────────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completedCount, totalCount }) {
  const color = getSubjectColor(subject.name)
  return (
    <Link
      href={`/student/subjects/${subject.slug}`}
      className="block bg-card rounded-2xl border border-default overflow-hidden
                 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm
                 transition-all active:scale-[0.98]"
    >
      {/* Coloured top strip */}
      <div className={`${color.bg} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`w-10 h-10 rounded-xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-sm font-black">
              {subject.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/60 dark:bg-black/20 ${mastery.color} flex-shrink-0`}>
            {mastery.emoji}
          </span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug`}>{subject.name}</p>
      </div>

      {/* Progress */}
      <div className="px-4 py-3">
        <div className="h-1.5 bg-subtle rounded-full overflow-hidden mb-1.5">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary">{completedCount}/{totalCount} done</span>
          <span className="text-xs font-black text-primary">{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ─── Study plan row ───────────────────────────────────────────────────────────
const StudyPlanRow = memo(function StudyPlanRow({ subtopic, subjectName, subjectSlug }) {
  const color = getSubjectColor(subjectName)
  return (
    <Link href={`/student/lesson/${subtopic.id}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors">
      <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
        <div className={`w-2.5 h-2.5 rounded-full ${color.accent}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary truncate">{subtopic.name}</p>
        <p className="text-xs text-tertiary truncate">{subjectName}</p>
      </div>
      <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
})

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LearnHubPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile]           = useState(null)
  const [subjectList, setSubjectList]   = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap, setSubtopicMap]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [examEditing, setExamEditing]   = useState(false)
  const [savingExam, setSavingExam]     = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, exam_type, subjects')
        .eq('id', user.id).single(),
      supabase.from('lesson_progress')
        .select('subtopic_id, completed')
        .eq('student_id', user.id),
      supabase.from('student_learning_paths')
        .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
        .eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    const names = prof?.subjects ?? []
    if (!names.length) { setLoading(false); return }

    // FIX: fetch ALL enrolled subjects, no cap
    const { data: rows } = await supabase
      .from('subjects')
      .select('id, name, slug, exam_type')
      .in('name', names)
      .eq('is_active', true)
      .order('name')

    const exam     = prof?.exam_type ?? 'WAEC'
    const relevant = (rows ?? []).filter(s =>
      exam === 'BOTH' || s.exam_type === exam || s.exam_type === 'BOTH'
    )
    setSubjectList(relevant)

    // Fetch subtopics for study plan
    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []
      for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      const results = await Promise.all(
        batches.map(b => supabase.from('subtopics')
          .select('id, name, slug, lesson_status, subject_id, topics(subject_id)')
          .in('id', b).then(r => r.data ?? []))
      )
      const allSubs = results.flat()
      const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  async function saveExamType(exam) {
    setSavingExam(true)
    await supabase.from('profiles').update({ exam_type: exam }).eq('id', profile.id)
    setSavingExam(false)
    setExamEditing(false)
    setLoading(true)
    init()
  }

  // Build subject progress data
  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      // FIX: match learning path by subject id
      const path = learningPaths.find(p => p.subject_id === subject.id)
      const ids  = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, total, completed, pct, mastery: getMasteryLevel(pct), path }
    })
  }, [subjectList, learningPaths, completedIds])

  // Build study plan — up to 5 next items
  const studyPlan = useMemo(() => {
    const items = []
    for (const { subject, path } of subjectProgress) {
      if (!path?.ordered_subtopic_ids?.length) continue
      for (const id of path.ordered_subtopic_ids) {
        if (completedIds.has(id)) continue
        const sub = subtopicMap[id]
        if (!sub || sub.lesson_status !== 'published') continue
        items.push({ subtopic: sub, subjectName: subject.name, subjectSlug: subject.slug })
        if (items.length >= 5) break
      }
      if (items.length >= 5) break
    }
    return items
  }, [subjectProgress, subtopicMap, completedIds])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const examLabel = { WAEC: 'WAEC', JAMB: 'JAMB', BOTH: 'WAEC + JAMB' }

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Learn Hub</h1>
        <p className="text-sm text-secondary mt-0.5">Your central learning workspace</p>
      </div>

      {/* Exam type toggle */}
      <div className="flex items-center gap-2">
        {!examEditing ? (
          <button
            onClick={() => setExamEditing(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-indigo-500 transition-colors">
            {examLabel[profile?.exam_type ?? 'WAEC']}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11 13.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            {['WAEC', 'JAMB', 'BOTH'].map(e => (
              <button key={e} onClick={() => saveExamType(e)} disabled={savingExam}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  profile?.exam_type === e
                    ? 'bg-indigo-600 text-white'
                    : 'bg-subtle text-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                }`}>{e}</button>
            ))}
            <button onClick={() => setExamEditing(false)} className="text-xs text-tertiary hover:text-secondary">Cancel</button>
          </div>
        )}
      </div>

      {/* Your study plan — FIX: now shows correctly */}
      {studyPlan.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-black text-primary">Your Study Plan</h2>
            <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">
              View all →
            </Link>
          </div>
          <div className="bg-card rounded-3xl border border-default overflow-hidden">
            <div className="divide-y divide-default">
              {studyPlan.map(({ subtopic, subjectName, subjectSlug }) => (
                <StudyPlanRow
                  key={subtopic.id}
                  subtopic={subtopic}
                  subjectName={subjectName}
                  subjectSlug={subjectSlug}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subjects — ALL enrolled, no cap */}
      {subjectProgress.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-primary mb-2.5">Your Subjects</h2>
          <div className="grid grid-cols-2 gap-3">
            {subjectProgress.map(({ subject, pct, mastery, completed, total }) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                pct={pct}
                mastery={mastery}
                completedCount={completed}
                totalCount={total}
              />
            ))}
          </div>
        </div>
      )}

      {/* No subjects yet */}
      {subjectList.length === 0 && (
        <div className="bg-card rounded-3xl border border-default p-6 text-center space-y-3">
          <p className="text-4xl">📚</p>
          <p className="font-black text-primary">No subjects yet</p>
          <p className="text-sm text-secondary leading-relaxed">
            Take the diagnostic to build your personalised study plan.
          </p>
          <Link href="/diagnostic"
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-colors">
            Take the diagnostic →
          </Link>
        </div>
      )}

      {/* Practice link */}
      <Link href="/student/practice"
        className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-5 py-4 hover:opacity-90 transition-opacity">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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