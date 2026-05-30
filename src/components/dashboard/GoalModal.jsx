'use client'
// src/components/dashboard/GoalModal.jsx
// Critical fixes:
// 1. JAMB subjects and WAEC subjects stored SEPARATELY (jambSubjects vs waecSubjects)
// 2. JAMB max 4 subjects enforced; Use of English auto-included and always shown
// 3. BOTH exam type: step through JAMB selection first, then WAEC selection
// 4. WAEC grades show ALL selected WAEC subjects (not just a few)
// 5. JAMB scores pull from jambSubjects only (including Use of English)
// 6. Full light/dark theme compliance using CSS token classes

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubjectColor } from '@/lib/theme'

// ── Subject lists ──────────────────────────────────────────────────────────────
const USE_OF_ENGLISH = 'Use of English'

const JAMB_ELECTIVES = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Literature in English', 'Yoruba', 'Igbo', 'Hausa',
]

const WAEC_SUBJECTS = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'Economics', 'Government', 'Literature in English', 'Geography', 'History',
  'Commerce', 'Accounting', 'Agricultural Science', 'Further Mathematics',
  'Computer Science', 'Civic Education', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Yoruba', 'Igbo', 'Hausa',
]

const WAEC_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6']

// ── Helpers ────────────────────────────────────────────────────────────────────
function seedJambSubjects(profile) {
  if (!profile?.subjects?.length) return [USE_OF_ENGLISH]
  // Only keep subjects that are valid JAMB electives (or Use of English)
  const valid = profile.subjects.filter(s => s === USE_OF_ENGLISH || JAMB_ELECTIVES.includes(s))
  if (!valid.includes(USE_OF_ENGLISH)) valid.unshift(USE_OF_ENGLISH)
  return valid.slice(0, 4)
}

function seedWaecSubjects(profile) {
  if (!profile?.subjects?.length) return []
  return profile.subjects.filter(s => WAEC_SUBJECTS.includes(s))
}

// ── Subject toggle button ──────────────────────────────────────────────────────
function SubjectBtn({ name, selected, onClick, disabled }) {
  const c = getSubjectColor(name)
  return (
    <button onClick={onClick} disabled={disabled && !selected}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all text-left
        ${selected
          ? `${c.bg} ${c.text} border-transparent shadow-sm`
          : disabled
          ? 'border-default text-tertiary cursor-not-allowed opacity-40'
          : 'border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700 bg-card'}`}>
      {selected && (
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      )}
      {name}
    </button>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function GoalModal({ profile, onClose, onSave }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  // Exam type
  const initExams = () => {
    if (profile?.exam_type === 'BOTH') return new Set(['WAEC', 'JAMB'])
    if (profile?.exam_type === 'JAMB') return new Set(['JAMB'])
    return new Set(['WAEC'])
  }
  const [selectedExams, setSelectedExams] = useState(initExams)
  const examType = selectedExams.has('WAEC') && selectedExams.has('JAMB') ? 'BOTH'
    : selectedExams.has('JAMB') ? 'JAMB' : 'WAEC'

  // JAMB: Use of English always first, max 4 total
  const [jambSubjects, setJambSubjects] = useState(() => seedJambSubjects(profile))
  // WAEC: separate list
  const [waecSubjects, setWaecSubjects] = useState(() => seedWaecSubjects(profile))

  // Goals / targets
  const [universityCourse, setUniCourse]   = useState(profile?.university_course ?? '')
  const [targetUniversity, setTargetUni]   = useState(profile?.target_university ?? '')
  const [desiredProfession, setProfession] = useState(profile?.desired_profession ?? '')
  const [waecGrades, setWaecGrades]        = useState(profile?.waec_target_grades ?? {})

  // JAMB scores — keyed by subject name, seeded from jambSubjects
  const [jambScores, setJambScores] = useState(() => {
    const existing = profile?.jamb_target_scores ?? {}
    const seeded = { [USE_OF_ENGLISH]: existing[USE_OF_ENGLISH] ?? 70 }
    ;(seedJambSubjects(profile)).forEach(s => { seeded[s] = existing[s] ?? 70 })
    return seeded
  })

  // Auto total from jambSubjects
  const jambAutoTotal = jambSubjects.reduce((sum, s) => sum + (Number(jambScores[s]) || 0), 0)

  // Page: 0=Goals+Exam, 1=JAMB subjects (if JAMB/BOTH), 2=WAEC subjects (if WAEC/BOTH), 3=Targets
  // Determine page sequence dynamically
  const pages = ['Goals']
  if (examType === 'JAMB' || examType === 'BOTH') pages.push('JAMB Subjects')
  if (examType === 'WAEC' || examType === 'BOTH') pages.push('WAEC Subjects')
  pages.push('Targets')

  // Recompute examType whenever selectedExams changes — must use state for page tracking
  const [page, setPage] = useState(0)
  const totalPages = pages.length

  function nextPage() { setPage(p => Math.min(p + 1, totalPages - 1)) }
  function prevPage() { setPage(p => Math.max(p - 1, 0)) }

  function toggleExam(exam) {
    setSelectedExams(prev => {
      const next = new Set(prev)
      if (next.has(exam)) { if (next.size > 1) next.delete(exam) } else { next.add(exam) }
      return next
    })
    // Reset page to 0 when exam type changes
    setPage(0)
  }

  function toggleJamb(s) {
    if (s === USE_OF_ENGLISH) return // always included
    setJambSubjects(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 4) return prev // max 4
      return [...prev, s]
    })
    setJambScores(prev => ({ ...prev, [s]: prev[s] ?? 70 }))
  }

  function toggleWaec(s) {
    setWaecSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function setJambScore(s, raw) {
    const val = Math.min(100, Math.max(0, Number(raw) || 0))
    setJambScores(prev => ({ ...prev, [s]: val }))
  }

  // Combined subjects for saving to profile.subjects
  const allSubjects = [...new Set([
    ...(examType === 'JAMB' || examType === 'BOTH' ? jambSubjects : []),
    ...(examType === 'WAEC' || examType === 'BOTH' ? waecSubjects : []),
  ])]

  async function handleSave() {
    setSaving(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const updates = {
      exam_type:          examType,
      subjects:           allSubjects,
      university_course:  universityCourse.trim() || null,
      target_university:  targetUniversity.trim() || null,
      desired_profession: desiredProfession.trim() || null,
      waec_target_grades: waecGrades,
      jamb_target_scores: jambScores,
      jamb_total_target:  jambAutoTotal > 0 ? jambAutoTotal : null,
      goals_set:          true,
    }
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', user.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave?.({ ...profile, ...updates })
    onClose()
  }

  const currentPageLabel = pages[page]
  const jambSlots = 4 - jambSubjects.length

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-subtle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default flex-shrink-0">
          <div className="flex items-center gap-3">
            {page > 0 && (
              <button onClick={prevPage} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
            )}
            <div>
              <h2 className="text-base font-black text-primary">{currentPageLabel}</h2>
              <p className="text-xs text-tertiary mt-0.5">Step {page + 1} of {totalPages}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center hover:bg-subtle/80 transition-colors">
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-subtle flex-shrink-0">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((page + 1) / totalPages) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">{error}</p>}

          {/* ── Page 0: Goals + Exam type ── */}
          {page === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1.5">Desired Profession</label>
                <input value={desiredProfession} onChange={e => setProfession(e.target.value)} placeholder="e.g. Doctor, Engineer, Lawyer…"
                  className="w-full px-4 py-3 border border-default rounded-2xl text-sm bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary mb-1.5">Target University Course</label>
                <input value={universityCourse} onChange={e => setUniCourse(e.target.value)} placeholder="e.g. Medicine, Engineering…"
                  className="w-full px-4 py-3 border border-default rounded-2xl text-sm bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-secondary mb-1.5">Target University</label>
                <input value={targetUniversity} onChange={e => setTargetUni(e.target.value)} placeholder="e.g. University of Lagos…"
                  className="w-full px-4 py-3 border border-default rounded-2xl text-sm bg-card text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary mb-1.5">Which exam are you sitting?</p>
                <p className="text-xs text-tertiary mb-3">Tap one or both</p>
                <div className="flex gap-3">
                  {['WAEC', 'JAMB'].map(exam => (
                    <button key={exam} onClick={() => toggleExam(exam)}
                      className={`flex-1 py-3.5 rounded-2xl text-sm font-black border-2 transition-all ${
                        selectedExams.has(exam) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700 bg-card'
                      }`}>{exam}</button>
                  ))}
                </div>
                {examType === 'BOTH' && (
                  <p className="text-xs text-indigo-500 mt-2 text-center font-medium">You'll select subjects for each exam separately</p>
                )}
              </div>
              <button onClick={nextPage} className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next: Subjects →
              </button>
            </div>
          )}

          {/* ── JAMB Subjects page ── */}
          {currentPageLabel === 'JAMB Subjects' && (
            <div className="space-y-4">
              {/* Use of English — always included, locked */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{USE_OF_ENGLISH}</p>
                  <p className="text-xs text-indigo-500">Always required for JAMB</p>
                </div>
                <span className="text-xs text-indigo-500 font-bold">1/4</span>
              </div>

              {/* Slot counter */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-secondary">Choose {jambSlots > 0 ? `${jambSlots} more subject${jambSlots !== 1 ? 's' : ''}` : 'no more — max reached'}</p>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  jambSubjects.length === 4 ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                }`}>{jambSubjects.length}/4</span>
              </div>

              {jambSubjects.length < 4 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl">
                  JAMB requires exactly 4 subjects — select {jambSlots} more
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {JAMB_ELECTIVES.map(s => {
                  const sel = jambSubjects.includes(s)
                  const dis = !sel && jambSubjects.length >= 4
                  return <SubjectBtn key={s} name={s} selected={sel} disabled={dis} onClick={() => toggleJamb(s)} />
                })}
              </div>

              <button onClick={nextPage} disabled={jambSubjects.length < 2}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors disabled:opacity-40">
                {examType === 'BOTH' ? 'Next: WAEC Subjects →' : 'Next: Target Scores →'}
              </button>
            </div>
          )}

          {/* ── WAEC Subjects page ── */}
          {currentPageLabel === 'WAEC Subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-secondary">Select all WAEC subjects you're sitting</p>
                <span className="text-xs font-bold text-secondary">{waecSubjects.length} selected</span>
              </div>
              {waecSubjects.length < 7 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-xl">
                  Most students sit 8–9 subjects for WAEC
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {WAEC_SUBJECTS.map(s => (
                  <SubjectBtn key={s} name={s} selected={waecSubjects.includes(s)} disabled={false} onClick={() => toggleWaec(s)} />
                ))}
              </div>
              <button onClick={nextPage} disabled={waecSubjects.length === 0}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors disabled:opacity-40">
                Next: Target Scores →
              </button>
            </div>
          )}

          {/* ── Targets page ── */}
          {currentPageLabel === 'Targets' && (
            <div className="space-y-6">

              {/* WAEC grades — ALL waecSubjects shown */}
              {(examType === 'WAEC' || examType === 'BOTH') && waecSubjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-emerald-600 px-2.5 py-1 rounded-full">WAEC</span>
                    <p className="text-sm font-bold text-primary">Target grade per subject</p>
                  </div>
                  <p className="text-xs text-tertiary -mt-1">A1 is the highest</p>
                  {waecSubjects.map(s => (
                    <div key={s} className="space-y-1">
                      <p className="text-xs font-bold text-secondary">{s}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {WAEC_GRADES.map(g => (
                          <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))}
                            className={`px-3 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${
                              (waecGrades[s] ?? 'A1') === g ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-default text-secondary hover:border-indigo-300 dark:hover:border-indigo-700 bg-card'
                            }`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* JAMB per-subject scores — ALL jambSubjects including Use of English */}
              {(examType === 'JAMB' || examType === 'BOTH') && jambSubjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-indigo-600 px-2.5 py-1 rounded-full">JAMB</span>
                    <p className="text-sm font-bold text-primary">Target score per subject</p>
                  </div>
                  <p className="text-xs text-tertiary -mt-1">Each subject is marked out of 100</p>

                  {jambSubjects.map(s => {
                    const val = jambScores[s] ?? 70
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-sm text-primary font-medium flex-1 truncate">{s}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input type="number" min="0" max="100" value={val === 0 ? '' : val}
                            onChange={e => setJambScore(s, e.target.value)} placeholder="0"
                            className="w-16 text-center text-sm font-black text-indigo-600 dark:text-indigo-300
                                       bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800
                                       rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400
                                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          <span className="text-xs text-tertiary">/100</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Live total */}
                  <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Total JAMB score</p>
                        <p className="text-xs text-indigo-400 mt-0.5">Sum of all {jambSubjects.length} subjects</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{jambAutoTotal}</span>
                        <span className="text-sm text-indigo-400">/400</span>
                      </div>
                    </div>
                    {jambAutoTotal >= 300 && <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-bold">🎯 Competitive for most federal universities</p>}
                    {jambAutoTotal > 0 && jambAutoTotal < 200 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold">💪 Aim higher — most courses require 200+</p>}
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black rounded-2xl hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? 'Saving…' : 'Save goals →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}