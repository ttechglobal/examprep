'use client'
// src/app/student/practice/page.js
// Fixes:
// 1. Modal z-index — all modals use z-[200], backdrop-blur, pb-24 to clear navbar
// 2. Practice session setup flow — subject, question count, answer timing
// 3. Full dark mode compliance using CSS tokens
// 4. Session setup replaces separate subject picker + count picker modals

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getSubjectColor } from '@/lib/theme'
import Link from 'next/link'

// ─── Practice modes ────────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'topic', emoji: '🎯', title: 'Topic Practice',
    desc: 'Focus on one topic at a time',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'timed', emoji: '⏱', title: 'Timed Practice Test',
    desc: '10, 20, or 30 questions with a timer',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'mock', emoji: '📋', title: 'Mock Test',
    desc: 'Full subject test, mixed difficulty',
    badge: 'Popular',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'exam', emoji: '🏆', title: 'Exam Simulation',
    desc: 'Full WAEC/JAMB format — real conditions',
    badge: 'Challenge',
    gradient: 'from-orange-500 to-red-500',
  },
]

const COUNTS = [10, 20, 30, 40]

// ─── Session setup modal ───────────────────────────────────────────────────────
// Single modal that walks through subject → count → answer timing before starting
function SessionSetupModal({ mode, subjects, examType, onStart, onClose }) {
  const [step, setStep]             = useState('subject')   // 'subject' | 'config'
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [count, setCount]           = useState(mode.id === 'mock' ? 40 : mode.id === 'exam' ? 50 : 20)
  const [revealMode, setRevealMode] = useState('immediate') // 'immediate' | 'end'

  const isExam = mode.id === 'exam'
  const isMock = mode.id === 'mock'

  function handleStart() {
    const subjectNames = selectedSubject
      ? [selectedSubject.name]
      : subjects.map(s => s.name)

    onStart({
      examType:   examType ?? 'WAEC',
      subjects:   subjectNames,
      count:      isExam ? 50 : isMock ? 40 : count,
      mode:       mode.id,
      revealMode,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto bg-card rounded-t-3xl w-full max-w-lg mx-auto pb-24 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-subtle" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-default">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{mode.emoji}</span>
            <div>
              <p className="font-black text-primary">{mode.title}</p>
              <p className="text-xs text-secondary">{mode.desc}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center text-secondary hover:text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Subject selection */}
          {!isExam && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2.5">Subject</p>
              <div className="grid grid-cols-2 gap-2">
                {isMock ? (
                  // Mock test: pick one subject
                  subjects.map(s => {
                    const color = getSubjectColor(s.name)
                    return (
                      <button key={s.id} onClick={() => setSelectedSubject(s)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                          selectedSubject?.id === s.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-default bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}>
                        <div className={`w-7 h-7 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xs font-black ${color.text}`}>{s.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-bold text-primary truncate">{s.name}</span>
                      </button>
                    )
                  })
                ) : (
                  // Topic/timed: all subjects or specific
                  <>
                    <button onClick={() => setSelectedSubject(null)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all col-span-2 ${
                        !selectedSubject ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-default bg-card hover:border-indigo-300'
                      }`}>
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <span className="text-white text-xs font-black">ALL</span>
                      </div>
                      <span className="text-xs font-bold text-primary">All subjects</span>
                    </button>
                    {subjects.map(s => {
                      const color = getSubjectColor(s.name)
                      return (
                        <button key={s.id} onClick={() => setSelectedSubject(s)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                            selectedSubject?.id === s.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                              : 'border-default bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}>
                          <div className={`w-7 h-7 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-xs font-black ${color.text}`}>{s.name.slice(0,2).toUpperCase()}</span>
                          </div>
                          <span className="text-xs font-bold text-primary truncate">{s.name}</span>
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Question count */}
          {!isExam && !isMock && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2.5">Questions</p>
              <div className="flex gap-2">
                {COUNTS.map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                      count === n
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-default bg-card text-primary hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer reveal timing */}
          {!isExam && (
            <div>
              <p className="text-xs font-black text-secondary uppercase tracking-wide mb-2.5">Show answers</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'immediate', label: 'After each question', desc: 'See what you got right immediately', emoji: '⚡' },
                  { value: 'end',       label: 'At the end',          desc: 'Review all answers when done',      emoji: '📊' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setRevealMode(opt.value)}
                    className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                      revealMode === opt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-default bg-card hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}>
                    <span className="text-lg">{opt.emoji}</span>
                    <p className="text-xs font-black text-primary">{opt.label}</p>
                    <p className="text-xs text-secondary">{opt.desc}</p>
                    {opt.value === 'immediate' && revealMode === opt.value && (
                      <span className="text-xs text-indigo-500 font-bold">Default</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={isMock && !selectedSubject}
            className={`w-full py-4 bg-gradient-to-r ${mode.gradient} text-white text-sm font-black rounded-2xl
                        hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.98]`}
          >
            {isExam ? 'Start exam simulation →'
              : `Start — ${isExam ? 50 : isMock ? 40 : count} questions →`}
          </button>

          {isMock && !selectedSubject && (
            <p className="text-xs text-center text-secondary">Select a subject to continue</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ sessions, loading }) {
  if (loading) return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-subtle rounded-2xl" />)}
    </div>
  )
  if (!sessions.length) return (
    <div className="text-center py-12">
      <p className="text-3xl mb-2">📭</p>
      <p className="font-bold text-primary mb-1">No sessions yet</p>
      <p className="text-sm text-secondary">Complete a practice session and it'll show here.</p>
    </div>
  )
  return (
    <div className="space-y-2">
      {sessions.map((s, i) => {
        const color = getSubjectColor(s.subject_name)
        const pct   = s.questions_count > 0 ? Math.round((s.correct_count / s.questions_count) * 100) : 0
        const date  = new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return (
          <div key={i} className="flex items-center gap-3 bg-card border border-default rounded-2xl px-4 py-3">
            <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xs font-black ${color.text}`}>{s.subject_name?.slice(0,2).toUpperCase() ?? '??'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary truncate">
                {s.mode === 'exam' ? 'Exam Simulation' : s.mode === 'mock' ? 'Mock Test' : `${s.questions_count} Questions`}
              </p>
              <p className="text-xs text-secondary mt-0.5">{s.subject_name ?? 'Mixed'} · {date}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-base font-black ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {pct}%
              </p>
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

  const [tab, setTab]           = useState('practice')
  const [profile, setProfile]   = useState(null)
  const [subjects, setSubjects] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [setupModal, setSetupModal] = useState(null)  // mode object | null

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
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setSessions(data ?? [])
    setSessionsLoading(false)
  }

  function handleModeClick(mode) {
    if (mode.id === 'exam') {
      // Exam simulation — no setup needed, just confirm
      startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: subjects.map(s => s.name), count: 50, mode: 'exam', revealMode: 'end' })
    } else {
      setSetupModal(mode)
    }
  }

  function startSession(config) {
    setSetupModal(null)
    sessionStorage.setItem('practice_config', JSON.stringify(config))
    router.push('/student/practice/session')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-primary">Practice HQ</h1>
        <p className="text-sm text-secondary mt-0.5">Your hub for every kind of exam practice</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-subtle p-1 rounded-2xl w-fit">
        {[{ id: 'practice', label: 'Practice' }, { id: 'history', label: 'History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-black rounded-xl transition-all ${
              tab === t.id ? 'bg-card text-primary shadow-sm' : 'text-secondary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Practice modes */}
      {tab === 'practice' && (
        <div className="space-y-3">
          {MODES.map(mode => (
            <button key={mode.id} onClick={() => handleModeClick(mode)}
              className="w-full flex items-center gap-4 bg-card border border-default rounded-2xl px-4 py-4
                         hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm
                         transition-all active:scale-[0.98] text-left">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mode.gradient}
                               flex items-center justify-center flex-shrink-0 text-2xl shadow-sm`}>
                {mode.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-primary">{mode.title}</p>
                  {mode.badge && (
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                      {mode.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary mt-0.5">{mode.desc}</p>
              </div>
              <svg className="w-4 h-4 text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}

          {/* Quick timed shortcut */}
          {subjects.length > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div>
                <p className="text-white font-black text-sm">Quick 10-question timed test</p>
                <p className="text-white/70 text-xs mt-0.5">
                  {subjects.slice(0, 2).map(s => s.name).join(' · ')}
                  {subjects.length > 2 && ` + ${subjects.length - 2} more`}
                </p>
              </div>
              <button
                onClick={() => startSession({ examType: profile?.exam_type ?? 'WAEC', subjects: subjects.map(s => s.name), count: 10, mode: 'timed', revealMode: 'immediate' })}
                className="flex-shrink-0 px-4 py-2.5 bg-white text-blue-700 text-sm font-black rounded-2xl hover:bg-blue-50 active:scale-95 transition-all ml-auto"
              >
                Go →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <HistoryTab sessions={sessions} loading={sessionsLoading} />
      )}

      {/* Session setup modal — z-[200], transparent backdrop, pb-24 clears navbar */}
      {setupModal && (
        <SessionSetupModal
          mode={setupModal}
          subjects={subjects}
          examType={profile?.exam_type}
          onStart={startSession}
          onClose={() => setSetupModal(null)}
        />
      )}
    </div>
  )
}