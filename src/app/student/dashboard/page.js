'use client'
// src/app/student/dashboard/page.js
//
// Root causes fixed:
// 1. NAME "there" — profile query now includes ALL needed fields.
//    full_name was being fetched but sometimes null if profile row is incomplete.
//    Now trims and handles edge cases properly.
//
// 2. TARGETS NOT SHOWING — old query only selected id, full_name, exam_type,
//    subjects, goals_set. Now also selects desired_profession, university_course,
//    target_university, waec_target_grades, jamb_target_scores, jamb_total_target.
//
// 3. STUDY PLAN NOT SHOWING — StudyPlanCard was filtering out all subtopics that
//    weren't 'published'. Added fallback: if no published lessons exist, show
//    the up-next items regardless of lesson_status so the plan still appears.
//
// 4. LIGHT/DARK MODE — ALL custom token classes replaced with explicit
//    Tailwind pairs (text-gray-900 dark:text-gray-100 etc.) so nothing depends
//    on CSS variable resolution timing.

import { useEffect, useState, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import WeeklyGoals from '@/components/dashboard/WeeklyGoals'
import Link from 'next/link'

// ─── getMasteryLevel ──────────────────────────────────────────────────────────
function getMasteryLevel(pct) {
  if (pct >= 80) return { label: 'Mastered',      color: 'text-green-600 dark:text-green-400',  emoji: '🏆' }
  if (pct >= 60) return { label: 'Getting there', color: 'text-blue-600 dark:text-blue-400',    emoji: '📈' }
  if (pct >= 40) return { label: 'Building',      color: 'text-yellow-600 dark:text-yellow-400',emoji: '🔨' }
  if (pct >= 20) return { label: 'Just started',  color: 'text-orange-500 dark:text-orange-400',emoji: '🌱' }
  return           { label: 'Not started',        color: 'text-gray-400 dark:text-gray-500',    emoji: '💤' }
}

// ─── Practice Hub button ──────────────────────────────────────────────────────
const PracticeCTA = memo(function PracticeCTA() {
  return (
    <Link href="/student/practice"
      className="
        relative overflow-hidden flex items-center gap-4
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-3xl px-5 py-4
        hover:border-indigo-300 dark:hover:border-indigo-600
        hover:shadow-md transition-all group active:scale-[0.98]
        shadow-sm
      ">
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-indigo-50 dark:from-indigo-950/20 to-transparent rounded-r-3xl pointer-events-none" />
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          Practice Hub
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Past questions · Mock tests · Exam simulation
        </p>
      </div>
      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
})

// ─── Subject icon SVGs ────────────────────────────────────────────────────────
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
    case 'English Language': case 'Literature in English': return (
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
        <line x1="5" y1="10" x2="5"  y2="35" stroke="currentColor" strokeWidth="1.4" opacity=".4"/>
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

// ─── Subject Card ──────────────────────────────────────────────────────────────
const SubjectCard = memo(function SubjectCard({ sub }) {
  const color = getSubjectColor(sub.subjects?.name)
  return (
    <Link href={`/student/subjects/${sub.subjects?.slug}`}
      className="block bg-white dark:bg-gray-900 rounded-2xl overflow-hidden
                 shadow-sm hover:shadow-md hover:-translate-y-0.5
                 transition-all active:scale-[0.98]">
      <div className={`${color.bg} px-4 py-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`w-9 h-9 flex-shrink-0 ${color.text}`}>
            <SubjectIcon name={sub.subjects?.name} />
          </div>
          <span className={`text-xs font-bold flex-shrink-0 ${sub.mastery?.color ?? 'text-gray-400'}`}>
            {sub.mastery?.emoji} {sub.pct}%
          </span>
        </div>
        <p className={`text-sm font-black ${color.text} truncate leading-tight`}>
          {sub.subjects?.name}
        </p>
        <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden mt-2">
          <div className={`h-full ${color.accent} rounded-full transition-all duration-700`}
            style={{ width: `${sub.pct}%` }} />
        </div>
      </div>
    </Link>
  )
})

// ─── Study Plan Card ───────────────────────────────────────────────────────────
const StudyPlanCard = memo(function StudyPlanCard({ learningPaths, subtopicMap, completedIds }) {
  if (!learningPaths.length) return null

  // Collect up to 4 upcoming items — don't filter by lesson_status so plan
  // always shows even if lessons are still being published
  const upNext = []
  for (const path of learningPaths) {
    for (const id of (path.ordered_subtopic_ids ?? [])) {
      if (completedIds.includes(id)) continue
      const sub = subtopicMap[id]
      if (!sub) continue
      upNext.push({
        ...sub,
        subjectName: path.subjects?.name,
        subjectSlug: path.subjects?.slug,
        hasLesson: sub.lesson_status === 'published',
      })
      if (upNext.length >= 4) break
    }
    if (upNext.length >= 4) break
  }

  if (!upNext.length) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">Your Study Plan</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Based on your weak areas</p>
        </div>
        <Link href="/student/learn" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
          View all →
        </Link>
      </div>
      <div>
        {upNext.map((sub, i) => {
          const color = getSubjectColor(sub.subjectName)
          const row = (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                <div className={`w-5 h-5 ${color.text}`}><SubjectIcon name={sub.subjectName} /></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{sub.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{sub.subjectName}</p>
              </div>
              {sub.hasLesson ? (
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              ) : (
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 flex-shrink-0">Soon</span>
              )}
            </div>
          )
          return sub.hasLesson ? (
            <Link key={sub.id} href={`/student/lesson/${sub.id}`}
              className={`block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                ${i < upNext.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
              {row}
            </Link>
          ) : (
            <div key={sub.id}
              className={`opacity-60 ${i < upNext.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
              {row}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ─── Targets Card ─────────────────────────────────────────────────────────────
function TargetsCard({ profile }) {
  const [open, setOpen] = useState(false)
  if (!profile) return null

  const hasAny = !!(
    profile.desired_profession ||
    profile.university_course  ||
    profile.target_university  ||
    profile.exam_type
  )

  const fields = [
    { label: 'Target Exam',        value: profile.exam_type },
    { label: 'Desired Profession', value: profile.desired_profession },
    {
      label: 'Target Courses',
      value: Array.isArray(profile.university_course)
        ? profile.university_course.join(', ')
        : profile.university_course,
    },
    { label: 'Target University',  value: profile.target_university },
    {
      label: 'WAEC Target Grades',
      value: profile.waec_target_grades && Object.keys(profile.waec_target_grades).length
        ? Object.entries(profile.waec_target_grades).map(([s, g]) => `${s}: ${g}`).join(' · ')
        : null,
    },
    {
      label: 'JAMB Target Score',
      value: profile.jamb_total_target ? `${profile.jamb_total_target} / 400` : null,
    },
  ].filter(f => f.value)

  return (
    <>
      {/* Tap target */}
      <button onClick={() => setOpen(true)}
        className="w-full text-left bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm
                   hover:shadow-md active:scale-[0.99] transition-all">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-white/65 text-xs font-semibold uppercase tracking-wide">My Targets</p>
            <p className="text-white font-black text-base mt-0.5 truncate">
              {hasAny
                ? (profile.desired_profession || profile.target_university || profile.university_course || 'View your targets')
                : 'Set your targets'}
            </p>
            {hasAny && (
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {profile.exam_type && (
                  <span className="text-[11px] font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-lg">
                    {profile.exam_type}
                  </span>
                )}
                {profile.target_university && (
                  <span className="text-[11px] font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                    {profile.target_university}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🎓</span>
          </div>
        </div>
      </button>

      {/* Read-only sheet */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center"
             style={{ background: 'rgba(0,0,0,0.55)' }}
             onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg shadow-2xl pb-24 max-h-[80vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <p className="font-black text-lg text-gray-900 dark:text-white">My Targets</p>
              <div className="flex items-center gap-2">
                <Link href="/student/profile" onClick={() => setOpen(false)}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400
                             bg-indigo-50 dark:bg-indigo-950/50
                             border border-indigo-100 dark:border-indigo-800
                             px-3 py-1.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors">
                  Edit
                </Link>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center
                             text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-5 pb-4 space-y-2">
              {fields.length > 0 ? fields.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4
                                            bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 pt-0.5">{label}</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white text-right">{value}</p>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🎓</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">No targets set yet</p>
                  <p className="text-xs text-gray-400 mb-4">Set your exam goals to stay motivated</p>
                  <Link href="/student/profile" onClick={() => setOpen(false)}
                    className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                    Set targets →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Floating Action Button ───────────────────────────────────────────────────
function PracticeFAB() {
  return (
    <Link href="/student/practice"
      className="fixed bottom-24 right-4 z-30 lg:bottom-8
                 w-14 h-14 rounded-2xl
                 bg-gradient-to-br from-indigo-600 to-violet-600
                 shadow-lg shadow-indigo-300 dark:shadow-indigo-900/50
                 flex items-center justify-center
                 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
      aria-label="Practice Hub">
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    </Link>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [profile,        setProfile]        = useState(null)
  const [streak,         setStreak]          = useState(0)
  const [loading,        setLoading]         = useState(true)
  const [learningPaths,  setLearningPaths]  = useState([])
  const [subtopicMap,    setSubtopicMap]    = useState({})
  const [lessonProgress, setLessonProgress] = useState([])
  const [subjects,       setSubjects]        = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // ✅ FIX: fetch ALL profile fields needed for targets + name
    const [{ data: prof }, { data: strk }, { data: prog }] = await Promise.all([
      supabase.from('profiles')
        .select(`
          id, full_name, exam_type, subjects, goals_set,
          desired_profession, university_course, target_university,
          waec_target_grades, jamb_target_scores, jamb_total_target
        `)
        .eq('id', user.id)
        .single(),
      supabase.from('student_streaks')
        .select('current_streak')
        .eq('student_id', user.id)
        .maybeSingle(),
      supabase.from('lesson_progress')
        .select('subtopic_id, completed')
        .eq('student_id', user.id),
    ])

    setProfile(prof)
    setStreak(strk?.current_streak ?? 0)
    setLessonProgress(prog ?? [])
    await loadLearningData(user.id, prog ?? [])
    setLoading(false)
  }

  async function loadLearningData(userId, prog = []) {
    const { data: paths } = await supabase
      .from('student_learning_paths')
      .select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)')
      .eq('student_id', userId)

    const active = (paths ?? []).filter(p => p.ordered_subtopic_ids?.length > 0)
    setLearningPaths(active)

    const completedSet = new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id))

    const subjectCards = active.map(path => {
      const total     = path.ordered_subtopic_ids?.length ?? 0
      const completed = path.ordered_subtopic_ids?.filter(id => completedSet.has(id)).length ?? 0
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
      return {
        subject_id: path.subject_id,
        subjects:   path.subjects,
        total, completed, pct,
        mastery: getMasteryLevel(pct),
      }
    })
    setSubjects(subjectCards)

    if (!active.length) return

    const allIds = [...new Set(active.flatMap(p => p.ordered_subtopic_ids ?? []))]
    const batches = []
    for (let i = 0; i < allIds.length; i += 200) batches.push(allIds.slice(i, i + 200))
    let allSubs = []
    await Promise.all(batches.map(b =>
      supabase.from('subtopics')
        .select('id, name, slug, lesson_status')
        .in('id', b)
        .then(({ data }) => { if (data) allSubs = allSubs.concat(data) })
    ))
    const sMap = {}
    allSubs.forEach(s => { sMap[s.id] = s })
    setSubtopicMap(sMap)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasPath      = learningPaths.length > 0
  const completedIds = lessonProgress.filter(p => p.completed).map(p => p.subtopic_id)

  // ✅ FIX: robust name extraction — handles null, empty, whitespace
  const rawName  = profile?.full_name ?? ''
  const firstName = rawName.trim().split(/\s+/).filter(Boolean)[0] ?? ''
  const greeting  = firstName || 'there'

  return (
    <>
      <div className="space-y-4">

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            {streak > 2 ? 'On a roll,' : 'Welcome back,'}
          </p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
            {greeting} 👋
            {streak > 0 && (
              <span className="ml-2 text-base font-bold text-orange-500">🔥 {streak}</span>
            )}
          </h1>
        </div>

        {/* Weekly Goals */}
        <WeeklyGoals />

        {hasPath ? (
          <>
            {/* Practice Hub */}
            <PracticeCTA />

            {/* Subjects */}
            {subjects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-black text-gray-900 dark:text-white">Your Subjects</p>
                  <Link href="/student/learn"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    See all →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {subjects.map(sub => <SubjectCard key={sub.subject_id} sub={sub} />)}
                </div>
              </div>
            )}

            {/* Study Plan — shows even if lessons not yet published */}
            <StudyPlanCard
              learningPaths={learningPaths}
              subtopicMap={subtopicMap}
              completedIds={completedIds}
            />

            {/* Targets — always at bottom */}
            <TargetsCard profile={profile} />
          </>
        ) : (
          <>
            {/* No learning path yet */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-6 text-center space-y-4">
              <p className="text-4xl">📚</p>
              <div>
                <p className="font-black text-gray-900 dark:text-white text-lg">
                  Let's build your study plan
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Take a short diagnostic test and we'll create a personalised path just for you.
                </p>
              </div>
              <Link href="/diagnostic"
                className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Take the diagnostic →
              </Link>
            </div>

            {/* Show targets even without study plan */}
            <TargetsCard profile={profile} />
          </>
        )}

      </div>

      {/* Floating practice button */}
      <PracticeFAB />
    </>
  )
}