'use client'
// src/app/student/study-plan/page.js
// Rebuilt: study plan is now driven by actual question_attempts weak areas,
// not by "how many topics were covered".
// Each topic shows: accuracy from practice, attempt count, and a link to study or practise it.
// No subtopic-level granularity shown here — topic level is the right unit for the plan.

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ── Accuracy chip ─────────────────────────────────────────────────────────────
function AccuracyChip({ pct, attempts }) {
  if (attempts === 0) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-subtle text-secondary border border-default">
      Not attempted
    </span>
  )
  if (pct >= 80) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
      Strong · {pct}%
    </span>
  )
  if (pct >= 60) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      Getting there · {pct}%
    </span>
  )
  if (pct >= 40) return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
      Needs work · {pct}%
    </span>
  )
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
      Weak · {pct}%
    </span>
  )
}

// ── Topic row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, subjectName, onTap }) {
  const color    = getSubjectColor(subjectName)
  const pct      = topic.attempts > 0 ? Math.round((topic.correct / topic.attempts) * 100) : 0
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <button onClick={() => onTap(topic)}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-subtle rounded-2xl transition-colors text-left -mx-1 px-1">
      <div className={`w-9 h-9 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-xs font-black ${color.text}`}>{subjectName.slice(0, 2).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary truncate">{topic.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden max-w-[80px]">
            {topic.attempts > 0 && (
              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
            )}
          </div>
          <span className="text-xs text-tertiary">{topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <AccuracyChip pct={pct} attempts={topic.attempts} />
      <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  )
}

// ── Topic detail sheet ────────────────────────────────────────────────────────
function TopicSheet({ topic, subjectName, subjectSlug, onClose, onPractise }) {
  const color = getSubjectColor(subjectName)
  const pct   = topic.attempts > 0 ? Math.round((topic.correct / topic.attempts) * 100) : 0

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl pb-24"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>
        <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-default">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center`}>
              <span className={`text-sm font-black ${color.text}`}>{subjectName.slice(0,2).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-black text-primary">{topic.name}</p>
              <p className="text-xs text-secondary">{subjectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-subtle rounded-2xl px-3 py-3 text-center">
              <p className={`text-xl font-black ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {topic.attempts > 0 ? `${pct}%` : '—'}
              </p>
              <p className="text-xs text-secondary mt-0.5">Accuracy</p>
            </div>
            <div className="bg-subtle rounded-2xl px-3 py-3 text-center">
              <p className="text-xl font-black text-primary">{topic.attempts}</p>
              <p className="text-xs text-secondary mt-0.5">Attempts</p>
            </div>
            <div className="bg-subtle rounded-2xl px-3 py-3 text-center">
              <p className="text-xl font-black text-primary">{topic.correct}</p>
              <p className="text-xs text-secondary mt-0.5">Correct</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`rounded-2xl px-4 py-3 ${
            topic.attempts === 0
              ? 'bg-subtle border border-default'
              : pct < 50
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
              : pct < 70
              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
          }`}>
            <p className={`text-sm font-black mb-0.5 ${
              topic.attempts === 0 ? 'text-primary'
              : pct < 50 ? 'text-red-700 dark:text-red-400'
              : pct < 70 ? 'text-amber-700 dark:text-amber-400'
              : 'text-green-700 dark:text-green-400'
            }`}>
              {topic.attempts === 0 ? '📚 Not attempted yet'
                : pct < 50 ? '⚠️ Needs focused practice'
                : pct < 70 ? '📈 Getting there — keep going'
                : '✓ Looking good — maintain it'}
            </p>
            <p className="text-xs text-secondary leading-relaxed">
              {topic.attempts === 0
                ? 'You haven\'t practised this topic yet. Start with 10 questions.'
                : pct < 50
                ? 'Your accuracy is below 50%. Practise this topic specifically to improve.'
                : pct < 70
                ? 'You\'re above 50% but there\'s room to improve before exam day.'
                : 'Good accuracy. Keep practising to stay sharp.'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => onPractise(topic)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 transition-all">
              Practise this topic →
            </button>
            {topic.hasLesson && (
              <Link href={`/student/subjects/${subjectSlug}`}
                className="block w-full py-3 border border-default text-primary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors text-center">
                Go to lesson →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyPlanPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [subjects,    setSubjects]    = useState([])   // [{id, name, slug}]
  const [topicMap,    setTopicMap]    = useState({})   // subjectId → [{id, name, slug, attempts, correct, hasLesson}]
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')  // 'all' | 'weak' | 'strong'
  const [selectedTopic, setSelectedTopic] = useState(null)  // {topic, subjectName, subjectSlug}

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prof }, { data: attempts }, { data: paths }] = await Promise.all([
      supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single(),
      supabase.from('question_attempts')
        .select('topic_id, is_correct')
        .eq('student_id', user.id)
        .not('topic_id', 'is', null),
      supabase.from('student_learning_paths')
        .select('subject_id, subjects(id, name, slug)')
        .eq('student_id', user.id),
    ])

    const subjectList = (paths ?? []).map(p => p.subjects).filter(Boolean)
    setSubjects(subjectList)

    if (!subjectList.length) { setLoading(false); return }

    // Build accuracy map by topic_id
    const acc = {}
    ;(attempts ?? []).forEach(a => {
      if (!acc[a.topic_id]) acc[a.topic_id] = { total: 0, correct: 0 }
      acc[a.topic_id].total++
      if (a.is_correct) acc[a.topic_id].correct++
    })

    // Fetch all topics for all subjects
    const subjectIds = subjectList.map(s => s.id)
    const { data: topics } = await supabase
      .from('topics')
      .select('id, name, slug, subject_id')
      .in('subject_id', subjectIds)
      .order('order_index', { ascending: true })

    // Check which topics have published lessons (via subtopics)
    const topicIds = (topics ?? []).map(t => t.id)
    let topicsWithLessons = new Set()
    if (topicIds.length) {
      const { data: subs } = await supabase
        .from('subtopics')
        .select('topic_id')
        .in('topic_id', topicIds)
        .eq('lesson_status', 'published')
      ;(subs ?? []).forEach(s => topicsWithLessons.add(s.topic_id))
    }

    // Build topic map per subject, enriched with accuracy data
    const tMap = {}
    subjectList.forEach(s => { tMap[s.id] = [] })
    ;(topics ?? []).forEach(t => {
      const a = acc[t.id]
      tMap[t.subject_id]?.push({
        id:         t.id,
        name:       t.name,
        slug:       t.slug,
        attempts:   a?.total   ?? 0,
        correct:    a?.correct ?? 0,
        hasLesson:  topicsWithLessons.has(t.id),
      })
    })

    // Sort each subject's topics: weak first (by accuracy ascending), then not attempted, then strong
    Object.keys(tMap).forEach(sid => {
      tMap[sid].sort((a, b) => {
        // Topics with attempts go first, sorted by accuracy ascending (weakest first)
        if (a.attempts > 0 && b.attempts > 0) {
          const pa = a.correct / a.attempts
          const pb = b.correct / b.attempts
          return pa - pb
        }
        if (a.attempts > 0) return -1
        if (b.attempts > 0) return  1
        return 0
      })
    })

    setTopicMap(tMap)
    setLoading(false)
  }

  function handlePractise(topic) {
    setSelectedTopic(null)
    sessionStorage.setItem('practice_config', JSON.stringify({
      mode:       'topic',
      examType:   'WAEC',
      subjects:   [subjects.find(s => topicMap[s.id]?.some(t => t.id === topic.id))?.name ?? ''],
      topic_id:   topic.id,
      topic_name: topic.name,
      count:      20,
      revealMode: 'immediate',
    }))
    router.push('/student/practice/session')
  }

  // Summary stats
  const stats = useMemo(() => {
    const allTopics = Object.values(topicMap).flat()
    const attempted = allTopics.filter(t => t.attempts > 0)
    const weak      = attempted.filter(t => Math.round((t.correct / t.attempts) * 100) < 50)
    const strong    = attempted.filter(t => Math.round((t.correct / t.attempts) * 100) >= 70)
    return { total: allTopics.length, attempted: attempted.length, weak: weak.length, strong: strong.length }
  }, [topicMap])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!subjects.length) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-primary">Study Plan</h1>
      <div className="bg-card rounded-3xl shadow-sm p-8 text-center space-y-3">
        <p className="text-4xl">🗺</p>
        <p className="font-black text-primary">No study plan yet</p>
        <p className="text-sm text-secondary">Take the diagnostic test to get your personalised plan.</p>
        <Link href="/diagnostic" className="inline-block px-6 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
          Take diagnostic →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-4">
      {selectedTopic && (
        <TopicSheet
          topic={selectedTopic.topic}
          subjectName={selectedTopic.subjectName}
          subjectSlug={selectedTopic.subjectSlug}
          onClose={() => setSelectedTopic(null)}
          onPractise={handlePractise}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Study Plan</h1>
        <p className="text-sm text-secondary mt-0.5">Based on your practice performance</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Topics', value: stats.total },
          { label: 'Attempted', value: stats.attempted },
          { label: 'Weak', value: stats.weak, red: stats.weak > 0 },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-2xl shadow-sm px-3 py-3 text-center">
            <p className={`text-xl font-black ${s.red ? 'text-red-500' : 'text-primary'}`}>{s.value}</p>
            <p className="text-xs text-secondary mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-subtle p-1 rounded-2xl w-fit">
        {[
          { id: 'all',    label: 'All topics' },
          { id: 'weak',   label: `Weak (${stats.weak})` },
          { id: 'strong', label: `Strong (${stats.strong})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 text-xs font-black rounded-xl transition-all ${
              filter === f.id ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Per-subject sections */}
      {subjects.map(subject => {
        const color  = getSubjectColor(subject.name)
        let topics   = topicMap[subject.id] ?? []

        if (filter === 'weak') {
          topics = topics.filter(t => t.attempts > 0 && Math.round((t.correct / t.attempts) * 100) < 50)
        } else if (filter === 'strong') {
          topics = topics.filter(t => t.attempts > 0 && Math.round((t.correct / t.attempts) * 100) >= 70)
        }

        if (!topics.length) return null

        const attempted = topics.filter(t => t.attempts > 0).length

        return (
          <div key={subject.id} className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className={`${color.bg} px-5 py-3.5`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-black ${color.text}`}>{subject.name}</p>
                <span className={`text-xs font-bold ${color.text} opacity-70`}>
                  {attempted}/{topics.length} attempted
                </span>
              </div>
            </div>
            <div className="px-4 py-2 divide-y divide-default">
              {topics.map(topic => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  subjectName={subject.name}
                  onTap={t => setSelectedTopic({ topic: t, subjectName: subject.name, subjectSlug: subject.slug })}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty state for filters */}
      {filter !== 'all' && subjects.every(s => {
        const topics = topicMap[s.id] ?? []
        const filtered = filter === 'weak'
          ? topics.filter(t => t.attempts > 0 && Math.round((t.correct/t.attempts)*100) < 50)
          : topics.filter(t => t.attempts > 0 && Math.round((t.correct/t.attempts)*100) >= 70)
        return filtered.length === 0
      }) && (
        <div className="bg-card rounded-2xl shadow-sm p-6 text-center">
          <p className="text-secondary text-sm">
            {filter === 'weak'
              ? 'No weak topics yet — complete some practice sessions first'
              : 'No strong topics yet — keep practising!'}
          </p>
          <Link href="/student/practice" className="inline-block mt-3 text-xs font-black text-indigo-600 hover:text-indigo-500">
            Go practise →
          </Link>
        </div>
      )}
    </div>
  )
}