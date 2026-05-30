'use client'
// src/app/student/learn/LearnPage.jsx
// Full Learn Hub redesign:
// - Subject cards with educational SVG illustrations + visual depth (shadows)
// - WAEC/JAMB split — subjects shown under their exam, with tab switcher if BOTH
// - Subject selector sheet: add/remove subjects with WAEC/JAMB awareness
// - Study plan section
// - Practice Hub link button
// - All explicit Tailwind colors (no custom token dependency)

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor, getMasteryLevel } from '@/lib/theme'
import Link from 'next/link'

// ─── WAEC vs JAMB subject lists ───────────────────────────────────────────────
const WAEC_SUBJECTS = [
  'Mathematics','English Language','Physics','Chemistry','Biology',
  'Economics','Government','Literature in English','Geography','History',
  'Commerce','Accounting','Agricultural Science','Further Mathematics',
  'Computer Science','Civic Education','Christian Religious Studies',
  'Islamic Religious Studies','Yoruba','Igbo','Hausa',
]
const JAMB_SUBJECTS = [
  'Mathematics','English Language','Physics','Chemistry','Biology',
  'Economics','Government','Literature in English','Geography',
  'Agricultural Science','Further Mathematics','Computer Science',
  'Christian Religious Studies','Islamic Religious Studies',
]
// JAMB is max 4 subjects (Use of English is compulsory + 3 others)
const JAMB_MAX = 4

// ─── Subject illustrations ────────────────────────────────────────────────────
function SubjectIcon({ name }) {
  switch (name) {
    case 'Physics': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <ellipse cx="20" cy="20" rx="15" ry="5.5" stroke="currentColor" strokeWidth="1.8" opacity=".6"/>
        <ellipse cx="20" cy="20" rx="15" ry="5.5" stroke="currentColor" strokeWidth="1.8" transform="rotate(60 20 20)" opacity=".6"/>
        <ellipse cx="20" cy="20" rx="15" ry="5.5" stroke="currentColor" strokeWidth="1.8" transform="rotate(120 20 20)" opacity=".6"/>
        <circle cx="20" cy="20" r="3" fill="currentColor"/>
      </svg>
    )
    case 'Chemistry': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <path d="M16 8h8v11l6 13H10l6-13V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="17" cy="27" r="1.8" fill="currentColor" opacity=".65"/>
        <circle cx="23" cy="30" r="1.3" fill="currentColor" opacity=".5"/>
        <line x1="16" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1.3" opacity=".4"/>
      </svg>
    )
    case 'Biology': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <ellipse cx="20" cy="20" rx="8" ry="12" stroke="currentColor" strokeWidth="1.8"/>
        <ellipse cx="20" cy="20" rx="8" ry="12" stroke="currentColor" strokeWidth="1.2" transform="rotate(60 20 20)" opacity=".4"/>
        <circle cx="20" cy="20" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="20" cy="20" r="1.5" fill="currentColor"/>
      </svg>
    )
    case 'Mathematics': case 'Further Mathematics': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <text x="5" y="18" fontSize="13" fontWeight="900" fill="currentColor">x²</text>
        <text x="4" y="33" fontSize="10" fontWeight="700" fill="currentColor" opacity=".6">+b=0</text>
        <line x1="3" y1="22" x2="37" y2="22" stroke="currentColor" strokeWidth="1" opacity=".2"/>
      </svg>
    )
    case 'English Language': case 'Literature in English': case 'Literature': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <rect x="9" y="7" width="17" height="26" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="13" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
        <line x1="13" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
        <line x1="13" y1="22" x2="19" y2="22" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
        <path d="M26 19l6-9v20l-6-9z" fill="currentColor" opacity=".3"/>
      </svg>
    )
    case 'Economics': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <polyline points="5,33 13,23 20,27 28,15 35,10" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="5" y1="35" x2="35" y2="35" stroke="currentColor" strokeWidth="1.4" opacity=".4"/>
        <line x1="5" y1="10" x2="5" y2="35" stroke="currentColor" strokeWidth="1.4" opacity=".4"/>
      </svg>
    )
    case 'Government': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <rect x="8" y="24" width="4" height="10" fill="currentColor" opacity=".45"/>
        <rect x="16" y="18" width="4" height="16" fill="currentColor" opacity=".65"/>
        <rect x="24" y="21" width="4" height="13" fill="currentColor" opacity=".45"/>
        <line x1="6" y1="34" x2="34" y2="34" stroke="currentColor" strokeWidth="2"/>
        <polygon points="20,5 29,16 11,16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    )
    case 'Geography': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="1.8"/>
        <ellipse cx="20" cy="20" rx="5.5" ry="13" stroke="currentColor" strokeWidth="1.3" opacity=".45"/>
        <line x1="7" y1="20" x2="33" y2="20" stroke="currentColor" strokeWidth="1" opacity=".35"/>
        <line x1="10" y1="13" x2="30" y2="13" stroke="currentColor" strokeWidth="1" opacity=".25"/>
        <line x1="10" y1="27" x2="30" y2="27" stroke="currentColor" strokeWidth="1" opacity=".25"/>
      </svg>
    )
    case 'Agricultural Science': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <path d="M20 34C20 34 20 20 20 16C20 9 12 7 10 13C14 13 18 17 20 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M20 17C20 11 28 7 30 13C26 13 22 17 20 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".65"/>
        <line x1="20" y1="34" x2="20" y2="38" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
    case 'Computer Science': return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <rect x="6" y="9" width="28" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="12" y1="33" x2="28" y2="33" stroke="currentColor" strokeWidth="2"/>
        <line x1="20" y1="27" x2="20" y2="33" stroke="currentColor" strokeWidth="1.5"/>
        <text x="11" y="21" fontSize="8" fontWeight="800" fill="currentColor" opacity=".75">&lt;/&gt;</text>
      </svg>
    )
    default: return (
      <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
        <rect x="8" y="7" width="24" height="26" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <line x1="13" y1="15" x2="27" y2="15" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
        <line x1="13" y1="20" x2="27" y2="20" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
        <line x1="13" y1="25" x2="21" y2="25" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
      </svg>
    )
  }
}

// ─── Subject Card — with shadow depth ────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ subject, pct, mastery, completedCount, totalCount }) {
  const color = getSubjectColor(subject.name)
  return (
    <Link href={`/student/subjects/${subject.slug}`}
      className="block bg-white dark:bg-gray-900 rounded-2xl overflow-hidden
                 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
                 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]
                 hover:-translate-y-0.5 transition-all active:scale-[0.98]">
      {/* Coloured top strip */}
      <div className={`${color.bg} px-4 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`w-10 h-10 flex-shrink-0 ${color.text}`}>
            <SubjectIcon name={subject.name} />
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/70 dark:bg-black/20 ${mastery.color} flex-shrink-0`}>
            {mastery.emoji}
          </span>
        </div>
        <p className={`text-sm font-black ${color.text} leading-tight truncate`}>{subject.name}</p>
      </div>
      {/* Progress */}
      <div className="px-4 py-3">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1.5">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">{completedCount}/{totalCount} done</span>
          <span className="text-xs font-black text-gray-700 dark:text-gray-300">{pct}%</span>
        </div>
      </div>
    </Link>
  )
})

// ─── Study Plan Row ───────────────────────────────────────────────────────────
const StudyPlanRow = memo(function StudyPlanRow({ subtopic, subjectName, subjectSlug }) {
  const color = getSubjectColor(subjectName)
  return (
    <Link href={`/student/lesson/${subtopic.id}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
        <div className={`w-5 h-5 ${color.text}`}><SubjectIcon name={subjectName} /></div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{subtopic.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subjectName}</p>
      </div>
      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  )
})

// ─── Subject Selector Sheet ───────────────────────────────────────────────────
function SubjectSelector({ profile, currentSubjects, onSave, onClose }) {
  const examType    = profile?.exam_type ?? 'WAEC'
  const isWAEC      = examType === 'WAEC' || examType === 'BOTH'
  const isJAMB      = examType === 'JAMB' || examType === 'BOTH'
  const showTabs    = isWAEC && isJAMB

  const [tab, setTab]             = useState(isWAEC ? 'WAEC' : 'JAMB')
  const [waecSelected, setWaec]   = useState(() => new Set(currentSubjects.filter(s => WAEC_SUBJECTS.includes(s))))
  const [jambSelected, setJamb]   = useState(() => new Set(currentSubjects.filter(s => JAMB_SUBJECTS.includes(s))))
  const [saving, setSaving]       = useState(false)

  const supabase = createClient()

  function toggleWAEC(s) {
    setWaec(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }
  function toggleJAMB(s) {
    setJamb(prev => {
      const n = new Set(prev)
      if (n.has(s)) { n.delete(s) } else if (n.size < JAMB_MAX) { n.add(s) }
      return n
    })
  }

  async function handleSave() {
    setSaving(true)
    const merged = [...new Set([...waecSelected, ...jambSelected])]
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ subjects: merged }).eq('id', user.id)
    }
    setSaving(false)
    onSave(merged)
    onClose()
  }

  const listForTab  = tab === 'WAEC' ? WAEC_SUBJECTS : JAMB_SUBJECTS
  const selectedSet = tab === 'WAEC' ? waecSelected : jambSelected
  const maxMsg      = tab === 'JAMB' ? `Choose up to ${JAMB_MAX} subjects` : 'Select all your WAEC subjects'

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center"
         style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg shadow-2xl pb-8 max-h-[88vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0">
          <div>
            <p className="font-black text-lg text-gray-900 dark:text-white">Your Subjects</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{maxMsg}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                       text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* WAEC / JAMB tab switcher (only when doing BOTH) */}
        {showTabs && (
          <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
            {['WAEC', 'JAMB'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${
                  tab === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>
                {t} {t === 'JAMB' ? `(${jambSelected.size}/${JAMB_MAX})` : `(${waecSelected.size})`}
              </button>
            ))}
          </div>
        )}

        {/* JAMB cap warning */}
        {tab === 'JAMB' && jambSelected.size >= JAMB_MAX && (
          <div className="mx-5 mb-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex-shrink-0">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              JAMB limit reached ({JAMB_MAX} subjects max). Remove one to add another.
            </p>
          </div>
        )}

        {/* Subject list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {listForTab.map(s => {
              const color    = getSubjectColor(s)
              const selected = selectedSet.has(s)
              const disabled = tab === 'JAMB' && !selected && jambSelected.size >= JAMB_MAX
              return (
                <button key={s}
                  onClick={() => tab === 'WAEC' ? toggleWAEC(s) : toggleJAMB(s)}
                  disabled={disabled}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl text-left transition-all
                    ${selected
                      ? `${color.bg} border-2 border-current ${color.text} shadow-sm`
                      : `bg-gray-50 dark:bg-gray-800 border-2 border-transparent
                         ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`
                    }`}>
                  <div className={`w-8 h-8 flex-shrink-0 ${selected ? color.text : 'text-gray-300 dark:text-gray-600'}`}>
                    <SubjectIcon name={s} />
                  </div>
                  <span className={`text-xs font-bold leading-tight ${selected ? color.text : 'text-gray-600 dark:text-gray-400'}`}>
                    {s}
                  </span>
                  {selected && (
                    <div className={`ml-auto w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${color.accent}`}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <div className="px-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black
                       rounded-2xl transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save subjects'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main LearnHub ─────────────────────────────────────────────────────────────
export default function LearnHubPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile,       setProfile]       = useState(null)
  const [subjectList,   setSubjectList]   = useState([])
  const [completedIds,  setCompletedIds]  = useState(new Set())
  const [learningPaths, setLearningPaths] = useState([])
  const [subtopicMap,   setSubtopicMap]   = useState({})
  const [loading,       setLoading]       = useState(true)
  const [examTab,       setExamTab]       = useState('WAEC') // which exam tab is shown
  const [showSelector,  setShowSelector]  = useState(false)

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

    // Default exam tab
    const et = prof?.exam_type ?? 'WAEC'
    setExamTab(et === 'JAMB' ? 'JAMB' : 'WAEC')

    const names = prof?.subjects ?? []
    if (names.length) {
      const { data: rows } = await supabase
        .from('subjects').select('id, name, slug, exam_type')
        .in('name', names).eq('is_active', true).order('name')
      setSubjectList(rows ?? [])
    }

    const allIds = [...new Set((paths ?? []).flatMap(p => p.ordered_subtopic_ids ?? []))]
    if (allIds.length) {
      const batches = []
      for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
      const results = await Promise.all(
        batches.map(b => supabase.from('subtopics').select('id, name, slug, lesson_status, subject_id').in('id', b).then(r => r.data ?? []))
      )
      const sMap = {}; results.flat().forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  // Build subject progress
  const subjectProgress = useMemo(() => {
    return subjectList.map(subject => {
      const path      = learningPaths.find(p => p.subject_id === subject.id)
      const ids       = path?.ordered_subtopic_ids ?? []
      const total     = ids.length
      const completed = ids.filter(id => completedIds.has(id)).length
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return { subject, total, completed, pct, mastery: getMasteryLevel(pct), path }
    })
  }, [subjectList, learningPaths, completedIds])

  // Build study plan
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

  // Filter subjects by current exam tab
  const examType   = profile?.exam_type ?? 'WAEC'
  const showBoth   = examType === 'BOTH'
  const visibleSubjects = showBoth
    ? subjectProgress.filter(({ subject }) =>
        examTab === 'WAEC' ? WAEC_SUBJECTS.includes(subject.name) : JAMB_SUBJECTS.includes(subject.name)
      )
    : subjectProgress

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Learn Hub</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Your central learning workspace</p>
        </div>
        {/* Practice Hub link */}
        <Link href="/student/practice"
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white
                     text-xs font-black px-3 py-2 rounded-xl transition-colors shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          Practice →
        </Link>
      </div>

      {/* Study Plan */}
      {studyPlan.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Your Study Plan</h2>
            <Link href="/student/study-plan" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              View all →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden
                          shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {studyPlan.map(({ subtopic, subjectName, subjectSlug }) => (
                <StudyPlanRow key={subtopic.id} subtopic={subtopic} subjectName={subjectName} subjectSlug={subjectSlug} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subjects section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-gray-900 dark:text-white">Your Subjects</h2>
          <button onClick={() => setShowSelector(true)}
            className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400
                       hover:text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40
                       border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-xl transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Edit subjects
          </button>
        </div>

        {/* WAEC / JAMB tab switcher when doing both */}
        {showBoth && (
          <div className="flex gap-2 mb-3">
            {['WAEC', 'JAMB'].map(t => (
              <button key={t} onClick={() => setExamTab(t)}
                className={`flex-1 py-2.5 text-sm font-black rounded-2xl transition-all ${
                  examTab === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}>
                {t} subjects
              </button>
            ))}
          </div>
        )}

        {/* Exam badge (when not BOTH) */}
        {!showBoth && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/50
                             text-indigo-700 dark:text-indigo-300 rounded-lg">
              {examType}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {subjectProgress.length} subject{subjectProgress.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {visibleSubjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {visibleSubjects.map(({ subject, pct, mastery, completed, total }) => (
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
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center
                          shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-black text-gray-900 dark:text-white">No subjects yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4 leading-relaxed">
              Add your subjects to start learning.
            </p>
            <button onClick={() => setShowSelector(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
              Add subjects →
            </button>
          </div>
        )}
      </div>

      {/* Subject selector sheet */}
      {showSelector && (
        <SubjectSelector
          profile={profile}
          currentSubjects={profile?.subjects ?? []}
          onSave={(newSubjects) => {
            setProfile(p => ({ ...p, subjects: newSubjects }))
            // Refresh subject list
            const et = profile?.exam_type ?? 'WAEC'
            supabase.from('subjects').select('id, name, slug, exam_type')
              .in('name', newSubjects).eq('is_active', true).order('name')
              .then(({ data }) => setSubjectList(data ?? []))
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  )
}