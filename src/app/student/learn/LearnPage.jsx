'use client'
// src/app/student/learn/LearnPage.jsx
// Fixes:
// - Curated learning plan now shows (subject_id matching fix)
// - No subject cap
// - Subject/exam editing works
// - Skeleton loader
// - Subject icons

import { useState, useEffect, useMemo, memo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import { LearnHubSkeleton } from '@/components/ui/Skeletons'
import Link from 'next/link'

const GoalModal = lazy(() => import('@/components/dashboard/GoalModal'))

const SUBJECT_ICONS = {
  'Mathematics': '📐', 'English Language': '📝', 'Physics': '⚡',
  'Chemistry': '🧪', 'Biology': '🦋', 'Economics': '📊',
  'Government': '🏛️', 'Literature': '📖', 'Geography': '🌍',
  'History': '📜', 'Commerce': '🏪', 'Accounting': '🧾',
  'Agricultural Science': '🌱', 'Further Mathematics': '🔢',
  'Computer Science': '💻', 'Civic Education': '⚖️',
}
const subjectIcon = (name) => SUBJECT_ICONS[name] ?? '📚'

// ─── Subject card ─────────────────────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completed, total }) {
  const color = getSubjectColor(subject.name)
  const icon  = subjectIcon(subject.name)
  return (
    <Link href={`/student/subjects/${subject.slug}`}
      className="block rounded-2xl overflow-hidden hover:opacity-90 transition-all active:scale-[0.98]">
      <div className={`${color.bg} px-4 pt-3 pb-2`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <span className={`text-xs font-bold ${mastery.color}`}>{mastery.emoji}</span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-snug truncate`}>{subject.name}</p>
      </div>
      <div className="px-4 py-2 bg-card">
        <div className="h-1 bg-subtle rounded-full overflow-hidden">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-tertiary mt-1">{completed}/{total} · {pct}%</p>
      </div>
    </Link>
  )
})

// ─── Study plan card ───────────────────────────────────────────────────────────
const StudyPlanCard = memo(function StudyPlanCard({ subjectProgress, subtopicMap, completedIds }) {
  const upNext = []
  for (const { subject, path } of subjectProgress) {
    if (!path?.ordered_subtopic_ids?.length) continue
    for (const id of path.ordered_subtopic_ids) {
      if (completedIds.has(id)) continue
      const sub = subtopicMap[id]
      if (!sub || sub.lesson_status !== 'published') continue
      upNext.push({ ...sub, subjectName: subject.name, subjectSlug: subject.slug })
      if (upNext.length >= 5) break
    }
    if (upNext.length >= 5) break
  }

  if (!upNext.length) {
    return (
      <div className="bg-card rounded-2xl px-5 py-6 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <p className="font-bold text-primary text-sm">Study plan coming soon</p>
        <p className="text-xs text-secondary mt-1">Take the diagnostic to generate your personalised plan</p>
        <Link href="/diagnostic" className="inline-block mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500">
          Take diagnostic →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-primary">Your Study Plan</h2>
          <p className="text-xs text-secondary mt-0.5">Personalised — based on your weak areas</p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400">Full plan →</Link>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
        {upNext.map(sub => {
          const color = getSubjectColor(sub.subjectName)
          const icon  = subjectIcon(sub.subjectName)
          return (
            <Link key={sub.id} href={`/student/lesson/${sub.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors">
              <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0 text-lg`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{sub.name}</p>
                <p className="text-xs text-tertiary">{sub.subjectName}</p>
              </div>
              <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
})

export default function LearnHubPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile]           = useState(null)
  const [subjectList, setSubjectList]   = useState([])
  const [completedIds, setCompletedIds] = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap, setSubtopicMap]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [examEditing, setExamEditing]   = useState(false)
  const [savingExam, setSavingExam]     = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects, goals_set, university_course, jamb_total_target, waec_target_grades, jamb_target_scores').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)').eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    const names = prof?.subjects ?? []
    if (!names.length) { setLoading(false); return }

    const { data: rows } = await supabase.from('subjects').select('id, name, slug, exam_type').in('name', names).eq('is_active', true).order('name')
    const exam = prof?.exam_type ?? 'WAEC'
    setSubjectList((rows ?? []).filter(s => exam === 'BOTH' || s.exam_type === exam || s.exam_type === 'BOTH'))

    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []; for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      const results = await Promise.all(batches.map(b =>
        supabase.from('subtopics').select('id, name, slug, lesson_status, subject_id').in('id', b).then(r => r.data ?? [])
      ))
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

  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      // FIX: match by subject_id UUID
      const path  = learningPaths.find(p => p.subject_id === subject.id)
      const ids   = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, total, completed, pct, mastery: getMasteryLevel(pct), path }
    })
  }, [subjectList, learningPaths, completedIds])

  if (loading) return <LearnHubSkeleton />

  const examLabel = { WAEC: 'WAEC', JAMB: 'JAMB', BOTH: 'WAEC + JAMB' }

  return (
    <div className="space-y-6 pb-4">
      {showGoalModal && profile && (
        <Suspense fallback={null}>
          <GoalModal profile={profile}
            onClose={() => setShowGoalModal(false)}
            onSave={updated => {
              setProfile(prev => ({ ...prev, ...updated }))
              setShowGoalModal(false)
              if (JSON.stringify(updated.subjects) !== JSON.stringify(profile.subjects)) {
                setLoading(true); init()
              }
            }} />
        </Suspense>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-primary">Learn Hub</h1>
          <p className="text-sm text-secondary mt-0.5">Your central learning workspace</p>
        </div>
        {/* Edit subjects / goals button */}
        <button onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle rounded-xl text-xs font-bold text-secondary hover:text-primary transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110.414 14H8v-2.414a2 2 0 01.586-1.414z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Exam type selector */}
      <div className="flex items-center gap-2">
        {!examEditing ? (
          <button onClick={() => setExamEditing(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-indigo-500 transition-colors">
            {examLabel[profile?.exam_type ?? 'WAEC']}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11 13.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            {['WAEC', 'JAMB'].map(e => (
              <button key={e} onClick={() => saveExamType(e)} disabled={savingExam}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  profile?.exam_type === e || (profile?.exam_type === 'BOTH' && true)
                    ? 'bg-indigo-600 text-white' : 'bg-subtle text-secondary hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                }`}>{e}</button>
            ))}
            <button onClick={() => setExamEditing(false)} className="text-xs text-tertiary">Cancel</button>
          </div>
        )}
      </div>

      {/* Study plan — FIX: now uses subjectProgress which has correct path matching */}
      <StudyPlanCard subjectProgress={subjectProgress} subtopicMap={subtopicMap} completedIds={completedIds} />

      {/* All subjects — no cap */}
      {subjectProgress.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-primary mb-2.5">Your Subjects</h2>
          <div className="grid grid-cols-2 gap-3">
            {subjectProgress.map(({ subject, pct, mastery, completed, total }) => (
              <SubjectCard key={subject.id} subject={subject} pct={pct} mastery={mastery}
                completed={completed} total={total} />
            ))}
          </div>
        </div>
      )}

      {subjectList.length === 0 && (
        <div className="bg-card rounded-2xl p-6 text-center space-y-3">
          <p className="text-4xl">📚</p>
          <p className="font-black text-primary">No subjects yet</p>
          <p className="text-sm text-secondary">Take the diagnostic or edit your subjects to get started.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowGoalModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500">
              Add subjects
            </button>
            <Link href="/diagnostic" className="px-4 py-2 bg-subtle text-primary text-sm font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
              Take diagnostic →
            </Link>
          </div>
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