'use client'
// src/components/dashboard/GoalModal.jsx
// Saves only columns that exist in the profiles table:
//   university_course, goals_set, exam_type, subjects,
//   waec_target_grades, jamb_target_scores, jamb_total_target
// Does NOT write university_name (column doesn't exist yet)

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

const ALL_SUBJECTS = [
  'Mathematics','English Language','Physics','Chemistry','Biology',
  'Economics','Government','Geography','Literature in English',
  'Agricultural Science','Accounting','Commerce','Civic Education',
  'Further Mathematics','Technical Drawing','Food and Nutrition',
]

const WAEC_GRADES = ['A1','B2','B3','C4']

export default function GoalModal({ profile, onClose, onSave }) {
  const supabase = createClient()

  const [page, setPage]             = useState(0) // 0=goals 1=subjects 2=targets
  const [course, setCourse]         = useState(profile?.university_course ?? '')
  const [dontKnow, setDontKnow]     = useState(!profile?.university_course)
  const [examType, setExamType]     = useState(profile?.exam_type ?? 'WAEC')
  const [subjects, setSubjects]     = useState(profile?.subjects ?? [])
  const [waecGrades, setWaecGrades] = useState(profile?.waec_target_grades ?? {})
  const [jambScores, setJambScores] = useState(() => {
    const ex = profile?.jamb_target_scores ?? {}
    const init = {};
    (profile?.subjects ?? []).forEach(s => { init[s] = ex[s] ?? 60 })
    return init
  })
  const [tab, setTab]   = useState(examType === 'JAMB' ? 'JAMB' : 'WAEC')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Sync JAMB scores when subjects change
  useEffect(() => {
    setJambScores(prev => {
      const next = {}
      subjects.forEach(s => { next[s] = prev[s] ?? 60 })
      return next
    })
  }, [subjects])

  const jambTotal = useMemo(() =>
    Object.values(jambScores).reduce((a, v) => a + (parseInt(v) || 0), 0),
  [jambScores])

  function toggleSubject(name) {
    setSubjects(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    // Only write columns that exist in profiles
    const updates = {
      university_course:  dontKnow ? null : (course.trim() || null),
      goals_set:          true,
      exam_type:          examType,
      subjects,
      waec_target_grades: waecGrades,
      jamb_target_scores: jambScores,
      jamb_total_target:  jambTotal || null,
    }
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave?.({ ...profile, ...updates })
    onClose()
  }

  const pages = ['Goals','Subjects','Targets']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-3xl px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">My Goals</p>
              <h2 className="text-xl font-black text-white">Edit your targets</h2>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1 bg-white/10 p-1 rounded-2xl">
            {pages.map((p, i) => (
              <button key={p} onClick={() => setPage(i)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  page === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/70 hover:text-white'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* ── Page 0: Goals ── */}
          {page === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                  What do you want to study in university?
                </label>
                <input type="text" value={dontKnow ? '' : course}
                  onChange={e => { setCourse(e.target.value); setDontKnow(false) }}
                  disabled={dontKnow} placeholder="e.g. Medicine, Law, Engineering…"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-40" />
                <button onClick={() => setDontKnow(d => !d)}
                  className={`mt-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    dontKnow
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 font-bold'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500'
                  }`}>
                  {dontKnow ? "✓ I don't know yet" : "I don't know yet"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Exam(s) you're preparing for
                </label>
                <div className="flex gap-2">
                  {['WAEC','JAMB','BOTH'].map(e => (
                    <button key={e} onClick={() => { setExamType(e); setTab(e === 'JAMB' ? 'JAMB' : 'WAEC') }}
                      className={`flex-1 py-3 text-sm font-bold rounded-2xl border-2 transition-all ${
                        examType === e
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setPage(1)}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next: Edit subjects →
              </button>
            </div>
          )}

          {/* ── Page 1: Subjects ── */}
          {page === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Your subjects</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Tap to add or remove</p>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                  {subjects.map(s => {
                    const c = getSubjectColor(s)
                    return (
                      <button key={s} onClick={() => toggleSubject(s)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${c.bg} ${c.text}`}>
                        {s}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {ALL_SUBJECTS.filter(s => !subjects.includes(s)).map(s => {
                  const c = getSubjectColor(s)
                  return (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left ${c.bg} hover:opacity-90 active:scale-95 transition-all`}>
                      <svg className={`w-4 h-4 flex-shrink-0 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className={`text-xs font-bold ${c.text}`}>{s}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPage(0)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ← Back
                </button>
                <button onClick={() => setPage(2)} disabled={subjects.length === 0}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                  Next: Targets →
                </button>
              </div>
            </div>
          )}

          {/* ── Page 2: Targets ── */}
          {page === 2 && (
            <div className="space-y-5">
              {examType === 'BOTH' && (
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                  {['WAEC','JAMB'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                        tab === t
                          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {(examType === 'WAEC' || (examType === 'BOTH' && tab === 'WAEC')) && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Target grade per subject</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Only excellence grades shown</p>
                  </div>
                  {subjects.map(s => (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium flex-1 truncate">{s}</span>
                      <div className="flex gap-1.5">
                        {WAEC_GRADES.map(g => (
                          <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))}
                            className={`px-2.5 py-1.5 text-xs font-black rounded-xl border-2 transition-all ${
                              (waecGrades[s] ?? 'A1') === g
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                            }`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(examType === 'JAMB' || (examType === 'BOTH' && tab === 'JAMB')) && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Target score per subject</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">50–100 per subject</p>
                  </div>
                  {subjects.map(s => {
                    const val = jambScores[s] ?? 60
                    return (
                      <div key={s} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{s}</span>
                          <span className="text-sm font-black text-indigo-600">{val}/100</span>
                        </div>
                        <input type="range" min={50} max={100} step={5} value={val}
                          onChange={e => setJambScores(prev => ({ ...prev, [s]: parseInt(e.target.value) }))}
                          className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer" />
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">JAMB Total</span>
                    <div className={`px-3 py-1 rounded-xl text-base font-black ${
                      jambTotal >= 280 ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' :
                      jambTotal >= 220 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' :
                      'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    }`}>
                      {jambTotal}/400
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setPage(1)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ← Back
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all">
                  {saving ? 'Saving…' : 'Save goals 🎯'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}