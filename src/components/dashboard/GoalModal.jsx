'use client'
// src/components/dashboard/GoalModal.jsx
// Changes:
// - JAMB per-subject: slider REMOVED, replaced with number input (type="number")
// - Auto-total: as user types per-subject scores, total auto-calculates and shows
// - WAEC subjects selector and JAMB subjects selector are aware of exam type
// - All explicit Tailwind colors (no token dependency issues)

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

const ALL_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Literature in English', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Yoruba', 'Igbo', 'Hausa',
]
const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6']

export default function GoalModal({ profile, onClose, onSave }) {
  const supabase = createClient()
  const [page, setPage]     = useState(0)  // 0=Goals, 1=Subjects, 2=Targets
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const initialExams = () => {
    if (profile?.exam_type === 'BOTH') return new Set(['WAEC', 'JAMB'])
    if (profile?.exam_type === 'JAMB') return new Set(['JAMB'])
    return new Set(['WAEC'])
  }

  const [selectedExams, setSelectedExams]   = useState(initialExams)
  const [subjects, setSubjects]             = useState(profile?.subjects ?? [])
  const [universityCourse, setUniCourse]    = useState(profile?.university_course ?? '')
  const [desiredProfession, setProfession]  = useState(profile?.desired_profession ?? '')
  const [targetUniversity, setTargetUni]    = useState(profile?.target_university ?? '')
  const [waecGrades, setWaecGrades]         = useState(profile?.waec_target_grades ?? {})
  const [jambScores, setJambScores]         = useState(() => {
    // Seed from existing scores (convert from slider values if needed)
    const existing = profile?.jamb_target_scores ?? {}
    const seeded = {}
    ;(profile?.subjects ?? []).forEach(s => { seeded[s] = existing[s] ?? 70 })
    return seeded
  })

  // Auto-calculated JAMB total from per-subject inputs
  const jambAutoTotal = Object.values(jambScores).reduce((sum, v) => sum + (Number(v) || 0), 0)
  const [jambTotalOverride, setJambTotalOverride] = useState(profile?.jamb_total_target ?? '')
  // Show auto total unless user typed a manual override
  const jambDisplayTotal = jambTotalOverride !== '' ? jambTotalOverride : (jambAutoTotal > 0 ? jambAutoTotal : '')

  const examType = selectedExams.has('WAEC') && selectedExams.has('JAMB') ? 'BOTH'
    : selectedExams.has('JAMB') ? 'JAMB' : 'WAEC'

  function toggleExam(exam) {
    setSelectedExams(prev => {
      const next = new Set(prev)
      if (next.has(exam)) { if (next.size > 1) next.delete(exam) } else { next.add(exam) }
      return next
    })
  }

  function toggleSubject(s) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    // Seed JAMB score if not already set
    if (!jambScores[s]) setJambScores(prev => ({ ...prev, [s]: 70 }))
  }

  function setJambScore(subject, raw) {
    const val = Math.min(100, Math.max(0, Number(raw) || 0))
    setJambScores(prev => ({ ...prev, [subject]: val }))
    setJambTotalOverride('') // clear manual override when per-subject changes
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const updates = {
      exam_type:           examType,
      subjects,
      university_course:   universityCourse.trim() || null,
      desired_profession:  desiredProfession.trim() || null,
      target_university:   targetUniversity.trim() || null,
      waec_target_grades:  waecGrades,
      jamb_target_scores:  jambScores,
      jamb_total_target:   jambDisplayTotal ? Number(jambDisplayTotal) : null,
      goals_set:           true,
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
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Gradient header with page tabs */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-3xl px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">My Goals</p>
              <h2 className="text-xl font-black text-white">Edit your targets</h2>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="flex gap-1 bg-white/10 p-1 rounded-2xl">
            {pages.map((p, i) => (
              <button key={p} onClick={() => setPage(i)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  page === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/70 hover:text-white'
                }`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400
                            text-xs rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* ── Page 0: Goals ── */}
          {page === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Desired Profession</label>
                <input value={desiredProfession} onChange={e => setProfession(e.target.value)}
                  placeholder="e.g. Doctor, Engineer, Lawyer…"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Target University Course</label>
                <input value={universityCourse} onChange={e => setUniCourse(e.target.value)}
                  placeholder="e.g. Medicine, Engineering…"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Target University</label>
                <input value={targetUniversity} onChange={e => setTargetUni(e.target.value)}
                  placeholder="e.g. University of Lagos…"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm
                             bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              {/* Exam type */}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Which exam are you sitting?</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Tap one or both</p>
                <div className="flex gap-3">
                  {['WAEC', 'JAMB'].map(exam => (
                    <button key={exam} onClick={() => toggleExam(exam)}
                      className={`flex-1 py-3.5 rounded-2xl text-sm font-black border-2 transition-all ${
                        selectedExams.has(exam)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}>{exam}</button>
                  ))}
                </div>
              </div>

              <button onClick={() => setPage(1)}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next: Subjects →
              </button>
            </div>
          )}

          {/* ── Page 1: Subjects ── */}
          {page === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {examType === 'BOTH'
                  ? 'Select all your subjects across both WAEC and JAMB.'
                  : examType === 'JAMB'
                  ? 'JAMB: select Use of English + up to 3 other subjects.'
                  : 'Select all subjects you are sitting for WAEC.'}
              </p>

              {/* Selected pills */}
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subjects.map(s => {
                    const c = getSubjectColor(s)
                    return (
                      <button key={s} onClick={() => toggleSubject(s)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${c.bg} ${c.text}`}>
                        {s}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                      <span className={`text-xs font-bold ${c.text}`}>{s}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPage(0)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

              {/* WAEC grades */}
              {(examType === 'WAEC' || examType === 'BOTH') && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">WAEC target grade per subject</p>
                  {subjects.map(s => (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1 truncate">{s}</span>
                      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                        {WAEC_GRADES.map(g => (
                          <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))}
                            className={`px-2 py-1 text-xs font-black rounded-lg border-2 transition-all ${
                              (waecGrades[s] ?? 'A1') === g
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                            }`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* JAMB scores — number inputs, not sliders */}
              {(examType === 'JAMB' || examType === 'BOTH') && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">JAMB target score per subject</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Enter a score between 0 and 100 for each subject</p>
                  </div>

                  {subjects.map(s => {
                    const val = jambScores[s] ?? 70
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1 truncate">{s}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="number" min="0" max="100"
                            value={val === 0 ? '' : val}
                            onChange={e => setJambScore(s, e.target.value)}
                            placeholder="0"
                            className="w-16 text-center text-sm font-black text-indigo-700 dark:text-indigo-300
                                       bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800
                                       rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400
                                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="text-xs text-gray-400">/100</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Auto-calculated total */}
                  <div className="mt-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">Total Score</p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Auto-calculated from above</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                          {jambAutoTotal}
                        </p>
                        <p className="text-xs text-indigo-400">/ 400</p>
                      </div>
                    </div>
                    {/* Optional manual override */}
                    <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-800">
                      <p className="text-xs text-indigo-500 mb-1.5">Or set a custom total target:</p>
                      <input type="number" min="100" max="400" value={jambTotalOverride}
                        onChange={e => setJambTotalOverride(e.target.value)}
                        placeholder={String(jambAutoTotal || 280)}
                        className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPage(1)}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400
                             text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ← Back
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl
                             hover:bg-indigo-500 disabled:opacity-50 transition-colors">
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