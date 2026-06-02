'use client'
// src/app/student/practice/page.js
// ─────────────────────────────────────────────────────────────────────────────
// CHANGE: ExamSimSetup — WAEC format now requires picking ONE subject.
//   - Student picks WAEC → picks a subject → 50 questions, 45 minutes
//   - JAMB unchanged: 4 subjects × 40 questions, 3 hours
//
// All other modes (Topic, Timed, Mock) unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'

const JAMB_DURATION_SECS = 180 * 60   // 3 hours
const WAEC_DURATION_SECS = 45  * 60   // 45 minutes per subject paper

// ── Neutral pill ──────────────────────────────────────────────────────────────
function NeutralPill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-subtle text-secondary border border-default ${className}`}>
      {children}
    </span>
  )
}

// ── Mode cards ────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'topic', emoji: '🎯', title: 'Topic Practice',    desc: 'Pick a subject and topic, drill specific concepts',   gradient: 'from-indigo-500 to-violet-600', badge: null },
  { id: 'timed', emoji: '⏱',  title: 'Timed Practice',    desc: 'Mixed questions with a live countdown timer',         gradient: 'from-blue-500 to-cyan-500',     badge: null },
  { id: 'mock',  emoji: '📋', title: 'Mock Test',          desc: 'Full subject test — all difficulty levels mixed',    gradient: 'from-emerald-500 to-teal-500',  badge: 'Popular' },
  { id: 'exam',  emoji: '🏆', title: 'Exam Simulation',   desc: 'Real JAMB or WAEC format with official timing',      gradient: 'from-orange-500 to-red-500',    badge: 'Challenge' },
]

// ── Bottom sheet shell ────────────────────────────────────────────────────────
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
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Topic Practice ────────────────────────────────────────────────────────────
function TopicSetup({ subjects, examType, profile, onStart, onClose }) {
  const [step,         setStep]         = useState('subject')
  const [subject,      setSubject]      = useState(null)
  const [topics,       setTopics]       = useState([])
  const [topic,        setTopic]        = useState(null)
  const [topicsLoading,setTopicsLoading]= useState(false)
  const [count,        setCount]        = useState(20)
  const [revealMode,   setRevealMode]   = useState('immediate')
  const [prereqCheck,  setPrereqCheck]  = useState(null)
  const supabase = createClient()

  async function handleSubjectSelect(sub) {
    setSubject(sub)
    setTopicsLoading(true)
    const { data } = await supabase.from('topics').select('id, name, slug')
      .eq('subject_id', sub.id).order('order_index', { ascending: true })
    setTopics(data ?? [])
    setTopicsLoading(false)
    setStep('topic')
  }

  async function handleTopicSelect(t) {
    setTopic(t)
    if (t) {
      setPrereqCheck({ loading: true })
      try {
        const res  = await fetch(`/api/prerequisites/check?topicId=${t.id}`)
        const data = await res.json()
        setPrereqCheck({ data })
        if (data.gateActive && data.unmetPrerequisites?.length > 0) { setStep('prereq'); return }
      } catch { setPrereqCheck(null) }
    } else { setPrereqCheck(null) }
    setStep('config')
  }

  function handleStart() {
    onStart({ mode: 'topic', examType: examType ?? 'WAEC', subjects: [subject.name],
      topic_id: topic?.id ?? null, topic_name: topic?.name ?? null, count, revealMode })
  }

  const color = subject ? getSubjectColor(subject.name) : null

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div className="flex items-center gap-3">
          {step !== 'subject' && (
            <button onClick={() => setStep(step === 'config' || step === 'prereq' ? 'topic' : 'subject')}
              className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
          )}
          <div>
            <p className="font-black text-primary text-base">🎯 Topic Practice</p>
            <p className="text-xs text-secondary mt-0.5">
              {step === 'subject' ? 'Choose a subject'
                : step === 'topic' ? `${subject?.name} · Choose a topic`
                : `${subject?.name} · ${topic?.name ?? 'All topics'}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {step === 'subject' && subjects.map(sub => {
          const c = getSubjectColor(sub.name)
          return (
            <button key={sub.id} onClick={() => handleSubjectSelect(sub)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all border-default bg-card hover:border-indigo-300 dark:hover:border-indigo-700`}>
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-xs font-black ${c.text}`}>{sub.name.slice(0, 2)}</span>
              </div>
              <span className="text-sm font-bold text-primary">{sub.name}</span>
              <svg className="w-4 h-4 text-tertiary ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          )
        })}

        {step === 'topic' && (
          <>
            {topicsLoading ? (
              <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                <button onClick={() => handleTopicSelect(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${!topic ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-400' : 'border-default bg-card text-secondary'}`}>
                  All topics in {subject.name}
                </button>
                {topics.map(t => (
                  <button key={t.id} onClick={() => handleTopicSelect(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${topic?.id === t.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-400' : 'border-default bg-card text-secondary'}`}>
                    {t.name}
                  </button>
                ))}
              </>
            )}
          </>
        )}

        {(step === 'config' || step === 'prereq') && (
          <div className="space-y-4">
            {step === 'prereq' && prereqCheck?.data?.unmetPrerequisites?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                <p className="text-sm font-black text-amber-800 dark:text-amber-400 mb-1">📚 Recommended first</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                  Consider studying <strong>{prereqCheck.data.unmetPrerequisites[0]?.name}</strong> before this topic.
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Questions</p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 40].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${count === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-default text-secondary bg-card hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Answer reveal</p>
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'immediate', icon: '⚡', label: 'Instant', desc: 'See answer after each question' },
                  { id: 'end',       icon: '📋', label: 'At the end', desc: 'Review all after finishing' }].map(opt => (
                  <button key={opt.id} onClick={() => setRevealMode(opt.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${revealMode === opt.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-default bg-card text-secondary'}`}>
                    <span className="text-base block mb-0.5">{opt.icon}</span>
                    <p className="text-xs font-black">{opt.label}</p>
                    <p className="text-[10px] text-secondary leading-snug mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {(step === 'config' || step === 'prereq') && (
        <div className="px-5 py-4 border-t border-default flex-shrink-0 space-y-2">
          <button onClick={handleStart}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
            {step === 'prereq' ? `Continue to ${topic?.name} →` : 'Start Practice →'}
          </button>
          {step === 'prereq' && (
            <button onClick={() => setStep('config')} className="w-full py-2.5 text-xs text-secondary hover:text-primary transition-colors">
              Skip prerequisite check
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

// ── Timed Practice ────────────────────────────────────────────────────────────
function TimedSetup({ subjects, examType, onStart, onClose }) {
  const [count,         setCount]         = useState(20)
  const [subject,       setSubject]       = useState(null)
  const [topics,        setTopics]        = useState([])
  const [topic,         setTopic]         = useState(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const supabase = createClient()
  const countOptions = [10, 20, 30, 40]
  const mins = { 10: 15, 20: 20, 30: 30, 40: 40 }

  async function handleSubjectFilter(sub) {
    setSubject(sub); setTopic(null); setTopicsLoading(true)
    const { data } = await supabase.from('topics').select('id, name').eq('subject_id', sub.id).order('order_index')
    setTopics(data ?? [])
    setTopicsLoading(false)
  }

  function handleStart() {
    onStart({ mode: 'timed', examType: examType ?? 'WAEC',
      subjects: subject ? [subject.name] : subjects.map(s => s.name),
      topic_id: topic?.id ?? null, topic_name: topic?.name ?? null,
      count, revealMode: 'immediate', timed: true })
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div><p className="font-black text-primary text-base">⏱ Timed Practice</p><p className="text-xs text-secondary mt-0.5">Beat the clock, build exam speed</p></div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl px-4 py-3">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
          <div>
            <p className="text-sm font-black text-blue-800 dark:text-blue-300">{mins[count]} minutes</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">~{((mins[count] * 60) / count).toFixed(0)} seconds per question</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Questions</p>
          <div className="grid grid-cols-4 gap-2">
            {countOptions.map(n => (
              <button key={n} onClick={() => setCount(n)}
                className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${count === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-default text-secondary hover:border-blue-300 dark:hover:border-blue-700 bg-card'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-2">Focus on</p>
          <button onClick={() => { setSubject(null); setTopic(null) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left mb-2 transition-all ${!subject ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-default bg-card text-secondary'}`}>
            <span className="text-sm font-bold">All subjects (mixed)</span>
          </button>
          {subjects.map(sub => {
            const c = getSubjectColor(sub.name)
            const isSelected = subject?.id === sub.id
            return (
              <button key={sub.id} onClick={() => handleSubjectFilter(sub)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border mb-1 text-left transition-all text-xs font-bold ${isSelected ? `${c.bg} ${c.text} border-transparent` : 'border-default bg-card text-secondary'}`}>
                {sub.name}
              </button>
            )
          })}
          {subject && !topicsLoading && topics.length > 0 && (
            <div className="mt-2 ml-3 space-y-1">
              <button onClick={() => setTopic(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${!topic ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' : 'border-default bg-card text-secondary'}`}>
                All topics in {subject.name}
              </button>
              {topics.map(t => (
                <button key={t.id} onClick={() => setTopic(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${topic?.id === t.id ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-default bg-card text-secondary'}`}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4 border-t border-default flex-shrink-0">
        <button onClick={handleStart} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm">
          Start Timed Practice →
        </button>
      </div>
    </Sheet>
  )
}

// ── Mock Test ─────────────────────────────────────────────────────────────────
function MockSetup({ subjects, examType, onStart, onClose }) {
  const [subject, setSubject] = useState(null)

  function handleStart() {
    if (!subject) return
    onStart({ mode: 'mock', examType: examType ?? 'WAEC', subjects: [subject.name],
      count: 40, revealMode: 'end', timed: true, durationSecs: 45 * 60 })
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div><p className="font-black text-primary text-base">📋 Mock Test</p><p className="text-xs text-secondary mt-0.5">Full subject test — pick one subject</p></div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        <p className="text-xs font-bold text-secondary uppercase tracking-wide mb-3">Choose subject</p>
        {subjects.map(sub => {
          const c = getSubjectColor(sub.name)
          return (
            <button key={sub.id} onClick={() => setSubject(sub)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${subject?.id === sub.id ? `${c.bg} border-transparent` : 'border-default bg-card hover:border-default'}`}>
              <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-xs font-black ${c.text}`}>{sub.name.slice(0, 2)}</span>
              </div>
              <span className={`text-sm font-bold ${subject?.id === sub.id ? c.text : 'text-primary'}`}>{sub.name}</span>
            </button>
          )
        })}
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

// ── Exam Simulation ───────────────────────────────────────────────────────────
// WAEC: pick ONE subject → 50 questions → 45 minutes
// JAMB: all 4 enrolled subjects → 160 questions → 3 hours (unchanged)
function ExamSimSetup({ subjects, profile, onStart, onClose }) {
  const [examFormat,     setExamFormat]     = useState(
    profile?.exam_type === 'JAMB' ? 'JAMB' : profile?.exam_type === 'WAEC' ? 'WAEC' : null
  )
  const [waecSubject,    setWaecSubject]    = useState(null)  // WAEC: one subject required
  const [step,           setStep]           = useState('format') // format | waec_subject

  function handleFormatSelect(fmt) {
    setExamFormat(fmt)
    setWaecSubject(null)
    if (fmt === 'WAEC') {
      setStep('waec_subject')
    } else {
      setStep('format')
    }
  }

  function handleStart() {
    if (!examFormat) return
    if (examFormat === 'WAEC') {
      if (!waecSubject) return
      onStart({
        mode:         'exam',
        examType:     'WAEC',
        examFormat:   'WAEC',
        subjects:     [waecSubject.name],
        count:        50,
        revealMode:   'end',
        timed:        true,
        durationSecs: WAEC_DURATION_SECS,
      })
    } else {
      // JAMB — all enrolled subjects
      onStart({
        mode:         'exam',
        examType:     'JAMB',
        examFormat:   'JAMB',
        subjects:     subjects.map(s => s.name),
        count:        160,
        revealMode:   'end',
        timed:        true,
        durationSecs: JAMB_DURATION_SECS,
      })
    }
  }

  const canStart = examFormat === 'JAMB' || (examFormat === 'WAEC' && waecSubject !== null)

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
        <div className="flex items-center gap-3">
          {step === 'waec_subject' && (
            <button onClick={() => setStep('format')}
              className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
          )}
          <div>
            <p className="font-black text-primary text-base">🏆 Exam Simulation</p>
            <p className="text-xs text-secondary mt-0.5">
              {step === 'waec_subject' ? 'WAEC · Choose a subject' : 'Real exam conditions'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Step 1: Format selection */}
        {step === 'format' && (
          <>
            <p className="text-xs font-bold text-secondary uppercase tracking-wide">Choose exam format</p>

            {/* JAMB */}
            <button onClick={() => handleFormatSelect('JAMB')}
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
                <p className="text-xs text-secondary">📝 40 questions per subject · 160 total</p>
                <p className="text-xs text-secondary">⏱ 3 hours</p>
                <p className="text-xs text-secondary">🎯 All enrolled subjects at once</p>
              </div>
            </button>

            {/* WAEC */}
            <button onClick={() => handleFormatSelect('WAEC')}
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
                <span className="ml-auto text-xs font-black text-white bg-emerald-600 px-2 py-0.5 rounded-full">1 subject</span>
              </div>
              <div className="pl-8 space-y-1">
                <p className="text-xs text-secondary">📝 50 questions (objective)</p>
                <p className="text-xs text-secondary">⏱ 45 minutes</p>
                <p className="text-xs text-secondary">🎯 One subject per simulation</p>
              </div>
            </button>

            {/* JAMB ready-to-go info */}
            {examFormat === 'JAMB' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                <p className="text-xs font-black text-amber-800 dark:text-amber-400">⚠️ Real exam conditions</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">3-hour timer starts immediately. No pausing. Answers shown at the end.</p>
              </div>
            )}
          </>
        )}

        {/* Step 2: WAEC subject picker */}
        {step === 'waec_subject' && (
          <>
            <p className="text-xs font-bold text-secondary uppercase tracking-wide">
              Pick one subject for this simulation
            </p>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3">
              <p className="text-xs font-black text-emerald-800 dark:text-emerald-400">📝 WAEC format</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">50 questions · 45 minutes · objective only · answers at end</p>
            </div>

            <div className="space-y-2">
              {subjects.map(sub => {
                const c = getSubjectColor(sub.name)
                const isSelected = waecSubject?.id === sub.id
                return (
                  <button key={sub.id} onClick={() => setWaecSubject(sub)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? `${c.bg} border-transparent`
                        : 'border-default bg-card hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-black ${c.text}`}>{sub.name.slice(0, 2)}</span>
                    </div>
                    <span className={`text-sm font-bold flex-1 ${isSelected ? c.text : 'text-primary'}`}>{sub.name}</span>
                    {isSelected && (
                      <svg className={`w-5 h-5 ${c.text} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>

            {waecSubject && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                <p className="text-xs font-black text-amber-800 dark:text-amber-400">⚠️ Real exam conditions</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">45-minute timer starts immediately. No pausing. Answers shown at the end.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-5 py-4 border-t border-default flex-shrink-0">
        <button onClick={handleStart} disabled={!canStart}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm">
          {!examFormat ? 'Choose a format first'
            : examFormat === 'JAMB' ? 'Start JAMB Simulation →'
            : !waecSubject ? 'Select a subject first'
            : `Start ${waecSubject.name} WAEC Simulation →`}
        </button>
      </div>
    </Sheet>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ sessions, loading }) {
  if (loading) return (
    <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-subtle rounded-2xl" />)}</div>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PracticeHQPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [tab,             setTab]             = useState('practice')
  const [profile,         setProfile]         = useState(null)
  const [subjects,        setSubjects]        = useState([])
  const [sessions,        setSessions]        = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [activeSetup,     setActiveSetup]     = useState(null)

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
      {/* Setup sheets */}
      {activeSetup === 'topic' && <TopicSetup subjects={subjects} examType={profile?.exam_type} profile={profile} onStart={startSession} onClose={() => setActiveSetup(null)} />}
      {activeSetup === 'timed' && <TimedSetup subjects={subjects} examType={profile?.exam_type} onStart={startSession} onClose={() => setActiveSetup(null)} />}
      {activeSetup === 'mock'  && <MockSetup  subjects={subjects} examType={profile?.exam_type} onStart={startSession} onClose={() => setActiveSetup(null)} />}
      {activeSetup === 'exam'  && <ExamSimSetup subjects={subjects} profile={profile} onStart={startSession} onClose={() => setActiveSetup(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Practice HQ</h1>
        <p className="text-sm text-secondary mt-0.5">Every type of practice, all in one place</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-subtle p-1 rounded-2xl w-fit">
        {[{ id: 'practice', label: 'Practice' }, { id: 'history', label: 'History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-black rounded-xl transition-all ${tab === t.id ? 'bg-card text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'practice' && (
        <div className="space-y-5">
          {subjects.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4">
              <p className="text-sm font-black text-amber-800 dark:text-amber-300">No subjects added yet</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                Go to your profile and add the subjects you are studying to start practising.
              </p>
            </div>
          )}

          {/* Mode cards */}
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(mode => (
              <button key={mode.id} onClick={() => setActiveSetup(mode.id)}
                className="relative flex flex-col gap-3 bg-card rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-left">
                {mode.badge && (
                  <span className="absolute top-3 right-3 text-[9px] font-black text-white bg-gradient-to-r from-orange-500 to-red-500 px-1.5 py-0.5 rounded-full">
                    {mode.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center text-lg shadow-sm`}>
                  {mode.emoji}
                </div>
                <div>
                  <p className="text-sm font-black text-primary">{mode.title}</p>
                  <p className="text-xs text-secondary mt-0.5 leading-snug">{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Quick stats */}
          {subjects.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card rounded-2xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-primary">{subjects.length}</p>
                <p className="text-[10px] text-secondary">Subjects</p>
              </div>
              <div className="bg-card rounded-2xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-primary">50</p>
                <p className="text-[10px] text-secondary">WAEC Qs</p>
              </div>
              <div className="bg-card rounded-2xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-primary">160</p>
                <p className="text-[10px] text-secondary">JAMB Qs</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && <HistoryTab sessions={sessions} loading={sessionsLoading} />}
    </div>
  )
}