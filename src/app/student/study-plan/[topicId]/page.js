'use client'
// src/app/student/study-plan/[topicId]/page.js
//
// FIXES IN THIS VERSION:
// 1. 404 FIX: was querying `practice_attempts` — correct table is `question_attempts`
// 2. INSIGHT UI: better styled, not a raw amber box — feels native to the page
// 3. STUDY BUTTON per subtopic: now shows a proper pill-link to the lesson
//    for every subtopic with lesson_status === 'published'
// 4. Tailwind v4 colour fix: all dynamic colour classes replaced with inline styles

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const SUBJECT_STYLES = {
  'Mathematics':           { bg: '#eff6ff', text: '#1d4ed8' },
  'Further Mathematics':   { bg: '#f0f9ff', text: '#0369a1' },
  'English Language':      { bg: '#faf5ff', text: '#7e22ce' },
  'Physics':               { bg: '#ecfeff', text: '#0e7490' },
  'Chemistry':             { bg: '#f0fdf4', text: '#15803d' },
  'Biology':               { bg: '#ecfdf5', text: '#047857' },
  'Economics':             { bg: '#fffbeb', text: '#b45309' },
  'Government':            { bg: '#fef2f2', text: '#b91c1c' },
  'Literature in English': { bg: '#fdf2f8', text: '#9d174d' },
  'Geography':             { bg: '#f0fdfa', text: '#0f766e' },
  'Agricultural Science':  { bg: '#f7fee7', text: '#4d7c0f' },
  'Commerce':              { bg: '#eef2ff', text: '#4338ca' },
  'default':               { bg: '#eef2ff', text: '#4338ca' },
}
function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

// ── Score ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ pct, attempts }) {
  const r = 32, circ = 2 * Math.PI * r
  const fill  = pct > 0 ? (pct / 100) * circ : 0
  const color = pct === 0 ? '#e2e8f0' : pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const label = pct === 0 ? '#94a3b8' : pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626'
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7"/>
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
      {attempts === 0
        ? <text x="40" y="45" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }}>New</text>
        : <>
            <text x="40" y="38" textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: label }}>{pct}%</text>
            <text x="40" y="52" textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>{attempts} tried</text>
          </>
      }
    </svg>
  )
}

// ── Subtopic row — with inline Study pill per row ──────────────────────────────
function SubtopicRow({ subtopic, accData }) {
  const { total = 0, correct = 0 } = accData ?? {}
  const pct       = total > 0 ? Math.round((correct / total) * 100) : 0
  const hasLesson = subtopic.lesson_status === 'published'
  const barColor  = total === 0 ? '#e5e7eb' : pct >= 70 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#f87171'
  const dotColor  = total === 0 ? '#d1d5db' : pct >= 70 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-default last:border-0">
      <div style={{ backgroundColor: dotColor }} className="w-2 h-2 rounded-full mt-[7px] flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-primary leading-snug flex-1">{subtopic.name}</p>
          {/* Study pill — shown inline per subtopic row when lesson exists */}
          {hasLesson && (
            <Link
              href={`/student/learn/${subtopic.slug}`}
              className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              Study
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
            <div style={{ width: total === 0 ? '0%' : `${pct}%`, backgroundColor: barColor }}
              className="h-full rounded-full transition-all duration-700" />
          </div>
          <span className="text-[10px] font-black text-tertiary tabular-nums w-12 text-right">
            {total === 0 ? 'Not tried' : `${correct}/${total} correct`}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TopicStudyPage() {
  const router      = useRouter()
  const { topicId } = useParams()
  const supabase    = createClient()

  const [loading,     setLoading]     = useState(true)
  const [subtopics,   setSubtopics]   = useState([])
  const [subAcc,      setSubAcc]      = useState({})
  const [topicName,   setTopicName]   = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [subjectSlug, setSubjectSlug] = useState('')
  const [subjectId,   setSubjectId]   = useState(null)
  const [examType,    setExamType]    = useState('WAEC')
  const [ctxAttempts, setCtxAttempts] = useState(0)
  const [ctxCorrect,  setCtxCorrect]  = useState(0)
  const [insightMsg,  setInsightMsg]  = useState('')

  useEffect(() => {
    // Fast-path: hydrate from sessionStorage immediately (no loading flicker)
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

    // Fetch topic → subject + subtopics in two clean queries
    const { data: topic } = await supabase
      .from('topics')
      .select('id, name, subject_id, subjects(id, name, slug, exam_type)')
      .eq('id', topicId)
      .single()

    if (!topic) { router.push('/student/study-plan'); return }

    setTopicName(prev => prev || topic.name)
    setSubjectName(prev => prev || (topic.subjects?.name ?? ''))
    setSubjectSlug(topic.subjects?.slug ?? '')
    setSubjectId(prev => prev || topic.subject_id)
    setExamType(topic.subjects?.exam_type ?? 'WAEC')

    const { data: subs } = await supabase
      .from('subtopics')
      .select('id, name, slug, lesson_status, order_index')
      .eq('topic_id', topicId)
      .order('order_index', { ascending: true })

    const subsArr = subs ?? []
    setSubtopics(subsArr)

    // FIX: was querying `practice_attempts` (404) — correct table is `question_attempts`
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

      // Only override context totals if context was empty
      setCtxAttempts(prev => {
        if (prev > 0) return prev
        return Object.values(acc).reduce((s, v) => s + v.total, 0)
      })
      setCtxCorrect(prev => {
        if (prev > 0) return prev
        return Object.values(acc).reduce((s, v) => s + v.correct, 0)
      })
    }

    setLoading(false)
  }

  const topicPct    = ctxAttempts > 0 ? Math.round((ctxCorrect / ctxAttempts) * 100) : 0
  const s           = getSubjectStyle(subjectName)
  const firstLesson = useMemo(() => subtopics.find(sub => sub.lesson_status === 'published'), [subtopics])

  function handlePractice() {
    sessionStorage.setItem('practice_config', JSON.stringify({
      mode: 'topic', topicId, topicName, subjectId, examType, questionCount: 20,
    }))
    router.push('/student/practice/session')
  }

  function handleStudy() {
    if (firstLesson) router.push(`/student/learn/${firstLesson.slug}`)
    else router.push(`/student/subjects/${subjectSlug}`)
  }

  if (loading && !topicName) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const perfMessage = ctxAttempts === 0
    ? "You haven't practised this topic yet — let's see where you stand."
    : topicPct >= 70 ? "You're above 70% — keep practising to stay sharp."
    : topicPct >= 50 ? "You're close to mastering this. A few more sessions will push you over."
    : "This is an area to focus on. Consistent practice will make a real difference."

  return (
    <div className="pb-28 space-y-5">

      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        Study Plan
      </button>

      {/* Hero card */}
      <div className="rounded-3xl overflow-hidden shadow-sm">
        {/* Subject colour band */}
        <div style={{ backgroundColor: s.bg }} className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span style={{ color: s.text }} className="text-[11px] font-black opacity-75 uppercase tracking-wider">
                {subjectName}
              </span>
              <h1 style={{ color: s.text }} className="text-xl font-black leading-tight mt-0.5">
                {topicName || '…'}
              </h1>
              <p style={{ color: s.text }} className="text-xs mt-1.5 leading-relaxed opacity-70 max-w-[220px]">
                {perfMessage}
              </p>
            </div>
            <ScoreRing pct={topicPct} attempts={ctxAttempts} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="bg-card grid grid-cols-2 gap-3 p-4">
          <button onClick={handleStudy}
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] transition-all text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-black">Study</p>
              <p className="text-[11px] text-white/70 mt-0.5">{firstLesson ? 'Open lesson' : 'Browse topics'}</p>
            </div>
          </button>

          <button onClick={handlePractice}
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-card border-2 border-default hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-[0.97] transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-primary">Practice</p>
              <p className="text-[11px] text-secondary mt-0.5">20 questions</p>
            </div>
          </button>
        </div>
      </div>

      {/* Insight — clean inline design, not an amber warning box */}
      {insightMsg && (
        <div className="flex items-start gap-3 bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-default">
          <span className="text-base flex-shrink-0 mt-0.5">💡</span>
          <p className="text-sm text-secondary leading-relaxed">{insightMsg}</p>
        </div>
      )}

      {/* Subtopics */}
      {subtopics.length > 0 && (
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-default flex items-center justify-between">
            <p className="text-sm font-black text-primary">Subtopics</p>
            <span className="text-xs text-tertiary">{subtopics.length} total</span>
          </div>
          <div>
            {subtopics.map(sub => (
              <SubtopicRow key={sub.id} subtopic={sub} accData={subAcc[sub.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}