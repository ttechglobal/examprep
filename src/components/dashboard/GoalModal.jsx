'use client'
// src/components/dashboard/GoalModal.jsx
//
// TAILWIND v4 COLOUR FIX + UI IMPROVEMENT:
// - SubjectBtn: replaced ${c.bg} ${c.text} dynamic classNames → inline style
// - getSubjectColor import removed, replaced with SUBJECT_STYLES map
// - UI improvements: better visual hierarchy, cleaner step indicators,
//   improved subject grid with checkmarks, more readable grade/score pickers

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Subject colour map ────────────────────────────────────────────────────────
const SUBJECT_STYLES = {
  'Mathematics':                 { bg: '#eff6ff', text: '#1d4ed8' },
  'Further Mathematics':         { bg: '#f0f9ff', text: '#0369a1' },
  'English Language':            { bg: '#faf5ff', text: '#7e22ce' },
  'Use of English':              { bg: '#faf5ff', text: '#7e22ce' },
  'Physics':                     { bg: '#ecfeff', text: '#0e7490' },
  'Chemistry':                   { bg: '#f0fdf4', text: '#15803d' },
  'Biology':                     { bg: '#ecfdf5', text: '#047857' },
  'Economics':                   { bg: '#fffbeb', text: '#b45309' },
  'Government':                  { bg: '#fef2f2', text: '#b91c1c' },
  'Literature in English':       { bg: '#fdf2f8', text: '#9d174d' },
  'Geography':                   { bg: '#f0fdfa', text: '#0f766e' },
  'Agricultural Science':        { bg: '#f7fee7', text: '#4d7c0f' },
  'Commerce':                    { bg: '#eef2ff', text: '#4338ca' },
  'History':                     { bg: '#fff7ed', text: '#c2410c' },
  'Accounting':                  { bg: '#fefce8', text: '#a16207' },
  'Computer Science':            { bg: '#f0f9ff', text: '#0369a1' },
  'Civic Education':             { bg: '#f0fdf4', text: '#166534' },
  'Christian Religious Studies': { bg: '#fdf4ff', text: '#86198f' },
  'Islamic Religious Studies':   { bg: '#fff7ed', text: '#9a3412' },
  'Yoruba':                      { bg: '#fef9c3', text: '#713f12' },
  'Igbo':                        { bg: '#fef9c3', text: '#713f12' },
  'Hausa':                       { bg: '#fef9c3', text: '#713f12' },
  'default':                     { bg: '#eef2ff', text: '#4338ca' },
}
function getSubjectStyle(name) { return SUBJECT_STYLES[name] ?? SUBJECT_STYLES.default }

// ── Constants ─────────────────────────────────────────────────────────────────
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

function seedJambSubjects(profile) {
  if (!profile?.subjects?.length) return [USE_OF_ENGLISH]
  const valid = profile.subjects.filter(s => s === USE_OF_ENGLISH || JAMB_ELECTIVES.includes(s))
  if (!valid.includes(USE_OF_ENGLISH)) valid.unshift(USE_OF_ENGLISH)
  return valid.slice(0, 4)
}

function seedWaecSubjects(profile) {
  if (!profile?.subjects?.length) return []
  return profile.subjects.filter(s => WAEC_SUBJECTS.includes(s))
}

// ── Subject toggle button — inline styles, never transparent ─────────────────
function SubjectBtn({ name, selected, onClick, disabled, locked }) {
  const s = getSubjectStyle(name)
  return (
    <button
      onClick={onClick}
      disabled={(disabled && !selected) || locked}
      style={selected ? { backgroundColor: s.bg, color: s.text, borderColor: 'transparent' } : undefined}
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-left w-full
        ${selected
          ? 'shadow-sm'
          : locked
          ? 'border-default bg-subtle text-tertiary cursor-not-allowed opacity-60'
          : disabled
          ? 'border-default bg-card text-tertiary cursor-not-allowed opacity-40'
          : 'border-default bg-card text-secondary hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
    >
      {/* Checkmark or number indicator */}
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
        selected ? 'bg-current' : 'border-2 border-current opacity-30'
      }`}
        style={selected ? { backgroundColor: s.text } : undefined}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </div>
      <span className="flex-1 leading-snug">{name}</span>
      {locked && <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-full">Required</span>}
    </button>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i === current
            ? 'w-5 h-1.5 bg-indigo-600'
            : i < current
            ? 'w-1.5 h-1.5 bg-indigo-300 dark:bg-indigo-700'
            : 'w-1.5 h-1.5 bg-subtle'
        }`} />
      ))}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function GoalModal({ profile, onClose, onSave }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const initExams = () => {
    if (profile?.exam_type === 'BOTH') return new Set(['WAEC', 'JAMB'])
    if (profile?.exam_type === 'JAMB') return new Set(['JAMB'])
    return new Set(['WAEC'])
  }
  const [selectedExams, setSelectedExams] = useState(initExams)
  const examType = selectedExams.has('WAEC') && selectedExams.has('JAMB') ? 'BOTH'
    : selectedExams.has('JAMB') ? 'JAMB' : 'WAEC'

  const [jambSubjects, setJambSubjects] = useState(() => seedJambSubjects(profile))
  const [waecSubjects, setWaecSubjects] = useState(() => seedWaecSubjects(profile))

  const [universityCourse, setUniCourse]   = useState(profile?.university_course ?? '')
  const [targetUniversity,  setTargetUni]  = useState(profile?.target_university ?? '')
  const [desiredProfession, setProfession] = useState(profile?.desired_profession ?? '')
  const [waecGrades, setWaecGrades]        = useState(profile?.waec_target_grades ?? {})
  const [jambScores, setJambScores]        = useState(() => {
    const existing = profile?.jamb_target_scores ?? {}
    const seeded = { [USE_OF_ENGLISH]: existing[USE_OF_ENGLISH] ?? 70 }
    seedJambSubjects(profile).forEach(s => { seeded[s] = existing[s] ?? 70 })
    return seeded
  })

  const jambAutoTotal = jambSubjects.reduce((sum, s) => sum + (Number(jambScores[s]) || 0), 0)
  const jambSlots     = 3 - (jambSubjects.filter(s => s !== USE_OF_ENGLISH).length)

  // Build page sequence
  const pages = ['Goals']
  if (examType === 'JAMB' || examType === 'BOTH') pages.push('JAMB Subjects')
  if (examType === 'WAEC' || examType === 'BOTH') pages.push('WAEC Subjects')
  pages.push('Targets')

  const [page, setPage] = useState(0)
  const totalPages = pages.length
  const currentPageLabel = pages[page]

  function nextPage() { setPage(p => Math.min(p + 1, totalPages - 1)) }
  function prevPage() { setPage(p => Math.max(p - 1, 0)) }

  function toggleExam(exam) {
    setSelectedExams(prev => {
      const next = new Set(prev)
      if (next.has(exam)) { if (next.size > 1) next.delete(exam) } else { next.add(exam) }
      return next
    })
    setPage(0)
  }

  function toggleJamb(s) {
    if (s === USE_OF_ENGLISH) return
    setJambSubjects(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 4) return prev
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
      target_university:  targetUniversity.trim()  || null,
      desired_profession: desiredProfession.trim()  || null,
      waec_target_grades: waecGrades,
      jamb_target_scores: jambScores,
      jamb_total_target:  jambAutoTotal > 0 ? jambAutoTotal : null,
      goals_set:          true,
    }
    const { error: err } = await supabase.from('profiles').update(updates).eq('id', user.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave?.({ ...profile, ...updates })
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-default flex-shrink-0">
          <div className="flex items-center gap-3">
            {page > 0 && (
              <button onClick={prevPage} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-base font-black text-primary">
                {currentPageLabel === 'Goals'          ? 'Set your goals'
                : currentPageLabel === 'JAMB Subjects' ? 'JAMB subjects'
                : currentPageLabel === 'WAEC Subjects' ? 'WAEC subjects'
                :                                        'Target scores'}
              </h2>
              <StepDots total={totalPages} current={page} />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-subtle flex items-center justify-center text-secondary hover:text-primary transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* ── Goals page ── */}
          {currentPageLabel === 'Goals' && (
            <div className="space-y-5">
              {/* Exam selector */}
              <div className="space-y-2">
                <p className="text-xs font-black text-secondary uppercase tracking-wide">Which exam are you sitting?</p>
                <div className="grid grid-cols-3 gap-2">
                  {['WAEC', 'JAMB', 'Both'].map(label => {
                    const val = label === 'Both' ? 'BOTH' : label
                    const active = examType === val
                    return (
                      <button key={label} onClick={() => {
                        if (label === 'Both') { setSelectedExams(new Set(['WAEC', 'JAMB'])) }
                        else { setSelectedExams(new Set([val])) }
                        setPage(0)
                      }}
                        className={`py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                          active
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                            : 'border-default bg-card text-secondary hover:border-indigo-300'
                        }`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
                {examType === 'BOTH' && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-xl">
                    You'll select subjects for JAMB and WAEC separately on the next steps.
                  </p>
                )}
              </div>

              {/* Aspiration fields */}
              <div className="space-y-3">
                <p className="text-xs font-black text-secondary uppercase tracking-wide">Your aspirations</p>
                <div className="space-y-3">
                  {[
                    { label: '🎓 University course', val: universityCourse, set: setUniCourse, placeholder: 'e.g. Medicine, Engineering, Law…' },
                    { label: '🏛️ Target university', val: targetUniversity, set: setTargetUni, placeholder: 'e.g. University of Lagos, OAU…' },
                    { label: '💼 Desired profession', val: desiredProfession, set: setProfession, placeholder: 'e.g. Doctor, Engineer, Lawyer…' },
                  ].map(({ label, val, set, placeholder }) => (
                    <div key={label}>
                      <p className="text-xs font-bold text-secondary mb-1">{label}</p>
                      <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                        className="w-full text-sm border border-default rounded-xl px-3 py-2.5 bg-subtle text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={nextPage}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors">
                Next: Subjects →
              </button>
            </div>
          )}

          {/* ── JAMB Subjects page ── */}
          {currentPageLabel === 'JAMB Subjects' && (
            <div className="space-y-4">
              {/* Use of English — locked, always required */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800">
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">{USE_OF_ENGLISH}</p>
                  <p className="text-xs text-indigo-500">Always required for JAMB</p>
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-black">1/4</span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-secondary leading-relaxed">
                  {jambSlots > 0
                    ? `Choose ${jambSlots} more subject${jambSlots !== 1 ? 's' : ''}`
                    : 'All 4 subjects selected'}
                </p>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  jambSubjects.length === 4
                    ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {jambSubjects.length}/4
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {JAMB_ELECTIVES.map(s => (
                  <SubjectBtn
                    key={s} name={s}
                    selected={jambSubjects.includes(s)}
                    disabled={jambSubjects.length >= 4}
                    onClick={() => toggleJamb(s)}
                  />
                ))}
              </div>

              <button onClick={nextPage} disabled={jambSubjects.length < 4}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 transition-colors disabled:opacity-40">
                {examType === 'BOTH' ? 'Next: WAEC Subjects →' : 'Next: Target Scores →'}
              </button>
            </div>
          )}

          {/* ── WAEC Subjects page ── */}
          {currentPageLabel === 'WAEC Subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-secondary">Select all your WAEC subjects</p>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  waecSubjects.length >= 7
                    ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {waecSubjects.length} selected
                </span>
              </div>

              {waecSubjects.length < 7 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-xl">
                  Most students sit 8–9 subjects for WAEC
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {WAEC_SUBJECTS.map(s => (
                  <SubjectBtn key={s} name={s} selected={waecSubjects.includes(s)} onClick={() => toggleWaec(s)} />
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

              {/* WAEC grades */}
              {(examType === 'WAEC' || examType === 'BOTH') && waecSubjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-emerald-600 px-2.5 py-1 rounded-full">WAEC</span>
                    <div>
                      <p className="text-sm font-bold text-primary">Target grade per subject</p>
                      <p className="text-xs text-tertiary">A1 is the highest</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {waecSubjects.map(s => {
                      const chosen = waecGrades[s] ?? 'A1'
                      const subStyle = getSubjectStyle(s)
                      return (
                        <div key={s} className="bg-subtle rounded-2xl p-3 space-y-2">
                          <p className="text-xs font-bold text-primary">{s}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {WAEC_GRADES.map(g => (
                              <button key={g} onClick={() => setWaecGrades(prev => ({ ...prev, [s]: g }))}
                                style={chosen === g ? { backgroundColor: subStyle.bg, color: subStyle.text, borderColor: 'transparent' } : undefined}
                                className={`px-3 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${
                                  chosen === g ? 'shadow-sm' : 'border-default text-secondary hover:border-indigo-300 bg-card'
                                }`}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* JAMB scores */}
              {(examType === 'JAMB' || examType === 'BOTH') && jambSubjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white bg-indigo-600 px-2.5 py-1 rounded-full">JAMB</span>
                      <div>
                        <p className="text-sm font-bold text-primary">Target score per subject</p>
                        <p className="text-xs text-tertiary">Each subject is out of 100</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{jambAutoTotal}</p>
                      <p className="text-[10px] text-tertiary">/ 400 total</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {jambSubjects.map(s => {
                      const val = jambScores[s] ?? 70
                      const pct = val
                      const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={s} className="bg-subtle rounded-2xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-primary">{s}</p>
                            <span className="text-sm font-black text-primary tabular-nums">{val}<span className="text-xs font-normal text-tertiary">/100</span></span>
                          </div>
                          {/* Visual bar */}
                          <div className="h-1.5 bg-card rounded-full overflow-hidden">
                            <div style={{ width: `${val}%`, backgroundColor: barColor }}
                              className="h-full rounded-full transition-all duration-300" />
                          </div>
                          <input type="range" min="0" max="100" step="5" value={val}
                            onChange={e => setJambScore(s, e.target.value)}
                            className="w-full h-1 accent-indigo-600 cursor-pointer" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">{error}</p>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save goals ✓'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}