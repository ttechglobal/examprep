'use client'
// src/app/student/study-plan/page.js
// Dedicated Study Plan hub.
// Shows: weak areas · areas needing improvement · recommended next steps
// Grouped by subject, ordered by weakness score.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ─── Mastery chip ─────────────────────────────────────────────────────────────
function MasteryChip({ pct }) {
  if (pct >= 80) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Mastered</span>
  if (pct >= 60) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Good</span>
  if (pct >= 40) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Improving</span>
  if (pct > 0)   return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Weak</span>
  return              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not started</span>
}

// ─── Subject section ──────────────────────────────────────────────────────────
function SubjectSection({ subject, planItems, subtopicMap, completedIds, accuracyMap }) {
  const [expanded, setExpanded] = useState(true)
  const color = getSubjectColor(subject.name)

  // Categorise items
  const weak        = planItems.filter(id => { const a = accuracyMap[id]; return a != null && a < 50 && !completedIds.has(id) })
  const improving   = planItems.filter(id => { const a = accuracyMap[id]; return a != null && a >= 50 && a < 80 && !completedIds.has(id) })
  const notStarted  = planItems.filter(id => accuracyMap[id] == null && !completedIds.has(id))
  const done        = planItems.filter(id => completedIds.has(id))

  const upNext = weak[0] ?? improving[0] ?? notStarted[0] ?? null
  const upNextSub = upNext ? subtopicMap[upNext] : null

  const total  = planItems.length
  const doneN  = done.length
  const pct    = total > 0 ? Math.round((doneN / total) * 100) : 0

  // Helper: render a group of items
  function ItemGroup({ ids, label, labelColor }) {
    if (!ids.length) return null
    return (
      <div className="mt-3">
        <p className={`text-xs font-black uppercase tracking-wide mb-2 ${labelColor}`}>{label}</p>
        <div className="space-y-1.5">
          {ids.slice(0, 5).map(id => {
            const sub  = subtopicMap[id]
            const acc  = accuracyMap[id]
            const live = sub?.lesson_status === 'published'
            if (!sub) return null

            const row = (
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${live ? 'hover:bg-gray-50' : 'opacity-50'} transition-colors`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{sub.name}</p>
                  {sub.topics?.name && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub.topics.name}</p>}
                </div>
                {acc != null ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${acc >= 70 ? 'bg-green-500' : acc >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${acc}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${acc >= 70 ? 'text-green-600' : acc >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {acc}%
                    </span>
                  </div>
                ) : live ? (
                  <span className="text-xs text-gray-400 flex-shrink-0">Not started</span>
                ) : (
                  <span className="text-xs text-gray-300 flex-shrink-0">Soon</span>
                )}
                {live && (
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )

            return live
              ? <Link key={id} href={`/student/lesson/${id}`}>{row}</Link>
              : <div key={id}>{row}</div>
          })}
          {ids.length > 5 && (
            <p className="text-xs text-gray-400 pl-3">+{ids.length - 5} more</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Subject header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-10 h-10 rounded-2xl ${color.accent} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-black">{subject.name.slice(0,2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-gray-900 text-sm">{subject.name}</p>
            <MasteryChip pct={pct} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[120px] overflow-hidden">
              <div className={`h-full ${color.accent} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400">{doneN}/{total}</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50">

          {/* Up next callout */}
          {upNextSub && upNextSub.lesson_status === 'published' && (
            <Link
              href={`/student/lesson/${upNext}`}
              className={`flex items-center justify-between ${color.bg} rounded-2xl px-4 py-3 mt-4 hover:opacity-90 active:scale-[0.98] transition-all`}
            >
              <div>
                <p className={`text-xs font-bold ${color.text} opacity-60`}>Recommended next</p>
                <p className={`text-sm font-black ${color.text} mt-0.5`}>{upNextSub.name}</p>
              </div>
              <span className={`text-sm ${color.text}`}>→</span>
            </Link>
          )}

          <ItemGroup ids={weak} label="Needs work" labelColor="text-red-500" />
          <ItemGroup ids={improving} label="Improving" labelColor="text-amber-500" />
          <ItemGroup ids={notStarted.slice(0, 8)} label="Not started" labelColor="text-gray-500" />

          {doneN > 0 && (
            <p className="text-xs text-gray-300 mt-3 pl-3">{doneN} subtopics completed ✓</p>
          )}

          {/* Subject practice shortcut */}
          <Link
            href={`/student/practice?subject=${subject.slug}`}
            className={`mt-4 flex items-center justify-between border ${color.border} bg-white rounded-2xl px-4 py-3 hover:${color.bg} transition-colors`}
          >
            <p className={`text-sm font-bold ${color.text}`}>Practice {subject.name} →</p>
            <span className="text-xs text-gray-400">Test yourself</span>
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudyPlanPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [subjects, setSubjects]       = useState([])
  const [planMap, setPlanMap]         = useState({})        // subjectId → id[]
  const [subtopicMap, setSubtopicMap] = useState({})        // id → subtopic
  const [completedIds, setCompletedIds] = useState(new Set())
  const [accuracyMap, setAccuracyMap] = useState({})        // subtopicId → accuracy%
  const [loading, setLoading]         = useState(true)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }, { data: attempts }] = await Promise.all([
      supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed').eq('student_id', user.id),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids, subjects(id, name, slug, exam_type)').eq('student_id', user.id),
      supabase.from('question_attempts').select('subtopic_id, is_correct').eq('student_id', user.id).not('subtopic_id', 'is', null),
    ])

    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))

    // Build accuracy map: subtopicId → %
    const acc = {}
    ;(attempts ?? []).forEach(a => {
      if (!acc[a.subtopic_id]) acc[a.subtopic_id] = { total: 0, correct: 0 }
      acc[a.subtopic_id].total++
      if (a.is_correct) acc[a.subtopic_id].correct++
    })
    const accPct = {}
    Object.entries(acc).forEach(([id, { total, correct }]) => {
      accPct[id] = total > 0 ? Math.round((correct / total) * 100) : 0
    })
    setAccuracyMap(accPct)

    // Build plan map and subject list
    const plan = {}
    const subList = []
    ;(paths ?? []).forEach(p => {
      if (p.subjects) { subList.push(p.subjects); plan[p.subject_id] = p.ordered_subtopic_ids ?? [] }
    })
    setSubjects(subList)
    setPlanMap(plan)

    // Fetch all subtopic details
    const allIds = [...new Set(Object.values(plan).flat())]
    if (allIds.length) {
      let allSubs = []
      for (let i = 0; i < allIds.length; i += 200) {
        const { data } = await supabase
          .from('subtopics')
          .select('id, name, slug, lesson_status, topics(name)')
          .in('id', allIds.slice(i, i + 200))
        allSubs = allSubs.concat(data ?? [])
      }
      const sMap = {}
      allSubs.forEach(s => { sMap[s.id] = s })
      setSubtopicMap(sMap)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!subjects.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center">
          <p className="text-4xl mb-3">🗺</p>
          <p className="font-black text-gray-900 mb-1">No study plan yet</p>
          <p className="text-sm text-gray-500 mb-4">Take the diagnostic test to get a personalised plan.</p>
          <Link href="/diagnostic" className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
            Take diagnostic →
          </Link>
        </div>
      </div>
    )
  }

  // Count global weak areas across all subjects
  const totalWeak = subjects.reduce((acc, s) => {
    const ids = planMap[s.id] ?? []
    return acc + ids.filter(id => { const a = accuracyMap[id]; return a != null && a < 50 && !completedIds.has(id) }).length
  }, 0)

  return (
    <div className="space-y-5 pb-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Study Plan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Personalised to your weak areas</p>
        </div>
        {totalWeak > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <span className="text-xs font-black text-red-600">{totalWeak} weak areas</span>
          </div>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {(() => {
          const allIds  = Object.values(planMap).flat()
          const total   = allIds.length
          const done    = allIds.filter(id => completedIds.has(id)).length
          const weak    = allIds.filter(id => { const a = accuracyMap[id]; return a != null && a < 50 && !completedIds.has(id) }).length
          const ovPct   = total > 0 ? Math.round((done / total) * 100) : 0
          return [
            { label: 'Overall', value: `${ovPct}%` },
            { label: 'Completed', value: done },
            { label: 'Weak areas', value: weak, red: weak > 0 },
          ]
        })().map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <p className={`text-lg font-black ${s.red ? 'text-red-500' : 'text-gray-900'}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-subject sections */}
      {subjects.map(subject => (
        <SubjectSection
          key={subject.id}
          subject={subject}
          planItems={planMap[subject.id] ?? []}
          subtopicMap={subtopicMap}
          completedIds={completedIds}
          accuracyMap={accuracyMap}
        />
      ))}
    </div>
  )
}