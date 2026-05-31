'use client'
// src/app/student/practice/page.js
// Complete rewrite addressing all issues:
// 1. Topic Practice: subject → topic → count → review mode → start
// 2. Timed Practice: topic option (all or specific) → count → start; shows timer preview
// 3. Mock Test: single required subject, 40q, end-of-session review
// 4. Exam Simulation: JAMB or WAEC format, real timing, all subjects
// 5. Prerequisite check wired into Topic Practice
// 6. Full light/dark mode — all pills/badges use CSS variable tokens
// 7. Scroll fix: flex layout with sticky start button, body scrolls freely

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

// ─── JAMB exam config ──────────────────────────────────────────────────────────
// JAMB: 180 minutes for 4 subjects × 40 questions each = 160 total
const JAMB_DURATION_SECS = 180 * 60
// WAEC: 3 hours per paper; for simulation we do 50q per subject selected
const WAEC_DURATION_SECS = 180 * 60

// ─── Pill/badge that works in both light and dark mode ─────────────────────────
// Uses bg-subtle (light: #f3f4f6, dark: #1f2937) + text-secondary
// For coloured pills: subject colours from theme already work in both modes
function NeutralPill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-subtle text-secondary border border-default ${className}`}>
      {children}
    </span>
  )
}

// ─── Practice mode cards ───────────────────────────────────────────────────────
const MODES = [
  {
    id: 'topic',
    emoji: '🎯',
    title: 'Topic Practice',
    desc: 'Pick a subject and topic, drill specific concepts',
    gradient: 'from-indigo-500 to-violet-600',
    badge: null,
  },
  {
    id: 'timed',
    emoji: '⏱',
    title: 'Timed Practice',
    desc: 'Mixed questions with a live countdown timer',
    gradient: 'from-blue-500 to-cyan-500',
    badge: null,
  },
  {
    id: 'mock',
    emoji: '📋',
    title: 'Mock Test',
    desc: 'Full subject test — all difficulty levels mixed',
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'Popular',
  },
  {
    id: 'exam',
    emoji: '🏆',
    title: 'Exam Simulation',
    desc: 'Real JAMB or WAEC format with official timing',
    gradient: 'from-orange-500 to-red-500',
    badge: 'Challenge',
  },
]

// ─── Shared bottom-sheet shell ─────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-card rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Topic Practice setup ──────────────────────────────────────────────────────
function TopicSetup({ subjects, examType, profile, onStart, onClose }) {
  const [step, setStep]         = useState('subject')  // subject | topic | config
  const [subject, setSubject]   = useState(null)
  const [topics, setTopics]     = useState([])
  const [topic, setTopic]       = useState(null)       // null = all topics
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [count, setCount]       = useState(20)
  const [revealMode, setRevealMode] = useState('immediate')
  const [prereqCheck, setPrereqCheck] = useState(null)  // null | {loading} | {data}
  const supabase = createClient()

  async function handleSubjectSelect(sub) {
    setSubject(sub)
    setTopicsLoading(true)
    const { data } = await supabase
      .from('topics')
      .select('id, name, slug')
      .eq('subject_id', sub.id)
      .order('order_index', { ascending: true })
    setTopics(data ?? [])
    setTopicsLoading(false)
    setStep('topic')
  }

  async function handleTopicSelect(t) {
    setTopic(t)
    // Check prerequisites for this topic
    if (t) {
      setPrereqCheck({ loading: true })
      try {
        const res  = await fetch(`/api/prerequisites/check?topicId=${t.id}`)
        const data = await res.json()
        setPrereqCheck({ data })
        if (data.gateActive && data.unmetPrerequisites?.length > 0) {
          setStep('prereq')
          return
        }
      } catch {
        setPrereqCheck(null)
      }
    } else {
      setPrereqCheck(null)
    }
    setStep('config')
  }

  function handleStart() {
    onStart({
      mode:       'topic',
      examType:   examType ?? 'WAEC',
      subjects:   [subject.name],
      topic_id:   topic?.id ?? null,
      topic_name: topic?.name ?? null,
      count,
      revealMode,
    })
  }

  const color = subject ? getSubjectColor(subject.name) : null

  return (
    <Sheet onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div className="flex items-center gap-3">
          {step !== 'subject' && (
            <button onClick={() => setStep(step === 'config' || step === 'prereq' ? 'topic' : 'subject')}
              className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div>
            <p className="font-black text-primary text-base">🎯 Topic Practice</p>
            <p className="text-xs text-secondary mt-0.5">
              {step === 'subject' ? 'Choose a subject' : step === 'topic' ? `${subject?.name} · Choose a topic` : step === 'prereq' ? 'Prerequisite check' : 'Configure session'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {/* Step: Subject */}
        {step === 'subject' && (
          <>
            {subjects.map(sub => {
              const c = getSubjectColor(sub.name)
              return (
                <button key={sub.id} onClick={() => handleSubjectSelect(sub)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl ${c.bg} hover:opacity-90 active:scale-[0.98] transition-all text-left`}>
                  <span className={`text-xl`}>📚</span>
                  <span className={`text-sm font-black ${c.text}`}>{sub.name}</span>
                  <svg className={`w-4 h-4 ${c.text} ml-auto`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              )
            })}
          </>
        )}

        {/* Step: Topic */}
        {step === 'topic' && (
          <>
            {topicsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* "All topics" option */}
                <button onClick={() => handleTopicSelect(null)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-subtle hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-default hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left">
                  <span className="text-xl">🎲</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-primary">All topics (random)</p>
                    <p className="text-xs text-secondary">Questions from across {subject?.name}</p>
                  </div>
                </button>
                {topics.map(t => (
                  <button key={t.id} onClick={() => handleTopicSelect(t)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-default hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-subtle transition-all text-left`}>
                    <span className="text-xl">📌</span>
                    <span className="text-sm font-bold text-primary flex-1">{t.name}</span>
                    {prereqCheck?.loading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                  </button>
                ))}
                {topics.length === 0 && (
                  <p className="text-center text-sm text-secondary py-6">No topics found for {subject?.name}</p>
                )}
              </>
            )}
          </>
        )}

        {/* Step: Prerequisite warning */}
        {step === 'prereq' && prereqCheck?.data && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <p className="text-sm font-black text-amber-800 dark:text-amber-400 mb-1">⚠️ Prerequisites not met</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                These topics are recommended before <strong>{topic?.name}</strong>. You can still proceed, but reviewing them will help.
              </p>
            </div>
            {prereqCheck.data.unmetPrerequisites?.map(prereq => (
              <div key={prereq.topic.id} className="bg-card border border-default rounded-2xl p-4">
                <p className="text-sm font-bold text-primary">{prereq.topic.name}</p>
                <p className="text-xs text-secondary mt-0.5">{prereq.questions?.length ?? 0} quick questions available</p>
              </div>
            ))}
            <p className="text-xs text-secondary text-center">You can still continue to {topic?.name}</p>
          </div>
        )}

        {/* Step: Config */}
        {step === 'config' && (
          <div className="space-y-5">
            {topic && (
              <div className={`${color?.bg} rounded-2xl px-4 py-3`}>
                <p className={`text-xs font-bold ${color?.text} opacity-70`}>{subject?.name}</p>
                <p className={`text-sm font-black ${color?.text}`}>{topic.name}</p>
              </div>
            )}

            {/* Question count */}
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Number of questions</p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 40].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${
                      count === n
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700 bg-card'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-tertiary mt-1.5 text-center">~{count * 1.5} minutes</p>
            </div>

            {/* Reveal mode */}
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Show answers</p>
              <div className="flex gap-2">
                {[
                  { value: 'immediate', label: 'After each question', icon: '⚡' },
                  { value: 'end',       label: 'Review at the end',   icon: '📋' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setRevealMode(opt.value)}
                    className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all text-center ${
                      revealMode === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-default text-secondary bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}>
                    <span className="block text-base mb-0.5">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky start button */}
      {(step === 'config' || step === 'prereq') && (
        <div className="px-5 py-4 border-t border-default flex-shrink-0 space-y-2">
          <button onClick={handleStart}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            {step === 'prereq' ? `Continue to ${topic?.name} →` : 'Start Practice →'}
          </button>
          {step === 'prereq' && (
            <button onClick={() => { setStep('config') }}
              className="w-full py-2.5 text-xs text-secondary hover:text-primary transition-colors">
              Skip prerequisite check
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

// ─── Timed Practice setup ──────────────────────────────────────────────────────
function TimedSetup({ subjects, examType, onStart, onClose }) {
  const [count, setCount]         = useState(20)
  const [topicFilter, setTopicFilter] = useState('all')  // 'all' | subject_id
  const [subject, setSubject]     = useState(null)
  const [topics, setTopics]       = useState([])
  const [topic, setTopic]         = useState(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const supabase = createClient()

  const countOptions = [10, 20, 30, 40]
  const mins = { 10: 15, 20: 20, 30: 30, 40: 40 }

  async function handleSubjectFilter(sub) {
    setSubject(sub)
    setTopic(null)
    setTopicsLoading(true)
    const { data } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', sub.id)
      .order('order_index')
    setTopics(data ?? [])
    setTopicsLoading(false)
  }

  function handleStart() {
    onStart({
      mode:       'timed',
      examType:   examType ?? 'WAEC',
      subjects:   subject ? [subject.name] : subjects.map(s => s.name),
      topic_id:   topic?.id ?? null,
      topic_name: topic?.name ?? null,
      count,
      revealMode: 'immediate',
      timed:      true,
    })
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div>
          <p className="font-black text-primary text-base">⏱ Timed Practice</p>
          <p className="text-xs text-secondary mt-0.5">Beat the clock, build exam speed</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Timer preview */}
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9"/>
            <polyline points="12 7 12 12 15 15"/>
          </svg>
          <div>
            <p className="text-sm font-black text-blue-800 dark:text-blue-300">{mins[count]} minutes</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">~{(mins[count] * 60 / count).toFixed(0)} seconds per question</p>
          </div>
        </div>

        {/* Question count */}
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Questions</p>
          <div className="grid grid-cols-4 gap-2">
            {countOptions.map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${
                  count === n
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-default text-secondary hover:border-blue-300 dark:hover:border-blue-700 bg-card'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Topic filter */}
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Focus on</p>
          <button onClick={() => { setSubject(null); setTopic(null) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left mb-2 transition-all ${
              !subject ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'border-default bg-card text-secondary hover:border-blue-300 dark:hover:border-blue-700'
            }`}>
            <span className="text-xl">🎲</span>
            <span className="text-sm font-bold">All subjects — random mix</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            {subjects.map(sub => {
              const c = getSubjectColor(sub.name)
              const sel = subject?.id === sub.id
              return (
                <button key={sub.id} onClick={() => handleSubjectFilter(sub)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                    sel ? `${c.bg} ${c.text} border-transparent` : 'border-default bg-card text-secondary hover:border-default'
                  }`}>
                  {sub.name}
                </button>
              )
            })}
          </div>

          {/* Topic refinement if subject selected */}
          {subject && (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs text-secondary px-1">Specific topic (optional)</p>
              {topicsLoading ? (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <button onClick={() => setTopic(null)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      !topic ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-default bg-card text-secondary'
                    }`}>
                    All topics in {subject.name}
                  </button>
                  {topics.map(t => (
                    <button key={t.id} onClick={() => setTopic(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        topic?.id === t.id ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-default bg-card text-secondary'
                      }`}>
                      {t.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-default flex-shrink-0">
        <button onClick={handleStart}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
          Start Timed Practice →
        </button>
      </div>
    </Sheet>
  )
}

// ─── Mock Test setup ───────────────────────────────────────────────────────────
function MockSetup({ subjects, examType, onStart, onClose }) {
  const [subject, setSubject] = useState(null)

  function handleStart() {
    if (!subject) return
    onStart({
      mode:       'mock',
      examType:   examType ?? 'WAEC',
      subjects:   [subject.name],
      count:      40,
      revealMode: 'end',
      timed:      false,
    })
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div>
          <p className="font-black text-primary text-base">📋 Mock Test</p>
          <p className="text-xs text-secondary mt-0.5">Full subject test — 40 questions, all difficulty levels</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 space-y-1">
          <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">📋 40 questions · Mixed difficulty</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-500">Answers revealed at the end so you can review everything</p>
        </div>

        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Select a subject <span className="text-red-500">*</span></p>
          <div className="space-y-2">
            {subjects.map(sub => {
              const c = getSubjectColor(sub.name)
              const sel = subject?.id === sub.id
              return (
                <button key={sub.id} onClick={() => setSubject(sub)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                    sel ? `${c.bg} border-transparent` : 'border-default bg-card hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${sel ? 'bg-white/40 border-white/60' : 'border-default'}`}>
                    {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-black ${sel ? c.text : 'text-primary'}`}>{sub.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-default flex-shrink-0">
        <button onClick={handleStart} disabled={!subject}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
          {subject ? `Start ${subject.name} Mock Test →` : 'Select a subject first'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Exam Simulation setup ─────────────────────────────────────────────────────
function ExamSimSetup({ subjects, profile, onStart, onClose }) {
  const [examFormat, setExamFormat] = useState(
    profile?.exam_type === 'JAMB' ? 'JAMB' : profile?.exam_type === 'WAEC' ? 'WAEC' : null
  )

  const jambInfo = {
    subjects: 4,
    questions: '40 per subject (160 total)',
    duration: '3 hours',
    secs: JAMB_DURATION_SECS,
  }
  const waecInfo = {
    subjects: subjects.length,
    questions: '15 per subject (objective)',
    duration: '40–45 minutes total',
    secs: 40 * 60,  // 40 minutes for the full simulation
  }

  function handleStart() {
    if (!examFormat) return
    const info = examFormat === 'JAMB' ? jambInfo : waecInfo
    onStart({
      mode:       'exam',
      examType:   examFormat,
      examFormat,
      subjects:   subjects.map(s => s.name),
      count:      examFormat === 'JAMB' ? 160 : subjects.length * 15,
      revealMode: 'end',
      timed:      true,
      durationSecs: info.secs,
    })
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div>
          <p className="font-black text-primary text-base">🏆 Exam Simulation</p>
          <p className="text-xs text-secondary mt-0.5">Real exam conditions — official timing and format</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <p className="text-xs font-bold text-secondary uppercase tracking-wide">Choose exam format</p>

        {/* JAMB card */}
        <button onClick={() => setExamFormat('JAMB')}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
            examFormat === 'JAMB'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400'
              : 'border-default bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
          }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${examFormat === 'JAMB' ? 'border-indigo-600 bg-indigo-600' : 'border-default'}`}>
              {examFormat === 'JAMB' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-black text-primary">JAMB / UTME</span>
            <span className="ml-auto text-xs font-black text-white bg-indigo-600 px-2 py-0.5 rounded-full">4 subjects</span>
          </div>
          <div className="pl-8 space-y-1">
            <p className="text-xs text-secondary">📝 {jambInfo.questions}</p>
            <p className="text-xs text-secondary">⏱ {jambInfo.duration}</p>
            <p className="text-xs text-secondary">🎯 Objective questions only</p>
          </div>
        </button>

        {/* WAEC card */}
        <button onClick={() => setExamFormat('WAEC')}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
            examFormat === 'WAEC'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-400'
              : 'border-default bg-card hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${examFormat === 'WAEC' ? 'border-emerald-600 bg-emerald-600' : 'border-default'}`}>
              {examFormat === 'WAEC' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-black text-primary">WAEC / SSCE</span>
            <span className="ml-auto text-xs font-black text-white bg-emerald-600 px-2 py-0.5 rounded-full">{subjects.length} subjects</span>
          </div>
          <div className="pl-8 space-y-1">
            <p className="text-xs text-secondary">📝 {waecInfo.questions}</p>
            <p className="text-xs text-secondary">⏱ {waecInfo.duration}</p>
            <p className="text-xs text-secondary">🎯 Objective + theory questions</p>
          </div>
        </button>

        {examFormat && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
            <p className="text-xs font-black text-amber-800 dark:text-amber-400">⚠️ Real exam conditions</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">The timer runs for the full {examFormat === 'JAMB' ? '3 hours' : '3 hours'}. No pausing. Answers revealed at the end.</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-default flex-shrink-0">
        <button onClick={handleStart} disabled={!examFormat}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
          {examFormat ? `Start ${examFormat} Simulation →` : 'Choose a format first'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ sessions, loading }) {
  if (loading) return (
    <div className="space-y-2 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-subtle rounded-2xl" />)}
    </div>
  )
  if (!sessions.length) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">📊</p>
      <p className="font-bold text-primary">No sessions yet</p>
      <p className="text-sm text-secondary mt-1">Complete your first practice to see results here</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {sessions.map(s => {
        const pct  = s.questions_count > 0 ? Math.round((s.correct_count / s.questions_count) * 100) : 0
        const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return (
          <div key={s.id} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-subtle flex items-center justify-center text-base flex-shrink-0">
              {s.mode === 'exam' ? '🏆' : s.mode === 'mock' ? '📋' : s.mode === 'timed' ? '⏱' : '🎯'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary truncate">
                {s.mode === 'exam' ? 'Exam Simulation' : s.mode === 'mock' ? 'Mock Test' : `${s.questions_count} Questions`}
              </p>
              <p className="text-xs text-secondary">{s.subject_name ?? 'Mixed'} · {date}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-base font-black ${pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</p>
              <p className="text-xs text-secondary">{s.correct_count}/{s.questions_count}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PracticeHQPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [tab,             setTab]             = useState('practice')
  const [profile,         setProfile]         = useState(null)
  const [subjects,        setSubjects]        = useState([])
  const [sessions,        setSessions]        = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [activeSetup,     setActiveSetup]     = useState(null)  // mode id | null

  useEffect(() => { init() }, [])
  useEffect(() => { if (tab === 'history' && !sessions.length) loadHistory() }, [tab])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('subjects, exam_type').eq('id', user.id).single()
    setProfile(prof)
    if (prof?.subjects?.length) {
      const { data: rows } = await supabase.from('subjects')
        .select('id, name, slug, exam_type').in('name', prof.subjects).eq('is_active', true)
      setSubjects(rows ?? [])
    }
    setLoading(false)
  }

  async function loadHistory() {
    setSessionsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSessionsLoading(false); return }
    const { data } = await supabase.from('practice_sessions')
      .select('id, mode, questions_count, correct_count, subject_name, created_at')
      .eq('student_id', user.id).order('created_at', { ascending: false }).limit(20)
    setSessions(data ?? [])
    setSessionsLoading(false)
  }

  function startSession(config) {
    setActiveSetup(null)
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Modals */}
      {activeSetup === 'topic' && (
        <TopicSetup subjects={subjects} examType={profile?.exam_type} profile={profile}
          onStart={startSession} onClose={() => setActiveSetup(null)} />
      )}
      {activeSetup === 'timed' && (
        <TimedSetup subjects={subjects} examType={profile?.exam_type}
          onStart={startSession} onClose={() => setActiveSetup(null)} />
      )}
      {activeSetup === 'mock' && (
        <MockSetup subjects={subjects} examType={profile?.exam_type}
          onStart={startSession} onClose={() => setActiveSetup(null)} />
      )}
      {activeSetup === 'exam' && (
        <ExamSimSetup subjects={subjects} profile={profile}
          onStart={startSession} onClose={() => setActiveSetup(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Practice HQ</h1>
        <p className="text-sm text-secondary mt-0.5">Every type of practice, all in one place</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-subtle p-1 rounded-2xl w-fit">
        {[{ id: 'practice', label: 'Practice' }, { id: 'history', label: 'History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-black rounded-xl transition-all ${
              tab === t.id ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'practice' && (
        <div className="space-y-3">
          {MODES.map(mode => (
            <button key={mode.id} onClick={() => setActiveSetup(mode.id)}
              className="w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left">
              {/* Icon with gradient background */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <span className="text-xl">{mode.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-primary">{mode.title}</p>
                  {mode.badge && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-subtle text-secondary border border-default">
                      {mode.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary mt-0.5 leading-snug">{mode.desc}</p>
              </div>
              <svg className="w-5 h-5 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {tab === 'history' && <HistoryTab sessions={sessions} loading={sessionsLoading} />}
    </div>
  )
}