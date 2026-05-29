'use client'
// src/app/student/learn/LearnPage.jsx — Learn Hub
// Subject cards with illustrative SVG icons, study plan, dark mode throughout

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import GoalModal from '@/components/dashboard/GoalModal'
import Link from 'next/link'

// ─── Subject illustrations — inline SVG per subject ──────────────────────────
const SUBJECT_ART = {
  'Mathematics': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <text x="8" y="30" fontSize="22" fontWeight="800" fill="currentColor" opacity="0.9">x²</text>
      <text x="8" y="52" fontSize="16" fontWeight="700" fill="currentColor" opacity="0.7">+2x</text>
      <text x="36" y="22" fontSize="13" fontWeight="700" fill="currentColor" opacity="0.5">∫</text>
      <text x="44" y="48" fontSize="11" fontWeight="600" fill="currentColor" opacity="0.4">π</text>
    </svg>
  ),
  'Physics': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <ellipse cx="32" cy="32" rx="28" ry="10" stroke="currentColor" strokeWidth="2.5" opacity="0.6"/>
      <ellipse cx="32" cy="32" rx="10" ry="28" stroke="currentColor" strokeWidth="2.5" opacity="0.4"/>
      <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.9"/>
    </svg>
  ),
  'Chemistry': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M24 12 L24 32 L14 50 L50 50 L40 32 L40 12 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" opacity="0.7"/>
      <line x1="24" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
      <circle cx="22" cy="44" r="3" fill="currentColor" opacity="0.8"/>
      <circle cx="32" cy="40" r="2.5" fill="currentColor" opacity="0.6"/>
      <circle cx="42" cy="44" r="3" fill="currentColor" opacity="0.8"/>
    </svg>
  ),
  'Biology': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 8 C32 8 20 16 20 28 C20 40 32 44 32 56 C32 44 44 40 44 28 C44 16 32 8 32 8Z" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
      <path d="M20 28 C28 26 36 30 44 28" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      <path d="M22 20 C30 18 34 22 42 20" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
    </svg>
  ),
  'English Language': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <rect x="10" y="12" width="44" height="6" rx="3" fill="currentColor" opacity="0.7"/>
      <rect x="10" y="24" width="36" height="5" rx="2.5" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="35" width="40" height="5" rx="2.5" fill="currentColor" opacity="0.55"/>
      <rect x="10" y="46" width="28" height="5" rx="2.5" fill="currentColor" opacity="0.4"/>
    </svg>
  ),
  'Economics': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <polyline points="10,50 20,35 30,42 40,22 54,14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <circle cx="54" cy="14" r="4" fill="currentColor" opacity="0.9"/>
      <line x1="10" y1="52" x2="56" y2="52" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      <line x1="10" y1="10" x2="10" y2="52" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
    </svg>
  ),
  'Government': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M8 54 L8 34 L32 16 L56 34 L56 54 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" opacity="0.6"/>
      <rect x="24" y="36" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.8"/>
      <line x1="8" y1="34" x2="56" y2="34" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      <line x1="32" y1="12" x2="32" y2="18" stroke="currentColor" strokeWidth="3" opacity="0.7"/>
    </svg>
  ),
  'Geography': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" opacity="0.6"/>
      <ellipse cx="32" cy="32" rx="10" ry="22" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      <line x1="10" y1="32" x2="54" y2="32" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
      <line x1="18" y1="18" x2="46" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.25"/>
    </svg>
  ),
  'Literature in English': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M14 8 L14 56 L50 56 L50 8 Z" stroke="currentColor" strokeWidth="2.5" opacity="0.5"/>
      <path d="M14 8 C14 8 20 6 32 8 C44 10 50 8 50 8" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
      <line x1="20" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      <line x1="20" y1="30" x2="44" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      <line x1="20" y1="38" x2="36" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
    </svg>
  ),
  'Agricultural Science': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <path d="M32 54 L32 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
      <path d="M32 28 C32 28 18 20 18 10 C28 10 32 20 32 28Z" fill="currentColor" opacity="0.6"/>
      <path d="M32 36 C32 36 46 28 46 18 C36 18 32 28 32 36Z" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  'default': (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <circle cx="32" cy="28" r="14" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
      <path d="M20 54 C20 46 44 46 44 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
}

function getSubjectArt(name) { return SUBJECT_ART[name] ?? SUBJECT_ART.default }

// ─── Subject card — illustrative style ───────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, completedCount, totalCount }) {
  const color   = getSubjectColor(subject.name)
  const pct     = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const mastery = getMasteryLevel(pct)

  return (
    <Link href={`/student/subjects/${subject.slug}`}
      className="block bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 active:scale-[0.98] transition-all">
      {/* Illustration header */}
      <div className={`${color.bg} dark:bg-gray-800 relative h-24 flex items-center justify-center overflow-hidden`}>
        <div className={`absolute inset-0 opacity-20 dark:opacity-10`} />
        <div className={`w-20 h-20 ${color.text} dark:text-gray-300`}>
          {getSubjectArt(subject.name)}
        </div>
        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-xs font-black ${color.text} dark:text-gray-200`}>
          {pct}%
        </div>
      </div>
      {/* Info */}
      <div className="px-4 py-3.5">
        <p className="font-black text-gray-900 dark:text-gray-100 text-sm mb-1.5">{subject.name}</p>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1.5">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs ${mastery.color}`}>{mastery.emoji} {mastery.label}</p>
          <span className="text-xs text-gray-400 dark:text-gray-600">{completedCount}/{totalCount}</span>
        </div>
      </div>
    </Link>
  )
})

// ─── Study plan preview ───────────────────────────────────────────────────────
const StudyPlanPreview = memo(function StudyPlanPreview({ learningPaths, subtopicMap, completedIds }) {
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  const items = useMemo(() => {
    const result = []
    for (const path of learningPaths) {
      if (result.length >= 5) break
      for (const id of (path.ordered_subtopic_ids ?? [])) {
        if (result.length >= 5) break
        if (completedSet.has(id)) continue
        const sub = subtopicMap[id]
        if (!sub) continue
        result.push({ id, sub, subjectName: path.subjects?.name, color: getSubjectColor(path.subjects?.name) })
      }
    }
    return result
  }, [learningPaths, subtopicMap, completedSet])

  if (!items.length) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Study Plan</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your personalised order</p>
        </div>
        <Link href="/student/study-plan" className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
          View all <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {items.map(({ id, sub, subjectName, color }, i) => {
          const isNext = i === 0
          const live   = sub.lesson_status === 'published'
          const row = (
            <div className={`flex items-center gap-3 px-5 py-3 transition-colors ${
              isNext ? `${color.bg} dark:bg-indigo-950/20` : ''
            } ${live ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : 'opacity-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                isNext ? `${color.accent} text-white` : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text} dark:bg-opacity-20`}>{subjectName}</span>
                  {isNext && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">Up next</span>}
                  {!live && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Coming soon</span>}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{sub.name}</p>
              </div>
              {live && <svg className="w-4 h-4 text-gray-200 dark:text-gray-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
            </div>
          )
          return live ? <Link key={id} href={`/student/lesson/${id}`}>{row}</Link> : <div key={id}>{row}</div>
        })}
      </div>
      <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3">
        <Link href="/student/study-plan" className="flex items-center justify-center gap-1 text-sm font-bold text-indigo-500 hover:text-indigo-400">View full study plan →</Link>
      </div>
    </div>
  )
})

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LearnHubPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile]                 = useState(null)
  const [subjectList, setSubjectList]         = useState([])
  const [completedIds, setCompletedIds]       = useState(new Set())
  const [learningPaths, setLearningPaths]     = useState([])
  const [subtopicMap, setSubtopicMap]         = useState({})
  const [subtopicsBySubject, setSubtopicsBySubject] = useState({})
  const [loading, setLoading]                 = useState(true)
  const [showGoalModal, setShowGoalModal]     = useState(false)
  const [examEditing, setExamEditing]         = useState(false)
  const [savingExam, setSavingExam]           = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles').select('id, exam_type, subjects, university_course, jamb_total_target, waec_target_grades, jamb_target_scores, goals_set').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)').eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setLearningPaths(paths ?? [])

    const names = prof?.subjects ?? []
    if (names.length) {
      const { data: rows } = await supabase.from('subjects').select('id, name, slug, exam_type').in('name', names).eq('is_active', true)
      const exam = prof?.exam_type ?? 'WAEC'
      setSubjectList((rows ?? []).filter(s => exam === 'BOTH' || s.exam_type === exam || s.exam_type === 'BOTH'))
    }

    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []
      for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      const results = await Promise.all(batches.map(b =>
        supabase.from('subtopics').select('id, name, slug, lesson_status, subject_id').in('id', b).then(r => r.data ?? [])
      ))
      const allSubs = results.flat()
      const sMap = {}; allSubs.forEach(s => { sMap[s.id] = s }); setSubtopicMap(sMap)
      const bySubject = {}
      allSubs.forEach(s => { if (!bySubject[s.subject_id]) bySubject[s.subject_id] = []; bySubject[s.subject_id].push(s.id) })
      setSubtopicsBySubject(bySubject)
    }
    setLoading(false)
  }

  async function saveExamType(exam) {
    setSavingExam(true)
    await supabase.from('profiles').update({ exam_type: exam }).eq('id', profile.id)
    setProfile(prev => ({ ...prev, exam_type: exam }))
    setSavingExam(false); setExamEditing(false)
    setLoading(true); init()
  }

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const examLabels = { WAEC: 'WAEC', JAMB: 'JAMB', BOTH: 'WAEC + JAMB' }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Learn Hub</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your central learning workspace</p>
        </div>
      </div>

      {/* Exam + subject controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!examEditing ? (
          <button onClick={() => setExamEditing(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
            {examLabels[profile?.exam_type ?? 'WAEC']}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.5-6.5a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110.414 14H8v-2.414a2 2 0 01.586-1.414z" /></svg>
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {['WAEC','JAMB','BOTH'].map(e => (
              <button key={e} onClick={() => saveExamType(e)} disabled={savingExam}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all disabled:opacity-50 ${
                  profile?.exam_type === e ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>{e}</button>
            ))}
            <button onClick={() => setExamEditing(false)} className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full ml-1">✕</button>
          </div>
        )}
        <button onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Edit subjects
        </button>
      </div>

      {/* No subjects */}
      {subjectList.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
          <p className="text-5xl mb-3">📚</p>
          <p className="font-black text-gray-900 dark:text-gray-100 text-base mb-2">No subjects yet</p>
          <button onClick={() => setShowGoalModal(true)} className="px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">Add subjects →</button>
        </div>
      )}

      {/* Subjects — 2-column card grid */}
      {subjectList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">My Subjects</h3>
            <span className="text-xs text-gray-400 dark:text-gray-600">{subjectList.length} enrolled</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjectList.map(subject => (
              <SubjectCard key={subject.id} subject={subject}
                completedCount={(subtopicsBySubject[subject.id] ?? []).filter(id => completedIds.has(id)).length}
                totalCount={(subtopicsBySubject[subject.id] ?? []).length} />
            ))}
          </div>
          <button onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-3 w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl px-4 py-3 hover:border-indigo-400 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Add or edit subjects</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Expand your study plan</p>
            </div>
          </button>
        </div>
      )}

      {/* Study plan — always visible on Learn Hub */}
      {learningPaths.length > 0 && Object.keys(subtopicMap).length > 0 && (
        <StudyPlanPreview learningPaths={learningPaths} subtopicMap={subtopicMap} completedIds={completedIds} />
      )}

      {/* Diagnostic CTA */}
      {learningPaths.length === 0 && subjectList.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-3xl p-5">
          <p className="text-3xl mb-2">🗺</p>
          <p className="font-black text-indigo-900 dark:text-indigo-100 mb-1">Get your personalised plan</p>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">Take a quick diagnostic to build your study plan.</p>
          <Link href="/diagnostic" className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">Take diagnostic →</Link>
        </div>
      )}

      {/* Practice shortcut */}
      <Link href="/student/practice" className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl px-5 py-4 hover:opacity-90 active:scale-[0.98] transition-all">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-sm">Practice Past Questions</p>
          <p className="text-white/70 text-xs mt-0.5">Topic practice · Mock tests · Exam simulation</p>
        </div>
        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </Link>

      {showGoalModal && profile && (
        <GoalModal profile={profile} onClose={() => setShowGoalModal(false)}
          onSave={updated => {
            setProfile(prev => ({ ...prev, ...updated }))
            setShowGoalModal(false)
            if (JSON.stringify(updated.subjects) !== JSON.stringify(profile.subjects)) { setLoading(true); init() }
          }} />
      )}
    </div>
  )
}