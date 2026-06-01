'use client'
// src/app/student/study-plan/[topicId]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Topic study page — destination when student taps a topic in the study plan.
// This is the file that fixes the 404.
//
// Shows:
// - Performance card (accuracy, attempts)
// - Personalised insight
// - Subtopics with individual accuracy bars
// - Practice CTA button → practice session filtered to this topic
// - FAB gamepad button → same practice session
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

function MiniBar({ pct, attempts }) {
  if (attempts === 0) return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full"/>
      <span className="text-[10px] text-gray-400 w-8 text-right">—</span>
    </div>
  )
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-[10px] font-black text-gray-500 w-8 text-right tabular-nums">{pct}%</span>
    </div>
  )
}

function SubtopicRow({ subtopic, accData }) {
  const { total = 0, correct = 0 } = accData ?? {}
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const hasLesson = subtopic.lesson_status === 'published'

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{subtopic.name}</p>
          {hasLesson && (
            <Link
              href={`/student/learn/${subtopic.slug}`}
              onClick={e => e.stopPropagation()}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md hover:bg-indigo-100 transition-colors"
            >
              Lesson ↗
            </Link>
          )}
        </div>
        <MiniBar pct={pct} attempts={total} />
        {total > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">{correct}/{total} correct</p>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
        total === 0 ? 'bg-gray-200'
        : pct >= 70 ? 'bg-green-400'
        : pct >= 50 ? 'bg-blue-400'
        : 'bg-red-400'
      }`}/>
    </div>
  )
}

export default function TopicStudyPage() {
  const router   = useRouter()
  const { topicId } = useParams()
  const supabase = createClient()

  const [loading,     setLoading]     = useState(true)
  const [subtopics,   setSubtopics]   = useState([])
  const [subAcc,      setSubAcc]      = useState({})
  const [topicName,   setTopicName]   = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [subjectId,   setSubjectId]   = useState(null)
  const [examType,    setExamType]    = useState('WAEC')
  const [ctxAttempts, setCtxAttempts] = useState(0)
  const [ctxCorrect,  setCtxCorrect]  = useState(0)

  useEffect(() => { init() }, [topicId])

  async function init() {
    // Restore context from sessionStorage (fast path)
    try {
      const raw = sessionStorage.getItem('study_plan_topic')
      if (raw) {
        const ctx = JSON.parse(raw)
        if (ctx.topicId === topicId) {
          setTopicName(ctx.topicName)
          setSubjectName(ctx.subjectName)
          setSubjectId(ctx.subjectId)
          setExamType(ctx.examType ?? 'WAEC')
          setCtxAttempts(ctx.attempts ?? 0)
          setCtxCorrect(ctx.correct ?? 0)
        }
      }
    } catch {}

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch subtopics
    const { data: subs } = await supabase
      .from('subtopics')
      .select('id, name, slug, lesson_status, order_index')
      .eq('topic_id', topicId)
      .order('order_index', { ascending: true })

    setSubtopics(subs ?? [])

    // Fallback: fetch topic name from DB if context wasn't set
    if (!topicName) {
      const { data: topic } = await supabase
        .from('topics')
        .select('id, name, subject_id, subjects(id, name, slug)')
        .eq('id', topicId)
        .single()
      if (topic) {
        setTopicName(topic.name)
        setSubjectName(topic.subjects?.name ?? '')
        setSubjectId(topic.subject_id)
      }
    }

    // Fetch profile for exam type fallback
    const { data: prof } = await supabase.from('profiles').select('exam_type').eq('id', user.id).single()
    if (prof?.exam_type) setExamType(prof.exam_type)

    // Fetch subtopic-level accuracy
    const subtopicIds = (subs ?? []).map(s => s.id)
    if (subtopicIds.length) {
      const { data: attempts } = await supabase
        .from('question_attempts')
        .select('subtopic_id, is_correct')
        .eq('student_id', user.id)
        .in('subtopic_id', subtopicIds)

      const acc = {}
      ;(attempts ?? []).forEach(a => {
        if (!acc[a.subtopic_id]) acc[a.subtopic_id] = { total: 0, correct: 0 }
        acc[a.subtopic_id].total++
        if (a.is_correct) acc[a.subtopic_id].correct++
      })
      setSubAcc(acc)
    }

    setLoading(false)
  }

  const topicPct   = ctxAttempts > 0 ? Math.round((ctxCorrect / ctxAttempts) * 100) : 0
  const color      = getSubjectColor(subjectName)

  function handlePractice() {
    sessionStorage.setItem('practice_config', JSON.stringify({
      mode:       'topic',
      examType,
      subjects:   [subjectName],
      topic_id:   topicId,
      topic_name: topicName,
      count:      20,
      revealMode: 'immediate',
    }))
    router.push('/student/practice/session')
  }

  const weakSubs   = subtopics.filter(s => { const a = subAcc[s.id]; return !a || a.total === 0 || Math.round((a.correct / a.total) * 100) < 70 })
  const strongSubs = subtopics.filter(s => { const a = subAcc[s.id]; return a && a.total >= 3 && Math.round((a.correct / a.total) * 100) >= 70 })

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-4 pb-28 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {subjectName && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text} inline-block mb-0.5`}>
                {subjectName}
              </span>
            )}
            <h1 className="text-base font-black text-gray-900 leading-tight truncate">{topicName}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-2">

        {/* Performance card */}
        <div className={`${color.bg} rounded-3xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={`text-xs font-black uppercase tracking-wide ${color.text} opacity-70`}>Your performance</p>
              <p className={`text-4xl font-black ${color.text} mt-1`}>
                {ctxAttempts > 0 ? `${topicPct}%` : '—'}
              </p>
              {ctxAttempts > 0 && (
                <p className={`text-xs ${color.text} opacity-70 mt-0.5`}>
                  {ctxCorrect} correct · {ctxAttempts} attempted
                </p>
              )}
            </div>
            {ctxAttempts > 0 && (
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6"/>
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={topicPct >= 70 ? '#16a34a' : topicPct >= 50 ? '#3b82f6' : '#ef4444'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(topicPct / 100) * 163.4} 163.4`}/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-black ${color.text}`}>{topicPct}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white/60 rounded-2xl px-4 py-3">
            <p className={`text-sm font-semibold ${color.text} leading-relaxed`}>
              {ctxAttempts === 0
                ? "You haven't practised this topic yet. Start below and we'll track your progress."
                : topicPct >= 70 ? `You're above 70% — keep practising to stay sharp.`
                : topicPct >= 50 ? `You're close to mastering this topic! A few focused sessions will push you over 70%.`
                : `This is an area to focus on. Consistent practice here will make a real difference.`}
            </p>
          </div>
        </div>

        {/* Practice CTA */}
        <button
          onClick={handlePractice}
          className="w-full py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Practice {topicName} — 20 questions
        </button>

        {/* Subtopics needing work */}
        {weakSubs.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-black text-gray-900">Subtopics to focus on</p>
              <p className="text-xs text-gray-500 mt-0.5">{weakSubs.length} below 70% or not yet attempted</p>
            </div>
            <div>
              {weakSubs.map(sub => (
                <SubtopicRow key={sub.id} subtopic={sub} accData={subAcc[sub.id]}/>
              ))}
            </div>
          </div>
        )}

        {/* Strong subtopics */}
        {strongSubs.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <span className="text-green-500">🏆</span>
              <div>
                <p className="text-sm font-black text-gray-900">Strong subtopics</p>
                <p className="text-xs text-gray-500">{strongSubs.length} above 70%</p>
              </div>
            </div>
            <div>
              {strongSubs.map(sub => (
                <SubtopicRow key={sub.id} subtopic={sub} accData={subAcc[sub.id]}/>
              ))}
            </div>
          </div>
        )}

        {/* Study tips */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-sm font-black text-amber-900">Study tips</p>
          </div>
          <ul className="space-y-2">
            {[
              'Practice 10–20 questions on this topic daily for best results.',
              'Review explanations for every wrong answer — that\'s where the learning happens.',
              'Focus on subtopics you haven\'t attempted yet first.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-amber-800 leading-relaxed">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={handlePractice}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-500 active:scale-95 transition-all"
        aria-label="Practice this topic"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>
    </div>
  )
}