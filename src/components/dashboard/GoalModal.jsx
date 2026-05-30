'use client'
// src/components/dashboard/GoalModal.jsx
// Fixes:
// - Remove "BOTH" exam type option. Students tap WAEC or JAMB (or both by tapping both)
// - The exam_type field becomes 'WAEC', 'JAMB', or 'BOTH' based on which buttons are active
// - If both tapped → stored as 'BOTH'. If only one → that value. Logic is same, UI is cleaner.
// - Full dark mode: replaced hardcoded bg-white/gray classes with CSS tokens

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

const ALL_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Literature', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Yoruba', 'Igbo', 'Hausa',
]

const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6']

export default function GoalModal({ profile, onClose, onSave }) {
  const supabase = createClient()
  const [page, setSaving_page] = useState(0)  // 0=Goals, 1=Subjects, 2=Targets
  const [saving, setSaving]    = useState(false)
  const [error, setError]      = useState(null)

  // Exam selection — stored as Set internally, serialised to 'WAEC'/'JAMB'/'BOTH'
  const initialExams = () => {
    if (profile?.exam_type === 'BOTH') return new Set(['WAEC', 'JAMB'])
    if (profile?.exam_type === 'JAMB') return new Set(['JAMB'])
    return new Set(['WAEC'])
  }
  const [selectedExams, setSelectedExams] = useState(initialExams)
  const [subjects, setSubjects]           = useState(profile?.subjects ?? [])
  const [universityCourse, setUniversityCourse] = useState(profile?.university_course ?? '')
  const [waecGrades, setWaecGrades]       = useState(profile?.waec_target_grades ?? {})
  const [jambScores, setJambScores]       = useState(profile?.jamb_target_scores ?? {})
  const [jambTotal, setJambTotal]         = useState(profile?.jamb_total_target ?? '')

  // Derived exam_type string
  const examType = selectedExams.has('WAEC') && selectedExams.has('JAMB') ? 'BOTH'
    : selectedExams.has('JAMB') ? 'JAMB' : 'WAEC'

  function toggleExam(exam) {
    setSelectedExams(prev => {
      const next = new Set(prev)
      if (next.has(exam)) {
        if (next.size > 1) next.delete(exam) // can't deselect last one
      } else {
        next.add(exam)
      }
      return next
    })
  }

  function toggleSubject(s) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const updates = {
      university_course:   universityCourse.trim() || null,
      goals_set:           true,
      exam_type:           examType,
      subjects,
      waec_target_grades:  waecGrades,
      jamb_target_scores:  jambScores,
      jamb_total_target:   jambTotal || null,
    }
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', profile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave?.({ ...profile, ...updates })
    onClose()
  }

  const pages = ['Goals', 'Subjects', 'Targets']

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>

        {/* Gradient header */}
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
              <button key={p} onClick={() => setSaving_page(i)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  page === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/70 hover:text-white'
                }`}>{p}</button>
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

          {/* Page 0: Goals */}
          {page === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-primary mb-2">Target university course</label>
                <input
                  value={universityCourse}
                  onChange={e => setUniversityCourse(e.target.value)}
                  placeholder="e.g. Medicine, Engineering…"
                  className="w-full px-4 py-3 border border-default rounded-2xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Exam type — WAEC and/or JAMB, no BOTH option */}
              <div>
                <p className="text-sm font-bold text-primary mb-2">Which exam are you sitting?</p>
                <p className="text-xs text-secondary mb-3">Tap one or both</p>
                <div className="flex gap-3">
                  {['WAEC', 'JAMB'].map(exam => (
                    <button
                      key={exam}
                      onClick={() => toggleExam(exam)}
                      className={`flex-1 py-3.5 rounded-2xl text-sm font-black border-2 transition-all ${
                        selectedExams.has(exam)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                          : 'border-default bg-card text-secondary hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}
                    >
                      {exam}
                      {selectedExams.has(exam) && <span className="ml-1.5 text-indigo-200">✓</span>}
                    </button>
                  ))}
                </div>
                {selectedExams.size === 2 && (
                  <p className="text-xs text-indigo-500 text-center mt-2">Both exams selected</p>
                )}
              </div>

              <button onClick={() => setSaving_page(1)}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next: Subjects →
              </button>
            </div>
          )}

          {/* Page 1: Subjects */}
          {page === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-primary mb-1">Your subjects</p>
                <p className="text-xs text-secondary mb-3">Tap to add or remove</p>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
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
                <button onClick={() => setSaving_page(0)}
                  className="flex-1 py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors">
                  ← Back
                </button>
                <button onClick={() => setSaving_page(2)} disabled={subjects.length === 0}
                  className="flex-1 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                  Next: Targets →
                </button>
              </div>
            </div>
          )}

          {/* Page 2: Targets */}
          {page === 2 && (
            <div className="space-y-5">
              {/* WAEC targets */}
              {(examType === 'WAEC' || examType === 'BOTH') && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-primary">WAEC target grade per subject</p>
                  {subjects.map(s => (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-sm text-primary font-medium flex-1 truncate">{s}</span>
                      <div className="flex gap-1.5">
                        {WAEC_GRADES.map(g => (
                          <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))}
                            className={`px-2 py-1.5 text-xs font-black rounded-xl border-2 transition-all ${
                              (waecGrades[s] ?? 'A1') === g
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-default text-secondary hover:border-indigo-300'
                            }`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* JAMB targets */}
              {(examType === 'JAMB' || examType === 'BOTH') && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-primary">JAMB total target score</p>
                    <p className="text-xs text-secondary mt-0.5">Out of 400</p>
                    <input
                      type="number" min="100" max="400" value={jambTotal}
                      onChange={e => setJambTotal(e.target.value)}
                      placeholder="e.g. 280"
                      className="mt-2 w-full px-4 py-3 border border-default rounded-2xl text-sm bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary mb-3">Target score per subject (50–100)</p>
                    {subjects.map(s => {
                      const val = jambScores[s] ?? 70
                      return (
                        <div key={s} className="flex items-center gap-3 mb-3">
                          <span className="text-sm text-primary font-medium flex-1 truncate">{s}</span>
                          <div className="flex items-center gap-2">
                            <input type="range" min="50" max="100" step="5" value={val}
                              onChange={e => setJambScores(prev => ({ ...prev, [s]: Number(e.target.value) }))}
                              className="w-24 accent-indigo-600" />
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 w-8 text-right tabular-nums">{val}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setSaving_page(1)}
                  className="flex-1 py-3 border border-default text-secondary text-sm font-bold rounded-2xl hover:bg-subtle transition-colors">
                  ← Back
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save goals ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}