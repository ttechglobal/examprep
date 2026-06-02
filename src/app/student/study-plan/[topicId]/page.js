'use client'
// src/app/student/study-plan/[topicId]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// THE CORE PAGE. Student taps a topic from their plan. They see:
//
//   1. HERO — topic name, subject, their current score ring
//   2. TWO BIG ACTION BUTTONS — Study | Practice
//      Study → opens the first available lesson for this topic
//      Practice → starts a practice session filtered to this topic
//   3. SUBTOPIC BREAKDOWN — each subtopic with its accuracy bar
//      "Study" badge links to the lesson, shown when lesson is published
//   4. INSIGHT — personalised message from the plan
//
// Design: high-contrast, motivational, zero ambiguity.
// Every element answers: "What do I do next?"
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ── Score ring ─────────────────────────────────────────────────────────────
function ScoreRing({ pct, attempts }) {
  const r    = 32
  const circ = 2 * Math.PI * r
  const fill = pct > 0 ? (pct / 100) * circ : 0

  const color = pct === 0   ? '#e2e8f0'
              : pct >= 70   ? '#10b981'
              : pct >= 50   ? '#f59e0b'
              :               '#ef4444'
  const label = pct === 0   ? '#94a3b8'
              : pct >= 70   ? '#059669'
              : pct >= 50   ? '#d97706'
              :               '#dc2626'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7"/>
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        {attempts === 0 ? (
          <text x="40" y="45" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}>
            New
          </text>
        ) : (
          <>
            <text x="40" y="38" textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: label }}>
              {pct}%
            </text>
            <text x="40" y="52" textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>
              {attempts} tried
            </text>
          </>
        )}
      </svg>
    </div>
  )
}

// ── Subtopic row ────────────────────────────────────────────────────────────
function SubtopicRow({ subtopic, accData, onStudy, onPractice }) {
  const { total = 0, correct = 0 } = accData ?? {}
  const pct       = total > 0 ? Math.round((correct / total) * 100) : 0
  const hasLesson = subtopic.lesson_status === 'published'

  const barColor = total === 0 ? 'bg-gray-200'
                 : pct >= 70   ? 'bg-green-500'
                 : pct >= 50   ? 'bg-amber-400'
                 :               'bg-red-400'

  const statusDot = total === 0 ? 'bg-gray-300'
                  : pct >= 70   ? 'bg-green-400'
                  : pct >= 50   ? 'bg-amber-400'
                  :               'bg-red-400'

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-default last:border-0">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${statusDot}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary leading-snug mb-2">{subtopic.name}</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: total === 0 ? '0%' : `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-tertiary tabular-nums w-8 text-right">
            {total === 0 ? '—' : `${pct}%`}
          </span>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasLesson && (
            <Link
              href={`/student/learn/${subtopic.slug}`}
              className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Study
            </Link>
          )}
          {total > 0 && (
            <span className="text-[10px] text-tertiary">{correct}/{total} correct</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function TopicStudyPage() {
  const router      = useRouter()
  const { topicId } = useParams()
  const supabase    = createClient()

  const [loading,      setLoading]      = useState(true)
  const [subtopics,    setSubtopics]    = useState([])
  const [subAcc,       setSubAcc]       = useState({})
  const [topicName,    setTopicName]    = useState('')
  const [subjectName,  setSubjectName]  = useState('')
  const [subjectSlug,  setSubjectSlug]  = useState('')
  const [subjectId,    setSubjectId]    = useState(null)
  const [examType,     setExamType]     = useState('WAEC')
  const [ctxAttempts,  setCtxAttempts]  = useState(0)
  const [ctxCorrect,   setCtxCorrect]   = useState(0)
  const [insightMsg,   setInsightMsg]   = useState('')

  useEffect(() => {
    // Fast path: read context from sessionStorage (no flicker)
    try {
      const raw = sessionStorage.getItem('study_plan_topic')
      if (raw) {
        const ctx = JSON.parse(raw)
        if (ctx.topicId === topicId) {
          setTopicName(ctx.topicName ?? '')
          setSubjectName(ctx.subjectName ?? '')
          setSubjectId(ctx.subjectId ?? null)
          setExamType(ctx.examType ?? 'WAEC')
          setCtxAttempts(ctx.attempts ?? 0)
          setCtxCorrect(ctx.correct ?? 0)
          setInsightMsg(ctx.insightMessage ?? '')
        }
      }
    } catch {}
    init()
  }, [topicId])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch topic + subject (covers case where sessionStorage was stale)
    const { data: topic } = await supabase
      .from('topics')
      .select('id, name, subject_id, subjects(id, name, slug)')
      .eq('id', topicId)
      .single()

    if (!topic) { router.push('/student/study-plan'); return }

    setTopicName(prev => prev || topic.name)
    setSubjectName(prev => prev || (topic.subjects?.name ?? ''))
    setSubjectSlug(topic.subjects?.slug ?? '')
    setSubjectId(prev => prev || topic.subject_id)

    // Fetch subtopics
    const { data: subs } = await supabase
      .from('subtopics')
      .select('id, name, slug, lesson_status, order_index')
      .eq('topic_id', topicId)
      .order('order_index', { ascending: true })

    const subsArr = subs ?? []
    setSubtopics(subsArr)

    // Fetch profile for exam type
    const { data: prof } = await supabase
      .from('profiles')
      .select('exam_type')
      .eq('id', user.id)
      .single()
    if (prof?.exam_type) setExamType(prof.exam_type)

    // Fetch subtopic-level accuracy for this student
    if (subsArr.length) {
      const { data: attempts } = await supabase
        .from('question_attempts')
        .select('subtopic_id, is_correct')
        .eq('student_id', user.id)
        .in('subtopic_id', subsArr.map(s => s.id))

      const acc = {}
      ;(attempts ?? []).forEach(a => {
        if (!acc[a.subtopic_id]) acc[a.subtopic_id] = { total: 0, correct: 0 }
        acc[a.subtopic_id].total++
        if (a.is_correct) acc[a.subtopic_id].correct++
      })
      setSubAcc(acc)

      // Recompute overall from subtopic data if context was empty
      if (ctxAttempts === 0) {
        const totalA = Object.values(acc).reduce((s, v) => s + v.total, 0)
        const totalC = Object.values(acc).reduce((s, v) => s + v.correct, 0)
        setCtxAttempts(totalA)
        setCtxCorrect(totalC)
      }
    }

    setLoading(false)
  }

  // Derived
  const topicPct = ctxAttempts > 0
    ? Math.round((ctxCorrect / ctxAttempts) * 100)
    : 0

  const color = getSubjectColor(subjectName)

  const weakSubs   = useMemo(() => subtopics.filter(s => {
    const a = subAcc[s.id]
    if (!a) return true
    return Math.round((a.correct / a.total) * 100) < 70
  }), [subtopics, subAcc])

  const strongSubs = useMemo(() => subtopics.filter(s => {
    const a = subAcc[s.id]
    if (!a) return false
    return Math.round((a.correct / a.total) * 100) >= 70
  }), [subtopics, subAcc])

  // First published lesson for "Study" CTA
  const firstLesson = useMemo(() =>
    subtopics.find(s => s.lesson_status === 'published'),
    [subtopics]
  )

  function handlePractice() {
    sessionStorage.setItem('practice_config', JSON.stringify({
      mode:       'topic',
      topicId,
      topicName,
      subjectId,
      examType,
      questionCount: 20,
    }))
    router.push('/student/practice/session')
  }

  function handleStudy() {
    if (firstLesson) {
      router.push(`/student/learn/${firstLesson.slug}`)
    } else {
      // No published lesson — fallback to subject page
      router.push(`/student/subjects/${subjectSlug}`)
    }
  }

  if (loading && !topicName) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const perfMessage = ctxAttempts === 0
    ? "You haven't practised this topic yet — let's see where you stand."
    : topicPct >= 70
      ? "You're above 70% — keep practising to stay sharp."
      : topicPct >= 50
        ? "You're close to mastering this. A few focused sessions will push you over 70%."
        : "This is an area to focus on. Consistent practice here will make a real difference."

  return (
    <div className="pb-28 space-y-5">

      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        Study Plan
      </button>

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className={`rounded-3xl overflow-hidden shadow-sm`}>
        {/* Subject colour band */}
        <div className={`${color.bg} px-5 pt-5 pb-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] font-black ${color.text} opacity-75 uppercase tracking-wider`}>
                {subjectName}
              </span>
              <h1 className={`text-xl font-black ${color.text} leading-tight mt-0.5`}>
                {topicName || '…'}
              </h1>
              <p className={`text-xs mt-1.5 leading-relaxed ${color.text} opacity-70 max-w-[220px]`}>
                {perfMessage}
              </p>
            </div>
            <ScoreRing pct={topicPct} attempts={ctxAttempts} />
          </div>
        </div>

        {/* ── THE TWO BIG BUTTONS ──────────────────────────────────────────── */}
        <div className="bg-card grid grid-cols-2 gap-3 p-4">
          {/* Study */}
          <button
            onClick={handleStudy}
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] transition-all text-white shadow-md shadow-indigo-200 dark:shadow-none"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-black">Study</p>
              <p className="text-[11px] text-white/70 mt-0.5">
                {firstLesson ? 'Read the lesson' : 'Browse content'}
              </p>
            </div>
          </button>

          {/* Practice */}
          <button
            onClick={handlePractice}
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 active:scale-[0.97] transition-all shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">Practice</p>
              <p className="text-[11px] text-secondary mt-0.5">20 questions</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Insight message ───────────────────────────────────────────────── */}
      {insightMsg && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-2xl px-4 py-3.5">
          <span className="text-base flex-shrink-0 mt-0.5">💡</span>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
            {insightMsg}
          </p>
        </div>
      )}

      {/* ── Subtopics: needs work ─────────────────────────────────────────── */}
      {weakSubs.length > 0 && (
        <div className="bg-card rounded-2xl border border-default shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-default flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
            <p className="text-sm font-black text-primary">Needs work</p>
            <span className="text-xs text-tertiary ml-auto">{weakSubs.length} subtopic{weakSubs.length !== 1 ? 's' : ''}</span>
          </div>
          {weakSubs.map(sub => (
            <SubtopicRow key={sub.id} subtopic={sub} accData={subAcc[sub.id]} />
          ))}
        </div>
      )}

      {/* ── Subtopics: strong ─────────────────────────────────────────────── */}
      {strongSubs.length > 0 && (
        <div className="bg-card rounded-2xl border border-default shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-default flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <p className="text-sm font-black text-primary">Already strong</p>
            <span className="text-xs text-tertiary ml-auto">{strongSubs.length} subtopic{strongSubs.length !== 1 ? 's' : ''}</span>
          </div>
          {strongSubs.map(sub => (
            <SubtopicRow key={sub.id} subtopic={sub} accData={subAcc[sub.id]} />
          ))}
        </div>
      )}

      {/* ── No subtopics fallback ─────────────────────────────────────────── */}
      {!loading && subtopics.length === 0 && (
        <div className="bg-card rounded-2xl border border-default p-6 text-center">
          <p className="text-sm text-secondary">No subtopics found for this topic yet.</p>
        </div>
      )}

      {/* ── FAB — quick practice shortcut ─────────────────────────────────── */}
      <button
        onClick={handlePractice}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-300/40 dark:shadow-none flex items-center justify-center hover:bg-indigo-500 active:scale-95 transition-all"
        aria-label="Practice this topic"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>

    </div>
  )
}