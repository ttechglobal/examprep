'use client'
// src/app/student/learn/LearnPage.jsx  — REPLACE existing file
//
// Sections (in order):
//   1. Search — client-side across subjects, topics, subtopics
//   2. Continue Learning — next incomplete subtopic per subject
//   3. Subject cards — mastery %, next item, quick-start
//   4. Subject Workspace — topics accordion with mastery states
//   5. Practice — mixed + topic-based CTAs

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getMasteryState(subtopicId, completedIds, inProgressIds) {
  if (completedIds.has(subtopicId))   return 'mastered'
  if (inProgressIds.has(subtopicId))  return 'learning'
  return 'not_started'
}

function MasteryBadge({ state }) {
  const map = {
    mastered:    { label: 'Mastered',     className: 'bg-green-100 text-green-700' },
    learning:    { label: 'In progress',  className: 'bg-amber-100 text-amber-700' },
    not_started: { label: null,           className: '' },
  }
  const { label, className } = map[state] ?? map.not_started
  if (!label) return null
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${className}`}>
      {label}
    </span>
  )
}

function ProgressBar({ pct, colorClass }) {
  return (
    <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all duration-700`}
        style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Search results overlay
// ─────────────────────────────────────────────────────────────────────────────
function SearchResults({ query, subjectList, topicsBySubject, completedIds, onClose }) {
  const q = query.toLowerCase().trim()

  const results = useMemo(() => {
    if (!q) return []
    const out = []

    for (const subject of subjectList) {
      // Match subject name
      if (subject.name.toLowerCase().includes(q)) {
        out.push({ type: 'subject', label: subject.name, sublabel: 'Subject', href: `/student/learn?subject=${subject.slug}`, color: getSubjectColor(subject.name) })
      }

      const topics = topicsBySubject[subject.id] ?? []
      for (const topic of topics) {
        // Match topic name
        if (topic.name.toLowerCase().includes(q)) {
          out.push({ type: 'topic', label: topic.name, sublabel: subject.name, href: `/student/learn?subject=${subject.slug}`, color: getSubjectColor(subject.name) })
        }

        // Match subtopic name
        for (const sub of (topic.subtopics ?? [])) {
          if (sub.name.toLowerCase().includes(q)) {
            const done = completedIds.has(sub.id)
            const canStart = sub.lesson_status === 'published'
            out.push({
              type:     'subtopic',
              label:    sub.name,
              sublabel: `${subject.name} · ${topic.name}`,
              href:     canStart ? `/student/lesson/${sub.id}` : null,
              color:    getSubjectColor(subject.name),
              done,
              canStart,
            })
          }
        }
      }

      if (out.length >= 20) break
    }

    return out.slice(0, 12)
  }, [q, subjectList, topicsBySubject, completedIds])

  if (!q) return null

  const typeIcon = { subject: '📚', topic: '📖', subtopic: '📄' }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
      {results.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {results.map((r, i) => {
            const inner = (
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className="text-base flex-shrink-0">{typeIcon[r.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.label}</p>
                  <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>
                </div>
                {r.done && <span className="text-xs text-green-600 font-bold flex-shrink-0">Done ✓</span>}
                {r.canStart && !r.done && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${r.color.bg} ${r.color.text}`}>
                    Start →
                  </span>
                )}
              </div>
            )

            return r.href ? (
              <Link key={i} href={r.href} onClick={onClose}>{inner}</Link>
            ) : (
              <div key={i}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Continue Learning strip
// ─────────────────────────────────────────────────────────────────────────────
function ContinueLearning({ subjectList, topicsBySubject, completedIds, studyPlanMap }) {
  // Find next incomplete published subtopic per subject (up to 3 subjects)
  const items = []

  for (const subject of subjectList) {
    if (items.length >= 3) break
    const color  = getSubjectColor(subject.name)
    const topics = topicsBySubject[subject.id] ?? []
    const plan   = studyPlanMap[subject.id] ?? []

    let nextId = null
    if (plan.length) {
      nextId = plan.find(id => {
        if (completedIds.has(id)) return false
        for (const t of topics) {
          const sub = (t.subtopics ?? []).find(s => s.id === id)
          if (sub?.lesson_status === 'published') return true
        }
        return false
      }) ?? null
    }
    if (!nextId) {
      for (const t of topics) {
        const sub = (t.subtopics ?? []).find(s => s.lesson_status === 'published' && !completedIds.has(s.id))
        if (sub) { nextId = sub.id; break }
      }
    }
    if (!nextId) continue

    let subtopicName = ''
    let topicName    = ''
    for (const t of topics) {
      const sub = (t.subtopics ?? []).find(s => s.id === nextId)
      if (sub) { subtopicName = sub.name; topicName = t.name; break }
    }

    items.push({ subject, color, nextId, subtopicName, topicName })
  }

  if (!items.length) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-black text-gray-900">Continue Learning</h3>
      <div className="space-y-2">
        {items.map(({ subject, color, nextId, subtopicName, topicName }) => (
          <Link
            key={subject.id}
            href={`/student/lesson/${nextId}`}
            className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xs font-black ${color.text}`}>
                {subject.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 truncate">{subject.name} · {topicName}</p>
              <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{subtopicName}</p>
            </div>
            <span className={`text-xs font-black px-2.5 py-1.5 rounded-xl ${color.bg} ${color.text} flex-shrink-0`}>
              Continue →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject selector cards
// ─────────────────────────────────────────────────────────────────────────────
function SubjectCards({ subjects, selectedId, topicsBySubject, completedIds, onSelect }) {
  if (subjects.length <= 1) return null // single subject: no need for cards, workspace shows directly

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-black text-gray-900">Subjects</h3>
      <div className="grid grid-cols-2 gap-2">
        {subjects.map(subject => {
          const color   = getSubjectColor(subject.name)
          const topics  = topicsBySubject[subject.id] ?? []
          const allSubs = topics.flatMap(t => t.subtopics ?? [])
          const total   = allSubs.length
          const done    = allSubs.filter(s => completedIds.has(s.id)).length
          const pct     = total > 0 ? Math.round((done / total) * 100) : 0
          const active  = subject.id === selectedId

          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject.id)}
              className={`text-left rounded-2xl p-4 transition-all border-2 ${
                active
                  ? `${color.bg} border-current ${color.text} shadow-sm`
                  : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
              }`}
            >
              <p className={`text-sm font-black truncate ${active ? color.text : 'text-gray-900'}`}>
                {subject.name}
              </p>
              <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${color.accent}`}
                  style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${active ? color.text + ' opacity-70' : 'text-gray-400'}`}>
                {pct}% mastered
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Topic accordion card
// ─────────────────────────────────────────────────────────────────────────────
function TopicCard({ topic, completedIds, inProgressIds, color, planOrder, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false)

  const subtopics  = topic.subtopics ?? []
  const live       = subtopics.filter(s => s.lesson_status === 'published')
  const done       = subtopics.filter(s => completedIds.has(s.id)).length
  const pct        = subtopics.length > 0 ? Math.round((done / subtopics.length) * 100) : 0
  const allDone    = done === subtopics.length && subtopics.length > 0

  // Next subtopic: honour plan order, else first incomplete live subtopic
  const nextId = planOrder
    ? planOrder.find(id => !completedIds.has(id) && subtopics.find(s => s.id === id && s.lesson_status === 'published'))
    : live.find(s => !completedIds.has(s.id))?.id

  // Topic-level mastery label
  const topicState =
    allDone ? 'mastered' :
    done > 0 || subtopics.some(s => inProgressIds.has(s.id)) ? 'learning' :
    'not_started'

  const stateLabel = {
    mastered:    { text: 'Mastered',    cls: 'bg-green-100 text-green-700' },
    learning:    { text: 'In progress', cls: 'bg-amber-100 text-amber-700' },
    not_started: { text: null,          cls: '' },
  }[topicState]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Topic header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        {/* State indicator */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
          allDone            ? 'bg-green-100 text-green-600' :
          topicState === 'learning' ? `${color.bg} ${color.text}` :
          'bg-gray-100 text-gray-400'
        }`}>
          {allDone ? '✓' : pct > 0 ? `${pct}%` : '○'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-bold ${allDone ? 'text-gray-400' : 'text-gray-900'}`}>
              {topic.name}
            </p>
            {stateLabel.text && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stateLabel.cls}`}>
                {stateLabel.text}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {live.length === 0
              ? 'Lessons coming soon'
              : allDone
              ? 'All complete 🎉'
              : done > 0
              ? `${done} of ${subtopics.length} done`
              : `${live.length} lesson${live.length !== 1 ? 's' : ''} ready`}
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Subtopic list */}
      {expanded && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {subtopics.map((sub, i) => {
            const isNext    = sub.id === nextId
            const isDone    = completedIds.has(sub.id)
            const isLive    = sub.lesson_status === 'published'
            const isInProg  = inProgressIds.has(sub.id) && !isDone
            const state     = isDone ? 'mastered' : isInProg ? 'learning' : 'not_started'

            const row = (
              <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isNext && isLive  ? `${color.bg}` :
                isLive            ? 'hover:bg-gray-50' :
                'opacity-50'
              }`}>
                {/* Position / check */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                  isDone    ? 'bg-green-100 text-green-600' :
                  isNext && isLive ? `${color.accent} text-white` :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${
                    isDone   ? 'line-through text-gray-400' :
                    isNext   ? `font-bold ${color.text}` :
                    'text-gray-800'
                  }`}>
                    {sub.name}
                  </p>
                  {isInProg && (
                    <p className="text-xs text-amber-600 mt-0.5">In progress</p>
                  )}
                </div>

                {/* Right badge */}
                {isNext && isLive && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${color.bg} ${color.text} flex-shrink-0`}>
                    Up next
                  </span>
                )}
                {isDone && <span className="text-xs text-gray-300 flex-shrink-0">Done</span>}
                {!isLive && <span className="text-xs text-gray-300 flex-shrink-0">Soon</span>}
                {isLive && !isDone && !isNext && (
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )

            if (!isLive) return <div key={sub.id}>{row}</div>
            return <Link key={sub.id} href={`/student/lesson/${sub.id}`}>{row}</Link>
          })}

          {/* Topic-level practice link */}
          {live.length > 0 && (
            <Link
              href={`/student/practice?topicId=${topic.id}`}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-indigo-50 transition-colors"
            >
              <span className="text-sm">✏️</span>
              <span className={`text-xs font-bold ${color.text}`}>
                Practice {topic.name} questions →
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject workspace (topics + practice for one subject)
// ─────────────────────────────────────────────────────────────────────────────
function SubjectWorkspace({ subject, topics, completedIds, inProgressIds, planOrder, topicsLoading }) {
  const color = getSubjectColor(subject.name)

  const allSubs  = topics.flatMap(t => t.subtopics ?? [])
  const total    = allSubs.length
  const done     = allSubs.filter(s => completedIds.has(s.id)).length
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0
  const live     = allSubs.filter(s => s.lesson_status === 'published').length

  // Next subtopic
  const nextId = planOrder?.find(id => {
    if (completedIds.has(id)) return false
    return allSubs.find(s => s.id === id && s.lesson_status === 'published')
  }) ?? allSubs.find(s => s.lesson_status === 'published' && !completedIds.has(s.id))?.id

  return (
    <div className="space-y-4">

      {/* Workspace header */}
      <div className={`${color.bg} rounded-3xl p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-black ${color.text}`}>{subject.name}</h2>
          <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white/50 ${color.text}`}>
            {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} colorClass={color.accent} />
        <p className={`text-xs mt-1.5 ${color.text} opacity-70`}>
          {done === 0 && live === 0
            ? 'Lessons being added soon 🚧'
            : done === 0
            ? `${live} lesson${live !== 1 ? 's' : ''} ready to start 🚀`
            : done === total && total > 0
            ? '🏆 All topics complete!'
            : `${done} of ${total} subtopics complete`}
        </p>
      </div>

      {/* Continue button */}
      {nextId && (
        <Link
          href={`/student/lesson/${nextId}`}
          className={`flex items-center justify-between w-full ${color.accent} text-white rounded-2xl px-5 py-4 hover:opacity-90 transition-opacity`}
        >
          <div>
            <p className="text-xs font-medium opacity-80">Continue learning</p>
            <p className="text-sm font-black mt-0.5">
              {allSubs.find(s => s.id === nextId)?.name ?? 'Next lesson'}
            </p>
          </div>
          <span className="text-xl">→</span>
        </Link>
      )}

      {/* Topics heading */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-black text-gray-900">Topics</h3>
        <span className="text-xs text-gray-400">{topics.length} topics</span>
      </div>

      {/* Topics loading */}
      {topicsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Topics accordion */}
      {!topicsLoading && topics.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-400 text-sm">No topics uploaded yet.</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon!</p>
        </div>
      )}

      {!topicsLoading && topics.length > 0 && (
        <div className="space-y-2.5">
          {topics.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              completedIds={completedIds}
              inProgressIds={inProgressIds}
              color={color}
              planOrder={planOrder}
              defaultOpen={i === 0 && done === 0} // auto-open first topic if student hasn't started
            />
          ))}
        </div>
      )}

      {/* Practice section */}
      {live > 0 && (
        <div className="space-y-2 pt-1">
          <h3 className="text-sm font-black text-gray-900 px-1">Practice</h3>

          <Link
            href={`/student/practice?subject=${subject.slug}`}
            className={`flex items-center justify-between bg-white border-2 ${color.border} rounded-2xl px-5 py-4 hover:${color.bg} transition-colors group`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <div>
                <p className="text-sm font-black text-gray-900">Mixed Practice</p>
                <p className="text-xs text-gray-400">Questions from all {subject.name} topics</p>
              </div>
            </div>
            <span className={`${color.text} text-sm`}>→</span>
          </Link>

          <Link
            href="/student/practice"
            className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-black text-gray-900">All Subjects Practice</p>
                <p className="text-xs text-gray-400">Mix questions across your subjects</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [profile, setProfile]                   = useState(null)
  const [subjectList, setSubjectList]           = useState([])
  const [topicsBySubject, setTopicsBySubject]   = useState({})
  const [completedIds, setCompletedIds]         = useState(new Set())
  const [inProgressIds, setInProgressIds]       = useState(new Set())
  const [studyPlanMap, setStudyPlanMap]         = useState({})
  const [loading, setLoading]                   = useState(true)
  const [topicsLoading, setTopicsLoading]       = useState(false)
  const [activeExam, setActiveExam]             = useState(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  // Search state
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => { init() }, [])

  // Pre-load all subjects' topics in the background for search
  useEffect(() => {
    if (subjectList.length === 0) return
    for (const s of subjectList) {
      if (!topicsBySubject[s.id]) loadTopics(s.id, /* silent */ true)
    }
  }, [subjectList])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: prog }, { data: paths }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, exam_type, subjects').eq('id', user.id).single(),
      supabase.from('lesson_progress').select('subtopic_id, completed, slides_completed').eq('student_id', user.id),
      supabase.from('student_learning_paths').select('subject_id, ordered_subtopic_ids').eq('student_id', user.id),
    ])

    setProfile(prof)
    setCompletedIds(new Set((prog ?? []).filter(p => p.completed).map(p => p.subtopic_id)))
    setInProgressIds(new Set(
      (prog ?? []).filter(p => !p.completed && (p.slides_completed ?? 0) > 0).map(p => p.subtopic_id)
    ))

    const planMap = {}
    ;(paths ?? []).forEach(p => { planMap[p.subject_id] = p.ordered_subtopic_ids })
    setStudyPlanMap(planMap)

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

    const firstExam  = examType === 'BOTH' ? 'WAEC' : null
    setActiveExam(firstExam)

    const subjectParam = searchParams.get('subject')
    const match  = subjectParam ? relevant.find(s => s.slug === subjectParam) : null
    const first  = match ?? relevant[0]

    if (first) {
      setSelectedSubjectId(first.id)
      await loadTopics(first.id)
    }

    setLoading(false)
  }

  async function loadTopics(subjectId, silent = false) {
    if (topicsBySubject[subjectId]) return
    if (!silent) setTopicsLoading(true)

    const { data: topics } = await supabase
      .from('topics')
      .select('id, name, slug, order_index, subtopics(id, name, slug, lesson_status, order_index)')
      .eq('subject_id', subjectId)
      .order('order_index')

    const sorted = (topics ?? []).map(t => ({
      ...t,
      subtopics: (t.subtopics ?? []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    }))

    setTopicsBySubject(prev => ({ ...prev, [subjectId]: sorted }))
    if (!silent) setTopicsLoading(false)
  }

  function handleSelectSubject(subjectId) {
    setSelectedSubjectId(subjectId)
    loadTopics(subjectId)
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── No subjects ──
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

  const isMultiExam      = profile?.exam_type === 'BOTH'
  const visibleSubjects  = isMultiExam
    ? subjectList.filter(s => s.exam_type === activeExam || s.exam_type === 'BOTH')
    : subjectList
  const selectedSubject  = visibleSubjects.find(s => s.id === selectedSubjectId) ?? visibleSubjects[0]
  const topics           = selectedSubject ? (topicsBySubject[selectedSubject.id] ?? []) : []
  const planOrder        = selectedSubject ? studyPlanMap[selectedSubject.id] : null
  const showSearchResults = searchFocused && searchQuery.trim().length > 0

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl font-black text-gray-900">Learn</h1>

      {/* ── 1. SEARCH ─────────────────────────────────────────── */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search subjects, topics, lessons…"
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {showSearchResults && (
          <SearchResults
            query={searchQuery}
            subjectList={visibleSubjects}
            topicsBySubject={topicsBySubject}
            completedIds={completedIds}
            onClose={() => { setSearchQuery(''); setSearchFocused(false) }}
          />
        )}
      </div>

      {/* ── EXAM TOGGLE (BOTH students) ───────────────────────── */}
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

      {/* ── 2. CONTINUE LEARNING ─────────────────────────────── */}
      <ContinueLearning
        subjectList={visibleSubjects}
        topicsBySubject={topicsBySubject}
        completedIds={completedIds}
        studyPlanMap={studyPlanMap}
      />

      {/* ── 3. SUBJECT CARDS ─────────────────────────────────── */}
      <SubjectCards
        subjects={visibleSubjects}
        selectedId={selectedSubject?.id}
        topicsBySubject={topicsBySubject}
        completedIds={completedIds}
        onSelect={handleSelectSubject}
      />

      {/* ── 4. SUBJECT WORKSPACE ─────────────────────────────── */}
      {selectedSubject && (
        <SubjectWorkspace
          subject={selectedSubject}
          topics={topics}
          completedIds={completedIds}
          inProgressIds={inProgressIds}
          planOrder={planOrder}
          topicsLoading={topicsLoading}
        />
      )}
    </div>
  )
}